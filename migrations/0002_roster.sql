PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roster_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  character_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Tanque', 'Sanador', 'DPS')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_roster_requests_status_created
  ON roster_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roster_requests_discord_status
  ON roster_requests(discord_id, status);

CREATE TABLE IF NOT EXISTS roster_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  class_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Tanque', 'Sanador', 'DPS')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
