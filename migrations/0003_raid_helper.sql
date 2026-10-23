ALTER TABLE events ADD COLUMN raid_helper_id TEXT;
ALTER TABLE events ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_raid_helper_id
ON events(raid_helper_id)
WHERE raid_helper_id IS NOT NULL;
