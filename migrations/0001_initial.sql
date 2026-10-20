PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  rank_name TEXT NOT NULL DEFAULT 'Miembro',
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  class_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Tanque', 'Sanador', 'DPS')),
  level INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('PvE', 'PvP', 'Social')),
  starts_at TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  signup_status TEXT NOT NULL DEFAULT 'signed_up'
    CHECK (signup_status IN ('signed_up', 'tentative', 'declined', 'waitlist')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, character_id)
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO events (title, event_type, starts_at, description)
VALUES
 ('Noche de mazmorras', 'PvE', '2026-10-23T20:30:00+02:00', 'Evento de ejemplo; sustituir por fecha y hora reales.'),
 ('Jornada de hermandad', 'Social', '2026-10-24T21:00:00+02:00', 'Evento de ejemplo; sustituir por fecha y hora reales.'),
 ('Campo de batalla', 'PvP', '2026-10-25T20:00:00+02:00', 'Evento de ejemplo; sustituir por fecha y hora reales.');
