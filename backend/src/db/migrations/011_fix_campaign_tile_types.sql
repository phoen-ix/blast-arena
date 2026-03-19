-- Fix seed levels: 'indestructible' is not a valid TileType, should be 'wall'
UPDATE campaign_levels SET tiles = REPLACE(tiles, '"indestructible"', '"wall"') WHERE tiles LIKE '%indestructible%';
