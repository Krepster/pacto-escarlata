-- Pacto Escarlata: buscador público de grupos PvE.
-- Migración independiente: no altera events, roster_members ni Raid-Helper.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS dungeon_groups (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 100),
  dungeon_name TEXT NOT NULL CHECK (length(dungeon_name) BETWEEN 2 AND 100),
  creator_name TEXT NOT NULL CHECK (length(creator_name) BETWEEN 2 AND 40),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 1500),
  min_level INTEGER NOT NULL CHECK (min_level BETWEEN 1 AND 60),
  max_level INTEGER NOT NULL CHECK (max_level BETWEEN min_level AND 60),
  starts_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  tank_slots INTEGER NOT NULL DEFAULT 1 CHECK (tank_slots BETWEEN 0 AND 5),
  healer_slots INTEGER NOT NULL DEFAULT 1 CHECK (healer_slots BETWEEN 0 AND 5),
  dps_slots INTEGER NOT NULL DEFAULT 3 CHECK (dps_slots BETWEEN 0 AND 5),
  status TEXT NOT NULL DEFAULT 'recruiting'
    CHECK (status IN ('recruiting', 'full', 'in_progress', 'completed', 'cancelled')),
  management_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dungeon_groups_status_starts
  ON dungeon_groups(status, starts_at);

CREATE INDEX IF NOT EXISTS idx_dungeon_groups_dungeon_status
  ON dungeon_groups(dungeon_name, status);

CREATE TABLE IF NOT EXISTS dungeon_group_applications (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES dungeon_groups(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL CHECK (length(character_name) BETWEEN 2 AND 40),
  class_name TEXT NOT NULL CHECK (length(class_name) BETWEEN 2 AND 30),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 60),
  role TEXT NOT NULL CHECK (role IN ('tank', 'healer', 'dps')),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  contact TEXT NOT NULL DEFAULT '' CHECK (length(contact) <= 120),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(group_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_dungeon_applications_group_status
  ON dungeon_group_applications(group_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_dungeon_applications_character
  ON dungeon_group_applications(character_name, created_at);
