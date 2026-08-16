/**
 * Feed generation, shared by the browser and the server (Sub-PRD C, v0.3).
 *
 * This module was lifted out of client/src/lib/exporters.ts so the hosted
 * feed route renders byte-for-byte the same XML the browser download produces
 * — including the committed GUID scheme `urn:littechnia:scene:<projectId>:<sceneId>`,
 * which existing subscribers must never see change (a changed GUID makes every
 * reader re-download every item).
 *
 * Two structural rules live here:
 *
 *   1. Narrowed DTOs. The builders never receive a ProjectSnapshot. They
 *      receive a `FeedSource` whose items are `FeedItemSource[]` — the only
 *      prose a builder can emit is whatever the eligibility/redaction
 *      chokepoint already decided to hand it. A future micro_changes builder
 *      assembled from metadata-only items is therefore structurally incapable
 *      of leaking manuscript prose.
 *
 *   2. One chokepoint. `manuscriptFeedSource()` is the single place that
 *      decides which scenes are eligible (the existing feedScenes() predicate:
 *      `status === "ready" && draftZero !== 1`) and how much prose each item
 *      carries (the feed's detail level, least-revealing by default).
 *
 * RFC 4287 conformance fix (correctness fix for already-shipped code): the
 * Atom build now emits a feed-level <author> — resolved from the project's
 * author, then the account display name, then a neutral constant — and a
 * <link rel="self">, both required for a clean W3C Feed Validation pass. The
 * RSS build gains the W3C-recommended <atom:link rel="self">.
 */
import type { FeedDetailLevel, ProjectSnapshot, Scene } from "./schema";

/** Neutral byline when neither the book nor the account names an author. */
export const FEED_AUTHOR_NEUTRAL = "LitTechnia author";

/** Fallback channel link when no origin is supplied (e.g. a pure CLI render). */
export const DEFAULT_CHANNEL_LINK = "https://littechnia.com";

/**
 * The only thing a feed builder may know about one scene. `content` is prose
 * already redacted to the feed's detail level — "" means the item carries no
 * prose at all, and the builder then omits the description/content element.
 */
export type FeedItemSource = {
  /** Scene id — becomes the trailing segment of the stable item GUID. */
  id: string;
  title: string;
  content: string;
};

/** Everything a feed builder needs, and nothing more. */
export type FeedSource = {
  projectId: string;
  title: string;
  /** Channel/feed description: the subtitle, or a neutral fallback. */
  description: string;
  /** Resolved byline — see resolveFeedAuthor. */
  authorName: string;
  /** Link back to the app (RSS channel <link>, Atom alternate link). */
  channelLink: string;
  /** The feed's own absolute URL, for <link rel="self"> / <atom:link>. */
  selfUrl: string;
  items: FeedItemSource[];
};

/** XML escaping for element text and double-quoted attribute values. */
export const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Feed-level author, per RFC 4287: the book's named author first, then the
 * signed-in account's display name (server-side renders only — the browser
 * download needs no account), then a neutral constant so the element is never
 * empty.
 */
export function resolveFeedAuthor(projectAuthor: string, accountDisplayName = ""): string {
  const author = projectAuthor.trim();
  if (author) return author;
  const account = accountDisplayName.trim();
  if (account) return account;
  return FEED_AUTHOR_NEUTRAL;
}

/**
 * The eligibility predicate every feed type shares, lifted verbatim from the
 * original client-side feedScenes(): scenes marked "Ready to read" that are
 * not draft-zero material (private by default, never syndicated), in reading
 * order.
 */
export function feedEligibleScenes(scenes: Scene[]): Scene[] {
  return [...scenes]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((scene) => scene.status === "ready" && scene.draftZero !== 1);
}

/** Length of the prose excerpt a `summary`-detail item carries. */
export const SUMMARY_EXCERPT_LENGTH = 280;

function excerpt(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= SUMMARY_EXCERPT_LENGTH) return trimmed;
  return `${trimmed.slice(0, SUMMARY_EXCERPT_LENGTH).trimEnd()}…`;
}

/**
 * The single eligibility + redaction chokepoint. Assembles the narrowed
 * FeedSource a builder consumes from a project's own rows.
 *
 * Detail levels (least-revealing is the default, matching the
 * feedDefinitions schema default):
 *   metadata_only — title, GUID and timestamp only; scene prose is never
 *                   read, so it cannot leak.
 *   summary       — a short excerpt per item.
 *   full          — the full scene text (what the in-browser download has
 *                   always produced; the file is the author's own).
 */
