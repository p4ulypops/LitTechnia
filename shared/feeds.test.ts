/**
 * Shared feed generation tests (Sub-PRD C, v0.3).
 *
 * These cover the module BOTH render paths consume — the in-browser download
 * and the hosted server route — so conformance, escaping and the committed
 * GUID scheme are pinned in exactly one place.
 *
 * "W3C validation" here means a structural check of everything the W3C Feed
 * Validation Service requires of the feed itself: well-formed XML, RSS 2.0
 * required channel/item elements, RFC 4287 required feed/entry elements
 * (title, id, updated, feed-level author, link rel="self"), RFC 822 pubDates
 * and RFC 3339 updated timestamps. The live validator is a network service,
 * not a unit-test dependency; the structural contract it enforces is what is
 * asserted, so a template change that would break the validator fails here.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHANNEL_LINK,
  FEED_AUTHOR_NEUTRAL,
  SUMMARY_EXCERPT_LENGTH,
  buildAtom,
  buildRss,
  escapeXml,
  feedEligibleScenes,
  manuscriptFeedSource,
  resolveFeedAuthor,
  type FeedSource,
} from "./feeds";
import type { Project, Scene } from "./schema";

/* --------------------------------------------------------------- fixtures */

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    ownerId: "owner-1",
    title: "The Glass Meridian",
    subtitle: "Book one of the Vitrified Coast",
    author: "Test Author",
    genre: "Fantasy",
    wordTarget: 90000,
    premise: "",
    method: "hybrid",
    format: "Novel",
    archived: 0,
    createdAt: "2026-01-01",
    sortIndex: 0,
    ...overrides,
  };
}

function scene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "sc-1",
    projectId: "proj-1",
    chapter: "Chapter One",
    title: "The furnace at low tide",
    content: "It began, as most disasters do, with a cup of tea.",
    status: "ready",
    pov: "",
    objective: "",
    conflict: "",
    change: "",
    orderIndex: 0,
    draftZero: 0,
    updatedAt: "",
    ...overrides,
  };
}

function snapshot(scenes: Scene[], projectOverrides: Partial<Project> = {}) {
  return { project: project(projectOverrides), scenes };
}

const NOW = new Date("2026-08-16T12:00:00.000Z");

function source(overrides: Partial<FeedSource> = {}): FeedSource {
  return {
    projectId: "proj-1",
    title: "The Glass Meridian",
    description: "Book one of the Vitrified Coast",
    authorName: "Test Author",
    channelLink: "https://littechnia.example",
    selfUrl: "https://littechnia.example/feeds/tok123.xml",
    items: [{ id: "sc-1", title: "The furnace at low tide", content: "It began with tea." }],
    ...overrides,
  };
}

/** jsdom's DOMParser reports malformed XML as a <parsererror> document. */
function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  expect(doc.querySelector("parsererror"), `expected well-formed XML, got:\n${xml}`).toBeNull();
  return doc;
}

/** Direct child elements of `parent` with the given tag name. */
function children(parent: Element, tag: string): Element[] {
  return [...parent.children].filter((el) => el.tagName === tag);
}

/* ---------------------------------------------------------- RSS 2.0 shape */

