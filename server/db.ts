/**
 * SQLite connection + schema bootstrap (v0.3).
 *
 * The whole deployment is one file on disk (DATABASE_PATH, default ./data.db).
 * `better-sqlite3` is synchronous, so every storage method below stays
 * synchronous and the existing IStorage signatures are unchanged.
 *
 * Schema creation is idempotent DDL rather than a drizzle-kit migration run so
 * that `npm start` on a fresh VPS needs no extra step. `npm run db:push` still
 * works for schema diffing during development.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "@shared/schema";
import { env } from "./env";

if (env.databasePath !== ":memory:") {
  try {
    mkdirSync(dirname(env.databasePath), { recursive: true });
  } catch {
    /* directory already exists */
  }
}

export const sqlite = new Database(env.databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL UNIQUE,
     display_name TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT '',
     last_sign_in_at TEXT NOT NULL DEFAULT '',
     is_demo INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     created_at TEXT NOT NULL,
     last_seen_at TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     method TEXT NOT NULL DEFAULT 'passkey'
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS passkeys (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     label TEXT NOT NULL DEFAULT 'Passkey',
     public_key TEXT NOT NULL,
     counter INTEGER NOT NULL DEFAULT 0,
     transports TEXT NOT NULL DEFAULT '[]',
     device_type TEXT NOT NULL DEFAULT '',
     backed_up INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL,
     last_used_at TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE INDEX IF NOT EXISTS passkeys_user_idx ON passkeys(user_id)`,
  `CREATE TABLE IF NOT EXISTS webauthn_challenges (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL DEFAULT '',
     purpose TEXT NOT NULL,
     challenge TEXT NOT NULL,
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS magic_links (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL,
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     used_at TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS projects (
     id TEXT PRIMARY KEY,
     owner_id TEXT NOT NULL DEFAULT '',
     title TEXT NOT NULL,
     subtitle TEXT NOT NULL DEFAULT '',
     author TEXT NOT NULL DEFAULT '',
     genre TEXT NOT NULL DEFAULT '',
     word_target INTEGER NOT NULL DEFAULT 90000,
     premise TEXT NOT NULL DEFAULT '',
     method TEXT NOT NULL DEFAULT 'hybrid',
     format TEXT NOT NULL DEFAULT 'Novel',
     archived INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT '',
     sort_index INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner_id)`,
  `CREATE TABLE IF NOT EXISTS scenes (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     chapter TEXT NOT NULL DEFAULT 'Chapter One',
     title TEXT NOT NULL,
     content TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'blank',
     pov TEXT NOT NULL DEFAULT '',
     objective TEXT NOT NULL DEFAULT '',
     conflict TEXT NOT NULL DEFAULT '',
     change TEXT NOT NULL DEFAULT '',
     order_index INTEGER NOT NULL DEFAULT 0,
     draft_zero INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS characters (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     name TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT '',
     motivation TEXT NOT NULL DEFAULT '',
     wants TEXT NOT NULL DEFAULT '',
     fears TEXT NOT NULL DEFAULT '',
     wins TEXT NOT NULL DEFAULT '',
     losses TEXT NOT NULL DEFAULT '',
     arc TEXT NOT NULL DEFAULT '',
     voice TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS plots (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     name TEXT NOT NULL,
     kind TEXT NOT NULL DEFAULT 'subplot',
     premise TEXT NOT NULL DEFAULT '',
     stakes TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'open',
     setups TEXT NOT NULL DEFAULT '[]',
     payoffs TEXT NOT NULL DEFAULT '[]',
     open_question TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS events (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     label TEXT NOT NULL,
     story_time TEXT NOT NULL DEFAULT '',
     confidence TEXT NOT NULL DEFAULT 'fixed',
     notes TEXT NOT NULL DEFAULT '',
     order_index INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS world_entries (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     name TEXT NOT NULL,
     category TEXT NOT NULL DEFAULT 'Rule system',
     facts TEXT NOT NULL DEFAULT '',
     rules TEXT NOT NULL DEFAULT '',
     limits TEXT NOT NULL DEFAULT '',
     costs TEXT NOT NULL DEFAULT '',
     exceptions TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS notes (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     title TEXT NOT NULL,
     body TEXT NOT NULL DEFAULT '',
     tags TEXT NOT NULL DEFAULT '[]',
     source_path TEXT NOT NULL DEFAULT '',
     origin TEXT NOT NULL DEFAULT 'authored'
   )`,
  `CREATE TABLE IF NOT EXISTS links (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     from_kind TEXT NOT NULL,
     from_id TEXT NOT NULL,
     to_kind TEXT NOT NULL,
     to_id TEXT NOT NULL,
     note TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS attachments (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     owner_kind TEXT NOT NULL,
     owner_id TEXT NOT NULL,
     file_name TEXT NOT NULL,
     mime_type TEXT NOT NULL DEFAULT '',
     size INTEGER NOT NULL DEFAULT 0,
     caption TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS checklist_items (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     label TEXT NOT NULL,
     done INTEGER NOT NULL DEFAULT 0,
     order_index INTEGER NOT NULL DEFAULT 0
   )`,
];

const CHILD_TABLES = [
  "scenes",
  "characters",
  "plots",
  "events",
  "world_entries",
  "notes",
  "links",
  "attachments",
  "checklist_items",
] as const;

/** Create anything missing, then add columns introduced after first release. */
export function ensureSchema() {
  for (const statement of DDL) sqlite.exec(statement);
  // v0.2 databases predate ownership; add the column rather than dropping data.
  const columns = sqlite.prepare(`PRAGMA table_info(projects)`).all() as { name: string }[];
  if (!columns.some((c) => c.name === "owner_id")) {
    sqlite.exec(`ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL DEFAULT ''`);
  }
  for (const table of CHILD_TABLES) {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS ${table}_project_idx ON ${table}(project_id)`);
  }
}

/** Housekeeping: drop expired sessions, challenges and magic-link tokens. */
export function pruneExpired(now = new Date()) {
  const iso = now.toISOString();
  sqlite.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(iso);
  sqlite.prepare(`DELETE FROM webauthn_challenges WHERE expires_at < ?`).run(iso);
  sqlite.prepare(`DELETE FROM magic_links WHERE expires_at < ?`).run(iso);
}
