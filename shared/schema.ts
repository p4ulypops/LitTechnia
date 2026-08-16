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
 * v0.3: accounts. `projects.ownerId` is the second boundary — a book belongs to
 * exactly one author account, and the API resolves the owner from the server
 * session, never from anything the client sends. Auth material (users,
 * sessions, passkeys, single-use magic-link tokens, WebAuthn challenges) lives
 * in the same SQLite file so a deployment is one file plus environment values.
 *
 * Lists (setups, payoffs, tags) are stored as JSON text because SQLite has no
 * array column type.
 *
 * ---------------------------------------------------------------------------
 * Export contract migration: littechnia-project/0.2 -> littechnia-project/0.3
 * (and littechnia-library/0.2 -> littechnia-library/0.3)
 *
 * This pass is the shared substrate for three feature builds. It adds columns
 * and tables only -- no route, no UI, no write-path behaviour changes.
 *
 *   Sub-PRD A (media / file storage):
 *     attachments gains storageKey, role, origin, derivedFromId, provenance,
 *     privateNote, altText, createdAt, sortIndex, batchId. `attachments` is
 *     still metadata-only in this release; a later package writes the bytes.
 *     storageKey/mimeType/size/origin/derivedFromId/provenance/createdAt/
 *     updatedAt are server-set and omitted from insertAttachmentSchema:
 *     provenance is a trust claim, so a client must not be able to label AI
 *     output as an upload (or the reverse).
 *
 *   Sub-PRD B (naming, annotation, capture):
 *     links gains origin + relKind so the previously undiscriminated
 *     polymorphic cross-reference table can separate authored rows from rows
 *     derived from #S: tags. New tables: aliases, comments, captureItems --
 *     all portable authored data, so all three join ProjectSnapshot and the
 *     JSON export.
 *
 *   Sub-PRD C (feeds, activity, progress):
 *     New tables: feedDefinitions (publication configuration, token stored
 *     hashed, never plaintext) and activityEvents (server-written audit
 *     trail). Both are operational/publication state, NOT portable authored
 *     data: they are deliberately absent from `collections`, from
 *     ProjectSnapshot and from every export. A future package may add an
 *     explicitly redacted export recipe.
 *
 *   All sub-PRDs:
 *     updatedAt on scenes, characters, plots, events, worldEntries, notes,
 *     links, attachments and checklistItems. Substrate only -- write paths
 *     still have to populate it before micro_changes / version_history feeds
 *     can be built on top.
 *
 * Every new column is .notNull().default(...) per repo convention: drizzle-zod
 * types stay non-nullable, the JSON snapshot stays stable, and SQLite never has
 * to widen a nullable column later.
 * ---------------------------------------------------------------------------
 */
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* ------------------------------------------------------------------- auth */

/**
 * One author account. Email is the only identifier we keep; there is no
 * password column anywhere in this schema by design.
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
  lastSignInAt: text("last_sign_in_at").notNull().default(""),
  isDemo: integer("is_demo").notNull().default(0), // 1 = local demo owner, never a real person
});

/**
 * Server-side sessions. `id` is the SHA-256 of the cookie token, so a database
 * copy cannot be replayed as a live session.
 */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  method: text("method").notNull().default("passkey"), // passkey | magic-link | dev
});

/** Registered public-key credentials. Private keys never leave the device. */
export const passkeys = sqliteTable("passkeys", {
  id: text("id").primaryKey(), // credential id, base64url
  userId: text("user_id").notNull(),
  label: text("label").notNull().default("Passkey"),
  publicKey: text("public_key").notNull(), // base64url COSE public key
  counter: integer("counter").notNull().default(0),
  transports: text("transports").notNull().default("[]"), // JSON string[]
  deviceType: text("device_type").notNull().default(""),
  backedUp: integer("backed_up").notNull().default(0),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at").notNull().default(""),
});

