# One-shot build prompt

You are the principal product engineer and UX lead for Wordsmithery in `p4ulypops/LitTechnia`. Work on the existing branch `ux/award-ready-workshop`. Deliver a production-quality, accessible author-workshop UX upgrade and the foundations for the opt-in Connections system. Do not deploy or merge to `main`; create a reviewable pull request only after all release checks pass.

## Read first

Read these repository documents before editing code:

- `docs/ux/award-ready-delivery-contract.md`
- `docs/ux/baseline-audit.md`
- `docs/ux/connections-release-mechanics.md`
- `docs/wordsmithery-import-export-syndication-spec-v0.1.md`
- `docs/wordsmithery-security-notes.md`
- `docs/wordsmithery-vps-deployment.md`
- `.env.example`, `server/env.ts`, `shared/schema.ts`, existing auth/routes/storage, and all client pages/components.

## Product north star

Wordsmithery is an author's workshop, not a ghostwriter. It helps authors write, organise, export and intentionally distribute their own work. Preserve its editorial, calm, paper-like design language. Do not add gamification pressure, AI prose generation, decorative motion, misleading publishing controls, or data-leaving-the-project behaviour.

## Operate as a lean review crew

Before marking any component complete, run these bounded reviews and reconcile findings in the implementation notes:

1. Accessibility: WCAG 2.2 AA keyboard paths, focus appearance, semantics, live status, contrast, target size, reduced motion, 200% zoom and narrow mobile.
2. Information architecture: writers can orient, switch books, resume work, understand state and recover from errors.
3. Visual systems: hierarchy, spacing, typography, token reuse, responsive density, dark mode, state design.
4. Writing workflow: saving/saved/failed feedback, safe destructive actions, scene selection/reorder, Draft Zero, import/export clarity.
5. Main critic: reject work that adds complexity without writer benefit, duplicates primitives, leaks secrets, or violates the non-ghostwriter promise.

## Build in this order

### 1. Trust and accessibility foundation

- Add a visible-on-focus Skip to content link targeting the existing main content landmark.
- Implement a reusable, accessible confirmation dialog. Replace immediate destructive actions for scene deletion, shared entity deletion, checklist deletion and book archiving. Each dialog names the item, explains the consequence, has Cancel as the safe default, and uses destructive styling only for the final action.
- Implement shared action feedback: visible and screen-reader-announced saving/saved/error states. Do not expose a raw global pending boolean as the only feedback. Keep errors near the initiating control and preserve usable controls where concurrent actions are safe.
- Define and document component states: default, hover, focus-visible, active, disabled, pending, error, success, empty and loading.

### 2. Manuscript core journey

Make book selection -> manuscript -> scene selection -> editing -> save feedback -> reordering -> Draft Zero -> safe delete exceptionally clear at desktop, tablet and mobile. Preserve document/cards/binder representations of identical data. Ensure selected state is visible without relying on colour alone and every control has an accurate accessible name.

### 3. Apply shared UX across app

Reuse the foundation in Library, characters, plot, timeline, worldbuilding, research, import, exports and account. Retain the existing honest empty states and no-pressure language.

### 4. Connections architecture and UI

Implement only foundations and file/RSS routes that are actually supportable in this release. Build a server-side connector registry/availability resolver. The client receives only non-secret availability states:

- `available`
- `setup_required`
- `blocked_security`
- `handoff_only`
- `file_based`
- `unsupported`

Never inspect an environment key in client code. Do not render a generic greyed-out button without an explanation. Use accessible, legible TBC/setup-required cards with a visible reason and programmatic description.

Truthful platform behaviour:

- File-based import/export remains active with no account: TXT, Markdown, DOCX, PDF, HTML, EPUB, Obsidian vault folder/ZIP, Craft Markdown/TextBundle and Goodreads CSV where implemented.
- RSS/Atom is a no-account capability and the primary handoff for Substack, Medium and feed consumers.
- Medium and Substack: do not build OAuth or fake publishing. Offer only the sanctioned handoff/instructions once the feed/public URL path exists.
- Goodreads: no posting connector. Keep safe file import/export only.
- WordPress: future authenticated adapter must default to draft, never publish.
- Google Docs, Microsoft Graph/OneDrive, WordPress.com, YouTube and ElevenLabs must remain `setup_required` or `blocked_security` until their real server configuration, encrypted credential storage and adapter/job work is complete.
- Do not use session-cookie automation, unofficial APIs, browser-held API keys or unencrypted credential storage.

### 5. Security and configuration

- Preserve the current policy that `.env` is never committed and deployment does not overwrite it casually.
- Extend `.env.example` with empty, documented placeholders only. Do not add values.
- Add a clearly validated server configuration model for connector flags and future server-only keys. Secret-backed connectors must fail closed.
- `CREDENTIAL_ENCRYPTION_KEY` is a blocking prerequisite for storing OAuth refresh tokens, application passwords, API keys or Craft credentials. If encryption at rest is not fully implemented and tested, do not accept or persist any credential.
- GitHub Environment/Repository Secrets may deliver already-created values to a VPS through an approved, redacted, atomic deployment step. Never print, commit, cache, send to the browser or expose a secret through logs. Do not claim a GitHub workflow creates provider credentials.

## Engineering rules

- Reuse existing primitives and project conventions; avoid a rewrite.
- Maintain per-account/project isolation.
- Sanitise every rich import path before rendering or persistence.
- Use semantic HTML and Radix primitives where they fit.
- Keep tests/selectors consistent with the existing `data-testid` convention.
- No placeholder success claims. A non-functional integration must have an honest unavailable/handoff state.
- Keep commits at reviewable boundaries only: foundation, manuscript, shared pages, connections/configuration, then tests/QA.

## Required verification

Run and record:

- `npm run check`
- `npm run build`
- Existing automated tests, plus focused tests for new components and availability rules
- Keyboard-only journey: skip link, sidebar, book switcher, manuscript views, editor, disclosure, reordering, Draft Zero, destructive dialogs and Connections cards
- Screen-reader name/state review for icon-only controls, dialogs, live feedback and disabled/TBC explanations
- Light/dark, desktop/tablet/narrow mobile, 200% zoom and reduced-motion inspection
- Contrast and focus-visible inspection against WCAG 2.2 AA baseline
- Secret scan of changed files and workflow edits

## Completion output

1. Push the reviewed commits to `ux/award-ready-workshop`.
2. Create a pull request to `main` with a concise change summary, test evidence, known non-live connectors and explicit deployment prerequisites.
3. Capture an annotated visual QA pack only after the checks above pass; include desktop/mobile, light/dark, keyboard focus, empty/loading/error/success and connector availability states.
4. Do not merge or deploy without explicit user approval.
