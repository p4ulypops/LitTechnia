/**
 * Shared media contract (Sub-PRD A — upload-only visual reference MVP).
 *
 * This module is imported by both the Express server and the React client so
 * the upload allowlist, the export exclusion predicate and the edit-operation
 * shape can never drift apart. There is deliberately no AI generation here:
 * every attachment origin is "uploaded" or "edited".
 */
import { z } from "zod";
import type { Attachment } from "./schema";

/* ------------------------------------------------------------ MIME policy */

/**
 * Raster image types an author may upload. `image/svg+xml` is deliberately
 * EXCLUDED: SVG is a markup format that can carry script, and serving it back
 * would be a stored-XSS vector. Anything HTML-ish (`text/html`,
 * `application/xhtml+xml`, …) is likewise not an image and not allowed.
 */
export const UPLOAD_MIME_ALLOWLIST = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;
export type UploadMime = (typeof UPLOAD_MIME_ALLOWLIST)[number];

export function isUploadMimeAllowed(mime: string): mime is UploadMime {
  return (UPLOAD_MIME_ALLOWLIST as readonly string[]).includes(
    (mime ?? "").trim().toLowerCase(),
  );
}

/** Default hard cap on one upload. The server may lower it via env. */
export const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

/** Longest edge of the server-generated thumbnail, in pixels. */
export const THUMBNAIL_MAX_EDGE = 384;

/* ------------------------------------------------------------------ roles */

export const attachmentRoles = ["reference", "real_world_ref", "derived"] as const;
export type AttachmentRole = (typeof attachmentRoles)[number];

/**
 * The export exclusion rule, as a one-line predicate: real-world-reference
 * photos (pictures of real people/places the author knows) are private to the
 * author's workspace and never leave it through an export. Everything else is
 * exportable. Used identically by the JSON snapshot exporters and the
 * portable zip export.
 */
export const isExportableAttachment = (attachment: Pick<Attachment, "role">) =>
  attachment.role !== "real_world_ref";

/**
 * The export shape of one attachment row: `privateNote` is a private field by
 * design (see shared/schema.ts) and is blanked on the way out, even for rows
 * that survive the role filter.
 */
export function toExportAttachment<T extends Pick<Attachment, "privateNote">>(
  attachment: T,
): T {
  return { ...attachment, privateNote: "" };
}

/** Attachments as they appear in every export: filtered, then de-privated. */
export function exportableAttachments<T extends Pick<Attachment, "role" | "privateNote">>(
  attachments: T[],
): T[] {
  return attachments.filter(isExportableAttachment).map(toExportAttachment);
}

/* ------------------------------------------------------------- edit operations */

/**
 * The deterministic, client-side "gentle edits". No pixel synthesis, no
 * generative fill, no provider calls — crop, quarter-turn rotation, flip and
 * brightness/contrast only. The same ops are recorded server-side in the
 * derived attachment's provenance so "what produced this" stays answerable.
 *
 * Order of operations is fixed — rotate/flip, then crop, then
 * brightness/contrast — so the same ops always produce the same pixels.
 * `crop` is expressed as fractions of the ROTATED image (0..1), which keeps
 * it resolution-independent and lets a crop rectangle map directly onto the
 * displayed preview.
 */
export const imageEditOpsSchema = z.object({
  crop: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(0.01).max(1),
      height: z.number().min(0.01).max(1),
    })
    .nullable()
    .default(null),
  rotate: z
    .union([
      z.literal(0),
      z.literal(90),
      z.literal(180),
      z.literal(270),
    ])
    .default(0),
  flipH: z.boolean().default(false),
  flipV: z.boolean().default(false),
  /** 1 = unchanged. Range keeps edits "gentle" rather than transformative. */
  brightness: z.number().min(0.2).max(2).default(1),
  contrast: z.number().min(0.2).max(2).default(1),
});
export type ImageEditOps = z.infer<typeof imageEditOpsSchema>;

export const DEFAULT_IMAGE_EDIT_OPS: ImageEditOps = {
  crop: null,
  rotate: 0,
  flipH: false,
  flipV: false,
  brightness: 1,
  contrast: 1,
};

/** True when the ops describe no change at all (saving would be a no-op copy). */
export function isIdentityEdit(ops: ImageEditOps): boolean {
  return (
    ops.crop === null &&
    ops.rotate === 0 &&
    !ops.flipH &&
    !ops.flipV &&
    ops.brightness === 1 &&
    ops.contrast === 1
  );
}

/**
 * Output pixel dimensions after rotation and crop, given source dimensions.
 * Pure geometry — shared by the canvas editor (for canvas sizing) and tests.
 * Rotation swaps the axes on quarter turns; the crop then applies to the
 * rotated image.
 */
export function editedDimensions(
  sourceWidth: number,
  sourceHeight: number,
  ops: Pick<ImageEditOps, "crop" | "rotate">,
): { width: number; height: number } {
  const quarter = ((ops.rotate % 360) + 360) % 360;
  const rotatedW = quarter === 90 || quarter === 270 ? sourceHeight : sourceWidth;
  const rotatedH = quarter === 90 || quarter === 270 ? sourceWidth : sourceHeight;
  const crop = ops.crop;
  if (!crop) return { width: rotatedW, height: rotatedH };
  return {
    width: Math.max(1, Math.round(rotatedW * crop.width)),
    height: Math.max(1, Math.round(rotatedH * crop.height)),
  };
}
