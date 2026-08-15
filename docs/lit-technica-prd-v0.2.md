# Lit Technica
## Product requirements document

**Status:** Draft v0.2  
**Date:** 9 August 2026 (supersedes v0.1, 4 August 2026)  
**Audience:** Product, design, and engineering  
**Product type:** Local-first, installable web application for first-time novelists  
**Working premise:** A private author’s workshop that helps a novice organise, develop, draft, revise, and export a novel without attempting to replace the author.

## Executive summary

Lit Technica is a local-first creative-writing workspace for first-time novelists, initially especially useful for fantasy and science-fiction writers with complex worlds, timelines, characters, and plot threads. It imports existing Markdown and text notes, turns them into connected story material, supports planning and discovery writing in parallel, and exports author-owned work as an open project folder, Word document, PDF, Markdown, and HTML suitable for platforms such as Substack and WordPress.

v0.2 adds a phased, opt-in **Import/Export & Syndication System**: a profile-level Connections page where an author can connect accounts or upload files to move manuscript content into and out of Google Docs, MS Word, Txt, PDF, Markdown, Craft Docs, Obsidian, WordPress, Medium, ElevenLabs, ePub, Substack, YouTube (Shorts), GoodReads, and RSS/XML. Every connection is optional and revocable, and the P0 no-account export contract remains unchanged. Full detail lives in the companion [Import/Export & Syndication spec v0.1](./lit-technica-import-export-syndication-spec-v0.1.md).

The product deliberately avoids treating a novelist as a prompt operator. Any AI capability is optional, transparent, author-controlled, and constrained to organisation: approved entity-link suggestions and navigational summaries. Lit Technica will not generate scenes, chapters, plot decisions, or prose by default. This is both a product position and a safeguard against turning a craft workspace into a story-replacement tool.

