/**
 * Media routes (Sub-PRD A — upload-only visual reference MVP).
 *
 * Three dedicated endpoints, deliberately separate from the generic
 * collection CRUD:
 *
 *   POST /api/projects/:projectId/attachments/upload
 *     Multipart ingest with a hard byte cap and a raster-only MIME allowlist
 *     (SVG excluded — stored-XSS prevention). The server computes storageKey,
 *     mimeType, size, origin and provenance; the client cannot set them.
 *
 *   POST /api/projects/:projectId/attachments/:id/derive
 *     Stores a client-side gentle edit (crop/rotate/flip/brightness/contrast)
 *     as a NEW attachment whose derivedFromId points at its parent. The
 *     parent's bytes are never touched. A derivative of a real-world
 *     reference stays a real-world reference, so the export exclusion
 *     predicate keeps protecting it.
 *
 *   GET /api/projects/:projectId/attachments/:id/content
 *     Session-gated download of the original bytes with
 *     Content-Disposition: attachment and X-Content-Type-Options: nosniff.
 *
 *   GET /api/projects/:projectId/attachments/:id/thumbnail
 *     The server-generated, re-encoded JPEG thumbnail. Because we produced
 *     these bytes ourselves they may be shown inline in the gallery; nosniff
 *     is still set.
 *
 * Like every content route, these sit behind requireAuth and resolve the
 * owner from the session — an unowned project id is an indistinguishable 404.
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { entityKinds, type Attachment } from "@shared/schema";
import { imageEditOpsSchema } from "@shared/media";
import { env } from "./env";
import { storage } from "./storage";
import {
  acceptableImageBytes,
  editProvenance,
  newStorageKey,
  readMediaBytes,
  removeMediaFiles,
  safeFileName,
  storeMediaBytes,
  thumbnailKey,
  uploadProvenance,
} from "./media";

/** In-memory multipart parsing; bytes are validated before they touch disk. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
});

const uploadFieldsSchema = z.object({
  ownerKind: z.enum(entityKinds),
  ownerId: z.string().min(1).max(120),
  caption: z.string().max(500).default(""),
  altText: z.string().max(500).default(""),
  // Uploads are originals only; "derived" rows come from the derive route.
  role: z.enum(["reference", "real_world_ref"]).default("reference"),
  privateNote: z.string().max(2000).default(""),
});

const deriveFieldsSchema = z.object({
  caption: z.string().max(500).optional(),
  altText: z.string().max(500).optional(),
  edits: z.string().max(4000).default("{}"),
});

/** RFC 5987 filename for Content-Disposition, plus a plain ASCII fallback. */
function contentDisposition(fileName: string): string {
  const safe = safeFileName(fileName);
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

function ownedAttachment(req: Request, res: Response): Attachment | undefined {
  const snapshot = storage.getSnapshot(req.auth!.user.id, req.params.projectId as string);
  if (!snapshot) {
    res.status(404).json({ error: "Unknown project" });
    return undefined;
  }
  const attachment = snapshot.attachments.find((a) => a.id === req.params.id);
  if (!attachment) {
    res.status(404).json({ error: "Not found in this project" });
    return undefined;
  }
  return attachment;
}

/** Multer's size cap surfaces as MulterError; answer with a plain 413. */
function multerErrorHandler(err: unknown, res: Response): boolean {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: `That file is too large. The limit is ${Math.floor(env.maxUploadBytes / (1024 * 1024))} MB per image.`,
      });
    } else {
      res.status(400).json({ error: "The upload could not be read." });
    }
    return true;
  }
  return false;
}

