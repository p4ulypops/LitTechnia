/**
 * Comment anchor tests (Sub-PRD B).
 *
 * Covers:
 *   - Fuzzy re-anchor on edited text, `moved` flag set
 *   - Comment anchor: character offset + quoted context window
 *   - Never mutates the prose
 */
import { describe, expect, it } from "vitest";
import { reAnchor, extractAnchorQuote } from "./comment-anchor";

describe("reAnchor — exact match at original offset", () => {
  it("keeps the anchor and sets moved = 0 when text is unchanged", () => {
    const text = "The furnace breathed out and the sea breathed in.";
    const quote = "furnace";
    const result = reAnchor(text, 4, 11, quote);
    expect(result.anchorStart).toBe(4);
    expect(result.anchorEnd).toBe(11);
    expect(result.moved).toBe(0);
  });
});

describe("reAnchor — exact match elsewhere", () => {
  it("moves to the new offset and sets moved = 1", () => {
    const text = "Intro. The furnace breathed out and the sea breathed in.";
    // Original offset was 4 (before text was prepended), now it's at 11.
    const quote = "furnace";
    const result = reAnchor(text, 4, 11, quote);
    expect(result.anchorStart).toBe(11);
    expect(result.anchorEnd).toBe(18);
    expect(result.moved).toBe(1);
  });
});

describe("reAnchor — fuzzy match", () => {
  it("finds the nearest surviving match when whitespace changed", () => {
    const original = "The furnace breathed out";
    const edited = "The  furnace\nbreathed out"; // extra space, newline
    const quote = "furnace breathed";
    // Original offset: 4 (where "furnace" started)
    const result = reAnchor(edited, 4, 21, quote);
    expect(result.moved).toBe(1);
    expect(edited.slice(result.anchorStart, result.anchorEnd).replace(/\s+/g, " ")).toBe(
      "furnace breathed",
    );
  });

  it("picks the nearest match to the original offset when multiple exist", () => {
    const text = "furnace here and furnace there";
    const quote = "furnace";
    // Original offset was 0 (the first "furnace"); both survive.
    const result = reAnchor(text, 0, 7, quote);
    expect(result.moved).toBe(0); // exact match at original offset
    expect(result.anchorStart).toBe(0);

    // Now test with a shifted offset — the original was at 0 but text was prepended.
    // The first "furnace" is nearest to the old offset.
    const shifted = "XX furnace here and furnace there";
    const result2 = reAnchor(shifted, 0, 7, quote);
    expect(result2.moved).toBe(1);
    expect(result2.anchorStart).toBe(3); // nearest to original offset 0
  });
});

describe("reAnchor — no surviving match", () => {
  it("keeps the old offset and sets moved = 1", () => {
    const text = "The text was completely rewritten.";
    const quote = "furnace";
    const result = reAnchor(text, 4, 11, quote);
    expect(result.anchorStart).toBe(4);
    expect(result.anchorEnd).toBe(11);
    expect(result.moved).toBe(1);
  });
});

describe("reAnchor — edge cases", () => {
  it("returns moved = 0 when there is no anchor quote", () => {
    const result = reAnchor("some text", 0, 4, "");
    expect(result.moved).toBe(0);
    expect(result.anchorStart).toBe(0);
    expect(result.anchorEnd).toBe(4);
  });

  it("returns moved = 0 when anchor range is invalid", () => {
    const result = reAnchor("some text", 5, 5, "quote");
    expect(result.moved).toBe(0);
  });
});

describe("reAnchor — never mutates the prose", () => {
  it("only returns offset updates, never changes the text", () => {
    const text = "The furnace breathed out";
    const original = text;
    reAnchor(text, 4, 11, "furnace");
    expect(text).toBe(original);
  });
});

describe("extractAnchorQuote", () => {
  it("extracts the selected text as the context window", () => {
    const text = "The furnace breathed out";
    expect(extractAnchorQuote(text, 4, 11)).toBe("furnace");
  });
});
