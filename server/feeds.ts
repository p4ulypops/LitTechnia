/**
 * Hosted feeds (Sub-PRD C, v0.3) — the product's first unauthenticated read
 * path.
 *
 * A hosted feed is a `feedDefinitions` row plus a server-minted token. The
 * token IS the authorisation for the public route: it is a 256-bit random
 * value, only its SHA-256 is stored (`tokenHash`, never the plaintext), and
 * the plaintext is disclosed exactly once, at mint time. Whoever holds the
 * URL can read the feed; revoking the feed makes the URL a hard 404, not a
 * UI hide.
 *
 * Two route groups are registered from server/routes.ts:
 *
 *   registerPublicFeedRoutes   GET /feeds/:token.xml — outside /api/projects
 *                              (which is blanket-requireAuth), registered
 *                              before serveStatic's catch-all, with its own
 *                              rate limit and cache headers.
 *
 *   registerFeedManagementRoutes — the authenticated API the Connections
 *                              page uses: list / create / revoke. These rely
 *                              on the requireAuth wall routes.ts applies to
 *                              /api/projects before calling this, and every
 *                              query is still owner-scoped here.
 *
 * Rendering reuses @shared/feeds, the same module the browser download uses,
 * so GUIDs and structure are identical between the two paths.
 */
import { createHash, randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import {
  buildAtom,
  buildRss,
  manuscriptFeedSource,
  type FeedSource,
} from "@shared/feeds";
import {
  createFeedSchema,
  type FeedDefinition,
  type FeedDetailLevel,
  type Project,
  type PublicFeedDefinition,
  type Scene,
} from "@shared/schema";
import { sqlite } from "./db";
import { env } from "./env";
import { limit } from "./auth/rate-limit";
import { storage } from "./storage";

const nowIso = () => new Date().toISOString();

/** Express 5 types param values as string | string[] (wildcard routes);
 *  every route here binds a single named segment, so collapse the type. */
const param = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** 256 bits, base64url — unguessable, URL-safe, no padding. */
export function mintFeedToken(): string {
  return randomBytes(32).toString("base64url");
}

export function feedUrl(token: string): string {
  return `${env.appUrl}/feeds/${token}.xml`;
}

/* --------------------------------------------------------------- storage */

const FEED_COLS = `id, project_id AS projectId, feed_type AS feedType,
  detail_level AS detailLevel, audience_label AS audienceLabel,
  token_hash AS tokenHash, enabled, created_at AS createdAt,
  last_built_at AS lastBuiltAt, revoked_at AS revokedAt`;

function feedRow(id: string): FeedDefinition | undefined {
  return sqlite
    .prepare(`SELECT ${FEED_COLS} FROM feed_definitions WHERE id = ?`)
    .get(id) as FeedDefinition | undefined;
}

/** tokenHash is the server's secret-derivative; it never crosses the API. */
function toPublic(feed: FeedDefinition): PublicFeedDefinition {
  const { tokenHash: _tokenHash, ...rest } = feed;
  return rest;
}

/** Every feed of one owned book, live and revoked alike, oldest first. */
export function listFeeds(ownerId: string, projectId: string): PublicFeedDefinition[] | undefined {
  if (!storage.owns(ownerId, projectId)) return undefined;
  const rows = sqlite
    .prepare(
      `SELECT ${FEED_COLS} FROM feed_definitions WHERE project_id = ? ORDER BY created_at ASC, id ASC`,
    )
    .all(projectId) as FeedDefinition[];
  return rows.map(toPublic);
}

/**
 * Mint a feed for one owned book. Returns the row plus the plaintext token —
 * the ONLY time the token exists outside the subscriber's URL. The row is
 * created enabled: clicking "create" is the explicit opt-in.
 */
export function createFeed(
  ownerId: string,
  projectId: string,
  input: { feedType: "manuscript"; detailLevel: FeedDetailLevel; audienceLabel: string },
): { feed: PublicFeedDefinition; token: string; url: string } | undefined {
  if (!storage.owns(ownerId, projectId)) return undefined;
  const id = `fd-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const token = mintFeedToken();
  sqlite
    .prepare(
      `INSERT INTO feed_definitions
         (id, project_id, feed_type, detail_level, audience_label, token_hash, enabled, created_at, last_built_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, '', '')`,
    )
    .run(id, projectId, input.feedType, input.detailLevel, input.audienceLabel, hashToken(token), nowIso());
  const feed = feedRow(id);
  if (!feed) return undefined;
  return { feed: toPublic(feed), token, url: feedUrl(token) };
}

/**
 * Revocation is a state change, not a deletion: the row stays so the author
 * can see that a feed existed and was revoked, but the public route treats
 * any non-empty revokedAt as a hard 404.
 */
export function revokeFeed(
  ownerId: string,
  projectId: string,
  feedId: string,
): PublicFeedDefinition | undefined {
  if (!storage.owns(ownerId, projectId)) return undefined;
  const existing = feedRow(feedId);
  if (!existing || existing.projectId !== projectId) return undefined;
  if (!existing.revokedAt) {
    sqlite
      .prepare(`UPDATE feed_definitions SET revoked_at = ?, enabled = 0 WHERE id = ?`)
      .run(nowIso(), feedId);
  }
  const updated = feedRow(feedId);
  return updated ? toPublic(updated) : undefined;
}

/* -------------------------------------------------- public render lookup */

type LiveFeed = {
  feed: FeedDefinition;
  project: Project;
  /** Feed owner's account display name — the middle author fallback. */
  accountDisplayName: string;
  scenes: Scene[];
};

/**
 * Resolve a plaintext token to everything a render needs, or undefined.
 *
 * This is the one place a project is read WITHOUT an owner session — the
 * token is the credential, by design. Anything wrong with the row (unknown
 * hash, disabled, revoked) collapses to the same undefined so the route can
 * answer an indistinguishable 404.
 */
export function findLiveFeedByToken(token: string): LiveFeed | undefined {
  const feed = sqlite
    .prepare(`SELECT ${FEED_COLS} FROM feed_definitions WHERE token_hash = ?`)
    .get(hashToken(token)) as FeedDefinition | undefined;
  if (!feed || feed.enabled !== 1 || feed.revokedAt !== "") return undefined;
  const project = sqlite
    .prepare(
      `SELECT id, owner_id AS ownerId, title, subtitle, author, genre,
              word_target AS wordTarget, premise, method, format, archived,
              created_at AS createdAt, sort_index AS sortIndex
       FROM projects WHERE id = ?`,
    )
    .get(feed.projectId) as Project | undefined;
  if (!project) return undefined;
  const owner = sqlite
    .prepare(`SELECT display_name AS displayName FROM users WHERE id = ?`)
    .get(project.ownerId) as { displayName: string } | undefined;
  const scenes = sqlite
    .prepare(
      `SELECT id, project_id AS projectId, chapter, title, content, status,
              pov, objective, conflict, change, order_index AS orderIndex,
              draft_zero AS draftZero, updated_at AS updatedAt
       FROM scenes WHERE project_id = ? ORDER BY order_index ASC`,
    )
    .all(feed.projectId) as Scene[];
  return {
    feed,
    project,
    accountDisplayName: owner?.displayName ?? "",
    scenes,
  };
}

function markFeedBuilt(feedId: string) {
  sqlite
    .prepare(`UPDATE feed_definitions SET last_built_at = ? WHERE id = ?`)
    .run(nowIso(), feedId);
}

/** Assemble the narrowed, redacted source for one live feed. */
export function feedSourceFor(live: LiveFeed, selfUrl: string): FeedSource {
  return manuscriptFeedSource(
    { project: live.project, scenes: live.scenes },
    {
      detailLevel: live.feed.detailLevel as FeedDetailLevel,
      accountDisplayName: live.accountDisplayName,
      channelLink: env.appUrl,
      selfUrl,
    },
  );
}

/* ----------------------------------------------------------------- routes */

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{32,64}$/;

/**
 * The public feed route. Unauthenticated by design — the token in the path is
 * the credential. Revoked, disabled, malformed and unknown tokens all get the
 * same hard 404 so nothing about a feed's state is observable.
 *
 * Format negotiation: RSS 2.0 by default (what Substack's importer and Apple
 * Podcasts require); Atom 1.0 when the subscriber asks for it with
 * ?format=atom or an Accept header that prefers application/atom+xml.
 */
export function registerPublicFeedRoutes(app: Express) {
  app.get(
    "/feeds/:token.xml",
    limit({ name: "feed-read", max: 60, windowMs: 60_000 }),
    (req: Request, res: Response) => {
      const token = param(req.params.token);
      if (!TOKEN_SHAPE.test(token)) {
        return res.status(404).json({ error: "Unknown feed" });
      }
      const live = findLiveFeedByToken(token);
      if (!live) {
        return res.status(404).json({ error: "Unknown feed" });
      }
      const selfUrl = feedUrl(token);
      const source = feedSourceFor(live, selfUrl);
      const wantsAtom =
        req.query.format === "atom" ||
        (req.query.format !== "rss" &&
          req.accepts(["application/rss+xml", "application/atom+xml"]) ===
            "application/atom+xml");
      const xml = wantsAtom ? buildAtom(source) : buildRss(source);
      markFeedBuilt(live.feed.id);
      res.setHeader(
        "Content-Type",
        wantsAtom
          ? "application/atom+xml; charset=utf-8"
          : "application/rss+xml; charset=utf-8",
      );
      // The URL is unauthenticated, so shared caches may hold it briefly;
      // five minutes keeps newly ready scenes reasonably fresh for readers.
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(xml);
    },
  );
}

/**
 * The authenticated management API behind the Connections page. routes.ts
 * registers these AFTER `app.use("/api/projects", requireAuth)`, so req.auth
 * is guaranteed present; ownership of the project is still verified on every
 * call, and an unowned project is the same 404 as an unknown one.
 */
export function registerFeedManagementRoutes(app: Express) {
  app.get("/api/projects/:projectId/feeds", (req: Request, res: Response) => {
    const feeds = listFeeds(req.auth!.user.id, param(req.params.projectId));
    if (!feeds) return res.status(404).json({ error: "Unknown project" });
    res.json({ feeds });
  });

  app.post("/api/projects/:projectId/feeds", (req: Request, res: Response) => {
    const parsed = createFeedSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid feed request",
        detail: parsed.error.message,
      });
    }
    const created = createFeed(req.auth!.user.id, param(req.params.projectId), parsed.data);
    if (!created) return res.status(404).json({ error: "Unknown project" });
    res.status(201).json(created);
  });

  app.post(
    "/api/projects/:projectId/feeds/:feedId/revoke",
    (req: Request, res: Response) => {
      const feed = revokeFeed(
        req.auth!.user.id,
        param(req.params.projectId),
        param(req.params.feedId),
      );
      if (!feed) return res.status(404).json({ error: "Not found in this project" });
      res.json({ feed });
    },
  );
}
