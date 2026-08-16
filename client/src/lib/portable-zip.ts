/**
 * Portable project export (.zip) — Sub-PRD A.
 *
 * The JSON snapshot export carries attachment *metadata* only; this zip is
 * the shape that also carries the bytes. Layout:
 *
 *   <book>.zip
 *     project.json          the documented littechnia-project/0.3 snapshot
 *     files/<id>/<name>     original bytes of every exportable attachment
 *
 * The exclusion rule is the same one-line predicate as every other export:
 * `attachment.role !== "real_world_ref"`. Real-world-reference photos and
 * every privateNote stay on the author's machine, by default, always.
 */
import JSZip from "jszip";
import type { Attachment, ProjectSnapshot } from "@shared/schema";
import { isExportableAttachment } from "@shared/media";
import { buildJson, slugify } from "./exporters";

/** Attachments whose bytes belong in the zip: exportable AND actually stored. */
export function portableFileAttachments(snapshot: ProjectSnapshot): Attachment[] {
  return snapshot.attachments.filter(
    (a) => isExportableAttachment(a) && a.storageKey && a.size > 0,
  );
}

export type PortableFileMap = Map<string, Uint8Array>;

/**
 * Fetch the original bytes for every exportable attachment. The fetcher is
 * injectable so tests (and future desktop builds) can supply bytes without a
 * network. Failures are skipped rather than fatal: a missing file must not
 * sink the whole export, and project.json still records the attachment.
 */
export async function collectPortableFiles(
  snapshot: ProjectSnapshot,
  fetcher?: (attachment: Attachment) => Promise<Uint8Array | null>,
): Promise<PortableFileMap> {
  const files: PortableFileMap = new Map();
  const fetchOne =
    fetcher ??
    (async (attachment: Attachment) => {
      const res = await fetch(
        `/api/projects/${snapshot.project.id}/attachments/${attachment.id}/content`,
        { credentials: "same-origin" },
      );
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    });
  for (const attachment of portableFileAttachments(snapshot)) {
    try {
      const bytes = await fetchOne(attachment);
      if (bytes) files.set(attachment.id, bytes);
    } catch {
      /* a missing file never sinks the export */
    }
  }
  return files;
}

/**
 * Build the zip. `files` maps attachment id -> original bytes; ids that fail
 * the export predicate are dropped even if bytes were supplied, so the
 * real-world-reference rule cannot be bypassed by the caller.
 */
export async function buildPortableZip(
  snapshot: ProjectSnapshot,
  files: PortableFileMap,
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("project.json", buildJson(snapshot));
  const exportable = new Set(
    snapshot.attachments.filter(isExportableAttachment).map((a) => a.id),
  );
  for (const attachment of snapshot.attachments) {
    if (!exportable.has(attachment.id)) continue;
    const bytes = files.get(attachment.id);
    if (!bytes) continue;
    zip.file(`files/${attachment.id}/${attachment.fileName || "file"}`, bytes);
  }
  return zip.generateAsync({ type: "uint8array", compression: "STORE" });
}

/** Trigger a browser download of the portable zip. Mirrors downloadExport. */
export async function downloadPortableZip(snapshot: ProjectSnapshot): Promise<{
  fileName: string;
  bytes: number;
  fileCount: number;
  downloaded: boolean;
}> {
  const files = await collectPortableFiles(snapshot);
  const zip = await buildPortableZip(snapshot, files);
  const fileName = `${slugify(snapshot.project.title)}-portable.zip`;
  let downloaded = false;
  try {
    const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
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
  } catch {
    downloaded = false;
  }
  return { fileName, bytes: zip.length, fileCount: files.size, downloaded };
}
