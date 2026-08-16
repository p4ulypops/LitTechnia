/**
 * SQLite connection + schema bootstrap (v0.3).
 *
 * The whole deployment is one file on disk (DATABASE_PATH, default ./data.db).
 * `better-sqlite3` is synchronous, so every storage method below stays
 * synchronous and the existing IStorage signatures are unchanged.
 *
 * v0.3 shared-schema migration: the new tables live in the DDL list below and
 * the additive columns on existing tables are applied by ADDED_COLUMNS, so an
 * existing data.db is migrated in place on boot with no data loss.
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
     draft_zero INTEGER NOT NULL DEFAULT 0,
     updated_at TEXT NOT NULL DEFAULT ''
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
     voice TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL DEFAULT ''
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
     open_question TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS events (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     label TEXT NOT NULL,
     story_time TEXT NOT NULL DEFAULT '',
     confidence TEXT NOT NULL DEFAULT 'fixed',
     notes TEXT NOT NULL DEFAULT '',
     order_index INTEGER NOT NULL DEFAULT 0,
     updated_at TEXT NOT NULL DEFAULT ''
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
     exceptions TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS notes (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     title TEXT NOT NULL,
     body TEXT NOT NULL DEFAULT '',
     tags TEXT NOT NULL DEFAULT '[]',
     source_path TEXT NOT NULL DEFAULT '',
     origin TEXT NOT NULL DEFAULT 'authored',
     updated_at TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS links (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     from_kind TEXT NOT NULL,
     from_id TEXT NOT NULL,
     to_kind TEXT NOT NULL,
     to_id TEXT NOT NULL,
     note TEXT NOT NULL DEFAULT '',
     origin TEXT NOT NULL DEFAULT 'authored',
     rel_kind TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS attachments (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     owner_kind TEXT NOT NULL,
     owner_id TEXT NOT NULL,
     file_name TEXT NOT NULL,
     mime_type TEXT NOT NULL DEFAULT '',
     size INTEGER NOT NULL DEFAULT 0,
     caption TEXT NOT NULL DEFAULT '',
     storage_key TEXT NOT NULL DEFAULT '',
     role TEXT NOT NULL DEFAULT 'reference',
     origin TEXT NOT NULL DEFAULT 'uploaded',
     derived_from_id TEXT NOT NULL DEFAULT '',
     provenance TEXT NOT NULL DEFAULT '{}',
     private_note TEXT NOT NULL DEFAULT '',
     alt_text TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT '',
     sort_index INTEGER NOT NULL DEFAULT 0,
     batch_id TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL DEFAULT ''
   )`,
  /* ------------------------------------------------------ v0.3 new tables */
  `CREATE TABLE IF NOT EXISTS aliases (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     target_kind TEXT NOT NULL,
     target_id TEXT NOT NULL,
     slug TEXT NOT NULL,
     short_code TEXT NOT NULL DEFAULT '',
     is_primary INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT '',
     retired_at TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS comments (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     target_kind TEXT NOT NULL,
     target_id TEXT NOT NULL,
     anchor_start INTEGER NOT NULL DEFAULT 0,
     anchor_end INTEGER NOT NULL DEFAULT 0,
     anchor_quote TEXT NOT NULL DEFAULT '',
     body TEXT NOT NULL DEFAULT '',
     moved INTEGER NOT NULL DEFAULT 0,
     resolved_at TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL DEFAULT '',
     author_id TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS capture_items (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     body TEXT NOT NULL DEFAULT '',
     source TEXT NOT NULL DEFAULT 'in_app',
     status TEXT NOT NULL DEFAULT 'inbox',
     due_at TEXT NOT NULL DEFAULT '',
     source_created_at TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL DEFAULT '',
     classified_kind TEXT NOT NULL DEFAULT '',
     classified_id TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS feed_definitions (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     feed_type TEXT NOT NULL DEFAULT 'manuscript',
     detail_level TEXT NOT NULL DEFAULT 'metadata_only',
     audience_label TEXT NOT NULL DEFAULT '',
     token_hash TEXT NOT NULL DEFAULT '',
     enabled INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT '',
     last_built_at TEXT NOT NULL DEFAULT '',
     revoked_at TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS activity_events (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     at TEXT NOT NULL DEFAULT '',
     kind TEXT NOT NULL,
     target_kind TEXT NOT NULL DEFAULT '',
     target_id TEXT NOT NULL DEFAULT '',
     summary TEXT NOT NULL DEFAULT '',
     detail TEXT NOT NULL DEFAULT '{}'
   )`,
  `CREATE TABLE IF NOT EXISTS checklist_items (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL,
     label TEXT NOT NULL,
     done INTEGER NOT NULL DEFAULT 0,
     order_index INTEGER NOT NULL DEFAULT 0,
     updated_at TEXT NOT NULL DEFAULT ''
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
  "aliases",
  "comments",
  "capture_items",
  "feed_definitions",
  "activity_events",
] as const;

/**
 * Columns added by the v0.2 -> v0.3 shared schema migration. A database created
 * fresh already has them from the DDL above; an existing file gets them here.
 * SQLite cannot add a column twice, so each one is applied only when
 * `PRAGMA table_info` says it is missing, and every column carries a NOT NULL
 * default so existing rows stay valid and nothing is rewritten.
 */
const ADDED_COLUMNS: { table: string; column: string; ddl: string }[] = [
  // Substrate for micro_changes / version_history (all sub-PRDs).
  ...[
    "scenes",
    "characters",
    "plots",
    "events",
    "world_entries",
    "notes",
    "links",
    "attachments",
    "checklist_items",
  ].map((table) => ({
    table,
    column: "updated_at",
    ddl: `ALTER TABLE ${table} ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`,
  })),
  // Sub-PRD B: authored vs derived cross-references.
  { table: "links", column: "origin", ddl: `ALTER TABLE links ADD COLUMN origin TEXT NOT NULL DEFAULT 'authored'` },
  { table: "links", column: "rel_kind", ddl: `ALTER TABLE links ADD COLUMN rel_kind TEXT NOT NULL DEFAULT ''` },
  // Sub-PRD A: file-storage substrate on attachments.
  { table: "attachments", column: "storage_key", ddl: `ALTER TABLE attachments ADD COLUMN storage_key TEXT NOT NULL DEFAULT ''` },
  { table: "attachments", column: "role", ddl: `ALTER TABLE attachments ADD COLUMN role TEXT NOT NULL DEFAULT 'reference'` },
  { table: "attachments", column: "origin", ddl: `ALTER TABLE attachments ADD COLUMN origin TEXT NOT NULL DEFAULT 'uploaded'` },
  { table: "attachments", column: "derived_from_id", ddl: `ALTER TABLE attachments ADD COLUMN derived_from_id TEXT NOT NULL DEFAULT ''` },
  { table: "attachments", column: "provenance", ddl: `ALTER TABLE attachments ADD COLUMN provenance TEXT NOT NULL DEFAULT '{}'` },
  { table: "attachments", column: "private_note", ddl: `ALTER TABLE attachments ADD COLUMN private_note TEXT NOT NULL DEFAULT ''` },
  { table: "attachments", column: "alt_text", ddl: `ALTER TABLE attachments ADD COLUMN alt_text TEXT NOT NULL DEFAULT ''` },
  { table: "attachments", column: "created_at", ddl: `ALTER TABLE attachments ADD COLUMN created_at TEXT NOT NULL DEFAULT ''` },
  { table: "attachments", column: "sort_index", ddl: `ALTER TABLE attachments ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0` },
  { table: "attachments", column: "batch_id", ddl: `ALTER TABLE attachments ADD COLUMN batch_id TEXT NOT NULL DEFAULT ''` },
];

/** Indexes the v0.3 tables need for the access patterns they were added for. */
const INDEXES = [
  // One slug identifies one thing per book, across every entity kind.
  `CREATE UNIQUE INDEX IF NOT EXISTS aliases_project_slug_idx ON aliases(project_id, slug)`,
  `CREATE INDEX IF NOT EXISTS activity_events_project_at_idx ON activity_events(project_id, at)`,
  `CREATE INDEX IF NOT EXISTS comments_target_idx ON comments(project_id, target_kind, target_id)`,
  // Two feeds must never share a token. The index is partial because token_hash
  // defaults to '' -- a feed row that exists before a token is minted must not
  // collide with every other tokenless row.
  `CREATE UNIQUE INDEX IF NOT EXISTS feed_definitions_token_hash_idx
     ON feed_definitions(token_hash) WHERE token_hash != ''`,
  `CREATE INDEX IF NOT EXISTS feed_definitions_project_idx ON feed_definitions(project_id)`,
];

/** Create anything missing, then add columns introduced after first release. */
export function ensureSchema() {
  for (const statement of DDL) sqlite.exec(statement);
  // v0.2 databases predate ownership; add the column rather than dropping data.
  const columns = sqlite.prepare(`PRAGMA table_info(projects)`).all() as { name: string }[];
  if (!columns.some((c) => c.name === "owner_id")) {
    sqlite.exec(`ALTER TABLE projects ADD COLUMN owner_id TEXT NOT NULL DEFAULT ''`);
  }
  const known = new Map<string, Set<string>>();
  for (const { table, column, ddl } of ADDED_COLUMNS) {
    if (!known.has(table)) {
      const info = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      known.set(table, new Set(info.map((c) => c.name)));
    }
    const present = known.get(table)!;
    if (present.has(column)) continue;
    sqlite.exec(ddl);
    present.add(column);
  }
  for (const table of CHILD_TABLES) {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS ${table}_project_idx ON ${table}(project_id)`);
  }
  for (const statement of INDEXES) sqlite.exec(statement);
}

/** Housekeeping: drop expired sessions, challenges and magic-link tokens. */
export function pruneExpired(now = new Date()) {
  const iso = now.toISOString();
  sqlite.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(iso);
  sqlite.prepare(`DELETE FROM webauthn_challenges WHERE expires_at < ?`).run(iso);
  sqlite.prepare(`DELETE FROM magic_links WHERE expires_at < ?`).run(iso);
}
