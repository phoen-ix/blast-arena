import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashEmail(email: string, pepper: string): string {
  return crypto.createHmac('sha256', pepper).update(email.toLowerCase().trim()).digest('hex');
}

export function generateEmailHint(email: string): string {
  const normalized = email.toLowerCase().trim();
  const atIdx = normalized.indexOf('@');
  if (atIdx < 1) return '***@***';
  const local = normalized.slice(0, atIdx);
  const domain = normalized.slice(atIdx + 1);
  const maskedLocal = local[0] + '***';
  const parts = domain.split('.');
  const tld = parts.pop()!;
  const maskedDomain = parts.map((p) => p[0] + '***').join('.') + '.' + tld;
  return maskedLocal + '@' + maskedDomain;
}
