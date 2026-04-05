DELETE FROM server_settings WHERE setting_key IN (
  'open_world_enabled',
  'open_world_guest_access',
  'open_world_max_players',
  'open_world_round_time',
  'open_world_map_width',
  'open_world_map_height',
  'open_world_wall_density',
  'open_world_respawn_delay'
);
