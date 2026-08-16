import { describe, expect, it } from "vitest";
import { buildAtom, buildJson, buildLibraryJson, buildRss, exportSpecs } from "./exporters";
import type { Project, ProjectSnapshot, Scene } from "@shared/schema";

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

function snapshot(scenes: Scene[], projectOverrides: Partial<Project> = {}): ProjectSnapshot {
  return {
    project: project(projectOverrides),
    scenes,
    characters: [],
    plots: [],
    events: [],
    world: [],
    notes: [],
    links: [],
    attachments: [],
    checklist: [],
    aliases: [],
    comments: [],
    captureItems: [],
  };
}

/** jsdom's DOMParser reports malformed XML as a <parsererror> document. */
function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  expect(doc.querySelector("parsererror"), `expected well-formed XML, got:\n${xml}`).toBeNull();
  return doc;
}

describe("buildRss", () => {
  it("produces a well-formed RSS 2.0 document with channel metadata", () => {
    const doc = parseXml(buildRss(snapshot([scene()])));
    expect(doc.documentElement.tagName).toBe("rss");
    expect(doc.documentElement.getAttribute("version")).toBe("2.0");
    expect(doc.querySelector("channel > title")?.textContent).toBe("The Glass Meridian");
    expect(doc.querySelector("channel > description")?.textContent).toBe(
      "Book one of the Vitrified Coast",
    );
    expect(doc.querySelector("channel > generator")?.textContent).toBe("LitTechnia");
  });

  it("includes only scenes marked ready, and never draft-zero material", () => {
    const xml = buildRss(
      snapshot([
        scene({ id: "sc-ready", title: "Ready scene", status: "ready", orderIndex: 0 }),
        scene({ id: "sc-drafted", title: "Drafted scene", status: "drafted", orderIndex: 1 }),
        scene({ id: "sc-blank", title: "Blank scene", status: "blank", orderIndex: 2 }),
        scene({ id: "sc-revising", title: "Revising scene", status: "revising", orderIndex: 3 }),
        scene({
          id: "sc-private",
          title: "Private draft-zero scene",
          status: "ready",
          draftZero: 1,
          orderIndex: 4,
        }),
      ]),
    );
    const doc = parseXml(xml);
    const items = [...doc.querySelectorAll("item")];
    expect(items).toHaveLength(1);
    expect(items[0].querySelector("title")?.textContent).toBe("Ready scene");
    expect(xml).not.toContain("Drafted scene");
    expect(xml).not.toContain("Blank scene");
    expect(xml).not.toContain("Revising scene");
    expect(xml).not.toContain("Private draft-zero scene");
  });

  it("escapes XML markup in titles and content instead of passing it through", () => {
    const xml = buildRss(
      snapshot([
        scene({
          title: 'Tea & "lies" <script>alert(1)</script>',
          content: "5 > 3 & 2 < 4",
        }),
      ]),
    );
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).toContain("Tea &amp; &quot;lies&quot;");
    expect(xml).toContain("5 &gt; 3 &amp; 2 &lt; 4");
    // And the escaped output still parses as XML.
    parseXml(xml);
  });

  it("uses non-permalink guids that carry the project and scene ids", () => {
    const doc = parseXml(buildRss(snapshot([scene({ id: "sc-42" })])));
    const guid = doc.querySelector("item > guid");
    expect(guid?.getAttribute("isPermaLink")).toBe("false");
    expect(guid?.textContent).toBe("urn:littechnia:scene:proj-1:sc-42");
  });

  it("says so explicitly when no scene is ready, instead of emitting an empty channel silently", () => {
    const xml = buildRss(snapshot([scene({ status: "drafted" })]));
    const doc = parseXml(xml);
    expect(doc.querySelectorAll("item")).toHaveLength(0);
    expect(xml).toContain('No scenes are marked "Ready to read" yet');
  });

  it("falls back to a plain description when the book has no subtitle", () => {
    const doc = parseXml(buildRss(snapshot([scene()], { subtitle: "" })));
    expect(doc.querySelector("channel > description")?.textContent).toBe(
      "The Glass Meridian — a book in progress on LitTechnia.",
    );
  });
});

