import { useLocation } from "wouter";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityWorkspace } from "@/components/entity-workspace";
import { Field, Panel, StatusPill } from "@/components/fields";
import { lenses } from "@/components/craft-lens";
import { useLibrary, useSnapshot, useStoryActions, useWorkspace } from "@/lib/workspace";
import type { Note } from "@shared/schema";

/**
 * Pointer to the import wizard. The wizard itself lives at /#/import so the
 * scan and review stages have room, and so it can be reached from the library.
 */
function ImportPointer() {
  const [, navigate] = useLocation();
  const { activeProjectId } = useWorkspace();
  const { data: library } = useLibrary();
  const book = library?.projects.find((p) => p.id === activeProjectId);
  const imported = (useSnapshot().data?.notes ?? []).filter((n) => n.origin === "imported").length;

  return (
    <Panel
      eyebrow="Material · import"
      title="Bring in notes you already wrote"
      testId="panel-import-pointer"
      actions={
        <Button variant="secondary" onClick={() => navigate("/import")} data-testid="button-open-import-wizard">
          <FileUp className="mr-1.5 h-4 w-4" /> Open the import wizard
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground" data-testid="text-import-pointer">
        Markdown and text files are read in your browser, listed for review, and only created once you
        confirm — into <strong className="font-medium text-foreground">{book?.title ?? "the open book"}</strong>{" "}
        and no other book. {imported} note{imported === 1 ? "" : "s"} in this book came in that way.
      </p>
    </Panel>
  );
}

export default function ResearchPage() {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const rows = snapshot?.notes ?? [];

  const tagsOf = (note: Note) => {
    try {
      const value = JSON.parse(note.tags || "[]");
      return Array.isArray(value) ? value.map(String) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ImportPointer />
      <EntityWorkspace<Note>
        eyebrow="Material"
        title="Research"
        blurb="Notes, sources and half-thoughts. Raw material, not homework."
        lens={lenses.research}
        kind="note"
        collection="notes"
        rows={rows}
        label={(n) => n.title}
        sublabel={(n) => tagsOf(n).join(" · ") || "untagged"}
        badge={(n) =>
          n.origin === "imported" ? <StatusPill label="imported" tone="quiet" /> : undefined
        }
        newLabel="New note"
        newRecord={() => ({
          title: "Untitled note",
          body: "",
          tags: "[]",
          sourcePath: "",
          origin: "written",
        })}
        detail={(n) => (
          <>
            <Field
              label="Title"
              value={n.title}
              testId="input-note-title"
              onSave={(v) => actions.patch("notes", n.id, { title: v })}
            />
            <Field
              label="Note"
              value={n.body}
              testId="input-note-body"
              multiline
              prose
              rows={10}
              onSave={(v) => actions.patch("notes", n.id, { body: v })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Tags (comma separated)"
                value={tagsOf(n).join(", ")}
                testId="input-note-tags"
                onSave={(v) =>
                  actions.patch("notes", n.id, {
                    tags: JSON.stringify(
                      v
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    ),
                  })
                }
              />
              <Field
                label="Source"
                value={n.sourcePath}
                testId="input-note-source"
                placeholder="File name, book, interview…"
                onSave={(v) => actions.patch("notes", n.id, { sourcePath: v })}
              />
            </div>
          </>
        )}
      />
    </div>
  );
}
