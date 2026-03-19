-- Add par_time column to campaign_levels for star rating thresholds
ALTER TABLE campaign_levels ADD COLUMN par_time INT NOT NULL DEFAULT 0 AFTER time_limit;

-- Update seed levels with reasonable par times (seconds)
UPDATE campaign_levels SET par_time = 60 WHERE name = 'First Steps';
UPDATE campaign_levels SET par_time = 90 WHERE name = 'Ghost Town';
UPDATE campaign_levels SET par_time = 120 WHERE name = 'Bomber''s Lair';
