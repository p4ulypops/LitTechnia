import { EntityWorkspace } from "@/components/entity-workspace";
import { Field, StatusPill } from "@/components/fields";
import { lenses } from "@/components/craft-lens";
import { useSnapshot, useStoryActions } from "@/lib/workspace";
import type { WorldEntry } from "@shared/schema";

export default function WorldPage() {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const rows = snapshot?.world ?? [];

  return (
    <EntityWorkspace<WorldEntry>
      eyebrow="Story development"
      title="Worldbuilding"
      blurb="Rules are only interesting once they have limits, costs and exceptions."
      lens={lenses.world}
      kind="world"
      collection="world"
      rows={rows}
      label={(w) => w.name}
      sublabel={(w) => w.category}
      badge={(w) =>
        w.costs.trim() && w.limits.trim() ? undefined : (
          <StatusPill label="no cost yet" tone="quiet" />
        )
      }
      newLabel="New entry"
      newRecord={() => ({
        name: "Untitled entry",
        category: "system",
        facts: "",
        rules: "",
        limits: "",
        costs: "",
        exceptions: "",
      })}
      listNote="A world entry can be three lines. Encyclopedias are optional; consequences are not."
      detail={(w) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              value={w.name}
              testId="input-world-name"
              onSave={(v) => actions.patch("world", w.id, { name: v })}
            />
            <Field
              label="Category"
              value={w.category}
              testId="input-world-category"
              hint="System, place, institution, culture, technology…"
              onSave={(v) => actions.patch("world", w.id, { category: v })}
            />
          </div>
          <Field
            label="What it is"
            value={w.facts}
            testId="input-world-facts"
            multiline
            rows={3}
            onSave={(v) => actions.patch("world", w.id, { facts: v })}
          />
          <Field
            label="Rules"
            value={w.rules}
            testId="input-world-rules"
            multiline
            rows={3}
            hint="What it reliably does."
            onSave={(v) => actions.patch("world", w.id, { rules: v })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Limits"
              value={w.limits}
              testId="input-world-limits"
              multiline
              rows={3}
              hint="What it cannot do."
              onSave={(v) => actions.patch("world", w.id, { limits: v })}
            />
            <Field
              label="Costs"
              value={w.costs}
              testId="input-world-costs"
              multiline
              rows={3}
              hint="What using it takes from someone."
              onSave={(v) => actions.patch("world", w.id, { costs: v })}
            />
          </div>
          <Field
            label="Exceptions"
            value={w.exceptions}
            testId="input-world-exceptions"
            multiline
            rows={3}
            hint="Where the rule breaks — usually where the story is."
            onSave={(v) => actions.patch("world", w.id, { exceptions: v })}
          />
        </>
      )}
    />
  );
}
