/**
 * Media storage (Sub-PRD A — upload-only visual reference MVP).
 *
 * The trust rules live here, not in the routes:
 *   - `storageKey`, `mimeType` and `size` are computed by the server from the
 *     actual bytes received. A client can suggest a file name; it can never
 *     choose where bytes live or claim a type the bytes do not back up.
 *   - The MIME allowlist EXCLUDES `image/svg+xml` (and anything HTML-ish):
 *     SVG is markup that can carry script, so serving it back would be a
 *     stored-XSS vector. Uploaded bytes are additionally sniffed against
 *     raster magic numbers, so an SVG renamed to `.png` is still rejected.
 *   - `provenance` is written here and nowhere else — it is a trust claim.
 *
 * Originals are preserved byte-for-byte. Gentle edits (crop, rotate, flip,
 * brightness/contrast) happen client-side and are uploaded as NEW derived
 * attachments; the server never rewrites an original's bytes.
 */
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile, readFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  THUMBNAIL_MAX_EDGE,
  isUploadMimeAllowed,
  type UploadMime,
} from "@shared/media";
import { env } from "./env";

/* ----------------------------------------------------------- byte sniffing */

/**
 * Raster magic numbers for every type in the upload allowlist. Returns the
 * sniffed MIME type, or null when the bytes are not a raster image we accept
 * (which is how an SVG or HTML document is caught even when the client
 * declares `image/png`).
 */
export function sniffImageMime(bytes: Buffer): UploadMime | null {
  if (bytes.length >= 8) {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    ) {
      return "image/png";
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }
    // GIF: "GIF87a" | "GIF89a"
    const gif = bytes.subarray(0, 6).toString("ascii");
    if (gif === "GIF87a" || gif === "GIF89a") {
      return "image/gif";
    }
  }
  if (bytes.length >= 12) {
    // WebP: "RIFF" .... "WEBP"
    if (
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "image/webp";
    }
    // AVIF: .... "ftyp" with an avif/avis brand
    if (bytes.subarray(4, 8).toString("ascii") === "ftyp") {
      const brand = bytes.subarray(8, 12).toString("ascii");
      if (brand === "avif" || brand === "avis") {
        return "image/avif";
      }
    }
  }
  return null;
}

/**
 * Validate an upload's bytes against the allowlist. The declared type and the
 * sniffed type must agree, so a mislabelled file cannot slip through.
 */
export function acceptableImageBytes(declaredMime: string, bytes: Buffer): UploadMime | null {
  if (!isUploadMimeAllowed(declaredMime)) return null;
  const sniffed = sniffImageMime(bytes);
  return sniffed === declaredMime.trim().toLowerCase() ? sniffed : null;
}

/* --------------------------------------------------------------- key/paths */

/**
 * An author-supplied file name reduced to something safe to place inside a
 * storage key: no path separators, no leading dots, no control characters.
 */
