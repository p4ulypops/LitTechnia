/**
 * Export exclusion tests (Sub-PRD B).
 *
 * Comments are self-only margin annotations excluded from every export by
 * default. This test verifies that no export format carries comment data.
 */
import { describe, expect, it } from "vitest";
import { buildJson, buildMarkdown, buildHtml, buildNarration, buildLibraryJson } from "./exporters";
import type { Comment, Project, ProjectSnapshot, Scene } from "@shared/schema";

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

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "cm-1",
    projectId: "proj-1",
    targetKind: "scene",
    targetId: "sc-1",
    anchorStart: 0,
    anchorEnd: 10,
    anchorQuote: "It began,",
    body: "This is a private margin comment.",
    moved: 0,
    resolvedAt: "",
    createdAt: "2026-01-01",
    updatedAt: "",
    authorId: "owner-1",
    ...overrides,
  };
}

function snapshot(comments: Comment[] = []): ProjectSnapshot {
  return {
    project: project(),
    scenes: [scene()],
    characters: [],
    plots: [],
    events: [],
    world: [],
    notes: [],
    links: [],
    attachments: [],
    checklist: [],
    aliases: [],
    comments,
    captureItems: [],
  };
}

describe("Export — comments excluded by default", () => {
  it("excludes comments from the JSON project snapshot", () => {
    const json = buildJson(snapshot([comment()]));
    const parsed = JSON.parse(json);
    expect(parsed.comments).toEqual([]);
  });

  it("does not leak comment text into the JSON export", () => {
    const json = buildJson(snapshot([comment({ body: "SECRET-MARGIN-NOTE" })]));
    expect(json).not.toContain("SECRET-MARGIN-NOTE");
  });

  it("excludes comments from the library JSON export", () => {
    const json = buildLibraryJson([snapshot([comment({ body: "SECRET-MARGIN-NOTE" })])]);
    const parsed = JSON.parse(json);
    for (const proj of parsed.projects) {
      expect(proj.comments).toEqual([]);
    }
    expect(json).not.toContain("SECRET-MARGIN-NOTE");
  });

  it("does not leak comment text into the Markdown export", () => {
    const md = buildMarkdown(snapshot([comment({ body: "SECRET-MARGIN-NOTE" })]));
    expect(md).not.toContain("SECRET-MARGIN-NOTE");
  });

  it("does not leak comment text into the HTML export", () => {
    const html = buildHtml(snapshot([comment({ body: "SECRET-MARGIN-NOTE" })]));
    expect(html).not.toContain("SECRET-MARGIN-NOTE");
  });

  it("does not leak comment text into the narration script", () => {
    const narration = buildNarration(snapshot([comment({ body: "SECRET-MARGIN-NOTE" })]));
    expect(narration).not.toContain("SECRET-MARGIN-NOTE");
  });
});
