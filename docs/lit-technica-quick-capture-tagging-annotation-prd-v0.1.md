# Lit Technica — Quick Capture, Tagging & Inline Annotation Sub-PRD

**Version:** v0.1 · **Date:** 2026-08-15 · **Status:** Captured, not yet reviewed or sequenced
**Parent:** [Lit Technica PRD v0.2](./lit-technica-prd-v0.2.md) — extends Import (P0), Information architecture (§128–144), and touches the read-only sharing / collaboration non-goal (§90, §282–286)
**Author intent (verbatim brief):** capture the following ideas for later prioritisation; no design or build work is authorised by this document alone.

> **Confirmed 2026-08-15:** "iCowl app" is Apple Calendar (iCal), paired with "Reminders/Todo app" as Apple Reminders. §5.1 and its acceptance criteria are written against this pair.

---

## 1. Origin and framing

The parent PRD is deliberately local-first and single-author: capture happens inside the app, linking is internal, and collaboration is explicitly deferred. This sub-PRD captures three additions the author wants layered on top:

1. **On-the-go capture and retrieval** through apps people already carry — a Reminders/Todo app and a Calendar app — so a project can be fed and queried without opening Lit Technica, plus voice-first capture via **Wispr Flow** dictation.
2. A **dual-address tagging system** (`#S:1234` ID form and `#S:slug` human-readable form, simultaneously) for linking items together across the project.
3. **Inline margin comments** on manuscript lines — including, eventually, comments from other people.

Each is specified independently below; they share a common thread of reducing friction between "having the thought" and "having it in the project."

## 2. Problem statement

- Ideas rarely arrive while the author is sitting inside the writing app. If capture requires opening Lit Technica on the right device, material is lost.
- The parent PRD's linking model assumes the app's own UI. Authors also think in tags and shorthands while writing prose; there is no lightweight, readable way to reference "that scene" or "that character" from inside a Markdown line or from an external capture surface.
- Feedback and self-annotation today would have to live inline in the manuscript text, polluting the canonical prose the parent PRD works hard to keep clean and portable.

## 3. Goals

1. Let an author add a note, task, or idea to their Lit Technica project from Apple Reminders or Apple Calendar (or an equivalent todo/calendar app) in seconds, and retrieve items the same way.
2. Let an author dictate commands and content hands-free via Wispr Flow, so capture works while walking, driving, or away from the keyboard.
3. Provide a stable, human-readable, dual-form tagging syntax so any item can be referenced unambiguously (`#S:1234`) and memorably (`#S:slug`) from anywhere — manuscript prose, notes, or external capture.
4. Let an author attach a rich-text comment to a specific line via a margin affordance, kept out of the canonical prose — and, later, let trusted others comment the same way.

## 4. Non-goals

- **Not a sync engine rebuild.** This does not change the local-first, author-owned folder model; Reminders/Calendar integration is a capture-and-retrieval bridge, not a second canonical store.
- **Not full collaboration.** Inline comments from *others* are captured here as an aspiration; they conflict with the parent PRD's P0 non-goal on real-time collaboration and must not ship before that decision is revisited (§8).
- **Not a replacement for the in-app editor.** Quick capture feeds the project; drafting and organising still happen in Lit Technica.
- **Not voice-controlled app navigation.** Wispr Flow scope is dictating content and simple commands into capture surfaces, not operating the whole UI by voice.

## 5. Functional requirements (draft — not yet sequenced)

### 5.1 Reminders / Calendar subscription bridge

