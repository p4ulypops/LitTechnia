/**
 * Storage — SQLite implementation (v0.3, owner-scoped).
 *
 * Two boundaries, enforced here rather than in the routes:
 *   1. `ownerId` — every method takes the *session's* user id and no query ever
 *      matches a row belonging to another account. There is no method that can
 *      read or write a book without an owner id.
 *   2. `projectId` — reads and writes are scoped to one book, exactly as v0.2.
 *
 * `better-sqlite3` is synchronous, so these methods keep their v0.2 signatures
 * apart from the new leading `ownerId`. Records now survive a restart; the
 * shipped product still exports plain Markdown/JSON so nothing is trapped here.
 */
import { getTableColumns, getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type {
  Attachment,
  Character,
  ChecklistItem,
  CollectionName,
  ImportItem,
  ImportKind,
  ImportResult,
  Link,
  NewProject,
  Note,
  Plot,
  Project,
  ProjectCounts,
  ProjectSnapshot,
  ProjectSummary,
  Scene,
  StoryEvent,
  WorldEntry,
} from "@shared/schema";
import {
  attachments,
  characters,
  checklistItems,
  events,
  links,
  notes,
  plots,
  projects,
  scenes,
  worldEntries,
} from "@shared/schema";
import { sqlite } from "./db";
import { buildLibrarySeed } from "./seed";

type Row = { id: string; [k: string]: unknown };

const words = (text: string) => {
  const cleaned = text.replace(/\[[^\]]*\]/g, " ").trim();
  return cleaned ? cleaned.split(/\s+/).length : 0;
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "untitled-book";

/* ------------------------------------------------------- table reflection */

const collectionTables: Record<CollectionName, SQLiteTable> = {
  scenes,
  characters,
  plots,
  events,
  world: worldEntries,
  notes,
  links,
  attachments,
  checklist: checklistItems,
};

type ColumnMap = { key: string; column: string }[];

const columnCache = new Map<string, ColumnMap>();

function columnsOf(table: SQLiteTable): ColumnMap {
  const name = getTableName(table);
  const cached = columnCache.get(name);
  if (cached) return cached;
  const map: ColumnMap = Object.entries(getTableColumns(table)).map(([key, column]) => ({
    key,
    column: (column as { name: string }).name,
  }));
  columnCache.set(name, map);
  return map;
}

/** `"order_index" AS "orderIndex", …` so rows come back in client shape. */
function selectList(table: SQLiteTable) {
  return columnsOf(table)
    .map(({ key, column }) => `"${column}" AS "${key}"`)
    .join(", ");
}

function toSqlValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/* ------------------------------------------------------------- interface */

export interface IStorage {
  /** Every book owned by this account, with counts, in display order. */
  listProjects(ownerId: string): ProjectSummary[];
  /** One owned book's full contents, or undefined if unknown or not theirs. */
  getSnapshot(ownerId: string, projectId: string): ProjectSnapshot | undefined;
  /** All of this account's books — used only by the library JSON export. */
  allSnapshots(ownerId: string): ProjectSnapshot[];
  createProject(ownerId: string, data: NewProject): Project;
  updateProject(ownerId: string, projectId: string, patch: Partial<Project>): Project | undefined;
  create(
    ownerId: string,
    projectId: string,
    collection: CollectionName,
    data: Record<string, unknown>,
  ): Row | undefined;
  update(
    ownerId: string,
    projectId: string,
    collection: CollectionName,
    id: string,
    patch: Record<string, unknown>,
  ): Row | undefined;
  remove(ownerId: string, projectId: string, collection: CollectionName, id: string): boolean;
  moveScene(
    ownerId: string,
    projectId: string,
    id: string,
    direction: "up" | "down",
  ): Scene[] | undefined;
  importItems(ownerId: string, projectId: string, items: ImportItem[]): ImportResult | undefined;
  /** True when this account owns the book. Cheap guard for the routes. */
  owns(ownerId: string, projectId: string): boolean;
  /** Replace one owner's library with the demo seed. Development only. */
  seedDemoLibrary(ownerId: string): ProjectSummary[];
  /** Does this owner have any books at all? Drives the onboarding empty state. */
  isEmpty(ownerId: string): boolean;
}

export class SqliteStorage implements IStorage {
  /* --------------------------------------------------------------- helpers */

  private nextId(prefix: string) {
    // Monotonic-ish, collision-safe without a sequence table.
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  owns(ownerId: string, projectId: string): boolean {
    if (!ownerId || !projectId) return false;
    const row = sqlite
      .prepare(`SELECT 1 AS ok FROM projects WHERE id = ? AND owner_id = ?`)
      .get(projectId, ownerId) as { ok: number } | undefined;
    return Boolean(row);
  }

  private projectRow(ownerId: string, projectId: string): Project | undefined {
    return sqlite
      .prepare(`SELECT ${selectList(projects)} FROM projects WHERE id = ? AND owner_id = ?`)
      .get(projectId, ownerId) as Project | undefined;
  }

  private rows(collection: CollectionName, projectId: string): Row[] {
    const table = collectionTables[collection];
    const order =
      collection === "scenes" || collection === "events" || collection === "checklist"
        ? ` ORDER BY "order_index" ASC`
        : "";
    return sqlite
      .prepare(
        `SELECT ${selectList(table)} FROM "${getTableName(table)}" WHERE project_id = ?${order}`,
      )
      .all(projectId) as Row[];
  }

  private snapshotOf(project: Project): ProjectSnapshot {
    return {
      project,
      scenes: this.rows("scenes", project.id) as unknown as Scene[],
      characters: this.rows("characters", project.id) as unknown as Character[],
      plots: this.rows("plots", project.id) as unknown as Plot[],
      events: this.rows("events", project.id) as unknown as StoryEvent[],
      world: this.rows("world", project.id) as unknown as WorldEntry[],
      notes: this.rows("notes", project.id) as unknown as Note[],
      links: this.rows("links", project.id) as unknown as Link[],
      attachments: this.rows("attachments", project.id) as unknown as Attachment[],
      checklist: this.rows("checklist", project.id) as unknown as ChecklistItem[],
    };
  }

  private counts(snapshot: ProjectSnapshot): ProjectCounts {
    return {
      scenes: snapshot.scenes.length,
      characters: snapshot.characters.length,
      plots: snapshot.plots.length,
      events: snapshot.events.length,
      world: snapshot.world.length,
      notes: snapshot.notes.length,
      links: snapshot.links.length,
      words: snapshot.scenes.reduce((total, s) => total + words(s.content), 0),
    };
  }

  private ownedProjects(ownerId: string): Project[] {
    if (!ownerId) return [];
    return sqlite
      .prepare(
        `SELECT ${selectList(projects)} FROM projects WHERE owner_id = ?
         ORDER BY sort_index ASC, title ASC`,
      )
      .all(ownerId) as Project[];
  }

  private insertRow(table: SQLiteTable, data: Record<string, unknown>): Row {
    const allowed = new Map(columnsOf(table).map(({ key, column }) => [key, column]));
    const entries = Object.entries(data).filter(
      ([key, value]) => allowed.has(key) && value !== undefined,
    );
    const sql =
      `INSERT INTO "${getTableName(table)}" (${entries
        .map(([key]) => `"${allowed.get(key)}"`)
        .join(", ")}) VALUES (${entries.map(() => "?").join(", ")})`;
    sqlite.prepare(sql).run(...entries.map(([, value]) => toSqlValue(value)));
    return sqlite
      .prepare(`SELECT ${selectList(table)} FROM "${getTableName(table)}" WHERE id = ?`)
      .get(data.id as string) as Row;
  }

  /* -------------------------------------------------------------- library */

  listProjects(ownerId: string): ProjectSummary[] {
    return this.ownedProjects(ownerId).map((project) => {
      const snapshot = this.snapshotOf(project);
      return { ...project, counts: this.counts(snapshot) };
    });
  }

  isEmpty(ownerId: string): boolean {
    const row = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM projects WHERE owner_id = ?`)
      .get(ownerId) as { n: number };
    return row.n === 0;
  }

  getSnapshot(ownerId: string, projectId: string): ProjectSnapshot | undefined {
    const project = this.projectRow(ownerId, projectId);
    if (!project) return undefined;
    return this.snapshotOf(project);
  }

  allSnapshots(ownerId: string): ProjectSnapshot[] {
    return this.ownedProjects(ownerId).map((project) => this.snapshotOf(project));
  }

  createProject(ownerId: string, data: NewProject): Project {
    const base = slug(data.title);
    let id = base;
    let suffix = 2;
    while (sqlite.prepare(`SELECT 1 FROM projects WHERE id = ?`).get(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    const count = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM projects WHERE owner_id = ?`)
      .get(ownerId) as { n: number };
    const project: Project = {
      id,
      ownerId,
      title: data.title,
      subtitle: data.subtitle ?? "",
      author: data.author ?? "",
      genre: data.genre ?? "",
      format: data.format ?? "Novel",
      archived: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      sortIndex: count.n,
      wordTarget: data.wordTarget ?? 90000,
      premise: data.premise ?? "",
      method: data.method ?? "hybrid",
    };
    // A new book starts genuinely empty. Empty states are part of the design.
    this.insertRow(projects, project as unknown as Record<string, unknown>);
    return project;
  }

  updateProject(ownerId: string, projectId: string, patch: Partial<Project>): Project | undefined {
    const project = this.projectRow(ownerId, projectId);
    if (!project) return undefined;
    const allowed = new Map(columnsOf(projects).map(({ key, column }) => [key, column]));
    const entries = Object.entries(patch).filter(
      ([key, value]) =>
        allowed.has(key) && value !== undefined && key !== "id" && key !== "ownerId",
    );
    if (entries.length) {
      sqlite
        .prepare(
          `UPDATE projects SET ${entries
            .map(([key]) => `"${allowed.get(key)}" = ?`)
            .join(", ")} WHERE id = ? AND owner_id = ?`,
        )
        .run(...entries.map(([, value]) => toSqlValue(value)), projectId, ownerId);
    }
    return this.projectRow(ownerId, projectId);
  }

  /* ------------------------------------------------------------ records */

  create(
    ownerId: string,
    projectId: string,
    collection: CollectionName,
    data: Record<string, unknown>,
  ): Row | undefined {
    if (!this.owns(ownerId, projectId)) return undefined;
    const prefixes: Record<CollectionName, string> = {
      scenes: "sc",
      characters: "ch",
      plots: "pl",
      events: "ev",
      world: "wd",
      notes: "nt",
      links: "lk",
      attachments: "at",
      checklist: "cl",
    };
    const row: Record<string, unknown> = {
      ...data,
      id: this.nextId(prefixes[collection]),
      projectId,
    };
    if (collection === "scenes" || (collection === "events" && row.orderIndex === undefined)) {
      const next = sqlite
        .prepare(
          `SELECT COUNT(*) AS n FROM "${getTableName(collectionTables[collection])}" WHERE project_id = ?`,
        )
        .get(projectId) as { n: number };
      row.orderIndex = next.n;
    }
    return this.insertRow(collectionTables[collection], row);
  }

  update(
    ownerId: string,
    projectId: string,
    collection: CollectionName,
    id: string,
    patch: Record<string, unknown>,
  ): Row | undefined {
    if (!this.owns(ownerId, projectId)) return undefined;
    const table = collectionTables[collection];
    const name = getTableName(table);
    const existing = sqlite
      .prepare(`SELECT ${selectList(table)} FROM "${name}" WHERE id = ? AND project_id = ?`)
      .get(id, projectId) as Row | undefined;
    if (!existing) return undefined;
    const allowed = new Map(columnsOf(table).map(({ key, column }) => [key, column]));
    const entries = Object.entries(patch).filter(
      ([key, value]) =>
        allowed.has(key) && value !== undefined && key !== "id" && key !== "projectId",
    );
    if (entries.length) {
      sqlite
        .prepare(
          `UPDATE "${name}" SET ${entries
            .map(([key]) => `"${allowed.get(key)}" = ?`)
            .join(", ")} WHERE id = ? AND project_id = ?`,
        )
        .run(...entries.map(([, value]) => toSqlValue(value)), id, projectId);
    }
    return sqlite
      .prepare(`SELECT ${selectList(table)} FROM "${name}" WHERE id = ? AND project_id = ?`)
      .get(id, projectId) as Row;
  }

  remove(ownerId: string, projectId: string, collection: CollectionName, id: string): boolean {
    if (!this.owns(ownerId, projectId)) return false;
    const name = getTableName(collectionTables[collection]);
    const result = sqlite
      .prepare(`DELETE FROM "${name}" WHERE id = ? AND project_id = ?`)
      .run(id, projectId);
    if (!result.changes) return false;
    if (collection !== "links") {
      sqlite
        .prepare(`DELETE FROM links WHERE project_id = ? AND (from_id = ? OR to_id = ?)`)
        .run(projectId, id, id);
    }
    return true;
  }

  moveScene(
    ownerId: string,
    projectId: string,
    id: string,
    direction: "up" | "down",
  ): Scene[] | undefined {
    if (!this.owns(ownerId, projectId)) return undefined;
    const list = this.rows("scenes", projectId) as unknown as Scene[];
    const i = list.findIndex((s) => s.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= list.length) return list;
    [list[i], list[j]] = [list[j], list[i]];
    const update = sqlite.prepare(`UPDATE scenes SET order_index = ? WHERE id = ? AND project_id = ?`);
    sqlite.transaction(() => {
      list.forEach((scene, index) => {
        scene.orderIndex = index;
        update.run(index, scene.id, projectId);
      });
    })();
    return list;
  }

  /**
   * Create one record per reviewed import item, inside a single owned book. The
   * classification and title come from the author's review — the server does not
   * reinterpret them, and nothing is generated.
   */
  importItems(ownerId: string, projectId: string, items: ImportItem[]): ImportResult | undefined {
    if (!this.owns(ownerId, projectId)) return undefined;
    const created: ImportResult["created"] = [];
    for (const item of items) {
      const source = item.fileName || "";
      const record = this.createFromImport(ownerId, projectId, item, source);
      if (record) {
        created.push({
          kind: item.kind,
          id: record.id,
          title: item.title,
          fileName: source,
          words: words(item.body),
        });
      }
    }
    return { projectId, created };
  }

  private createFromImport(
    ownerId: string,
    projectId: string,
    item: ImportItem,
    source: string,
  ): Row | undefined {
    const body = item.body;
    const byKind: Record<ImportKind, () => Row | undefined> = {
      scene: () =>
        this.create(ownerId, projectId, "scenes", {
          chapter: "Imported material",
          title: item.title,
          content: body,
          status: "draft-zero",
          pov: "",
          objective: "",
          conflict: "",
          change: "",
          draftZero: 1,
        }),
      character: () =>
        this.create(ownerId, projectId, "characters", {
          name: item.title,
          role: "Imported — needs review",
          motivation: "",
          wants: "",
          fears: "",
          wins: "",
          losses: "",
          arc: "",
          voice: body,
        }),
      plot: () =>
        this.create(ownerId, projectId, "plots", {
          name: item.title,
          kind: "subplot",
          premise: body,
          stakes: "",
          status: "open",
          setups: "[]",
          payoffs: "[]",
          openQuestion: "",
        }),
      event: () =>
        this.create(ownerId, projectId, "events", {
          label: item.title,
          storyTime: "",
          confidence: "unplaced",
          notes: body,
        }),
      world: () =>
        this.create(ownerId, projectId, "world", {
          name: item.title,
          category: "Imported",
          facts: body,
          rules: "",
          limits: "",
          costs: "",
          exceptions: "",
        }),
      note: () =>
        this.create(ownerId, projectId, "notes", {
          title: item.title,
          body,
          tags: JSON.stringify(["imported"]),
          sourcePath: source,
          origin: "imported",
        }),
    };
    return byKind[item.kind]();
  }

  /**
   * Development helper: replace this owner's library with the seeded demo books.
   * Callers must confirm the owner is the demo account — see server/auth/demo.ts.
   */
  seedDemoLibrary(ownerId: string): ProjectSummary[] {
    const seed = buildLibrarySeed();
    sqlite.transaction(() => {
      const owned = sqlite
        .prepare(`SELECT id FROM projects WHERE owner_id = ?`)
        .all(ownerId) as { id: string }[];
      for (const { id } of owned) this.deleteProject(ownerId, id);
      for (const book of seed) {
        this.insertRow(projects, {
          ...book.project,
          ownerId,
        } as unknown as Record<string, unknown>);
        const buckets: [CollectionName, Row[]][] = [
          ["scenes", book.scenes as unknown as Row[]],
          ["characters", book.characters as unknown as Row[]],
          ["plots", book.plots as unknown as Row[]],
          ["events", book.events as unknown as Row[]],
          ["world", book.world as unknown as Row[]],
          ["notes", book.notes as unknown as Row[]],
          ["links", book.links as unknown as Row[]],
          ["attachments", book.attachments as unknown as Row[]],
          ["checklist", book.checklist as unknown as Row[]],
        ];
        for (const [collection, rows] of buckets) {
          for (const row of rows) {
            this.insertRow(collectionTables[collection], {
              ...row,
              projectId: book.project.id,
            } as Record<string, unknown>);
          }
        }
      }
    })();
    return this.listProjects(ownerId);
  }

  /** Remove one owned book and everything inside it. */
  deleteProject(ownerId: string, projectId: string): boolean {
    if (!this.owns(ownerId, projectId)) return false;
    sqlite.transaction(() => {
      for (const table of Object.values(collectionTables)) {
        sqlite.prepare(`DELETE FROM "${getTableName(table)}" WHERE project_id = ?`).run(projectId);
      }
      sqlite.prepare(`DELETE FROM projects WHERE id = ? AND owner_id = ?`).run(projectId, ownerId);
    })();
    return true;
  }
}

export const storage = new SqliteStorage();

export type {
  Attachment,
  Character,
  ChecklistItem,
  Link,
  Note,
  Plot,
  Project,
  Scene,
  StoryEvent,
  WorldEntry,
};
