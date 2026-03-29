import { query, execute } from './connection';
import { hashEmail, generateEmailHint } from '../utils/crypto';
import { getConfig } from '../config';
import { logger } from '../utils/logger';
import { RowDataPacket } from 'mysql2';

interface BackfillRow extends RowDataPacket {
  id: number;
  email: string;
  pending_email: string | null;
}

export async function backfillEmailHashes(): Promise<void> {
  const config = getConfig();

  let rows: BackfillRow[];
  try {
    rows = await query<BackfillRow[]>(
      'SELECT id, email, pending_email FROM users WHERE email_hash IS NULL AND email IS NOT NULL',
    );
  } catch {
    // Column doesn't exist yet (pre-029) or already dropped (post-030) — nothing to do
    return;
  }

  if (rows.length === 0) return;

  logger.info({ count: rows.length }, 'Backfilling email hashes');

  for (const row of rows) {
    const emailHash = hashEmail(row.email, config.EMAIL_PEPPER);
    const emailHint = generateEmailHint(row.email);
    const pendingHash = row.pending_email
      ? hashEmail(row.pending_email, config.EMAIL_PEPPER)
      : null;
    const pendingHint = row.pending_email ? generateEmailHint(row.pending_email) : null;

    await execute(
      'UPDATE users SET email_hash = ?, email_hint = ?, pending_email_hash = ?, pending_email_hint = ? WHERE id = ?',
      [emailHash, emailHint, pendingHash, pendingHint, row.id],
    );
  }

  logger.info({ count: rows.length }, 'Email hash backfill complete');
}
