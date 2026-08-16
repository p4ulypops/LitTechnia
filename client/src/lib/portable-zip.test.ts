/**
 * Tests for the portable .zip export (Sub-PRD A): the bundle carries the
 * documented JSON snapshot plus the original bytes of exportable attachments
 * only. Real-world references and private notes never leave the app.
 */
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { Attachment, Project, ProjectSnapshot } from "@shared/schema";
import {
  buildPortableZip,
  collectPortableFiles,
  portableFileAttachments,
} from "./portable-zip";

function mediaAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: "at-1",
    projectId: "proj-1",
    ownerKind: "character",
    ownerId: "ch-1",
    fileName: "photo.png",
    mimeType: "image/png",
    size: 3,
    caption: "",
    storageKey: "proj-1/at-1/photo.png",
    role: "reference",
    origin: "uploaded",
    derivedFromId: "",
    provenance: "{}",
    privateNote: "",
    altText: "",
    createdAt: "2026-08-01T10:00:00.000Z",
    sortIndex: 1,
    batchId: "",
    updatedAt: "",
    ...overrides,
  };
}

function snapshotWith(attachments: Attachment[]): ProjectSnapshot {
  const project: Project = {
    id: "proj-1",
    ownerId: "owner-1",
    title: "The Glass Meridian",
    subtitle: "",
    author: "Test Author",
    genre: "Fantasy",
    wordTarget: 90000,
    premise: "",
    method: "hybrid",
    format: "Novel",
    archived: 0,
    createdAt: "2026-01-01",
    sortIndex: 0,
  };
  return {
    project,
    scenes: [],
    characters: [],
    plots: [],
    events: [],
    world: [],
    notes: [],
    links: [],
    attachments,
    checklist: [],
    aliases: [],
    comments: [],
    captureItems: [],
  };
}

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

describe("collectPortableFiles", () => {
  it("collects bytes for exportable attachments only", async () => {
    const snap = snapshotWith([
      mediaAttachment({ id: "at-keep", role: "reference" }),
      mediaAttachment({ id: "at-private", role: "real_world_ref", fileName: "priya.png" }),
    ]);
    const files = await collectPortableFiles(snap, async () => pngBytes);
    expect([...files.keys()]).toEqual(["at-keep"]);
    expect(files.get("at-keep")).toEqual(pngBytes);
  });

  it("skips attachments whose bytes are unavailable", async () => {
    const snap = snapshotWith([
      mediaAttachment({ id: "at-ok" }),
      mediaAttachment({ id: "at-missing" }),
    ]);
    const files = await collectPortableFiles(snap, async (a) =>
      a.id === "at-ok" ? pngBytes : null,
    );
    expect([...files.keys()]).toEqual(["at-ok"]);
  });
});

describe("buildPortableZip", () => {
  it("bundles project.json plus files/<id>/<name> for exportable attachments", async () => {
    const snap = snapshotWith([
      mediaAttachment({ id: "at-keep", role: "reference", fileName: "maya.png" }),
      mediaAttachment({
        id: "at-private",
        role: "real_world_ref",
        fileName: "priya.png",
        privateNote: "this is actually Priya",
      }),
    ]);
    const files = new Map<string, Uint8Array>([
      ["at-keep", pngBytes],
      // Even if bytes for a private attachment somehow arrive, the builder
      // must drop them — the export predicate is the last line of defence.
      ["at-private", pngBytes],
    ]);
    const zipBytes = await buildPortableZip(snap, files);
    const zip = await JSZip.loadAsync(zipBytes);
    const names = Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => f.name)
      .sort();
    expect(names).toEqual(["files/at-keep/maya.png", "project.json"]);

    const json = JSON.parse(await zip.file("project.json")!.async("string"));
    const ids = json.attachments.map((a: { id: string }) => a.id);
    expect(ids).toEqual(["at-keep"]);
    expect(JSON.stringify(json)).not.toContain("this is actually Priya");

    const stored = await zip.file("files/at-keep/maya.png")!.async("uint8array");
    expect(Array.from(stored)).toEqual(Array.from(pngBytes));
  });

  it("produces a project.json-only bundle when nothing is exportable", async () => {
    const snap = snapshotWith([
      mediaAttachment({ id: "at-private", role: "real_world_ref" }),
    ]);
    const zipBytes = await buildPortableZip(snap, new Map());
    const zip = await JSZip.loadAsync(zipBytes);
    expect(Object.values(zip.files).filter((f) => !f.dir).map((f) => f.name)).toEqual([
      "project.json",
    ]);
    expect(JSON.parse(await zip.file("project.json")!.async("string")).attachments).toEqual([]);
  });
});

describe("portableFileAttachments", () => {
  it("lists only exportable attachments that have stored bytes", () => {
    const snap = snapshotWith([
      mediaAttachment({ id: "a", role: "reference" }),
      mediaAttachment({ id: "b", role: "real_world_ref" }),
      mediaAttachment({ id: "c", role: "derived", storageKey: "" }),
    ]);
    expect(portableFileAttachments(snap).map((a) => a.id)).toEqual(["a"]);
  });
});
