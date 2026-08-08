# Wordsmithery — Implementation Plan v0.2

**Status:** working browser prototype, multi-book workspace built and QA'd (2026-08-04)
**Supersedes:** v0.1 of this plan (same path, renamed; a stub remains at `wordsmithery-implementation-plan-v0.1.md`)
**Prototype path:** `projects/book-writer-.../files/wordsmithery-app`
**Companion docs:** `wordsmithery-prd-v0.1.md` (product definition), `wordsmithery-craft-research-2026-08-04.md` (craft sources)

Wordsmithery is a local-first, author-owned writing workspace for first-time novelists, initially friendly to fantasy and science fiction. It is a creative tool, not a ghostwriter: **the application never generates scenes, chapters, dialogue, endings, or prose**, and this prototype contains no AI surfaces at all. Every craft prompt in the interface is optional, dismissible, and phrased so that planners and discovery writers are both first-class.

v0.2 adds the two things v0.1 explicitly could not prove: **several books open in one workspace**, and an **import process an author can actually trust** — scan, review, correct, then confirm.

---

## 1. What changed in v0.2

| Area | v0.1 | v0.2 |
| --- | --- | --- |
| Books | One seeded project; the switcher was a placebo that explained the limit in a toast | Real library: 3 seeded books (2 on the shelf, 1 archived), create, switch, archive, unarchive. Switcher in the header and inside the mobile drawer |
| Scoping | Every record already carried `projectId`, but only one project existed | Every read and write is project-scoped through the URL: `/api/projects/:projectId/...`. Switching books swaps manuscript, planning workspaces, dashboard, readiness checks and exports |
| Import | Single file, single note, inline on the Research page | Three-stage wizard at `/#/import`: choose (multi-select or sample files) → review (per-item editable title and classification, preview, include toggle, skip reasons) → imported (per-item receipts, links to the created records) |
| Classification | Filed everything as a research note | Deterministic filename/heading heuristic across six kinds (scene, character, plot, timeline event, worldbuilding, note), each with a stated reason and an overridable dropdown |
| Portability | JSON snapshot `wordsmithery-project/0.1` | Per-book snapshot `wordsmithery-project/0.2` with an explicit `scope` field, plus a whole-library snapshot `wordsmithery-library/0.2` containing every book under `projects[]` |
| Dashboard | Assumed a populated project | Handles a genuinely empty book: disabled Draft Zero with an explanation, empty "Recent work" state, empty-book banner, no phantom "(deleted)" labels |

Preserved from v0.1 without regression: literary design tokens and Fontshare typography, draft-zero safeguards, dark mode, mobile drawer, scroll reset on navigation, skip-to-content button, 404 recovery, all previous routes and testids.

---

## 2. Phasing (unchanged direction)

- **Phase 0** — product definition (PRD + craft research). Done.
- **Phase 1** — browser prototype: IA, two-way links, three manuscript views, draft zero, client-side export. Done in v0.1.
- **Phase 1.5 (this build)** — multi-book workspace, import review workflow, explicit export scope.
- **Phase 2** — desktop shell (Tauri/Electron) with a filesystem adapter per the PRD folder format, one folder per book; snapshot autosave and a `history/` append log; real DOCX/EPUB/PDF typesetting.
- **Phase 3** — trust and durability: optional encryption-at-rest with a documented threat model, revision history with diffs, read-only share bundles.
- **Phase 4** — optional, opt-in, non-generative assistance only (continuity and link checks). Prose generation stays permanently out of scope.

---

## 3. Technical choices

Unchanged from v0.1 except where noted.

