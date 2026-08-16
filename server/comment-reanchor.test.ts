/**
 * Comment re-anchor integration tests (Sub-PRD B).
 *
 * Tests the storage-level integration: when scene content is edited, comments
 * on that scene are fuzzy re-anchored and the `moved` flag is set.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "./storage";
import { clearAll, seedComment, seedProject, seedScene } from "./test-helpers";
import { sqlite } from "./db";

beforeEach(() => clearAll());

describe("Comment re-anchor — storage integration", () => {
  it("sets moved = 0 when the anchored text is unchanged", () => {
    const pid = seedProject();
    seedScene(pid, "sc-1", "The furnace breathed out and the sea breathed in.");
    seedComment(pid, "scene", "sc-1", 4, 11, "furnace", "Check this word");
    // Update the scene with the same content (no change to the anchor).
    storage.update("owner-test", pid, "scenes", "sc-1", {
      content: "The furnace breathed out and the sea breathed in.",
    });
    const comment = sqlite
      .prepare(`SELECT moved FROM comments WHERE id = ?`)
      .get("cm-test") as { moved: number };
    expect(comment.moved).toBe(0);
  });

  it("sets moved = 1 and re-anchors when text before the anchor changes", () => {
    const pid = seedProject();
    seedScene(pid, "sc-1", "The furnace breathed out.");
    seedComment(pid, "scene", "sc-1", 4, 11, "furnace", "Check this word");
    // Prepend text — the anchor shifts.
    storage.update("owner-test", pid, "scenes", "sc-1", {
      content: "Intro. The furnace breathed out.",
    });
    const comment = sqlite
      .prepare(`SELECT anchor_start, anchor_end, moved FROM comments WHERE id = ?`)
      .get("cm-test") as { anchor_start: number; anchor_end: number; moved: number };
    expect(comment.moved).toBe(1);
    expect(comment.anchor_start).toBe(11); // "furnace" now starts at 11
    expect(comment.anchor_end).toBe(18);
  });

  it("sets moved = 1 when the anchored text no longer survives", () => {
    const pid = seedProject();
    seedScene(pid, "sc-1", "The furnace breathed out.");
    seedComment(pid, "scene", "sc-1", 4, 11, "furnace", "Check this word");
    // Completely rewrite the text.
    storage.update("owner-test", pid, "scenes", "sc-1", {
      content: "The text was completely rewritten.",
    });
    const comment = sqlite
      .prepare(`SELECT anchor_start, moved FROM comments WHERE id = ?`)
      .get("cm-test") as { anchor_start: number; moved: number };
    expect(comment.moved).toBe(1);
    // Keeps the old offset.
    expect(comment.anchor_start).toBe(4);
  });

  it("re-anchors comments on notes when the note body changes", () => {
    const pid = seedProject();
    sqlite
      .prepare(
        `INSERT INTO notes (id, project_id, title, body, tags, source_path, origin, updated_at)
         VALUES ('nt-1', ?, 'Note', 'See Rebecca here', '[]', '', 'authored', '')`,
      )
      .run(pid);
    seedComment(pid, "note", "nt-1", 4, 11, "Rebecca", "Check this");
    storage.update("owner-test", pid, "notes", "nt-1", {
      body: "Intro. See Rebecca here",
    });
    const comment = sqlite
      .prepare(`SELECT moved FROM comments WHERE id = ?`)
      .get("cm-test") as { moved: number };
    expect(comment.moved).toBe(1);
  });

  it("never mutates the prose — only updates the comment anchor", () => {
    const pid = seedProject();
    const content = "The furnace breathed out.";
    seedScene(pid, "sc-1", content);
    seedComment(pid, "scene", "sc-1", 4, 11, "furnace", "Check this");
    const newContent = "Intro. The furnace breathed out.";
    storage.update("owner-test", pid, "scenes", "sc-1", { content: newContent });
    const scene = sqlite
      .prepare(`SELECT content FROM scenes WHERE id = ?`)
      .get("sc-1") as { content: string };
    // The prose is exactly what the author sent — not modified by re-anchoring.
    expect(scene.content).toBe(newContent);
  });
});
