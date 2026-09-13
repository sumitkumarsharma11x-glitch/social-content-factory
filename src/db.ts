/**
 * Database connection + schema, per the approved persistence-architecture.md.
 * Exactly the two tables, constraints, and indexes from that design — no
 * additions.
 */

import Database from "better-sqlite3";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS batches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  provider    TEXT    NOT NULL CHECK (provider IN ('gemini', 'claude', 'ollama', 'mock')),
  model       TEXT    NOT NULL CHECK (length(trim(model)) > 0),
  status      TEXT    NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'archived'))
);

CREATE TABLE IF NOT EXISTS pieces (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id      INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  platform      TEXT    NOT NULL CHECK (platform IN ('instagram_reel', 'facebook_post', 'youtube_short')),
  piece_number  INTEGER NOT NULL CHECK (piece_number BETWEEN 1 AND 10),
  title         TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  body          TEXT    NOT NULL CHECK (length(trim(body)) > 0),
  hashtags      TEXT    NOT NULL CHECK (json_valid(hashtags) AND json_array_length(hashtags) > 0),
  cta           TEXT    NOT NULL CHECK (length(trim(cta)) > 0),
  status        TEXT    NOT NULL CHECK (status IN ('pending', 'edited', 'approved', 'rejected')),

  UNIQUE (batch_id, platform, piece_number)
);

CREATE INDEX IF NOT EXISTS idx_pieces_batch_platform ON pieces(batch_id, platform);
CREATE INDEX IF NOT EXISTS idx_pieces_status         ON pieces(status);
CREATE INDEX IF NOT EXISTS idx_batches_status        ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_at    ON batches(created_at);
`;

/**
 * Opens a better-sqlite3 database at `path` (or an in-memory DB for tests
 * when `path` is ":memory:"), enables foreign key enforcement — which
 * better-sqlite3 does NOT do by default — and ensures the schema exists.
 */
export function openDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}