| Area | Choice | Why |
| --- | --- | --- |
| Client | React 18 + TypeScript, Vite | Typed model shared with the server |
| Routing | `wouter` with `useHashLocation` | Required by the preview sandbox; survives static hosting. New routes `/library`, `/import` |
| Server | Express, single process, serves API + built client | One port, one command |
| Schema | Drizzle `sqliteTable` + `drizzle-zod` in `shared/schema.ts` | One source of truth for validation, client types and the export contract |
| Storage (prototype) | `MemoryStorage` holding `Map<projectId, ProjectSnapshot>`, seeded at boot | No browser persistence is permitted in the sandbox; the map keeps project boundaries structurally impossible to cross |
| Data fetching | TanStack Query v5. `["/api/projects"]` for the library list, `["/api/projects", id, "snapshot"]` for the open book, `["/api/library","snapshots"]` for the library export | The default query function joins key segments with `/`, so no custom fetchers are needed |
| Active book | React context (`client/src/lib/workspace.tsx`), never persisted | localStorage/sessionStorage/IndexedDB/cookies are all forbidden. On load the first non-archived book opens; if the active book is archived or reset away, the context recovers to the first available book |
| Import scanning | Pure functions in `client/src/lib/import-scan.ts` | Deterministic, offline, unit-testable, and readable by the author. No model, no network |
| Exports | Pure functions in `client/src/lib/exporters.ts` | Never depend on a server round trip or an account |
| Styling | Tailwind CSS v3 + shadcn/ui, HSL CSS variables | Token-driven light/dark theming |
| Type / colour | Zodiak (display), Satoshi (UI), Erode (prose), IBM Plex Mono (data), all Fontshare; warm paper, night ink, oxblood accent | Author's-workshop direction; no gradients, no AI imagery, no fake charts |

**Deliberate non-choices:** no browser storage of any kind, no accounts, no analytics, no third-party editor engine, no charting library, no AI service.

---

## 4. Data model

Ten record types, all with stable string ids and `projectId` scoping. Full definitions in `wordsmithery-app/shared/schema.ts`.

### Changes in v0.2

`projects` gains:

| Field | Type | Notes |
| --- | --- | --- |
| `format` | text, default `"Novel"` | Novel / Novella / Serial / Short story collection / Other — informational only |
| `archived` | integer 0/1, default 0 | Archiving hides a book from the switcher. It is a state on the book, never a delete |
| `createdAt` | ISO date string | Seeded books carry plausible dates; new books use today |
| `sortIndex` | integer | Shelf order, independent of title |

New shared types and contracts:

- `newProjectSchema` — title required (1–120 chars); subtitle, genre, format, author, premise, method, wordTarget optional.
- `ProjectCounts` / `ProjectSummary` / `LibrarySnapshot` — the library list is counts only (scenes, characters, plots, events, world, notes, links, words), never full book contents, so the switcher stays cheap.
- `importKinds` = scene | character | plot | event | world | note; `importItemSchema` { kind, title, body, fileName }; `importRequestSchema` { items: 1–50 }; `ImportResult` { projectId, created[] }.
- `SNAPSHOT_FORMAT_VERSION = "wordsmithery-project/0.2"`, `LIBRARY_FORMAT_VERSION = "wordsmithery-library/0.2"`.

Design rules carried forward: prose is plain Markdown-compatible text in one field; `setups`, `payoffs`, `tags` are JSON text columns (SQLite has no array type); relationships are rows in `links` so either end can add or remove one; deleting a record cascades its links.

**Project boundary rule (new, enforced in storage):** ids are only ever resolved inside one book's snapshot. A link, attachment or checklist item cannot reference a record in another book, because the collection it is looked up in belongs to a single `ProjectSnapshot`. Imports are created directly into the snapshot named in the request URL.

### Where imported material lands

| Chosen kind | Created as |
| --- | --- |
| Scene | `scenes` row, chapter "Imported material", status `draft-zero`, `draftZero = 1` |
| Character | `characters` row, role "Imported — needs review", text kept in `voice` |
| Plot thread | `plots` row, text kept as `premise` |
| Timeline event | `events` row, `confidence = "unplaced"` |
| Worldbuilding | `world_entries` row, category "Imported", text kept in `facts` |
| Research note | `notes` row, `tags = ["imported"]`, `origin = "imported"` |

### Export contract

Two documented JSON envelopes, both carrying `format`, `scope`, `exportedAt` and a `documentation` block:

```
wordsmithery-project/0.2   scope: "selected-project"
  { format, scope, exportedAt, documentation, project, scenes, characters,
    plots, events, world, notes, links, attachments, checklist }

wordsmithery-library/0.2   scope: "library"
  { format, scope, exportedAt, documentation, projectCount,
    projects: [ { project, scenes, ... , checklist }, ... ] }
```

Each `projects[]` entry in the library file has exactly the shape of the single-book file minus its envelope, and `project.archived` distinguishes shelved books. Markdown, HTML and narration exports remain per-book on purpose: a single manuscript file holding several books is unreadable and unimportable. Filenames come from the book title, e.g. `the-glass-meridian-markdown.md`.

