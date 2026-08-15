import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  CollectionName,
  ConnectionsResponse,
  EntityKind,
  ImportItem,
  ImportResult,
  LibrarySnapshot,
  Link,
  NewProject,
  Project,
  ProjectSnapshot,
  ProjectSummary,
  Scene,
} from "@shared/schema";

export const LIBRARY_KEY = ["/api/projects"] as const;

/** Every book in the library, with counts. Never scoped to one project. */
export function useLibrary() {
  return useQuery<LibrarySnapshot>({ queryKey: LIBRARY_KEY });
}

/**
 * Full contents of every book. Used only by the library JSON export, which has
 * to state its own scope, so it is deliberately a separate request.
 */
export function useLibrarySnapshots() {
  return useQuery<{ projects: ProjectSnapshot[] }>({
    queryKey: ["/api/library", "snapshots"],
  });
}

/**
 * Connections availability, server-computed and non-secret. See
 * server/connectors.ts and docs/ux/connections-release-mechanics.md.
 */
export function useConnections() {
  return useQuery<ConnectionsResponse>({ queryKey: ["/api/connections"] });
}

function snapshotKey(projectId: string) {
  return ["/api/projects", projectId, "snapshot"] as const;
}

type SnapshotResult = {
  data: ProjectSnapshot | undefined;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Contents of the *active* book only. Switching books changes the query key, so
 * no other project's records can be shown by a stale cache.
 */
export function useSnapshot(): SnapshotResult {
  const { activeProjectId } = useWorkspace();
  const query = useQuery<ProjectSnapshot>({
    queryKey: snapshotKey(activeProjectId ?? "none"),
    enabled: Boolean(activeProjectId),
  });
  return {
    data: activeProjectId ? query.data : undefined,
    isLoading: !activeProjectId || query.isLoading,
    isError: query.isError,
  };
}

async function refresh(projectId: string | null) {
  await queryClient.invalidateQueries({ queryKey: LIBRARY_KEY });
  await queryClient.invalidateQueries({ queryKey: ["/api/library"] });
  if (projectId) {
    await queryClient.invalidateQueries({ queryKey: snapshotKey(projectId) });
  }
}

/** Writes into the active book. Every path includes the project id. */
export function useStoryActions() {
  const { activeProjectId } = useWorkspace();
  const [pending, setPending] = useState(false);
  const base = `/api/projects/${activeProjectId ?? "none"}`;

  const run = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      setPending(true);
      try {
        const result = await fn();
        await refresh(activeProjectId);
        return result;
      } finally {
        setPending(false);
      }
    },
    [activeProjectId],
  );

  return useMemo(
    () => ({
      pending,
      projectId: activeProjectId,
      create: (collection: CollectionName, data: Record<string, unknown>) =>
        run(async () => (await apiRequest("POST", `${base}/${collection}`, data)).json()),
      patch: (collection: CollectionName, id: string, data: Record<string, unknown>) =>
        run(async () => (await apiRequest("PATCH", `${base}/${collection}/${id}`, data)).json()),
      remove: (collection: CollectionName, id: string) =>
        run(async () => {
          await apiRequest("DELETE", `${base}/${collection}/${id}`);
          return true;
        }),
      reorderScene: (id: string, direction: "up" | "down") =>
        run(async () => (await apiRequest("POST", `${base}/scenes/reorder`, { id, direction })).json()),
      reset: () => run(async () => (await apiRequest("POST", "/api/reset", {})).json()),
      patchProject: (data: Record<string, unknown>) =>
        run(async () => (await apiRequest("PATCH", base, data)).json()),
      importItems: (items: ImportItem[]) =>
        run(
          async () =>
            (await apiRequest("POST", `${base}/import`, { items })).json() as Promise<ImportResult>,
        ),
    }),
    [pending, run, base, activeProjectId],
  );
}

/** Library-level writes: create a book, shelve or unshelve one. */
export function useLibraryActions() {
  const [pending, setPending] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    setPending(true);
    try {
      const result = await fn();
      await queryClient.invalidateQueries({ queryKey: LIBRARY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["/api/library"] });
      return result;
    } finally {
      setPending(false);
    }
  }, []);

  return useMemo(
    () => ({
      pending,
      createBook: (data: NewProject) =>
        run(async () => (await apiRequest("POST", "/api/projects", data)).json() as Promise<Project>),
      setArchived: (projectId: string, archived: 0 | 1) =>
        run(
          async () =>
            (await apiRequest("PATCH", `/api/projects/${projectId}`, { archived })).json() as Promise<Project>,
        ),
    }),
    [pending, run],
  );
}

