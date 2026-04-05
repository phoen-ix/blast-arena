-- Community Map Challenges: weekly featured maps with leaderboards

-- Link matches to custom maps for challenge tracking
ALTER TABLE matches ADD COLUMN IF NOT EXISTS custom_map_id INT DEFAULT NULL;
ALTER TABLE matches ADD INDEX IF NOT EXISTS idx_matches_custom_map (custom_map_id);

-- Challenge definitions
CREATE TABLE IF NOT EXISTS map_challenges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT DEFAULT '',
  custom_map_id INT NOT NULL,
  game_mode VARCHAR(30) NOT NULL DEFAULT 'ffa',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (custom_map_id) REFERENCES custom_maps(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_map_challenges_active (is_active)
);

-- Per-user per-challenge scores
CREATE TABLE IF NOT EXISTS challenge_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challenge_id INT NOT NULL,
  user_id INT NOT NULL,
  wins INT NOT NULL DEFAULT 0,
  kills INT NOT NULL DEFAULT 0,
  deaths INT NOT NULL DEFAULT 0,
  games_played INT NOT NULL DEFAULT 0,
  best_placement INT DEFAULT NULL,
  FOREIGN KEY (challenge_id) REFERENCES map_challenges(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_challenge_user (challenge_id, user_id),
  INDEX idx_challenge_ranking (challenge_id, wins DESC, kills DESC)
);

-- Seed global toggle
INSERT INTO server_settings (setting_key, setting_value) VALUES ('challenges_enabled', 'true')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