export function manuscriptFeedSource(
  input: Pick<ProjectSnapshot, "project" | "scenes">,
  options: {
    detailLevel?: FeedDetailLevel;
    /** Server-side only: the feed owner's account display name. */
    accountDisplayName?: string;
    channelLink?: string;
    /** Absolute URL of the feed itself; hosted renders always pass this. */
    selfUrl?: string;
  } = {},
): FeedSource {
  const detailLevel = options.detailLevel ?? "metadata_only";
  const { project } = input;
  const channelLink = options.channelLink ?? DEFAULT_CHANNEL_LINK;
  const items = feedEligibleScenes(input.scenes).map((scene): FeedItemSource => {
    if (detailLevel === "metadata_only") {
      // Structural redaction: prose is never read, so it can never leak.
      return { id: scene.id, title: scene.title, content: "" };
    }
    const prose = scene.content.trim() || "(not written yet)";
    return {
      id: scene.id,
      title: scene.title,
      content: detailLevel === "summary" ? excerpt(prose) : prose,
    };
  });
  return {
    projectId: project.id,
    title: project.title,
    description: project.subtitle || `${project.title} — a book in progress on LitTechnia.`,
    authorName: resolveFeedAuthor(project.author, options.accountDisplayName),
    channelLink,
    // A downloaded file has no canonical address of its own until the author
    // hosts it; the channel link is the honest nearest value there.
    selfUrl: options.selfUrl ?? channelLink,
    items,
  };
}

/**
 * RSS 2.0 feed. There is no per-scene timestamp in this prototype's schema,
 * so every item shares one "generated at" pubDate rather than a fabricated
 * distinct one; the Connections page says so explicitly. Item guids are
 * non-permalink (isPermaLink="false") and use the committed
 * urn:littechnia:scene:<projectId>:<sceneId> scheme — reproduced here
 * byte-for-byte so existing subscribers never see a changed GUID.
 *
 * `now` is injectable so tests (and only tests) can pin the timestamps.
 */
export function buildRss(source: FeedSource, now: Date = new Date()): string {
  const generatedAt = now.toUTCString();
  const items = source.items
    .map((item) => {
      // metadata_only items carry no prose; RSS requires only title OR
      // description on an item, so the element is omitted rather than emptied.
      const description = item.content
        ? `\n      <description>${escapeXml(item.content)}</description>`
        : "";
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <guid isPermaLink="false">urn:littechnia:scene:${escapeXml(source.projectId)}:${escapeXml(item.id)}</guid>
      <pubDate>${generatedAt}</pubDate>${description}
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(source.title)}</title>
    <link>${escapeXml(source.channelLink)}</link>
    <atom:link rel="self" type="application/rss+xml" href="${escapeXml(source.selfUrl)}" />
    <description>${escapeXml(source.description)}</description>
    <generator>LitTechnia</generator>
    <lastBuildDate>${generatedAt}</lastBuildDate>
${items || '    <!-- No scenes are marked "Ready to read" yet, so this feed has no items. -->'}
  </channel>
</rss>
`;
}

/**
 * Atom 1.0 (RFC 4287) feed, same scope and same single-timestamp honesty note
 * as the RSS build. Feed-level <author> and <link rel="self"> are emitted
 * unconditionally so the output passes the W3C Feed Validation Service;
 * entries inherit the feed author per RFC 4287 §4.2.1.
 */
export function buildAtom(source: FeedSource, now: Date = new Date()): string {
  const generatedAt = now.toISOString();
  const entries = source.items
    .map((item) => {
      const content = item.content
        ? `\n    <content type="text">${escapeXml(item.content)}</content>`
        : "";
      return `  <entry>
    <title>${escapeXml(item.title)}</title>
    <id>urn:littechnia:scene:${escapeXml(source.projectId)}:${escapeXml(item.id)}</id>
    <updated>${generatedAt}</updated>${content}
  </entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(source.title)}</title>
  <id>urn:littechnia:project:${escapeXml(source.projectId)}</id>
  <updated>${generatedAt}</updated>
  <author>
    <name>${escapeXml(source.authorName)}</name>
  </author>
  <link href="${escapeXml(source.channelLink)}" />
  <link rel="self" type="application/atom+xml" href="${escapeXml(source.selfUrl)}" />
  <generator>LitTechnia</generator>
${entries || '  <!-- No scenes are marked "Ready to read" yet, so this feed has no entries. -->'}
</feed>
`;
}
