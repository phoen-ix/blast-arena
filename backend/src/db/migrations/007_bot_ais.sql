CREATE TABLE IF NOT EXISTS bot_ais (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  filename VARCHAR(255) NOT NULL,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by INT DEFAULT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INT NOT NULL DEFAULT 1,
  file_size INT NOT NULL DEFAULT 0,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO bot_ais (id, name, description, filename, is_builtin, is_active, uploaded_by, uploaded_at, version, file_size)
VALUES ('builtin', 'Default AI', 'The built-in BlastArena bot AI with easy/normal/hard difficulty presets', 'BotAI.ts', TRUE, TRUE, NULL, NOW(), 1, 0);
