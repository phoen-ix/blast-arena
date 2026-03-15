-- Add soft delete columns to users
ALTER TABLE users ADD COLUMN is_deactivated BOOLEAN NOT NULL DEFAULT FALSE AFTER is_banned;
ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP NULL DEFAULT NULL AFTER is_deactivated;

-- Fix game_mode ENUM to include all 6 modes
ALTER TABLE matches MODIFY COLUMN game_mode ENUM('ffa', 'teams', 'battle_royale', 'sudden_death', 'deathmatch', 'king_of_the_hill') NOT NULL;

-- Create announcements table for persistent banners
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  type ENUM('banner', 'toast') NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dismissed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_announcements_active (is_active, type)
);
