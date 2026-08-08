# Wordsmithery — prototype v0.3

A local-first, author-owned writing workspace for first-time novelists, initially friendly to fantasy and science fiction. Import and organise notes, develop characters, plot, timeline and worldbuilding, draft chapters and scenes privately, and export material you own.

**Wordsmithery never writes for you.** It does not generate scenes, chapters, dialogue, endings or prose, and it does not critique or score your writing. There are no AI surfaces anywhere in this prototype. Every craft prompt is optional and dismissible, and planners and discovery writers are treated as equals.

---

## Run it

```bash
npm install          # once
cp .env.example .env # then read it — production requires four values
npm run dev          # dev server (Express + Vite) on http://localhost:5000
```

For local UI work with the sample books and without a mail provider:

```bash
WORDSMITHERY_DEMO_SEED=true DEV_ECHO_MAGIC_LINK=true npm run dev
```

That switches on two development-only conveniences: a demo account holding the
three sample books (opened from a clearly labelled panel on the sign-in page),
and magic links returned in the API response and printed to the log instead of
being emailed. **The server refuses to start if either switch is set while
`NODE_ENV=production`.**

Production:

```bash
npm run check                          # TypeScript
npm run build                          # -> dist/public (client) + dist/index.cjs (server)
NODE_ENV=production node dist/index.cjs # serves the built client and the API on port 5000
```

Production requires `APP_URL` (https), `PASSKEY_RP_ID`, `RESEND_API_KEY` and
`EMAIL_FROM`. Anything missing is printed by name and the process exits 1 rather
than booting with sign-in quietly broken.

A fresh account owns nothing: it lands on a create-or-import welcome screen. The
three sample books — **The Glass Meridian** (secondary-world fantasy, most
developed), **Salt and Signal** (near-future SF, deliberately rougher) and the
archived **The Weatherwright's Daughter** — belong to the development demo
account only and are never shown to a real account.

---

## Sign-in (v0.3)

No passwords, no Basic Auth. Two passwordless routes:

1. **Passkey** — WebAuthn, verified server-side by `@simplewebauthn/server` v13.
   Challenges, origin and RP ID are all checked on the server; only public keys
   are stored.
2. **Email link** — a single-use link sent via Resend, valid about 15 minutes.
   The response is identical whether or not the address has an account. After a
   verified link with no passkey on file, the app lands on a naming step and
   offers to create one.

Sessions are opaque 32-byte tokens in an `httpOnly`, `SameSite=Lax` cookie
(`Secure` in production); only the SHA-256 hash is stored. Every `/api/projects`
and `/api/library` route requires a session and is scoped to that account's id —
owner ids come from the session, never from the request body. Magic-link and
sign-in endpoints are rate limited per address and per IP, in process.

Read [`../docs/wordsmithery-security-notes.md`](../docs/wordsmithery-security-notes.md)
before deploying: it lists the threat-model limits honestly, including no
encryption at rest, no account recovery and an in-process rate limiter.

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
server/env.ts           Every setting in one place; fails loudly at startup in
                        production when a required value is missing. Only two
                        booleans plus demoEnabled ever reach the browser.
server/db.ts            better-sqlite3 connection, WAL, and the CREATE TABLE
                        statements for users, sessions, passkeys, magic links,
                        challenges and the project tables.
server/auth/            accounts.ts (find-or-create by email), session.ts (token
                        hashing, cookie, requireAuth), magic-link.ts (Resend or
                        log transport, single use), webauthn.ts (registration and
                        authentication ceremonies), rate-limit.ts, demo.ts,
                        routes.ts (the /api/auth surface).
server/storage.ts       SqliteStorage — every read and write takes the owner id
                        first and the project id second, so a record can never be
                        resolved in the wrong book or the wrong account.
server/routes.ts        GET /api/projects · GET /api/library/snapshots ·
                        POST /api/projects · GET /api/projects/:id/snapshot ·
                        PATCH /api/projects/:id · POST /api/projects/:id/import ·
                        POST /api/projects/:id/scenes/reorder · POST /api/reset ·
                        POST/PATCH/DELETE /api/projects/:id/:collection[/:itemId]
client/src/lib/auth.tsx Session context: reads GET /api/auth/session and reflects
                        it. Holds no authority — the server re-checks every call.
client/src/pages/sign-in.tsx, account.tsx  Passkey-first sign-in, and the account
                        page that doubles as the post-link passkey naming step.
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
client/src/pages/       sign-in, account, home, library, import, manuscript,
                        characters, plots, timeline, world, research, exports,
                        not-found.
