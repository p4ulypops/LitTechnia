# Lit Technica — Visual Reference & Media Sub-PRD

**Version:** v0.1 · **Date:** 2026-08-15 · **Status:** Captured, not yet reviewed or sequenced
**Parent:** [Lit Technica PRD v0.2](./lit-technica-prd-v0.2.md) — extends "Media attachments" (P0, §207–216) and "Optional AI organisation tools" (P1, §265–280)
**Author intent (verbatim brief):** capture the following idea as a PRD for later prioritisation; no design or build work is authorised by this document alone.

---

## 1. Origin and framing

The parent PRD's P0 media attachments let an author attach existing photos and audio to any character, place, plot thread, timeline event, or scene, and the P1 AI section restricts AI to opt-in, evidence-shown, author-approved organisation only (link suggestions, summaries) — explicitly never prose or unattributed generation.

This sub-PRD proposes a **visual reference layer** on top of that foundation: helping an author see their characters, places, and scenes, either by generating illustrative images/short video clips, or by uploading and lightly editing their own real photos and video, including linking real people the author knows to fictional characters. The stated purpose throughout is to **jog memory and inspiration**, not to canonise a "correct" appearance for a character — consistent with the parent PRD's non-goal that Lit Technica never dictates creative decisions.

## 2. Problem statement

Authors — especially first-time novelists per the primary persona — often think visually before or alongside thinking in prose: a character's face, a location's light, a scene's blocking. Lit Technica currently only stores media the author already has and already attached; it offers no way to generate a visual starting point, no lightweight way to adapt an uploaded photo to match a fictional detail, and no way to formally link a real person the author knows (a relative, friend, or photo subject) to a character as a visual/behavioural reference. Authors are left switching to external tools and copying results back in, which breaks the "portable story workshop" promise and loses provenance.

## 3. Goals

1. Let an author generate one or several reference images (and optionally a short video) for a character, place, or scene, from a prompt seeded by that item's existing fields (name, description, traits, setting notes).
2. Let an author generate multiple variations per element so they can pick, discard, or keep several as alternative interpretations rather than a single "final" portrait.
3. Encourage and make it easy to upload the author's own photos and videos (e.g. a family beach photo) as reference material, not only AI output.
4. Provide a basic in-app editor for uploaded (and generated) media: select a photo/video, make a small, targeted, non-destructive edit (e.g. "make this character's hair green"), and keep the original.
5. Let an author explicitly link a real person (an uploaded photo of a real individual, e.g. "cousin Jennifer") to a fictional character (e.g. "Rebecca") — and equivalently link real places/objects to fictional locations/items — as a durable visual/behavioural reference, distinct from and clearly labelled apart from the character's own in-fiction data.

## 4. Non-goals

- **Not a requirement to have any visual reference.** Every capability in this sub-PRD is optional; a character, place, or scene with zero images remains fully valid.
- **Not a canonical-appearance lock.** Generated or uploaded images are reference material the author can add, remove, regenerate, or ignore — never a system-enforced "true" depiction that constrains prose.
- **Not a general-purpose photo/video editor.** Scope is a small set of gentle, targeted edits (recolouring, simple region-limited changes, cropping, basic trim for video), not compositing, professional retouching, or a timeline-based video editor.
- **Not real-person likeness generation from a text prompt alone.** Depicting an identifiable real person is only ever done by editing a photo the author uploaded of that person (§6.5), never by generating a new image of a named real individual from description.
- **Not social or discovery-facing.** Uploaded photos of real people, and all generated media, remain private project data under the same no-account, local-first model as the rest of the manuscript, unless the author explicitly exports or shares.

## 5. Target users

Same personas as the parent PRD. This feature is expected to matter most to the primary persona (first-time novelist, often visually-minded) and to authors who already keep mood-board-style folders of real photos alongside their notes — a pattern the parent PRD's import work already anticipates for Markdown/text but not yet for media.

## 6. Functional requirements (draft — not yet sequenced into P0/P1/P2)

### 6.1 AI-generated images and short video per element

- Any Character, World entry (place/faction/object), or Scene card can request AI-generated reference images from an "Generate visual references" action.
- The generation prompt is composed from the item's existing structured fields (name, description, traits/rules, linked world entries) plus optional free-text the author adds for the request; the author can see and edit the exact prompt before it is sent.
- Support generating multiple images per request (e.g. 2–4 variations) so the author can compare interpretations side by side, keep any subset, and discard the rest.
- Support an equivalent short-video generation action (a few seconds, e.g. an establishing shot of a place or a simple character turnaround) as a later increment of the same capability, gated on provider support and cost.
- All generated media is attached using the same media-attachment model as the parent PRD (§207–216): stored as a file in the project's media folder with a stable relationship record, so it survives export/re-import like any other attachment.
- Generated media is tagged with its generation provenance (provider, model, prompt, timestamp) in project metadata, mirroring the parent PRD's provenance requirement for AI link suggestions (§272).

### 6.2 Provider connection

