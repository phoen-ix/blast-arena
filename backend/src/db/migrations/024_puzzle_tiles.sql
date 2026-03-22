-- Add puzzle configuration column to campaign levels
ALTER TABLE campaign_levels ADD COLUMN puzzle_config JSON DEFAULT NULL;