async function ingest(
  req: Request,
  res: Response,
  meta: {
    ownerKind: string;
    ownerId: string;
    caption: string;
    altText: string;
    role: string;
    privateNote: string;
    origin: "uploaded" | "edited";
    derivedFromId?: string;
    provenanceOps?: unknown;
    fileNameOverride?: string;
  },
) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "Attach an image file to upload." });
  }
  const mime = acceptableImageBytes(file.mimetype, file.buffer);
  if (!mime) {
    // Covers SVG and anything HTML-ish: the allowlist excludes them, and the
    // magic-byte sniff catches them even when the declared type lies.
    return res.status(415).json({
      error:
        "That file type cannot be uploaded. PNG, JPEG, WebP, GIF and AVIF images are accepted; SVG is not, because it can carry active content.",
    });
  }

  const fileName = safeFileName(meta.fileNameOverride ?? file.originalname ?? "upload");
  const projectId = req.params.projectId as string;

  // Mint the id first so the storage key can contain it; the key is ours.
  const provisionalId = `at-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const storageKey = newStorageKey(projectId, provisionalId, fileName);

  let stored;
  try {
    stored = await storeMediaBytes(storageKey, file.buffer);
  } catch {
    return res.status(500).json({ error: "The file could not be stored." });
  }

  const now = new Date().toISOString();
  const row = storage.create(req.auth!.user.id, projectId, "attachments", {
    id: provisionalId,
    ownerKind: meta.ownerKind,
    ownerId: meta.ownerId,
    fileName,
    mimeType: mime,
    size: stored.size,
    caption: meta.caption,
    storageKey: stored.storageKey,
    role: meta.role,
    origin: meta.origin,
    derivedFromId: meta.derivedFromId ?? "",
    provenance:
      meta.origin === "edited"
        ? editProvenance(meta.derivedFromId ?? "", meta.provenanceOps ?? {}, stored.sha256)
        : uploadProvenance(fileName, stored.sha256),
    privateNote: meta.privateNote,
    altText: meta.altText,
    createdAt: now,
    updatedAt: now,
    sortIndex: Date.now(),
    batchId: "",
  });
  if (!row) {
    await removeMediaFiles(storageKey);
    return res.status(404).json({ error: "Unknown project" });
  }
  return res.status(201).json(row);
}

export function registerMediaRoutes(app: Express) {
  /* ------------------------------------------------------------- upload */

  app.post(
    "/api/projects/:projectId/attachments/upload",
    (req, res, next) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (err && multerErrorHandler(err, res)) return;
        next(err);
      });
    },
    async (req, res) => {
      if (!storage.owns(req.auth!.user.id, req.params.projectId as string)) {
        return res.status(404).json({ error: "Unknown project" });
      }
      const parsed = uploadFieldsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Invalid upload details", detail: parsed.error.message });
      }
      // A real-world reference is an attachment ROLE, never a links row. The
      // private note only makes sense on that role; ignore it otherwise.
      const fields = parsed.data;
      await ingest(req, res, {
        ...fields,
        privateNote: fields.role === "real_world_ref" ? fields.privateNote : "",
        origin: "uploaded",
      });
    },
  );

  /* -------------------------------------------------------------- derive */

  app.post(
    "/api/projects/:projectId/attachments/:id/derive",
    (req, res, next) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (err && multerErrorHandler(err, res)) return;
        next(err);
      });
    },
    async (req, res) => {
      const parent = ownedAttachment(req, res);
      if (!parent) return;
      if (!parent.storageKey) {
        return res
          .status(400)
          .json({ error: "Only an attachment with stored bytes can be edited." });
      }
      const parsed = deriveFieldsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Invalid edit details", detail: parsed.error.message });
      }
      let ops: unknown = {};
      try {
        ops = imageEditOpsSchema.parse(JSON.parse(parsed.data.edits));
      } catch {
        return res.status(400).json({ error: "The edit description is not valid." });
      }
      await ingest(req, res, {
        ownerKind: parent.ownerKind,
        ownerId: parent.ownerId,
        caption: parsed.data.caption ?? parent.caption,
        altText: parsed.data.altText ?? parent.altText,
        // Privacy inheritance: a derivative of a real-world reference keeps
        // the real_world_ref role so the one-line export predicate
        // (role !== "real_world_ref") can never leak an edited copy.
        role: parent.role === "real_world_ref" ? "real_world_ref" : "derived",
        privateNote: parent.role === "real_world_ref" ? parent.privateNote : "",
        origin: "edited",
        derivedFromId: parent.id,
        provenanceOps: ops,
        fileNameOverride: parent.fileName,
      });
    },
  );

  /* ------------------------------------------------------------- content */

  app.get("/api/projects/:projectId/attachments/:id/content", async (req, res) => {
    const attachment = ownedAttachment(req, res);
    if (!attachment) return;
    if (!attachment.storageKey) {
      return res.status(404).json({ error: "This attachment has no stored file." });
    }
    const bytes = await readMediaBytes(attachment.storageKey);
    if (!bytes) {
      return res.status(404).json({ error: "The stored file is missing." });
    }
    // Served as a download, never inline: the bytes are author-supplied, so
    // nosniff + attachment disposition keep a hostile file from executing in
    // the app's origin even if it somehow passed the upload sniff.
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", bytes.length);
    res.setHeader("Content-Disposition", contentDisposition(attachment.fileName));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.send(bytes);
  });

  /* ----------------------------------------------------------- thumbnail */

  app.get("/api/projects/:projectId/attachments/:id/thumbnail", async (req, res) => {
    const attachment = ownedAttachment(req, res);
    if (!attachment) return;
    if (!attachment.storageKey) {
      return res.status(404).json({ error: "This attachment has no stored file." });
    }
    const bytes = await readMediaBytes(thumbnailKey(attachment.storageKey));
    if (!bytes) {
      return res.status(404).json({ error: "No thumbnail for this attachment." });
    }
    // The thumbnail is re-encoded by the server from validated raster bytes,
    // so inline display is safe; nosniff is set anyway.
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Length", bytes.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(bytes);
  });
}

/**
 * Hook for the generic DELETE route: when an attachment row goes away, its
 * files should too. Exported so server/routes.ts can call it without knowing
 * anything about keys or paths.
 */
export async function cleanupAttachmentFiles(attachment: {
  storageKey?: string;
}): Promise<void> {
  if (attachment.storageKey) await removeMediaFiles(attachment.storageKey);
}
