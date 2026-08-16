/**
 * Additional demo books for the v0.2 library.
 *
 * These exist so the book switcher has something real to switch to: a second,
 * deliberately earlier-stage project, and an archived one. Like the flagship
 * seed, every word here is fixed placeholder material written into the file. The
 * app never generates prose at runtime.
 */
import type {
  Attachment,
  Character,
  ChecklistItem,
  Link,
  Note,
  Plot,
  Project,
  ProjectSnapshot,
  Scene,
  StoryEvent,
  WorldEntry,
} from "@shared/schema";

/* ------------------------------------------------------------ v0.3 defaults */

/**
 * The seed literals below predate the v0.3 shared schema migration. Rather than
 * repeat `updatedAt: ""` on a few hundred authored rows, the row shapes are
 * declared without the columns that migration added and `completeSeed` fills
 * them in with their schema defaults. Demo material carries no real timestamps,
 * so an empty `updatedAt` is the honest value: nothing has been edited yet.
 */
type SeedSnapshot = {
  project: Project;
  scenes: Omit<Scene, "updatedAt">[];
  characters: Omit<Character, "updatedAt">[];
  plots: Omit<Plot, "updatedAt">[];
  events: Omit<StoryEvent, "updatedAt">[];
  world: Omit<WorldEntry, "updatedAt">[];
  notes: Omit<Note, "updatedAt">[];
  links: Omit<Link, "updatedAt" | "origin" | "relKind">[];
  attachments: Attachment[];
  checklist: Omit<ChecklistItem, "updatedAt">[];
};

export function completeSeed(seed: SeedSnapshot): ProjectSnapshot {
  const stamp = <T,>(rows: T[]) => rows.map((row) => ({ ...row, updatedAt: "" }));
  return {
    project: seed.project,
    scenes: stamp(seed.scenes),
    characters: stamp(seed.characters),
    plots: stamp(seed.plots),
    events: stamp(seed.events),
    world: stamp(seed.world),
    notes: stamp(seed.notes),
    // Every seeded link was drawn by hand, so it is authored, not derived.
    links: seed.links.map((link) => ({ ...link, origin: "authored", relKind: "", updatedAt: "" })),
    attachments: seed.attachments,
    checklist: stamp(seed.checklist),
    // The demo library ships no aliases, comments or captures yet.
    aliases: [],
    comments: [],
    captureItems: [],
  };
}


/* ------------------------------------------------- book two: Salt and Signal */

const S = "salt-and-signal";

/**
 * Early-stage near-future SF. Chosen to look nothing like The Glass Meridian:
 * fewer scenes, most of them unwritten, thinner planning material, and several
 * readiness checks deliberately unmet.
 */