Mapping to the PRD folder format — one folder per book, unchanged from v0.1:

```
My Novel/
  README.md                     <- generated from project fields
  wordsmithery-project.json     <- the per-book JSON snapshot, verbatim
  manuscript/NN-scene-title.md  <- scenes[].content + front matter
  story/characters|plots|timeline|world|research/*.md
  media/                        <- attachments (prototype records metadata only)
  exports/                      <- Markdown / HTML / narration output
  history/                      <- Phase 2 append-only revision log
```

A library snapshot is therefore a bundle of such folders; it is a transport format, not a claim that the prototype writes any folder.

### API surface (v0.2)

Every content route is project-scoped. Unknown project or collection returns 404.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects` | Library list: summaries + counts, archived included |
| GET | `/api/library/snapshots` | Every book in full — used only by the library JSON export |
| POST | `/api/projects` | Create a book from `newProjectSchema`; starts genuinely empty |
| GET | `/api/projects/:projectId/snapshot` | One book, all collections |
| PATCH | `/api/projects/:projectId` | title, subtitle, author, genre, format, premise, method, archived, wordTarget (500–500,000) |
| POST | `/api/projects/:projectId/import` | Confirmed import items → records in that book only |
| POST | `/api/projects/:projectId/scenes/reorder` | Move a scene up/down |
| POST | `/api/projects/:projectId/:collection` | Create in scenes, characters, plots, events, world, notes, links, attachments, checklist |
| PATCH / DELETE | `/api/projects/:projectId/:collection/:id` | Update / delete, links cascaded on delete |
| POST | `/api/reset` | Reseed the whole library, discarding created books |

Writes are validated against the matching `drizzle-zod` insert schema (partial for PATCH).

---

## 5. Interface additions

**Library (`/#/library`)** — shelf of book cards with format, genre and live counts; `open now` / `archived` badges; Go to this book, Import files, Archive / Bring back to the shelf; a "Start a new book" form (title required, subtitle/genre/format optional) that opens the new book immediately and offers a link to its dashboard; separate Archive section with its own empty state; an honest-limits panel about session-only storage.

**Switcher** — a `Select` in the header and a second one inside the sidebar/mobile drawer, listing non-archived books plus "Manage library…". Switching resets the current selection, closes any draft-zero session, and returns the manuscript to Document view so no stale record from the previous book stays on screen. On mobile the drawer closes after a switch.

**Import wizard (`/#/import`)** — three stages with a step indicator (`status-step-*`):

1. *Choose* — multi-file browser picker (`.md`, `.markdown`, `.txt`, `.text`, ≤400 KB each, ≤50 files) or "Use sample files" for environments where the picker is unavailable. States accepted types and that nothing is created yet.
2. *Review* — one row per file: filename, size, word count, the stated reason for the suggestion, an editable title, an editable "Import as" dropdown with a "Lands in:" explanation, Preview text, Remove from list, and an include checkbox. Unsupported, empty, oversized and unreadable files appear as skipped rows with a plain-language reason and a skipped count.
3. *Imported* — a receipt per created record with its kind, title, word count and source filename, a link that opens each record in its workspace, plus "Import more" and "Back to the library".

The wizard names its target book in every stage: "Everything imported lands in *X* and in no other book."

**Accessibility and test surface** — labelled selects (`aria-label="Switch book"`), `role="status"` on confirmations and step state, `role="alert"` on errors, `aria-describedby` hints on the new-book form, Escape-closable selects, focus return to the drawer trigger, and `data-testid` on every interactive and state-bearing element (`card-book-*`, `button-open-book-*`, `button-archive-*`, `button-unarchive-*`, `option-project-*`, `row-import-*`, `select-import-kind-*`, `checkbox-import-include-*`, `button-import-confirm`, `text-import-result`, `status-empty-book`, `text-export-scope`, `button-export-library-json`, and the full v0.1 set).

---

## 6. Acceptance test matrix (v0.2 additions)

Executed against the production build (`NODE_ENV=production node dist/index.cjs`, port 5000) with Playwright at 1440×900 desktop and 390×844 mobile. The 22 v0.1 cases were re-covered by navigation, dark-mode and drawer checks below; the table lists what was exercised for this milestone.

