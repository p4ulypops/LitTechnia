/**
 * Storage — prototype implementation (v0.2, multi-book).
 *
 * The shipped product stores each book as an author-owned folder on disk
 * (Markdown + JSON). A browser prototype cannot touch the filesystem, so this
 * process keeps a *library* of projects in memory, each shaped exactly like
 * `shared/schema.ts`. Every read and write is scoped to one projectId: there is
 * no path through this class that mixes two books' records.
 *
 * Restarting the server restores the seeded demo library. No browser storage is
 * used anywhere, and nothing is written outside this process.
 */
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

export interface IStorage {
  /** Every book in the library, with counts, in display order. */
  listProjects(): ProjectSummary[];
  /** One book's full contents, or undefined if the id is unknown. */
  getSnapshot(projectId: string): ProjectSnapshot | undefined;
  /** All books' full contents — used only by the library JSON export. */
  allSnapshots(): ProjectSnapshot[];
  createProject(data: NewProject): Project;
  updateProject(projectId: string, patch: Partial<Project>): Project | undefined;
  create(projectId: string, collection: CollectionName, data: Record<string, unknown>): Row | undefined;
  update(
    projectId: string,
    collection: CollectionName,
    id: string,
    patch: Record<string, unknown>,
  ): Row | undefined;
  remove(projectId: string, collection: CollectionName, id: string): boolean;
  moveScene(projectId: string, id: string, direction: "up" | "down"): Scene[] | undefined;
  importItems(projectId: string, items: ImportItem[]): ImportResult | undefined;
  reset(): ProjectSummary[];
}

export class MemoryStorage implements IStorage {
  private books = new Map<string, ProjectSnapshot>();
  private counter = 100;

  constructor() {
    this.seed();
  }

  private seed() {
    this.books = new Map(buildLibrarySeed().map((book) => [book.project.id, book]));
    this.counter = 100;
  }

