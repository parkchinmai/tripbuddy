-- 0001_create_tables.sql: Initial schema for trip-buddy

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  bank_account TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('approved','pending','suspended')),
  access_level TEXT NOT NULL DEFAULT 'user' CHECK(access_level IN ('admin','user')),
  join_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  dates TEXT NOT NULL,
  budget REAL NOT NULL DEFAULT 0,
  cover_img_url TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('active','upcoming','past')),
  days INTEGER DEFAULT NULL,
  member_count INTEGER DEFAULT NULL,
  budget_per_person REAL DEFAULT NULL,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trip_members (
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, member_id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other' CHECK(category IN ('Food','Travel','Accommodation','Other')),
  date TEXT NOT NULL,
  paid_by TEXT NOT NULL,
  split_with TEXT NOT NULL DEFAULT '[]',
  custom_shares TEXT DEFAULT NULL,
  slip_url TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_member_id ON trip_members(member_id);