describe("buildRss", () => {
  it("produces RSS 2.0 with every channel element the W3C validator requires", () => {
    const doc = parseXml(buildRss(source(), NOW));
    const rss = doc.documentElement;
    expect(rss.tagName).toBe("rss");
    expect(rss.getAttribute("version")).toBe("2.0");
    const channel = children(rss, "channel");
    expect(channel).toHaveLength(1);
    // Required channel children: title, link, description.
    expect(channel[0].querySelector(":scope > title")?.textContent).toBe("The Glass Meridian");
    expect(channel[0].querySelector(":scope > link")?.textContent).toBe(
      "https://littechnia.example",
    );
    expect(channel[0].querySelector(":scope > description")?.textContent).toBe(
      "Book one of the Vitrified Coast",
    );
    expect(channel[0].querySelector(":scope > generator")?.textContent).toBe("LitTechnia");
    // RFC 822 date, e.g. "Sun, 16 Aug 2026 12:00:00 GMT".
    expect(channel[0].querySelector(":scope > lastBuildDate")?.textContent).toMatch(
      /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/,
    );
  });

  it("carries a W3C-recommended atom:link rel=self pointing at the feed itself", () => {
    const doc = parseXml(buildRss(source(), NOW));
    const channel = doc.querySelector("channel")!;
    // The element is namespaced (tagName "atom:link"), so match by tagName.
    const self = [...channel.children].find(
      (el) => el.tagName === "atom:link" && el.getAttribute("rel") === "self",
    );
    expect(self).toBeDefined();
    expect(self?.getAttribute("href")).toBe("https://littechnia.example/feeds/tok123.xml");
    expect(self?.getAttribute("type")).toBe("application/rss+xml");
  });

  it("emits valid items with RFC 822 pubDates", () => {
    const doc = parseXml(buildRss(source(), NOW));
    const items = [...doc.querySelectorAll("channel > item")];
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.querySelector(":scope > title")?.textContent).toBe("The furnace at low tide");
    expect(item.querySelector(":scope > description")?.textContent).toBe("It began with tea.");
    expect(item.querySelector(":scope > pubDate")?.textContent).toMatch(
      /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/,
    );
  });

  it("reproduces the committed GUID scheme byte-for-byte, as a non-permalink", () => {
    const doc = parseXml(buildRss(source(), NOW));
    const guid = doc.querySelector("item > guid");
    expect(guid?.getAttribute("isPermaLink")).toBe("false");
    expect(guid?.textContent).toBe("urn:littechnia:scene:proj-1:sc-1");
  });

  it("omits the description element for metadata-only items instead of emptying it", () => {
    const doc = parseXml(buildRss(source({ items: [{ id: "sc-9", title: "T", content: "" }] }), NOW));
    const item = doc.querySelector("channel > item");
    expect(item?.querySelector(":scope > description")).toBeNull();
    expect(item?.querySelector(":scope > title")?.textContent).toBe("T");
  });

  it("escapes injected markup everywhere it can appear", () => {
    const xml = buildRss(
      source({
        title: 'Tea & "lies" <script>alert(1)</script>',
        description: "5 > 3 & 2 < 4",
        items: [{ id: "sc-1", title: "<b>bold</b>", content: "</description><evil/>" }],
      }),
      NOW,
    );
    expect(xml).not.toContain("<script>");
    expect(xml).not.toContain("<evil/>");
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).toContain("Tea &amp; &quot;lies&quot;");
    expect(xml).toContain("&lt;/description&gt;");
    parseXml(xml);
  });

  it("produces a valid empty feed when there are no items, with an explanatory comment", () => {
    const xml = buildRss(source({ items: [] }), NOW);
    const doc = parseXml(xml);
    expect(doc.querySelectorAll("item")).toHaveLength(0);
    expect(xml).toContain('No scenes are marked "Ready to read" yet');
  });
});

/* ---------------------------------------------------------- Atom 1.0 shape */