describe("buildAtom", () => {
  it("produces a well-formed Atom 1.0 document with feed metadata", () => {
    const doc = parseXml(buildAtom(snapshot([scene()])));
    expect(doc.documentElement.tagName).toBe("feed");
    expect(doc.documentElement.getAttribute("xmlns")).toBe("http://www.w3.org/2005/Atom");
    expect(doc.querySelector("feed > title")?.textContent).toBe("The Glass Meridian");
    expect(doc.querySelector("feed > id")?.textContent).toBe("urn:littechnia:project:proj-1");
  });

  it("applies the same ready-only, never-draft-zero inclusion rule as RSS", () => {
    const doc = parseXml(
      buildAtom(
        snapshot([
          scene({ id: "sc-ready", title: "Ready scene", status: "ready", orderIndex: 0 }),
          scene({ id: "sc-drafted", title: "Drafted scene", status: "drafted", orderIndex: 1 }),
          scene({ id: "sc-private", title: "Private", status: "ready", draftZero: 1, orderIndex: 2 }),
        ]),
      ),
    );
    const entries = [...doc.querySelectorAll("entry")];
    expect(entries).toHaveLength(1);
    expect(entries[0].querySelector("title")?.textContent).toBe("Ready scene");
    expect(entries[0].querySelector("id")?.textContent).toBe("urn:littechnia:scene:proj-1:sc-ready");
  });

  it("escapes markup in entry content", () => {
    const xml = buildAtom(snapshot([scene({ content: "<b>not markup</b> & co" })]));
    expect(xml).not.toContain("<b>not markup</b>");
    expect(xml).toContain("&lt;b&gt;not markup&lt;/b&gt; &amp; co");
    parseXml(xml);
  });
});

describe("exportSpecs feed entries", () => {
  it("registers rss and atom alongside the existing kinds", () => {
    expect(Object.keys(exportSpecs).sort()).toEqual(
      ["atom", "html", "json", "markdown", "narration", "rss"].sort(),
    );
  });

  it("serves both feeds as .xml with the correct MIME types", () => {
    expect(exportSpecs.rss.extension).toBe("xml");
    expect(exportSpecs.rss.mime).toBe("application/rss+xml");
    expect(exportSpecs.atom.extension).toBe("xml");
    expect(exportSpecs.atom.mime).toBe("application/atom+xml");
  });
});

/* ------------------------------------------- Sub-PRD A: attachment policy */

describe("export exclusion of real-world references", () => {
  const mediaAttachment = (overrides: Record<string, unknown> = {}) => ({
    id: "at-1",
    projectId: "proj-1",
    ownerKind: "character",
    ownerId: "ch-1",
    fileName: "photo.png",
    mimeType: "image/png",
    size: 100,
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
  });

  it("strips real_world_ref attachments and every privateNote from the JSON snapshot", () => {
    const snap = snapshot([scene()]);
    snap.attachments = [
      mediaAttachment({ id: "at-keep", role: "reference", privateNote: "" }),
      mediaAttachment({
        id: "at-private",
        role: "real_world_ref",
        privateNote: "this is actually Priya",
        fileName: "priya.png",
      }),
      mediaAttachment({ id: "at-derived", role: "derived", privateNote: "leftover note" }),
    ] as never;
    const parsed = JSON.parse(buildJson(snap));
    const ids = parsed.attachments.map((a: { id: string }) => a.id);
    expect(ids).toEqual(["at-keep", "at-derived"]);
    expect(JSON.stringify(parsed)).not.toContain("this is actually Priya");
    expect(JSON.stringify(parsed)).not.toContain("leftover note");
    expect(parsed.attachments.every((a: { privateNote: string }) => a.privateNote === "")).toBe(
      true,
    );
  });

  it("applies the same exclusion to the whole-library export", () => {
    const snap = snapshot([scene()]);
    snap.attachments = [
      mediaAttachment({
        id: "at-private",
        role: "real_world_ref",
        privateNote: "real person",
      }),
    ] as never;
    const parsed = JSON.parse(buildLibraryJson([snap]));
    expect(parsed.projects[0].attachments).toEqual([]);
    expect(JSON.stringify(parsed)).not.toContain("real person");
  });
});
