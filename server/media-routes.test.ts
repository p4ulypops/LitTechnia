// @vitest-environment node
/**
 * Route tests for the media endpoints (Sub-PRD A). The Express app runs
 * in-process against a stubbed storage singleton, so no SQLite file and no
 * auth ceremony are needed. MEDIA_DIR and the upload byte cap are set before
 * any server module loads (vi.hoisted), so the tests are hermetic.
 */
import express from "express";
import type { AddressInfo } from "node:net";
import { rmSync } from "node:fs";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Attachment, ProjectSnapshot } from "@shared/schema";

/* ------------------------------------------- hoisted env + stubbed state */

const state = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const mediaDir = mkdtempSync(path.join(tmpdir(), "littechnia-routes-test-"));
  process.env.MEDIA_DIR = mediaDir;
  // 64 KB: small enough that a noise PNG trips it, big enough for fixtures.
  process.env.MEDIA_MAX_UPLOAD_BYTES = "65536";
  return { mediaDir, rows: [] as Attachment[], n: 0 };
});

function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: "at-1",
    projectId: "proj-1",
    ownerKind: "character",
    ownerId: "ch-1",
    fileName: "maya.png",
    mimeType: "image/png",
    size: 100,
    caption: "",
    storageKey: "proj-1/at-1/maya.png",
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

function snapshotOf(attachments: Attachment[]): ProjectSnapshot {
  return {
    project: {
      id: "proj-1",
      ownerId: "user-1",
      title: "Test",
      subtitle: "",
      author: "",
      genre: "",
      wordTarget: 90000,
      premise: "",
      method: "hybrid",
      format: "Novel",
      archived: 0,
      createdAt: "2026-01-01",
      sortIndex: 0,
    },
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

vi.mock("./storage", () => ({
  storage: {
    owns: () => true,
    getSnapshot: () => snapshotOf(state.rows),
    create: (_owner: string, _project: string, _collection: string, data: Record<string, unknown>) => {
      state.n += 1;
      const row = makeAttachment({
        ...(data as Partial<Attachment>),
        id: (data.id as string) || `at-new-${state.n}`,
      });
      state.rows.push(row);
      return row;
    },
    update: (_o: string, _p: string, _c: string, id: string, patch: Record<string, unknown>) => {
      const row = state.rows.find((r) => r.id === id);
      if (!row) return undefined;
      Object.assign(row, patch);
      return row;
    },
    remove: (_o: string, _p: string, _c: string, id: string) => {
      const before = state.rows.length;
      state.rows = state.rows.filter((r) => r.id !== id);
      return state.rows.length !== before;
    },
  },
}));

/* --------------------------------------------------------------- server */

import { registerMediaRoutes } from "./media-routes";

let baseUrl = "";
let server: import("node:http").Server;

beforeAll(async () => {
  const app = express();
  // In production wiring the media routes sit behind requireAuth; here the
  // auth context is faked so the routes see a signed-in author.
  app.use((req, _res, next) => {
    req.auth = {
      sessionId: "s-1",
      method: "dev",
      user: {
        id: "user-1",
        email: "author@example.com",
        displayName: "Author",
        createdAt: "",
        lastSignInAt: "",
        isDemo: 0,
      },
    };
    next();
  });
  registerMediaRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(state.mediaDir, { recursive: true, force: true });
});

async function pngBytes(width = 40, height = 30): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 120, b: 220 } },
  })
    .png()
    .toBuffer();
}

async function uploadPng(
  fields: Record<string, string> = {},
  fileName = "maya.png",
): Promise<Response> {
  const form = new FormData();
  form.append("file", new Blob([await pngBytes()], { type: "image/png" }), fileName);
  form.append("ownerKind", "character");
  form.append("ownerId", "ch-1");
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return fetch(`${baseUrl}/api/projects/proj-1/attachments/upload`, {
    method: "POST",
    body: form,
  });
}

/* ----------------------------------------------------------------- tests */

