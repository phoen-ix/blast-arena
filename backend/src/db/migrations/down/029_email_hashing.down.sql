ALTER TABLE users
  DROP COLUMN email_hash,
  DROP COLUMN email_hint,
  DROP COLUMN pending_email_hash,
  DROP COLUMN pending_email_hint;