- Image/video generation is provided by a connected third-party model provider (e.g. OpenAI, or another provider reachable through the app's existing connector/credential model), never a bundled always-on default that runs without explicit author opt-in.
- Follows the same encrypted-credential and per-request-scope requirements the parent PRD already places on any cloud AI or third-party connector (§274, §420 open question) — this sub-PRD does not relax that constraint, it depends on it.
- The author can disconnect the provider at any time from the same Connections surface described in the Import/Export & Syndication spec; disconnecting deletes the stored credential, not merely hides it.
- No project text or image is sent to a provider except for an explicit, author-invoked generation or edit request naming the specific item.

### 6.3 Encouraging the author's own photos and video

- Every "generate visual reference" surface also offers an equally prominent "upload your own photo or video instead" action — generation is not presented as the default or superior path.
- Onboarding/empty-state copy for Characters, Worldbuilding, and Scene cards actively invites real photos as inspiration (the brief's own example: "add a photo of a real beach if this scene reminds you of one"), consistent with the parent PRD's "private by default" and authorial-ownership principles — real photos never leave the local project except on explicit export/share.
- Uploaded media follows the same original-file-preserved, derived-thumbnail-only model already specified for media attachments (§207–216).

### 6.4 Basic gentle-edit tool

- A lightweight in-app editor lets the author: select one uploaded or generated photo/video, apply a small number of targeted adjustments (recolour a specified region — e.g. hair colour — crop, rotate, basic trim for video, brightness/contrast), and save the result as a new derived version.
- Edits are non-destructive: the original upload or generation is always retained and remains one click away; the edited result is a separate derived attachment, not an overwrite.
- Edit requests that require generative fill (e.g. "make the hair green" when hair colour cannot be done as a simple region recolour) may route to the same connected AI provider as §6.1/§6.2 as an image-edit call, under the same consent and provenance rules — the tool must clearly indicate to the author when an edit will leave the device versus when it is processed locally.
- Scope is deliberately small for v1: this is not a general photo editor, and the requirements list should stay short rather than grow into a Photoshop-equivalent feature set.

### 6.5 Linking a real person, place, or object to a fictional entity

- An author can attach a "real-world reference" link from a Character to a real person's uploaded photo (or several), from a World entry to a real place's photo, and equivalently for objects — e.g. linking a photo of "cousin Jennifer" as the real-world reference for a character named "Rebecca."
- The real-world reference is a distinct, clearly labelled relationship — never merged into or presented as the character's own in-fiction fields — so exports, shares, and any future collaborator view can keep or strip real-person material independently of the fictional item's own data.
- The author can optionally record the real person's name/relationship (e.g. "cousin Jennifer") purely as a private local note for their own memory-jogging; this note is never required, never sent to any AI provider, and is excluded by default from any export or share package (opt-in only, with an explicit warning, if the author ever chooses to include it).
- Editing a real person's uploaded photo (§6.4) to adapt it toward a character (e.g. a hair-colour change) is allowed under the same consent framing as any other edit, since the author is editing their own uploaded material — but the tool must not offer to generate new, never-photographed depictions of a named real individual from a text prompt (see Non-goals §4).

## 7. Acceptance criteria (draft)

- Given a character with a description, when the author requests generated visual references, then they see the exact prompt before submission and can edit it, and the app returns multiple images the author can individually keep or discard.
- Given no AI provider is connected, when the author opens any "generate visual reference" action, then the app offers to connect a provider and separately, equally prominently, offers to upload the author's own photo/video instead.
- Given an uploaded photo, when the author applies a gentle edit (e.g. hair recolour) and saves it, then the original upload remains available unchanged and the edited result appears as a separate, clearly derived attachment.
- Given a character and a real person's uploaded photo, when the author creates a real-world reference link, then the character's own fictional fields are unchanged, the link is visually distinct in the UI, and the linked photo and any relationship note are excluded from export/share by default.
- Given an author disconnects the AI provider, then its stored credential is deleted and no further generation or AI-based edit requests can be made until reconnected.
- Given any generated image or AI-assisted edit, when the author inspects its attachment details, then they can see which provider and model produced it and when.

## 8. Risks and open questions

| Risk / question | Why it matters | Status |
|---|---|---|
| Real-person photo handling (consent, third-party subjects who never consented to Lit Technica, sensitive imagery of minors) | The author may upload photos of other real people (a cousin, a friend) who have not consented to the app processing their likeness, especially if any edit call leaves the device | **Blocking** — needs a privacy/consent design pass before §6.5/§6.4 ship any provider-side edit path |
| Which provider(s) and which credential/consent model | Must reuse, not duplicate, the parent PRD's still-open "AI execution location" and encrypted-credential decisions (§274, §420) | **Blocking**, shared with parent PRD |
| Cost and rate limits of image/video generation | Multi-variation generation and video are materially more expensive than the text-only AI already scoped in P1 | Open — needs a cost model before promising "multiple images per request" as default behaviour |
| Scope creep of the "basic editor" | Photo/video editing has essentially unbounded scope; the brief explicitly asks for "very basic," "very gentle" | Mitigate by keeping the v1 edit list short (§6.4) and treating anything beyond it as a later increment or explicitly out of scope |
| Interaction with "no AI ghostwriting" positioning | The parent PRD is careful that AI never substitutes authorship of prose; image generation is a different medium but the same "assistance, not replacement" framing should extend to visuals | Resolve when this sub-PRD is reviewed against parent PRD principles |
| Export/portability of generated and real-reference media | The parent PRD's round-trip export test currently covers manuscript, links, and existing media; generated images, video, and real-person links need the same guarantee, plus the real-person default-exclusion rule in §6.5 | Open — define before this ships alongside the export contract |

## 9. Status

This document only **captures** the feature idea as described by the author, for later prioritisation alongside other incoming PRDs. It has not been sequenced into the parent PRD's P0/P1/P2 delivery plan, has not been reviewed against the encrypted-credential and AI-consent blockers it depends on, and no build work is authorised by this capture.
