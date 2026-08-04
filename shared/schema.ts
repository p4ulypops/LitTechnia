/**
 * Wordsmithery — data model / file contract (prototype v0.2)
 *
 * This schema is the single source of truth shared by the Express API and the
 * React client. It intentionally mirrors the portable project format described
 * in docs/wordsmithery-implementation-plan-v0.2.md: every authored record has a
 * stable id, prose lives in Markdown-compatible text fields, and relationships
 * are explicit rows in `links` so they can be serialised to JSON without loss.
 *
 * v0.2: several books (projects) can be open in one library at the same time.
 * Every other table already carried `projectId`; that column is now the real
 * boundary — the API refuses to read or write across it.
 *
 * Lists (setups, payoffs, tags) are stored as JSON text because SQLite has no
 * array column type.
 */
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* ---------------------------------------------------------------- project */

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  author: text("author").notNull().default(""),
  genre: text("genre").notNull().default(""),
  wordTarget: integer("word_target").notNull().default(90000),
  premise: text("premise").notNull().default(""),
  method: text("method").notNull().default("hybrid"), // planning | discovery | hybrid
  format: text("format").notNull().default("Novel"), // Novel | Novella | Series book | …
  archived: integer("archived").notNull().default(0), // 1 = shelved, still readable
  createdAt: text("created_at").notNull().default(""), // ISO date string
  sortIndex: integer("sort_index").notNull().default(0),
});

/* -------------------------------------------------------------- manuscript */

export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  chapter: text("chapter").notNull().default("Chapter One"),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  status: text("status").notNull().default("blank"), // blank | draft-zero | drafted | revising | ready
  pov: text("pov").notNull().default(""),
  objective: text("objective").notNull().default(""),
  conflict: text("conflict").notNull().default(""),
  change: text("change").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
  draftZero: integer("draft_zero").notNull().default(0), // 1 = private draft-zero material
});

/* ---------------------------------------------------------------- planning */

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  motivation: text("motivation").notNull().default(""),
  wants: text("wants").notNull().default(""),
  fears: text("fears").notNull().default(""),
  wins: text("wins").notNull().default(""),
  losses: text("losses").notNull().default(""),
  arc: text("arc").notNull().default(""),
  voice: text("voice").notNull().default(""),
});

export const plots = sqliteTable("plots", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("subplot"), // main | subplot
  premise: text("premise").notNull().default(""),
  stakes: text("stakes").notNull().default(""),
  status: text("status").notNull().default("open"), // open | tangled | resolving | resolved
  setups: text("setups").notNull().default("[]"), // JSON string[]
  payoffs: text("payoffs").notNull().default("[]"), // JSON string[]
  openQuestion: text("open_question").notNull().default(""),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  label: text("label").notNull(),
  storyTime: text("story_time").notNull().default(""),
  confidence: text("confidence").notNull().default("fixed"), // fixed | approximate | unplaced
  notes: text("notes").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
});

export const worldEntries = sqliteTable("world_entries", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Rule system"),
  facts: text("facts").notNull().default(""),
  rules: text("rules").notNull().default(""),
  limits: text("limits").notNull().default(""),
  costs: text("costs").notNull().default(""),
  exceptions: text("exceptions").notNull().default(""),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  tags: text("tags").notNull().default("[]"), // JSON string[]
  sourcePath: text("source_path").notNull().default(""),
  origin: text("origin").notNull().default("authored"), // authored | imported
});

/* --------------------------------------------------- links / attachments */

/** Entity kinds that can be linked or hold attachments. */
export const entityKinds = [
  "scene",
  "character",
  "plot",
  "event",
  "world",
  "note",
] as const;
export type EntityKind = (typeof entityKinds)[number];

export const links = sqliteTable("links", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  fromKind: text("from_kind").notNull(),
  fromId: text("from_id").notNull(),
  toKind: text("to_kind").notNull(),
  toId: text("to_id").notNull(),
  note: text("note").notNull().default(""),
});

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  ownerKind: text("owner_kind").notNull(),
  ownerId: text("owner_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull().default(""),
  size: integer("size").notNull().default(0),
  caption: text("caption").notNull().default(""),
});

