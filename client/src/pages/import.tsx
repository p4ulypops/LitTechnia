/**
 * Import wizard — choose files, review what was detected, then confirm.
 *
 * Files are read in the browser and shown to you before anything is created.
 * Titles and classifications are suggested by plain filename and heading rules
 * (see lib/import-scan.ts) and every one of them is editable. Nothing is
 * generated, rewritten or summarised, and nothing is uploaded.
 */
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowRight, Check, Eye, FileUp, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, Panel, StatusPill } from "@/components/fields";
import { kindLabels, kindRoutes, useLibrary, useSnapshot, useStoryActions, useWorkspace } from "@/lib/workspace";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_BYTES,
  hasAcceptedExtension,
  issueMessage,
  kindOptions,
  sampleFiles,
  scanDocument,
  type ScannedFile,
} from "@/lib/import-scan";
import type { ImportKind, ImportResult } from "@shared/schema";

type Stage = "choose" | "review" | "done";

export default function ImportPage() {
  const { activeProjectId } = useWorkspace();
  const { data: library } = useLibrary();
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("choose");
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openPreview, setOpenPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const book = library?.projects.find((p) => p.id === activeProjectId);
  const importable = files.filter((f) => f.include && !f.issue);
  const skipped = files.filter((f) => f.issue);

  const scanAll = async (list: File[]) => {
    setError(null);
    const scanned: ScannedFile[] = [];
    for (let index = 0; index < list.length; index += 1) {
      const file = list[index];
      const key = `${index}-${file.name}`;
      if (!hasAcceptedExtension(file.name)) {
        scanned.push({
          ...scanDocument(file.name, "", file.size, key),
          include: false,
          issue: "unsupported-type",
        });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        scanned.push({
          ...scanDocument(file.name, "", file.size, key),
          include: false,
          issue: "too-large",
        });
        continue;
      }
      try {
        const text = await file.text();
        const doc = scanDocument(file.name, text, file.size, key);
        scanned.push({ ...doc, include: !doc.issue });
      } catch {
        scanned.push({
          ...scanDocument(file.name, "", file.size, key),
          include: false,
          issue: "read-failed",
        });
      }
    }
    if (scanned.length === 0) {
      setError("No files were chosen, so there is nothing to review.");
      return;
    }
    setFiles(scanned);
    setResult(null);
    setStage("review");
  };

  const useSamples = () => {
    setError(null);
    const scanned = sampleFiles.map((f, index) =>
      scanDocument(f.fileName, f.text, 0, `sample-${index}-${f.fileName}`),
    );
    setFiles(scanned);
    setResult(null);
    setStage("review");
  };

  const patchFile = (key: string, patch: Partial<ScannedFile>) =>
    setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const confirm = async () => {
    if (!activeProjectId) return;
    if (importable.length === 0) {
      setError("Nothing is ticked, so nothing would be imported.");
      return;
    }
    const untitled = importable.find((f) => !f.title.trim());
    if (untitled) {
      setError(`“${untitled.fileName}” needs a title before it can be imported.`);
      return;
    }
    setError(null);
    try {
      const outcome = await actions.importItems(
        importable.map((f) => ({
          kind: f.kind,
          title: f.title.trim(),
          body: f.body,
          fileName: f.fileName,
        })),
      );
      setResult(outcome);
      setStage("done");
    } catch (e) {
      setError(
        e instanceof Error
          ? `The import did not complete: ${e.message}. Nothing partial was left behind on your side of the review.`
          : "The import did not complete.",
      );
    }
  };

  const startOver = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setOpenPreview(null);
    setStage("choose");
  };

  const stageLabel: Record<Stage, string> = {
    choose: "Step 1 of 3 · choose files",
    review: "Step 2 of 3 · review what was detected",
    done: "Step 3 of 3 · imported",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="max-w-2xl">
        <p className="eyebrow">Material · import</p>
        <h1 className="font-serif text-xl font-medium leading-tight">Bring in work you already wrote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Markdown and plain text only. Files are read in your browser, shown to you, classified by
          simple filename and heading rules you can override, and only then turned into records.
        </p>
        <p className="mt-2 text-sm" data-testid="text-import-target-book">
          Everything imported lands in{" "}
          <strong className="font-medium">{book?.title ?? "the open book"}</strong> and in no other
          book.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Import progress" data-testid="list-import-steps">
        {(["choose", "review", "done"] as Stage[]).map((s) => (
          <li key={s}>
            <StatusPill
              label={stageLabel[s]}
              tone={s === stage ? "accent" : "quiet"}
              testId={`status-step-${s}`}
            />
          </li>
        ))}
      </ol>

      {error && (
        <p
          className="flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-sm"
          role="alert"
          data-testid="text-import-error"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <span>{error}</span>
        </p>
      )}

      {stage === "choose" && (
        <Panel eyebrow="Step 1" title="Choose files" testId="panel-import">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".md,.markdown,.txt,.text,text/markdown,text/plain"
            className="sr-only"
            aria-label="Choose Markdown or text files to import"
            data-testid="input-import-file"
            onChange={async (e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (list.length === 0) {
                setError("No files were chosen, so there is nothing to review.");
                return;
              }
              await scanAll(list);
            }}
          />
          <p className="text-sm text-muted-foreground" data-testid="text-import-idle">
            Accepted: {ACCEPTED_EXTENSIONS.join(", ")}, up to 400 KB each, up to 50 at a time. Nothing
            leaves your machine and nothing is created until you confirm.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => inputRef.current?.click()} data-testid="button-import-choose">
              <FileUp className="mr-1.5 h-4 w-4" /> Choose files
            </Button>
            <Button variant="secondary" onClick={useSamples} data-testid="button-import-sample">
              Use three sample files instead
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The sample path exists so the review stage can be tried (or tested) in environments where
            the browser file picker is unavailable. The samples are fixed text files in the app
            source, not generated content.
          </p>
        </Panel>
      )}

      {stage === "review" && (
        <Panel
          eyebrow="Step 2"
          title={`${files.length} file${files.length === 1 ? "" : "s"} detected · ${importable.length} ticked to import`}
          testId="panel-import-review"
          actions={
            <Button variant="ghost" size="sm" onClick={startOver} data-testid="button-import-startover">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start again
            </Button>
          }
        >
          {files.length === 0 ? (
            <EmptyState
              title="Nothing detected"
              body="No readable files came through. Choose some files to review."
              testId="empty-import-review"
            />
          ) : (
            <ul className="space-y-3">
              {files.map((file, index) => (
                <li
                  key={file.key}
                  className="rounded-sm border border-border p-3"
                  data-testid={`row-import-${index}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground" data-testid={`text-import-filename-${index}`}>
                        {file.fileName} · {(file.size / 1024).toFixed(1)} KB · {file.words.toLocaleString()} words
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground" data-testid={`text-import-reason-${index}`}>
                        {file.issue ? issueMessage(file.issue) : `Suggestion: ${file.reason}`}
                      </p>
                    </div>
                    {file.issue ? (
                      <StatusPill label="skipped" tone="quiet" testId={`status-import-skipped-${index}`} />
                    ) : (
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={file.include}
                          onCheckedChange={(checked) => patchFile(file.key, { include: Boolean(checked) })}
                          data-testid={`checkbox-import-include-${index}`}
                          aria-label={`Import ${file.fileName}`}
                        />
                        <span>Import this one</span>
                      </label>
                    )}
                  </div>

                  {!file.issue && (
                    <>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="space-y-1.5">
                          <Label htmlFor={`import-title-${index}`} className="eyebrow">
                            Title
                          </Label>
                          <Input
                            id={`import-title-${index}`}
                            value={file.title}
                            data-testid={`input-import-title-${index}`}
                            onChange={(e) => patchFile(file.key, { title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <p className="eyebrow">Import as</p>
                          <Select
                            value={file.kind}
                            onValueChange={(v) => patchFile(file.key, { kind: v as ImportKind })}
                          >
                            <SelectTrigger
                              data-testid={`select-import-kind-${index}`}
                              aria-label={`Classification for ${file.fileName}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {kindOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  data-testid={`option-import-${option.value}-${index}`}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground" data-testid={`text-import-lands-${index}`}>
                        Lands in: {kindOptions.find((o) => o.value === file.kind)?.lands}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`button-import-preview-${index}`}
                          onClick={() => setOpenPreview(openPreview === file.key ? null : file.key)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          {openPreview === file.key ? "Hide text" : "Preview text"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`button-import-remove-${index}`}
                          onClick={() => setFiles((prev) => prev.filter((f) => f.key !== file.key))}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove from list
                        </Button>
                      </div>

                      {openPreview === file.key && (
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-sm border border-border bg-background/60 p-3">
                          {file.headings.length > 1 && (
                            <p className="mb-2 text-xs text-muted-foreground">
                              Headings found: {file.headings.join(" · ")}
                            </p>
                          )}
                          <pre
                            className="whitespace-pre-wrap font-prose text-sm leading-relaxed"
                            data-testid={`text-import-preview-${index}`}
                          >
                            {file.body.slice(0, 2000) || "(no body text under the first heading)"}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {skipped.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground" data-testid="text-import-skipped-count">
              {skipped.length} file{skipped.length === 1 ? "" : "s"} skipped and left untouched.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button
              onClick={confirm}
              disabled={actions.pending || importable.length === 0}
              data-testid="button-import-confirm"
            >
              <Check className="mr-1.5 h-4 w-4" /> Import {importable.length} item
              {importable.length === 1 ? "" : "s"} into {book?.title ?? "this book"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Nothing has been created yet. This is the last step you can undo by walking away.
            </span>
          </div>
        </Panel>
      )}

      {stage === "done" && result && (
        <Panel eyebrow="Step 3" title="Imported" testId="panel-import-done">
          <p className="text-sm" role="status" data-testid="text-import-result">
            {result.created.length} item{result.created.length === 1 ? "" : "s"} imported into{" "}
            {book?.title ?? "the open book"}. They appear only in this book.
          </p>
          <ul className="mt-3 space-y-2">
            {result.created.map((row, index) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2 text-sm" data-testid={`row-imported-${index}`}>
                <StatusPill label={kindLabels[row.kind]} tone="quiet" />
                <span className="font-medium">{row.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {row.words.toLocaleString()} words · from {row.fileName || "sample text"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-goto-imported-${index}`}
                  onClick={() => navigate(kindRoutes[row.kind])}
                >
                  Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Scenes arrive as draft-zero material under “Imported material”, so nothing you brought in
            is treated as finished. Notes arrive tagged “imported”. Everything else is marked as
            needing review. This book now holds {snapshot?.scenes.length ?? 0} scenes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={startOver} data-testid="button-import-again">
              <FileUp className="mr-1.5 h-4 w-4" /> Import more files
            </Button>
            <Button variant="ghost" onClick={() => navigate("/library")} data-testid="button-import-back-library">
              Back to the library
            </Button>
          </div>
        </Panel>
      )}

      <Panel eyebrow="What import does and does not do" title="Honest limits">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            Detection is a filename and heading heuristic, listed in full in
            <code> client/src/lib/import-scan.ts</code>. It is not clever, it is not a model, and it
            is always overridable in the review stage.
          </li>
          <li>
            Not supported here: .docx, .pdf, .rtf, Scrivener projects, folder trees, or images.
            Character and world files are imported as a single block of text for you to split up by
            hand.
          </li>
          <li>
            Imports go into the open book only. To import into a different book, switch books first —
            the wizard names its target above.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
