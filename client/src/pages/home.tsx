import { useState } from "react";
import { useLocation } from "wouter";
import { Check, EyeOff, FileUp, Library, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, ListSkeleton, Panel, StatusPill } from "@/components/fields";
import { CraftLens, RestoreLensesButton, lenses } from "@/components/craft-lens";
import { useAuth } from "@/lib/auth";
import {
  entityName,
  kindLabels,
  manuscriptWords,
  readinessChecks,
  relatedLinks,
  sceneStatuses,
  useLibrary,
  useSnapshot,
  useStoryActions,
  useWorkspace,
  wordCount,
} from "@/lib/workspace";

/**
 * A brand-new account owns nothing, on purpose: no sample books, no other
 * author's material. This is the whole of the first-run experience — start a
 * book, or bring in what you already have.
 */
function FirstRun() {
  const [, navigate] = useLocation();
  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="status-no-books">
      <header>
        <p className="eyebrow">Welcome</p>
        <h1 className="mt-1 font-serif text-2xl leading-tight md:text-3xl">
          Your library is empty
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Nothing is here yet, and nothing is borrowed from anyone else. Start a book and
          LitTechnia will hold its manuscript, characters, plot threads, timeline, world notes and
          research in one place — without writing a word of it for you.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate("/library")} data-testid="button-firstrun-create">
          <Plus className="mr-1.5 h-4 w-4" /> Start your first book
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/import")}
          data-testid="button-firstrun-import"
        >
          <FileUp className="mr-1.5 h-4 w-4" /> Import files I already have
        </Button>
      </div>
      <Panel eyebrow="What happens next" title="Two honest notes">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            Importing never rewrites your files. It reads them, shows you what it thinks each one is,
            and files nothing until you confirm.
          </li>
          <li>
            You can export any book — or the whole library — as Markdown or JSON at any time from the
            Exports page.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

