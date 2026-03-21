-- Player XP and Level system
ALTER TABLE user_stats ADD COLUMN total_xp INT NOT NULL DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN level INT NOT NULL DEFAULT 1;

-- Add level_milestone unlock type for cosmetics
ALTER TABLE cosmetics MODIFY COLUMN unlock_type ENUM('achievement','campaign_stars','level_milestone','default') NOT NULL DEFAULT 'achievement';