/* ---------------------------------------------------------------- progress */

export const checklistItems = sqliteTable("checklist_items", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  label: text("label").notNull(),
  done: integer("done").notNull().default(0),
  orderIndex: integer("order_index").notNull().default(0),
});

/* ----------------------------------------------------- insert schemas/types */

export const insertProjectSchema = createInsertSchema(projects);

/** What the New book form may send. Only a title is required. */
export const newProjectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(240).optional(),
  genre: z.string().trim().max(160).optional(),
  format: z.string().trim().max(80).optional(),
  author: z.string().trim().max(160).optional(),
  premise: z.string().trim().max(2000).optional(),
  method: z.enum(["planning", "discovery", "hybrid"]).optional(),
  wordTarget: z.number().int().min(500).max(500000).optional(),
});
export type NewProject = z.infer<typeof newProjectSchema>;
export const insertSceneSchema = createInsertSchema(scenes).omit({ id: true });
export const insertCharacterSchema = createInsertSchema(characters).omit({ id: true });
export const insertPlotSchema = createInsertSchema(plots).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertWorldEntrySchema = createInsertSchema(worldEntries).omit({ id: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true });
export const insertLinkSchema = createInsertSchema(links).omit({ id: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true });
export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({ id: true });

export type Project = typeof projects.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Plot = typeof plots.$inferSelect;
export type StoryEvent = typeof events.$inferSelect;
export type WorldEntry = typeof worldEntries.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Link = typeof links.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;

export type InsertScene = z.infer<typeof insertSceneSchema>;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type InsertPlot = z.infer<typeof insertPlotSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertWorldEntry = z.infer<typeof insertWorldEntrySchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertLink = z.infer<typeof insertLinkSchema>;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;

/** Everything the client needs for one project, in one request. */
export type ProjectSnapshot = {
  project: Project;
  scenes: Scene[];
  characters: Character[];
  plots: Plot[];
  events: StoryEvent[];
  world: WorldEntry[];
  notes: Note[];
  links: Link[];
  attachments: Attachment[];
  checklist: ChecklistItem[];
};

/** Per-book counts shown in the library, computed server-side. */
export type ProjectCounts = {
  scenes: number;
  characters: number;
  plots: number;
  events: number;
  world: number;
  notes: number;
  links: number;
  words: number;
};

/** One row of the library list: the book plus its counts. */
export type ProjectSummary = Project & { counts: ProjectCounts };

/** Everything the library page needs in one request. */
export type LibrarySnapshot = { projects: ProjectSummary[] };

/** Import classification offered in the import review stage. */
export const importKinds = [
  "scene",
  "character",
  "plot",
  "event",
  "world",
  "note",
] as const;
export type ImportKind = (typeof importKinds)[number];

/** One reviewed file, as the client sends it to POST /api/projects/:id/import. */
export const importItemSchema = z.object({
  kind: z.enum(importKinds),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(400000),
  fileName: z.string().max(260).default(""),
});
export const importRequestSchema = z.object({
  items: z.array(importItemSchema).min(1).max(50),
});
export type ImportItem = z.infer<typeof importItemSchema>;

/** What the server reports back after an import is confirmed. */
export type ImportResult = {
  projectId: string;
  created: { kind: ImportKind; id: string; title: string; fileName: string; words: number }[];
};

/** Collection names accepted by the generic REST routes. */
export const collections = [
  "scenes",
  "characters",
  "plots",
  "events",
  "world",
  "notes",
  "links",
  "attachments",
  "checklist",
] as const;
export type CollectionName = (typeof collections)[number];

/** Documented shape of the single-book JSON snapshot export. */
export const SNAPSHOT_FORMAT_VERSION = "wordsmithery-project/0.2";

/** Documented shape of the whole-library JSON snapshot export. */
export const LIBRARY_FORMAT_VERSION = "wordsmithery-library/0.2";
