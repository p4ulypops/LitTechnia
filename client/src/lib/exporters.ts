/**
 * Client-side exporters. Everything is built in the browser from the project
 * snapshot, so an export never depends on a server round trip or an account.
 *
 * Formats: Markdown manuscript, clean semantic HTML, narration script (plain
 * text), a documented JSON snapshot of the selected book, and a documented JSON
 * snapshot of the whole library.
 *
 * Scope is always explicit: the four per-book exports contain the selected book
 * and nothing else; the library export contains every book, each under its own
 * `projects[]` entry with its own id.
 */
import {
  LIBRARY_FORMAT_VERSION,
  SNAPSHOT_FORMAT_VERSION,
  type ProjectSnapshot,
} from "@shared/schema";
import { exportableAttachments } from "@shared/media";

export type ExportKind = "markdown" | "html" | "narration" | "json" | "rss" | "atom";

const parseList = (json: string): string[] => {
  try {
    const value = JSON.parse(json || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
};

function orderedScenes(snapshot: ProjectSnapshot) {
  return [...snapshot.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
}

function groupByChapter(snapshot: ProjectSnapshot) {
  const chapters: { chapter: string; scenes: ProjectSnapshot["scenes"] }[] = [];
  for (const scene of orderedScenes(snapshot)) {
    const last = chapters[chapters.length - 1];
    if (last && last.chapter === scene.chapter) last.scenes.push(scene);
    else chapters.push({ chapter: scene.chapter, scenes: [scene] });
  }
  return chapters;
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function buildMarkdown(snapshot: ProjectSnapshot): string {
  const { project } = snapshot;
  const lines: string[] = [
    `---`,
    `title: ${project.title}`,
    `subtitle: ${project.subtitle}`,
    `author: ${project.author}`,
    `format: ${SNAPSHOT_FORMAT_VERSION}`,
    `---`,
    ``,
    `# ${project.title}`,
    ``,
    project.subtitle ? `*${project.subtitle}*` : "",
    ``,
  ];

  for (const { chapter, scenes } of groupByChapter(snapshot)) {
    lines.push(`## ${chapter}`, ``);
    for (const scene of scenes) {
      lines.push(`### ${scene.title}`, ``);
      if (scene.draftZero) {
        lines.push(`> Draft zero material — private by default.`, ``);
      }
      lines.push(scene.content.trim() || `*(not written yet)*`, ``);
    }
  }
  return lines.join("\n");
}

export function buildHtml(snapshot: ProjectSnapshot): string {
  const { project } = snapshot;
  const body = groupByChapter(snapshot)
    .map(({ chapter, scenes }) => {
      const inner = scenes
        .map((scene) => {
          const paragraphs = scene.content
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => `      <p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
            .join("\n");
          return `    <section>\n      <h3>${escapeHtml(scene.title)}</h3>\n${
            paragraphs || "      <p><em>(not written yet)</em></p>"
          }\n    </section>`;
        })
        .join("\n");
      return `  <section>\n    <h2>${escapeHtml(chapter)}</h2>\n${inner}\n  </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(project.title)}</title>
    <meta name="author" content="${escapeHtml(project.author)}" />
  </head>
  <body>
  <article>
  <h1>${escapeHtml(project.title)}</h1>
${project.subtitle ? `  <p><em>${escapeHtml(project.subtitle)}</em></p>` : ""}
${body}
  </article>
  </body>
</html>
`;
}

export function buildNarration(snapshot: ProjectSnapshot): string {
  const { project } = snapshot;
  const out: string[] = [
    `NARRATION SCRIPT`,
    `${project.title.toUpperCase()}`,
    project.subtitle ? project.subtitle : "",
    `Author: ${project.author || "(unnamed)"}`,
    ``,
    `Notes for the narrator: speaker labels below are only those the author entered.`,
    `Nothing in this script was generated for you.`,
    ``,
  ];

  for (const { chapter, scenes } of groupByChapter(snapshot)) {
    out.push(`==== ${chapter.toUpperCase()} ====`, ``);
    for (const scene of scenes) {
      out.push(`-- SCENE: ${scene.title} --`);
      if (scene.pov) out.push(`[point of view: ${scene.pov}]`);
      out.push(``, scene.content.trim() || `[no text recorded for this scene]`, ``);
    }
  }
  return out.join("\n");
}

/**
 * Scenes eligible for the RSS/Atom feed: marked "Ready to read" and not
 * draft-zero material, which is private by default and never syndicated.
 */
function feedScenes(snapshot: ProjectSnapshot) {
  return orderedScenes(snapshot).filter(
    (scene) => scene.status === "ready" && scene.draftZero !== 1,
  );
}

function feedChannelLink(): string {
  return typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://littechnia.com";
}

/**
 * RSS 2.0 feed, built entirely in the browser from the live snapshot -- no
 * account, no server round trip. There is no per-scene timestamp in this
 * prototype's schema, so every item shares one "generated at" pubDate rather
 * than a fabricated distinct one; the Connections page says so explicitly.
 * Item guids are non-permalink (isPermaLink="false") because this feed is
 * not hosted at a stable public URL by LitTechnia itself -- the author hosts
 * or hands off the generated file.
 */
export function buildRss(snapshot: ProjectSnapshot): string {
  const { project } = snapshot;
  const scenes = feedScenes(snapshot);
  const generatedAt = new Date().toUTCString();
  const channelLink = feedChannelLink();
  const items = scenes
    .map(
      (scene) => `    <item>
      <title>${escapeHtml(scene.title)}</title>
      <guid isPermaLink="false">urn:littechnia:scene:${escapeHtml(project.id)}:${escapeHtml(scene.id)}</guid>
      <pubDate>${generatedAt}</pubDate>
      <description>${escapeHtml(scene.content.trim() || "(not written yet)")}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(project.title)}</title>
    <link>${escapeHtml(channelLink)}</link>
    <description>${escapeHtml(project.subtitle || `${project.title} — a book in progress on LitTechnia.`)}</description>
    <generator>LitTechnia</generator>
    <lastBuildDate>${generatedAt}</lastBuildDate>
${items || '    <!-- No scenes are marked "Ready to read" yet, so this feed has no items. -->'}
  </channel>
</rss>
`;
}

/**
 * Atom 1.0 feed, same scope and same single-timestamp honesty note as the
 * RSS build above.
 */
export function buildAtom(snapshot: ProjectSnapshot): string {
  const { project } = snapshot;
  const scenes = feedScenes(snapshot);
  const generatedAt = new Date().toISOString();
  const channelLink = feedChannelLink();
  const entries = scenes
    .map(
      (scene) => `  <entry>
    <title>${escapeHtml(scene.title)}</title>
    <id>urn:littechnia:scene:${escapeHtml(project.id)}:${escapeHtml(scene.id)}</id>
    <updated>${generatedAt}</updated>
    <content type="text">${escapeHtml(scene.content.trim() || "(not written yet)")}</content>
  </entry>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeHtml(project.title)}</title>
  <id>urn:littechnia:project:${escapeHtml(project.id)}</id>
  <updated>${generatedAt}</updated>
  <link href="${escapeHtml(channelLink)}" />
  <generator>LitTechnia</generator>
${entries || '  <!-- No scenes are marked "Ready to read" yet, so this feed has no entries. -->'}
</feed>
`;
}

/** One book's records, with JSON list fields decoded. */
function projectPayload(snapshot: ProjectSnapshot) {
  return {
    project: snapshot.project,
    scenes: orderedScenes(snapshot),
    characters: snapshot.characters,
    plots: snapshot.plots.map((p) => ({
      ...p,
      setups: parseList(p.setups),
      payoffs: parseList(p.payoffs),
    })),
    events: [...snapshot.events].sort((a, b) => a.orderIndex - b.orderIndex),
    world: snapshot.world,
    notes: snapshot.notes.map((n) => ({ ...n, tags: parseList(n.tags) })),
    links: snapshot.links,
    /* Sub-PRD A: real-world-reference photos and every privateNote are
       stripped by default. The filter is a one-line predicate on `role` —
       see exportableAttachments in shared/media.ts. */
    attachments: exportableAttachments(snapshot.attachments),
    checklist: snapshot.checklist,
    /* v0.3: portable authored data. Feed definitions and the activity trail are
       operational/publication state and are deliberately not exported. */
    aliases: snapshot.aliases,
    comments: snapshot.comments,
    captureItems: snapshot.captureItems,
  };
}

const commonDocs = {
  idPolicy: "All references use stable string ids, never filenames.",
  projectBoundary:
    "Every record carries projectId. Records never reference an id in another project, so a single book can be lifted out or dropped in whole.",
  lists: "plots[].setups, plots[].payoffs and notes[].tags are JSON-encoded string arrays in the app and decoded arrays in this export.",
  operationalStateExcluded:
    "Feed definitions and the activity trail are publication/operational state, not authored content, so they are not part of this export.",
  mediaPolicy:
    "Real-world-reference photos (attachments[].role === \"real_world_ref\") and every attachments[].privateNote are private to the author and are excluded from this export by default. Binary media bytes travel in the portable .zip export, not in this JSON document.",
  unsupportedInPrototype: [
    "Binary media is not embedded in JSON: attachments[] records file name, type, size and provenance metadata only. Use the portable .zip export for the files themselves.",
    "attachments[].privateNote is a private field for real-world references and is not intended for publication.",
    "Version history is not included in this prototype export.",
    "This export is produced in the browser. The prototype has no filesystem sync, no encryption at rest and no durable browser storage.",
  ],
};

/**
 * Documented JSON snapshot of the SELECTED book only. Field names mirror
 * shared/schema.ts.
 */
export function buildJson(snapshot: ProjectSnapshot): string {
  const payload = {
    format: SNAPSHOT_FORMAT_VERSION,
    scope: "selected-project",
    exportedAt: new Date().toISOString(),
    documentation: {
      about:
        "LitTechnia portable snapshot of one book. Authored prose lives in scenes[].content as Markdown-compatible text. Relationships are explicit rows in links[] so no data is hidden in a proprietary structure.",
      scopeNote: `Contains only the project "${snapshot.project.id}". For every book at once, use the ${LIBRARY_FORMAT_VERSION} library export.`,
      ...commonDocs,
    },
    ...projectPayload(snapshot),
  };
  return JSON.stringify(payload, null, 2);
}

/** Documented JSON snapshot of EVERY book in the library, archived included. */
export function buildLibraryJson(snapshots: ProjectSnapshot[]): string {
  const payload = {
    format: LIBRARY_FORMAT_VERSION,
    scope: "library",
    exportedAt: new Date().toISOString(),
    documentation: {
      about:
        "LitTechnia portable library snapshot: every book in the session, archived ones included, each as its own entry in projects[].",
      scopeNote: `Each projects[] entry has the same shape as the ${SNAPSHOT_FORMAT_VERSION} single-book export, minus its envelope. project.archived is 1 for shelved books.`,
      ...commonDocs,
    },
    projectCount: snapshots.length,
    projects: snapshots.map(projectPayload),
  };
  return JSON.stringify(payload, null, 2);
}

export const exportSpecs: Record<
  ExportKind,
  { label: string; description: string; extension: string; mime: string; build: (s: ProjectSnapshot) => string }
> = {
  markdown: {
    label: "Markdown manuscript",
    description: "One file, chapter and scene headings, front matter. Opens in any editor.",
    extension: "md",
    mime: "text/markdown",
    build: buildMarkdown,
  },
  html: {
    label: "Clean HTML manuscript",
    description: "Semantic headings and paragraphs only — no styling to fight with on paste.",
    extension: "html",
    mime: "text/html",
    build: buildHtml,
  },
  narration: {
    label: "Narration script",
    description: "Plain text with chapter, scene and point-of-view markers for recording.",
    extension: "txt",
    mime: "text/plain",
    build: buildNarration,
  },
  json: {
    label: "JSON project snapshot",
    description: "Documented, versioned structure: every record, field and link.",
    extension: "json",
    mime: "application/json",
    build: buildJson,
  },
  rss: {
    label: "RSS 2.0 feed",
    description: "Scenes marked \"Ready to read\" only. No account, generated in your browser.",
    extension: "xml",
    mime: "application/rss+xml",
    build: buildRss,
  },
  atom: {
    label: "Atom 1.0 feed",
    description: "Scenes marked \"Ready to read\" only. No account, generated in your browser.",
    extension: "xml",
    mime: "application/atom+xml",
    build: buildAtom,
  },
};

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type ExportResult = {
  kind: ExportKind;
  /** Overrides the format label in the confirmation panel (used by the library export). */
  label?: string;
  fileName: string;
  bytes: number;
  at: string;
  downloaded: boolean;
  method: string;
  text: string;
};

/**
 * Trigger a real browser download. Sandboxed previews can block the download
 * attribute, so the caller always shows the text in-app as a fallback and the
 * result reports whether the download call succeeded.
 */
export function downloadExport(snapshot: ProjectSnapshot, kind: ExportKind): ExportResult {
  const spec = exportSpecs[kind];
  const text = spec.build(snapshot);
  const fileName = `${slugify(snapshot.project.title)}-${kind}.${spec.extension}`;
  let downloaded = false;
  let method = "in-app preview only";
  try {
    const blob = new Blob([text], { type: `${spec.mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    downloaded = true;
    method = "browser download";
  } catch {
    downloaded = false;
  }
  return {
    kind,
    fileName,
    bytes: new TextEncoder().encode(text).length,
    at: new Date().toLocaleTimeString(),
    downloaded,
    method,
    text,
  };
}

/** Same download attempt as above, for text that is not scoped to one book. */
export function downloadText(
  fileName: string,
  mime: string,
  text: string,
  label = "Library snapshot (all books)",
): ExportResult {
  let downloaded = false;
  let method = "in-app preview only";
  try {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    downloaded = true;
    method = "browser download";
  } catch {
    downloaded = false;
  }
  return {
    kind: "json",
    label,
    fileName,
    bytes: new TextEncoder().encode(text).length,
    at: new Date().toLocaleTimeString(),
    downloaded,
    method,
    text,
  };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