Craft guidance is presented as a library of optional lenses and contextual questions, not as a single mandatory method. This reflects direct disagreement among respected writers: Lev Grossman outlines heavily but does not believe writers should obey an outline, while Terry Pratchett did not plan books out before drafting ([Grossman interview](https://lunchticket.org/lev-grossman-author/), [Pratchett interview](https://longreads.com/2015/03/12/fantasy-author-terry-pratchett-on-working-on-draft-zero-of-a-book/)). Ursula K. Le Guin similarly warns that beginner heuristics become damaging when expanded into laws ([Le Guin, “On Rules of Writing”](https://www.ursulakleguin.com/on-rules-of-writing)).

## Problem statement

First-time novelists often begin with fragmented notes, images, voice recordings, scenes, character ideas, research, and partially formed worlds. General-purpose documents and note apps make it difficult to see how a character’s motivation connects to a subplot, a timeline event, a scene, and a later payoff. Existing systems also commonly force a rigid outline, bury portability behind a proprietary account, or make generative AI the centre of the experience.

The cost is loss of momentum, weak continuity, overwhelmed planning, and abandoned drafts. The product must support a realistic novice path: capture and organise existing material, plan only as much as is helpful, write privately, revise in passes, and retain the ability to leave the platform with a complete, intelligible project folder.

This is consistent with the craft evidence. Pratchett described a private, unedited “draft zero” written to tell oneself the story ([Longreads interview](https://longreads.com/2015/03/12/fantasy-author-terry-pratchett-on-working-on-draft-zero-of-a-book/)); Gaiman recommends finishing work, putting it away, and returning with “new eyes” for revision ([Neil Gaiman FAQ](https://www.neilgaiman.com/FAQs/Advice_to_Authors)); Crichton describes revising in passes rather than trying to perfect a draft immediately ([Michael Crichton, “For Younger Readers”](https://michaelcrichton.com/for-younger-readers/)).

## Product vision

Lit Technica is the author’s portable story workshop. It keeps the novel, its research, and its media in an understandable project folder owned by the author; it makes relationships across a novel visible; and it teaches useful craft without imposing one theory of storytelling.

### Product principles

- **Authorial ownership:** The author owns the canonical files, can read them outside Lit Technica, and can leave without permission or data loss.
- **Private by default:** Drafts, especially early drafts, are private and never treated as social content. Pratchett’s draft-zero practice, Gaiman’s private practice work, and Moore’s warning about fear of judgement all support privacy as a craft feature, not merely a security feature ([Longreads](https://longreads.com/2015/03/12/fantasy-author-terry-pratchett-on-working-on-draft-zero-of-a-book/), [Gaiman FAQ](https://www.neilgaiman.com/FAQs/Advice_to_Authors), [BBC Maestro](https://www.youtube.com/watch?v=4Oan10yp5pQ)).
- **Flexible method, never formula:** The user may choose a planning lens, discovery-writing path, genre-oriented exercise, or no framework at all. Every template is skippable, editable, and clearly labelled as a lens rather than a test of good writing.
- **Planning and prose are peers:** Notes must not become a planning prison. Every planning surface links to scenes and chapters, and the writer can start drafting at any time.
- **Assistance without authorship substitution:** Optional automation can retrieve, summarise, and propose links, but it must cite its evidence and require author approval before changing structured data.
- **Progress without shame:** Progress can include word counts, story readiness, and custom checklists. It must not make streaks, daily quotas, or completion percentages feel punitive.
- **Interoperability over lock-in:** Use documented, durable open formats for the project model and publishing outputs. Bring-your-own storage is the preferred sync model.

## Target users

### Primary persona: the first-time novelist

A motivated but inexperienced novelist, initially likely working on fantasy or science fiction. They have notes and inspirations spread across documents and folders, want to learn how novels are developed, and need confidence that their work stays theirs.

**Needs**

- Turn existing ideas into an organised story workspace.
- Learn practical craft while producing a real novel.
- See character, plot, timeline, world, and manuscript connections.
- Draft without an always-on critic or a formulaic system.
- Export cleanly for publishing, editing, and long-term ownership.

### Secondary persona: the self-directed speculative-fiction planner

A more organised solo writer whose project has multiple locations, magic or technology rules, time jumps, and subplots. They need a world bible and timeline that remain linked to the manuscript without forcing exhaustive preparation.

### Future persona: the trusted reader or editor

A person who receives a read-only, deliberately selected snapshot or export. They cannot alter the author’s source project in the first release.

## Goals

### User goals

1. Help a new author import scattered Markdown or text notes and turn them into a navigable project in one first session.
2. Help an author move freely among story planning, drafting, and revision without data duplication.
3. Keep every project portable, recoverable, and usable offline.
4. Help authors learn practical novel-development techniques without enforcing a single structure.
5. Let an author produce a publishable or shareable manuscript package for Word, PDF, Markdown/HTML, and later narration workflows.

### Success metrics

Baselines will be established during beta. Targets are proposed for the first six months after public beta.

- **Organisation activation:** At least 70% of new projects contain an imported note or a created story item, and at least one link between story material, within the first session.
- **Writing activation:** At least 50% of activated projects contain a chapter or scene with 500 or more words within seven days.
- **Story development:** At least 35% of active projects complete a user-chosen readiness checklist or create material in three of four core workspaces: character, plot, timeline, and worldbuilding.
- **Portability:** At least 95% of export attempts complete without an error; a round-trip test re-imports a portable project folder without loss of Markdown, metadata, links, or media references.
- **Learning value:** At least 60% of surveyed active authors report that Lit Technica helped them understand planning, drafting, or revision better.
- **Publication outcome:** At least 20% of active authors export a manuscript or web-publishing package within six months.
- **Trust:** Zero known cases in which an export omits authored text or original media because of a Lit Technica-specific format defect.

## Non-goals

- **AI ghostwriting:** Lit Technica will not be positioned as a generator of chapters, scenes, dialogue, endings, or replacement prose.
- **A universal novel formula:** It will not require three-act structure, a beat sheet, a fixed ending, daily streaks, or a genre rule system.
- **Full collaboration:** Real-time co-writing, comments, permissions, and conflict resolution between multiple authors are out of scope for the initial release. Read-only sharing is a later capability.
- **Managed cloud storage:** Lit Technica will not operate a proprietary canonical content store in the first release. Optional sync uses an author-selected local folder and their own storage provider.
- **Direct publishing or audiobook generation in the first release:** The P0 release prepares outputs only; it does not require a connection to Substack, WordPress, ElevenLabs, or any other third party. Direct, opt-in publishing and narration connectors are explicitly phased in afterward under the Import/Export & Syndication System (see P1/P2 below and the [Import/Export & Syndication spec v0.1](./lit-technica-import-export-syndication-spec-v0.1.md)), gated behind encrypted credential storage and per-platform legal review — this is a sequencing decision, not a permanent exclusion.
- **Copying proprietary teaching content:** The product will not reproduce paid-course lessons, copyrighted exercises, or branded writing frameworks without a licensing review.

## User journeys

### Import and orient

1. The author creates or opens a local project folder.
2. They import Markdown and text files.
3. Lit Technica presents imported items as unclassified notes without silently changing the source.
4. The author can classify each item as character, world, plot, timeline event, scene, research, or “keep as note.”
5. The author links or merges items and begins drafting or planning immediately.

### Develop a novel without choosing a rigid method

1. The author chooses no lens, a planning lens, a discovery-writing lens, or a genre-oriented worldbuilding lens.
2. Lit Technica offers optional questions and starter structures; every prompt can be skipped or rewritten.
3. The author creates characters, plot/subplot threads, timeline events, world entries, and scene cards.
4. Links surface relevant relationships, such as a character’s motivation, an object’s first appearance, or a timeline event connected to a scene.
5. The author switches to the manuscript whenever ready.

### Draft privately

1. The author enters a distraction-free editor or marks a manuscript section as “Draft Zero.”
2. The workspace suppresses craft scoring, automatic prose replacement, and sharing by default.
3. The author writes scenes and chapters, with scene cards and binder/document views remaining available.
4. They can attach reference media to any relevant item without moving it from the library that is familiar to them.

### Revise and publish

1. The author reviews a manuscript in named passes, such as continuity, character, pacing, or copy-editing.
2. They use version history to compare or restore earlier work.
3. They choose a target: portable folder, Word, PDF, Markdown, or HTML.
4. Lit Technica previews the package, reports unresolved export problems, and writes files to an author-controlled location.
5. For a web-publishing target, the author receives clean Markdown and HTML appropriate for pasting or importing into Substack or WordPress.

## Information architecture

Every project has the following first-class content types.

| Content type | Core fields | Relationships |
|---|---|---|
| **Manuscript** | title, chapters, scenes, draft state, version history | scenes link to all story entities |
| **Character** | name, role, motivation, wants, fears, wins, losses, arc, voice/behaviour notes, media | scenes, relationships, plot threads, timeline events, locations |
| **Plot thread** | premise, stakes, questions, set-ups, pay-offs, status | scenes, characters, timeline events, other threads |
| **Timeline event** | event, story time, chronology, confidence, notes | scenes, characters, locations, plot threads |
| **World entry** | type, facts, rules, constraints, costs, exceptions, source/research notes | scenes, characters, locations, timeline events |
| **Scene card** | objective, conflict, change, viewpoint, status, prose link | chapter, entities, timeline, plot threads |
| **Research/note** | source, text, tags, import origin | any content type |
| **Media item** | original filename, type, caption, provenance, storage path | attachable anywhere |
| **Craft item** | lens, question, exercise summary, timing, source attribution | optional links to relevant work |

The interface must offer three coherent representations over the same data: document list, scene-card board, and Scrivener-style binder. A change in one view is immediately reflected in the others.

## Functional requirements

### P0: Import, organise, plan, draft, export, and preserve authorship

#### Local project and portability

- Projects must be created in an author-selected local folder.
- Canonical authored text must be stored as UTF-8 Markdown files, not a proprietary binary document.
- Structured metadata must be stored in a documented, versioned, human-readable format such as JSON, YAML, or JSON-LD.
- Original media must remain as original files in a predictable project subfolder. The product may create derived thumbnails but must never make a derived copy the only stored original.
- The app must generate a `README` explaining the folder layout, format version, and recovery/import process.
- The author must be able to open, copy, move, and back up the folder while Lit Technica is closed.

**Acceptance criteria**

- Given a new project, when the author selects a local folder, then Lit Technica creates the documented project layout and no account is required to read the resulting files.
- Given a project with text, linked entities, and media, when the author exports a portable project folder, then a clean Lit Technica installation can re-import it with no loss of authored Markdown, original media, stable item IDs, or relationships.
- Given the app is offline, when the author opens an existing project, then they can read, create, edit, search, and export project content.

#### Markdown and text import

- Support single-file and folder import for Markdown and plain-text notes.
- Preserve each original file unchanged until the author explicitly converts or edits it inside Lit Technica.
- Offer classification and link suggestions, but never auto-delete, merge, or rewrite imported notes.
- Record source path and import date in project metadata.

**Acceptance criteria**

- Given a folder of Markdown and text files, when the author imports it, then every readable text file appears in an import review list with status, title, and source path.
- Given an imported note, when the author classifies it as a character or plot item, then the original source text remains accessible from that item.
- Given a file cannot be parsed, when import completes, then the author sees the file name and a clear non-destructive error rather than a partially created item.

Later capabilities — Reminders/Calendar quick capture, Wispr Flow voice capture, a dual-form `#S:id` / `#S:slug` tagging system, and inline margin comments — are captured (not yet sequenced) in the companion [Quick Capture, Tagging & Inline Annotation sub-PRD v0.1](./lit-technica-quick-capture-tagging-annotation-prd-v0.1.md). Note: multi-author comments conflict with this PRD's no-collaboration non-goal (§90) and require an explicit decision before scheduling.

#### Connected planning workspaces

- Provide dedicated, interconnected workspaces for Characters, Plot & Subplots, Timeline, and Worldbuilding.
- Support character motivations, wants, fears, wins, losses, relationships, arc notes, behaviours, and reference media.
- Support plot threads with stakes, open questions, set-ups, pay-offs, status, and linked scenes.
- Support flexible timelines including uncertain dates, relative chronology, flashbacks, and multiple event orderings where a story requires them.
- Support worldbuilding entries for locations, factions, cultures, history, technology, magic, and rules. Fantasy/system entries must support limitations, weaknesses, costs, exceptions, and user-defined categories.
- Support a visible relationship graph or inspector, with links navigable in both directions.

**Acceptance criteria**

- Given a character and a scene, when the author links the character to the scene, then the scene appears in the character’s appearance list and the character appears in the scene’s linked-entity list.
- Given a plot thread has an unresolved setup, when the author views its status, then all linked scenes and pay-off candidates are visible without leaving the project.
- Given a timeline event has an uncertain date, when the author places it relative to another event, then the UI communicates the uncertainty rather than inventing a precise date.

#### Manuscript and multiple views

- Provide a rich Markdown-first chapter and scene editor.
- Provide document list, scene-card board, and binder views over the same manuscript and planning items.
- Support chapter and scene ordering by drag-and-drop, without breaking stable IDs or entity links.
- Support a private Draft Zero state and a distraction-free full-screen editor.
- Allow the author to decide when a scene is ready to share or export.

**Acceptance criteria**

- Given an author reorders a scene on the card board, when they switch to binder and document views, then the new order is reflected consistently.
- Given a scene is in Draft Zero, when the author enters distraction-free mode, then no AI prompts, craft scores, public-sharing controls, or automatic prose suggestions appear.
- Given the author closes and reopens a project, when they view a chapter, then the text and its linked entities remain intact.

#### Media attachments

- Allow the author to attach photos and audio files to any character, plot thread, timeline event, world entry, chapter, scene, or research note.
- Store and retain original files in the project folder with a stable relationship record.
- Display media previews where the file type permits. Audio must include basic playback and accessible file metadata.

**Acceptance criteria**

- Given an author attaches an audio file to a character, when they open that character from a linked scene, then they can play or locate the original attachment.
- Given an attached file is moved outside Lit Technica, when the app next opens the project, then it reports the broken reference and offers a relink action without deleting the relationship metadata.

A later capability — AI-generated visual references, a gentle photo/video editor, and real-person-to-character reference links — is captured (not yet sequenced) in the companion [Visual Reference & Media sub-PRD v0.1](./lit-technica-visual-reference-media-prd-v0.1.md).

#### Version history, backups, and bring-your-own sync

- Maintain local version history for manuscripts and structured planning records.
- Provide explicit restore and compare actions.
- Detect concurrent or external file changes and guide the author through a non-destructive conflict-resolution flow.
- Support projects stored in user-managed sync folders, including common providers, without requiring Lit Technica-managed cloud storage.
- Provide backup-status visibility and a documented recovery process. Encryption-at-rest design is a blocking architecture decision before implementation.

**Acceptance criteria**

- Given an author changes a scene and saves it, when they open version history, then they can view a timestamped earlier version and restore it into a new version without data loss.
- Given a sync provider creates a conflicting file version, when Lit Technica discovers it, then it preserves both versions, identifies the conflict, and does not silently choose one.
- Given a project is copied to a different device through the author’s storage provider, when it is opened there, then Lit Technica validates the format and either opens it or presents a recoverable migration message.

#### Export

- Export a portable project folder.
- Export a manuscript as `.docx`, PDF, Markdown, and clean HTML.
- Provide a Substack/WordPress-oriented web package with semantic headings, links, images, captions, and an export preview.
- Provide a narration-script export with chapters/scenes, headings, optional speaker labels where the author has supplied them, and metadata suitable for later text-to-speech or audio-production workflows.
- Do not require a connection to Substack, WordPress, ElevenLabs, or another third party for P0 export.

**Acceptance criteria**

- Given a manuscript with chapters, italic text, links, and images, when the author exports Word, PDF, Markdown, and HTML, then each package contains the ordered manuscript and preserves supported formatting.
- Given a web-publishing export, when the author views its preview, then it identifies unsupported or missing media rather than silently omitting it.
- Given a narration-script export, when the author opens it outside Lit Technica, then chapter and scene boundaries are readable and all author-entered speaker labels are preserved.

### P1: Guidance and author-controlled assistance

#### Craft guidance

- Offer a browsable, attributed craft library and optional lenses for planning, discovery drafting, character development, speculative worldbuilding, revision, and finishing.
- Allow the author to enable, dismiss, rewrite, or hide any prompt.
- Present opposing or alternative approaches where credible craft sources disagree.
- Use original prompts and summaries rather than copying copyrighted exercise text or commercial lesson sequences.
- Include a gentle guided-project path, contextual prompts, story-readiness indicators, word-count goals, and custom checklists.
- Prompts and gamified mechanics are genre-agnostic by default: Lit Technica serves novelists across contemporary, historical, literary, crime, romance, and speculative fiction, so core prompt copy must never assume invented worlds, magic, or advanced technology. Genre-specific content lives in optional lenses. Full requirements for the prompt library (worldbuilding, character, escalation, random mechanics) and the gamification layer live in the companion [Craft Guidance: Prompts & Gamification sub-PRD v0.1](./lit-technica-craft-guidance-prompts-prd-v0.1.md), evidenced by the [prompt & gamification craft research](./lit-technica-worldbuilding-character-prompts-research-2026-08-09.md).

Craft content should operationalise, without over-claiming ownership of, several useful principles: a draft can be private and deliberately rough ([Pratchett](https://longreads.com/2015/03/12/fantasy-author-terry-pratchett-on-working-on-draft-zero-of-a-book/)); revision benefits from distance ([Gaiman](https://www.neilgaiman.com/FAQs/Advice_to_Authors)); outlines can help a writer “face the void” without being a contract ([Grossman](https://lunchticket.org/lev-grossman-author/)); and fantasy systems gain tension from limits, weaknesses, and costs ([Sanderson](https://faq.brandonsanderson.com/knowledge-base/what-are-sandersons-laws-of-magic/)).

**Acceptance criteria**

- Given a discovery-oriented author, when they start a project, then they can bypass all outline fields and begin a Draft Zero scene.
- Given a planning-oriented author, when they choose a planning lens, then they receive optional story, character, plot, and timeline prompts with no required completion percentage.
- Given a user dismisses a craft prompt, when they work on the same content later, then the prompt remains dismissed unless they re-enable it.

#### Optional AI organisation tools

- Provide optional, per-invocation tools to propose entity links and create navigational summaries of chapters, characters, and plot threads.
- Require explicit author selection of the source content before any AI request.
- Display the exact source passages or items used for an entity-link suggestion or summary.
- Never silently change manuscript prose or structured records.
- Do not offer scene/chapter/prose generation in the core product UX.
- Record local provenance for accepted or rejected suggestions.

The deployment model for local versus cloud AI remains undecided. No cloud model request may be implemented until consent language, data-retention terms, provider policy, and a per-request scope control are approved.

**Acceptance criteria**

- Given the author selects “suggest links” for a scene, when Lit Technica presents a suggestion, then it identifies the matching text and the destination item, and the author can accept, reject, or ignore it.
- Given an author asks for a chapter summary, when the summary is shown, then it is visually labelled as a navigational aid and includes its source scope.
- Given an author does not invoke an AI action, when they draft or plan, then no project text is sent to an AI service.

#### Read-only sharing

- Allow an author to create a deliberate, revocable, read-only package or link for selected chapters and associated material.
- Exclude Draft Zero material by default.
- Keep full account-based collaboration, commenting, and co-author conflict management out of scope.

### P1/P2: Import/Export & Syndication System

Full architecture, per-platform capability matrix, auth patterns, and build order are specified in the companion [Import/Export & Syndication spec v0.1](./lit-technica-import-export-syndication-spec-v0.1.md). Summary of scope for this PRD:

**P1 (file-based, no third-party account required)**

- A profile-level Connections page where the author can upload files for formats that have no first-party API: MS Word (.docx), Txt, PDF, Markdown, Craft Docs (Markdown/TextBundle), Obsidian (vault folder/zip), ePub, and GoodReads (CSV export upload).
- RSS/Atom feed generation per work, unlocking Substack's own importer and podcast-style distribution with no vendor relationship.
- Encrypted-at-rest storage design for any credential this system will hold, resolved before P2 account-based connectors ship.

**P2 (account-based connectors, after encryption-at-rest and legal review)**

- Google Docs import/export via OAuth2 using the non-sensitive `drive.file` scope and the Google Picker.
- WordPress connectors (self-hosted Application Passwords, then WordPress.com OAuth2) as the first genuinely bidirectional publishing integration.
- ElevenLabs narration-job integration, built on a provider-neutral export contract and an async job queue, with explicit in-product voice-cloning consent.
- YouTube Shorts publishing after a video-render worker exists and a YouTube API Compliance Audit is underway.
- Medium and Substack handoff flows: canonical-URL "Import a story" deep link for Medium, RSS-paste-into-importer instructions for Substack. Neither platform has a usable write API, so these are thin UI wrappers around already-built export/RSS capability, not full integrations.
- Continuity review that flags possible contradictions, always with evidence and author decision-making.
- Recall prompts that surface relevant prior appearances of characters, objects, places, and plot threads while writing.
- Multi-project and series-level world continuity.
- Read-only web sharing with controlled feedback collection.
- Advanced revision workspaces: cooling-off timers, a reader-view mode, named revision ledgers, and beta-reader feedback triage.
- Deferred to a later phase: Instagram Reels and TikTok syndication, pending public media hosting and each platform's own review/audit process.

**Acceptance criteria**

- Given an author has connected no platform, when they export a manuscript, then portable folder, `.docx`, PDF, Markdown, HTML, and narration-script exports all still work, per the P0 export contract.
- Given an author connects a WordPress account, when they export a chapter to it, then the resulting post is created as a draft by default, with publish/schedule as separate explicit choices.
- Given an author disconnects a platform from the Connections page, then its stored credential is deleted, not merely hidden, and reconnecting requires fresh authorization.
- Given a platform has no supported export path (Medium, Substack, GoodReads), when the author views its Connections card, then the UI states this explicitly instead of presenting a non-functional publish action.

## Technical and data requirements

### Project format

The project format is a product contract, not an implementation detail.

```text
My Novel/
  README.md
  lit-technica-project.json
  manuscript/
    001-chapter-one.md
    002-chapter-two.md
  story/
    characters/
    plots/
    timeline/
    world/
    research/
  media/
    original/
    derived/
  exports/
  history/
```

- Markdown contains author prose and long-form notes.
- Metadata references content by stable UUID, never by mutable filename alone.
- Links must degrade gracefully: a Markdown file remains useful even if Lit Technica is no longer installed.
- The format specification, version migrations, and sample project must be published before beta.

### Offline and installable web app

- The application must install as a Progressive Web App or equivalent installable web experience.
- Core authoring, browsing, search, planning, version history, and export work offline after a project is opened locally.
- Network status must be obvious and must never block local writing.
- Any third-party or AI request is a clearly labelled exception to offline operation.

### Security and privacy

- No manuscript or planning content leaves the local project folder unless the author performs an explicit export, shares a chosen package, or opts into an AI request.
- Encryption-at-rest, key ownership, recovery, and interaction with user-managed sync providers require a technical design review before claiming “encrypted workspace.”
- Telemetry must be anonymous or opt-in and must never include manuscript text, note contents, file names, media content, or prompts by default.

### Accessibility

- Keyboard-first navigation across editor, binder, cards, timeline, and relationship panels.
- Screen-reader labels for all core controls, scene status, entity relationships, audio playback, and attachment state.
- Adjustable typography, contrast, spacing, and reduced-motion support.
- Exports must preserve semantic headings and sensible reading order.

## Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Scope overload** | Import, planning, drafting, export, versioning, and offline sync each have substantial complexity. | Deliver the P0 contract as a small vertical slice: Markdown/text import, four workspaces, manuscript views, local history, and basic exports before advanced automation. |
| **Formula pressure** | A novice product can accidentally make templates feel compulsory. | Make every framework opt-in and skippable; show contrasting approaches; never score creative compliance. |
| **AI replaces authorship** | The user explicitly wants a tool, not a ghostwriter. | Restrict launch AI to summaries and proposed entity links; require explicit invocation and evidence. |
| **Portability is superficial** | A nominal export that loses links/media would betray the main promise. | Make open-format export/import and round-trip testing release gates. |
| **Sync conflict data loss** | The target user needs backups and cross-device use. | Preserve both versions, support version history, and never resolve silently. |
| **Copyright and attribution** | Craft source material may be commercial or protected. | Paraphrase concepts, link and attribute sources, and obtain licences before reproducing exercises or course structure. |
| **Encrypted-sync expectation mismatch** | “Bring your own storage” and “encrypted workspace” require precise key and threat-model choices. | Treat encryption architecture as a launch blocker, not marketing language. |

## Delivery sequence

### Foundation

- Publish the project-format specification, sample project, import/export test fixtures, and privacy model.
- Build local project creation, Markdown/text import, and the shared entity/link model.
- Build core manuscript editor, document list, binder, and scene-card views.

### First usable author loop

- Build Characters, Plots/Subplots, Timeline, and Worldbuilding workspaces.
- Add attachments, local search, local version history, and Draft Zero/distraction-free mode.
- Deliver portable project, Markdown/HTML, Word, PDF, and narration-script exports.

### Guidance and confidence

- Add optional craft lenses, contextual prompts, readiness checklist, custom checklist, and gentle word-count goals.
- Add read-only snapshot/package sharing.
- Validate portability, offline operation, accessibility, and recovery with first-time novelists.

### Follow-on automation and integrations

- Add evidence-based entity-link suggestions and navigational summaries after AI privacy decisions.
- Add continuity review, Word/Obsidian/media import, platform publishing integrations, and provider-neutral audiobook integrations.

## Open questions

| Question | Owner | Blocking? |
|---|---|---|
| What encryption model protects a local folder while preserving compatibility with user-managed sync and recovery? | Engineering / security | **Blocking for “encrypted workspace” claim** |
| Which browser file-system APIs and fallback behaviour define the supported offline platform matrix? | Engineering | **Blocking for architecture** |
| What exact Markdown dialect and metadata schema are documented as the stable project format? | Product / engineering | **Blocking for portability contract** |
| What fidelity standard is required for Word and PDF output, including comments, footnotes, front matter, and images? | Product / design | **Blocking for export acceptance tests** |
| Is AI executed locally, through an opt-in cloud provider, or with a per-request choice? | Product / privacy / engineering | **Blocking before AI ships** |
| What sharing mechanism offers read-only access without making Lit Technica a managed canonical cloud store? | Product / engineering | Non-blocking for P0; blocking for P1 sharing |
| What user research validates the first-session import and classification flow with genuine novice writers? | Product / research | **Blocking before public beta** |
| Which craft sources are licensed, paraphrased, or merely linked in the in-product library? | Product / legal | **Blocking before reproducing third-party content** |
| What business model sustains development without converting author files into a lock-in mechanism? | Product | Non-blocking for product prototype; needed before commercial launch |
| What encryption-at-rest design protects Import/Export & Syndication connector credentials (OAuth tokens, Application Passwords, API keys), and does it share the same design as the local-folder encryption question above? | Engineering / security | **Blocking before any non-file-based connector ships** |
| Who owns per-platform ToS/legal review sign-off for the Import/Export & Syndication System (Automattic non-compete clause, Substack no-resale/no-compete clause, TikTok branding-overlay rules, GoodReads robots.txt disallow)? | Product / legal | **Blocking before each affected connector ships** |
| Who owns the YouTube API Compliance Audit application and its timeline, given unaudited projects force uploads to private? | Product / legal | **Blocking before public-by-default YouTube Shorts publishing** |

## Research basis

The craft research behind this PRD prioritised primary author sources and distinguishes verified direct advice from secondary interpretations. The most product-relevant sources are:

- [Alan Moore, “On Writing for Comics”](https://theanarchistlibrary.org/library/alan-moore-on-writing-for-comics) for worldbuilding depth, character observation, story structure, and idea-versus-plot.
- [BBC Maestro’s Alan Moore discussion](https://www.youtube.com/watch?v=4Oan10yp5pQ) for practical craft capacities and the importance of completing work.
- [Michael Crichton’s official FAQ](https://michaelcrichton.com/faq/) and [his writing account for younger readers](https://michaelcrichton.com/for-younger-readers/) for research, incubation, revision, and normalising doubt.
- [Lev Grossman’s Lunch Ticket interview](https://lunchticket.org/lev-grossman-author/) and [Reactor interview](https://reactormag.com/what-fantasy-does-best-lev-grossman-talks-with-peter-orullian/) for flexible outlining, ending awareness, opening/pacing work, and story-world feedback.
- [Terry Pratchett on Draft Zero](https://longreads.com/2015/03/12/fantasy-author-terry-pratchett-on-working-on-draft-zero-of-a-book/) and [his archived craft advice](https://www.lspace.org/books/apf/words-from-the-master.html) for private drafting, waypoints, application, and manageable daily practice.
- [Neil Gaiman’s author advice](https://www.neilgaiman.com/FAQs/Advice_to_Authors) and [Writers & Artists interview](https://www.writersandartists.co.uk/advice/interview-neil-gaiman) for finishing, revision distance, private practice, and sustainable progress.
- [Ursula K. Le Guin on rules](https://www.ursulakleguin.com/on-rules-of-writing), [her workshop material](https://www.ursulakleguin.com/bvc-navigating-the-ocean-of-story-session-1-part-3), and [Steering the Craft](https://www.ursulakleguin.com/steering-the-craft) for timing, character, craft as learnable practice, and the danger of rigid rules.
- [Brandon Sanderson’s official explanation of his laws](https://faq.brandonsanderson.com/knowledge-base/what-are-sandersons-laws-of-magic/) for fantasy-system constraints, explicitly framed by Sanderson as flexible guidelines rather than commandments.

## Decision log

| Decision | Status |
|---|---|
| Product name: **Lit Technica** (renamed from Wordsmithery, 15 August 2026) | Decided |
| Primary audience: first-time novelists | Decided |
| Primary genre orientation: fantasy/science fiction, without excluding other fiction | Decided |
| Workflow: hybrid planning and discovery writing | Decided |
| Canonical data model: local-first, portable, optional user-managed cloud sync | Decided |
| Initial import: Markdown and plain text | Decided |
| Core workspaces: characters, plots/subplots, timeline, worldbuilding | Decided |
| Manuscript views: documents, scene cards, binder | Decided |
| Media: attachments anywhere | Decided |
| Safeguards: version history, backup/recovery, encryption goal, conflict-safe sync | Decided, technical design pending |
| Sharing: read-only later | Decided |
| Exports: portable folder, Word, PDF, Markdown/HTML for web publishing | Decided |
| Audiobook: narration-script export in first release; API generation later | Decided |
| AI: optional, author-controlled, summaries and link suggestions only; discourage story generation | Decided |
| AI execution location | Open |
| Craft guidance: all approaches available, user choice; no formula enforcement | Decided |
| Import/Export & Syndication System: phased, opt-in Connections page covering Google Docs, MS Word, Txt, PDF, Markdown, Craft Docs, Obsidian, WordPress, Medium, ElevenLabs, ePub, Substack, YouTube Shorts, GoodReads, RSS/XML | Decided, spec v0.1 published |
| Canonical interchange format for the syndication system: Markdown with a single leading YAML front-matter block | Decided |
| Connector auth patterns: OAuth2 (Google, WordPress.com, YouTube), delegated Application Password (self-hosted WordPress), server-held API key (ElevenLabs), file upload (Word, Txt, PDF, Markdown, Craft, Obsidian, ePub, GoodReads), RSS/no-auth (Medium import, Substack handoff) | Decided |
| Encryption-at-rest for connector credentials: required before any non-file-based connector ships | Decided, technical design pending |
| Six-month outcomes: stay organised, learn craft, publish work | Decided |