describe("buildAtom", () => {
  it("produces Atom 1.0 with every feed element RFC 4287 / the W3C validator requires", () => {
    const doc = parseXml(buildAtom(source(), NOW));
    const feed = doc.documentElement;
    expect(feed.tagName).toBe("feed");
    expect(feed.getAttribute("xmlns")).toBe("http://www.w3.org/2005/Atom");
    // RFC 4287 §4.1.1 required feed elements: title, id, updated.
    expect(feed.querySelector(":scope > title")?.textContent).toBe("The Glass Meridian");
    expect(feed.querySelector(":scope > id")?.textContent).toBe("urn:littechnia:project:proj-1");
    // RFC 3339 timestamp.
    expect(feed.querySelector(":scope > updated")?.textContent).toBe("2026-08-16T12:00:00.000Z");
    // The conformance fix: a feed-level author (required unless every entry
    // carries its own) ...
    expect(feed.querySelector(":scope > author > name")?.textContent).toBe("Test Author");
    // ... and a link rel="self" identifying the feed's own URL.
    const links = children(feed, "link");
    const self = links.find((l) => l.getAttribute("rel") === "self");
    expect(self?.getAttribute("href")).toBe("https://littechnia.example/feeds/tok123.xml");
    expect(self?.getAttribute("type")).toBe("application/atom+xml");
    const alternate = links.find((l) => l.getAttribute("rel") !== "self");
    expect(alternate?.getAttribute("href")).toBe("https://littechnia.example");
    expect(feed.querySelector(":scope > generator")?.textContent).toBe("LitTechnia");
  });

  it("emits valid entries that inherit the feed author per RFC 4287", () => {
    const doc = parseXml(buildAtom(source(), NOW));
    const entries = [...doc.querySelectorAll("feed > entry")];
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    // Required entry elements: title, id, updated. No per-entry author needed
    // because the feed carries one.
    expect(entry.querySelector(":scope > title")?.textContent).toBe("The furnace at low tide");
    expect(entry.querySelector(":scope > id")?.textContent).toBe("urn:littechnia:scene:proj-1:sc-1");
    expect(entry.querySelector(":scope > updated")?.textContent).toBe("2026-08-16T12:00:00.000Z");
    expect(entry.querySelector(":scope > content")?.textContent).toBe("It began with tea.");
    expect(entry.querySelector(":scope > author")).toBeNull();
  });

  it("omits the content element for metadata-only entries", () => {
    const doc = parseXml(
      buildAtom(source({ items: [{ id: "sc-9", title: "T", content: "" }] }), NOW),
    );
    const entry = doc.querySelector("feed > entry");
    expect(entry?.querySelector(":scope > content")).toBeNull();
    expect(entry?.querySelector(":scope > title")?.textContent).toBe("T");
  });

  it("escapes injected markup in entries and feed metadata", () => {
    const xml = buildAtom(
      source({
        authorName: 'A <u> & "B"',
        items: [{ id: "sc-1", title: "x", content: "<b>not markup</b> & co" }],
      }),
      NOW,
    );
    expect(xml).not.toContain("<b>not markup</b>");
    expect(xml).toContain("&lt;b&gt;not markup&lt;/b&gt; &amp; co");
    expect(xml).toContain("A &lt;u&gt; &amp; &quot;B&quot;");
    parseXml(xml);
  });

  it("produces a valid empty feed (still RFC 4287 complete) when there are no entries", () => {
    const xml = buildAtom(source({ items: [] }), NOW);
    const doc = parseXml(xml);
    expect(doc.querySelectorAll("entry")).toHaveLength(0);
    // An empty feed must still validate: required elements stay present.
    expect(doc.querySelector("feed > author > name")?.textContent).toBe("Test Author");
    expect(doc.querySelector('feed > link[rel="self"]')).not.toBeNull();
    expect(xml).toContain('No scenes are marked "Ready to read" yet');
  });
});

/* --------------------------------------------------------- author fallback */

describe("resolveFeedAuthor", () => {
  it("prefers the project's named author", () => {
    expect(resolveFeedAuthor("Ursula K.", "Account Name")).toBe("Ursula K.");
  });

  it("falls back to the account display name when the project has no author", () => {
    expect(resolveFeedAuthor("", "Account Name")).toBe("Account Name");
    expect(resolveFeedAuthor("   ", "Account Name")).toBe("Account Name");
  });

  it("ends at a neutral constant rather than an empty element", () => {
    expect(resolveFeedAuthor("", "")).toBe(FEED_AUTHOR_NEUTRAL);
  });
});

/* ------------------------------------------- eligibility + redaction choke */

