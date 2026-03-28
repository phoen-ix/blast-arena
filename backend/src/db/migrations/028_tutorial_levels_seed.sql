-- Tutorial campaign: one level per power-up, hazard tile, special tile, and puzzle mechanic
-- 8 new worlds, 21 levels total

-- Reference existing enemy types
SET @blob_id = (SELECT id FROM campaign_enemy_types WHERE name = 'Blobbor' LIMIT 1);
SET @ghost_id = (SELECT id FROM campaign_enemy_types WHERE name = 'Spectra' LIMIT 1);

-- ============================================================================
-- WORLD 2: Power-Up Academy (classic theme) — 12 levels
-- ============================================================================
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('Power-Up Academy', 'Master every power-up and special tile.', 2, 'classic', TRUE);
SET @w_powerup = LAST_INSERT_ID();

-- Level 1: Extra Firepower (bomb_up)
-- Dead-end corridors force using multiple bombs simultaneously
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Extra Firepower', 'Pick up Bomb Up to place more bombs at once!', 1,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','empty','empty','destructible','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','empty','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','destructible','empty','empty','empty','empty','empty','destructible','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 1, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'bomb_up', 'x', 3, 'y', 3, 'hidden', false),
    JSON_OBJECT('type', 'bomb_up', 'x', 7, 'y', 7, 'hidden', true)
  ),
  'kill_all', NULL,
  3, 0, 45, FALSE, NULL,
  JSON_ARRAY('bomb_up', 'fire_up'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 2: Longer Reach (fire_up)
-- Long corridors where default range can't reach enemies
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Longer Reach', 'Fire Up extends your explosion range. Reach distant enemies!', 2,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 5),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 5, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'fire_up', 'x', 3, 'y', 1, 'hidden', false),
    JSON_OBJECT('type', 'fire_up', 'x', 1, 'y', 3, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 40, FALSE, JSON_OBJECT('bombUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 3: Quick Feet (speed_up)
-- Open corridors, ghost chases. Speed pickups let you outrun it to the goal
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Quick Feet', 'Speed Up makes you faster. Outrun the ghost and reach the goal!', 3,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','goal','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @ghost_id, 'x', 5, 'y', 5)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'speed_up', 'x', 5, 'y', 1, 'hidden', false),
    JSON_OBJECT('type', 'speed_up', 'x', 1, 'y', 5, 'hidden', false)
  ),
  'reach_goal', JSON_OBJECT('goalPosition', JSON_OBJECT('x', 9, 'y', 9)),
  3, 60, 25, FALSE, NULL,
  JSON_ARRAY('speed_up'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 4: Force Field (shield)
-- Tight quarters with ghost. Shield absorbs one hit
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Force Field', 'Shield absorbs one hit, then grants brief invulnerability!', 4,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','destructible','empty','empty','destructible','empty','destructible','empty','empty','destructible','wall'),
    JSON_ARRAY('wall','empty','wall','destructible','wall','empty','wall','destructible','wall','empty','wall'),
    JSON_ARRAY('wall','empty','destructible','empty','empty','empty','empty','empty','destructible','empty','wall'),
    JSON_ARRAY('wall','empty','wall','destructible','wall','empty','wall','destructible','wall','empty','wall'),
    JSON_ARRAY('wall','destructible','empty','empty','destructible','empty','destructible','empty','empty','destructible','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 9),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @ghost_id, 'x', 5, 'y', 5)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'shield', 'x', 3, 'y', 1, 'hidden', false),
    JSON_OBJECT('type', 'shield', 'x', 7, 'y', 9, 'hidden', true)
  ),
  'kill_all', NULL,
  2, 0, 45, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up', 'shield'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 5: Kick Start (kick)
-- Long corridors with enemies at far ends. Kick bombs down to reach them
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Kick Start', 'Bomb Kick lets you slide bombs by walking into them!', 5,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','wall','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','wall','empty','wall','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','wall','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 3),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 7)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'kick', 'x', 1, 'y', 3, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 45, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up', 'kick'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 6: Demolition Expert (pierce_bomb)
-- Thick destructible walls hiding enemies. Pierce blasts through all
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Demolition Expert', 'Pierce Bomb blasts through destructible walls!', 6,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','destructible','destructible','destructible','destructible','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','destructible','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','destructible','destructible','destructible','destructible','destructible','destructible','destructible','destructible','destructible','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','destructible','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','destructible','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','destructible','destructible','destructible','destructible','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'pierce_bomb', 'x', 1, 'y', 3, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 45, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 2),
  JSON_ARRAY('bomb_up', 'fire_up', 'pierce_bomb'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 7: Remote Control (remote_bomb)
-- Enemies patrol corridors. Place bomb, retreat, press E to detonate
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Remote Control', 'Remote Bomb lets you detonate with E. Time it right!', 7,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 5, 'y', 3),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 5, 'y', 7)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'remote_bomb', 'x', 3, 'y', 1, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 50, FALSE, JSON_OBJECT('bombUp', 2, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up', 'remote_bomb'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 8: Chain Reaction (line_bomb)
-- Long corridors aligned with enemy positions for devastating line bombs
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Chain Reaction', 'Line Bomb places a row of bombs in your facing direction!', 8,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 1, 'y', 9),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'line_bomb', 'x', 1, 'y', 3, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 40, FALSE, JSON_OBJECT('bombUp', 2, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up', 'line_bomb'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 9: Air Mail (bomb_throw)
-- Enemies in indestructible wall cages, only reachable by throwing bombs (Q)
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Air Mail', 'Bomb Throw lets you toss bombs over walls with Q!', 9,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','wall','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','wall','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','wall','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','wall','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 7, 'y', 3),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 3, 'y', 7)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'bomb_throw', 'x', 3, 'y', 1, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 45, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up', 'bomb_throw'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 10: Warp Zone (teleporters)
-- Teleporter pairs connect areas. Direct path blocked
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Warp Zone', 'Step on teleporters to warp across the map!', 10,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','wall','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','teleporter_a','empty','wall','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','wall','wall','wall','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','wall','wall','wall','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','teleporter_b','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','goal','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 5)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'bomb_up', 'x', 1, 'y', 5, 'hidden', false)
  ),
  'reach_goal', JSON_OBJECT('goalPosition', JSON_OBJECT('x', 9, 'y', 9)),
  3, 90, 35, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 11: Assembly Line (conveyors)
-- Conveyor belts push players and bombs directionally
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Assembly Line', 'Conveyor belts push you and your bombs. Navigate the currents!', 11,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','conveyor_right','conveyor_right','conveyor_right','conveyor_down','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','conveyor_down','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','conveyor_left','conveyor_left','conveyor_left','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','conveyor_up','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','conveyor_up','empty','empty','empty','empty','empty','empty','goal','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 3)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'speed_up', 'x', 1, 'y', 5, 'hidden', false)
  ),
  'reach_goal', JSON_OBJECT('goalPosition', JSON_OBJECT('x', 9, 'y', 9)),
  3, 90, 40, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up', 'speed_up'), 0.30,
  FALSE, FALSE, '[]', NULL, TRUE
);

