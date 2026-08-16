import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMAGE_EDIT_OPS,
  UPLOAD_MIME_ALLOWLIST,
  editedDimensions,
  exportableAttachments,
  isExportableAttachment,
  isIdentityEdit,
  isUploadMimeAllowed,
  toExportAttachment,
} from "./media";

describe("upload MIME allowlist", () => {
  it("accepts the raster image types", () => {
    for (const mime of ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]) {
      expect(isUploadMimeAllowed(mime)).toBe(true);
    }
  });

  it("excludes SVG — a markup format that can carry active content", () => {
    expect(isUploadMimeAllowed("image/svg+xml")).toBe(false);
    expect(UPLOAD_MIME_ALLOWLIST).not.toContain("image/svg+xml");
  });

  it("excludes anything HTML-ish, images or not", () => {
    for (const mime of ["text/html", "application/xhtml+xml", "image/svg", "text/xml"]) {
      expect(isUploadMimeAllowed(mime)).toBe(false);
    }
  });

  it("normalises case and surrounding whitespace", () => {
    expect(isUploadMimeAllowed(" Image/PNG ")).toBe(true);
  });
});

describe("export exclusion predicate", () => {
  it("excludes real-world references with a one-line predicate on role", () => {
    expect(isExportableAttachment({ role: "real_world_ref" } as never)).toBe(false);
    expect(isExportableAttachment({ role: "reference" } as never)).toBe(true);
    expect(isExportableAttachment({ role: "derived" } as never)).toBe(true);
  });

  it("blanks privateNote on every exported attachment, even surviving ones", () => {
    const out = toExportAttachment({ role: "reference", privateNote: "my neighbour" });
    expect(out.privateNote).toBe("");
  });

  it("strips real-world refs AND every private note together", () => {
    const rows = exportableAttachments([
      { id: "a1", role: "reference", privateNote: "" },
      { id: "a2", role: "real_world_ref", privateNote: "this is actually Priya" },
      { id: "a3", role: "derived", privateNote: "leftover" },
    ] as never);
    expect(rows.map((r) => (r as { id: string }).id)).toEqual(["a1", "a3"]);
    expect(rows.every((r) => r.privateNote === "")).toBe(true);
  });
});

describe("gentle-edit geometry", () => {
  it("identity ops keep the source dimensions", () => {
    expect(editedDimensions(800, 600, { crop: null, rotate: 0 })).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("quarter turns swap the axes", () => {
    expect(editedDimensions(800, 600, { crop: null, rotate: 90 })).toEqual({
      width: 600,
      height: 800,
    });
    expect(editedDimensions(800, 600, { crop: null, rotate: 270 })).toEqual({
      width: 600,
      height: 800,
    });
    expect(editedDimensions(800, 600, { crop: null, rotate: 180 })).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("crop applies to the rotated image", () => {
    expect(
      editedDimensions(800, 600, { crop: { x: 0, y: 0, width: 0.5, height: 0.5 }, rotate: 90 }),
    ).toEqual({ width: 300, height: 400 });
  });

  it("recognises the identity edit (saving it would be a no-op copy)", () => {
    expect(isIdentityEdit({ ...DEFAULT_IMAGE_EDIT_OPS })).toBe(true);
    expect(isIdentityEdit({ ...DEFAULT_IMAGE_EDIT_OPS, rotate: 90 })).toBe(false);
    expect(isIdentityEdit({ ...DEFAULT_IMAGE_EDIT_OPS, brightness: 1.2 })).toBe(false);
    expect(
      isIdentityEdit({ ...DEFAULT_IMAGE_EDIT_OPS, crop: { x: 0, y: 0, width: 0.5, height: 0.5 } }),
    ).toBe(false);
  });
});
