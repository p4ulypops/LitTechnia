/**
 * Client-side gentle edits (Sub-PRD A).
 *
 * Deterministic canvas transforms only: crop, quarter-turn rotation, flip and
 * brightness/contrast. No pixel synthesis, no generative fill, no provider
 * calls — the result is uploaded as a NEW derived attachment and the original
 * is preserved byte-for-byte on the server.
 *
 * The ops shape and the output-dimension geometry live in shared/media.ts so
 * the server records exactly what the client applied.
 */
import {
  editedDimensions,
  type ImageEditOps,
} from "@shared/media";

export type EditableSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

/**
 * Apply the edit ops to a source image and return the resulting canvas.
 *
 * Order of operations is fixed (rotate/flip → crop → brightness/contrast) so
 * the same ops always produce the same pixels: the edit is a deterministic
 * function of (source, ops), which is what makes the provenance record
 * meaningful. The crop rectangle is a fraction of the rotated image, so it
 * maps one-to-one onto the editor's on-screen preview.
 */
export function applyImageEdits(source: EditableSource, ops: ImageEditOps): HTMLCanvasElement {
  const sourceWidth = "naturalWidth" in source ? source.naturalWidth : source.width;
  const sourceHeight = "naturalHeight" in source ? source.naturalHeight : source.height;

  const quarter = ((ops.rotate % 360) + 360) % 360;
  const rotatedW = quarter === 90 || quarter === 270 ? sourceHeight : sourceWidth;
  const rotatedH = quarter === 90 || quarter === 270 ? sourceWidth : sourceHeight;

  // Stage 1: rotate + flip the full source.
  const stage = document.createElement("canvas");
  stage.width = rotatedW;
  stage.height = rotatedH;
  const sctx = stage.getContext("2d");
  if (!sctx) throw new Error("Canvas 2D is not available in this browser");
  sctx.save();
  sctx.translate(rotatedW / 2, rotatedH / 2);
  sctx.rotate((ops.rotate * Math.PI) / 180);
  sctx.scale(ops.flipH ? -1 : 1, ops.flipV ? -1 : 1);
  sctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  sctx.restore();

  // Stage 2: crop (fractions of the rotated image) + brightness/contrast.
  const crop = ops.crop;
  const sx = crop ? Math.round(rotatedW * crop.x) : 0;
  const sy = crop ? Math.round(rotatedH * crop.y) : 0;
  const sw = crop ? Math.max(1, Math.round(rotatedW * crop.width)) : rotatedW;
  const sh = crop ? Math.max(1, Math.round(rotatedH * crop.height)) : rotatedH;

  const { width, height } = editedDimensions(sourceWidth, sourceHeight, ops);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available in this browser");
  const filters: string[] = [];
  if (ops.brightness !== 1) filters.push(`brightness(${ops.brightness})`);
  if (ops.contrast !== 1) filters.push(`contrast(${ops.contrast})`);
  ctx.filter = filters.length ? filters.join(" ") : "none";
  ctx.drawImage(stage, sx, sy, sw, sh, 0, 0, width, height);

  return canvas;
}

/** Encode a canvas as a Blob. JPEG by default: edits are photos, not UI art. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the edited image"))),
      type,
      quality,
    );
  });
}

/** Load an attachment's original bytes into an image element for editing. */
export async function loadEditableImage(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Could not load the image (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The stored file is not a readable image"));
      img.src = objectUrl;
    });
  } finally {
    // The image element holds its own decoded copy once loaded.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }
}