-- Level 12: Tough Walls (reinforced walls)
-- Destructible walls require 2 hits. First hit cracks, second destroys
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_powerup, 'Tough Walls', 'Reinforced walls need two hits! First cracks, second destroys.', 12,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','destructible','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','destructible','wall','empty','wall','destructible','wall','empty','wall','destructible','wall'),
    JSON_ARRAY('wall','empty','empty','destructible','empty','empty','empty','destructible','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','destructible','empty','destructible','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 1, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'bomb_up', 'x', 5, 'y', 1, 'hidden', false),
    JSON_OBJECT('type', 'fire_up', 'x', 1, 'y', 5, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 55, FALSE, JSON_OBJECT('bombUp', 2, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up'), 0.30,
  TRUE, FALSE, '[]', NULL, TRUE
);

-- ============================================================================
-- WORLD 3: Tangled Trails (forest theme) — 1 level (vine + mud)
-- ============================================================================
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('Tangled Trails', 'Trudge through vines and mud that slow your movement.', 3, 'forest', TRUE);
SET @w_forest = LAST_INSERT_ID();

-- Level 1: Slow Going (vine + mud)
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_forest, 'Slow Going', 'Vines and mud slow your movement. Find a clear path or power through!', 1,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','vine','vine','vine','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','vine','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','vine','vine','empty','empty','mud','mud','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','mud','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','mud','mud','mud','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','vine','vine','vine','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','goal','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 5, 'y', 5)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'speed_up', 'x', 9, 'y', 3, 'hidden', false)
  ),
  'reach_goal', JSON_OBJECT('goalPosition', JSON_OBJECT('x', 9, 'y', 9)),
  3, 60, 30, FALSE, JSON_OBJECT('fireUp', 1),
  JSON_ARRAY('speed_up', 'fire_up'), 0.30,
  FALSE, TRUE, '[]', NULL, TRUE
);

-- ============================================================================
-- WORLD 4: Shifting Sands (desert theme) — 1 level (quicksand)
-- ============================================================================
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('Shifting Sands', 'The desert sands pull you under if you stand still too long.', 4, 'desert', TRUE);
SET @w_desert = LAST_INSERT_ID();

