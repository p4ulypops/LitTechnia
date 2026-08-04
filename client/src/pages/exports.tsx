import { useState } from "react";
import { Check, ClipboardCopy, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListSkeleton, Panel, StatusPill } from "@/components/fields";
import { useLibrarySnapshots, useSnapshot } from "@/lib/workspace";
import {
  buildLibraryJson,
  copyText,
  downloadExport,
  downloadText,
  exportSpecs,
  slugify,
  type ExportKind,
  type ExportResult,
} from "@/lib/exporters";
import { LIBRARY_FORMAT_VERSION, SNAPSHOT_FORMAT_VERSION } from "@shared/schema";

const order: ExportKind[] = ["markdown", "html", "narration", "json"];

export default function ExportsPage() {
  const { data: snapshot, isLoading } = useSnapshot();
  const { data: libraryData } = useLibrarySnapshots();
  const [last, setLast] = useState<ExportResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExportKind | null>(null);

  if (isLoading || !snapshot) {
    return (
      <div className="mx-auto max-w-5xl">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  const previewText = preview ? exportSpecs[preview].build(snapshot) : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="max-w-2xl">
        <p className="eyebrow">Material</p>
        <h1 className="font-serif text-xl font-medium leading-tight">Exports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything here is built in your browser from the book you can see. No account, no
          watermark, no licence claim over your words.
        </p>
        <p className="mt-3 rounded-sm border border-border px-3 py-2 text-sm" data-testid="text-export-scope">
          Scope: the four exports below contain{" "}
          <strong className="font-medium">{snapshot.project.title}</strong> only — no other book’s
          scenes, notes or links. Format id <code>{SNAPSHOT_FORMAT_VERSION}</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {order.map((kind) => {
          const spec = exportSpecs[kind];
          return (
            <Panel key={kind} testId={`panel-export-${kind}`} className="flex flex-col gap-3">
              <div>
                <p className="eyebrow">.{spec.extension}</p>
                <h2 className="font-serif text-base leading-tight">{spec.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{spec.description}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setLast(downloadExport(snapshot, kind))}
                  data-testid={`button-export-${kind}`}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  data-testid={`button-copy-${kind}`}
                  onClick={async () => {
                    const ok = await copyText(spec.build(snapshot));
                    setCopied(ok ? kind : `${kind}-failed`);
                    window.setTimeout(() => setCopied(null), 2500);
                  }}
                >
                  <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" /> Copy text
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreview(preview === kind ? null : kind)}
                  data-testid={`button-preview-${kind}`}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> {preview === kind ? "Hide" : "Preview"}
                </Button>
                {copied === kind && (
                  <span
                    className="flex items-center gap-1 text-xs text-primary"
                    role="status"
                    data-testid={`text-copied-${kind}`}
                  >
                    <Check className="h-3 w-3" /> copied to clipboard
                  </span>
                )}
                {copied === `${kind}-failed` && (
                  <span
                    className="text-xs text-muted-foreground"
                    role="status"
                    data-testid={`text-copyfailed-${kind}`}
                  >
                    clipboard blocked — use Preview and select the text
                  </span>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      {last && (
        <Panel eyebrow="Last export" title={last.fileName} testId="panel-export-confirmation">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusPill
              label={last.downloaded ? "download triggered" : "download blocked"}
              tone={last.downloaded ? "accent" : "quiet"}
              testId="status-export-download"
            />
            <span data-testid="text-export-detail">
              {last.label ?? exportSpecs[last.kind].label} · {last.bytes.toLocaleString()} bytes · {last.at} ·{" "}
              {last.method}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            If your browser sandbox blocks file downloads, the same text is available above with
            Preview and Copy text, so the export is never trapped inside the app.
          </p>
          <pre
            className="mt-3 max-h-48 overflow-auto rounded-sm border border-border bg-background/60 p-3 font-mono text-xs"
            data-testid="text-export-head"
          >
            {last.text.slice(0, 800)}
          </pre>
        </Panel>
      )}

      {preview && (
        <Panel
          eyebrow="Preview"
          title={`${exportSpecs[preview].label} — first 4,000 characters`}
          testId="panel-export-preview"
        >
          <textarea
            readOnly
            value={previewText.slice(0, 4000)}
            aria-label={`${exportSpecs[preview].label} preview text`}
            data-testid="text-export-preview"
            className="h-64 w-full resize-y rounded-sm border border-border bg-background/60 p-3 font-mono text-xs"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Select all and copy if you prefer to move the text by hand.
          </p>
        </Panel>
      )}

      <Panel
        eyebrow="Whole library"
        title="Every book in one JSON file"
        testId="panel-export-library"
      >
        <p className="text-sm text-muted-foreground">
          The library snapshot carries every book in this session, archived ones included, each as its
          own entry in <code>projects[]</code> with its own id and its own records. Format id{" "}
          <code>{LIBRARY_FORMAT_VERSION}</code>.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={!libraryData}
            data-testid="button-export-library-json"
            onClick={() =>
              libraryData &&
              setLast(
                downloadText(
                  "wordsmithery-library.json",
                  "application/json",
                  buildLibraryJson(libraryData.projects),
                ),
              )
            }
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download library snapshot
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!libraryData}
            data-testid="button-copy-library-json"
            onClick={async () => {
              if (!libraryData) return;
              const ok = await copyText(buildLibraryJson(libraryData.projects));
              setCopied(ok ? "library" : "library-failed");
              window.setTimeout(() => setCopied(null), 2500);
            }}
          >
            <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" /> Copy text
          </Button>
          <span className="font-mono text-xs text-muted-foreground" data-testid="text-library-book-count">
            {libraryData ? `${libraryData.projects.length} books included` : "reading library…"}
          </span>
          {copied === "library" && (
            <span className="flex items-center gap-1 text-xs text-primary" role="status" data-testid="text-copied-library">
              <Check className="h-3 w-3" /> copied to clipboard
            </span>
          )}
          {copied === "library-failed" && (
            <span className="text-xs text-muted-foreground" role="status" data-testid="text-copyfailed-library">
              clipboard blocked — use the per-book Preview instead
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Per-book Markdown, HTML and narration exports stay per-book on purpose: a manuscript file
          holding several books at once would be a mess to read and to re-import. Files are named from
          the book title, e.g. <code>{slugify(snapshot.project.title)}-markdown.md</code>.
        </p>
      </Panel>

      <Panel eyebrow="What this proves, and what it doesn't" title="Honest limits">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            Proven here: Markdown, HTML, narration text and a documented JSON snapshot are generated
            from live project data, entirely client-side.
          </li>
          <li>
            Also proven: project boundaries survive export. Every record carries its
            <code> projectId</code>, and the single-book file states which project it holds.
          </li>
          <li>
            Not proven here: writing a folder tree to your disk, DOCX and PDF typesetting fidelity,
            encrypted-at-rest storage, durable storage of any kind in the browser, and syncing between
            devices. Those need the desktop build.
          </li>
          <li>
            Both JSON snapshots carry a format id, a <code>scope</code> field and a documentation
            block so a future importer — ours or yours — can read them without guesswork.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
