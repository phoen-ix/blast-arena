import nodemailer from 'nodemailer';
import { getConfig } from '../config';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const config = getConfig();

  if (!config.SMTP_HOST) {
    logger.warn('SMTP not configured, emails will be logged only');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: config.SMTP_USER ? {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      } : undefined,
    });
  }

  return transporter;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const config = getConfig();
  const transport = getTransporter();

  if (!transport) {
    logger.info({ to, subject }, 'Email (SMTP not configured, logging only)');
    logger.debug({ html }, 'Email body');
    return;
  }

  try {
    await transport.sendMail({
      from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    logger.info({ to, subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    throw err;
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const config = getConfig();
  const url = `${config.APP_URL}/api/auth/verify-email/${token}`;
  await sendEmail(email, 'Verify your BlastArena account', `
    <h1>Welcome to BlastArena!</h1>
    <p>Click the link below to verify your email address:</p>
    <p><a href="${url}">${url}</a></p>
    <p>If you didn't create an account, you can ignore this email.</p>
  `);
}

export async function sendEmailChangeEmail(newEmail: string, token: string): Promise<void> {
  const config = getConfig();
  const url = `${config.APP_URL}/api/user/confirm-email/${token}`;
  await sendEmail(newEmail, 'Confirm your new email address — BlastArena', `
    <h1>Email Change Request</h1>
    <p>You requested to change your BlastArena email to this address.</p>
    <p>Click the link below to confirm:</p>
    <p><a href="${url}">${url}</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you didn't request this change, you can ignore this email.</p>
  `);
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const config = getConfig();
  const url = `${config.APP_URL}/reset-password?token=${token}`;
  await sendEmail(email, 'Reset your BlastArena password', `
    <h1>Password Reset</h1>
    <p>Click the link below to reset your password:</p>
    <p><a href="${url}">${url}</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request a password reset, you can ignore this email.</p>
  `);
}