/** Short-lived WebAuthn challenges, held server-side and used once. */
export const webauthnChallenges = sqliteTable("webauthn_challenges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  purpose: text("purpose").notNull(), // registration | authentication
  challenge: text("challenge").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

/** Single-use magic-link tokens. `id` is the SHA-256 of the emailed token. */
export const magicLinks = sqliteTable("magic_links", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at").notNull().default(""),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Passkey = typeof passkeys.$inferSelect;

/** The only user fields the client is ever given. */
export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  isDemo: boolean;
  passkeyCount: number;
};

/** GET /api/auth/session */
export type SessionResponse = {
  user: PublicUser | null;
  /** True when this session came from a magic link and has no passkey yet. */
  needsPasskey: boolean;
  /** Configuration hints that are safe to expose (no secrets). */
  auth: {
    magicLinkEnabled: boolean;
    passkeyEnabled: boolean;
    /** False when this address cannot run a WebAuthn ceremony (wrong host for the RP ID). */
    passkeyAvailableHere: boolean;
    demoEnabled: boolean;
  };
};

export const emailRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const passkeyLabelSchema = z.object({
  label: z.string().trim().min(1).max(60).default("Passkey"),
});

export const challengeIdSchema = z.object({ challengeId: z.string().min(8).max(120) });

/* ---------------------------------------------------------------- project */

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  /** Author account that owns this book. Resolved from the session, never sent. */
  ownerId: text("owner_id").notNull().default(""),
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
  updatedAt: text("updated_at").notNull().default(""), // v0.3 substrate; write paths populate later
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
  updatedAt: text("updated_at").notNull().default(""),
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
  updatedAt: text("updated_at").notNull().default(""),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  label: text("label").notNull(),
  storyTime: text("story_time").notNull().default(""),
  confidence: text("confidence").notNull().default("fixed"), // fixed | approximate | unplaced
  notes: text("notes").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(""),
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
  updatedAt: text("updated_at").notNull().default(""),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  tags: text("tags").notNull().default("[]"), // JSON string[]
  sourcePath: text("source_path").notNull().default(""),
  origin: text("origin").notNull().default("authored"), // authored | imported
  updatedAt: text("updated_at").notNull().default(""),
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
  /**
   * v0.3 (Sub-PRD B): this table is an undiscriminated polymorphic
   * cross-reference, so a derived row used to be indistinguishable from one the
   * author drew by hand. `origin` makes that difference explicit.
   *   authored — the author created this link in the UI.
   *   derived  — machine-generated from a #S: tag; safe to rebuild/discard.
   */
  origin: text("origin").notNull().default("authored"),
  /** Reserved for later link semantics (appears_in, mentions, …). */
  relKind: text("rel_kind").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
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
  /* --- v0.3 (Sub-PRD A): substrate for the file-storage subsystem. -------- */
  /** Server-set opaque path/key: "where the bytes are". Never client-supplied. */
  storageKey: text("storage_key").notNull().default(""),
  /** reference | real_world_ref | derived */
  role: text("role").notNull().default("reference"),
  /** uploaded | generated | edited (mirrors the notes.origin precedent). */
  origin: text("origin").notNull().default("uploaded"),
  /** Parent attachment id for derived media. */
  derivedFromId: text("derived_from_id").notNull().default(""),
  /** JSON {provider, model, prompt, at} — a trust claim, so server-set only. */
  provenance: text("provenance").notNull().default("{}"),
  /** Private note for real-world references. Export-excluded by design. */
  privateNote: text("private_note").notNull().default(""),
  /** Accessibility text. */
  altText: text("alt_text").notNull().default(""),
  createdAt: text("created_at").notNull().default(""), // ISO timestamp
  sortIndex: integer("sort_index").notNull().default(0),
  /** Groups the 2-4 variations produced by one generation request. */
  batchId: text("batch_id").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

/* ------------------------------------------------ naming / annotation (B) */

/**
 * Sub-PRD B: stable, human-readable names for any entity. `slug` is normalised
 * and unique per project across every entity kind (see the unique index in
 * server/db.ts), so a name can be resolved without knowing what it points at.
 * A retired alias keeps its row so old references still redirect.
 */
export const aliases = sqliteTable("aliases", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  targetKind: text("target_kind").notNull(), // one of entityKinds
  targetId: text("target_id").notNull(),
  slug: text("slug").notNull(), // normalised; collision checks are case-insensitive
  shortCode: text("short_code").notNull().default(""), // optional short machine code
  isPrimary: integer("is_primary").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
  retiredAt: text("retired_at").notNull().default(""), // non-empty = retired, kept as a redirect
});

/**
 * Sub-PRD B: an anchored annotation on an entity's text. The character offsets
 * are a hint, not a contract — `anchorQuote` is the context window used to
 * re-anchor fuzzily after an edit, and `moved` records that this happened.
 */
export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  targetKind: text("target_kind").notNull(), // one of entityKinds
  targetId: text("target_id").notNull(),
  anchorStart: integer("anchor_start").notNull().default(0), // character offset in the target's text
  anchorEnd: integer("anchor_end").notNull().default(0),
  anchorQuote: text("anchor_quote").notNull().default(""), // quoted context window for fuzzy re-anchoring
  body: text("body").notNull().default(""),
  moved: integer("moved").notNull().default(0), // 1 = the anchor shifted
  resolvedAt: text("resolved_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
  /** Forward compatibility: the first release enforces author == project owner. */
  authorId: text("author_id").notNull().default(""),
});

