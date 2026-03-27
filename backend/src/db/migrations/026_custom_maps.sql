CREATE TABLE IF NOT EXISTS custom_maps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  map_width INT NOT NULL,
  map_height INT NOT NULL,
  tiles JSON NOT NULL,
  spawn_points JSON NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT NOT NULL,
  play_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_custom_maps_creator (created_by),
  INDEX idx_custom_maps_published (is_published, play_count DESC)
);
