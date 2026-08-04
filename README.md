# Wordsmithery — prototype v0.2

A local-first, author-owned writing workspace for first-time novelists, initially friendly to fantasy and science fiction. Import and organise notes, develop characters, plot, timeline and worldbuilding, draft chapters and scenes privately, and export material you own.

**Wordsmithery never writes for you.** It does not generate scenes, chapters, dialogue, endings or prose, and it does not critique or score your writing. There are no AI surfaces anywhere in this prototype. Every craft prompt is optional and dismissible, and planners and discovery writers are treated as equals.

---

## Run it

```bash
npm install          # once
npm run dev          # dev server (Express + Vite) on http://localhost:5000
```

Production:

```bash
npm run check                          # TypeScript
npm run build                          # -> dist/public (client) + dist/index.cjs (server)
NODE_ENV=production node dist/index.cjs # serves the built client and the API on port 5000
```

Three demo books are seeded at boot: **The Glass Meridian** (secondary-world fantasy, most developed), **Salt and Signal** (near-future SF, mid-draft, deliberately rougher) and **The Weatherwright's Daughter** (archived). The app is never empty, and no book's material appears in another.

---

## Architecture

```
shared/schema.ts        Drizzle sqliteTable definitions + drizzle-zod insert schemas.
                        Single source of truth for API validation, client types and the
                        JSON export contract.
server/seed.ts          "The Glass Meridian" demo content (6 scenes, 4 characters,
                        4 plot threads, 6 timeline events, 3 world entries, 3 notes,
                        20 links, checklist) + buildLibrarySeed() for the whole shelf.
server/seed-books.ts    "Salt and Signal" (3 scenes, 2 characters, 2 threads,
                        3 events, 1 world entry, 2 notes) and the archived
                        "The Weatherwright's Daughter".
server/storage.ts       MemoryStorage — Map<projectId, ProjectSnapshot>. Every method
                        takes a projectId, so a record can never be resolved in the
                        wrong book. Create/patch/archive projects, import items,
                        reset via POST /api/reset.
server/routes.ts        GET /api/projects · GET /api/library/snapshots ·
                        POST /api/projects · GET /api/projects/:id/snapshot ·
                        PATCH /api/projects/:id · POST /api/projects/:id/import ·
                        POST /api/projects/:id/scenes/reorder · POST /api/reset ·
                        POST/PATCH/DELETE /api/projects/:id/:collection[/:itemId]
client/src/lib/workspace.tsx  Library + snapshot queries, active-book context, story
                        actions, library actions, selection/view state, word counts,
                        readiness checks, craft-lens state.
client/src/lib/import-scan.ts Pure, offline scan of .md/.txt text into a suggested
                        title, body and classification, with the reason stated. Plus
                        three sample documents for the no-file-picker path.
client/src/lib/exporters.ts   Pure client-side builders for Markdown, HTML, narration,
                        the per-book JSON snapshot and the whole-library JSON snapshot,
                        plus download/copy helpers.
client/src/components/  Shell + sidebar + book switcher, brand mark, theme, editable
                        fields, link panel, attachments, craft lens, Draft Zero overlay,
                        entity workspace.
client/src/pages/       home, library, import, manuscript, characters, plots, timeline,
                        world, research, exports, not-found.
```

Stack: React 18 + TypeScript, Vite, `wouter` with hash routing, TanStack Query v5, Tailwind CSS v3 + shadcn/ui, Express. The library list (`/api/projects`, counts only) and the open book's snapshot (`/api/projects/:id/snapshot`) are separate queries, so switching books swaps every view at once and exports stay trivial. The active book lives in React context and is never persisted — there is no browser storage of any kind.

Design direction: warm paper surfaces, deep night-ink text, a restrained oxblood accent; Zodiak display, Satoshi UI, Erode prose, IBM Plex Mono for data (all Fontshare). Custom inline SVG logo. Light and dark themes. No gradients, no stock imagery, no decorative charts.

