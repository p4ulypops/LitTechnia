# Component states

Documents the states every interactive primitive in the accessibility/trust
foundation must support, per the [award-ready delivery
contract](./award-ready-delivery-contract.md)'s component acceptance
checklist ("states intentional... accessible name matches... stable test
selector"). This is a reference for reviewers, not new product copy.

## `ConfirmDialog` (`client/src/components/confirm-dialog.tsx`)

Gate in front of every action that destroys or materially changes an
author's material (scene delete, character/plot/timeline/world/research
delete, checklist item delete, book archive).

| State | Trigger | What the author sees | Test selector |
| --- | --- | --- | --- |
| default | trigger button rendered, dialog closed | the normal control (e.g. a trash icon button) | `button-delete-{kind}` / `button-archive-{id}` etc. (per call site) |
| hover / focus-visible | pointer hover or keyboard focus on the trigger | inherited from `Button`'s `hover-elevate` / focus ring — no custom styling here | same as default |
| open | trigger activated | modal dialog: title, plain-language description of what is lost, Cancel + confirm action | `dialog-confirm-{testId}` |
| pending | confirm action clicked | confirm button shows a spinner and a "-ing" label (e.g. "Deleting…"), both buttons disabled, dialog cannot be dismissed (`onOpenChange` is a no-op while pending) so a background click can't hide an in-flight write | `button-confirm-{testId}` (disabled) |
| success | the awaited action resolves | dialog closes; the underlying list/detail view re-renders without the removed item, via the normal snapshot invalidation | n/a — dialog unmounts |
| error | the awaited action rejects | dialog **stays open**, an inline message with `role="alert"` appears above the footer showing the real error text, both buttons re-enable so the author can retry or back out | `status-error-confirm-{testId}` |
| destructive tone | `tone="destructive"` (default) | confirm button uses the `destructive` button variant (red) | — |
| neutral tone | `tone="neutral"` (used for archive, which is reversible) | confirm button keeps the default button colour — still a pause, not an alarm | — |

Accessible name: dialog title is the accessible name (Radix `AlertDialogTitle`
is wired to `aria-labelledby` automatically); the description is
`aria-describedby`. No decorative motion beyond the existing `alert-dialog`
open/close transition, which already respects `prefers-reduced-motion` via
the app-wide override in `client/src/index.css`.

## `useSaveStatus` / `SaveStatusText` (`client/src/components/save-status.tsx`)

Drop-in status tracking for any async write (currently wired into `Field`;
reusable for future controls).

| State | Meaning | Visible text | Live region | Test selector |
| --- | --- | --- | --- | --- |
| idle | nothing pending, nothing to announce | nothing rendered | none | n/a |
| saving | write in flight | spinner + "Saving…" | `role="status" aria-live="polite"` | `status-saving-{testId}` |
| saved | write resolved | check icon + "saved" (or a caller-supplied label) | `role="status" aria-live="polite"`, auto-reverts to idle after ~1.8s | `status-saved-{testId}` |
| error | write rejected | warning icon + the real error message + an inline "Try again" control that re-runs the same save | `role="alert"` (implicitly assertive) — read immediately, does not auto-dismiss | `status-error-{testId}` |

The `error` state is the one durable state: it does not time out, because an
unresolved failure should stay visible until the author acts (retries, or
edits again — editing clears it back to idle by design, since typing a new
value is itself the "I'm handling this" signal via `Field`'s next commit).

## `Field` (`client/src/components/fields.tsx`)

A labelled text/textarea input that saves on blur or Cmd/Ctrl+Enter. States
are the union of the input's own states and `useSaveStatus`'s:

default → hover (native input hover) → focus-visible (native input focus
ring) → active (typing, local `draft` state diverges from `value`) → pending
(`saving`, shown next to the label) → success (`saved`, shown next to the
label) → error (shown next to the label, with retry) → disabled (not
currently used by any caller, but the underlying `<Input>`/`<Textarea>`
support the native `disabled` attribute unchanged).

Accessible name comes from the associated `<Label htmlFor>`. Empty state is
simply an empty string value — every caller supplies a `placeholder` where an
empty field would otherwise be ambiguous.

## Skip-to-content link (`client/src/App.tsx`)

Already implemented at the root of the authenticated app shell — documented
here because the [baseline audit](./baseline-audit.md) listed it as a gap
that turned out to already be closed:

| State | Test selector |
| --- | --- |
| default (visually hidden) | `button-skip-to-content` |
| focus-visible (revealed, positioned top-left, keyboard-reachable before the sidebar) | same selector |
| activated | moves focus to `#main` (`tabindex="-1"` set programmatically) and scrolls it into view |

It is a `<button>`, not an `<a href="#main">`, because the app uses hash-based
routing (`wouter/use-hash-location`); an anchor would be interpreted as a
route change instead of an in-page jump.
