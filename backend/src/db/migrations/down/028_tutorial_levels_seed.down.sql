-- Remove tutorial levels and worlds (reverse of 028_tutorial_levels_seed.sql)
DELETE FROM campaign_levels WHERE world_id IN (
  SELECT id FROM campaign_worlds WHERE name IN (
    'Power-Up Academy',
    'Tangled Trails',
    'Shifting Sands',
    'Frozen Peaks',
    'Infernal Crater',
    'Fortress Keep',
    'The Abyss',
    'Puzzle Chambers'
  )
);

DELETE FROM campaign_worlds WHERE name IN (
  'Power-Up Academy',
  'Tangled Trails',
  'Shifting Sands',
  'Frozen Peaks',
  'Infernal Crater',
  'Fortress Keep',
  'The Abyss',
  'Puzzle Chambers'
);
