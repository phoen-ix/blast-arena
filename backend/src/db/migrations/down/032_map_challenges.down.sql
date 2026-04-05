DROP TABLE IF EXISTS challenge_scores;
DROP TABLE IF EXISTS map_challenges;
ALTER TABLE matches DROP INDEX idx_matches_custom_map;
ALTER TABLE matches DROP COLUMN custom_map_id;
DELETE FROM settings WHERE `key` = 'challenges_enabled';
