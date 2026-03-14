-- This file runs on first MariaDB start only
-- Actual schema is managed by backend migrations
-- Just ensure the database exists and grant permissions

GRANT ALL PRIVILEGES ON `blast_arena`.* TO 'blast_user'@'%';
FLUSH PRIVILEGES;
