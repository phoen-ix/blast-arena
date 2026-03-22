-- Add indexes for common campaign query patterns
CREATE INDEX idx_levels_published_order ON campaign_levels(is_published, sort_order);
CREATE INDEX idx_progress_user_level ON campaign_progress(user_id, level_id);