/**
 * Sub-PRD B: the capture inbox. A thought lands here unclassified and is later
 * turned into a real record; `classifiedKind`/`classifiedId` point at whatever
 * it became.
 */
export const captureItems = sqliteTable("capture_items", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  body: text("body").notNull().default(""),
  source: text("source").notNull().default("in_app"), // in_app | system_dictation (more later)
  status: text("status").notNull().default("inbox"), // inbox | classified | dismissed
  dueAt: text("due_at").notNull().default(""),
  sourceCreatedAt: text("source_created_at").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
  classifiedKind: text("classified_kind").notNull().default(""),
  classifiedId: text("classified_id").notNull().default(""),
});

/* --------------------------------------------- feeds / activity (C) */

/**
 * Sub-PRD C: one publication surface for a book. Operational state, not
 * authored content: it is absent from `collections` (a dedicated authenticated
 * API manages it) and absent from every export.
 *
 * `tokenHash` stores only a hash of the server-minted feed token. The plaintext
 * token is shown once at mint time and never persisted, so a database copy
 * cannot be replayed to read a private feed. `detailLevel` defaults to the
 * least-revealing value and `enabled` defaults to off.
 */
export const feedDefinitions = sqliteTable("feed_definitions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  // manuscript | inspiration_prompts | micro_changes | gamification_progress | version_history
  feedType: text("feed_type").notNull().default("manuscript"),
  // metadata_only | summary | full — least-revealing default
  detailLevel: text("detail_level").notNull().default("metadata_only"),
  audienceLabel: text("audience_label").notNull().default(""),
  /** Hash of the server-minted unguessable token. Never the plaintext token. */
  tokenHash: text("token_hash").notNull().default(""),
  enabled: integer("enabled").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
  lastBuiltAt: text("last_built_at").notNull().default(""),
  revokedAt: text("revoked_at").notNull().default(""),
});

/**
 * Sub-PRD C: append-only activity trail. Server-written only — there is no
 * insert schema and it is deliberately not a `collections` member, so no client
 * can forge or edit history. `summary` is privacy-classified prose-free text
 * and `detail` is a JSON metadata payload; neither should carry manuscript
 * prose by default.
 */
export const activityEvents = sqliteTable("activity_events", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  at: text("at").notNull().default(""), // ISO timestamp
  kind: text("kind").notNull(), // event type from an allowlist
  targetKind: text("target_kind").notNull().default(""),
  targetId: text("target_id").notNull().default(""),
  summary: text("summary").notNull().default(""), // human-readable, privacy-classified
  detail: text("detail").notNull().default("{}"), // JSON metadata payload, no prose by default
});

/* ---------------------------------------------------------------- progress */

