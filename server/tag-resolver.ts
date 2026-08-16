/**
 * Sub-PRD B — dual-address tag resolver.
 *
 * `#S:slug` references in any Markdown surface resolve to real, bidirectional
 * entity links via the `aliases` table. The slug is what the author types and
 * sees; the immutable id lives in the resolved `links` row
 * (`origin = "derived"`) and in `aliases`.
 *
 * Design decisions (see package3-spec.md):
 *   1. Slug-only in authored prose — the repo uses text().primaryKey() with
 *      opaque values (UUIDs), so `#S:1234` is impossible.
 *   2. Tag namespace separation: `#S:` resolves into `links` with
 *      `origin = "derived"` via `aliases`. It NEVER writes to `notes.tags`
 *      (a separate keyword-tag namespace).
 *   3. Derived `links` rows are produced only here — the server-side resolver.
 *      They are rejected on the client-facing write path (see routes.ts).
 *   4. Slug collisions resolve deterministically with a disambiguation prompt;
 *      the resolver never silently re-points a slug.
 *   5. Retired aliases remain as redirects so exported old text doesn't rot.
 */
import { getTableName } from "drizzle-orm";
import type { Alias, EntityKind } from "@shared/schema";
import { entityKinds } from "@shared/schema";
import { sqlite } from "./db";

/* ----------------------------------------------------------- tag parsing */

/**
 * Matches `#S:slug` where slug is lowercase letters, digits and hyphens.
 * Slug-only: the repo uses opaque text ids (UUIDs), so `#S:1234` is impossible
 * by design — the author types and sees a human-readable slug.
 */
export const TAG_PATTERN = /#S:([a-z0-9-]+)/g;

export interface ParsedTag {
  /** The full matched text, e.g. `#S:rebecca`. */
  raw: string;
  /** The slug, e.g. `rebecca`. */
  slug: string;
  /** Character offset where the match starts. */
  index: number;
}

/** Extract every `#S:slug` reference from a Markdown surface. */
export function parseTags(text: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  TAG_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_PATTERN.exec(text)) !== null) {
    tags.push({ raw: match[0], slug: match[1], index: match.index });
  }
  return tags;
}

/* ----------------------------------------------------------- slug helpers */

/**
 * Normalise a free-form name into a slug. Mirrors the slugify used by the
 * exporters so prose tags and UI-created aliases agree.
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "untitled"
  );
}

/* ----------------------------------------------------------- alias lookup */

export interface ResolvedTag {
  slug: string;
  /** The alias row that resolved the slug, if any. */
  alias: Alias | null;
  /** The entity kind the slug points at. */
  targetKind: EntityKind | null;
  /** The entity id the slug points at. */
  targetId: string | null;
  /** True when the slug resolved via a retired alias (a redirect). */
  isRedirect: boolean;
  /** True when no alias — active or retired — matches the slug. */
  unresolved: boolean;
}

/** Map a raw SQLite row (snake_case) to the Alias type (camelCase). */
function mapAliasRow(row: Record<string, unknown>): Alias {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    targetKind: row.target_kind as string,
    targetId: row.target_id as string,
    slug: row.slug as string,
    shortCode: row.short_code as string,
    isPrimary: row.is_primary as number,
    createdAt: row.created_at as string,
    retiredAt: row.retired_at as string,
  };
}

/**
 * Find the alias for a slug in a project. Active (non-retired) aliases take
 * priority over retired ones, so a freshly renamed entity's new slug wins and
 * the old slug remains as a redirect.
 *
 * The unique index `aliases_project_slug_idx ON aliases(project_id, slug)`
 * guarantees at most one row per (project, slug), so there is no ambiguity at
 * the database level — collisions are detected at alias-creation time.
 */
export function findAlias(projectId: string, slug: string): Alias | null {
  const normalized = slug.toLowerCase();
  const rows = sqlite
    .prepare(
      `SELECT * FROM aliases WHERE project_id = ? AND LOWER(slug) = ? ORDER BY retired_at ASC`,
    )
    .all(projectId, normalized) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  // Active (retired_at = '') sorts first because '' < any ISO timestamp.
  return mapAliasRow(rows[0]);
}

