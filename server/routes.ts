/**
 * HTTP API (v0.3).
 *
 * Two invariants:
 *   - Every content route is nested under /api/projects/:projectId so the book a
 *     write belongs to is never inferred from server state.
 *   - Every content route runs behind `requireAuth` and passes the *session's*
 *     user id to storage. The owner is never read from the body, a query string
 *     or a header, so a signed-in author cannot address another author's book;
 *     an unowned or unknown project id is an indistinguishable 404.
 *
 * Only /api/health and /api/auth/* are reachable without a session.
 */
import type { Express } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import { registerAuthRoutes } from "./auth/routes";
import { attachSession, checkOrigin, requireAuth } from "./auth/session";
import { isDemoOwner } from "./auth/demo";
import { env, publicAuthConfig, requestHostname } from "./env";
import { resolveConnectors } from "./connectors";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  /* ------------------------------------------------------- session plumbing */

  app.use(attachSession);
  app.use("/api", checkOrigin);

  /** Liveness only: no session, no data, nothing configuration-revealing. */
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      auth: publicAuthConfig(requestHostname(req.headers)),
    });
  });

  registerAuthRoutes(app);

  // From here down every /api route requires a signed-in author.
  app.use("/api/projects", requireAuth);
  app.use("/api/library", requireAuth);
  app.use("/api/connections", requireAuth);

  /* ------------------------------------------------------------- connections */

  /**
   * Non-secret, server-computed availability only -- see server/connectors.ts.
   * The browser never inspects an environment key directly.
   */
  app.get("/api/connections", (_req, res) => {
    res.json({ connectors: resolveConnectors() });
  });

  /* ----------------------------------------------------------------- library */

  app.get("/api/projects", (req, res) => {
    res.json({ projects: storage.listProjects(req.auth!.user.id) });
  });

  app.get("/api/library/snapshots", (req, res) => {
    res.json({ projects: storage.allSnapshots(req.auth!.user.id) });
  });

  app.post("/api/projects", (req, res) => {
    const parsed = newProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "A book needs a title", detail: parsed.error.message });
    }
    res.status(201).json(storage.createProject(req.auth!.user.id, parsed.data));
  });

  app.get("/api/projects/:projectId/snapshot", (req, res) => {
    const snapshot = storage.getSnapshot(
      req.auth!.user.id,
      req.params.projectId,
    );
    if (!snapshot) return res.status(404).json({ error: "Unknown project" });
    res.json(snapshot);
  });

  app.patch("/api/projects/:projectId", (req, res) => {
    const parsed = projectPatchSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid project patch" });
    const project = storage.updateProject(
      req.auth!.user.id,
      req.params.projectId,
      parsed.data,
    );
    if (!project) return res.status(404).json({ error: "Unknown project" });
    res.json(project);
  });

  /* ------------------------------------------------------------------ import */

  app.post("/api/projects/:projectId/import", (req, res) => {
    const parsed = importRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error: "Nothing valid to import",
          detail: parsed.error.message,
        });
    }
    const result = storage.importItems(
      req.auth!.user.id,
      req.params.projectId,
      parsed.data.items,
    );
    if (!result) return res.status(404).json({ error: "Unknown project" });
    res.status(201).json(result);
  });

  /* ------------------------------------------------------------- manuscript */

  app.post("/api/projects/:projectId/scenes/reorder", (req, res) => {
    const parsed = z
      .object({ id: z.string(), direction: z.enum(["up", "down"]) })
      .safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid reorder request" });
    const scenes = storage.moveScene(
      req.auth!.user.id,
      req.params.projectId,
      parsed.data.id,
      parsed.data.direction,
    );
    if (!scenes) return res.status(404).json({ error: "Unknown project" });
    res.json(scenes);
  });

  /* ------------------------------------------------- generic collection CRUD */

  app.post("/api/projects/:projectId/:collection", (req, res) => {
    const { collection, projectId } = req.params;
    if (!isCollection(collection))
      return res.status(404).json({ error: "Unknown collection" });
    if (!storage.owns(req.auth!.user.id, projectId)) {
      return res.status(404).json({ error: "Unknown project" });
    }
    const parsed = insertSchemas[collection].safeParse({
      projectId,
      ...req.body,
    });
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", detail: parsed.error.message });
    }
    const row = storage.create(
      req.auth!.user.id,
      projectId,
      collection,
      parsed.data as Record<string, unknown>,
    );
    res.status(201).json(row);
  });

  app.patch("/api/projects/:projectId/:collection/:id", (req, res) => {
    const { collection, projectId, id } = req.params;
    if (!isCollection(collection))
      return res.status(404).json({ error: "Unknown collection" });
    const parsed = insertSchemas[collection].partial().safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", detail: parsed.error.message });
    }
    const row = storage.update(
      req.auth!.user.id,
      projectId,
      collection,
      id,
      parsed.data as Record<string, unknown>,
    );
    if (!row)
      return res.status(404).json({ error: "Not found in this project" });
    res.json(row);
  });

  app.delete("/api/projects/:projectId/:collection/:id", (req, res) => {
    const { collection, projectId, id } = req.params;
    if (!isCollection(collection))
      return res.status(404).json({ error: "Unknown collection" });
    const ok = storage.remove(req.auth!.user.id, projectId, collection, id);
    if (!ok)
      return res.status(404).json({ error: "Not found in this project" });
    res.status(204).end();
  });

  /* ------------------------------------------------------------------- demo */

  /**
   * Reseed the demo library. Only the development demo account can call this,
   * so a real author can never wipe their own books with it and a real account
   * can never be handed the sample books.
   */
  app.post("/api/reset", requireAuth, (req, res) => {
    if (!isDemoOwner(req.auth?.user)) {
      return res
        .status(403)
        .json({ error: "The demo library is only available in development." });
    }
    res.json({ projects: storage.seedDemoLibrary(req.auth!.user.id) });
  });

  if (!env.isProduction) {
    app.get("/api/dev/config", requireAuth, (_req, res) => {
      res.json({
        rpId: env.rpId,
        origins: env.origins,
        appUrl: env.appUrl,
        demo: env.demoSeed,
      });
    });
  }

  /**
   * Anything under /api that reached this point does not exist — including the
   * development-only routes above when running in production. Answer with JSON
   * rather than letting the SPA fallback return an HTML page with status 200.
   */
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Unknown endpoint" });
  });

  return httpServer;
}
