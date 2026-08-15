import { useEffect, useRef, useState } from "react";
import { EyeOff, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LitTechniaMark } from "@/components/brand";
import { useStoryActions, useSnapshot, useWorkspace, wordCount } from "@/lib/workspace";
import { useToast } from "@/hooks/use-toast";

/**
 * Draft Zero: an isolated writing state for one scene. No craft scoring, no
 * suggestions, no sharing, no AI. Escape or the exit control returns to the
 * workspace; saving writes the text back to the scene.
 */
export function DraftZeroOverlay() {
  const { draftZeroSceneId, closeDraftZero } = useWorkspace();
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const { toast } = useToast();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const scene = snapshot?.scenes.find((s) => s.id === draftZeroSceneId);
  const [text, setText] = useState(scene?.content ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setText(scene?.content ?? "");
    setDirty(false);
  }, [scene?.id, scene?.content]);

  useEffect(() => {
    if (!draftZeroSceneId) return;
    areaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDraftZero();
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftZeroSceneId, text]);

  if (!draftZeroSceneId || !scene) return null;

  async function save(andExit = false) {
    await actions.patch("scenes", scene!.id, {
      content: text,
      draftZero: 1,
      status: scene!.status === "blank" ? "draft-zero" : scene!.status,
    });
    setDirty(false);
    toast({
      title: "Draft zero saved",
      description: `“${scene!.title}” — ${wordCount(text).toLocaleString()} words kept privately.`,
    });
    if (andExit) closeDraftZero();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={`Draft Zero — ${scene.title}`}
      data-testid="overlay-draft-zero"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="text-primary">
            <LitTechniaMark className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Draft zero · private</p>
            <h1 className="font-serif text-base leading-tight" data-testid="text-draftzero-title">
              {scene.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground" data-testid="text-draftzero-words">
            {wordCount(text).toLocaleString()} words
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => save(false)}
            disabled={actions.pending}
            data-testid="button-draftzero-save"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (dirty ? save(true) : closeDraftZero())}
            data-testid="button-draftzero-exit"
          >
            <X className="mr-1.5 h-3.5 w-3.5" /> {dirty ? "Save and exit" : "Exit"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className="mx-auto w-full max-w-[42rem]">
          <p
            className="mb-6 flex items-start gap-2 border-l-0 text-xs leading-relaxed text-muted-foreground"
            data-testid="text-draftzero-promise"
          >
            <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Nothing here is critiqued, scored, shared or generated. LitTechnia will not write,
              rewrite, continue or assess this text. Draft zero exists so you can tell yourself the
              story badly and privately, and come back to it later with distance.
            </span>
          </p>
          <label className="sr-only" htmlFor="draftzero-editor">
            Draft zero text for {scene.title}
          </label>
          <textarea
            id="draftzero-editor"
            ref={areaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDirty(true);
            }}
            spellCheck
            placeholder="Start anywhere. It does not have to be good, or in order."
            data-testid="input-draftzero-editor"
            className="min-h-[55vh] w-full resize-none border-0 bg-transparent font-prose text-lg leading-[1.8] text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-0"
          />
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground md:px-8">
        Escape exits · {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+S saves
      </div>
    </div>
  );
}
