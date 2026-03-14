import { Router } from 'express';
import { getPool } from '../db/connection';
import { getRedis } from '../db/redis';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    // Check DB
    const pool = getPool();
    await pool.execute('SELECT 1');

    // Check Redis
    const redis = getRedis();
    await redis.ping();

    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Service unavailable' });
  }
});

export default router;