- The author can connect a project (or selected parts of it — e.g. writing tasks, deadline events, a capture inbox) to Apple Reminders and Apple Calendar so that:
  - **Adding:** a new reminder or calendar note created in the designated list/calendar lands in the project's capture inbox, preserving text, due date, and creation time.
  - **Retrieving:** project items the author chooses to expose (e.g. today's writing task, an upcoming deadline, a checklist) appear in Reminders/Calendar and reflect status changes back.
- Standard protocols first (CalDAV / Apple EventKit / Reminders sharing semantics) rather than a proprietary per-app integration where possible, so other todo/calendar apps that speak the same protocols work too.
- Every synced item carries the dual-address tag (§5.3) of its project item where one exists, so round-trips stay linked.
- Sync is two-way only for status/field mappings the author has explicitly enabled; deletions on the Reminders/Calendar side never delete project content (consistent with the parent PRD's non-destructive sync stance, §218–230).

### 5.2 Voice capture via Wispr Flow

- Dictation-first capture: the author can speak a note, idea, or command through Wispr Flow into any Lit Technica text surface, including the capture inbox and quick-capture fields on mobile.
- Support a small set of spoken command patterns for capture (e.g. dictating a tag such as `#S:beach-scene` inline, or a leading command like "new character note") — transcribed verbatim first, parsed second, with the author able to confirm before classification.
- **Open dependency:** Wispr Flow is primarily a system-level dictation layer; whether this needs a formal API integration or is simply "works because our text fields accept dictated input" is unresolved (§8). The requirement is written against the outcome — hands-free capture works — not a specific integration mechanism.

### 5.3 Dual-address tagging system

- Every linkable item (scene, character, world entry, plot thread, timeline event, note) can carry a tag in two simultaneously valid forms:
  - **ID form:** `#S:<stable-id>` (e.g. `#S:1234`) — exact, immutable, machine-friendly.
  - **Slug form:** `#S:<slug>` (e.g. `#S:beach-scene`) — human-readable, derived from the item's name, editable by the author.
- Both forms resolve to the same item; typing either in any Markdown surface creates the same link. The slug form is what the author sees rendered by default; the ID form is the canonical reference underneath.
- Storage format is plain Markdown with a documented, JSON-describable resolution rule (consistent with the project-format contract: authored text stays readable outside the app, §153–157, §346–349). A tag in a Markdown file must remain meaningful — at minimum as readable text — with the app closed.
- Slug collisions resolve deterministically (disambiguation prompt, never silent re-pointing); renaming a slug offers to update existing references but never rewrites files without author confirmation.

### 5.4 Inline margin comments

- In the manuscript editor, a button in the margin of any line/paragraph opens a rich-text comment anchored to that location (bold/italic/links; not a second document).
- Comments are stored separately from canonical prose (sidecar metadata keyed to stable location anchors), so exports of the manuscript exclude them by default and Draft Zero stays clean.
- Anchors degrade gracefully: if the anchored line is edited or moved, the comment re-attaches to the nearest surviving anchor and flags itself rather than vanishing.
- **Self-comments first.** Letting *other people* comment is captured as the intended direction but is gated on the collaboration decision (§8) — the data model should not preclude multi-author comments later, but the first increment is author-only.

## 6. Acceptance criteria (draft)

- Given a connected Reminders list, when the author adds a reminder on their phone, when Lit Technica next opens, then the item appears in the capture inbox with its text and due date intact, and deleting the reminder did not delete anything else in the project.
- Given a project item exposed to Calendar, when its status changes in Lit Technica, when the author next checks their calendar app, then the change is reflected without the author having opened Lit Technica in between.
- Given a character tagged `#S:rebecca` with stable ID `#S:1234`, when the author types either form in a scene, then both resolve to the same character and render as the slug by default.
- Given a slug is renamed, when references exist, then the app lists them and applies updates only after author confirmation, and the ID form kept working throughout.
- Given a margin comment on a line whose text is later edited, when the author views comments, then the comment is still present, visibly re-anchored, and marked as moved.
- Given a manuscript export, when comments exist, then they are excluded by default and included only via an explicit export option.

## 7. Risks and open questions

| Risk / question | Why it matters | Status |
|---|---|---|
| ~~"iCowl" interpretation~~ | All of §5.1's Calendar half depends on it | Resolved 2026-08-15 — confirmed Apple Calendar/iCal |
| Comments from others vs the parent PRD's no-collaboration non-goal (§90, §282–286) | §5.4's second half contradicts a decided product position; needs an explicit decision, not a quiet override | **Blocking before multi-author comments** |
| Two-way sync vs local-first canonical store | Reminders/Calendar round-trips can conflict with external edits and sync-provider conflicts already flagged in the parent PRD (§218–230) | Open — needs a conflict policy reusing the existing non-destructive rules |
| Wispr Flow integration mechanism (system dictation vs API) | Determines whether §5.2 is engineering work or design-for-compatibility work | Open — spike before sequencing |
| Platform coverage beyond Apple (Google Tasks/Calendar, other CalDAV clients) | The brief names Apple apps; the portable-format principle argues for protocol-first | Open — recommend protocol-first, Apple-first UX |
| Slug stability in exports | If slugs are editable, an exported Markdown file's `#S:slug` links can rot | Mitigated by ID-canonical rule in §5.3; confirm in export acceptance tests |
| Voice-dictated tags/commands privacy | Dictation may route through a third-party speech service; interacts with the parent PRD's "nothing leaves the folder without explicit action" stance (§359) | Open — same consent treatment as AI requests |

## 8. Status

Captured as described by the author on 2026-08-15 for later prioritisation alongside other incoming sub-PRDs. Not sequenced into the parent PRD's P0/P1/P2 plan; the collaboration tension (§7) must be resolved before multi-author comments are scheduled.
