/**
 * Test helper for Sub-PRD B tests that need a live SQLite database.
 *
 * The singleton in server/db.ts is created against :memory: (see
 * vitest.setup.ts). This module ensures the schema exists and provides
 * per-test cleanup so tests don't leak data into each other.
 */
import { sqlite, ensureSchema } from "./db";

let schemaReady = false;

/** Ensure all tables exist. Safe to call multiple times. */
export function setupTestDb() {
  if (!schemaReady) {
    ensureSchema();
    schemaReady = true;
  }
}

/** Delete every row from every table, preserving the schema. */
export function clearAll() {
  setupTestDb();
  sqlite.exec(`DELETE FROM aliases`);
  sqlite.exec(`DELETE FROM comments`);
  sqlite.exec(`DELETE FROM capture_items`);
  sqlite.exec(`DELETE FROM links`);
  sqlite.exec(`DELETE FROM attachments`);
  sqlite.exec(`DELETE FROM checklist_items`);
  sqlite.exec(`DELETE FROM notes`);
  sqlite.exec(`DELETE FROM world_entries`);
  sqlite.exec(`DELETE FROM events`);
  sqlite.exec(`DELETE FROM plots`);
  sqlite.exec(`DELETE FROM characters`);
  sqlite.exec(`DELETE FROM scenes`);
  sqlite.exec(`DELETE FROM projects`);
  sqlite.exec(`DELETE FROM users`);
}

/** Insert a test project and return its id. */
export function seedProject(id = "proj-test", ownerId = "owner-test") {
  setupTestDb();
  sqlite
    .prepare(
      `INSERT INTO projects (id, owner_id, title, subtitle, author, genre, word_target, premise, method, format, archived, created_at, sort_index)
       VALUES (?, ?, 'Test Book', '', '', '', 90000, '', 'hybrid', 'Novel', 0, '2026-01-01', 0)`,
    )
    .run(id, ownerId);
  return id;
}

/** Insert a test scene with the given content and return its id. */
export function seedScene(projectId: string, id: string, content: string, title = "Test Scene") {
  setupTestDb();
  sqlite
    .prepare(
      `INSERT INTO scenes (id, project_id, chapter, title, content, status, pov, objective, conflict, change, order_index, draft_zero, updated_at)
       VALUES (?, ?, 'Chapter One', ?, ?, 'drafted', '', '', '', '', 0, 0, '')`,
    )
    .run(id, projectId, title, content);
  return id;
}

/** Insert a test character and return its id. */
export function seedCharacter(projectId: string, id: string, name = "Rebecca") {
  setupTestDb();
  sqlite
    .prepare(
      `INSERT INTO characters (id, project_id, name, role, motivation, wants, fears, wins, losses, arc, voice, updated_at)
       VALUES (?, ?, ?, '', '', '', '', '', '', '', '', '')`,
    )
    .run(id, projectId, name);
  return id;
}

/** Insert a test note and return its id. */
export function seedNote(projectId: string, id: string, body: string, title = "Test Note") {
  setupTestDb();
  sqlite
    .prepare(
      `INSERT INTO notes (id, project_id, title, body, tags, source_path, origin, updated_at)
       VALUES (?, ?, ?, ?, '[]', '', 'authored', '')`,
    )
    .run(id, projectId, title, body);
  return id;
}

/** Insert a test alias and return its id. */
export function seedAlias(
  projectId: string,
  slug: string,
  targetKind: string,
  targetId: string,
  id = `al-${slug}`,
  isPrimary = 1,
  retiredAt = "",
) {
  setupTestDb();
  sqlite
    .prepare(
      `INSERT INTO aliases (id, project_id, target_kind, target_id, slug, short_code, is_primary, created_at, retired_at)
       VALUES (?, ?, ?, ?, ?, '', ?, '', ?)`,
    )
    .run(id, projectId, targetKind, targetId, slug, isPrimary, retiredAt);
  return id;
}

/** Insert a test comment and return its id. */
export function seedComment(
  projectId: string,
  targetKind: string,
  targetId: string,
  anchorStart: number,
  anchorEnd: number,
  anchorQuote: string,
  body: string,
  id = "cm-test",
) {
  setupTestDb();
  sqlite
    .prepare(
      `INSERT INTO comments (id, project_id, target_kind, target_id, anchor_start, anchor_end, anchor_quote, body, moved, resolved_at, created_at, updated_at, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, '', '', '', 'owner-test')`,
    )
    .run(id, projectId, targetKind, targetId, anchorStart, anchorEnd, anchorQuote, body);
  return id;
}

/** Insert a test capture item and return its id. */
export function seedCaptureItem(
  projectId: string,
  body: string,
  id = "cp-test",
  source = "in_app",
  status = "inbox",
) {
  setupTestDb();
  sqlite
    .prepare(
      `INSERT INTO capture_items (id, project_id, body, source, status, due_at, source_created_at, created_at, updated_at, classified_kind, classified_id)
       VALUES (?, ?, ?, ?, ?, '', '', '', '', '', '')`,
    )
    .run(id, projectId, body, source, status);
  return id;
}