export default function HomePage() {
  const { data: snapshot, isLoading } = useSnapshot();
  const { data: library, isLoading: libraryLoading } = useLibrary();
  const actions = useStoryActions();
  const { user } = useAuth();
  const { openDraftZero, select } = useWorkspace();
  const [, navigate] = useLocation();
  const [newItem, setNewItem] = useState("");

  if (!libraryLoading && library && library.projects.length === 0) return <FirstRun />;

  if (isLoading || !snapshot) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <ListSkeleton rows={5} />
      </div>
    );
  }

  const { project, scenes, characters, plots, events, world, notes } = snapshot;
  const isEmptyBook = scenes.length === 0 && characters.length === 0 && notes.length === 0;
  const words = manuscriptWords(scenes);
  const target = project.wordTarget;
  const pct = Math.min(100, Math.round((words / target) * 100));
  const checks = readinessChecks(snapshot);
  const metChecks = checks.filter((c) => c.met).length;

  const ordered = [...scenes].sort((a, b) => a.orderIndex - b.orderIndex);
  const draftZeroScene =
    ordered.find((s) => s.draftZero === 1) ??
    ordered.find((s) => s.status === "blank") ??
    ordered[0];
  const recent = ordered
    .filter((s) => wordCount(s.content) > 0)
    .slice(-3)
    .reverse();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">{project.genre}</p>
          <h1 className="font-serif text-xl font-medium leading-tight" data-testid="text-project-title">
            {project.title}
          </h1>
          {project.subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{project.subtitle}</p>
          )}
          <p className="mt-3 font-prose text-base leading-relaxed" data-testid="text-project-premise">
            {project.premise || "No premise written yet. Add one when you know what it is — not before."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate("/library")} data-testid="button-home-library">
              <Library className="mr-1.5 h-3.5 w-3.5" /> Library
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate("/import")} data-testid="button-home-import">
              <FileUp className="mr-1.5 h-3.5 w-3.5" /> Import files
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button
            size="lg"
            disabled={!draftZeroScene}
            onClick={() => draftZeroScene && openDraftZero(draftZeroScene.id)}
            data-testid="button-resume-draftzero"
          >
            <EyeOff className="mr-2 h-4 w-4" /> Resume Draft Zero
          </Button>
          <p className="max-w-[15rem] text-xs text-muted-foreground" data-testid="text-resume-target">
            {draftZeroScene
              ? `Picks up “${draftZeroScene.title}”`
              : "This book has no scenes yet. Add one in the Manuscript, or import material."}
          </p>
        </div>
      </div>

      {isEmptyBook && (
        <div
          className="paper-panel px-4 py-3 text-sm"
          role="status"
          data-testid="status-empty-book"
        >
          <p className="font-medium">This book is empty, which is a fine place to start.</p>
          <p className="mt-1 text-muted-foreground">
            Nothing from your other books leaks in here. Write a first scene in the Manuscript, or use
            the import wizard to bring in notes and drafts you already have. LitTechnia will not
            write any of it for you.
          </p>
        </div>
      )}

      <CraftLens lens={lenses.home} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel eyebrow="Progress" title="Words written" testId="panel-wordcount">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <p className="font-serif text-xl" data-testid="text-total-words">
                {words.toLocaleString()}{" "}
                <span className="text-sm text-muted-foreground">
                  of {target.toLocaleString()} planned
                </span>
              </p>
              <div className="w-40">
                <Field
                  label="Adjust target"
                  value={String(target)}
                  testId="input-word-target"
                  onSave={(v) => {
                    const parsed = Number(v.replace(/[^0-9]/g, ""));
                    if (parsed >= 500 && parsed <= 500000) {
                      return actions.patchProject({ wordTarget: parsed });
                    }
                  }}
                  hint="Between 500 and 500,000"
                />
              </div>
            </div>
            <div
              className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Words written against planned length"
              data-testid="progress-words"
            >
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {pct}% of a planned length that is only ever an estimate. No streaks, no daily quota,
              no penalty for a week away.
            </p>
          </Panel>

          <Panel
            eyebrow="Story readiness"
            title={`${metChecks} of ${checks.length} checks currently satisfied`}
            testId="panel-readiness"
          >
            <ul className="space-y-2.5">
              {checks.map((check) => (
                <li key={check.id} className="flex items-start gap-2.5" data-testid={`row-check-${check.id}`}>
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      check.met
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {check.met && <Check className="h-3 w-3" />}
                  </span>
                  <span>
                    <span className="block text-sm">{check.label}</span>
                    <span
                      className="block text-xs text-muted-foreground"
                      data-testid={`text-check-detail-${check.id}`}
                    >
                      {check.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              These are observations, not requirements. Plenty of finished novels would fail several
              of them.
            </p>
          </Panel>

          <Panel eyebrow="Recent work" title="Last scenes with words in them" testId="panel-recent">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground" data-testid="empty-recent">
                {scenes.length === 0
                  ? "No scenes in this book yet. Create one in the Manuscript, or bring in files you already wrote."
                  : "Scenes exist but none has words in it yet. Draft Zero is the fastest way to change that."}
              </p>
            )}
            <ul className="space-y-2">
              {recent.map((scene) => (
                <li key={scene.id}>
                  <button
                    type="button"
                    className="w-full rounded-sm border border-border px-3 py-2.5 text-left hover:bg-accent"
                    data-testid={`button-recent-${scene.id}`}
                    onClick={() => {
                      select("scene", scene.id);
                      navigate("/manuscript");
                    }}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{scene.title}</span>
                      <StatusPill
                        label={
                          sceneStatuses.find((s) => s.value === scene.status)?.label ?? scene.status
                        }
                        tone="quiet"
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {wordCount(scene.content).toLocaleString()} w
                      </span>
                    </span>
                    <span className="mt-1 block font-prose text-sm text-muted-foreground">
                      {scene.content.replace(/\s+/g, " ").slice(0, 120)}…
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel eyebrow="Your list" title="Project checklist" testId="panel-checklist">
            <ul className="space-y-2">
              {snapshot.checklist
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2"
                    data-testid={`row-checklist-${item.id}`}
                  >
                    <label className="flex items-start gap-2.5 text-sm">
                      <Checkbox
                        checked={item.done === 1}
                        onCheckedChange={(checked) =>
                          actions.patch("checklist", item.id, { done: checked ? 1 : 0 })
                        }
                        data-testid={`checkbox-checklist-${item.id}`}
                        aria-label={item.label}
                        className="mt-0.5"
                      />
                      <span className={item.done === 1 ? "text-muted-foreground line-through" : ""}>
                        {item.label}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => actions.remove("checklist", item.id)}
                      aria-label={`Delete checklist item ${item.label}`}
                      data-testid={`button-delete-checklist-${item.id}`}
                      className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
            </ul>
            <form
              className="mt-4 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newItem.trim()) return;
                await actions.create("checklist", {
                  label: newItem.trim(),
                  done: 0,
                  orderIndex: snapshot.checklist.length,
                });
                setNewItem("");
              }}
            >
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add something you actually need to do"
                aria-label="New checklist item"
                data-testid="input-new-checklist"
              />
              <Button type="submit" variant="secondary" disabled={actions.pending} data-testid="button-add-checklist">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add checklist item</span>
              </Button>
            </form>
          </Panel>

          <Panel eyebrow="Story shape" title="Linked overview" testId="panel-overview">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Scenes", value: scenes.length, href: "/manuscript" },
                { label: "Characters", value: characters.length, href: "/characters" },
                { label: "Plot threads", value: plots.length, href: "/plot" },
                { label: "Timeline events", value: events.length, href: "/timeline" },
                { label: "World entries", value: world.length, href: "/worldbuilding" },
                { label: "Research notes", value: notes.length, href: "/research" },
              ].map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => navigate(row.href)}
                  className="rounded-sm border border-border px-3 py-2 text-left hover:bg-accent"
                  data-testid={`button-overview-${row.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <dt className="eyebrow">{row.label}</dt>
                  <dd className="font-serif text-base">{row.value}</dd>
                </button>
              ))}
            </dl>
            <div className="mt-4 space-y-1.5 border-t border-border pt-3">
              <p className="eyebrow">Most connected material</p>
              {[...characters]
                .map((c) => ({ c, count: relatedLinks(snapshot, "character", c.id).length }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map(({ c, count }) => (
                  <p key={c.id} className="text-sm" data-testid={`text-connected-${c.id}`}>
                    {c.name} — {count} link{count === 1 ? "" : "s"}
                  </p>
                ))}
              <p className="pt-1 text-xs text-muted-foreground">
                Links are drawn from real records: {kindLabels.character}s,{" "}
                {kindLabels.plot.toLowerCase()}s, {kindLabels.event.toLowerCase()}s and{" "}
                {kindLabels.world.toLowerCase()} entries all link both ways — within this book only.
                {world[0] && ` Example: ${entityName(snapshot, "world", world[0].id)}.`}
              </p>
            </div>
          </Panel>

          <div className="flex flex-wrap items-center gap-2">
            <RestoreLensesButton />
            {/* Only the local demo account has sample books to restore. */}
            {user?.isDemo && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                data-testid="button-reset-demo"
                onClick={() => actions.reset()}
                title="Restore the seeded demo library, discarding demo books you created"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset demo library
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
