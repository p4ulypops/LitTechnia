// @vitest-environment node
/**
 * Unit tests for the media storage policy: byte sniffing, key safety and
 * server-generated thumbnails. These run in a node environment because they
 * exercise sharp and the filesystem.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  acceptableImageBytes,
  editProvenance,
  newStorageKey,
  readMediaBytes,
  removeMediaFiles,
  resolveStoragePath,
  safeFileName,
  sniffImageMime,
  storeMediaBytes,
  thumbnailKey,
  uploadProvenance,
} from "./media";

const mediaDir = mkdtempSync(path.join(tmpdir(), "littechnia-media-test-"));

afterAll(() => {
  rmSync(mediaDir, { recursive: true, force: true });
});

async function pngBuffer(width = 64, height = 48): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 60, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe("sniffImageMime", () => {
  it("detects PNG, JPEG, GIF and WebP from their magic bytes", async () => {
    expect(sniffImageMime(await pngBuffer())).toBe("image/png");
    const jpeg = await sharp(await pngBuffer()).jpeg().toBuffer();
    expect(sniffImageMime(jpeg)).toBe("image/jpeg");
    const gif = await sharp(await pngBuffer()).gif().toBuffer();
    expect(sniffImageMime(gif)).toBe("image/gif");
    const webp = await sharp(await pngBuffer()).webp().toBuffer();
    expect(sniffImageMime(webp)).toBe("image/webp");
  });

  it("returns null for SVG markup, even when it claims to be an image", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(sniffImageMime(svg)).toBeNull();
  });

  it("returns null for HTML documents and plain text", () => {
    expect(sniffImageMime(Buffer.from("<!doctype html><html><body>x</body></html>"))).toBeNull();
    expect(sniffImageMime(Buffer.from("just some text"))).toBeNull();
  });
});

describe("acceptableImageBytes", () => {
  it("accepts bytes whose declared type matches the sniffed type", async () => {
    const png = await pngBuffer();
    expect(acceptableImageBytes("image/png", png)).toBe("image/png");
  });

  it("rejects SVG outright, whatever the declared type", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(acceptableImageBytes("image/svg+xml", svg)).toBeNull();
    // …and an SVG renamed to .png is still caught by the sniff.
    expect(acceptableImageBytes("image/png", svg)).toBeNull();
  });

  it("rejects a declared/actual mismatch", async () => {
    const jpeg = await sharp(await pngBuffer()).jpeg().toBuffer();
    expect(acceptableImageBytes("image/png", jpeg)).toBeNull();
  });
});

describe("storage keys and paths", () => {
  it("sanitises author-supplied file names", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("..\\..\\evil.svg")).toBe("evil.svg");
    expect(safeFileName("my photo (final).png")).toBe("my photo (final).png");
    expect(safeFileName("")).toBe("upload");
  });

  it("builds keys from server-side ids, not client paths", () => {
    const key = newStorageKey("proj-1", "at-9", "../../x.png");
    expect(key).toBe("proj-1/at-9/x.png");
  });

  it("refuses to resolve a key outside the media directory", () => {
    expect(resolveStoragePath("../outside.png", mediaDir)).toBeNull();
    expect(resolveStoragePath("a/../../outside.png", mediaDir)).toBeNull();
    expect(resolveStoragePath("", mediaDir)).toBeNull();
    expect(resolveStoragePath("proj-1/at-1/x.png", mediaDir)).not.toBeNull();
  });
});

describe("storeMediaBytes + thumbnails", () => {
  it("stores the original bytes verbatim and generates a valid thumbnail", async () => {
    const png = await pngBuffer(640, 480);
    const key = newStorageKey("proj-1", "at-thumb", "photo.png");
    const stored = await storeMediaBytes(key, png, mediaDir);

    expect(stored.size).toBe(png.length);
    expect(stored.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.thumbnail).toBe(true);

    // The original comes back byte-for-byte: uploads are never re-encoded.
    const roundTrip = await readMediaBytes(key, mediaDir);
    expect(roundTrip?.equals(png)).toBe(true);

    // The thumbnail is a real, smaller JPEG.
    const thumb = await readMediaBytes(thumbnailKey(key), mediaDir);
    expect(thumb).not.toBeNull();
    const meta = await sharp(thumb!).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(384);
  });

  it("removes original and thumbnail together", async () => {
    const png = await pngBuffer();
    const key = newStorageKey("proj-1", "at-gone", "gone.png");
    await storeMediaBytes(key, png, mediaDir);
    await removeMediaFiles(key, mediaDir);
    expect(await readMediaBytes(key, mediaDir)).toBeNull();
    expect(await readMediaBytes(thumbnailKey(key), mediaDir)).toBeNull();
  });
});

describe("provenance records", () => {
  it("upload provenance records the hash and sanitised name", () => {
    const parsed = JSON.parse(uploadProvenance("../secret.png", "ab".repeat(32)));
    expect(parsed.kind).toBe("upload");
    expect(parsed.originalName).toBe("secret.png");
    expect(parsed.sha256).toBe("ab".repeat(32));
    expect(parsed.at).toBeTruthy();
  });

  it("edit provenance records the parent and the deterministic ops", () => {
    const ops = { rotate: 90, flipH: false, flipV: false, brightness: 1, contrast: 1, crop: null };
    const parsed = JSON.parse(editProvenance("at-parent", ops, "cd".repeat(32)));
    expect(parsed.kind).toBe("edit");
    expect(parsed.derivedFromId).toBe("at-parent");
    expect(parsed.ops.rotate).toBe(90);
    // There is no provider and no model: AI editing is rejected in this build.
    expect(parsed.provider).toBeUndefined();
    expect(parsed.model).toBeUndefined();
  });
});
