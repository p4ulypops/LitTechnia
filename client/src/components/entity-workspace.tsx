import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton, Panel } from "@/components/fields";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LinkPanel } from "@/components/links";
import { AttachmentArea } from "@/components/attachments";
import { CraftLens, RestoreLensesButton, type Lens } from "@/components/craft-lens";
import { kindLabels, useSelection, useSnapshot, useStoryActions } from "@/lib/workspace";
import type { CollectionName, EntityKind } from "@shared/schema";

type Row = { id: string };

/**
 * Shared list + detail layout used by every planning workspace, so characters,
 * plot threads, timeline events and world entries all behave the same way.
 */
export function EntityWorkspace<T extends Row>({
  eyebrow,
  title,
  blurb,
  lens,
  kind,
  collection,
  rows,
  label,
  sublabel,
  badge,
  newRecord,
  newLabel,
  detail,
  rowActions,
  listNote,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  lens: Lens;
  kind: EntityKind;
  collection: CollectionName;
  rows: T[];
  label: (row: T) => string;
  sublabel?: (row: T) => string;
  badge?: (row: T) => React.ReactNode;
  newRecord: () => Record<string, unknown>;
  newLabel: string;
  detail: (row: T) => React.ReactNode;
  rowActions?: (row: T, index: number) => React.ReactNode;
  listNote?: string;
}) {
  const { isLoading } = useSnapshot();
  const actions = useStoryActions();
  const [selectedId, setSelected] = useSelection(kind);
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <ListSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="font-serif text-xl font-medium leading-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        </div>
        <Button
          onClick={async () => {
            const created = (await actions.create(collection, newRecord())) as T;
            setSelected(created.id);
          }}
          disabled={actions.pending}
          data-testid={`button-new-${kind}`}
        >
          <Plus className="mr-1.5 h-4 w-4" /> {newLabel}
        </Button>
      </div>

      <CraftLens lens={lens} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Panel eyebrow="In this project" title={`${rows.length} entries`}>
            {rows.length === 0 ? (
              <EmptyState
                title="Nothing here yet"
                body="Add an entry when you have something to say. An empty workspace is not a failing."
                testId={`empty-${kind}`}
              />
            ) : (
              <ul className="space-y-1.5">
                {rows.map((row, index) => (
                  <li key={row.id} className="flex items-start gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelected(row.id)}
                      aria-current={row.id === selected?.id}
                      data-testid={`button-select-${row.id}`}
                      className={`min-w-0 flex-1 rounded-sm border px-3 py-2 text-left transition-colors ${
                        row.id === selected?.id
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{label(row)}</span>
                        {badge?.(row)}
                      </span>
                      {sublabel && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {sublabel(row)}
                        </span>
                      )}
                    </button>
                    {rowActions && (
                      <span className="flex shrink-0 flex-col gap-0.5 pt-1">
                        {rowActions(row, index)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {listNote && <p className="mt-3 text-xs text-muted-foreground">{listNote}</p>}
          </Panel>
          <RestoreLensesButton />
        </div>

        {selected ? (
          <div className="space-y-4">
            <Panel
              eyebrow="Selected"
              title={label(selected)}
              testId={`panel-detail-${kind}`}
              actions={
                <ConfirmDialog
                  testId={`delete-${kind}`}
                  title={`Delete "${label(selected)}"?`}
                  description={`This removes this ${kindLabels[kind].toLowerCase()} permanently, including its links to scenes and other records. This cannot be undone.`}
                  confirmLabel={`Delete ${kindLabels[kind].toLowerCase()}`}
                  pendingLabel="Deleting…"
                  onConfirm={async () => {
                    await actions.remove(collection, selected.id);
                    setSelected(null);
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Delete ${label(selected)}`}
                      data-testid={`button-delete-${kind}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                />
              }
            >
              <div className="space-y-4">{detail(selected)}</div>
            </Panel>

            <Panel eyebrow="Connections" title="Linked both ways">
              <LinkPanel kind={kind} id={selected.id} />
            </Panel>

            <Panel eyebrow="Attachments" title="Reference material">
              <AttachmentArea ownerKind={kind} ownerId={selected.id} label="Files on this item" />
            </Panel>
          </div>
        ) : (
          <Panel eyebrow="Selected" title="Nothing selected">
            <p className="text-sm text-muted-foreground">Choose an entry on the left.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}
