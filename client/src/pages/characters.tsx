import { EntityWorkspace } from "@/components/entity-workspace";
import { Field, StatusPill } from "@/components/fields";
import { lenses } from "@/components/craft-lens";
import { useSnapshot, useStoryActions } from "@/lib/workspace";
import type { Character } from "@shared/schema";

export default function CharactersPage() {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const rows = snapshot?.characters ?? [];

  return (
    <EntityWorkspace<Character>
      eyebrow="Story development"
      title="Characters"
      blurb="Motivation, wants, fears, wins, losses and arc — in your words, not a personality quiz."
      lens={lenses.characters}
      kind="character"
      collection="characters"
      rows={rows}
      label={(c) => c.name}
      sublabel={(c) => c.role}
      badge={(c) =>
        c.arc.trim() ? undefined : <StatusPill label="arc unwritten" tone="quiet" />
      }
      newLabel="New character"
      newRecord={() => ({
        name: "Unnamed character",
        role: "",
        motivation: "",
        wants: "",
        fears: "",
        wins: "",
        losses: "",
        arc: "",
        voice: "",
      })}
      listNote="Blank fields are allowed. Some writers only find the motivation on page two hundred."
      detail={(c) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              value={c.name}
              testId="input-character-name"
              onSave={(v) => actions.patch("characters", c.id, { name: v })}
            />
            <Field
              label="Role in the story"
              value={c.role}
              testId="input-character-role"
              onSave={(v) => actions.patch("characters", c.id, { role: v })}
            />
          </div>
          <Field
            label="Motivation"
            value={c.motivation}
            testId="input-character-motivation"
            multiline
            rows={2}
            hint="The engine underneath everything they do."
            onSave={(v) => actions.patch("characters", c.id, { motivation: v })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Wants"
              value={c.wants}
              testId="input-character-wants"
              multiline
              rows={2}
              onSave={(v) => actions.patch("characters", c.id, { wants: v })}
            />
            <Field
              label="Fears"
              value={c.fears}
              testId="input-character-fears"
              multiline
              rows={2}
              onSave={(v) => actions.patch("characters", c.id, { fears: v })}
            />
            <Field
              label="Wins"
              value={c.wins}
              testId="input-character-wins"
              multiline
              rows={2}
              onSave={(v) => actions.patch("characters", c.id, { wins: v })}
            />
            <Field
              label="Losses"
              value={c.losses}
              testId="input-character-losses"
              multiline
              rows={2}
              onSave={(v) => actions.patch("characters", c.id, { losses: v })}
            />
          </div>
          <Field
            label="Arc"
            value={c.arc}
            testId="input-character-arc"
            multiline
            rows={3}
            hint="Leave empty if you don't know yet."
            onSave={(v) => actions.patch("characters", c.id, { arc: v })}
          />
          <Field
            label="Voice notes"
            value={c.voice}
            testId="input-character-voice"
            multiline
            rows={2}
            onSave={(v) => actions.patch("characters", c.id, { voice: v })}
          />
        </>
      )}
    />
  );
}