export const checklistItems = sqliteTable("checklist_items", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  label: text("label").notNull(),
  done: integer("done").notNull().default(0),
  orderIndex: integer("order_index").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(""),
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
/**
 * The server, not the client, assigns where the bytes live and what produced
 * them. `provenance` in particular is a trust claim: if a client could set it,
 * it could label AI output as an upload (or the reverse) and "which provider and
 * model produced this" would be unenforceable. Clients may still set fileName,
 * caption, role, privateNote, altText, sortIndex and batchId.
 */
export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  storageKey: true,
  mimeType: true,
  size: true,
  origin: true,
  derivedFromId: true,
  provenance: true,
  createdAt: true,
  updatedAt: true,
});
export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({ id: true });
export const insertAliasSchema = createInsertSchema(aliases).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCaptureItemSchema = createInsertSchema(captureItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
/**
 * Feed definitions are not a `collections` member; this schema exists for the
 * dedicated authenticated API a later package adds. The token is minted and
 * hashed server-side, so `tokenHash` is never client-writable, and the
 * lifecycle timestamps are server-owned too.
 */
export const insertFeedDefinitionSchema = createInsertSchema(feedDefinitions).omit({
  id: true,
  tokenHash: true,
  createdAt: true,
  lastBuiltAt: true,
  revokedAt: true,
});
/* `activityEvents` has no insert schema on purpose: it is server-written only. */

/* ------------------------------------------- feed management API contract */

/**
 * How much prose a hosted feed may carry. The default is the least-revealing
 * value, matching the feedDefinitions column default; an author opts a feed
 * UP to more detail, never down.
 */
export const feedDetailLevels = ["metadata_only", "summary", "full"] as const;
export type FeedDetailLevel = (typeof feedDetailLevels)[number];

/**
 * What the Connections page may send to create a hosted feed. Only the
 * manuscript feed exists in this release — the other feed types from Sub-PRD
 * C depend on infrastructure that is not built yet, so they are rejected here
 * rather than accepted and silently mishandled. The token is minted and
 * hashed server-side; there is deliberately no client-writable token field.
 */
export const createFeedSchema = z.object({
  feedType: z.literal("manuscript"),
  detailLevel: z.enum(feedDetailLevels).default("metadata_only"),
  audienceLabel: z.string().trim().max(120).default(""),
});
export type CreateFeedRequest = z.infer<typeof createFeedSchema>;

/**
 * A feed definition as the management API returns it. `tokenHash` never
 * leaves the server, and the plaintext token is never stored — so a feed's
 * URL can only be shown once, at mint time (see CreatedFeedResponse).
 */
export type PublicFeedDefinition = Omit<FeedDefinition, "tokenHash">;

/** GET /api/projects/:projectId/feeds */
export type FeedListResponse = { feeds: PublicFeedDefinition[] };

/**
 * POST /api/projects/:projectId/feeds — the one and only time the plaintext
 * token (and therefore the usable public URL) is disclosed. The UI must say
 * so explicitly when it shows this.
 */
export type CreatedFeedResponse = {
  feed: PublicFeedDefinition;
  /** Plaintext server-minted token, ≥128-bit, shown once. Never persisted. */
  token: string;
  /** Absolute public URL of the feed: <appUrl>/feeds/<token>.xml */
  url: string;
};

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
export type Alias = typeof aliases.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type CaptureItem = typeof captureItems.$inferSelect;
export type FeedDefinition = typeof feedDefinitions.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;

export type InsertScene = z.infer<typeof insertSceneSchema>;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type InsertPlot = z.infer<typeof insertPlotSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertWorldEntry = z.infer<typeof insertWorldEntrySchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertLink = z.infer<typeof insertLinkSchema>;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type InsertAlias = z.infer<typeof insertAliasSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertCaptureItem = z.infer<typeof insertCaptureItemSchema>;
export type InsertFeedDefinition = z.infer<typeof insertFeedDefinitionSchema>;

/**
 * Everything the client needs for one project, in one request — and exactly the
 * portable authored data the JSON export carries. `feedDefinitions` and
 * `activityEvents` are deliberately absent: they are operational/publication
 * state and must not leak into an export.
 */
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
  aliases: Alias[];
  comments: Comment[];
  captureItems: CaptureItem[];
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
  attachments: number;
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
  "aliases",
  "comments",
  "captureItems",
  // Not here on purpose:
  //   feedDefinitions — managed by a dedicated authenticated API, not generic CRUD.
  //   activityEvents  — server-written only; a client must not be able to forge history.
] as const;
export type CollectionName = (typeof collections)[number];

/** Documented shape of the single-book JSON snapshot export. */
export const SNAPSHOT_FORMAT_VERSION = "littechnia-project/0.3";

/** Documented shape of the whole-library JSON snapshot export. */
export const LIBRARY_FORMAT_VERSION = "littechnia-library/0.3";

/* -------------------------------------------------------------- connections */

/**
 * Capability-gated states for the opt-in Connections surface. The server is
 * the only thing that computes these -- the browser never inspects an
 * environment key directly, per docs/ux/connections-release-mechanics.md.
 *
 *   available        an enabled Connect/Export control, real today.
 *   file_based       a real, working no-account file/feed capability.
 *   handoff_only     no fake Connect button; the real path is described.
 *   setup_required   the feature is built; this deployment just needs an
 *                     admin-provided key or flag.
 *   blocked_security the feature is not safe to enable yet (no encrypted
 *                     credential storage and/or the adapter isn't built).
 *   unsupported      not available, with a plain-language reason and the
 *                     nearest safe alternative.
 */
export const connectorStates = [
  "available",
  "file_based",
  "handoff_only",
  "setup_required",
  "blocked_security",
  "unsupported",
] as const;
export type ConnectorState = (typeof connectorStates)[number];

/** One card on the Connections page. Contains no secrets, ever. */
export type ConnectorAvailability = {
  id: string;
  name: string;
  category: "file" | "feed" | "publish" | "docs" | "narration" | "video";
  state: ConnectorState;
  /** What this connector does, in one sentence. */
  summary: string;
  /** Why it is in this state right now -- always shown, never a bare label. */
  reason: string;
  /** Present only for handoff_only/file_based cards with a real, safe next step. */
  actionLabel?: string;
  /** An in-app route only -- never an external URL guessed by the server. */
  actionHref?: string;
};

export type ConnectionsResponse = { connectors: ConnectorAvailability[] };
