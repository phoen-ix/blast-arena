-- Open world game mode settings
INSERT INTO server_settings (setting_key, setting_value) VALUES
  ('open_world_enabled', 'true'),
  ('open_world_guest_access', 'true'),
  ('open_world_max_players', '32'),
  ('open_world_round_time', '300'),
  ('open_world_map_width', '51'),
  ('open_world_map_height', '41'),
  ('open_world_wall_density', '0.5'),
  ('open_world_respawn_delay', '3')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
