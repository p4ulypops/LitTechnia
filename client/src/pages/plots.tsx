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
import type { Plot } from "@shared/schema";

const statuses = [
  { value: "open", label: "Open" },
  { value: "developing", label: "Developing" },
  { value: "tangled", label: "Tangled" },
  { value: "resolved", label: "Resolved" },
  { value: "abandoned", label: "Set aside" },
];

const parseList = (json: string): string[] => {
  try {
    const value = JSON.parse(json || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
};

const toLines = (json: string) => parseList(json).join("\n");
const fromLines = (text: string) =>
  JSON.stringify(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );

export default function PlotsPage() {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const rows = snapshot?.plots ?? [];

  return (
    <EntityWorkspace<Plot>
      eyebrow="Story development"
      title="Plot & subplots"
      blurb="Threads with stakes, status, and the setups you still owe a payoff to."
      lens={lenses.plot}
      kind="plot"
      collection="plots"
      rows={rows}
      label={(p) => p.name}
      sublabel={(p) => `${p.kind} · ${parseList(p.setups).length} setups, ${parseList(p.payoffs).length} payoffs`}
      badge={(p) => (
        <StatusPill
          label={statuses.find((s) => s.value === p.status)?.label ?? p.status}
          tone={p.status === "tangled" ? "accent" : "quiet"}
          testId={`status-plot-${p.id}`}
        />
      )}
      newLabel="New thread"
      newRecord={() => ({
        name: "Untitled thread",
        kind: "subplot",
        premise: "",
        stakes: "",
        status: "open",
        setups: "[]",
        payoffs: "[]",
        openQuestion: "",
      })}
      detail={(p) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Thread name"
              value={p.name}
              testId="input-plot-name"
              onSave={(v) => actions.patch("plots", p.id, { name: v })}
            />
            <div className="space-y-1.5">
              <p className="eyebrow">Status</p>
              <Select
                value={p.status}
                onValueChange={(v) => actions.patch("plots", p.id, { status: v })}
              >
                <SelectTrigger data-testid="select-plot-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value} data-testid={`option-plotstatus-${s.value}`}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Field
            label="Kind"
            value={p.kind}
            testId="input-plot-kind"
            hint="Main thread, subplot, relationship, mystery — your vocabulary, not ours."
            onSave={(v) => actions.patch("plots", p.id, { kind: v })}
          />
          <Field
            label="Premise"
            value={p.premise}
            testId="input-plot-premise"
            multiline
            rows={3}
            onSave={(v) => actions.patch("plots", p.id, { premise: v })}
          />
          <Field
            label="Stakes"
            value={p.stakes}
            testId="input-plot-stakes"
            multiline
            rows={2}
            hint="What is actually lost if this goes wrong?"
            onSave={(v) => actions.patch("plots", p.id, { stakes: v })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Setups (one per line)"
              value={toLines(p.setups)}
              testId="input-plot-setups"
              multiline
              rows={4}
              onSave={(v) => actions.patch("plots", p.id, { setups: fromLines(v) })}
            />
            <Field
              label="Payoffs (one per line)"
              value={toLines(p.payoffs)}
              testId="input-plot-payoffs"
              multiline
              rows={4}
              onSave={(v) => actions.patch("plots", p.id, { payoffs: fromLines(v) })}
            />
          </div>
          <div
            className="rounded-sm border border-border bg-secondary/40 p-3 text-sm"
            data-testid={`text-plot-balance-${p.id}`}
          >
            {parseList(p.setups).length} setups recorded, {parseList(p.payoffs).length} payoffs.{" "}
            {parseList(p.setups).length > parseList(p.payoffs).length
              ? "Some promises are still outstanding — which is fine mid-draft."
              : "Nothing obviously outstanding on this thread."}
          </div>
          <Field
            label="Open question"
            value={p.openQuestion}
            testId="input-plot-openquestion"
            multiline
            rows={2}
            onSave={(v) => actions.patch("plots", p.id, { openQuestion: v })}
          />
        </>
      )}
    />
  );
}