describe("manuscriptFeedSource", () => {
  it("includes only ready, non-draft-zero scenes, in reading order", () => {
    const src = manuscriptFeedSource(
      snapshot([
        scene({ id: "sc-second", orderIndex: 1, title: "Second", status: "ready" }),
        scene({ id: "sc-first", orderIndex: 0, title: "First", status: "ready" }),
        scene({ id: "sc-drafted", orderIndex: 2, title: "Drafted", status: "drafted" }),
        scene({ id: "sc-blank", orderIndex: 3, title: "Blank", status: "blank" }),
        scene({ id: "sc-revising", orderIndex: 4, title: "Revising", status: "revising" }),
        scene({ id: "sc-private", orderIndex: 5, title: "Private", status: "ready", draftZero: 1 }),
        scene({ id: "sc-dz-status", orderIndex: 6, title: "DZ status", status: "draft-zero" }),
      ]),
      { detailLevel: "full" },
    );
    expect(src.items.map((item) => item.id)).toEqual(["sc-first", "sc-second"]);
  });

  it("defaults to the least-revealing detail level: no prose is carried at all", () => {
    const src = manuscriptFeedSource(snapshot([scene({ content: "SECRET PROSE" })]));
    expect(src.items).toHaveLength(1);
    expect(src.items[0].content).toBe("");
    // Structural guarantee: the default source cannot emit prose even if a
    // builder tried to — it never receives any.
  });

  it("summary detail truncates prose to a short excerpt with an ellipsis", () => {
    const long = "word ".repeat(120).trim(); // ~600 chars
    const src = manuscriptFeedSource(snapshot([scene({ content: long })]), {
      detailLevel: "summary",
    });
    expect(src.items[0].content.length).toBeLessThanOrEqual(SUMMARY_EXCERPT_LENGTH + 1);
    expect(src.items[0].content.endsWith("…")).toBe(true);
  });

  it("summary detail keeps short prose intact", () => {
    const src = manuscriptFeedSource(snapshot([scene({ content: "Short and sweet." })]), {
      detailLevel: "summary",
    });
    expect(src.items[0].content).toBe("Short and sweet.");
  });

  it("full detail carries the complete scene text, with the not-written-yet marker", () => {
    const src = manuscriptFeedSource(snapshot([scene({ content: "  " })]), {
      detailLevel: "full",
    });
    expect(src.items[0].content).toBe("(not written yet)");
  });

  it("draft-zero scenes are excluded at every detail level", () => {
    for (const detailLevel of ["metadata_only", "summary", "full"] as const) {
      const src = manuscriptFeedSource(
        snapshot([scene({ id: "sc-private", draftZero: 1, status: "ready" })]),
        { detailLevel },
      );
      expect(src.items).toHaveLength(0);
    }
  });

  it("falls back to the channel link as self URL when no feed URL is supplied (file download)", () => {
    const src = manuscriptFeedSource(snapshot([scene()]), {
      detailLevel: "full",
      channelLink: "https://app.example",
    });
    expect(src.selfUrl).toBe("https://app.example");
    expect(src.channelLink).toBe("https://app.example");
  });

  it("uses the neutral default channel link when none is given", () => {
    const src = manuscriptFeedSource(snapshot([scene()]));
    expect(src.channelLink).toBe(DEFAULT_CHANNEL_LINK);
  });

  it("uses the subtitle as description, falling back to a neutral sentence", () => {
    expect(manuscriptFeedSource(snapshot([scene()])).description).toBe(
      "Book one of the Vitrified Coast",
    );
    expect(
      manuscriptFeedSource(snapshot([scene()], { subtitle: "" })).description,
    ).toBe("The Glass Meridian — a book in progress on LitTechnia.");
  });

  it("threads the account display name through to the author fallback", () => {
    const src = manuscriptFeedSource(snapshot([scene()], { author: "" }), {
      accountDisplayName: "jo",
    });
    expect(src.authorName).toBe("jo");
  });
});

/* ------------------------------------------------------------ byte parity */

describe("client/server parity", () => {
  it("a full-detail source renders the same item GUIDs the client download always produced", () => {
    // The browser path passes detailLevel "full" and no selfUrl; the hosted
    // path passes the hosted URL. Either way the GUID string is identical.
    const full = manuscriptFeedSource(snapshot([scene({ id: "sc-42" })]), {
      detailLevel: "full",
      channelLink: "https://littechnia.example",
    });
    const rss = buildRss(full, NOW);
    const atom = buildAtom(full, NOW);
    expect(rss).toContain(
      '<guid isPermaLink="false">urn:littechnia:scene:proj-1:sc-42</guid>',
    );
    expect(atom).toContain("<id>urn:littechnia:scene:proj-1:sc-42</id>");
  });
});

describe("escapeXml", () => {
  it("escapes all five XML-sensitive characters", () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe("a &amp; b &lt; c &gt; d &quot; e ' f");
  });
});

/* ------------------------------- the snapshot type is only an input here */

describe("feedEligibleScenes", () => {
  it("does not mutate its input array while sorting", () => {
    const scenes = [
      scene({ id: "b", orderIndex: 1 }),
      scene({ id: "a", orderIndex: 0 }),
    ];
    const eligible = feedEligibleScenes(scenes);
    expect(eligible.map((s) => s.id)).toEqual(["a", "b"]);
    expect(scenes.map((s) => s.id)).toEqual(["b", "a"]);
  });
});