export function buildSaltAndSignal(): ProjectSnapshot {
  return completeSeed({
    project: {
      id: S,
      ownerId: "", // assigned by storage when the demo library is seeded
      title: "Salt and Signal",
      subtitle: "A drowned-coast first contact story",
      author: "You",
      genre: "Near-future science fiction",
      format: "Novel",
      archived: 0,
      createdAt: "2026-07-19",
      sortIndex: 1,
      wordTarget: 78000,
      premise:
        "A tide-gauge technician on a retreating English coast starts receiving a repeating signal in the sediment data, three weeks before anyone else notices it.",
      method: "discovery",
    },
    scenes: [
      {
        id: "ss-1",
        projectId: S,
        chapter: "Part One — Gauge",
        title: "Seventeen minutes of bad data",
        content:
          "The gauge at Fleetmarsh had been lying since March, and Ada had the paperwork to prove it. She logged the drift, stamped the sheet, and was halfway to the door of the hut when the trace moved again — not the slow shrug of silt, but something with edges, something that repeated. She sat back down without taking her coat off.\n\nBy the time the tide turned she had counted the pattern eleven times and written none of it down.",
        status: "drafted",
        pov: "Ada Mireille",
        objective: "Close out a routine fault report",
        conflict: "The fault is not a fault",
        change: "She hides the data instead of filing it",
        orderIndex: 0,
        draftZero: 0,
      },
      {
        id: "ss-2",
        projectId: S,
        chapter: "Part One — Gauge",
        title: "Telling Ruth (draft zero)",
        content:
          "[messy — figure out later whether Ruth believes her at all] Ada says it out loud in the kitchen and it sounds stupid. Ruth is patient in the way that is worse than shouting. Maybe the scene is really about the mortgage and not the signal. Try it again from Ruth's side before deciding.",
        status: "draft-zero",
        pov: "Ada Mireille",
        objective: "Say the thing out loud to one person",
        conflict: "",
        change: "",
        orderIndex: 1,
        draftZero: 1,
      },
      {
        id: "ss-3",
        projectId: S,
        chapter: "Part One — Gauge",
        title: "The survey ship arrives",
        content: "",
        status: "blank",
        pov: "",
        objective: "",
        conflict: "",
        change: "",
        orderIndex: 2,
        draftZero: 0,
      },
    ],
    characters: [
      {
        id: "ss-ch-ada",
        projectId: S,
        name: "Ada Mireille",
        role: "Tide-gauge technician, protagonist",
        motivation: "I want to be believed once, about one thing, on the record.",
        wants: "Confirmation from someone with instruments better than hers",
        fears: "Being the eccentric in someone else's anecdote",
        wins: "Keeps the raw data when the agency wipes the archive",
        losses: "The seventeen minutes she never wrote down",
        arc: "From filing everything to trusting nothing but her own copy",
        voice: "Flat, technical, funnier than she means to be",
      },
      {
        id: "ss-ch-ruth",
        projectId: S,
        name: "Ruth Okonjo-Mireille",
        role: "Ada's wife, structural engineer",
        motivation: "I want us to leave this coast before it takes the house.",
        wants: "A decision about moving inland",
        fears: "That Ada has found a reason to stay forever",
        wins: "",
        losses: "",
        arc: "",
        voice: "Precise, unsentimental, asks the question nobody wants",
      },
    ],
    plots: [
      {
        id: "ss-pl-signal",
        projectId: S,
        name: "The signal in the sediment",
        kind: "main",
        premise: "A repeating pattern in tide data that predates any known transmitter.",
        stakes: "If it is real, the coast is not being abandoned — it is being watched.",
        status: "open",
        setups: JSON.stringify([
          "Seventeen minutes of unlogged trace in Chapter One",
          "The gauge's calibration certificate expired in March",
        ]),
        payoffs: JSON.stringify([]),
        openQuestion: "Who else already knows, and how long have they known?",
      },
      {
        id: "ss-pl-house",
        projectId: S,
        name: "Whether to leave the house",
        kind: "subplot",
        premise: "Ruth wants to sell before the sea decides for them.",
        stakes: "The marriage, and the only vantage point Ada has.",
        status: "tangled",
        setups: JSON.stringify(["The kitchen argument that is not about the signal"]),
        payoffs: JSON.stringify(["Ruth stays for the wrong reason"]),
        openQuestion: "Does the house survive the book?",
      },
    ],
    events: [
      {
        id: "ss-ev-drift",
        projectId: S,
        label: "Fleetmarsh gauge starts drifting",
        storyTime: "March, eight months before Chapter One",
        confidence: "fixed",
        notes: "Gives the fault report a paper trail Ada can hide behind.",
        orderIndex: 0,
      },
      {
        id: "ss-ev-first",
        projectId: S,
        label: "First clean repetition of the signal",
        storyTime: "Chapter One, low tide",
        confidence: "fixed",
        notes: "Eleven repetitions counted, none recorded.",
        orderIndex: 1,
      },
      {
        id: "ss-ev-ship",
        projectId: S,
        label: "Survey ship anchors off the point",
        storyTime: "",
        confidence: "unplaced",
        notes: "Might belong much later. Decide once Part Two exists.",
        orderIndex: 2,
      },
    ],
    world: [
      {
        id: "ss-wd-coast",
        projectId: S,
        name: "The Fleetmarsh retreat",
        category: "Setting",
        facts:
          "Managed retreat: sea defences deliberately breached in 2039, three villages bought out, one holdout terrace still occupied.",
        rules: "Nothing supernatural. Every strange thing must have an instrument reading behind it.",
        limits: "",
        costs: "",
        exceptions: "",
      },
    ],
    notes: [
      {
        id: "ss-nt-gauges",
        projectId: S,
        title: "How tide gauges actually fail",
        body:
          "Stilling well silts up; float sticks; datum shifts after storms. Any of these could mask a signal for months — useful, because it explains why nobody noticed first.",
        tags: JSON.stringify(["research", "technical"]),
        sourcePath: "research/tide-gauges.md",
        origin: "imported",
      },
      {
        id: "ss-nt-shape",
        projectId: S,
        title: "Shape worry",
        body:
          "This is a discovery draft. Resist outlining past Part One. If the signal has an explanation by Chapter Five the book becomes a procedural, and that is not the book.",
        tags: JSON.stringify(["process"]),
        sourcePath: "",
        origin: "authored",
      },
    ],
    links: [
      { id: "ss-lk-1", projectId: S, fromKind: "scene", fromId: "ss-1", toKind: "character", toId: "ss-ch-ada", note: "POV" },
      { id: "ss-lk-2", projectId: S, fromKind: "scene", fromId: "ss-1", toKind: "plot", toId: "ss-pl-signal", note: "setup" },
      { id: "ss-lk-3", projectId: S, fromKind: "scene", fromId: "ss-1", toKind: "event", toId: "ss-ev-first", note: "" },
      { id: "ss-lk-4", projectId: S, fromKind: "scene", fromId: "ss-2", toKind: "character", toId: "ss-ch-ruth", note: "" },
      { id: "ss-lk-5", projectId: S, fromKind: "scene", fromId: "ss-2", toKind: "plot", toId: "ss-pl-house", note: "setup" },
      { id: "ss-lk-6", projectId: S, fromKind: "note", fromId: "ss-nt-gauges", toKind: "world", toId: "ss-wd-coast", note: "source" },
    ],
    attachments: [],
    checklist: [
      { id: "ss-cl-1", projectId: S, label: "Decide where the survey ship belongs on the timeline", done: 0, orderIndex: 0 },
      { id: "ss-cl-2", projectId: S, label: "Write the kitchen scene from Ruth's side once", done: 0, orderIndex: 1 },
    ],
  });
}

