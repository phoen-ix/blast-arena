-- Seed enemy types for Training Grounds
INSERT INTO campaign_enemy_types (name, description, config, is_boss) VALUES
('Blobbor', 'Slow-moving blob enemy. Wanders randomly.', '{
  "speed": 0.5,
  "movementPattern": "random_walk",
  "canPassWalls": false,
  "canPassBombs": false,
  "canBomb": false,
  "hp": 1,
  "contactDamage": true,
  "sprite": {
    "bodyShape": "blob",
    "primaryColor": "#44cc44",
    "secondaryColor": "#228822",
    "eyeStyle": "round",
    "hasTeeth": false,
    "hasHorns": false
  },
  "dropChance": 0.3,
  "dropTable": ["bomb_up", "fire_up", "speed_up"],
  "isBoss": false,
  "sizeMultiplier": 1,
  "bossPhases": []
}', FALSE),
('Spectra', 'Ghost enemy that phases through walls and chases players.', '{
  "speed": 0.8,
  "movementPattern": "chase_player",
  "canPassWalls": true,
  "canPassBombs": true,
  "canBomb": false,
  "hp": 1,
  "contactDamage": true,
  "sprite": {
    "bodyShape": "ghost",
    "primaryColor": "#aa88ff",
    "secondaryColor": "#6644cc",
    "eyeStyle": "sleepy",
    "hasTeeth": false,
    "hasHorns": false
  },
  "dropChance": 0.4,
  "dropTable": ["speed_up", "shield", "kick"],
  "isBoss": false,
  "sizeMultiplier": 1,
  "bossPhases": []
}', FALSE),
('Bombotron', 'Stationary robot that drops bombs when players get near.', '{
  "speed": 0,
  "movementPattern": "stationary",
  "canPassWalls": false,
  "canPassBombs": false,
  "canBomb": true,
  "bombConfig": {
    "fireRange": 2,
    "cooldownTicks": 60,
    "trigger": "proximity",
    "proximityRange": 4
  },
  "hp": 2,
  "contactDamage": true,
  "sprite": {
    "bodyShape": "robot",
    "primaryColor": "#cc4444",
    "secondaryColor": "#882222",
    "eyeStyle": "angry",
    "hasTeeth": true,
    "hasHorns": false
  },
  "dropChance": 0.6,
  "dropTable": ["fire_up", "bomb_up", "pierce_bomb", "remote_bomb"],
  "isBoss": false,
  "sizeMultiplier": 1,
  "bossPhases": []
}', FALSE);

-- Seed world: Training Grounds
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('Training Grounds', 'Learn the basics of combat against simple enemies.', 1, 'classic', TRUE);

SET @world_id = LAST_INSERT_ID();

-- We need to reference enemy type IDs. Since they were just inserted, get them:
SET @blob_id = (SELECT id FROM campaign_enemy_types WHERE name = 'Blobbor' LIMIT 1);
SET @ghost_id = (SELECT id FROM campaign_enemy_types WHERE name = 'Spectra' LIMIT 1);
SET @robot_id = (SELECT id FROM campaign_enemy_types WHERE name = 'Bombotron' LIMIT 1);

-- Level 1: First Steps (15x13, 3 lives, no timer, kill_all, 3 blobs, 2 powerups)
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles, is_published
) VALUES (
  @world_id, 'First Steps', 'Defeat all enemies to proceed. Watch out for Blobbors!', 1,
  15, 13,
  -- 15x13 tile map: 'wall' borders, 'wall' grid pattern, 'destructible' scattered, 'empty' corridors
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','empty','empty','empty','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','destructible','wall','empty','wall','empty','wall','empty','wall','destructible','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','empty','empty','empty','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  -- 3 blob enemies spread around the map
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 13, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 7, 'y', 6),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 1, 'y', 11)
  ),
  -- 2 powerups hidden under destructible walls
  JSON_ARRAY(
    JSON_OBJECT('type', 'bomb_up', 'x', 4, 'y', 1, 'hidden', true),
    JSON_OBJECT('type', 'fire_up', 'x', 10, 'y', 11, 'hidden', true)
  ),
  'kill_all', NULL,
  3, 0, FALSE, NULL,
  JSON_ARRAY('bomb_up', 'fire_up', 'speed_up'), 0.30,
  FALSE, FALSE, TRUE
);

