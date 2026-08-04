import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityWorkspace } from "@/components/entity-workspace";
import { Field, StatusPill } from "@/components/fields";
import { lenses } from "@/components/craft-lens";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSnapshot, useStoryActions } from "@/lib/workspace";
import type { StoryEvent } from "@shared/schema";

const confidences = [
  { value: "fixed", label: "Fixed date" },
  { value: "approximate", label: "Approximate" },
  { value: "unplaced", label: "Unplaced" },
];

export default function TimelinePage() {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const rows = [...(snapshot?.events ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

  // Events reorder by swapping order indexes with the neighbouring event.
  const swap = async (index: number, direction: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + direction];
    if (!a || !b) return;
    await actions.patch("events", a.id, { orderIndex: b.orderIndex });
    await actions.patch("events", b.id, { orderIndex: a.orderIndex });
  };

  return (
    <EntityWorkspace<StoryEvent>
      eyebrow="Story development"
      title="Timeline"
      blurb="Events in the order they happen, with honest uncertainty where you have it."
      lens={lenses.timeline}
      kind="event"
      collection="events"
      rows={rows}
      label={(e) => e.label}
      sublabel={(e) => e.storyTime || "no story time recorded"}
      badge={(e) => (
        <StatusPill
          label={confidences.find((c) => c.value === e.confidence)?.label ?? e.confidence}
          tone={e.confidence === "unplaced" ? "accent" : "quiet"}
          testId={`status-event-${e.id}`}
        />
      )}
      newLabel="New event"
      newRecord={() => ({
        label: "Untitled event",
        storyTime: "",
        confidence: "unplaced",
        notes: "",
        orderIndex: rows.length,
      })}
      listNote="Relative order is often enough. An unplaced event is better than a date you invented to fill a box."
      rowActions={(row, index) => (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === 0 || actions.pending}
            onClick={() => swap(index, -1)}
            aria-label={`Move ${row.label} earlier`}
            data-testid={`button-event-up-${row.id}`}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === rows.length - 1 || actions.pending}
            onClick={() => swap(index, 1)}
            aria-label={`Move ${row.label} later`}
            data-testid={`button-event-down-${row.id}`}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </>
      )}
      detail={(e) => (
        <>
          <Field
            label="Event"
            value={e.label}
            testId="input-event-label"
            onSave={(v) => actions.patch("events", e.id, { label: v })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Story time"
              value={e.storyTime}
              testId="input-event-storytime"
              placeholder="e.g. eleven years before chapter one"
              onSave={(v) => actions.patch("events", e.id, { storyTime: v })}
            />
            <div className="space-y-1.5">
              <p className="eyebrow">How certain is this?</p>
              <Select
                value={e.confidence}
                onValueChange={(v) => actions.patch("events", e.id, { confidence: v })}
              >
                <SelectTrigger data-testid="select-event-confidence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {confidences.map((c) => (
                    <SelectItem key={c.value} value={c.value} data-testid={`option-confidence-${c.value}`}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Uncertainty is recorded, not corrected.
              </p>
            </div>
          </div>
          <Field
            label="Notes"
            value={e.notes}
            testId="input-event-notes"
            multiline
            rows={4}
            onSave={(v) => actions.patch("events", e.id, { notes: v })}
          />
        </>
      )}
    />
  );
}
