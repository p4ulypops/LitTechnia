# Lit Technica — Subagent Swarm Orchestration Prompt v0.1

**Status:** Ready to run. This is the operational prompt for spinning up a model-council-reviewed, multi-agent build of the three captured-but-unbuilt sub-PRDs against the existing codebase. Nothing in this document authorises skipping human review of the council's sequencing decision — that review is Stage 1 below and is a deliberate checkpoint, not a formality.

**Companion docs (already in `docs/`, all merged to `main`):**
- `lit-technica-prd-v0.2.md` — parent PRD, decision log, non-goals (no multi-author collaboration is a *decided* non-goal — see conflict flag below)
- `lit-technica-visual-reference-media-prd-v0.1.md` — Sub-PRD A
- `lit-technica-quick-capture-tagging-annotation-prd-v0.1.md` — Sub-PRD B
- `lit-technica-purpose-built-rss-feeds-prd-v0.1.md` — Sub-PRD C
- `lit-technica-import-export-syndication-spec-v0.1.md` — existing `FeedDefinition`/RSS pipeline that Sub-PRD C extends
- `lit-technica-craft-guidance-prompts-prd-v0.1.md` — source of the 8 gamification events Sub-PRD C's `gamification_progress` feed publishes

**Codebase ground truth (verified against `github.com/p4ulypops/LitTechnia@main`, not assumed):**
- Stack: Express 5 + TypeScript server (`server/`), React + Vite client (`client/src/`), Drizzle ORM over SQLite (`shared/schema.ts`), Tailwind + Radix UI + shadcn (`components.json`), Vitest for tests, WebAuthn/passkey + magic-link auth already implemented (`server/auth/`).
- Existing domain tables in `shared/schema.ts`: `projects`, `scenes`, `characters`, `plots`, `events`, `worldEntries`, `notes`, `links` (generic polymorphic `fromKind`/`fromId` → `toKind`/`toId` cross-reference table), `attachments` (generic polymorphic `ownerKind`/`ownerId` file table — this is the natural extension point for Sub-PRD A's generated media), `checklistItems`.
- Existing pages: `characters`, `plots`, `timeline`, `world`, `manuscript`, `library`, `research`, `connections`, `exports`, `account`, `home`, `import`, `sign-in`.
- Existing `server/connectors.ts` already defines a disciplined connector-capability framework: every account-backed connector explicitly resolves to a `blocked_security` reason (e.g. "needs `CREDENTIAL_ENCRYPTION_KEY` configured — not set here") rather than half-implementing OAuth. **This pattern must be reused, not replaced**, for any new external connector Sub-PRD B introduces (Apple Calendar/Reminders, Wispr Flow).
- No image/video generation code, no RSS feed generation code, and no inline-comment/annotation code exist yet anywhere in the repo. All three sub-PRDs are greenfield within an established app shell — this is feature addition, not app creation.

---

## Why a council-then-swarm shape, not a single build pass

Three independent sub-PRDs touch shared surfaces (the `attachments`/`links` tables, the `connectors.ts` capability-gating pattern, the existing `FeedDefinition` pipeline, and the parent PRD's decided non-goals). Handing all three to one agent risks schema drift; handing each to an isolated agent with no shared plan risks three incompatible migrations. The shape below front-loads disagreement resolution (Stage 1, cheap, text-only) before any code is written (Stage 3, expensive to redo), which is the "perfect without blocking done" balance the user asked for.

---

## Stage 0 — Pre-flight (do before dispatching anything)

1. Confirm current `main` branch state matches the ground truth above (re-run a light `git ls-files shared/ server/ client/src/pages` check — the codebase may have moved since this doc was written).
2. Confirm no other branch/PR is already mid-flight touching `shared/schema.ts`, `server/connectors.ts`, or `client/src/pages/connections.tsx` — these are the three files every sub-PRD's build will touch, so a collision here is the highest-risk failure mode.
3. Resolve the one blocking conflict called out in Sub-PRD B before Stage 1 starts: **multi-author inline comments** are explicitly flagged in that sub-PRD as conflicting with the parent PRD's decided non-goal on collaboration (PRD v0.2, non-goals section). Default resolution unless the user overrides: **build self-only inline comments now; explicitly exclude multi-author comments from this build pass and re-flag them as a future decision, not a silent scope cut.**

---

## Stage 1 — Model Council: sequencing and risk review (text-only, no code)

Run Perplexity's `model-council` skill (already loaded) with the frontier default council (one top-tier model each from Anthropic, OpenAI, Google) unless the user names specific models. Council query:

> Review three sub-PRDs for the Lit Technica novel-writing app (attached in full below) against its existing codebase ground truth (attached in full below). For each sub-PRD, identify: (1) the minimal viable slice that delivers real user value without the higher-risk/blocking items, (2) concrete schema and API surface changes needed given the *actual* existing Drizzle schema and connectors.ts pattern shown, (3) the single highest-risk integration point where this sub-PRD could collide with one of the other two or with the existing `attachments`/`links`/`connectors.ts` shared surfaces, (4) a recommended build sequence across all three sub-PRDs (which first, which can run in parallel, which must wait), and (5) any open question in the sub-PRD that should block build vs. any that is safe to default and flag. Do not write implementation code — this is a sequencing and risk review, output a structured written assessment only.

Attach full text of: this document's ground-truth section, plus all three sub-PRD files, plus `shared/schema.ts` and `server/connectors.ts` contents.

**Output of Stage 1:** the model-council synthesis (agreement/disagreement tables per the skill's format) becomes the actual build sequencing plan. Do not proceed to Stage 2 without it — this is the checkpoint that keeps three parallel builders from stepping on each other's migrations.

**Human checkpoint:** surface the council's recommended sequencing and any flagged blocking questions to the user before Stage 2 dispatch. This is the one required pause in an otherwise autonomous pipeline.

---

## Stage 2 — Translate council output into swarm work packages

Using the council's sequencing recommendation, split into work packages. The default expected shape (confirm against actual council output, don't force it if the council disagrees):

- **Package 1 — Shared schema migration** (must land first, single agent, no parallelism): Drizzle schema additions for all three sub-PRDs in one migration pass to avoid three agents racing on `shared/schema.ts`. Likely additions: `generatedMedia` or extension of `attachments` (Sub-PRD A), `referenceLinks` for real-person↔character mapping (Sub-PRD A), `tags` dual-form resolution table + `comments` table (Sub-PRD B), new `feedType` enum values on the existing `FeedDefinition`-backed table (Sub-PRD C — extend, do not fork, per that sub-PRD's own explicit framing).
- **Package 2 — Sub-PRD A build** (Visual Reference & Media): image/video generation provider integration behind the existing `connectors.ts` capability-gate pattern, basic non-destructive editor UI, real-person-to-character reference linking UI, export-exclusion enforcement for reference photos.
- **Package 3 — Sub-PRD B build** (Quick Capture, Tagging & Annotation): Apple Calendar/Reminders bridge behind the same connector-gate pattern, Wispr Flow voice capture, `#S:id`/`#S:slug` dual-tag resolver + renderer, self-only inline margin comments (per Stage 0 scope decision).
- **Package 4 — Sub-PRD C build** (Purpose-Built RSS Feeds): four new `feed_type` handlers extending the existing syndication pipeline, Connections-page opt-in/revoke UI for each feed type, metadata-only enforcement for the `micro_changes` feed (must never leak prose — this is a hard acceptance criterion, not a preference).

Packages 2–4 may run in parallel **only after** Package 1 is merged, since all three read/write the schema Package 1 defines.

---

## Stage 3 — Dispatch the build swarm

For each package, spawn one `run_subagent` (`subagent_type="website_building"`, `model="claude_opus_5_0"` per this workspace's model-catalog guidance for multi-page app work). Standard objective template per package:

```
Build [Package N] for the Lit Technica app at github.com/p4ulypops/LitTechnia (branch: <package-branch-name>, based on <Package 1 branch/commit if not Package 1 itself>).

Ground truth: Express 5 + TypeScript server, React + Vite client, Drizzle ORM over SQLite (shared/schema.ts), Tailwind + Radix/shadcn, Vitest. Existing patterns you MUST follow, not replace: the generic polymorphic attachments/links tables, the connectors.ts capability-gating pattern (every account-backed integration must explicitly declare its blocking reason via the same shape as existing entries -- never half-implement OAuth), the existing FeedDefinition/RSS pipeline in lit-technica-import-export-syndication-spec-v0.1.md.

Full sub-PRD attached: [paste full sub-PRD markdown].
Model council's sequencing/risk review for this package attached: [paste relevant council section].

Acceptance criteria: [paste the sub-PRD's own acceptance-criteria table verbatim -- do not paraphrase].

Write tests with Vitest for new server logic. Open a PR against branch <target> with a clear description. Do not merge. Do not touch shared/schema.ts beyond what Package 1 already defined unless you hit a genuine gap -- if you do, stop and report rather than improvising a second migration.
```

Dispatch Package 1 alone first; `wait_for_agents`; on success, dispatch Packages 2–4 in one parallel batch referencing Package 1's merged branch/commit.

---

## Stage 4 — Verification pass (do not skip)

Before presenting any package as done, load `fable-judge` (already in this user's skill library) against each package's PR: re-run the sub-PRD's own acceptance criteria as the claims to verify, check the metadata-only enforcement on the `micro_changes` feed specifically (highest-consequence acceptance criterion across all three packages — a prose leak here is a privacy failure, not a bug), and confirm the connector-gating pattern was followed rather than bypassed for expedience.

Report outcome-first per package: what shipped, what was deferred (multi-author comments, per Stage 0), and any blocking question the council or the build agents surfaced that still needs a human decision.

---

## Open decisions this document deliberately does not resolve

These are named rather than defaulted because they carry cost or privacy implications the user should weigh, not because the pipeline is stalling on them:

1. **Media generation provider and cost model** (Sub-PRD A) — OpenAI images/video vs. alternatives, and who bears per-generation cost. Council should surface options; user picks before Package 2 starts spending API budget.
2. **Real-person reference consent UX** (Sub-PRD A) — how explicit the "this photo represents a real person" consent flow needs to be before storage.
3. **Multi-author comments** (Sub-PRD B) — deferred per Stage 0, not cancelled. Revisit once collaboration is reconsidered against the parent PRD's non-goals.
