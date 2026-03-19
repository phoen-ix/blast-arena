-- Campaign enemy type templates (admin-created, data-driven)
CREATE TABLE IF NOT EXISTS campaign_enemy_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  config JSON NOT NULL,
  is_boss BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- World containers
CREATE TABLE IF NOT EXISTS campaign_worlds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  theme VARCHAR(50) NOT NULL DEFAULT 'classic',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_worlds_order (sort_order)
);

-- Levels (full map + enemy/powerup placements as JSON)
CREATE TABLE IF NOT EXISTS campaign_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  world_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  map_width INT NOT NULL,
  map_height INT NOT NULL,
  tiles JSON NOT NULL,
  fill_mode ENUM('handcrafted','hybrid') NOT NULL DEFAULT 'handcrafted',
  wall_density DECIMAL(3,2) NOT NULL DEFAULT 0.65,
  player_spawns JSON NOT NULL,
  enemy_placements JSON NOT NULL,
  powerup_placements JSON NOT NULL,
  win_condition VARCHAR(30) NOT NULL DEFAULT 'kill_all',
  win_condition_config JSON DEFAULT NULL,
  lives INT NOT NULL DEFAULT 3,
  time_limit INT NOT NULL DEFAULT 0,
  carry_over_powerups BOOLEAN NOT NULL DEFAULT FALSE,
  starting_powerups JSON DEFAULT NULL,
  available_powerup_types JSON DEFAULT NULL,
  powerup_drop_rate DECIMAL(3,2) NOT NULL DEFAULT 0.30,
  reinforced_walls BOOLEAN NOT NULL DEFAULT FALSE,
  hazard_tiles BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (world_id) REFERENCES campaign_worlds(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_levels_world_order (world_id, sort_order)
);

-- Player progress per level
CREATE TABLE IF NOT EXISTS campaign_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  level_id INT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  best_time_seconds INT DEFAULT NULL,
  stars INT NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES campaign_levels(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_level (user_id, level_id),
  INDEX idx_progress_user (user_id)
);

-- User campaign state (current position, carried powerups)
CREATE TABLE IF NOT EXISTS campaign_user_state (
  user_id INT PRIMARY KEY,
  current_world_id INT DEFAULT NULL,
  current_level_id INT DEFAULT NULL,
  carried_powerups JSON DEFAULT NULL,
  total_levels_completed INT NOT NULL DEFAULT 0,
  total_stars INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (current_world_id) REFERENCES campaign_worlds(id) ON DELETE SET NULL,
  FOREIGN KEY (current_level_id) REFERENCES campaign_levels(id) ON DELETE SET NULL
);
