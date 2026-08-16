/**
 * Capture inbox tests (Sub-PRD B).
 *
 * Covers:
 *   - Verbatim preservation of capture input
 *   - Classification requires confirmation (explicit kind + title)
 *   - Classified items point at the created record
 */
import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "./storage";
import { clearAll, seedCaptureItem, seedProject } from "./test-helpers";
import { sqlite } from "./db";

beforeEach(() => clearAll());

describe("Capture inbox — verbatim preservation", () => {
  it("preserves the exact text the author entered, including whitespace", () => {
    const pid = seedProject();
    const body = "  Ilva met Rebecca\nat the furnace.  ";
    const created = storage.create("owner-test", pid, "captureItems", {
      body,
      source: "in_app",
      status: "inbox",
    });
    expect(created).toBeDefined();
    expect((created as { body: string }).body).toBe(body);
  });

  it("stores the source so dictation-originated captures are distinguishable", () => {
    const pid = seedProject();
    const created = storage.create("owner-test", pid, "captureItems", {
      body: "Dictated thought",
      source: "system_dictation",
      status: "inbox",
    });
    expect((created as { source: string }).source).toBe("system_dictation");
  });
});

describe("Capture inbox — classification requires confirmation", () => {
  it("creates a real record only after classifyCaptureItem is called with a kind and title", () => {
    const pid = seedProject();
    const cpId = seedCaptureItem(pid, "A thought about Rebecca");
    const result = storage.classifyCaptureItem("owner-test", pid, cpId, "note", "Rebecca note");
    expect(result).toBeDefined();
    expect((result as { status: string }).status).toBe("classified");
    expect((result as { classified_kind: string }).classified_kind).toBe("note");
    const classifiedId = (result as { classified_id: string }).classified_id;
    expect(classifiedId).toBeTruthy();
    // The note was actually created.
    const note = sqlite
      .prepare(`SELECT * FROM notes WHERE id = ?`)
      .get(classifiedId) as { title: string; body: string } | undefined;
    expect(note).toBeDefined();
    expect(note!.title).toBe("Rebecca note");
    expect(note!.body).toBe("A thought about Rebecca");
  });

  it("preserves the verbatim body in the capture row even after classification", () => {
    const pid = seedProject();
    const body = "Verbatim capture text";
    const cpId = seedCaptureItem(pid, body);
    storage.classifyCaptureItem("owner-test", pid, cpId, "note", "Title");
    const capture = sqlite
      .prepare(`SELECT body FROM capture_items WHERE id = ?`)
      .get(cpId) as { body: string };
    expect(capture.body).toBe(body);
  });

  it("refuses to classify an already-classified item", () => {
    const pid = seedProject();
    const cpId = seedCaptureItem(pid, "Thought");
    storage.classifyCaptureItem("owner-test", pid, cpId, "note", "Title");
    const second = storage.classifyCaptureItem("owner-test", pid, cpId, "note", "Title 2");
    expect(second).toBeUndefined();
  });

  it("refuses to classify a non-existent capture item", () => {
    const pid = seedProject();
    const result = storage.classifyCaptureItem("owner-test", pid, "nonexistent", "note", "Title");
    expect(result).toBeUndefined();
  });
});