/** Resolve a single `#S:slug` to its target entity, following redirects. */
export function resolveTag(projectId: string, slug: string): ResolvedTag {
  const alias = findAlias(projectId, slug);
  if (!alias) {
    return {
      slug,
      alias: null,
      targetKind: null,
      targetId: null,
      isRedirect: false,
      unresolved: true,
    };
  }
  const isRedirect = alias.retiredAt !== "";
  return {
    slug,
    alias,
    targetKind: alias.targetKind as EntityKind,
    targetId: alias.targetId,
    isRedirect,
    unresolved: false,
  };
}

/** Resolve every `#S:slug` in a block of Markdown text. */
export function resolveTagsInText(projectId: string, text: string): ResolvedTag[] {
  return parseTags(text).map((t) => resolveTag(projectId, t.slug));
}

/* ----------------------------------------------------------- collisions */

export interface CollisionResult {
  slug: string;
  /** The entity that already owns this slug. */
  existingKind: EntityKind;
  existingId: string;
  /** The entity the author tried to point the slug at. */
  requestedKind: EntityKind;
  requestedId: string;
  message: string;
}

/**
 * Check whether creating an alias with this slug would collide with an existing
 * alias pointing at a *different* entity. Collisions are never silently
 * re-pointed — the caller must present a disambiguation prompt and apply only
 * after the author confirms.
 *
 * Returns null when the slug is free (or already points at the same entity).
 */
export function detectCollision(
  projectId: string,
  slug: string,
  targetKind: EntityKind,
  targetId: string,
): CollisionResult | null {
  const normalized = slug.toLowerCase();
  const existing = sqlite
    .prepare(
      `SELECT * FROM aliases WHERE project_id = ? AND LOWER(slug) = ? AND retired_at = ''`,
    )
    .get(projectId, normalized) as Record<string, unknown> | undefined;
  if (!existing) return null;
  const existingKind = existing.target_kind as string;
  const existingId = existing.target_id as string;
  if (existingKind === targetKind && existingId === targetId) return null;
  return {
    slug: normalized,
    existingKind: existingKind as EntityKind,
    existingId,
    requestedKind: targetKind,
    requestedId: targetId,
    message: `The slug "${normalized}" already points at a different ${existingKind}. Choose a different slug, or retire the existing alias first.`,
  };
}

/* ----------------------------------------------------------- derived links */

/**
 * The text fields of each entity kind that may carry `#S:` tags. Derived links
 * are machine-generated from these surfaces and are rebuildable from authored
 * Markdown at any time, so they are safe to discard and regenerate.
 */
const ENTITY_TEXT_FIELDS: Record<EntityKind, { table: string; idCol: string; fields: string[] }> = {
  scene: { table: "scenes", idCol: "id", fields: ["content", "title"] },
  character: {
    table: "characters",
    idCol: "id",
    fields: ["name", "motivation", "wants", "fears", "wins", "losses", "arc", "voice"],
  },
  plot: {
    table: "plots",
    idCol: "id",
    fields: ["name", "premise", "stakes", "open_question"],
  },
  event: { table: "events", idCol: "id", fields: ["label", "notes"] },
  world: {
    table: "world_entries",
    idCol: "id",
    fields: ["name", "facts", "rules", "limits", "costs", "exceptions"],
  },
  note: { table: "notes", idCol: "id", fields: ["title", "body"] },
};

interface EntityTextRow {
  id: string;
  fields: { field: string; text: string }[];
}

/** Read every text surface for one entity kind in a project. */
function readEntityTexts(projectId: string, kind: EntityKind): EntityTextRow[] {
  const meta = ENTITY_TEXT_FIELDS[kind];
  const selectCols = meta.fields.map((f) => `"${f}"`).join(", ");
  const rows = sqlite
    .prepare(`SELECT "id", ${selectCols} FROM "${meta.table}" WHERE project_id = ?`)
    .all(projectId) as Record<string, string>[];
  return rows.map((row) => ({
    id: row.id,
    fields: meta.fields.map((field) => ({ field, text: row[field] ?? "" })),
  }));
}

/**
 * Rebuild every derived link in a project from the authored Markdown. Existing
 * derived links are deleted first — they are rebuildable from prose at any
 * time, so discarding them is always safe. Authored links are untouched.
 *
 * For each `#S:slug` found in an entity's text, a derived `links` row is
 * created from that entity to the resolved target. The link is bidirectional
 * in the sense that `relatedLinks` renders it from either end.
 */