```

Stack: React 18 + TypeScript, Vite, `wouter` with hash routing, TanStack Query v5, Tailwind CSS v3 + shadcn/ui, Express 5, SQLite via `better-sqlite3` + Drizzle, `@simplewebauthn/server`/`browser` v13, Resend. The library list (`/api/projects`, counts only) and the open book's snapshot (`/api/projects/:id/snapshot`) are separate queries, so switching books swaps every view at once and exports stay trivial. The active book lives in React context and is never persisted. The only browser-stored value in the whole app is the session cookie, which exists so the server can recognise the account; there is no localStorage, sessionStorage or IndexedDB.

Design direction: warm paper surfaces, deep night-ink text, a restrained oxblood accent; Zodiak display, Satoshi UI, Erode prose, IBM Plex Mono for data (all Fontshare). Custom inline SVG logo. Light and dark themes. No gradients, no stock imagery, no decorative charts.

---

## Feature coverage

- **App shell** — responsive sidebar (Home, Library, Manuscript, Characters, Plot & subplots, Timeline, Worldbuilding, Research, Import, Exports), a real book switcher in both the header and the mobile drawer, live word count, signed-in address with a sign-out control, theme toggle, keyboard skip-to-content, `data-testid` on every interactive and dynamic element.
- **Library** — every book on one shelf with live counts, `open now` and `archived` badges, open / import-into / archive / unarchive per card, a "Start a new book" form (title required; subtitle, genre and format optional) and an honest-limits panel. Archiving hides a book from the switcher without deleting a word.
- **Import wizard** — choose files (`.md`, `.markdown`, `.txt`, `.text`, ≤400 KB, ≤50 at a time) or use the sample documents, review every detected item with an editable title and an editable classification (scene, character, plot thread, timeline event, worldbuilding, research note) plus the reason the suggestion was made and where it will land, preview the text, exclude anything, then confirm. Nothing is created before confirmation, skipped files are listed with plain-language reasons, and everything lands in the open book only. Detection is a short list of filename and heading rules in `client/src/lib/import-scan.ts` — no model, no network.
- **Home** — premise, eight readiness checks computed from live data, words against an adjustable target, the author's own checklist, linked-story overview, Resume Draft Zero.
- **Manuscript** — Document, Cards and Binder views over one shared scene collection; create, select, reorder, edit title/chapter/status/POV/text; per-scene word count and related records.
- **Planning workspaces** — characters (motivation, wants, fears, wins, losses, arc, voice), plots (kind, stakes, status, setups, payoffs, open question), timeline (ordering plus fixed/approximate/unplaced confidence), worldbuilding (facts, rules, limits, costs, exceptions), research notes. Links are visible and navigable from both ends.
- **Draft Zero** — a full-screen private mode that says outright that nothing here is critiqued, scored, shared or generated. Save and exit controls; Escape exits, Ctrl/⌘+S saves.
- **Attachments** — browser file picker recording name, type and size, labelled as session-only.
- **Portability** — per-book Markdown manuscript, clean semantic HTML, narration script and a documented JSON snapshot (`wordsmithery-project/0.2`, `scope: "selected-project"`), each with Download, Copy text and Preview so an export is never trapped in the app; plus a whole-library snapshot (`wordsmithery-library/0.2`, `scope: "library"`) holding every book, archived ones included, under `projects[]`. Both JSON envelopes carry a documentation block that states the project boundary explicitly.
- **Progress** — informational only. No streaks, no daily quotas, no penalties.
- **Accounts** — passkey-first sign-in page, email-link fallback, a passkey naming step after a verified link, an Account page listing passkeys with created/last-used dates and removal (refusing to remove the last one), sign-out in the header and on the account page, and a welcome screen for a brand-new empty library.
- **Craft lenses** — dismissible per-page prompts split into "if you are planning" / "if you are discovering", with a restore control.

## Limitations

This is a browser prototype. It deliberately does not:

- write or read a folder on your disk (the portable format exists here as the JSON contract only);
- store your books on your own disk — they are rows in the server's SQLite file (the portable format exists as the documented JSON contract and the export buttons);
- sync between devices, or work offline;
- use localStorage, sessionStorage or IndexedDB — the session cookie is the only browser-stored value;
- encrypt anything at rest, or keep revision history;
- produce DOCX, PDF or EPUB;
- store attachment bytes;
- support sharing, collaboration or teams — accounts exist, but a book has exactly one owner;
- offer account recovery: losing both your passkey and your mailbox means losing access;
- import `.docx`, `.pdf`, `.rtf`, Scrivener projects, folder trees or images — plain text and Markdown only;
- re-import its own JSON snapshots (the format is documented and exported; the importer for it is future work);
- sync a library between devices, or write one folder per book to disk.

Books are kept apart structurally, not by convention: storage holds one snapshot per book and every API path names its project, so a record in one book cannot reference a record in another.

See `../docs/wordsmithery-implementation-plan-v0.3.md` for the authentication milestone and `../docs/wordsmithery-implementation-plan-v0.2.md` for the earlier phased plan, data model, API surface, acceptance test matrix, risks and open decisions. For the GitHub Actions VPS workflow and one-time server preparation, see [`docs/wordsmithery-vps-deployment.md`](docs/wordsmithery-vps-deployment.md) in the GitHub repository.
