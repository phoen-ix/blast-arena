ALTER TABLE users
  ADD COLUMN email_hash VARCHAR(64) DEFAULT NULL AFTER email,
  ADD COLUMN email_hint VARCHAR(50) DEFAULT NULL AFTER email_hash,
  ADD COLUMN pending_email_hash VARCHAR(64) DEFAULT NULL AFTER pending_email,
  ADD COLUMN pending_email_hint VARCHAR(50) DEFAULT NULL AFTER pending_email_hash;
