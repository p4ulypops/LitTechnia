# Lit Technica — Purpose-Built RSS Feeds Sub-PRD

**Version:** v0.1 · **Date:** 2026-08-15 · **Status:** Captured, not yet reviewed or sequenced
**Parent:** [Lit Technica PRD v0.2](./lit-technica-prd-v0.2.md), extending the `FeedDefinition` model and RSS/Atom generation already specified in the [Import/Export & Syndication spec v0.1](./lit-technica-import-export-syndication-spec-v0.1.md) (§186–192, §232)
**Author intent (verbatim brief):** capture the following ideas for later prioritisation; no design or build work is authorised by this document alone.

---

## 1. Origin and framing

The syndication spec already treats RSS/Atom as "the single highest-leverage investment" and defines one `FeedDefinition` shape (scope: per-author / per-work / per-arc, format rss2/atom) aimed at manuscript distribution — feeding Substack's importer, podcast apps, and laggard-platform import routes.

This sub-PRD captures a different idea: **several additional, purpose-built feed *types*** consumed by different audiences for different reasons, reusing the same underlying feed-generation machinery rather than replacing it. The author's own examples, and the general category each implies:

1. A feed for widget apps (**Widgy** and similar iOS/Android home-screen widget apps) that surfaces writing prompts or nudges intended to inspire more writing.
2. A feed for publishers/publicists that surfaces **micro-changes** — small, granular update events rather than full chapter drops — so an external party can watch a manuscript's progress without access to the app itself.
3. A feed usable by the **gamification layer** (per the Craft Guidance sub-PRD's "progress without shame" principles) — e.g. streak/counter/session events a companion widget or dashboard could render.
4. A feed that doubles as a lightweight **version-control trail** — a chronological, itemised record of what changed and when, consumable outside the app.

## 2. Problem statement

RSS is already scoped as an output format for whole chapters/works. It is not yet scoped as a general internal event stream that other, smaller consumers (a home-screen widget, a publicist's feed reader, a gamification dashboard, a changelog viewer) could subscribe to for something other than "read the finished prose." Each of the four audiences above wants a different slice of the same underlying activity data, at a different granularity, and none of them should require opening Lit Technica or receiving raw manuscript text.

## 3. Goals

1. Reuse the existing `FeedDefinition` / RSS 2.0 + Atom 1.0 generation pipeline (spec §186–192) for additional feed *types*, rather than building a second syndication system.
2. Let an author generate a **writing-prompt / inspiration feed** consumable by widget apps (Widgy and similar) — short, glanceable items, not manuscript content.
3. Let an author generate a **micro-change feed** scoped for external readers such as a publisher or publicist — granular, low-content-exposure update events (e.g. "Chapter 4 revised," "12% more words in Act 2") without leaking prose.
4. Let the gamification layer (per the Craft Guidance sub-PRD, §73–84) optionally publish its own progress-without-shame events as a feed, for consumption by widgets or dashboards, following the same non-punitive framing rules already decided there.
5. Let an author generate a **version-history feed** — a readable, chronological trail of saved versions/revisions per the parent PRD's version-history requirement (§218–224) — consumable by any RSS reader as a lightweight changelog.
6. Every feed type is **opt-in, scoped, and revocable per feed**, following the same Connections-page control pattern as every other syndication connector (spec §26, main PRD §316).

## 4. Non-goals

- **Not a replacement for the manuscript distribution `FeedDefinition`.** That feed (spec §186–192) continues to serve Substack/podcast/laggard-import use cases unchanged; this sub-PRD adds sibling feed types, it does not modify that one.
- **Not a full activity-tracking or analytics platform.** Feeds here are read-only, chronological, human-and-machine-readable event lists — not a dashboard product in their own right.
- **Not a leak path for manuscript prose.** The micro-change feed in particular must summarise *that* something changed, never paste the changed text itself, unless the author explicitly opts a given feed into fuller content.
- **Not multi-author collaboration.** A publisher/publicist consuming a feed is a read-only external subscriber, not a collaborator with write access — consistent with the parent PRD's collaboration non-goal (§90).

## 5. Functional requirements (draft — not yet sequenced)

### 5.1 Shared feed infrastructure

- Extend the existing `FeedDefinition` model (spec §232) with a `feed_type` field: `manuscript` (existing), `inspiration_prompts`, `micro_changes`, `gamification_progress`, `version_history`.
- All feed types share the existing generation pipeline: RSS 2.0 + Atom 1.0, permanent GUID/`atom:id` per item, feed rebuilt on the relevant trigger event, validated against the W3C/RSS Advisory Board validators already required in CI (spec §188, §251).
- Every feed has its own public URL, is listed and individually revocable on the Connections page, and disconnecting/revoking deletes the feed's public availability, not merely hides it from the UI (mirrors main PRD §316).
- Feed content granularity (how much detail is exposed) is an explicit, author-set option per feed, defaulting to the least revealing setting.

### 5.2 Inspiration / writing-prompt feed (Widgy and similar)

- Items are short, glanceable prompts or nudges — e.g. a craft prompt drawn from the Craft Guidance library (Craft Guidance sub-PRD §3.1–3.4), a "pick up where you left off" pointer, or an author-authored personal reminder — never manuscript prose.
- Designed for consumption by iOS/Android home-screen widget apps (Widgy named as the driving example) and any standard RSS-reading widget, so item titles/summaries must be widget-glanceable (short, self-contained, no required click-through for the core message).
- Optional: item can carry a "locked" reference back to a specific project entity (character/place/thread) using the dual-address tag system from the Quick Capture sub-PRD (`#S:id` / `#S:slug`), letting a tap deep-link back into the relevant item if the consuming surface supports it.

### 5.3 Micro-change feed for publishers/publicists

- Items represent granular update events at a level the author controls — e.g. "a scene was added to Chapter 4," "word count crossed a threshold," "a revision pass completed on Act 2" — described in metadata terms, not by quoting the changed prose.
- Intended external audience is explicitly named by the author (e.g. "publisher," "publicist," "beta reader") for their own reference; this labelling is local only and does not grant that person any write access.
- Must default to metadata-only detail (event type, scope, timestamp); an author can explicitly raise the detail level for a specific feed (e.g. include a short author-written note per change) but never defaults to exposing manuscript text.
- This is a read-only external notification channel, not a sharing/collaboration mechanism — it sits alongside, and must stay clearly distinct from, the parent PRD's separately-scoped read-only sharing capability (§282–286).

### 5.4 Gamification progress feed

- Publishes the same category of events the Craft Guidance sub-PRD's gamification layer already defines (never-resetting cumulative counters, streaks, session records) as feed items, so a widget or external dashboard can display progress without the author opening the app.
- Must inherit every one of the eight "progress without shame" principles already decided in that sub-PRD (§73–84) verbatim — no item may be phrased as a guilt/nag notification, no public leaderboard framing, lapses represented as records rather than verdicts.
- Optional and off by default, consistent with principle 1 ("optional and switchable — no game mechanics by default").

### 5.5 Version-history feed

- Each item corresponds to a saved version/revision event from the parent PRD's local version-history system (§218–224) — timestamp, scope (which chapter/entity), and an author-editable short description; never a diff of prose content by default.
- Functions as a lightweight, RSS-readable changelog — useful for the author's own review habit as well as for any external party they've chosen to share it with.
- Distinct from real version-control systems (git-style diffs/branches) — this is a chronological announcement trail over the existing local history feature, not a new versioning engine.

## 6. Acceptance criteria (draft)

- Given an author enables the inspiration feed, when they subscribe to it from a widget app, then items render as short, self-contained prompts with no manuscript prose present in any item.
- Given an author enables a micro-change feed and labels it "for my publicist," when a revision pass completes, then the feed publishes a metadata-only item describing the change, with no prose excerpt unless the author explicitly raised that feed's detail level.
- Given the gamification progress feed is enabled, when the author misses a writing session, then no published item frames this punitively, and the feed's cumulative counter item does not reset.
- Given a version-history feed, when the author restores an earlier version from local history, then the feed publishes a corresponding item describing the restore event.
- Given any feed of any type, when the author revokes it from the Connections page, then its public URL stops serving content rather than merely being hidden from the in-app list.
- Given all four new feed types are disabled, then the original manuscript `FeedDefinition` (spec §186–192) continues to function exactly as already specified, unmodified.

## 7. Risks and open questions

| Risk / question | Why it matters | Status |
|---|---|---|
| Manuscript-content leakage via "detail level" settings | A misconfigured micro-change or version-history feed could expose prose to an external party by accident | Mitigate with least-revealing default and explicit, per-feed opt-up, not opt-down |
| Overlap/confusion with existing read-only sharing (§282–286) | Two different mechanisms (feeds vs share packages) both expose material externally; authors and reviewers may conflate them | Needs explicit product-copy differentiation before either ships alongside the other |
| Widget-app compatibility (Widgy and similar) | Widget apps vary in how they parse/render RSS; item length and required fields aren't yet verified against Widgy specifically | Open — spike against Widgy's actual feed-consumption format before committing to item shape |
| Gamification feed shipping ahead of the gamification layer itself | The Craft Guidance sub-PRD phases gamification into its "third increment" (§99–103, that document) — this feed has nothing to publish until that layer exists | Sequencing dependency, not a blocker to capturing the idea now |
| Publisher/publicist feed and future collaboration decisions | If real collaboration is ever approved (see the Quick Capture sub-PRD's open comment-collaboration question), this feed's role vs a collaborator view needs re-examination | Revisit together with that open decision |
| Feed proliferation / Connections-page clutter | Four new feed types plus the existing manuscript feed is a lot of toggles for one author | Consider a single "Feeds" section with type grouping rather than five flat entries |

## 8. Status

Captured as described by the author on 2026-08-15 for later prioritisation alongside other incoming sub-PRDs. Not sequenced into the parent PRD's P0/P1/P2 plan or the syndication spec's build order; depends on the existing RSS/Atom pipeline already specified there and is designed to extend it, not fork it.
