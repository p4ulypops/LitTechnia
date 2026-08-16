/**
 * Sub-PRD B — comment anchoring.
 *
 * `scenes.content` is a single `text` column with no per-block ids, so comment
 * anchors use a character offset + a quoted context window. On save, fuzzy
 * re-anchor finds the nearest surviving match and sets `moved = 1` if the
 * match shifted. Comments are sidecar rows — never embedded in prose.
 *
 * The anchor never mutates the prose: it only records where the comment's
 * context window now lives in the (possibly edited) text.
 */

export interface AnchorUpdate {
  /** New start offset, or the old one if no match survived. */
  anchorStart: number;
  /** New end offset. */
  anchorEnd: number;
  /** 1 if the anchor shifted from its original offset, 0 otherwise. */
  moved: number;
}

/**
 * Re-anchor a comment against possibly-edited text.
 *
 * Strategy (in priority order):
 *   1. Exact match at the original offset — anchor is unchanged, `moved = 0`.
 *   2. Exact match elsewhere in the text — move to the new offset, `moved = 1`.
 *   3. Fuzzy match (the quote is a substring ignoring whitespace differences)
 *      nearest to the original offset — move there, `moved = 1`.
 *   4. No surviving match — keep the old offset, set `moved = 1` so the author
 *      sees the comment is stale. The prose is never mutated to "fix" it.
 */
export function reAnchor(
  text: string,
  oldStart: number,
  oldEnd: number,
  anchorQuote: string,
): AnchorUpdate {
  if (!anchorQuote || oldEnd <= oldStart) {
    // No context window to anchor against — nothing to re-anchor.
    return { anchorStart: oldStart, anchorEnd: oldEnd, moved: 0 };
  }

  // 1. Exact match at the original offset?
  const originalSlice = text.slice(oldStart, oldEnd);
  if (originalSlice === anchorQuote) {
    return { anchorStart: oldStart, anchorEnd: oldEnd, moved: 0 };
  }

  // 2. Exact match elsewhere in the text?
  const exactIndex = text.indexOf(anchorQuote);
  if (exactIndex !== -1) {
    return {
      anchorStart: exactIndex,
      anchorEnd: exactIndex + anchorQuote.length,
      moved: exactIndex === oldStart ? 0 : 1,
    };
  }

  // 3. Fuzzy match: normalise whitespace in both the text and the quote, then
  //    find the nearest surviving position to the original offset.
  const fuzzyResult = fuzzyNearestMatch(text, anchorQuote, oldStart);
  if (fuzzyResult) {
    return {
      anchorStart: fuzzyResult.start,
      anchorEnd: fuzzyResult.end,
      moved: 1,
    };
  }

  // 4. No surviving match — flag as moved, keep old offset.
  return { anchorStart: oldStart, anchorEnd: oldEnd, moved: 1 };
}

/**
 * Normalise whitespace for fuzzy comparison: collapse runs of whitespace to a
 * single space and trim. This catches the common edit case where line breaks
 * were added or removed but the words survived.
 */
function normaliseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

interface FuzzyMatch {
  start: number;
  end: number;
}

/**
 * Find the nearest position in `text` where a whitespace-normalised version of
 * `quote` still appears. Returns the offset in the *original* (un-normalised)
 * text, mapped back from the normalised search.
 *
 * This is deliberately simple and fast: it normalises the text in a sliding
 * window around candidate positions rather than building a full suffix array.
 * For the prototype's scene-length texts this is plenty.
 */
function fuzzyNearestMatch(text: string, quote: string, originalOffset: number): FuzzyMatch | null {
  const normQuote = normaliseWhitespace(quote);
  if (!normQuote) return null;

  // Build a normalised version of the text with a mapping back to original
  // offsets. Each normalised character position maps to the original offset
  // where it came from.
  const originalOffsets: number[] = [];
  let normalised = "";
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      // Collapse the whole whitespace run into a single space.
      normalised += " ";
      originalOffsets.push(i);
      while (i < text.length && /\s/.test(text[i])) i += 1;
      // Skip the trailing space character's offset mapping — keep the first.
      if (i < text.length && !/\s/.test(text[i])) {
        // next non-space char will be appended below
      }
    } else {
      normalised += text[i];
      originalOffsets.push(i);
      i += 1;
    }
  }

  // The normalised text may start/end with a space; trim and adjust mapping.
  const trimmedStart = normalised.length - normalised.trimStart().length;
  normalised = normalised.trim();
  const trimmedOffsets = originalOffsets.slice(trimmedStart);

  const normIndex = normalised.toLowerCase().indexOf(normQuote.toLowerCase());
  if (normIndex === -1) return null;

  const matchStartOriginal = trimmedOffsets[normIndex] ?? 0;
  const matchEndNormIndex = normIndex + normQuote.length - 1;
  const matchEndOriginal = (trimmedOffsets[matchEndNormIndex] ?? matchStartOriginal) + 1;

  // Among multiple occurrences, pick the nearest to the original offset.
  let bestStart = matchStartOriginal;
  let bestEnd = matchEndOriginal;
  let bestDistance = Math.abs(matchStartOriginal - originalOffset);
  let searchFrom = normIndex + normQuote.length;
  while (searchFrom < normalised.length) {
    const nextIndex = normalised.toLowerCase().indexOf(normQuote.toLowerCase(), searchFrom);
    if (nextIndex === -1) break;
    const nextStart = trimmedOffsets[nextIndex] ?? 0;
    const nextEndNorm = nextIndex + normQuote.length - 1;
    const nextEnd = (trimmedOffsets[nextEndNorm] ?? nextStart) + 1;
    const distance = Math.abs(nextStart - originalOffset);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestStart = nextStart;
      bestEnd = nextEnd;
    }
    searchFrom = nextIndex + normQuote.length;
  }

  return { start: bestStart, end: bestEnd };
}

/**
 * Extract a context window around a character range for storing as
 * `anchorQuote`. The window is the selected text itself, which is what the
 * author highlighted when creating the comment.
 */
export function extractAnchorQuote(text: string, start: number, end: number): string {
  return text.slice(start, end);
}