-- Level 1: Sinking Feeling (quicksand)
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_desert, 'Sinking Feeling', 'Quicksand pulls you under after 2 seconds! Keep moving!', 1,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','quicksand','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','quicksand','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','quicksand','wall','empty','wall','empty','wall','empty','wall','quicksand','wall'),
    JSON_ARRAY('wall','empty','empty','quicksand','empty','empty','empty','quicksand','empty','empty','wall'),
    JSON_ARRAY('wall','quicksand','wall','empty','wall','empty','wall','empty','wall','quicksand','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','quicksand','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','quicksand','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 1, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'shield', 'x', 5, 'y', 1, 'hidden', false),
    JSON_OBJECT('type', 'speed_up', 'x', 9, 'y', 9, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 90, 45, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up', 'shield', 'speed_up'), 0.30,
  FALSE, TRUE, '[]', NULL, TRUE
);

-- ============================================================================
-- WORLD 5: Frozen Peaks (ice theme) — 1 level (ice)
-- ============================================================================
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('Frozen Peaks', 'Ice tiles send you sliding until you hit something!', 5, 'ice', TRUE);
SET @w_ice = LAST_INSERT_ID();

-- Level 1: Slippery Slope (ice)
-- Pure sliding puzzle. Bombs can be placed as stoppers
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_ice, 'Slippery Slope', 'You slide on ice until hitting an obstacle. Place bombs to stop yourself!', 1,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','ice','ice','ice','ice','ice','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','ice','ice','ice','ice','empty','ice','ice','ice','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','ice','empty','empty','ice','ice','ice','empty','empty','ice','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','ice','ice','ice','empty','ice','ice','ice','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','ice','ice','ice','ice','ice','empty','goal','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(),
  JSON_ARRAY(),
  'reach_goal', JSON_OBJECT('goalPosition', JSON_OBJECT('x', 9, 'y', 9)),
  5, 0, 45, FALSE, JSON_OBJECT('bombUp', 2),
  JSON_ARRAY('bomb_up'), 0.00,
  FALSE, TRUE, '[]', NULL, TRUE
);

-- ============================================================================
-- WORLD 6: Infernal Crater (volcano theme) — 1 level (lava)
-- ============================================================================
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('Infernal Crater', 'Lava is deadly and detonates nearby bombs instantly!', 6, 'volcano', TRUE);
SET @w_volcano = LAST_INSERT_ID();

-- Level 1: Lava Flow (lava)
-- Lava rivers divide map. Impassable + detonates adjacent bombs
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_volcano, 'Lava Flow', 'Lava blocks your path and detonates adjacent bombs. Be careful!', 1,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','lava','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','lava','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','lava','empty','empty','destructible','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','lava','lava','lava','empty','empty','empty','lava','lava','lava','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','destructible','empty','empty','lava','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','lava','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','lava','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 1, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'fire_up', 'x', 3, 'y', 1, 'hidden', false),
    JSON_OBJECT('type', 'bomb_up', 'x', 1, 'y', 7, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 50, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up'), 0.30,
  FALSE, TRUE, '[]', NULL, TRUE
);

-- ============================================================================
-- WORLD 7: Fortress Keep (castle theme) — 1 level (spikes)
-- ============================================================================
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('Fortress Keep', 'Spike traps cycle between safe and lethal. Time your moves!', 7, 'castle', TRUE);
SET @w_castle = LAST_INSERT_ID();

-- Level 1: Tread Carefully (spikes)
-- Spikes at chokepoints cycle between safe (2s) and lethal (1s)
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_castle, 'Tread Carefully', 'Spikes cycle between safe and deadly. Watch the pattern and dash through!', 1,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','spikes','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','spikes','empty','empty','empty','empty','empty','spikes','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','spikes','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','spikes','empty','spikes','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','spikes','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','spikes','empty','empty','empty','empty','empty','spikes','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','spikes','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'shield', 'x', 5, 'y', 1, 'hidden', false),
    JSON_OBJECT('type', 'speed_up', 'x', 1, 'y', 9, 'hidden', false)
  ),
  'kill_all', NULL,
  3, 0, 55, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1, 'shield', true),
  JSON_ARRAY('bomb_up', 'fire_up', 'shield', 'speed_up'), 0.30,
  FALSE, TRUE, '[]', NULL, TRUE
);

-- ============================================================================
-- WORLD 8: The Abyss (void theme) — 1 level (dark_rift)
-- ============================================================================
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('The Abyss', 'Dark rifts teleport you to random locations. Embrace the chaos!', 8, 'void', TRUE);
SET @w_void = LAST_INSERT_ID();