| # | Case | Method | Result |
| --- | --- | --- | --- |
| 1 | Library lists seeded books with counts, active and archived separated | `/#/library` at 1440 and 390 | pass (2 on the shelf, 1 shelved; Glass Meridian 6 scenes / 377 words) |
| 2 | Header switcher lists only non-archived books plus "Manage library…" | open `select-project` | pass |
| 3 | Switching books changes the dashboard | Glass Meridian → Salt and Signal | pass (377/95,000 → 123/78,000; header count follows) |
| 4 | Switching books changes the manuscript | `/#/manuscript` after switch | pass (Salt and Signal's 3 scenes only) |
| 5 | Switching books changes planning workspaces | `/#/characters` both ways | pass (Ada/Ruth vs Ilva/Sabbat/Kesh/Cantor) |
| 6 | Create a book | new-book form, title + genre | pass (`text-newbook-created`, becomes the open book, shelf count 2 → 3) |
| 7 | Duplicate title gets a distinct id | created "The Quiet Signalman" twice | pass (`the-quiet-signalman`, `the-quiet-signalman-2`) |
| 8 | New book is genuinely empty and says so | dashboard of new book | pass (`status-empty-book`, Draft Zero disabled with reason, empty Recent work) |
| 9 | Archive removes a book from the switcher, not from the library | archive then reopen switcher | pass (card moves to Archive with `archived` badge) |
| 10 | Unarchive returns it to the shelf | `button-unarchive-weatherwrights-daughter` | pass (shelf count +1, archive empty state shown) |
| 11 | Import wizard states its target book | from Library card and from Research pointer | pass ("lands in Salt and Signal and in no other book") |
| 12 | Sample-file path scans three documents with reasons | `button-import-sample` | pass (Character / Scene / Research note, each with a stated reason) |
| 13 | Real file picker scans a mixed selection | `setInputFiles` with 2 valid, 1 empty, 1 `.pdf` | pass (Timeline event + Research note; 2 skipped with reasons, `2 files skipped and left untouched`) |
| 14 | Classification and title are editable before confirming | changed one kind to Worldbuilding, retitled a scene | pass ("Lands in: Worldbuilding, text kept as facts") |
| 15 | Preview shows file text without creating anything | `button-import-preview-*` | pass |
| 16 | Confirm creates the records and reports them | `button-import-confirm` | pass ("3 items imported into Salt and Signal. They appear only in this book.") |
| 17 | Imported records appear only in the active book | compared both books after import | pass (Ada Mireille import in Salt and Signal only; Glass Meridian characters unchanged) |
| 18 | Import into a second book stays separate | 2 items into The Glass Meridian | pass (timeline gained "Timeline of the flood year", unplaced) |
| 19 | Export page states its scope | `/#/exports` | pass ("contain The Glass Meridian only … `wordsmithery-project/0.2`") |
| 20 | Library JSON export covers every book | `button-export-library-json` | pass (3 books, 37,074 bytes measured — an earlier draft of this table said 39,191, which was wrong; download triggered, labelled "Library snapshot (all books)") |
| 21 | Mobile drawer still opens, holds the switcher, and closes on switch | 390×844, waited for `left === 0` | pass (switched to Salt and Signal, drawer unmounted) |
| 22 | Mobile library and import wizard usable at 390 px | full-page screenshots | pass (no overflow; review rows stack) |
| 23 | Import confirm works on mobile | 390×844 sample import | pass ("3 items imported into Salt and Signal") |
| 24 | Dark mode intact on new pages | toggle on `/#/library` | pass (`dark` class, tokens applied) |
| 25 | Unknown route still recovers | `/#/nonsense` | pass (recovery page, no data loss) |
| 26 | Reset restores the seeded library | `button-reset-demo` | pass (created books discarded, 3 seeded books returned) |
| 27 | Typecheck and production build | `npm run check`, `npm run build` | pass (no TS errors; measured at the time: JS 750,681 B raw / 211,866 B gzip, CSS 87,893 B raw / 13,980 B gzip) |

Screenshots: `/home/user/workspace/wordsmithery-qa-v02-desktop-library.jpg`, `-desktop-library-dark.jpg`, `-desktop-import-review.jpg`, `-mobile-drawer.jpg`, `-mobile-library.jpg`, `-mobile-import-review.jpg`, `-mobile-import-done.jpg`. Fixtures for the picker test: `/home/user/workspace/wordsmithery-import-fixtures/`.

**Defects found and fixed during this QA round**

1. `research-*.md` was classified as a plot thread because the substring "arc" appears inside "research". Filename rules now use word boundaries and check notes/research first (`client/src/lib/import-scan.ts`).
2. Creating a book navigated straight to the dashboard, so the confirmation was never readable. It now stays on the Library with a status message and an explicit "Open its dashboard" button.
3. The library export reused the per-book label "JSON project snapshot" in the confirmation panel; `ExportResult` now carries an optional `label`, set to "Library snapshot (all books)".
4. Copy drift: the Library honest-limits panel referred to a button named "Reset demo data" after it was renamed "Reset demo library".

---

## 7. Risks and open decisions

**Risks**

1. *Scope creep toward an editor arms race.* Wordsmithery competes on privacy, ownership and calm. Each new panel must answer "does this help a first novel get finished?"
2. *Craft guidance turning prescriptive.* Mitigated by paired planning/discovery prompts and dismissible lenses.
3. *Import trust.* An importer that silently misfiles material is worse than none. Mitigation: every suggestion states its reason in plain language, every field is editable, nothing is created before confirmation, and skipped files are listed rather than dropped silently.
4. *Multi-book leakage* would be the most damaging possible bug. Mitigated structurally (per-project snapshot maps, project-scoped routes) and checked in acceptance cases 3–5, 17 and 18. A cross-project link type is deliberately not offered.
5. *Snapshot-per-book fetching* is fine at novel scale; a library of dozens of long books will need per-collection queries. The library list already returns counts only.
6. *In-memory storage resets on restart* — correct for a demo, stated in the header, on the Library and on the Exports page.
7. *Bundle size* 750,681 B uncompressed (211,866 B gzip) as measured for v0.2. Acceptable for a desktop shell, worth code-splitting before any hosted release.

**Open decisions** (carried forward): encryption threat model and key custody; desktop shell technology; Markdown dialect and front-matter schema for round-trip fidelity; DOCX/PDF typesetting engine; whether a library index file exists on disk or the shelf is derived by scanning folders; sharing model; business model. New in v0.2: whether archiving should ever move a folder on disk, and whether the importer should support folder-tree ingestion in the desktop shell.

---

## 8. What this browser prototype still cannot prove

- **Filesystem ownership and sync.** No folder is written to disk. The portable format exists only as the JSON contract.
- **Durable storage.** Books live in server memory for the life of the process. There is no browser storage of any kind — no localStorage, no cookies, no IndexedDB — and no account.
- **Encryption at rest.** Nothing is encrypted.
- **Revision history.** `history/` is unimplemented.
- **DOCX / PDF / EPUB fidelity.** Only Markdown, semantic HTML, plain-text narration and JSON are produced.
- **Real attachment storage.** The picker records name, type and size only; no bytes are stored.
- **Import of anything but plain text.** `.docx`, `.pdf`, `.rtf`, Scrivener projects, folder trees and images are out of scope here. Character and world files import as one block of text for the author to split by hand.
- **Round-trip import of a JSON snapshot.** The library format is documented and exported, but no importer for it is built yet.
- **Hosted collaboration or beta-reader flows.** Absent by design.
- **Any AI capability.** None is wired, and prose generation is permanently out of scope. The import heuristic is a short list of regular expressions you can read in one file.
- **Large-manuscript performance.** Tested at three small books, not at a library of 95,000-word novels.

---

## 9. Craft sources behind the interface copy

Prompt wording draws on the same sources as the PRD and craft research: Terry Pratchett on [draft zero](https://longreads.com/2015/03/12/fantasy-author-terry-pratchett-on-working-on-draft-zero-of-a-book/), Neil Gaiman's [advice to authors](https://www.neilgaiman.com/FAQs/Advice_to_Authors), Lev Grossman [on process](https://lunchticket.org/lev-grossman-author/), Ursula K. Le Guin [on rules of writing](https://www.ursulakleguin.com/on-rules-of-writing), Brandon Sanderson's [laws of magic](https://faq.brandonsanderson.com/knowledge-base/what-are-sandersons-laws-of-magic/) (behind the world entry's rules/limits/costs/exceptions fields), Michael Crichton [for younger readers](https://michaelcrichton.com/for-younger-readers/), and Alan Moore [on writing](https://theanarchistlibrary.org/library/alan-moore-on-writing-for-comics).
