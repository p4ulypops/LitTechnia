/**
 * Shared schema contract tests (v0.3 migration).
 *
 * These lock the parts of the schema other packages depend on: the columns and
 * defaults each sub-PRD was promised, which tables clients may write through the
 * generic collection routes, which fields the server owns, and what the portable
 * export is allowed to contain. They assert on the drizzle column metadata
 * rather than on a live database, so they stay fast and need no SQLite file.
 */
import { describe, expect, it } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  LIBRARY_FORMAT_VERSION,
  SNAPSHOT_FORMAT_VERSION,
  activityEvents,
  aliases,
  attachments,
  captureItems,
  characters,
  checklistItems,
  collections,
  comments,
  events,
  feedDefinitions,
  insertAliasSchema,
  insertAttachmentSchema,
  insertCaptureItemSchema,
  insertCommentSchema,
  insertFeedDefinitionSchema,
  links,
  notes,
  plots,
  scenes,
  worldEntries,
  type ProjectCounts,
  type ProjectSnapshot,
} from "./schema";

type ColumnFacts = { name: string; type: string; notNull: boolean; default: unknown };

function facts(table: SQLiteTable): Record<string, ColumnFacts> {
  const out: Record<string, ColumnFacts> = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    const c = column as unknown as {
      name: string;
      columnType: string;
      notNull: boolean;
      default: unknown;
    };
    out[key] = {
      name: c.name,
      type: c.columnType === "SQLiteInteger" ? "integer" : "text",
      notNull: c.notNull,
      default: c.default,
    };
  }
  return out;
}

/** Field names a zod object schema accepts. */
function keysOf(schema: { shape: Record<string, unknown> }): string[] {
  return Object.keys(schema.shape);
}

function expectColumns(
  table: SQLiteTable,
  expected: Record<string, { name: string; type: "text" | "integer"; default: unknown }>,
) {
  const actual = facts(table);
  for (const [key, want] of Object.entries(expected)) {
    expect(actual[key], `${getTableName(table)}.${key} is missing`).toBeDefined();
    expect(actual[key].name).toBe(want.name);
    expect(actual[key].type).toBe(want.type);
    // Repo convention: every added column is NOT NULL with an explicit default.
    expect(actual[key].notNull, `${key} must be notNull`).toBe(true);
    expect(actual[key].default, `${key} default`).toBe(want.default);
  }
}

describe("attachments — Sub-PRD A file-storage substrate", () => {
  it("carries every new column with the agreed name, type and default", () => {
    expectColumns(attachments, {
      storageKey: { name: "storage_key", type: "text", default: "" },
      role: { name: "role", type: "text", default: "reference" },
      origin: { name: "origin", type: "text", default: "uploaded" },
      derivedFromId: { name: "derived_from_id", type: "text", default: "" },
      provenance: { name: "provenance", type: "text", default: "{}" },
      privateNote: { name: "private_note", type: "text", default: "" },
      altText: { name: "alt_text", type: "text", default: "" },
      createdAt: { name: "created_at", type: "text", default: "" },
      sortIndex: { name: "sort_index", type: "integer", default: 0 },
      batchId: { name: "batch_id", type: "text", default: "" },
      updatedAt: { name: "updated_at", type: "text", default: "" },
    });
  });

  it("keeps the pre-existing metadata columns", () => {
    const columns = facts(attachments);
    for (const key of ["id", "projectId", "ownerKind", "ownerId", "fileName", "mimeType", "size", "caption"]) {
      expect(columns[key], `${key} should still exist`).toBeDefined();
    }
  });
});