-- Level 1: Into the Unknown (dark_rift)
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_void, 'Into the Unknown', 'Dark rifts teleport you randomly. Enemies get teleported too!', 1,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','dark_rift','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','dark_rift','empty','empty','empty','wall'),
    JSON_ARRAY('wall','dark_rift','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','dark_rift','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','dark_rift','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','dark_rift','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 9, 'y', 1),
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 1, 'y', 9)
  ),
  JSON_ARRAY(
    JSON_OBJECT('type', 'bomb_up', 'x', 5, 'y', 5, 'hidden', false),
    JSON_OBJECT('type', 'fire_up', 'x', 9, 'y', 9, 'hidden', false)
  ),
  'kill_all', NULL,
  5, 0, 45, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up'), 0.30,
  FALSE, TRUE, '[]', NULL, TRUE
);

-- ============================================================================
-- WORLD 9: Puzzle Chambers (classic theme) — 3 levels
-- ============================================================================
INSERT INTO campaign_worlds (name, description, sort_order, theme, is_published) VALUES
('Puzzle Chambers', 'Master switches, gates, and crumbling floors.', 9, 'classic', TRUE);
SET @w_puzzle = LAST_INSERT_ID();

-- Level 1: Lock and Key (toggle switches + gates)
-- Red switches toggle red gates open/closed
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_puzzle, 'Lock and Key', 'Step on switches to toggle gates. Red switch controls red gates!', 1,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','gate_red','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','switch_red','empty','empty','empty','gate_red','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','gate_red','empty','empty','empty','switch_red','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','gate_red','empty','empty','goal','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(),
  JSON_ARRAY(),
  'reach_goal', JSON_OBJECT('goalPosition', JSON_OBJECT('x', 9, 'y', 9)),
  5, 0, 45, FALSE, NULL,
  JSON_ARRAY(), 0.00,
  FALSE, FALSE, '[]',
  JSON_OBJECT('switchVariants', JSON_OBJECT('2,3', 'toggle', '8,7', 'toggle')),
  TRUE
);

-- Level 2: Weight of the World (pressure switches)
-- Pressure switch only active while occupied. Lure enemy onto it
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_puzzle, 'Weight of the World', 'Pressure switches only work while something stands on them!', 2,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','switch_blue','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','gate_blue','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','goal','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(
    JSON_OBJECT('enemyTypeId', @blob_id, 'x', 5, 'y', 3)
  ),
  JSON_ARRAY(),
  'reach_goal', JSON_OBJECT('goalPosition', JSON_OBJECT('x', 9, 'y', 9)),
  5, 0, 60, FALSE, JSON_OBJECT('bombUp', 1, 'fireUp', 1),
  JSON_ARRAY('bomb_up', 'fire_up'), 0.00,
  FALSE, FALSE, '[]',
  JSON_OBJECT('switchVariants', JSON_OBJECT('4,5', 'pressure')),
  TRUE
);

-- Level 3: Crumbling Ruins (crumbling floors)
-- Floors collapse after stepping off. Plan your path carefully
INSERT INTO campaign_levels (
  world_id, name, description, sort_order,
  map_width, map_height, tiles, fill_mode, wall_density,
  player_spawns, enemy_placements, powerup_placements,
  win_condition, win_condition_config,
  lives, time_limit, par_time, carry_over_powerups, starting_powerups,
  available_powerup_types, powerup_drop_rate, reinforced_walls, hazard_tiles,
  covered_tiles, puzzle_config, is_published
) VALUES (
  @w_puzzle, 'Crumbling Ruins', 'The floor crumbles behind you! Plan your path to the goal carefully.', 3,
  11, 11,
  JSON_ARRAY(
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'),
    JSON_ARRAY('wall','empty','crumbling','crumbling','crumbling','empty','empty','empty','empty','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','crumbling','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','crumbling','crumbling','crumbling','crumbling','crumbling','empty','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','crumbling','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','crumbling','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','crumbling','wall'),
    JSON_ARRAY('wall','empty','crumbling','crumbling','crumbling','crumbling','crumbling','empty','crumbling','crumbling','wall'),
    JSON_ARRAY('wall','empty','wall','empty','wall','empty','wall','empty','wall','empty','wall'),
    JSON_ARRAY('wall','empty','empty','empty','empty','empty','empty','empty','empty','goal','wall'),
    JSON_ARRAY('wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall')
  ),
  'handcrafted', 0.65,
  JSON_ARRAY(JSON_OBJECT('x', 1, 'y', 1)),
  JSON_ARRAY(),
  JSON_ARRAY(),
  'reach_goal', JSON_OBJECT('goalPosition', JSON_OBJECT('x', 9, 'y', 9)),
  5, 0, 50, FALSE, NULL,
  JSON_ARRAY(), 0.00,
  FALSE, FALSE, '[]', NULL, TRUE
);
