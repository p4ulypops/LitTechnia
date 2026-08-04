import { Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";

export type Lens = {
  id: string;
  title: string;
  planning: string[];
  discovery: string[];
  footnote?: string;
};

/**
 * Craft lenses: optional questions, never a method. Each lens shows a planning
 * path and a discovery path side by side, states that templates are optional,
 * and can be dismissed for the session.
 */
export function CraftLens({ lens }: { lens: Lens }) {
  const { dismissedLenses, dismissLens } = useWorkspace();
  if (dismissedLenses.includes(lens.id)) return null;

  return (
    <aside
      className="rounded-md border border-border bg-secondary/50 p-4"
      aria-labelledby={`lens-title-${lens.id}`}
      data-testid={`panel-lens-${lens.id}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="eyebrow">Craft lens · optional</p>
            <h3 id={`lens-title-${lens.id}`} className="font-serif text-base leading-tight">
              {lens.title}
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => dismissLens(lens.id)}
          aria-label={`Dismiss the ${lens.title} lens`}
          data-testid={`button-dismiss-lens-${lens.id}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="eyebrow mb-1.5">If you are planning</p>
          <ul className="space-y-1.5 text-sm">
            {lens.planning.map((q) => (
              <li key={q} className="flex gap-2">
                <span aria-hidden className="text-muted-foreground">
                  —
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-1.5">If you are discovering</p>
          <ul className="space-y-1.5 text-sm">
            {lens.discovery.map((q) => (
              <li key={q} className="flex gap-2">
                <span aria-hidden className="text-muted-foreground">
                  —
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 border-t border-border pt-2.5 text-xs text-muted-foreground">
        {lens.footnote ??
          "Every template here is optional. Skip it, rewrite it, or work in the opposite order — writers you admire disagree with each other about all of this."}
      </p>
    </aside>
  );
}

export function RestoreLensesButton() {
  const { dismissedLenses, restoreLenses } = useWorkspace();
  if (dismissedLenses.length === 0) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={restoreLenses}
      data-testid="button-restore-lenses"
      className="text-muted-foreground"
    >
      Bring back {dismissedLenses.length} dismissed prompt
      {dismissedLenses.length === 1 ? "" : "s"}
    </Button>
  );
}

export const lenses: Record<string, Lens> = {
  home: {
    id: "home",
    title: "Where to start today",
    planning: [
      "Which single unanswered question is blocking the next scene?",
      "Is there a setup already on the page that you could pay off sooner?",
    ],
    discovery: [
      "Whose voice is loudest right now? Write that scene, badly, and stop.",
      "What would happen if the character refused the thing you assumed they'd accept?",
    ],
  },
  manuscript: {
    id: "manuscript",
    title: "Reading a scene as a scene",
    planning: [
      "What does the viewpoint character want in this room, in one sentence?",
      "What changes by the last line? If nothing changes, is this a scene or a note?",
    ],
    discovery: [
      "Write past the moment you feel like stopping, then cut back later.",
      "Draft zero is allowed to be shapeless — you are telling yourself the story first.",
    ],
  },
  characters: {
    id: "characters",
    title: "Motivation before biography",
    planning: [
      "What does this character want, and what are they prepared to lose for it?",
      "Which of their fears will the plot force them to meet?",
    ],
    discovery: [
      "Write half a page in their voice about something irrelevant, and see what surfaces.",
      "Leave the arc field blank if you don't know yet. Unknown is a legitimate answer.",
    ],
  },
  plot: {
    id: "plot",
    title: "Setups and their debts",
    planning: [
      "Every setup is a promise. Which promises are you still holding?",
      "Which subplot could be cut without the main thread collapsing? Keep it anyway if you love it.",
    ],
    discovery: [
      "Record setups after you write them, not before, and let the payoffs be a surprise.",
      "A thread marked 'tangled' is information, not failure.",
    ],
  },
  timeline: {
    id: "timeline",
    title: "Uncertain time is still time",
    planning: [
      "Which events must be fixed for the plot to make sense, and which can float?",
      "Does any event contradict a season, an age, or a journey length?",
    ],
    discovery: [
      "Mark an event 'unplaced' rather than inventing a date you'll have to defend.",
      "Order events relative to each other first; absolute dates can wait forever.",
    ],
  },
  world: {
    id: "world",
    title: "Rules earn their tension from limits",
    planning: [
      "What can this system not do, and who suffers because of that?",
      "What does using it cost the person who uses it?",
    ],
    discovery: [
      "Write the rule only after a scene has forced you to know it.",
      "Exceptions are where stories live — record them, don't tidy them away.",
    ],
  },
  research: {
    id: "research",
    title: "Notes are raw material, not homework",
    planning: [
      "Which note is actually a scene in disguise?",
      "Which fact is load-bearing, and which is just interesting?",
    ],
    discovery: [
      "Import first, classify later. Unsorted notes are not a problem to be solved today.",
      "Keep the note in its own words; paraphrase when it enters the manuscript.",
    ],
  },
};