/* --------------------------------------------- book three: archived example */

const W = "weatherwrights-daughter";

/** A shelved book, kept to demonstrate archive / unarchive. */
export function buildArchivedBook(): ProjectSnapshot {
  return completeSeed({
    project: {
      id: W,
      ownerId: "", // assigned by storage when the demo library is seeded
      title: "The Weatherwright's Daughter",
      subtitle: "Shelved after the first act",
      author: "You",
      genre: "Cosy fantasy",
      format: "Novella",
      archived: 1,
      createdAt: "2025-09-02",
      sortIndex: 2,
      wordTarget: 40000,
      premise:
        "A weather-mender's apprentice inherits a shop, a debt and a barometer that only ever predicts one afternoon.",
      method: "planning",
    },
    scenes: [
      {
        id: "wd-1",
        projectId: W,
        chapter: "Chapter One",
        title: "Inheriting the shop",
        content:
          "The barometer read fair, which it had read for eleven years, through two floods and a funeral.",
        status: "draft-zero",
        pov: "Miren",
        objective: "Take possession of the shop",
        conflict: "The debt came with it",
        change: "",
        orderIndex: 0,
        draftZero: 1,
      },
    ],
    characters: [
      {
        id: "wd-ch-miren",
        projectId: W,
        name: "Miren",
        role: "Apprentice weatherwright",
        motivation: "I want to keep one promise my mother made.",
        wants: "To keep the shop open a year",
        fears: "Being the one who closes it",
        wins: "",
        losses: "",
        arc: "Provisional: from keeping the shop to letting it go well",
        voice: "Warm, hesitant",
      },
    ],
    plots: [],
    events: [],
    world: [],
    notes: [
      {
        id: "wd-nt-why",
        projectId: W,
        title: "Why this is shelved",
        body:
          "The premise is fine and the plot is not. Parked on purpose, not abandoned. Nothing here is deleted.",
        tags: JSON.stringify(["process"]),
        sourcePath: "",
        origin: "authored",
      },
    ],
    links: [
      { id: "wd-lk-1", projectId: W, fromKind: "scene", fromId: "wd-1", toKind: "character", toId: "wd-ch-miren", note: "POV" },
    ],
    attachments: [],
    checklist: [
      { id: "wd-cl-1", projectId: W, label: "Reread before deciding whether to restart", done: 0, orderIndex: 0 },
    ],
  });
}
