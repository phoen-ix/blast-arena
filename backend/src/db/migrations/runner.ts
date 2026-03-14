import fs from 'fs';
import path from 'path';
import { getPool } from '../connection';
import { logger } from '../../utils/logger';

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  // Create migrations tracking table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get already-executed migrations
  const [executed] = await pool.execute<any[]>('SELECT name FROM _migrations ORDER BY name');
  const executedNames = new Set(executed.map((r: any) => r.name));

  // Find migration files - resolve to source directory since SQL files aren't compiled
  const migrationsDir = path.resolve(__dirname, '..', '..', '..', 'src', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (executedNames.has(file)) {
      logger.debug(`Migration ${file} already applied, skipping`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await conn.execute(statement);
      }

      await conn.execute('INSERT INTO _migrations (name) VALUES (?)', [file]);
      await conn.commit();
      logger.info(`Migration ${file} applied successfully`);
    } catch (err) {
      await conn.rollback();
      logger.error({ err, file }, `Migration ${file} failed`);
      throw err;
    } finally {
      conn.release();
    }
  }
}
