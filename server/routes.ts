/**
 * HTTP API (v0.2).
 *
 * Every content route is nested under /api/projects/:projectId so the book a
 * write belongs to is never inferred from server state. Unknown project ids get
 * a 404 rather than silently falling back to another book.
 */
import type { Express } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import {
  collections,
  importRequestSchema,
  insertAttachmentSchema,
  insertCharacterSchema,
  insertChecklistItemSchema,
  insertEventSchema,
  insertLinkSchema,
  insertNoteSchema,
  insertPlotSchema,
  insertSceneSchema,
  insertWorldEntrySchema,
  newProjectSchema,
  type CollectionName,
} from "@shared/schema";
import { z } from "zod";

type AnyInsertSchema = {
  safeParse: (data: unknown) => z.ZodSafeParseResult<any>;
  partial: () => AnyInsertSchema;
};

const insertSchemas: Record<CollectionName, AnyInsertSchema> = {
  scenes: insertSceneSchema,
  characters: insertCharacterSchema,
  plots: insertPlotSchema,
  events: insertEventSchema,
  world: insertWorldEntrySchema,
  notes: insertNoteSchema,
  links: insertLinkSchema,
  attachments: insertAttachmentSchema,
  checklist: insertChecklistItemSchema,
};

const projectPatchSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  genre: z.string().optional(),
  format: z.string().optional(),
  premise: z.string().optional(),
  method: z.string().optional(),
  archived: z.union([z.literal(0), z.literal(1)]).optional(),
  wordTarget: z.number().int().min(500).max(500000).optional(),
});

function isCollection(value: string): value is CollectionName {
  return (collections as readonly string[]).includes(value);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  /* ----------------------------------------------------------------- library */

  app.get("/api/projects", (_req, res) => {
    res.json({ projects: storage.listProjects() });
  });

  app.get("/api/library/snapshots", (_req, res) => {
    res.json({ projects: storage.allSnapshots() });
  });

  app.post("/api/projects", (req, res) => {
    const parsed = newProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "A book needs a title", detail: parsed.error.message });
    }
    res.status(201).json(storage.createProject(parsed.data));
  });

  app.get("/api/projects/:projectId/snapshot", (req, res) => {
    const snapshot = storage.getSnapshot(req.params.projectId);
    if (!snapshot) return res.status(404).json({ error: "Unknown project" });
    res.json(snapshot);
  });

  app.patch("/api/projects/:projectId", (req, res) => {
    const parsed = projectPatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid project patch" });
    const project = storage.updateProject(req.params.projectId, parsed.data);
    if (!project) return res.status(404).json({ error: "Unknown project" });
    res.json(project);
  });

  /* ------------------------------------------------------------------ import */

  app.post("/api/projects/:projectId/import", (req, res) => {
    const parsed = importRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Nothing valid to import", detail: parsed.error.message });
    }
    const result = storage.importItems(req.params.projectId, parsed.data.items);
    if (!result) return res.status(404).json({ error: "Unknown project" });
    res.status(201).json(result);
  });

  /* ------------------------------------------------------------- manuscript */

  app.post("/api/projects/:projectId/scenes/reorder", (req, res) => {
    const parsed = z
      .object({ id: z.string(), direction: z.enum(["up", "down"]) })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid reorder request" });
    const scenes = storage.moveScene(req.params.projectId, parsed.data.id, parsed.data.direction);
    if (!scenes) return res.status(404).json({ error: "Unknown project" });
    res.json(scenes);
  });

  /* ------------------------------------------------- generic collection CRUD */

  app.post("/api/projects/:projectId/:collection", (req, res) => {
    const { collection, projectId } = req.params;
    if (!isCollection(collection)) return res.status(404).json({ error: "Unknown collection" });
    if (!storage.getSnapshot(projectId)) return res.status(404).json({ error: "Unknown project" });
    const parsed = insertSchemas[collection].safeParse({ projectId, ...req.body });
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", detail: parsed.error.message });
    }
    const row = storage.create(projectId, collection, parsed.data as Record<string, unknown>);
    res.status(201).json(row);
  });

  app.patch("/api/projects/:projectId/:collection/:id", (req, res) => {
    const { collection, projectId, id } = req.params;
    if (!isCollection(collection)) return res.status(404).json({ error: "Unknown collection" });
    const parsed = insertSchemas[collection].partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", detail: parsed.error.message });
    }
    const row = storage.update(projectId, collection, id, parsed.data as Record<string, unknown>);
    if (!row) return res.status(404).json({ error: "Not found in this project" });
    res.json(row);
  });

  app.delete("/api/projects/:projectId/:collection/:id", (req, res) => {
    const { collection, projectId, id } = req.params;
    if (!isCollection(collection)) return res.status(404).json({ error: "Unknown collection" });
    const ok = storage.remove(projectId, collection, id);
    if (!ok) return res.status(404).json({ error: "Not found in this project" });
    res.status(204).end();
  });

  /* ------------------------------------------------------------------- demo */

  app.post("/api/reset", (_req, res) => {
    res.json({ projects: storage.reset() });
  });

  return httpServer;
}