describe("POST /api/projects/:projectId/attachments/upload", () => {
  it("accepts a valid raster image and answers 201 with server-set fields", async () => {
    const res = await uploadPng({ caption: "Maya on the quay" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Attachment;
    expect(body.mimeType).toBe("image/png");
    expect(body.size).toBeGreaterThan(0);
    expect(body.storageKey).toContain("proj-1/");
    expect(body.origin).toBe("uploaded");
    expect(body.role).toBe("reference");
    expect(body.caption).toBe("Maya on the quay");
    expect(JSON.parse(body.provenance).kind).toBe("upload");
  });

  it("rejects SVG with 415 even when the client lies about the type", async () => {
    const svg = new Blob(
      ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
      { type: "image/png" }, // mislabelled on purpose
    );
    const form = new FormData();
    form.append("file", svg, "icon.png");
    form.append("ownerKind", "character");
    form.append("ownerId", "ch-1");
    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/upload`, {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(415);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/SVG/i);
  });

  it("rejects a declared image/svg+xml upload", async () => {
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], {
      type: "image/svg+xml",
    });
    const form = new FormData();
    form.append("file", svg, "icon.svg");
    form.append("ownerKind", "scene");
    form.append("ownerId", "sc-1");
    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/upload`, {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(415);
  });

  it("rejects files over the byte cap with 413", async () => {
    // Gaussian noise compresses badly: a 512x512 noise PNG is far over 64 KB.
    const noise = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 3,
        noise: { type: "gaussian", mean: 128, sigma: 40 },
      },
    })
      .png()
      .toBuffer();
    expect(noise.length).toBeGreaterThan(65536);
    const form = new FormData();
    form.append("file", new Blob([noise], { type: "image/png" }), "noise.png");
    form.append("ownerKind", "character");
    form.append("ownerId", "ch-1");
    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/upload`, {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(413);
  });

  it("keeps privateNote only on the real_world_ref role", async () => {
    const res = await uploadPng(
      { role: "real_world_ref", privateNote: "This is actually Priya" },
      "ref.png",
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as Attachment;
    expect(body.role).toBe("real_world_ref");
    expect(body.privateNote).toBe("This is actually Priya");
  });

  it("ignores a privateNote sent with an ordinary reference upload", async () => {
    const res = await uploadPng({ privateNote: "should not stick" }, "plain.png");
    const body = (await res.json()) as Attachment;
    expect(body.role).toBe("reference");
    expect(body.privateNote).toBe("");
  });
});

describe("GET /api/projects/:projectId/attachments/:id/content", () => {
  it("serves the original bytes with attachment disposition and nosniff", async () => {
    const original = await pngBytes();
    const form = new FormData();
    form.append("file", new Blob([original], { type: "image/png" }), "maya.png");
    form.append("ownerKind", "character");
    form.append("ownerId", "ch-1");
    const uploadRes = await fetch(`${baseUrl}/api/projects/proj-1/attachments/upload`, {
      method: "POST",
      body: form,
    });
    const created = (await uploadRes.json()) as Attachment;

    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/${created.id}/content`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain("maya.png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-type")).toBe("image/png");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.equals(original)).toBe(true);
  });

  it("404s for an unknown attachment id", async () => {
    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/at-nope/content`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/projects/:projectId/attachments/:id/thumbnail", () => {
  it("serves a server-generated JPEG thumbnail with nosniff", async () => {
    const form = new FormData();
    form.append("file", new Blob([await pngBytes(500, 300)], { type: "image/png" }), "wide.png");
    form.append("ownerKind", "world");
    form.append("ownerId", "wd-1");
    const uploadRes = await fetch(`${baseUrl}/api/projects/proj-1/attachments/upload`, {
      method: "POST",
      body: form,
    });
    const created = (await uploadRes.json()) as Attachment;
    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/${created.id}/thumbnail`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(384);
  });
});

describe("POST /api/projects/:projectId/attachments/:id/derive", () => {
  it("stores a gentle edit as a NEW derived attachment pointing at its parent", async () => {
    const uploadRes = await uploadPng({}, "original.png");
    const parent = (await uploadRes.json()) as Attachment;

    const derive = new FormData();
    derive.append(
      "file",
      new Blob([await pngBytes(20, 20)], { type: "image/png" }),
      "edited.png",
    );
    derive.append("edits", JSON.stringify({ rotate: 90, brightness: 1.1 }));
    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/${parent.id}/derive`, {
      method: "POST",
      body: derive,
    });
    expect(res.status).toBe(201);
    const child = (await res.json()) as Attachment;
    expect(child.derivedFromId).toBe(parent.id);
    expect(child.origin).toBe("edited");
    expect(child.role).toBe("derived");
    const prov = JSON.parse(child.provenance);
    expect(prov.kind).toBe("edit");
    expect(prov.ops.rotate).toBe(90);
    expect(prov.derivedFromId).toBe(parent.id);
    // The parent row is untouched: originals are preserved.
    expect(state.rows.find((r) => r.id === parent.id)?.derivedFromId).toBe("");
    expect(state.rows.find((r) => r.id === parent.id)?.origin).toBe("uploaded");
  });

  it("keeps real-world-reference privacy on a derived edit", async () => {
    const uploadRes = await uploadPng(
      { role: "real_world_ref", privateNote: "Priya at the harbour" },
      "priya.png",
    );
    const parent = (await uploadRes.json()) as Attachment;
    const derive = new FormData();
    derive.append(
      "file",
      new Blob([await pngBytes(20, 20)], { type: "image/png" }),
      "edited.png",
    );
    derive.append("edits", JSON.stringify({ flipH: true }));
    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/${parent.id}/derive`, {
      method: "POST",
      body: derive,
    });
    const child = (await res.json()) as Attachment;
    expect(child.role).toBe("real_world_ref");
    expect(child.privateNote).toBe("Priya at the harbour");
  });

  it("rejects an invalid edit description", async () => {
    const uploadRes = await uploadPng({}, "parent.png");
    const parent = (await uploadRes.json()) as Attachment;
    const derive = new FormData();
    derive.append(
      "file",
      new Blob([await pngBytes(20, 20)], { type: "image/png" }),
      "edited.png",
    );
    derive.append("edits", "{not json");
    const res = await fetch(`${baseUrl}/api/projects/proj-1/attachments/${parent.id}/derive`, {
      method: "POST",
      body: derive,
    });
    expect(res.status).toBe(400);
  });
});