describe("insertAttachmentSchema — server-owned fields", () => {
  const keys = keysOf(insertAttachmentSchema as unknown as { shape: Record<string, unknown> });

  it("omits id, storageKey and createdAt so a client cannot set them", () => {
    for (const field of ["id", "storageKey", "createdAt"]) {
      expect(keys, `${field} must not be client-writable`).not.toContain(field);
    }
  });

  it("omits every other server-set field, including the provenance trust claim", () => {
    for (const field of ["mimeType", "size", "origin", "derivedFromId", "provenance", "updatedAt"]) {
      expect(keys, `${field} must not be client-writable`).not.toContain(field);
    }
  });

  it("still lets a client set its own descriptive fields", () => {
    for (const field of ["fileName", "caption", "role", "privateNote", "altText", "sortIndex", "batchId"]) {
      expect(keys, `${field} should be client-writable`).toContain(field);
    }
  });

  it("rejects a client-supplied provenance claim", () => {
    const parsed = (insertAttachmentSchema as unknown as {
      safeParse: (v: unknown) => { success: boolean; data?: Record<string, unknown> };
    }).safeParse({
      projectId: "p1",
      ownerKind: "scene",
      ownerId: "sc-1",
      fileName: "ref.png",
      provenance: '{"provider":"forged"}',
      storageKey: "../../etc/passwd",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("provenance");
    expect(parsed.data).not.toHaveProperty("storageKey");
  });
});

describe("links — Sub-PRD B authored vs derived", () => {
  it("adds origin and relKind", () => {
    expectColumns(links, {
      origin: { name: "origin", type: "text", default: "authored" },
      relKind: { name: "rel_kind", type: "text", default: "" },
      updatedAt: { name: "updated_at", type: "text", default: "" },
    });
  });
});

describe("aliases — Sub-PRD B", () => {
  it("has the expected shape", () => {
    const columns = facts(aliases);
    expect(getTableName(aliases)).toBe("aliases");
    expect(columns.id.name).toBe("id");
    expect(columns.projectId).toEqual({
      name: "project_id",
      type: "text",
      notNull: true,
      default: undefined,
    });
    expect(columns.targetKind.notNull).toBe(true);
    expect(columns.targetId.notNull).toBe(true);
    expect(columns.slug.notNull).toBe(true);
    expectColumns(aliases, {
      shortCode: { name: "short_code", type: "text", default: "" },
      isPrimary: { name: "is_primary", type: "integer", default: 0 },
      createdAt: { name: "created_at", type: "text", default: "" },
      retiredAt: { name: "retired_at", type: "text", default: "" },
    });
  });

  it("omits id and createdAt from its insert schema", () => {
    const keys = keysOf(insertAliasSchema as unknown as { shape: Record<string, unknown> });
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("createdAt");
    expect(keys).toContain("slug");
  });
});

describe("comments — Sub-PRD B", () => {
  it("has the anchor, resolution and authorship columns", () => {
    expect(getTableName(comments)).toBe("comments");
    expectColumns(comments, {
      anchorStart: { name: "anchor_start", type: "integer", default: 0 },
      anchorEnd: { name: "anchor_end", type: "integer", default: 0 },
      anchorQuote: { name: "anchor_quote", type: "text", default: "" },
      body: { name: "body", type: "text", default: "" },
      moved: { name: "moved", type: "integer", default: 0 },
      resolvedAt: { name: "resolved_at", type: "text", default: "" },
      createdAt: { name: "created_at", type: "text", default: "" },
      updatedAt: { name: "updated_at", type: "text", default: "" },
      authorId: { name: "author_id", type: "text", default: "" },
    });
  });

  it("omits id and both timestamps from its insert schema", () => {
    const keys = keysOf(insertCommentSchema as unknown as { shape: Record<string, unknown> });
    for (const field of ["id", "createdAt", "updatedAt"]) expect(keys).not.toContain(field);
    expect(keys).toContain("body");
  });
});

describe("captureItems — Sub-PRD B", () => {
  it("has the inbox columns with least-surprising defaults", () => {
    expect(getTableName(captureItems)).toBe("capture_items");
    expectColumns(captureItems, {
      body: { name: "body", type: "text", default: "" },
      source: { name: "source", type: "text", default: "in_app" },
      status: { name: "status", type: "text", default: "inbox" },
      dueAt: { name: "due_at", type: "text", default: "" },
      sourceCreatedAt: { name: "source_created_at", type: "text", default: "" },
      createdAt: { name: "created_at", type: "text", default: "" },
      updatedAt: { name: "updated_at", type: "text", default: "" },
      classifiedKind: { name: "classified_kind", type: "text", default: "" },
      classifiedId: { name: "classified_id", type: "text", default: "" },
    });
  });

  it("omits id and both timestamps from its insert schema", () => {
    const keys = keysOf(insertCaptureItemSchema as unknown as { shape: Record<string, unknown> });
    for (const field of ["id", "createdAt", "updatedAt"]) expect(keys).not.toContain(field);
  });
});

describe("feedDefinitions — Sub-PRD C", () => {
  it("defaults to the least-revealing, disabled configuration", () => {
    expect(getTableName(feedDefinitions)).toBe("feed_definitions");
    expectColumns(feedDefinitions, {
      feedType: { name: "feed_type", type: "text", default: "manuscript" },
      detailLevel: { name: "detail_level", type: "text", default: "metadata_only" },
      audienceLabel: { name: "audience_label", type: "text", default: "" },
      tokenHash: { name: "token_hash", type: "text", default: "" },
      enabled: { name: "enabled", type: "integer", default: 0 },
      createdAt: { name: "created_at", type: "text", default: "" },
      lastBuiltAt: { name: "last_built_at", type: "text", default: "" },
      revokedAt: { name: "revoked_at", type: "text", default: "" },
    });
  });

  it("stores a hash, never a plaintext token column", () => {
    expect(Object.keys(facts(feedDefinitions))).not.toContain("token");
  });

  it("omits id, the token, and every lifecycle timestamp from its insert schema", () => {
    const keys = keysOf(insertFeedDefinitionSchema as unknown as { shape: Record<string, unknown> });
    for (const field of ["id", "token", "tokenHash", "createdAt", "lastBuiltAt", "revokedAt"]) {
      expect(keys, `${field} must not be client-writable`).not.toContain(field);
    }
    expect(keys).toContain("feedType");
    expect(keys).toContain("detailLevel");
  });
});

describe("activityEvents — Sub-PRD C", () => {
  it("has the event columns with a JSON detail payload", () => {
    expect(getTableName(activityEvents)).toBe("activity_events");
    const columns = facts(activityEvents);
    expect(columns.kind.notNull).toBe(true);
    expectColumns(activityEvents, {
      at: { name: "at", type: "text", default: "" },
      targetKind: { name: "target_kind", type: "text", default: "" },
      targetId: { name: "target_id", type: "text", default: "" },
      summary: { name: "summary", type: "text", default: "" },
      detail: { name: "detail", type: "text", default: "{}" },
    });
  });
});

describe("collections — what a client may write through generic CRUD", () => {
  it("does not expose activityEvents (server-written only)", () => {
    expect(collections as readonly string[]).not.toContain("activityEvents");
    expect(collections as readonly string[]).not.toContain("activity_events");
  });

  it("does not expose feedDefinitions (dedicated authenticated API later)", () => {
    expect(collections as readonly string[]).not.toContain("feedDefinitions");
    expect(collections as readonly string[]).not.toContain("feed_definitions");
  });

  it("exposes the three new portable authored tables", () => {
    for (const name of ["aliases", "comments", "captureItems"]) {
      expect(collections as readonly string[]).toContain(name);
    }
  });

  it("keeps the v0.2 collections intact", () => {
    for (const name of [
      "scenes",
      "characters",
      "plots",
      "events",
      "world",
      "notes",
      "links",
      "attachments",
      "checklist",
    ]) {
      expect(collections as readonly string[]).toContain(name);
    }
  });
});

describe("updatedAt substrate", () => {
  it("exists on every domain table the feeds will need", () => {
    const tables: [string, SQLiteTable][] = [
      ["scenes", scenes],
      ["characters", characters],
      ["plots", plots],
      ["events", events],
      ["worldEntries", worldEntries],
      ["notes", notes],
      ["links", links],
      ["attachments", attachments],
      ["checklistItems", checklistItems],
    ];
    for (const [label, table] of tables) {
      const column = facts(table).updatedAt;
      expect(column, `${label}.updatedAt is missing`).toBeDefined();
      expect(column.name).toBe("updated_at");
      expect(column.notNull).toBe(true);
      expect(column.default).toBe("");
    }
  });
});

describe("export contract", () => {
  it("bumps both format versions to 0.3", () => {
    expect(SNAPSHOT_FORMAT_VERSION).toBe("littechnia-project/0.3");
    expect(LIBRARY_FORMAT_VERSION).toBe("littechnia-library/0.3");
  });

  it("adds the new portable tables to ProjectSnapshot", () => {
    // Type-level assertion: this object cannot be built unless the snapshot type
    // carries the three new arrays (and still carries the v0.2 ones).
    const snapshot: Pick<ProjectSnapshot, "aliases" | "comments" | "captureItems"> = {
      aliases: [],
      comments: [],
      captureItems: [],
    };
    expect(Object.keys(snapshot).sort()).toEqual(["aliases", "captureItems", "comments"]);
  });

  it("keeps operational state out of ProjectSnapshot", () => {
    type SnapshotKey = keyof ProjectSnapshot;
    const forbidden = ["feedDefinitions", "activityEvents"];
    const keys: SnapshotKey[] = [
      "project",
      "scenes",
      "characters",
      "plots",
      "events",
      "world",
      "notes",
      "links",
      "attachments",
      "checklist",
      "aliases",
      "comments",
      "captureItems",
    ];
    for (const name of forbidden) {
      expect(keys as string[]).not.toContain(name);
    }
    // A snapshot with every allowed key is assignable, proving the list is complete.
    expect(keys).toHaveLength(13);
  });

  it("adds attachments to ProjectCounts", () => {
    const counts: ProjectCounts = {
      scenes: 0,
      characters: 0,
      plots: 0,
      events: 0,
      world: 0,
      notes: 0,
      links: 0,
      attachments: 0,
      words: 0,
    };
    expect(counts.attachments).toBe(0);
  });
});
