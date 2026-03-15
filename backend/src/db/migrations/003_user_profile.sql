ALTER TABLE users
  ADD COLUMN pending_email VARCHAR(255) DEFAULT NULL AFTER email_verify_token,
  ADD COLUMN email_change_token VARCHAR(64) DEFAULT NULL AFTER pending_email,
  ADD COLUMN email_change_expires TIMESTAMP NULL DEFAULT NULL AFTER email_change_token,
  ADD INDEX idx_users_email_change_token (email_change_token);
