CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(30) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token VARCHAR(64) DEFAULT NULL,
  password_reset_token VARCHAR(64) DEFAULT NULL,
  password_reset_expires TIMESTAMP NULL DEFAULT NULL,
  role ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user',
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason VARCHAR(500) DEFAULT NULL,
  last_login TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email_verify_token (email_verify_token),
  INDEX idx_users_password_reset_token (password_reset_token)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_tokens_user_id (user_id),
  INDEX idx_refresh_tokens_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_ip_time (ip_address, attempted_at)
);

CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_code VARCHAR(10) NOT NULL,
  game_mode ENUM('ffa', 'teams', 'battle_royale') NOT NULL,
  map_seed INT NOT NULL,
  map_width INT NOT NULL DEFAULT 15,
  map_height INT NOT NULL DEFAULT 13,
  max_players INT NOT NULL DEFAULT 8,
  status ENUM('waiting', 'countdown', 'playing', 'finished', 'aborted') NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMP NULL DEFAULT NULL,
  finished_at TIMESTAMP NULL DEFAULT NULL,
  duration INT DEFAULT NULL,
  winner_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_matches_status (status),
  INDEX idx_matches_game_mode (game_mode),
  INDEX idx_matches_created (created_at)
);

CREATE TABLE IF NOT EXISTS match_players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  user_id INT NOT NULL,
  team INT DEFAULT NULL,
  placement INT DEFAULT NULL,
  kills INT NOT NULL DEFAULT 0,
  deaths INT NOT NULL DEFAULT 0,
  bombs_placed INT NOT NULL DEFAULT 0,
  powerups_collected INT NOT NULL DEFAULT 0,
  survived_seconds INT NOT NULL DEFAULT 0,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_match_player (match_id, user_id),
  INDEX idx_match_players_user (user_id)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id INT PRIMARY KEY,
  total_matches INT NOT NULL DEFAULT 0,
  total_wins INT NOT NULL DEFAULT 0,
  total_kills INT NOT NULL DEFAULT 0,
  total_deaths INT NOT NULL DEFAULT 0,
  total_bombs INT NOT NULL DEFAULT 0,
  total_powerups INT NOT NULL DEFAULT 0,
  total_playtime INT NOT NULL DEFAULT 0,
  win_streak INT NOT NULL DEFAULT 0,
  best_win_streak INT NOT NULL DEFAULT 0,
  elo_rating INT NOT NULL DEFAULT 1000,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INT NOT NULL,
  details TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_actions_created (created_at)
)