---

## Feature coverage

- **App shell** — responsive sidebar (Home, Library, Manuscript, Characters, Plot & subplots, Timeline, Worldbuilding, Research, Import, Exports), a real book switcher in both the header and the mobile drawer, live word count, "Local session · nothing uploaded" badge, theme toggle, keyboard skip-to-content, `data-testid` on every interactive and dynamic element.
- **Library** — every book on one shelf with live counts, `open now` and `archived` badges, open / import-into / archive / unarchive per card, a "Start a new book" form (title required; subtitle, genre and format optional) and an honest-limits panel. Archiving hides a book from the switcher without deleting a word.
- **Import wizard** — choose files (`.md`, `.markdown`, `.txt`, `.text`, ≤400 KB, ≤50 at a time) or use the sample documents, review every detected item with an editable title and an editable classification (scene, character, plot thread, timeline event, worldbuilding, research note) plus the reason the suggestion was made and where it will land, preview the text, exclude anything, then confirm. Nothing is created before confirmation, skipped files are listed with plain-language reasons, and everything lands in the open book only. Detection is a short list of filename and heading rules in `client/src/lib/import-scan.ts` — no model, no network.
- **Home** — premise, eight readiness checks computed from live data, words against an adjustable target, the author's own checklist, linked-story overview, Resume Draft Zero.
- **Manuscript** — Document, Cards and Binder views over one shared scene collection; create, select, reorder, edit title/chapter/status/POV/text; per-scene word count and related records.
- **Planning workspaces** — characters (motivation, wants, fears, wins, losses, arc, voice), plots (kind, stakes, status, setups, payoffs, open question), timeline (ordering plus fixed/approximate/unplaced confidence), worldbuilding (facts, rules, limits, costs, exceptions), research notes. Links are visible and navigable from both ends.
- **Draft Zero** — a full-screen private mode that says outright that nothing here is critiqued, scored, shared or generated. Save and exit controls; Escape exits, Ctrl/⌘+S saves.
- **Attachments** — browser file picker recording name, type and size, labelled as session-only.
- **Portability** — per-book Markdown manuscript, clean semantic HTML, narration script and a documented JSON snapshot (`wordsmithery-project/0.2`, `scope: "selected-project"`), each with Download, Copy text and Preview so an export is never trapped in the app; plus a whole-library snapshot (`wordsmithery-library/0.2`, `scope: "library"`) holding every book, archived ones included, under `projects[]`. Both JSON envelopes carry a documentation block that states the project boundary explicitly.
- **Progress** — informational only. No streaks, no daily quotas, no penalties.
- **Craft lenses** — dismissible per-page prompts split into "if you are planning" / "if you are discovering", with a restore control.

## Limitations

This is a browser prototype. It deliberately does not:

- write or read a folder on your disk (the portable format exists here as the JSON contract only);
- persist anything — storage is in server memory and the demo reseeds on restart;
- use localStorage, sessionStorage, IndexedDB or cookies (blocked in the preview sandbox, and unnecessary);
- encrypt anything, or keep revision history;
- produce DOCX, PDF or EPUB;
- store attachment bytes;
- support accounts, sharing, collaboration or any external API;
- import `.docx`, `.pdf`, `.rtf`, Scrivener projects, folder trees or images — plain text and Markdown only;
- re-import its own JSON snapshots (the format is documented and exported; the importer for it is future work);
- sync a library between devices, or write one folder per book to disk.

Books are kept apart structurally, not by convention: storage holds one snapshot per book and every API path names its project, so a record in one book cannot reference a record in another.

See `../docs/wordsmithery-implementation-plan-v0.2.md` for the phased plan, data model, API surface, acceptance test matrix, risks and open decisions. For the GitHub Actions VPS workflow and one-time server preparation, see [`docs/wordsmithery-vps-deployment.md`](docs/wordsmithery-vps-deployment.md) in the GitHub repository.
