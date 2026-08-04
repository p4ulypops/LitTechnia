import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowUpRight, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  entityName,
  kindLabels,
  kindRoutes,
  relatedLinks,
  useSnapshot,
  useStoryActions,
  useWorkspace,
} from "@/lib/workspace";
import type { EntityKind, ProjectSnapshot } from "@shared/schema";

const kindOrder: EntityKind[] = ["scene", "character", "plot", "event", "world", "note"];

function candidates(snapshot: ProjectSnapshot, kind: EntityKind) {
  const pools: Record<EntityKind, { id: string }[]> = {
    scene: snapshot.scenes,
    character: snapshot.characters,
    plot: snapshot.plots,
    event: snapshot.events,
    world: snapshot.world,
    note: snapshot.notes,
  };
  return pools[kind].map((row) => ({ id: row.id, name: entityName(snapshot, kind, row.id) }));
}

/**
 * Two-way relationship panel. The same link row is rendered from either end, so
 * linking a character to a scene makes the scene visible on the character and
 * the character visible on the scene.
 */
export function LinkPanel({
  kind,
  id,
  compact = false,
}: {
  kind: EntityKind;
  id: string;
  compact?: boolean;
}) {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const { select } = useWorkspace();
  const [, navigate] = useLocation();
  const [targetKind, setTargetKind] = useState<EntityKind>(kind === "scene" ? "character" : "scene");
  const [targetId, setTargetId] = useState<string>("");

  const related = useMemo(
    () => (snapshot ? relatedLinks(snapshot, kind, id) : []),
    [snapshot, kind, id],
  );

  if (!snapshot) return null;

  const options = candidates(snapshot, targetKind).filter(
    (o) => !(targetKind === kind && o.id === id),
  );

  const openTarget = (targetKindValue: EntityKind, targetIdValue: string) => {
    select(targetKindValue, targetIdValue);
    navigate(kindRoutes[targetKindValue]);
  };

  return (
    <div className="space-y-3" data-testid={`panel-links-${id}`}>
      <div className="flex flex-wrap gap-1.5">
        {related.length === 0 && (
          <p className="text-sm text-muted-foreground" data-testid={`text-nolinks-${id}`}>
            Nothing linked yet. Links are optional — add them when a connection actually matters.
          </p>
        )}
        {related.map((rel) => (
          <span
            key={rel.link.id}
            className="group inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/70 py-1 pl-2 pr-1 text-xs"
            data-testid={`chip-link-${rel.link.id}`}
          >
            <span className="text-muted-foreground">{kindLabels[rel.kind]}</span>
            <button
              type="button"
              className="font-medium underline decoration-dotted underline-offset-2 hover:text-primary"
              onClick={() => openTarget(rel.kind, rel.id)}
              data-testid={`button-open-link-${rel.link.id}`}
              title={`Open ${entityName(snapshot, rel.kind, rel.id)}`}
            >
              {entityName(snapshot, rel.kind, rel.id)}
            </button>
            {rel.note && <span className="text-muted-foreground">· {rel.note}</span>}
            <ArrowUpRight className="h-3 w-3 text-muted-foreground" aria-hidden />
            <button
              type="button"
              onClick={() => actions.remove("links", rel.link.id)}
              aria-label={`Remove link to ${entityName(snapshot, rel.kind, rel.id)}`}
              data-testid={`button-remove-link-${rel.link.id}`}
              className="rounded-sm p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={targetKind}
            onValueChange={(v) => {
              setTargetKind(v as EntityKind);
              setTargetId("");
            }}
          >
            <SelectTrigger className="h-9 w-[9.5rem]" data-testid={`select-linkkind-${id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kindOrder.map((k) => (
                <SelectItem key={k} value={k} data-testid={`option-linkkind-${k}`}>
                  {kindLabels[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="h-9 w-[14rem]" data-testid={`select-linktarget-${id}`}>
              <SelectValue placeholder="Choose what to link" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id} data-testid={`option-linktarget-${o.id}`}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            disabled={!targetId || actions.pending}
            data-testid={`button-addlink-${id}`}
            onClick={async () => {
              await actions.create("links", {
                fromKind: kind,
                fromId: id,
                toKind: targetKind,
                toId: targetId,
                note: "",
              });
              setTargetId("");
            }}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" /> Link
          </Button>
        </div>
      )}
    </div>
  );
}
