import { useMemo } from "react";
import { ArrowDown, ArrowUp, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, ListSkeleton, Panel, StatusPill } from "@/components/fields";
import { LinkPanel } from "@/components/links";
import { AttachmentArea } from "@/components/attachments";
import { CraftLens, RestoreLensesButton, lenses } from "@/components/craft-lens";
import {
  kindLabels,
  manuscriptWords,
  relatedLinks,
  entityName,
  sceneStatuses,
  useSnapshot,
  useStoryActions,
  useWorkspace,
  wordCount,
} from "@/lib/workspace";
import type { ProjectSnapshot, Scene } from "@shared/schema";

const statusLabel = (value: string) =>
  sceneStatuses.find((s) => s.value === value)?.label ?? value;

function chapterGroups(scenes: Scene[]) {
  const ordered = [...scenes].sort((a, b) => a.orderIndex - b.orderIndex);
  const groups: { chapter: string; scenes: Scene[] }[] = [];
  for (const scene of ordered) {
    const last = groups[groups.length - 1];
    if (last && last.chapter === scene.chapter) last.scenes.push(scene);
    else groups.push({ chapter: scene.chapter, scenes: [scene] });
  }
  return groups;
}

function SceneMeta({ scene, snapshot }: { scene: Scene; snapshot: ProjectSnapshot }) {
  const related = relatedLinks(snapshot, "scene", scene.id);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <StatusPill
        label={statusLabel(scene.status)}
        tone={scene.status === "blank" ? "quiet" : "neutral"}
        testId={`status-scene-${scene.id}`}
      />
      <span className="font-mono" data-testid={`text-scenewords-${scene.id}`}>
        {wordCount(scene.content).toLocaleString()} w
      </span>
      {scene.draftZero === 1 && (
        <span className="inline-flex items-center gap-1" title="Draft zero material">
          <EyeOff className="h-3 w-3" aria-hidden /> private
        </span>
      )}
      {related.length > 0 && (
        <span data-testid={`text-scenelinks-${scene.id}`}>
          {related.length} link{related.length === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

export default function ManuscriptPage() {
  const { data: snapshot, isLoading } = useSnapshot();
  const actions = useStoryActions();
  const { selectedSceneId, select, view, setView, openDraftZero } = useWorkspace();

  const scenes = useMemo(
    () => [...(snapshot?.scenes ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [snapshot],
  );
  const scene = scenes.find((s) => s.id === selectedSceneId) ?? scenes[0];

  const addScene = async () => {
    const created = (await actions.create("scenes", {
      chapter: scene?.chapter ?? "Chapter One",
      title: "Untitled scene",
      content: "",
      status: "blank",
      pov: "",
      objective: "",
      conflict: "",
      change: "",
      draftZero: 0,
      orderIndex: scenes.length,
    })) as Scene;
    select("scene", created.id);
  };

  if (isLoading || !snapshot) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <ListSkeleton rows={6} />
      </div>
    );
  }

  const groups = chapterGroups(scenes);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Writing</p>
          <h1 className="font-serif text-xl font-medium leading-tight">Manuscript</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {scenes.length} scenes · {manuscriptWords(scenes).toLocaleString()} words · one set of
            scene data seen three ways
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-md border border-border p-0.5"
            role="group"
            aria-label="Manuscript view"
          >
            {(["document", "cards", "binder"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                data-testid={`button-view-${v}`}
                className={`rounded-sm px-3 py-1.5 text-sm capitalize transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={addScene} disabled={actions.pending} data-testid="button-new-scene">
            <Plus className="mr-1.5 h-4 w-4" /> New scene
          </Button>
        </div>
      </div>

      <CraftLens lens={lenses.manuscript} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* ---------------------------------------------------- view column */}
        <div className="space-y-4" data-testid={`view-${view}`}>
          {view === "document" && (
            <Panel eyebrow="Document view" title="Read straight through">
              <div className="space-y-6">
                {groups.map((group) => (
                  <div key={group.chapter}>
                    <h3 className="mb-2 font-serif text-base">{group.chapter}</h3>
                    <ul className="space-y-2">
                      {group.scenes.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => select("scene", s.id)}
                            data-testid={`button-scene-${s.id}`}
                            aria-current={s.id === scene?.id}
                            className={`w-full rounded-sm border px-3 py-2.5 text-left transition-colors ${
                              s.id === scene?.id
                                ? "border-primary/50 bg-primary/5"
                                : "border-border hover:bg-accent"
                            }`}
                          >
                            <span className="block text-sm font-medium">{s.title}</span>
                            <span className="mt-1 block font-prose text-sm text-muted-foreground">
                              {s.content
                                ? `${s.content.replace(/\s+/g, " ").slice(0, 110)}…`
                                : "Not written yet."}
                            </span>
                            <span className="mt-1.5 block">
                              <SceneMeta scene={s} snapshot={snapshot} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {view === "cards" && (
            <Panel
              eyebrow="Card view"
              title="Move scenes around"
              actions={<span className="text-xs text-muted-foreground">Reorder with the arrows</span>}
            >
              <ul className="grid gap-3 sm:grid-cols-2">
                {scenes.map((s, i) => (
                  <li
                    key={s.id}
                    className={`flex flex-col justify-between gap-3 rounded-sm border p-3 ${
                      s.id === scene?.id ? "border-primary/50 bg-primary/5" : "border-border"
                    }`}
                    data-testid={`card-scene-${s.id}`}
                  >
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => select("scene", s.id)}
                      data-testid={`button-card-scene-${s.id}`}
                    >
                      <span className="eyebrow block">{s.chapter}</span>
                      <span className="mt-0.5 block font-serif text-base leading-tight">
                        {s.title}
                      </span>
                      {s.objective && (
                        <span className="mt-1.5 block text-xs text-muted-foreground">
                          Wants: {s.objective}
                        </span>
                      )}
                      {s.conflict && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          But: {s.conflict}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center justify-between gap-2">
                      <SceneMeta scene={s} snapshot={snapshot} />
                      <span className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === 0 || actions.pending}
                          onClick={() => actions.reorderScene(s.id, "up")}
                          aria-label={`Move ${s.title} earlier`}
                          data-testid={`button-moveup-${s.id}`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === scenes.length - 1 || actions.pending}
                          onClick={() => actions.reorderScene(s.id, "down")}
                          aria-label={`Move ${s.title} later`}
                          data-testid={`button-movedown-${s.id}`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {view === "binder" && (
            <Panel eyebrow="Binder view" title="Structure at a glance">
              <ul className="space-y-3">
                {groups.map((group) => (
                  <li key={group.chapter}>
                    <p className="border-b border-border pb-1 font-serif text-sm">
                      {group.chapter}
                    </p>
                    <ul className="mt-1">
                      {group.scenes.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => select("scene", s.id)}
                            data-testid={`button-binder-scene-${s.id}`}
                            className={`flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm ${
                              s.id === scene?.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                aria-hidden
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  s.status === "blank" ? "bg-muted-foreground/40" : "bg-primary"
                                }`}
                              />
                              <span className="truncate">{s.title}</span>
                            </span>
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                              {wordCount(s.content).toLocaleString()} w
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <RestoreLensesButton />
        </div>

        {/* ------------------------------------------------------ editor pane */}
        {scene ? (
          <div className="space-y-4">
            <Panel
              eyebrow="Selected scene"
              title={scene.title}
              testId="panel-scene-editor"
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDraftZero(scene.id)}
                    data-testid="button-open-draftzero"
                  >
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Draft Zero
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Delete ${scene.title}`}
                    data-testid="button-delete-scene"
                    onClick={async () => {
                      await actions.remove("scenes", scene.id);
                      select("scene", null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              }
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Scene title"
                    value={scene.title}
                    testId="input-scene-title"
                    onSave={(v) => actions.patch("scenes", scene.id, { title: v })}
                  />
                  <Field
                    label="Chapter"
                    value={scene.chapter}
                    testId="input-scene-chapter"
                    onSave={(v) => actions.patch("scenes", scene.id, { chapter: v })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="eyebrow">Status</p>
                    <Select
                      value={scene.status}
                      onValueChange={(v) => actions.patch("scenes", scene.id, { status: v })}
                    >
                      <SelectTrigger data-testid="select-scene-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sceneStatuses.map((s) => (
                          <SelectItem
                            key={s.value}
                            value={s.value}
                            data-testid={`option-status-${s.value}`}
                          >
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field
                    label="Point of view"
                    value={scene.pov}
                    testId="input-scene-pov"
                    placeholder="Whose eyes are we behind?"
                    onSave={(v) => actions.patch("scenes", scene.id, { pov: v })}
                  />
                </div>

                <Field
                  label="Scene text"
                  value={scene.content}
                  testId="input-scene-content"
                  multiline
                  prose
                  rows={12}
                  placeholder="Write here, or open Draft Zero for a distraction-free page."
                  hint={`${wordCount(scene.content).toLocaleString()} words · saves when you click away or press ⌘/Ctrl+Enter`}
                  onSave={(v) => actions.patch("scenes", scene.id, { content: v })}
                />

                <details className="rounded-sm border border-border p-3">
                  <summary
                    className="cursor-pointer text-sm font-medium"
                    data-testid="button-scene-cardfields"
                  >
                    Scene card fields (optional)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <Field
                      label="What the viewpoint character wants"
                      value={scene.objective}
                      testId="input-scene-objective"
                      multiline
                      rows={2}
                      onSave={(v) => actions.patch("scenes", scene.id, { objective: v })}
                    />
                    <Field
                      label="What gets in the way"
                      value={scene.conflict}
                      testId="input-scene-conflict"
                      multiline
                      rows={2}
                      onSave={(v) => actions.patch("scenes", scene.id, { conflict: v })}
                    />
                    <Field
                      label="What has changed by the end"
                      value={scene.change}
                      testId="input-scene-change"
                      multiline
                      rows={2}
                      onSave={(v) => actions.patch("scenes", scene.id, { change: v })}
                    />
                  </div>
                </details>
              </div>
            </Panel>

            <Panel eyebrow="Related story material" title="Two-way links">
              <LinkPanel kind="scene" id={scene.id} />
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                {relatedLinks(snapshot, "scene", scene.id).map((rel) => (
                  <li key={rel.link.id}>
                    {kindLabels[rel.kind]}: {entityName(snapshot, rel.kind, rel.id)}
                    {rel.note ? ` — ${rel.note}` : ""}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel eyebrow="Attachments" title="Reference material on this scene">
              <AttachmentArea ownerKind="scene" ownerId={scene.id} label="Files on this scene" />
            </Panel>
          </div>
        ) : (
          <Panel eyebrow="Selected scene" title="No scene selected">
            <p className="text-sm text-muted-foreground">
              Choose a scene on the left, or create one to start.
            </p>
            <Button className="mt-3" onClick={addScene} data-testid="button-new-scene-empty">
              <Plus className="mr-1.5 h-4 w-4" /> New scene
            </Button>
          </Panel>
        )}
      </div>
    </div>
  );
}
