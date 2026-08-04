/**
 * Import scanning — deterministic, offline, and deliberately unclever.
 *
 * Every suggestion below comes from a plain filename/heading rule you can read
 * in this file. Nothing is inferred by a model, nothing is sent anywhere, and
 * every suggestion is editable in the review stage before anything is created.
 */
import type { ImportKind } from "@shared/schema";

export const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".txt", ".text"] as const;

export type ScanIssue = "unsupported-type" | "empty-file" | "read-failed" | "too-large";

export type ScannedFile = {
  /** Stable key for React lists and testids. */
  key: string;
  fileName: string;
  size: number;
  title: string;
  body: string;
  kind: ImportKind;
  /** Why this classification was suggested — shown to the author. */
  reason: string;
  headings: string[];
  words: number;
  include: boolean;
  issue?: ScanIssue;
};

export const MAX_FILE_BYTES = 400_000;

export const kindOptions: { value: ImportKind; label: string; lands: string }[] = [
  { value: "scene", label: "Scene", lands: "Manuscript, filed under “Imported material” as draft zero" },
  { value: "character", label: "Character", lands: "Characters, with the text kept as voice notes" },
  { value: "plot", label: "Plot thread", lands: "Plot & subplots, text kept as the premise" },
  { value: "event", label: "Timeline event", lands: "Timeline, marked unplaced" },
  { value: "world", label: "Worldbuilding entry", lands: "Worldbuilding, text kept as facts" },
  { value: "note", label: "Research note", lands: "Research, tagged “imported”" },
];

export function issueMessage(issue: ScanIssue): string {
  switch (issue) {
    case "unsupported-type":
      return "Not a .md or .txt file — skipped. Nothing was read from it.";
    case "empty-file":
      return "The file had no text in it, so there is nothing to import.";
    case "too-large":
      return "Larger than 400 KB. Split it up before importing.";
    case "read-failed":
    default:
      return "The browser could not read this file. Try choosing it again.";
  }
}

export function hasAcceptedExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Filename rules. Boundaries matter: without \b, "research" contains "arc" and
 * would be filed as a plot thread. Order is the tie-breaker for names that hit
 * two rules.
 */
const nameRules: { kind: ImportKind; test: RegExp; reason: string }[] = [
  { kind: "note", test: /\b(notes?|research|sources?|references?|ideas?)\b/i, reason: "filename mentions notes or research" },
  { kind: "character", test: /\b(characters?|cast|protagonist|villain|dramatis)\b/i, reason: "filename mentions characters" },
  { kind: "plot", test: /\b(plots?|subplots?|threads?|arcs?|outlines?)\b/i, reason: "filename mentions plot" },
  { kind: "event", test: /\b(timeline|chronolog\w*|calendar|dates?)\b/i, reason: "filename mentions a timeline" },
  { kind: "world", test: /\b(world\w*|settings?|magic|lore|geograph\w*|technolog\w*|rules?)\b/i, reason: "filename mentions worldbuilding" },
  { kind: "scene", test: /\b(scenes?|chapters?|ch[-_ ]?\d+|drafts?|manuscript|prose)\b/i, reason: "filename looks like manuscript text" },
];

const headingRules: { kind: ImportKind; test: RegExp; reason: string }[] = [
  { kind: "character", test: /^(character|cast)\b/i, reason: "first heading names a character section" },
  { kind: "plot", test: /^(plot|subplot|thread)\b/i, reason: "first heading names a plot" },
  { kind: "event", test: /^(timeline|chronology)\b/i, reason: "first heading names a timeline" },
  { kind: "world", test: /^(world|setting|magic|lore)\b/i, reason: "first heading names worldbuilding" },
  { kind: "scene", test: /^(chapter|scene|part)\b/i, reason: "first heading looks like a chapter or scene" },
];

export function wordsIn(text: string) {
  const cleaned = text.replace(/\[[^\]]*\]/g, " ").trim();
  return cleaned ? cleaned.split(/\s+/).length : 0;
}

function titleFromName(fileName: string) {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split a plain-text or Markdown document into a suggested title, body, heading
 * list and classification. Pure function — easy to reason about and to test.
 */
export function scanDocument(fileName: string, text: string, size = 0, key = fileName): ScannedFile {
  const lines = text.split(/\r?\n/);
  const headings = lines
    .filter((l) => /^#{1,4}\s+\S/.test(l))
    .map((l) => l.replace(/^#{1,4}\s+/, "").trim())
    .slice(0, 12);

  const headingIndex = lines.findIndex((l) => /^#{1,4}\s+\S/.test(l));
  const rawTitle = headingIndex >= 0 ? headings[0] : titleFromName(fileName);
  const body =
    headingIndex >= 0 ? lines.slice(headingIndex + 1).join("\n").trim() : text.trim();

  let kind: ImportKind = "note";
  let reason = "no filename or heading signal — filed as a research note";

  const headingMatch = headings[0] ? headingRules.find((r) => r.test.test(headings[0])) : undefined;
  const nameMatch = nameRules.find((r) => r.test.test(fileName));
  if (headingMatch) {
    kind = headingMatch.kind;
    reason = headingMatch.reason;
  } else if (nameMatch) {
    kind = nameMatch.kind;
    reason = nameMatch.reason;
  } else if (wordsIn(body) > 400) {
    kind = "scene";
    reason = "over 400 words of continuous text — offered as a draft-zero scene";
  }

  return {
    key,
    fileName,
    size: size || new TextEncoder().encode(text).length,
    title: rawTitle || titleFromName(fileName) || "Untitled import",
    body,
    kind,
    reason,
    headings,
    words: wordsIn(body),
    include: true,
    issue: text.trim().length === 0 ? "empty-file" : undefined,
  };
}

/** Three fixed documents used by the “Use sample files” path. */
export const sampleFiles: { fileName: string; text: string }[] = [
  {
    fileName: "characters-ada-mireille.md",
    text: `# Ada Mireille\n\nSpeaks in measurements. Says "roughly" when she means "I refuse to guess".\nKeeps her own paper copies of everything the agency files digitally.\n`,
  },
  {
    fileName: "chapter-02-the-kitchen.txt",
    text: `Ruth had already laid the table when Ada came in with the printout, which meant\nthe argument would be a polite one.\n\n"Say it in one sentence," Ruth said.\n\nAda tried, twice, and both times it came out sounding like weather.\n`,
  },
  {
    fileName: "research-tide-gauge-failures.md",
    text: `# How tide gauges fail\n\nStilling wells silt up. Floats stick. Datums shift after storm surges.\nAny of these can mask a repeating signal for months.\n`,
  },
];
