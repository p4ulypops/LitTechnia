# Baseline UI/UX audit

Status: implementation plan; source review only. It is not yet a pass/fail accessibility assessment or visual QA result.

## Existing strengths

- The product already has a clear editorial workshop language: serif/prose typography, paper panels, restrained motion, light/dark tokens and a defined focus treatment.
- The workspace shell groups navigation by writer intent and exposes the open-book switcher in both header and sidebar.
- The manuscript provides document, card and binder representations of the same scene data, with labelled arrow controls for reordering.
- Empty and first-run states are unusually honest and product-specific.
- The UI uses native buttons, labels, form hints, Radix primitives, role=status/alert in several places, and a reduced-motion override.

## Priority 0 — confidence and recovery

1. Add durable save-state feedback
   - A writer needs to know whether their last edit is saving, saved, or failed. The current action layer exposes a single pending boolean but no shared success/error status.
   - Introduce an aria-live status region and visible, non-disruptive save feedback for field saves and structural changes.
2. Protect destructive actions
   - Scene, entity, checklist and archive actions currently execute immediately. Add an accessible confirmation dialog with the entity title, consequence, cancel as the initial focus, and a destructive final action.
3. Add a skip-to-content link
   - The shell has `main#main`, which is the correct target. Add a keyboard-visible skip link before repeated navigation.

## Priority 1 — accessible systemisation

1. Make selected state semantic and consistent
   - Retain visible selection in lists and representations; use the interaction pattern appropriate to the control rather than relying only on colour or `aria-current`.
2. Standardise async controls
   - Disable only the action in progress when safe, preserve the button label or give it an explicit saving state, and expose server errors close to the initiating control.
3. Add responsive density rules
   - Verify that the manuscript split view, field grids, sidebar/header, and card actions remain readable at narrow width, 200% zoom and text enlargement.

## Priority 2 — visual refinement

1. Establish component state samples: default, hover, focus-visible, active, disabled, pending, error and success.
2. Tune the manuscript scene list and editor as the visual centre of gravity; the selected scene should remain obvious without a heavy panel treatment.
3. Ensure controls with compact icon sizing meet the chosen pointer-target baseline or are adequately spaced.

## Implementation order

1. Foundation: skip link, live status primitive, confirmation dialog primitive, action-state model.
2. Manuscript: safe delete, explicit save status, mobile composition, view-state semantics.
3. Shared entity workspace and Library: reuse safe-delete/archive and async feedback patterns.
4. Home, timeline, import/export, account: apply the system and close page-specific gaps.
5. Automated checks plus manual keyboard, screen-reader, contrast, zoom, mobile, dark-mode and visual evidence pass.

## Specialist verdict

- Accessibility reviewer: do foundation work before visual embellishment; W3C requires all functionality to work by keyboard and a focus indicator to remain visible.
- Information architecture reviewer: the content model is strong; reinforce orientation through clear save status and safe recovery rather than adding navigation.
- Visual systems reviewer: protect the existing restrained, editorial direction; improve hierarchy and feedback, not decoration.
- Interaction reviewer: immediate destructive writes and invisible save completion are the highest trust risks in an authoring product.
- Main critic: agreed. Begin with shared primitives because they improve every route and reduce duplicate code.
