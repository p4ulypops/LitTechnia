# Award-ready UI/UX delivery contract

## Purpose

Bring Wordsmithery's author workshop experience to a demonstrably excellent, accessible, and coherent release standard without turning it into a prose-generating product.

## Product intent

- The product is an author's workshop: it helps a writer see, organise, and revise their own work.
- The manuscript is the primary task; navigation, story material, research, import/export, and account controls support it.
- The interface should feel editorial and calm, never ornamental at the expense of speed, contrast, or comprehension.

## Lean review crew

The delivery lead owns scope, makes trade-offs, and adjudicates disagreements. Every change is reviewed by these bounded specialist passes before it is considered done.

1. Accessibility reviewer
   - Target: WCAG 2.2 AA baseline.
   - Checks keyboard-only flow, visible focus, semantic controls, screen-reader names, target size, contrast, reduced motion, error messaging, and responsive reflow.
2. Information-architecture reviewer
   - Checks that writers can orient themselves, switch book, find the next meaningful action, and recover from mistakes without guessing.
3. Visual-systems reviewer
   - Protects the editorial design language: typographic hierarchy, spacing scale, states, colour tokens, density, dark mode, and mobile composition.
4. Interaction and writing-workflow reviewer
   - Checks autosave feedback, unsaved/error states, destructive actions, empty/loading states, scene selection, view switching, reordering, and Draft Zero flow.
5. Main critic
   - Challenges each proposal against user benefit, implementation risk, component reuse, and the product's non-ghostwriter promise. A change passes only when the specialist and main critic agree, or the decision and rationale are recorded.

## Work sequence

1. Baseline
   - Inventory routes, reusable primitives, responsive breakpoints, state feedback, and keyboard paths.
   - Run type-check/build and capture current screenshots at desktop and mobile widths.
2. Foundation
   - Make tokens and shared primitives reliable before page-level polish: focus, typography, spacing, status feedback, form behaviour, empty/loading/error states, and motion.
3. Core journey
   - Perfect the route from choosing a book to opening, creating, editing, saving, organising, and safely deleting a scene.
4. Supporting journeys
   - Apply the same system to Library, characters, plot, timeline, worldbuilding, research, import, export, and account.
5. Release gate
   - Re-run the QA matrix, inspect mobile and dark mode, capture final evidence, and create a reviewable pull request. Deployment is a separate approval after the release evidence is accepted.

## Component acceptance contract

A component can be marked award-ready only when all checks apply:

- It has one clear job and a recognisable primary action.
- Default, hover, focus-visible, active, disabled, loading, empty, error, and success states are intentional where relevant.
- It works with pointer, keyboard, zoom, narrow viewport, and dark mode.
- Its accessible name, role, state, and instructions match the visible interface.
- It adds no decorative motion without a reduced-motion equivalent.
- Its appearance comes from shared tokens or a documented exception.
- It has a stable test selector where the existing project convention calls for one.

## QA evidence gate

Do not claim 90% readiness until the following are complete:

- `npm run check` passes.
- `npm run build` passes.
- Keyboard path tested: skip/main entry, sidebar, book switcher, manuscript view switcher, scene selection, editor fields, optional scene-card disclosure, reorder controls, Draft Zero, and delete confirmation.
- Screen-reader names checked for icon-only controls and selected states.
- Desktop, tablet, and narrow-mobile layouts inspected in light and dark themes.
- Contrast and focus appearance checked against the chosen WCAG 2.2 AA baseline.
- One destructive-action recovery or confirmation path tested.
- Screenshots captured for a visual QA pack.

## Commit cadence

Commit only at reviewable boundaries to conserve agent and review bandwidth:

- Foundation and accessibility primitives.
- Manuscript core journey.
- Supporting-page systemisation.
- Tests, QA evidence, and release notes.

Each commit message states the user-facing outcome. Avoid noisy cosmetic-only commits.

## Screenshot request

The phrase "photo of QAs" is treated as a request for a visual QA pack: annotated screenshots showing the tested states and viewports. The pack is produced after the 90% readiness gate, from a running build or staging URL.