export function rebuildDerivedLinks(projectId: string): number {
  let created = 0;
  sqlite.transaction(() => {
    // Discard old derived links — safe to rebuild from authored Markdown.
    sqlite
      .prepare(`DELETE FROM links WHERE project_id = ? AND origin = 'derived'`)
      .run(projectId);
    const now = new Date().toISOString();
    for (const fromKind of entityKinds) {
      const meta = ENTITY_TEXT_FIELDS[fromKind];
      for (const entity of readEntityTexts(projectId, fromKind)) {
        for (const { text } of entity.fields) {
          const tags = parseTags(text);
          for (const tag of tags) {
            const resolved = resolveTag(projectId, tag.slug);
            if (resolved.unresolved || !resolved.targetKind || !resolved.targetId) continue;
            // Don't self-link.
            if (resolved.targetKind === fromKind && resolved.targetId === entity.id) continue;
            const id = `lk-d-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
            sqlite
              .prepare(
                `INSERT INTO links (id, project_id, from_kind, from_id, to_kind, to_id, note, origin, rel_kind, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, '', 'derived', '', ?)`,
              )
              .run(id, projectId, fromKind, entity.id, resolved.targetKind, resolved.targetId, now);
            created += 1;
          }
        }
      }
    }
  })();
  return created;
}

/* ----------------------------------------------------------- rename flow */

export interface RenameReference {
  /** The entity kind whose text contains the reference. */
  fromKind: EntityKind;
  /** The entity id whose text contains the reference. */
  fromId: string;
  /** The field containing the reference. */
  field: string;
  /** The raw `#S:old-slug` text. */
  raw: string;
  /** Character offset of the reference. */
  index: number;
}

/**
 * List every `#S:slug` reference in a project's authored Markdown that uses the
 * given slug. Used by the rename flow: the author sees this list and the app
 * applies updates only after confirmation. The prose is never rewritten
 * without the author's say-so.
 */
export function listReferences(projectId: string, slug: string): RenameReference[] {
  const refs: RenameReference[] = [];
  for (const fromKind of entityKinds) {
    const meta = ENTITY_TEXT_FIELDS[fromKind];
    for (const entity of readEntityTexts(projectId, fromKind)) {
      for (const { field, text } of entity.fields) {
        for (const tag of parseTags(text)) {
          if (tag.slug.toLowerCase() === slug.toLowerCase()) {
            refs.push({ fromKind, fromId: entity.id, field, raw: tag.raw, index: tag.index });
          }
        }
      }
    }
  }
  return refs;
}

/**
 * Apply a rename: replace every `#S:old-slug` with `#S:new-slug` in the
 * authored Markdown. The caller must have already presented the reference list
 * (from `listReferences`) and received the author's confirmation — this
 * function performs the rewrite only and does not prompt.
 *
 * Returns the number of text fields rewritten. After the rewrite, derived
 * links are rebuilt so they point at the new slug.
 */
export function applyRename(projectId: string, oldSlug: string, newSlug: string): number {
  let rewritten = 0;
  const pattern = new RegExp(`#S:${oldSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi");
  sqlite.transaction(() => {
    for (const fromKind of entityKinds) {
      const meta = ENTITY_TEXT_FIELDS[fromKind];
      for (const entity of readEntityTexts(projectId, fromKind)) {
        for (const { field, text } of entity.fields) {
          if (!text.toLowerCase().includes(`#s:${oldSlug.toLowerCase()}`)) continue;
          const updated = text.replace(pattern, `#S:${newSlug}`);
          if (updated !== text) {
            sqlite
              .prepare(`UPDATE "${meta.table}" SET "${field}" = ? WHERE id = ? AND project_id = ?`)
              .run(updated, entity.id, projectId);
            rewritten += 1;
          }
        }
      }
    }
  })();
  // Rebuild derived links so they follow the new slug.
  rebuildDerivedLinks(projectId);
  return rewritten;
}

/**
 * Retire an alias. The row is kept so old references still resolve as a
 * redirect — `findAlias` returns it, with `isRedirect = true`. A new alias
 * with a different slug can then be created for the same entity.
 */
export function retireAlias(projectId: string, aliasId: string): boolean {
  const result = sqlite
    .prepare(`UPDATE aliases SET retired_at = ? WHERE id = ? AND project_id = ? AND retired_at = ''`)
    .run(new Date().toISOString(), aliasId, projectId);
  return result.changes > 0;
}