  private nextId(prefix: string) {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  private bucket(book: ProjectSnapshot, collection: CollectionName): Row[] {
    const map: Record<CollectionName, Row[]> = {
      scenes: book.scenes as unknown as Row[],
      characters: book.characters as unknown as Row[],
      plots: book.plots as unknown as Row[],
      events: book.events as unknown as Row[],
      world: book.world as unknown as Row[],
      notes: book.notes as unknown as Row[],
      links: book.links as unknown as Row[],
      attachments: book.attachments as unknown as Row[],
      checklist: book.checklist as unknown as Row[],
    };
    return map[collection];
  }

  private counts(book: ProjectSnapshot): ProjectCounts {
    return {
      scenes: book.scenes.length,
      characters: book.characters.length,
      plots: book.plots.length,
      events: book.events.length,
      world: book.world.length,
      notes: book.notes.length,
      links: book.links.length,
      words: book.scenes.reduce((total, s) => total + words(s.content), 0),
    };
  }

  private ordered(): ProjectSnapshot[] {
    return Array.from(this.books.values()).sort(
      (a, b) => a.project.sortIndex - b.project.sortIndex || a.project.title.localeCompare(b.project.title),
    );
  }

  listProjects(): ProjectSummary[] {
    return this.ordered().map((book) => ({ ...book.project, counts: this.counts(book) }));
  }

  getSnapshot(projectId: string): ProjectSnapshot | undefined {
    const book = this.books.get(projectId);
    if (!book) return undefined;
    book.scenes.sort((a, b) => a.orderIndex - b.orderIndex);
    book.events.sort((a, b) => a.orderIndex - b.orderIndex);
    return book;
  }

  allSnapshots(): ProjectSnapshot[] {
    return this.ordered().map((book) => this.getSnapshot(book.project.id)!);
  }

  createProject(data: NewProject): Project {
    let id = slug(data.title);
    let suffix = 2;
    while (this.books.has(id)) {
      id = `${slug(data.title)}-${suffix}`;
      suffix += 1;
    }
    const project: Project = {
      id,
      title: data.title,
      subtitle: data.subtitle ?? "",
      author: data.author ?? "",
      genre: data.genre ?? "",
      format: data.format ?? "Novel",
      archived: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      sortIndex: this.books.size,
      wordTarget: data.wordTarget ?? 90000,
      premise: data.premise ?? "",
      method: data.method ?? "hybrid",
    };
    // A new book starts genuinely empty. Empty states are part of the design.
    this.books.set(id, {
      project,
      scenes: [],
      characters: [],
      plots: [],
      events: [],
      world: [],
      notes: [],
      links: [],
      attachments: [],
      checklist: [],
    });
    return project;
  }

  updateProject(projectId: string, patch: Partial<Project>): Project | undefined {
    const book = this.books.get(projectId);
    if (!book) return undefined;
    book.project = { ...book.project, ...patch, id: book.project.id };
    return book.project;
  }

  create(projectId: string, collection: CollectionName, data: Record<string, unknown>): Row | undefined {
    const book = this.books.get(projectId);
    if (!book) return undefined;
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
    const row = {
      ...data,
      id: this.nextId(prefixes[collection]),
      projectId,
    } as Row;
    if (collection === "scenes") {
      row.orderIndex = book.scenes.length;
    }
    if (collection === "events" && row.orderIndex === undefined) {
      row.orderIndex = book.events.length;
    }
    this.bucket(book, collection).push(row);
    return row;
  }

  update(projectId: string, collection: CollectionName, id: string, patch: Record<string, unknown>) {
    const book = this.books.get(projectId);
    if (!book) return undefined;
    const rows = this.bucket(book, collection);
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return undefined;
    rows[i] = { ...rows[i], ...patch, id, projectId };
    return rows[i];
  }

  remove(projectId: string, collection: CollectionName, id: string) {
    const book = this.books.get(projectId);
    if (!book) return false;
    const rows = this.bucket(book, collection);
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return false;
    rows.splice(i, 1);
    if (collection !== "links") {
      book.links = book.links.filter((l) => l.fromId !== id && l.toId !== id);
    }
    return true;
  }

  moveScene(projectId: string, id: string, direction: "up" | "down"): Scene[] | undefined {
    const book = this.books.get(projectId);
    if (!book) return undefined;
    const list = [...book.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
    const i = list.findIndex((s) => s.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= list.length) return list;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((s, index) => {
      s.orderIndex = index;
    });
    book.scenes = list;
    return list;
  }

  /**
   * Create one record per reviewed import item, inside a single book. The
   * classification and title come from the author's review — the server does not
   * reinterpret them, and nothing is generated.
   */
  importItems(projectId: string, items: ImportItem[]): ImportResult | undefined {
    const book = this.books.get(projectId);
    if (!book) return undefined;
    const created: ImportResult["created"] = [];

    for (const item of items) {
      const source = item.fileName || "";
      const record = this.createFromImport(projectId, item, source);
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

  private createFromImport(projectId: string, item: ImportItem, source: string): Row | undefined {
    const body = item.body;
    const byKind: Record<ImportKind, () => Row | undefined> = {
      scene: () =>
        this.create(projectId, "scenes", {
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
        this.create(projectId, "characters", {
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
        this.create(projectId, "plots", {
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
        this.create(projectId, "events", {
          label: item.title,
          storyTime: "",
          confidence: "unplaced",
          notes: body,
        }),
      world: () =>
        this.create(projectId, "world", {
          name: item.title,
          category: "Imported",
          facts: body,
          rules: "",
          limits: "",
          costs: "",
          exceptions: "",
        }),
      note: () =>
        this.create(projectId, "notes", {
          title: item.title,
          body,
          tags: JSON.stringify(["imported"]),
          sourcePath: source,
          origin: "imported",
        }),
    };
    return byKind[item.kind]();
  }

  reset() {
    this.seed();
    return this.listProjects();
  }
}

export const storage: IStorage = new MemoryStorage();

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
