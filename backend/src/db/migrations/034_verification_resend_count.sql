ALTER TABLE users
  ADD COLUMN verification_resend_count TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER email_verify_token;