/* ----------------------------------------------------------- derived values */

export function wordCount(text: string) {
  const cleaned = text.replace(/\[[^\]]*\]/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

export function manuscriptWords(scenes: Scene[]) {
  return scenes.reduce((total, s) => total + wordCount(s.content), 0);
}

export const sceneStatuses = [
  { value: "blank", label: "Not started" },
  { value: "draft-zero", label: "Draft zero" },
  { value: "drafted", label: "Drafted" },
  { value: "revising", label: "Revising" },
  { value: "ready", label: "Ready to read" },
] as const;

export const kindLabels: Record<EntityKind, string> = {
  scene: "Scene",
  character: "Character",
  plot: "Plot thread",
  event: "Timeline event",
  world: "World entry",
  note: "Research note",
};

export const kindRoutes: Record<EntityKind, string> = {
  scene: "/manuscript",
  character: "/characters",
  plot: "/plot",
  event: "/timeline",
  world: "/worldbuilding",
  note: "/research",
};

/** Name of any linkable record, for display in link chips. */
export function entityName(snapshot: ProjectSnapshot, kind: EntityKind, id: string): string {
  const pools: Record<EntityKind, { id: string; name?: string; title?: string; label?: string }[]> = {
    scene: snapshot.scenes,
    character: snapshot.characters,
    plot: snapshot.plots,
    event: snapshot.events,
    world: snapshot.world,
    note: snapshot.notes,
  };
  const row = pools[kind].find((r) => r.id === id);
  return row ? row.name ?? row.title ?? row.label ?? id : "(deleted)";
}

/** Links touching a record, normalised so the other end is always `kind`/`id`. */
export function relatedLinks(
  snapshot: ProjectSnapshot,
  kind: EntityKind,
  id: string,
): { link: Link; kind: EntityKind; id: string; note: string }[] {
  return snapshot.links
    .filter((l) => (l.fromKind === kind && l.fromId === id) || (l.toKind === kind && l.toId === id))
    .map((l) => {
      const isFrom = l.fromKind === kind && l.fromId === id;
      return {
        link: l,
        kind: (isFrom ? l.toKind : l.fromKind) as EntityKind,
        id: isFrom ? l.toId : l.fromId,
        note: l.note,
      };
    });
}

export type ReadinessCheck = {
  id: string;
  label: string;
  detail: string;
  met: boolean;
};

/**
 * Story readiness — informational only. These are real checks computed from the
 * project, never a score, streak or grade.
 */
export function readinessChecks(snapshot: ProjectSnapshot): ReadinessCheck[] {
  const { scenes, characters, plots, events, world, notes } = snapshot;
  const drafted = scenes.filter((s) => wordCount(s.content) >= 100);
  const namedMotivation = characters.filter((c) => c.motivation.trim().length > 0);
  const arcs = characters.filter((c) => c.arc.trim().length > 0);
  const withPayoff = plots.filter((p) => (JSON.parse(p.payoffs || "[]") as string[]).length > 0);
  const unplaced = events.filter((e) => e.confidence === "unplaced");
  const costed = world.filter((w) => w.costs.trim().length > 0 && w.limits.trim().length > 0);
  const linkedScenes = scenes.filter((s) => relatedLinks(snapshot, "scene", s.id).length > 0);

  return [
    {
      id: "scene-started",
      label: "At least one scene is really underway",
      detail: `${drafted.length} of ${scenes.length} scenes have 100+ words`,
      met: drafted.length > 0,
    },
    {
      id: "motivation",
      label: "Every character has a motivation in their own words",
      detail: `${namedMotivation.length} of ${characters.length} characters`,
      met: characters.length > 0 && namedMotivation.length === characters.length,
    },
    {
      id: "arc",
      label: "Each character has an arc note (even a provisional one)",
      detail: `${arcs.length} of ${characters.length} characters`,
      met: characters.length > 0 && arcs.length === characters.length,
    },
    {
      id: "payoff",
      label: "Every plot thread has at least one payoff candidate",
      detail: `${withPayoff.length} of ${plots.length} threads`,
      met: plots.length > 0 && withPayoff.length === plots.length,
    },
    {
      id: "timeline",
      label: "No timeline event is still unplaced",
      detail:
        unplaced.length === 0
          ? "Every event has a story time or a relative position"
          : `${unplaced.length} unplaced: ${unplaced.map((e) => e.label).join(", ")}`,
      met: unplaced.length === 0,
    },
    {
      id: "world-cost",
      label: "World rules state their limits and costs",
      detail: `${costed.length} of ${world.length} entries`,
      met: world.length > 0 && costed.length === world.length,
    },
    {
      id: "linked",
      label: "Scenes are connected to the story material around them",
      detail: `${linkedScenes.length} of ${scenes.length} scenes have links`,
      met: scenes.length > 0 && linkedScenes.length === scenes.length,
    },
    {
      id: "research",
      label: "Research notes are in the project rather than elsewhere",
      detail: `${notes.length} notes captured`,
      met: notes.length > 0,
    },
  ];
}

/* ------------------------------------------------------------- app context */

type ManuscriptView = "document" | "cards" | "binder";

type Selection = Record<EntityKind, string | null>;

/**
 * Nothing is pre-selected: each workspace falls back to its first row. This also
 * means switching books can never leave another book's id selected.
 */
const emptySelection: Selection = {
  scene: null,
  character: null,
  plot: null,
  event: null,
  world: null,
  note: null,
};

type WorkspaceState = {
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
  selection: Selection;
  select: (kind: EntityKind, id: string | null) => void;
  selectedSceneId: string | null;
  view: ManuscriptView;
  setView: (v: ManuscriptView) => void;
  draftZeroSceneId: string | null;
  openDraftZero: (id: string) => void;
  closeDraftZero: () => void;
  dismissedLenses: string[];
  dismissLens: (id: string) => void;
  restoreLenses: () => void;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [view, setView] = useState<ManuscriptView>("document");
  const [draftZeroSceneId, setDraftZeroSceneId] = useState<string | null>(null);
  const [dismissedLenses, setDismissedLenses] = useState<string[]>([]);

  // The library is the source of truth for which book is open. If the active id
  // disappears (demo reset, or the book was archived) fall back to the first
  // book on the shelf rather than showing a 404.
  const library = useQuery<LibrarySnapshot>({ queryKey: LIBRARY_KEY });
  const books: ProjectSummary[] = library.data?.projects ?? [];

  useEffect(() => {
    if (books.length === 0) return;
    const stillThere = books.some((b) => b.id === activeProjectId && b.archived === 0);
    if (!stillThere) {
      const next = books.find((b) => b.archived === 0) ?? books[0];
      if (next && next.id !== activeProjectId) {
        setActiveProjectId(next.id);
        setSelection(emptySelection);
        setDraftZeroSceneId(null);
      }
    }
  }, [books, activeProjectId]);

  const select = useCallback((kind: EntityKind, id: string | null) => {
    setSelection((prev) => ({ ...prev, [kind]: id }));
  }, []);

  const setActiveProject = useCallback((id: string) => {
    setActiveProjectId(id);
    setSelection(emptySelection);
    setDraftZeroSceneId(null);
    setView("document");
  }, []);

  const value = useMemo<WorkspaceState>(
    () => ({
      activeProjectId,
      setActiveProject,
      selection,
      select,
      selectedSceneId: selection.scene,
      view,
      setView,
      draftZeroSceneId,
      openDraftZero: (id: string) => {
        select("scene", id);
        setDraftZeroSceneId(id);
      },
      closeDraftZero: () => setDraftZeroSceneId(null),
      dismissedLenses,
      dismissLens: (id: string) => setDismissedLenses((prev) => [...prev, id]),
      restoreLenses: () => setDismissedLenses([]),
    }),
    [activeProjectId, setActiveProject, selection, select, view, draftZeroSceneId, dismissedLenses],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

/** Convenience: selected id + setter for one entity kind. */
export function useSelection(kind: EntityKind): [string | null, (id: string | null) => void] {
  const { selection, select } = useWorkspace();
  return [selection[kind], (id) => select(kind, id)];
}
