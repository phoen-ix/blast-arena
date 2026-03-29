ALTER TABLE users
  DROP COLUMN email,
  DROP COLUMN pending_email,
  MODIFY COLUMN email_hash VARCHAR(64) NOT NULL,
  ADD UNIQUE INDEX idx_users_email_hash (email_hash);
