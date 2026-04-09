-- Add index on campaign_levels.world_id for COUNT(*) subqueries in campaign service
CREATE INDEX idx_levels_world ON campaign_levels(world_id);