-- Level 2: Ghost Town (19x15, 3 lives, 120s timer, find_exit, 2 blobs + 2 ghosts, 3 powerups)
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles, is_published
) VALUES (
  @world_id, 'Ghost Town', 'Find the hidden exit! Beware of ghosts that pass through walls.', 2,
  19, 15,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','destructible','wall','empty','wall','empty','wall','empty','wall','destructible','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','destructible','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','destructible','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','destructible','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','destructible','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','destructible','wall','empty','wall','empty','wall','empty','wall','destructible','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  -- 2 blobs + 2 ghosts
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 3),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 17, 'y', 13),
    JSON_OBJECT('enemyTypeId', @ghost_id, 'x', 5, 'y', 7),
    JSON_OBJECT('enemyTypeId', @ghost_id, 'x', 13, 'y', 7)
  ),
  -- 3 powerups (2 hidden, 1 visible)
  JSON_ARRAY(
    JSON_OBJECT('type', 'speed_up', 'x', 9, 'y', 7, 'hidden', false),
    JSON_OBJECT('type', 'shield', 'x', 7, 'y', 3, 'hidden', true),
    JSON_OBJECT('type', 'kick', 'x', 15, 'y', 11, 'hidden', true)
  ),
  'find_exit', JSON_OBJECT('exitPosition', JSON_OBJECT('x', 17, 'y', 1), 'killTarget', 3),
  3, 120, FALSE, NULL,
  JSON_ARRAY('bomb_up', 'fire_up', 'speed_up', 'shield', 'kick'), 0.30,
  FALSE, FALSE, TRUE
);

-- Level 3: Bomber's Lair (21x17, 5 lives, 180s, kill_all, 3 blob + 2 ghost + 1 robot, 5 powerups)
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles, is_published
) VALUES (
  @world_id, 'Bomber''s Lair', 'Clear the lair! The Bombotron fires back.', 3,
  21, 17,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','destructible','empty','empty','empty','destructible','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','destructible','empty','empty','empty','destructible','empty','destructible','empty','destructible','empty','destructible','empty','empty','empty','destructible','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','destructible','wall','empty','wall','empty','wall','empty','wall','empty','wall','destructible','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','destructible','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','destructible','wall','empty','wall','destructible','wall','empty','wall','empty','wall','destructible','wall','empty','wall','destructible','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','empty','wall','empty','wall','destructible','wall','destructible','wall','empty','wall','empty','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','destructible','wall','empty','wall','destructible','wall','empty','wall','empty','wall','destructible','wall','empty','wall','destructible','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','destructible','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','destructible','wall','empty','wall','empty','wall','empty','wall','empty','wall','destructible','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','destructible','empty','empty','empty','destructible','empty','destructible','empty','destructible','empty','destructible','empty','empty','empty','destructible','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','destructible','empty','empty','empty','destructible','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  -- 3 blobs + 2 ghosts + 1 robot bomber
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 19, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 10, 'y', 5),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 1, 'y', 15),
    JSON_OBJECT('enemyTypeId', @ghost_id, 'x', 5, 'y', 8),
    JSON_OBJECT('enemyTypeId', @ghost_id, 'x', 15, 'y', 8),
    JSON_OBJECT('enemyTypeId', @robot_id, 'x', 10, 'y', 8)
  ),
  -- 5 powerups (3 hidden, 2 visible)
  JSON_ARRAY(
    JSON_OBJECT('type', 'bomb_up', 'x', 5, 'y', 3, 'hidden', true),
    JSON_OBJECT('type', 'fire_up', 'x', 15, 'y', 3, 'hidden', true),
    JSON_OBJECT('type', 'speed_up', 'x', 10, 'y', 1, 'hidden', false),
    JSON_OBJECT('type', 'shield', 'x', 3, 'y', 13, 'hidden', true),
    JSON_OBJECT('type', 'pierce_bomb', 'x', 17, 'y', 13, 'hidden', false)
  ),
  'kill_all', NULL,
  5, 180, FALSE, NULL,
  JSON_ARRAY('bomb_up', 'fire_up', 'speed_up', 'shield', 'kick', 'pierce_bomb', 'remote_bomb'), 0.30,
  FALSE, FALSE, TRUE
);
