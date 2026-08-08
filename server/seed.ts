/**
 * Demo library seed — several books, each a separate project.
 *
 * The flagship demo book is "The Glass Meridian". v0.2 adds a second, much
 * earlier-stage book so that switching between projects visibly changes every
 * workspace, and an archived third book so the shelved state can be exercised.
 *
 *
 * Authored placeholder material for the prototype. It exists so that every
 * workspace (manuscript, characters, plot, timeline, worldbuilding, research)
 * opens with realistic speculative-fiction content and real two-way links.
 * Nothing here is generated at runtime; the app never writes prose for a user.
 */
import type { ProjectSnapshot } from "@shared/schema";
import { buildArchivedBook, buildSaltAndSignal } from "./seed-books";

const P = "glass-meridian";

const scene = (
  id: string,
  chapter: string,
  title: string,
  status: string,
  pov: string,
  orderIndex: number,
  objective: string,
  conflict: string,
  change: string,
  content: string,
  draftZero = 0,
) => ({
  id,
  projectId: P,
  chapter,
  title,
  content,
  status,
  pov,
  objective,
  conflict,
  change,
  orderIndex,
  draftZero,
});

export function buildGlassMeridian(): ProjectSnapshot {
  return {
    project: {
      id: P,
      ownerId: "", // assigned by storage when the demo library is seeded
      title: "The Glass Meridian",
      subtitle: "Book one of the Vitrified Coast",
      author: "You",
      genre: "Secondary-world fantasy with an industrial edge",
      format: "Novel",
      archived: 0,
      createdAt: "2026-02-11",
      sortIndex: 0,
      wordTarget: 95000,
      premise:
        "In a city that stores its memories in glass, an unlicensed glasswright discovers the ledger of the dead is being edited — and that her own childhood is one of the edits.",
      method: "hybrid",
    },
    scenes: [
      scene(
        "sc-1",
        "Chapter One — Annealing",
        "The furnace at low tide",
        "drafted",
        "Ilva Renn",
        0,
        "Ilva finishes an illegal commission before the tide turns.",
        "The Ordinators audit the quarter a day early.",
        "Ilva learns her forged apprentice mark is already on a list.",
        `The furnace breathed out and the sea breathed in, and between the two Ilva had perhaps an hour.

She worked the gather slowly, the way Aunt Neve had taught her before Neve stopped remembering what teaching was. Memory glass will not be hurried. Rush the anneal and the thing inside it cracks — not the glass, the memory — and what you hand your customer is a smear of somebody's afternoon.

The commission was small: a widow's last argument, softened. Ilva did not soften it. She simply moved it further from the surface, so that holding the pane would feel like remembering rather than reliving.

Outside, on the causeway, a bell that should not have rung for another day rang.`,
      ),
      scene(
        "sc-2",
        "Chapter One — Annealing",
        "An audit, arriving early",
        "revising",
        "Marshal Sabbat",
        1,
        "Sabbat wants the quarter's unlicensed work catalogued without a riot.",
        "His orders come from the Cantor, not the Ordinate.",
        "He hides one name from the list and cannot say why.",
        `Sabbat had learned to read a street the way a cooper reads a barrel: by the sound it made when struck.

This one rang wrong. Doors already shut. Furnaces already banked. Somebody had told the quarter that the audit was coming, which meant somebody in the Ordinate had a second employer.

He wrote fourteen names. He looked at the fifteenth — a girl's, with a mark that was almost convincing — and did not write it, and spent the walk back to the Meridian trying to find a lawful reason for that.`,
      ),
      scene(
        "sc-3",
        "Chapter Two — The Ledger Room",
        "What the Cantor keeps",
        "draft-zero",
        "Ilva Renn",
        2,
        "Ilva bargains for a look at her own entry in the ledger.",
        "The Cantor trades only in memory, and Ilva has little to spare.",
        "She sees an erasure where her seventh year should be.",
        `[draft zero — talking myself through it]

She goes in expecting a room. It is a room. That's the horror of it, nothing cathedral about it, just shelving and a clerk's ladder and the smell of hot wax.

The Cantor asks what she'll pay. She offers the furnace-summer she loved most. He accepts too quickly — note that, she should notice he accepts too quickly.

Then the entry: Renn, Ilva. Seventh year: blank. Not missing. Blanked, with the anneal marks still on it, which means somebody paid a glasswright to do it properly.`,
        1,
      ),
      scene(
        "sc-4",
        "Chapter Two — The Ledger Room",
        "Kesh sells her a map she already owns",
        "drafted",
        "Ilva Renn",
        3,
        "Ilva needs the pre-vitrification survey of the causeway.",
        "Kesh only deals in things he can deny selling.",
        "The map shows a district that the city insists never existed.",
        `Kesh Amadi did business in the mouth of an alley, which he called a shopfront and the Ordinate called an offence.

"You want the old survey," he said. "Everyone wants the old survey after they've seen a blank."

"I didn't say I'd seen a blank."

"You're standing like someone who has." He unrolled it anyway: the coast before the glassing, and there, where the Meridian now ran, a district with a name Ilva's mouth already knew how to make.`,
      ),
      scene(
        "sc-5",
        "Chapter Three — Low Country",
        "The district that is not on the survey",
        "blank",
        "Ilva Renn",
        4,
        "Reach the vitrified district before the Ordinators seal the causeway.",
        "The glass there remembers out loud.",
        "",
        "",
      ),
      scene(
        "sc-6",
        "Chapter Three — Low Country",
        "Sabbat's debt comes due",
        "blank",
        "Marshal Sabbat",
        5,
        "Sabbat must deliver the fifteenth name or forfeit his own record.",
        "Delivering it destroys the only witness to the erasure.",
        "",
        "",
      ),
    ],
    characters: [
      {
        id: "ch-ilva",
        projectId: P,
        name: "Ilva Renn",
        role: "Protagonist — unlicensed glasswright",
        motivation:
          "To find out who paid to remove her seventh year, and whether her aunt agreed to it.",
        wants:
          "A licence she can show in daylight; a version of her childhood she can hold without flinching.",
        fears:
          "That the erasure was a kindness, and that remembering will make her the person it protected everyone from.",
        wins:
          "Reads an anneal mark no licensed wright can read (ch. 2); talks Kesh out of a survey he meant to keep.",
        losses:
          "Trades her best summer to the Cantor; loses Neve's workshop seal to the audit.",
        arc: "From forging a past she was given → to authoring the past she chooses to carry.",
        voice:
          "Concrete, trade-literate, allergic to metaphor about her own feelings. Counts things when frightened.",
      },
      {
        id: "ch-sabbat",
        projectId: P,
        name: "Marshal Teodore Sabbat",
        role: "Antagonist-ally — Ordinator of the Meridian",
        motivation:
          "To keep the city lawful enough that his own record is never audited.",
        wants: "A clean ledger and a quiet quarter.",
        fears: "That the law he serves is the instrument of the erasures.",
        wins: "Keeps the quarter from burning during the audit.",
        losses:
          "Omits the fifteenth name and hands the Cantor leverage over him.",
        arc: "From procedural loyalty → to a deliberate, costly act of disobedience.",
        voice:
          "Measured, clause-heavy, quotes regulation numbers when he is lying to himself.",
      },
      {
        id: "ch-kesh",
        projectId: P,
        name: "Kesh Amadi",
        role: "Ally — cartographer and smuggler of pre-glass records",
        motivation:
          "To prove the vitrification drowned a district, because his family was in it.",
        wants: "One document the Ordinate cannot deny.",
        fears: "Being the last person who remembers the name of the place.",
        wins: "Produces the pre-vitrification survey intact.",
        losses: "Burns his own shop to keep the survey out of the audit.",
        arc: "From profitable grievance → to public testimony he cannot profit from.",
        voice: "Fast, teasing, changes the subject when it matters most.",
      },
      {
        id: "ch-cantor",
        projectId: P,
        name: "The Cantor",
        role: "Antagonist — keeper of the memory ledger",
        motivation:
          "To hold the city together by editing what it can bear to remember.",
        wants: "A citizenry with no grievance older than one generation.",
        fears: "An unedited record.",
        wins: "Buys Ilva's summer for the price of a single page.",
        losses: "Underestimates a wright who can read anneal marks.",
        arc: "Static by design — the story tests his reasoning, not his character.",
        voice: "Gentle, administrative, never raises his voice above a clerk's.",
      },
    ],
    plots: [
      {
        id: "pl-main",
        projectId: P,
        name: "Who edited the ledger",
        kind: "main",
        premise:
          "An erasure in Ilva's record leads to a systematic programme of civic forgetting.",
        stakes:
          "If the programme continues, the drowned district is never acknowledged and Neve's testimony dies with her memory.",
        status: "tangled",
        setups: JSON.stringify([
          "Ch.1 — a bell rings a day early (someone inside the Ordinate is warning the quarter)",
          "Ch.2 — anneal marks on the blanked page: the erasure was done by a trained wright",
        ]),
        payoffs: JSON.stringify([
          "Ch.9 — Ilva recognises her own aunt's anneal signature on the erasure",
        ]),
        openQuestion:
          "Does Neve's consent make the erasure forgivable, or worse?",
      },
      {
        id: "pl-licence",
        projectId: P,
        name: "The forged apprentice mark",
        kind: "subplot",
        premise:
          "Ilva works with a mark she made herself; the audit gives it a paper trail.",
        stakes: "Exposure means the furnace is sealed and Neve loses her care.",
        status: "open",
        setups: JSON.stringify([
          "Ch.1 — the mark is described as 'almost convincing'",
          "Ch.2 — Sabbat omits the fifteenth name",
        ]),
        payoffs: JSON.stringify([]),
        openQuestion: "Who eventually files the mark, and what do they want for it?",
      },
      {
        id: "pl-sabbat",
        projectId: P,
        name: "Sabbat's debt",
        kind: "subplot",
        premise:
          "A single omission puts a lawful man in the Cantor's ledger as a favour owed.",
        stakes: "His record, his rank, and the fifteenth name.",
        status: "open",
        setups: JSON.stringify([
          "Ch.1 — the fifteenth name is withheld",
        ]),
        payoffs: JSON.stringify([
          "Ch.6 — the Cantor asks for the name in a room with no clerk in it",
        ]),
        openQuestion: "Does Sabbat pay in obedience or in memory?",
      },
      {
        id: "pl-district",
        projectId: P,
        name: "The drowned district",
        kind: "subplot",
        premise:
          "The Meridian was laid over an inhabited district during the vitrification.",
        stakes: "Whether a whole community keeps its name.",
        status: "resolving",
        setups: JSON.stringify([
          "Ch.2 — Kesh's survey shows a named district under the causeway",
        ]),
        payoffs: JSON.stringify([
          "Ch.3 — the glass there remembers out loud, in voices",
        ]),
        openQuestion: "Who signed the vitrification order?",
      },
    ],
    events: [
      {
        id: "ev-vitrification",
        projectId: P,
        label: "The vitrification of the coast",
        storyTime: "≈ 60 years before Chapter One",
        confidence: "approximate",
        notes:
          "Official record gives a single night; Kesh's survey implies a staged programme over two seasons.",
        orderIndex: 0,
      },
      {
        id: "ev-erasure",
        projectId: P,
        label: "Ilva's seventh year is blanked",
        storyTime: "19 years before Chapter One",
        confidence: "fixed",
        notes: "Anneal marks date the work to late summer. Wright unidentified (for now: Neve).",
        orderIndex: 1,
      },
      {
        id: "ev-neve",
        projectId: P,
        label: "Neve stops recognising the workshop",
        storyTime: "2 years before Chapter One",
        confidence: "approximate",
        notes: "Gradual. Deliberately undated — Ilva cannot say when it began either.",
        orderIndex: 2,
      },
      {
        id: "ev-audit",
        projectId: P,
        label: "The early audit of the Furnace Quarter",
        storyTime: "Day 1",
        confidence: "fixed",
        notes: "Opens the book. Tide table matters: low tide at dusk.",
        orderIndex: 3,
      },
      {
        id: "ev-ledger",
        projectId: P,
        label: "Ilva enters the Ledger Room",
        storyTime: "Day 3",
        confidence: "fixed",
        notes: "",
        orderIndex: 4,
      },
      {
        id: "ev-causeway",
        projectId: P,
        label: "The causeway is sealed",
        storyTime: "Unplaced — somewhere in the first third",
        confidence: "unplaced",
        notes:
          "Needs to land after Kesh's survey and before the district scene. Order not yet decided.",
        orderIndex: 5,
      },
    ],
    world: [
      {
        id: "wd-memoryglass",
        projectId: P,
        name: "Memory glass",
        category: "Rule system",
        facts:
          "Silica from the vitrified coast holds human episodic memory. A trained glasswright can gather, place and anneal a memory into a pane.",
        rules:
          "1. Only the person who lived the memory can give it. 2. Placing a memory removes it from the giver at the moment of the anneal. 3. Glass can be read by touch; depth of placement controls whether it feels remembered or relived.",
        limits:
          "No memory older than the giver's own life. Nothing can be added that was not lived — glass cannot hold invention. Cracked panes lose the memory permanently.",
        costs:
          "The giver forgets. Wrights pay in tremor and sleep; a long anneal costs a night of one's own recall.",
        exceptions:
          "Coast glass formed during the vitrification holds the memories of the drowned district without a wright — it 'remembers out loud'. Nobody licensed will explain why.",
      },
      {
        id: "wd-meridian",
        projectId: P,
        name: "The Glass Meridian",
        category: "Place",
        facts:
          "A vitrified causeway seven miles long that divides the city and doubles as the civic archive.",
        rules:
          "Walking the Meridian barefoot is a legal act of witness; testimony given on the glass cannot be retracted.",
        limits: "The Meridian is impassable at spring tide.",
        costs: "Every witness leaves a little of the memory in the glass.",
        exceptions:
          "The stretch above the drowned district is fenced and described in law as 'unsound footing'.",
      },
      {
        id: "wd-ordinate",
        projectId: P,
        name: "The Ordinate",
        category: "Faction",
        facts:
          "Civil authority that licenses glasswrights and maintains the ledger of placements.",
        rules: "Every placement must be witnessed, numbered and annealed by a licensed wright.",
        limits:
          "The Ordinate cannot read glass itself — it must employ wrights, which makes it dependent on the people it polices.",
        costs: "Its legitimacy rests entirely on the ledger being complete.",
        exceptions:
          "The Cantor's office sits outside the Ordinate's audit and answers to no clerk.",
      },
    ],
    notes: [
      {
        id: "nt-tides",
        projectId: P,
        title: "Tide table for the causeway",
        body:
          "Low tide at dusk on Day 1 (audit), Day 3 (Ledger Room), spring tide on Day 11. If the causeway is sealed on Day 6 the characters have to take the boat — decide before drafting Chapter Three.",
        tags: JSON.stringify(["continuity", "timeline"]),
        sourcePath: "",
        origin: "authored",
      },
      {
        id: "nt-glassmaking",
        projectId: P,
        title: "Real glassmaking vocabulary",
        body:
          "gather, marver, punty, anneal, lehr, frit. Annealing is slow controlled cooling — the whole magic system's cost should ride on it. Keep the jargon to three or four words per scene.",
        tags: JSON.stringify(["research", "craft"]),
        sourcePath: "research/glass-notes.md",
        origin: "imported",
      },
      {
        id: "nt-privacy",
        projectId: P,
        title: "Note to self about draft zero",
        body:
          "Chapter Two is allowed to be bad. Write it to tell myself the story, not to show anyone. Come back with distance before judging it.",
        tags: JSON.stringify(["process"]),
        sourcePath: "",
        origin: "authored",
      },
    ],
    links: [
      { id: "lk-1", projectId: P, fromKind: "scene", fromId: "sc-1", toKind: "character", toId: "ch-ilva", note: "POV" },
      { id: "lk-2", projectId: P, fromKind: "scene", fromId: "sc-1", toKind: "plot", toId: "pl-licence", note: "setup" },
      { id: "lk-3", projectId: P, fromKind: "scene", fromId: "sc-1", toKind: "world", toId: "wd-memoryglass", note: "anneal cost shown" },
      { id: "lk-4", projectId: P, fromKind: "scene", fromId: "sc-1", toKind: "event", toId: "ev-audit", note: "" },
      { id: "lk-5", projectId: P, fromKind: "scene", fromId: "sc-2", toKind: "character", toId: "ch-sabbat", note: "POV" },
      { id: "lk-6", projectId: P, fromKind: "scene", fromId: "sc-2", toKind: "plot", toId: "pl-sabbat", note: "setup" },
      { id: "lk-7", projectId: P, fromKind: "scene", fromId: "sc-2", toKind: "event", toId: "ev-audit", note: "" },
      { id: "lk-8", projectId: P, fromKind: "scene", fromId: "sc-3", toKind: "character", toId: "ch-cantor", note: "" },
      { id: "lk-9", projectId: P, fromKind: "scene", fromId: "sc-3", toKind: "plot", toId: "pl-main", note: "inciting discovery" },
      { id: "lk-10", projectId: P, fromKind: "scene", fromId: "sc-3", toKind: "event", toId: "ev-erasure", note: "" },
      { id: "lk-11", projectId: P, fromKind: "scene", fromId: "sc-4", toKind: "character", toId: "ch-kesh", note: "" },
      { id: "lk-12", projectId: P, fromKind: "scene", fromId: "sc-4", toKind: "plot", toId: "pl-district", note: "setup" },
      { id: "lk-13", projectId: P, fromKind: "scene", fromId: "sc-5", toKind: "world", toId: "wd-memoryglass", note: "exception: remembers out loud" },
      { id: "lk-14", projectId: P, fromKind: "scene", fromId: "sc-5", toKind: "event", toId: "ev-causeway", note: "" },
      { id: "lk-15", projectId: P, fromKind: "scene", fromId: "sc-6", toKind: "character", toId: "ch-sabbat", note: "" },
      { id: "lk-16", projectId: P, fromKind: "scene", fromId: "sc-6", toKind: "plot", toId: "pl-sabbat", note: "payoff candidate" },
      { id: "lk-17", projectId: P, fromKind: "character", fromId: "ch-ilva", toKind: "world", toId: "wd-memoryglass", note: "trade" },
      { id: "lk-18", projectId: P, fromKind: "note", fromId: "nt-tides", toKind: "event", toId: "ev-audit", note: "continuity" },
      { id: "lk-19", projectId: P, fromKind: "note", fromId: "nt-glassmaking", toKind: "world", toId: "wd-memoryglass", note: "source" },
      { id: "lk-20", projectId: P, fromKind: "character", fromId: "ch-sabbat", toKind: "world", toId: "wd-ordinate", note: "employer" },
    ],
    attachments: [],
    checklist: [
      { id: "cl-1", projectId: P, label: "Decide whether Neve consented to the erasure", done: 0, orderIndex: 0 },
      { id: "cl-2", projectId: P, label: "Fix the tide table against Chapter Three", done: 0, orderIndex: 1 },
      { id: "cl-3", projectId: P, label: "Name the drowned district", done: 1, orderIndex: 2 },
    ],
  };
}

/**
 * The whole demo library, in display order. The first entry is the book the
 * workspace opens on.
 */
export function buildLibrarySeed(): ProjectSnapshot[] {
  return [buildGlassMeridian(), buildSaltAndSignal(), buildArchivedBook()];
}