export function safeFileName(name: string): string {
  // Treat both POSIX and Windows separators as path boundaries before
  // sanitising, so "..\..\evil.svg" cannot smuggle a traversal segment.
  const segments = (name ?? "").split(/[\\/]+/).filter(Boolean);
  const base = (segments[segments.length - 1] ?? "").replace(/[\x00-\x1f<>:"|?*\\]/g, "_");
  const cleaned = base.replace(/^\.+/, "").slice(0, 120);
  return cleaned || "upload";
}

/**
 * Server-computed opaque key: "where the bytes are". Built from ids the
 * server minted plus a sanitised name — never from a client-supplied path.
 */
export function newStorageKey(projectId: string, attachmentId: string, fileName: string): string {
  return `${projectId}/${attachmentId}/${safeFileName(fileName)}`;
}

/** The thumbnail for a storage key lives alongside it under a fixed suffix. */
export function thumbnailKey(storageKey: string): string {
  return `${storageKey}.thumb.jpg`;
}

/**
 * Resolve a storage key to an absolute path inside the media directory,
 * refusing anything that would escape it. This is the path-traversal guard:
 * keys are server-minted, but defence in depth costs one check.
 */
export function resolveStoragePath(storageKey: string, mediaDir: string = env.mediaDir): string | null {
  if (!storageKey || storageKey.includes("\0")) return null;
  const root = path.resolve(mediaDir);
  const full = path.resolve(root, storageKey);
  if (full !== root && full.startsWith(root + path.sep)) return full;
  return null;
}

/* ------------------------------------------------------------ file writing */

export type StoredMedia = {
  storageKey: string;
  size: number;
  sha256: string;
  /** True when the thumbnail file was written successfully. */
  thumbnail: boolean;
};

/**
 * Persist an upload's original bytes verbatim, then derive a thumbnail.
 * The thumbnail is a freshly re-encoded JPEG produced by us, which is why the
 * thumbnail route may serve it inline while the original is served as an
 * attachment download.
 */
export async function storeMediaBytes(
  storageKey: string,
  bytes: Buffer,
  mediaDir: string = env.mediaDir,
): Promise<StoredMedia> {
  const full = resolveStoragePath(storageKey, mediaDir);
  if (!full) throw new Error("Refusing to write outside the media directory");
  mkdirSync(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  const thumbnail = await writeThumbnail(storageKey, bytes, mediaDir);
  return {
    storageKey,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    thumbnail,
  };
}

/**
 * Server-generated thumbnail: bounded on the longest edge, rotated according
 * to any EXIF orientation, and re-encoded as JPEG. Returns false (rather than
 * throwing) when the bytes cannot be decoded — the original upload is still
 * valid, it just has no preview.
 */
export async function writeThumbnail(
  storageKey: string,
  bytes: Buffer,
  mediaDir: string = env.mediaDir,
): Promise<boolean> {
  const full = resolveStoragePath(thumbnailKey(storageKey), mediaDir);
  if (!full) return false;
  try {
    const out = await sharp(bytes)
      .rotate() // honour EXIF orientation, then strip it by re-encoding
      .resize({
        width: THUMBNAIL_MAX_EDGE,
        height: THUMBNAIL_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
    mkdirSync(path.dirname(full), { recursive: true });
    await writeFile(full, out);
    return true;
  } catch {
    return false;
  }
}

/** Read stored bytes back, or null when the key is unknown/unsafe/missing. */
export async function readMediaBytes(
  storageKey: string,
  mediaDir: string = env.mediaDir,
): Promise<Buffer | null> {
  const full = resolveStoragePath(storageKey, mediaDir);
  if (!full) return null;
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}

export async function mediaFileExists(
  storageKey: string,
  mediaDir: string = env.mediaDir,
): Promise<boolean> {
  const full = resolveStoragePath(storageKey, mediaDir);
  if (!full) return false;
  try {
    await stat(full);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove an attachment's files (original + thumbnail). Called when the
 * attachment row is deleted so disk state does not drift from the database.
 */
export async function removeMediaFiles(
  storageKey: string,
  mediaDir: string = env.mediaDir,
): Promise<void> {
  for (const key of [storageKey, thumbnailKey(storageKey)]) {
    const full = resolveStoragePath(key, mediaDir);
    if (!full) continue;
    await unlink(full).catch(() => undefined);
  }
}

/* -------------------------------------------------------------- provenance */

/**
 * The provenance record for an original upload. Written by the server at
 * ingest time; clients can neither set nor edit this field.
 */
export function uploadProvenance(fileName: string, sha256: string): string {
  return JSON.stringify({
    kind: "upload",
    originalName: safeFileName(fileName),
    sha256,
    at: new Date().toISOString(),
  });
}

/**
 * The provenance record for a gentle edit: which attachment it came from,
 * which deterministic ops were applied, and the hash of the result. There is
 * no provider and no model — AI editing is rejected in this build.
 */
export function editProvenance(
  parentId: string,
  ops: unknown,
  sha256: string,
): string {
  return JSON.stringify({
    kind: "edit",
    derivedFromId: parentId,
    ops,
    sha256,
    at: new Date().toISOString(),
  });
}
