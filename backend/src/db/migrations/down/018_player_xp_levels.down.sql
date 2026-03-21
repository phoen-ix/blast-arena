ALTER TABLE user_stats DROP COLUMN total_xp;
ALTER TABLE user_stats DROP COLUMN level;
ALTER TABLE cosmetics MODIFY COLUMN unlock_type ENUM('achievement','campaign_stars','default') NOT NULL DEFAULT 'achievement';
