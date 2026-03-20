-- Add missing indexes on campaign foreign keys for query performance
CREATE INDEX idx_progress_level ON campaign_progress(level_id);
CREATE INDEX idx_user_state_world ON campaign_user_state(current_world_id);
CREATE INDEX idx_user_state_level ON campaign_user_state(current_level_id);
