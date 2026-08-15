# Lit Technica — Craft Guidance: Prompts & Gamification Sub-PRD

**Version:** v0.1 · **Date:** 2026-08-09 · **Status:** Draft for review
**Parent:** [Lit Technica PRD v0.2](./lit-technica-prd-v0.2.md) (P1 "Craft guidance", §248–262)
**Evidence base:** [Worldbuilding, Character & Escalation Prompts — Craft Research](./lit-technica-worldbuilding-character-prompts-research-2026-08-09.md) and its three underlying research files in [`docs/research/`](./research/)

---

## 1. Scope and genre position

This sub-PRD specifies the prompt library and optional gamified mechanics for the Craft Guidance feature (P1). It covers four prompt families — **worldbuilding, character, plot/scene escalation, and process/gamification** — and how they map onto the Worldbuilding, Characters, Plot & Subplots, and Timeline workspaces.

**Lit Technica is a tool for novelists, not for fantasy and sci-fi novelists.** This sub-PRD corrects a framing inherited from earlier craft research: most published worldbuilding question banks were written for speculative fiction, and the underlying research reports lean that way (e.g. Wrede's "Fantasy Worldbuilding Questions"). The product must not. Concretely:

- **Every prompt must work for contemporary, historical, literary, crime, and romance fiction as written.** "Worldbuilding" in Lit Technica means *world development* — the coherent construction of any story's setting, institutions, and daily life — and applies equally to 1990s Glasgow, Regency England, or a far-future colony. The term "worldbuilding" may be kept as workspace naming (authors recognise it) but prompt copy must never assume invented worlds, magic systems, or advanced technology.
- **Genre assumptions live in optional lenses, not in core prompts.** A "speculative" lens can add magic/technology/future-history prompts on top of the genre-neutral core; "historical" or "contemporary" lenses can add period-accuracy and research prompts. The core library contains no genre-specific content.
- **Genre-dependent mechanics must degrade gracefully.** Example: the "most advanced available option" prompt family (§3.1) is framed as *era- and genre-relative* — for a contemporary novel it asks about what is cutting-edge *today* (and who can't afford it); for historical fiction it asks what the most advanced option was *in the story's period*. It never presupposes invention.

This is consistent with the parent PRD's principle of "flexible method, never formula": genre is one more axis the author controls.

---

## 2. Product principles (binding)

These restate the parent PRD's principles as they apply to prompts and gamification, and must govern every requirement below.

1. **Optional, dismissible, rewritable.** Every prompt can be enabled, dismissed, rewritten, or hidden by the author; dismissed prompts stay dismissed.
2. **Progress without shame.** No punitive streaks, quotas, or completion percentages. Any progress mechanic is informational, forgiving, and optional.
3. **Randomness delivers dilemmas, not answers.** Where random prompt mechanics are used, they surface a question or a choice; the author always decides.
4. **Original copy only.** In-app prompt text is written by us. Third-party question banks (Wrede, Weltenbau Wissen, commercial game decks) inform design but are never reproduced verbatim without licence. See §7.
5. **No AI prose.** Nothing in this feature generates story text.

---

## 3. Requirements by prompt family

### 3.1 World development prompts (Worldbuilding workspace)

- **F-W1. Domain interrogation deck.** A browsable, genre-neutral question library organised by life domain: geography & place, history, government & law, economy & work, transport, healthcare, technology & tools, arts & leisure, customs & language, daily life. Categories are informed by [Wrede's taxonomy](https://pcwrede.com/pcw-wp/fantasy-worldbuilding-questions-daily-life/) and the [Weltenbau Wissen List](http://www.weltenbau-wissen.de/wp-content/uploads/2017/03/The_Weltenbau_Wissen_List_of_Worldbuilding_Questions.pdf); all wording is original.
- **F-W2. "Most advanced option" prompt pattern.** For any life domain the author selects (transport, healthcare, leisure, communication, warfare, death rites…), the prompt asks: *what is the most advanced option available in this world — and who can't access it, and why?* This is the pattern the requester surfaced and it is verified against published sources ([Weltenbau Wissen Q72–Q73](http://www.weltenbau-wissen.de/wp-content/uploads/2017/03/The_Weltenbau_Wissen_List_of_Worldbuilding_Questions.pdf), [Write On Sisters](http://writeonsisters.com/writing-craft/1-key-question-for-worldbuilding-a-handy-checklist/)). The access/exclusion half of the question is mandatory in the copy: it is the more character-relevant part and the part writers most often skip.
- **F-W3. Era-relative framing.** F-W2 must be phrased so it resolves correctly for contemporary ("what is cutting-edge *now*"), historical ("what was the most advanced option *in the period*"), and speculative fiction alike. The word "technology" is never required; "tools," "medicine," or "means of transport" are preferred in copy.
- **F-W4. Field taxonomy for structured entries.** Worldbuilding entries offer optional structured fields informed by [Chaotic Shiny's](http://chaoticshiny.com/civgen.php) field lists (e.g. for a culture: *highly values / major taboo / major social ill*), so prompts can produce data the app can cross-link, not just free text.
- **F-W5. Origin/Attribute/Advent schema.** Any setting element (region, landmark, institution, faction) can optionally carry a past/present/future triad, informed by [Deck of Worlds](https://files.storyenginedeck.com/Deck-of-Worlds-Guidebook.pdf), giving Worldbuilding entries a Timeline dimension without forcing one.
- **F-W6. Restraint counter-lens.** An optional lens presenting the opposing view — "don't explain it unless you must" ([SFWA — The Art of Story as Worldbuilding](https://sfwa.org/2019/10/16/the-art-of-story-as-worldbuilding/)) and common exposition pitfalls ([Info Dump](https://tvtropes.org/pmwiki/pmwiki.php/Main/InfoDump), [As You Know](https://tvtropes.org/pmwiki/pmwiki.php/Main/AsYouKnow)) — per the parent PRD's requirement to present credible disagreement.

### 3.2 Character prompts (Characters workspace)

- **F-C1. Layered questionnaires.** Three optional depth tiers: basics → physicality & material detail ("what is in their refrigerator right now?") → interiority (Proust-style second-person questions). Informed by the [Gotham Writers questionnaires](https://www.writingclasses.com/toolbox/character-questionnaire/gotham) ([Proust variant](https://www.writingclasses.com/toolbox/character-questionnaire/proust)); all wording original and genre-neutral.
- **F-C2. Relationship templates.** Fill-in-the-blank relational prompts that generate inter-character tension in one line, informed by [Dungeon World Bonds](https://www.dungeonworldsrd.com/classes/thief/) (e.g. "[name] knows incriminating details about me"). Fully genre-neutral.
- **F-C3. Backstory beat format.** An optional one-sentence template for recording a formative event plus the character's response, informed by [Thousand Year Old Vampire's Experience format](https://pdfcoffee.com/tyovver104pdf-pdf-free.html) — an anti-perfectionism constraint, not a required structure.
- **F-C4. Lifepath option.** An optional, playful "lifepath" mode that walks a character through life stages, treating setbacks as generative material rather than failure — informed by [Traveller's career terms and mishaps](https://www.traveller-srd.com/core-rules/careers/). Presented as one lens among several, never the default character-creation flow.

### 3.3 Plot & scene escalation prompts (Plot & Subplots, Timeline, and Manuscript scene cards)

This family operationalises the requester's second example prompt — *"if this scene carries on for another few pages, would this change the situation?"*

- **F-P1. Escalation self-check.** A scene-level prompt asking whether the scene's pressure is still rising: grounded in [McKee's stakes test](https://static1.squarespace.com/static/5af1145d697a987d247c2773/t/5f134b8555e4ba6ef215f38a/1595100062763/Story-+Style,+Structure,+Substance,+and+the+Principles+of+Screenwriting+by+Robert+McKee.pdf) ("what's the worst thing that happens if the protagonist fails?") and [Gilbo's progressive-complications diagnostic](https://www.savannahgilbo.com/blog/progressive-complications) (each complication should out-rank the last).
- **F-P2. "Worst things" brainstorm.** An optional exercise that asks the author to list the ten worst things that could happen next, informed by [Weiland's exercise](https://onewildword.com/2013/09/30/frustrate-your-characters-to-keep-readers-turning-pages/) and [Gold on raising stakes](https://writershelpingwriters.net/2017/03/what-does-it-mean-to-raise-the-stakes/).
- **F-P3. Tension clocks.** An optional visual widget: a segmented dial (progress clock) attached to a plot thread or antagonist plan, which the author ticks manually. Informed by [Blades in the Dark clocks](https://github.com/amazingrando/blades-in-the-dark-srd-content/blob/main/Blades-in-the-Dark-SRD.md), [13th Age's escalation die](https://www.13thagesrd.com/combat-rules/) (which *resets if the conflict stalls* — a literal answer to "would continuing change anything?"), and [Trophy's Ruin](https://trophyrpg.com/system/). Clocks are display-only: the app never auto-advances or warns about them.
- **F-P4. Stakes questions.** A plot thread can carry an optional stakes question in the [Dungeon World Fronts](https://www.dungeonworldsrd.com/gamemastering/fronts/) sense: one whose resolution means "things will never be the same again," and which the app treats as out of the outline's hands once written.
- **F-P5. MICE structural check.** An optional diagnostic identifying the story's primary thread (Milieu/Idea/Character/Event) and checking opening/closing symmetry, per [Card's MICE quotient](https://writingexcuses.com/writing-excuses-6-10-scott-cards-m-i-c-e-quotient/). Genre-neutral: "Milieu" covers any story where the place is the point, from travelogue-lit-fic to portal fantasy.

### 3.4 Random prompt mechanics (any workspace)

Optional, lightweight, and always author-invoked:

- **F-R1. Yes/no oracle with declared odds.** The author frames a yes/no question and picks the odds (almost certain → small chance) before the app resolves it; informed by [Ironsworn's Ask the Oracle](https://tedtschopp.github.io/Ironsworn-SRD/Ironsworn%20SRD.html). A thinking tool for stuck decisions, not a plot generator.
- **F-R2. Word-pair sparks.** A button returning a deliberately under-determined verb+noun or adjective+noun pair for the author to interpret, informed by [Starforged's paired oracles](https://swornforged.com/srd/oracles).
- **F-R3. Two-option dilemma cards.** Random prompts that present two alternatives, forcing a choice rather than supplying an answer; informed by [The Quiet Year](https://i.4pcdn.org/tg/1518812420452.pdf).
- **F-R4. Prompt locking.** Any random prompt can be "locked" to an existing entity (character, place, thread) in the author's project rather than generating something new; informed by the [Story Engine Deck](https://files.storyenginedeck.com/The-Story-Engine-Deck-Guidebook.pdf). This is what differentiates an in-app deck from a generic prompt website and is a priority differentiator.
- **F-R5. Framing copy.** Random mechanics carry the sources' own framing, paraphrased: the prompt is trusted even when its relevance is unclear ([Oblique Strategies](https://en.wikipedia.org/wiki/Oblique_Strategies)); ignore anything that doesn't help you create ([Story Engine](https://files.storyenginedeck.com/The-Story-Engine-Deck-Guidebook.pdf)); there are no wrong answers ([Story Cubes](https://www.zygomatic-games.com/wp-content/uploads/2020/02/storycubesclassic_en_rules.pdf)).

### 3.5 Gamification layer ("progress without shame")

Any game-like layer around prompts or writing sessions must follow the eight principles synthesised in the research (full citations there):

1. **Optional and switchable** — no game mechanics by default. Anti-pattern: [Habitica's party damage](https://habitslayer.com/guides/habitica-review).
2. **Never-resetting cumulative counter** alongside any resettable streak, per [4 The Words' three counters](https://help.4thewords.com/writing/writing-streaks/overview).
3. **Free, built-in forgiveness**, per [4 The Words' same-day streak repairs](https://4thewords.tawk.help/article/streak-repairs-reserve).
4. **User-set targets**, never universal quotas, per [Written? Kitten!](https://fictionwritersreview.com/shoptalk/written-kitten/) and [Scrivener's deadline-derived targets](https://www.literatureandlatte.com/blog/track-statistics-and-targets-in-your-scrivener-projects). Anti-pattern: [NaNoWriMo's fixed 1,667/day](https://www.howdycuriosity.com/blogs/curated-corner/beyond-50-000-words-a-critical-look-at-nanowrimos-impact-on-writers-and-the-industry).
5. **Reward showing up**, not just completion.
6. **Informational framing; no failure-triggered notifications.** Anti-pattern: [Duolingo's guilt notifications](https://www.businessinsider.com/duolingo-meanest-app-nagging-notifications-melting-icon-gen-z-marketing-2024-7); note the [evidence on streaks is genuinely mixed](https://www.nber.org/system/files/working_papers/w34173/w34173.pdf).
7. **Collaboration over competition; no public shortfall displays.** Research on badges/leaderboards is mixed-to-negative for intrinsically motivated users ([Arizona SDT review](https://journals.librarypublishing.arizona.edu/itlt/article/id/4872/download/pdf/)).
8. **Lapses are records, not verdicts**, per [Forest's dead-tree framing](https://www.forestapp.cc/).

---

## 4. Acceptance criteria

- Given a contemporary-literary author, when they open the Worldbuilding prompt deck, then every prompt is answerable for a present-day real-world setting with no speculative or fantastical assumption in the copy.
- Given a historical-fiction author, when they use the "most advanced option" prompt, then the copy resolves to their story's period (e.g. "most advanced available in the period") without requiring the word "technology."
- Given any prompt in any family, when the author dismisses or rewrites it, then the change persists and the original is recoverable.
- Given the gamification layer, when the author misses a day or abandons a prompt, then no penalty, guilt message, or reset of cumulative progress occurs.
- Given any random prompt mechanic, when it fires, then it presents a question or a choice and never writes or suggests story prose.
- Given a random prompt, when the author locks it to an existing character or place, then the prompt references that entity by name.

---

## 5. Phasing

- **First increment (with P1 craft guidance):** F-W1, F-W2/F-W3, F-C1, F-C2, F-P1, F-P2 — the static, genre-neutral prompt library with dismiss/rewrite. Highest value, no new mechanics.
- **Second increment:** F-P3 tension clocks, F-P4 stakes questions, F-W5 triad, F-R4 locking — the structured widgets and the differentiating mechanic.
- **Third increment:** F-R1–F-R3 oracles and sparks, F-C4 lifepath, and any gamification layer per §3.5 — the playful layer, only after the core library proves useful.

---

## 6. Out of scope

- AI-generated prompts, prose, or plot suggestions.
- Social/competitive features (leaderboards, public streaks).
- Reproducing any third-party question bank, game deck, or card text in-app (§7).

---

## 7. Licensing notes (binding constraint on content)

- **Never reproduce verbatim:** Wrede's questions (copyrighted, redistribution prohibited), the Weltenbau Wissen List (CC BY-NC-ND 4.0 — non-commercial, no derivatives), commercial game decks (Microscope, Quiet Year, TYOV, Story Engine, Deck of Worlds, Story Cubes, Oblique Strategies), Gotham Writers questionnaires.
- **Generally reusable with attribution (verify exact licence before shipping):** open SRD mechanics from Dungeon World, Ironsworn/Starforged, Blades in the Dark, Trophy, Traveller.
- All in-app prompt copy is original writing informed by these sources, consistent with the parent PRD's non-goal on proprietary teaching content and its [copyright risk row](./lit-technica-prd-v0.2.md) (§378).
