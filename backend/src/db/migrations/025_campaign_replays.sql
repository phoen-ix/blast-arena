CREATE TABLE IF NOT EXISTS campaign_replays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  level_id INT NOT NULL,
  duration INT NOT NULL DEFAULT 0,
  result ENUM('completed', 'failed') NOT NULL,
  stars INT NOT NULL DEFAULT 0,
  coop_mode BOOLEAN NOT NULL DEFAULT FALSE,
  buddy_mode BOOLEAN NOT NULL DEFAULT FALSE,
  filename VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES campaign_levels(id) ON DELETE CASCADE,
  INDEX idx_campaign_replays_user (user_id),
  INDEX idx_campaign_replays_level (level_id)
);
