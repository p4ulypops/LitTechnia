/**
 * Hosted feed tests (Sub-PRD C, v0.3).
 *
 * Covers the security contract of the first unauthenticated read path in the
 * product: tokens are ≥128-bit and hashed at rest (never stored in
 * plaintext), the public route renders the same XML the shared builders
 * produce (including the committed GUID scheme), revocation is a hard 404,
 * and malformed or unknown tokens are indistinguishable from revoked ones.
 *
 * These tests open the real in-memory SQLite database (DATABASE_PATH
 * ":memory:" comes from the environment vitest runs with; if the runner ever
 * stops setting it, the test boot would create ./data.db — see server/db.ts).
 * Database names are unique per run via a random suffix on the project, so
 * reruns in one process never collide.
 */
import { beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { ensureSchema, sqlite } from "./db";
import { storage } from "./storage";
import {
  createFeed,
  feedUrl,
  findLiveFeedByToken,
  listFeeds,
  mintFeedToken,
  registerPublicFeedRoutes,
  revokeFeed,
} from "./feeds";
import { createUser } from "./auth/accounts";
import { env } from "./env";

const suffix = Math.random().toString(36).slice(2, 8);

let ownerId = "";
let projectId = "";
let server: Server;
let base = "";

function addScene(id: string, overrides: Record<string, unknown> = {}) {
  return storage.create(ownerId, projectId, "scenes", {
    title: `Scene ${id}`,
    content: `Prose of ${id}.`,
    status: "ready",
    draftZero: 0,
    ...overrides,
  });
}

beforeAll(async () => {
  ensureSchema();
  const owner = createUser(`feeds-${suffix}@localhost`, { displayName: "Feed Tester" });
  ownerId = owner.id;
  const book = storage.createProject(ownerId, { title: `Feed Test Book ${suffix}` });
  projectId = book.id;
  addScene("a", { title: "The furnace at low tide" });
  addScene("b", { title: "Private draft zero", status: "ready", draftZero: 1 });
  addScene("c", { title: "Still drafting", status: "drafted" });

  const app = express();
  registerPublicFeedRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

describe("token minting and storage", () => {
  it("mints a 256-bit unguessable URL-safe token", () => {
    const token = mintFeedToken();
    // 32 bytes base64url-encoded = 43 characters, alphabet A-Za-z0-9_-.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mintFeedToken()).not.toBe(token);
  });

  it("stores only the SHA-256 of the token, never the plaintext", () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "metadata_only",
      audienceLabel: "for tests",
    });
    expect(created).toBeDefined();
    const row = sqlite
      .prepare(`SELECT token_hash AS tokenHash FROM feed_definitions WHERE id = ?`)
      .get(created!.feed.id) as { tokenHash: string };
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).not.toBe(created!.token);
    // The plaintext appears nowhere in the table.
    const leaked = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM feed_definitions WHERE token_hash = ?`)
      .get(created!.token) as { n: number };
    expect(leaked.n).toBe(0);
  });

  it("discloses the token and its URL exactly once, at mint time", () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "summary",
      audienceLabel: "",
    })!;
    expect(created.url).toBe(feedUrl(created.token));
    expect(created.url).toBe(`${env.appUrl}/feeds/${created.token}.xml`);
    // The row handed back carries no hash and no token.
    expect(created.feed).not.toHaveProperty("tokenHash");
    // ...and neither does the management list.
    const listed = listFeeds(ownerId, projectId)!;
    for (const feed of listed) expect(feed).not.toHaveProperty("tokenHash");
    // And there is no API to recover a token for an existing row.
    const found = listed.find((f) => f.id === created.feed.id)!;
    expect(JSON.stringify(found)).not.toContain(created.token);
  });

  it("refuses to create, list or revoke feeds for a project the owner does not own", () => {
    expect(createFeed("someone-else", projectId, {
      feedType: "manuscript",
      detailLevel: "full",
      audienceLabel: "",
    })).toBeUndefined();
    expect(listFeeds("someone-else", projectId)).toBeUndefined();
    const mine = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "full",
      audienceLabel: "",
    })!;
    expect(revokeFeed("someone-else", projectId, mine.feed.id)).toBeUndefined();
    expect(revokeFeed(ownerId, "not-my-project", mine.feed.id)).toBeUndefined();
  });
});

describe("live feed lookup", () => {
  it("resolves a live token to the project, scenes and owner display name", () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "full",
      audienceLabel: "",
    })!;
    const live = findLiveFeedByToken(created.token)!;
    expect(live.project.id).toBe(projectId);
    expect(live.accountDisplayName).toBe("Feed Tester");
    expect(live.scenes.length).toBeGreaterThanOrEqual(3);
  });

  it("unknown, disabled and revoked tokens are indistinguishable", () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "full",
      audienceLabel: "",
    })!;
    expect(findLiveFeedByToken("not-a-real-token-not-a-real-token-12345678")).toBeUndefined();
    revokeFeed(ownerId, projectId, created.feed.id);
    expect(findLiveFeedByToken(created.token)).toBeUndefined();
  });
});

describe("GET /feeds/:token.xml (public, unauthenticated)", () => {
  async function get(path: string, headers: Record<string, string> = {}) {
    const res = await fetch(`${base}${path}`, { headers });
    const body = await res.text();
    return { status: res.status, body, headers: res.headers };
  }

  it("serves RSS 2.0 of ready scenes only, with the committed GUIDs, no session needed", async () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "full",
      audienceLabel: "",
    })!;
    const res = await get(`/feeds/${created.token}.xml`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/rss\+xml/);
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.body).toContain('<rss version="2.0"');
    expect(res.body).toContain("The furnace at low tide");
    // Draft-zero and unfinished scenes never appear, whatever the detail level.
    expect(res.body).not.toContain("Private draft zero");
    expect(res.body).not.toContain("Still drafting");
    // GUID scheme byte-for-byte, with the real project and scene ids.
    const guidRe = new RegExp(
      `<guid isPermaLink="false">urn:littechnia:scene:${projectId}:[^<]+</guid>`,
    );
    expect(res.body).toMatch(guidRe);
    // RSS carries the W3C-recommended self link pointing at the feed itself.
    expect(res.body).toContain(`<atom:link rel="self" type="application/rss+xml" href="${feedUrl(created.token)}"`);
  });

  it("serves Atom 1.0 with feed-level author and link rel=self when negotiated", async () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "summary",
      audienceLabel: "",
    })!;
    const res = await get(`/feeds/${created.token}.xml?format=atom`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/atom\+xml/);
    expect(res.body).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(res.body).toContain("<name>Feed Tester</name>");
    expect(res.body).toContain(`<link rel="self" type="application/atom+xml" href="${feedUrl(created.token)}"`);
    expect(res.body).toContain(`<id>urn:littechnia:project:${projectId}</id>`);
  });

  it("honours an Atom-preferring Accept header", async () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "metadata_only",
      audienceLabel: "",
    })!;
    const res = await get(`/feeds/${created.token}.xml`, {
      Accept: "application/atom+xml",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/atom\+xml/);
  });

  it("metadata_only feeds carry no prose whatsoever", async () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "metadata_only",
      audienceLabel: "",
    })!;
    const res = await get(`/feeds/${created.token}.xml`);
    expect(res.status).toBe(200);
    expect(res.body).toContain("The furnace at low tide");
    expect(res.body).not.toContain("Prose of");
    // The channel keeps its own description; the ITEM must not carry one.
    const item = res.body.slice(res.body.indexOf("<item>"), res.body.indexOf("</item>"));
    expect(item).not.toContain("<description>");
  });

  it("revocation is a hard 404, immediately, not a UI hide", async () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "full",
      audienceLabel: "",
    })!;
    const before = await get(`/feeds/${created.token}.xml`);
    expect(before.status).toBe(200);
    const revoked = revokeFeed(ownerId, projectId, created.feed.id)!;
    expect(revoked.revokedAt).not.toBe("");
    const after = await get(`/feeds/${created.token}.xml`);
    expect(after.status).toBe(404);
    // An Atom-negotiated request 404s too — revocation is total.
    const afterAtom = await get(`/feeds/${created.token}.xml?format=atom`);
    expect(afterAtom.status).toBe(404);
  });

  it("revoking twice is safe and stays revoked", async () => {
    const created = createFeed(ownerId, projectId, {
      feedType: "manuscript",
      detailLevel: "full",
      audienceLabel: "",
    })!;
    const first = revokeFeed(ownerId, projectId, created.feed.id)!;
    const second = revokeFeed(ownerId, projectId, created.feed.id)!;
    expect(second.revokedAt).toBe(first.revokedAt);
    const res = await get(`/feeds/${created.token}.xml`);
    expect(res.status).toBe(404);
  });

  it("unknown and malformed tokens get the same indistinguishable 404", async () => {
    expect((await get(`/feeds/${"A".repeat(43)}.xml`)).status).toBe(404);
    expect((await get(`/feeds/short.xml`)).status).toBe(404);
    expect((await get(`/feeds/..%2F..%2Fetc.xml`)).status).toBe(404);
  });
});
