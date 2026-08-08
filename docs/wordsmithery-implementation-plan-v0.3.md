# Wordsmithery implementation plan v0.3 — passwordless accounts and per-author isolation

Status: implemented and locally validated on 8 August 2026. Not pushed; awaiting
independent review.

Predecessors: [`wordsmithery-prd-v0.1.md`](wordsmithery-prd-v0.1.md),
[`wordsmithery-implementation-plan-v0.2.md`](wordsmithery-implementation-plan-v0.2.md).
Companion documents: [`wordsmithery-security-notes.md`](wordsmithery-security-notes.md)
(threat model and runbook) and [`wordsmithery-vps-deployment.md`](wordsmithery-vps-deployment.md)
(required server values).

---

## 1. Problem this milestone solves

v0.2 was a single-tenant, memory-only prototype. Anybody who could reach the URL
could read and edit the same books, and a restart erased everything. That is
unsafe to put on `littechnia.com`, and it is the opposite of the product promise
that an author's work is their own.

v0.3 turns the prototype into something that can be exposed publicly:

1. real accounts with no passwords at all;
2. real persistence, so an account's books survive a restart;
3. authorisation on every data path, so one account can never see another's work.

Constraints kept from v0.1/v0.2, unchanged: **Wordsmithery never generates
prose, scenes, dialogue or endings.** No AI surfaces. Calm, literary, precise.
Planners and discovery writers treated as equals. Hash routing. TanStack Query
with `apiRequest`. No generated imagery. No localStorage, sessionStorage or
IndexedDB — the session cookie is the single, deliberate exception, and it is
documented as such in the UI.

---

## 2. Decisions

### 2.1 Passwordless only

Passkeys lead; an emailed single-use link is the fallback for a new device or a
browser without an authenticator. There is no password field, no password reset
and no Basic Auth anywhere in the codebase. This was the user's explicit
instruction and it also removes the largest class of credential risk.

### 2.2 `@simplewebauthn/server` + a hand-written session table, not Better Auth

The brief allowed either. Chosen: SimpleWebAuthn v13 plus a small session table.

*Why:* this repository has one hand-written Drizzle schema file, no migration CLI
in the deploy path, Express 5 and zod 4. Better Auth wants to own its own schema
and would add a migration step on the VPS and a second source of truth for
tables. SimpleWebAuthn is a focused, well-maintained WebAuthn implementation and
leaves the schema, the cookie and the SQL in one place that a reviewer can read
end to end.

*Cost, stated plainly:* session management, magic-link issuance and rate limiting
are our code, so they are ours to review and maintain. Better Auth would have
brought those for free. This is a trade-off, not a claim that Better Auth is
unsuitable.

### 2.3 SQLite as the real store

`better-sqlite3` with Drizzle, one file at `DATABASE_PATH`, WAL enabled, tables
created at boot with `CREATE TABLE IF NOT EXISTS` so there is no deploy-time
migration tool. `MemoryStorage` is gone; `SqliteStorage` replaces it behind the
same `IStorage` shape, with an owner id added as the first argument of every
method.

### 2.4 Demo content moved behind a development switch

The three sample books were the v0.2 "the app is never empty" answer. They are
now owned by a demo account that exists only when `WORDSMITHERY_DEMO_SEED=true`,
which the server refuses to accept in production. A real new account starts empty
and is met with a create-or-import welcome screen instead of somebody else's
manuscript.

---

## 3. Data model additions (`shared/schema.ts`)

| Table | Columns | Notes |
| --- | --- | --- |
| `users` | `id`, `email` (unique, lower-cased), `display_name`, `created_at`, `last_login_at`, `is_demo` | `is_demo` gates the demo-only reset route. |
| `sessions` | `id` (SHA-256 of the token), `user_id`, `created_at`, `expires_at`, `user_agent` | The raw token is never stored, so a database reader cannot replay it. |
| `passkeys` | `id` (credential id), `user_id`, `label`, `public_key`, `counter`, `device_type`, `backed_up`, `transports`, `created_at`, `last_used_at` | Public keys only. |
| `magic_links` | `id`, `token_hash`, `email`, `expires_at`, `created_at`, `consumed_at` | Single use; older unused rows for an address are deleted when a new link is issued. |
| `webauthn_challenges` | `id`, `challenge`, `kind`, `user_id`, `expires_at` | Server-side, single use, five-minute TTL. |
| `projects` | **+ `owner_id`** | Every existing project column is unchanged. |

Also added: `PublicUser`, `SessionResponse`, `emailRequestSchema`,
`passkeyLabelSchema`, `challengeIdSchema`. The export envelope versions stay
`wordsmithery-project/0.2` and `wordsmithery-library/0.2` — the file format did
not change, so the version must not either.

---

## 4. API surface

Open: `GET /api/health`, `GET /api/auth/session`, `POST /api/auth/sign-out`,
`POST /api/auth/magic-link/request`, `GET /api/auth/magic-link/callback`,
`POST /api/auth/passkey/authenticate/options|verify`.

Session required: `POST /api/auth/passkey/register/options|verify`,
`GET /api/auth/passkeys`, `DELETE /api/auth/passkeys/:id`, and **everything**
under `/api/projects` and `/api/library`.

Development only (absent in production; the route table answers
`404 {"error":"Unknown endpoint"}`): `POST /api/auth/dev/demo-sign-in`,
`GET /api/dev/config`. `POST /api/reset` exists in all modes but returns `403`
unless the session belongs to the demo account.

Behavioural details that matter:

- `POST /api/auth/magic-link/request` always answers `202` with the same neutral
  wording, so the endpoint cannot be used to test whether an address has an
  account. `devLink` is included only when `DEV_ECHO_MAGIC_LINK=true`.
- `GET /api/auth/magic-link/callback` redirects to `/#/passkey-setup` when the
  account has no passkey, otherwise `/#/`; a dead or reused token redirects to
  `/#/sign-in?error=link-expired`.
- A request for another owner's project id returns `404`, never `403`, so
  project ids are not confirmed to strangers.
- `DELETE /api/auth/passkeys/:id` refuses to remove the last passkey.
- Unauthenticated data calls return `401 {"error":"Sign in to continue","signIn":"/#/sign-in"}`.
- `checkOrigin` rejects state-changing `/api` requests from unlisted origins with
  `403`. The API request logger no longer records `/api/auth` bodies.

---

## 5. Client changes

- `client/src/lib/auth.tsx` — session context over `GET /api/auth/session`. It
  holds no authority: the gate only decides what to render, and every protected
  call is re-checked server-side. On sign-in and sign-out it drops every cached
  query except the session query itself, so no record from the previous account
  can survive in the cache.
- `client/src/pages/sign-in.tsx` — passkey button first, email link underneath,
  a labelled development-demo panel when the server reports `demoEnabled`, and
  the `link-expired` message. `data-testid`: `page-sign-in`,
  `button-signin-passkey`, `form-magiclink`, `input-signin-email`,
  `button-signin-magiclink`, `panel-magiclink-sent`, `link-dev-magiclink`,
  `text-auth-error`, `panel-dev-demo`, `button-dev-demo-signin`.
- `client/src/pages/account.tsx` — identity, sign out, passkey list with
  created/last-used dates and per-row removal, and a naming form. Rendered with
  `prompt` at `/#/passkey-setup` as the post-link step. `data-testid`:
  `page-account`, `text-account-email`, `button-account-signout`,
  `list-passkeys`, `input-passkey-label`, `button-add-passkey`,
  `text-passkey-error`, `text-passkey-done`, `button-skip-passkey`.
- `App.tsx` — `AuthProvider` wraps a single `AuthGate`: loading state, then
  either the sign-in page with no app shell, or the shell and routes. New routes
  `/account` and `/passkey-setup`.
- `components/shell.tsx` — the header's "Local session · nothing uploaded" pill
  becomes the signed-in address (`text-signed-in-email`, icon-only below `md`)
  plus `button-sign-out`; Account is in the sidebar; the book switcher says "No
  books yet" instead of implying a stuck load.
- `pages/home.tsx` — a `FirstRun` welcome screen (`status-no-books`) for an empty
  library, and the demo reset button now appears only for the demo account.
- `pages/library.tsx` — a distinct empty state for a genuinely new library, and
  the "Honest limits" panel rewritten: books persist, belong to one account, and
  the browser stores only the session cookie. It no longer claims memory-only
  storage or that there are no accounts.

---

## 6. Acceptance results

Environment: local sandbox. `npm run check` clean, `npm run build` clean
(measured this run: JS 778,916 B raw / 219,564 B gzip; CSS 89,296 B raw /
14,244 B gzip; server bundle 1,281,498 B). Development server run with
`WORDSMITHERY_DEMO_SEED=true DEV_ECHO_MAGIC_LINK=true`; production server run
from `dist/index.cjs` with placeholder configuration on port 5051.

| # | Case | Method | Result |
| --- | --- | --- | --- |
| 1 | Production refuses to start without required values | `NODE_ENV=production node dist/index.cjs` | pass — names `APP_URL`, `PASSKEY_RP_ID`, `RESEND_API_KEY`, `EMAIL_FROM`, the https rule, exit 1 |
| 2 | Production refuses development switches | same, with `WORDSMITHERY_DEMO_SEED=true` | pass — "must not be set in production", exit 1 |
| 3 | Unauthenticated data call | `GET /api/projects` | pass — `401` with `signIn` hint |
| 4 | Health endpoint stays open | `GET /api/health` | pass — `200`, reports `demoEnabled` |
| 5 | Sign-in page renders with no shell | desktop 1440×900 | pass — screenshot `wordsmithery-qa-v03-signin-desktop.jpg` |
| 6 | Sign-in page on mobile | 390×844, light and dark | pass — `…-signin-mobile.jpg`, `…-signin-mobile-dark.jpg` |
| 7 | Magic link request is neutral | UI + API | pass — `202`, same wording, no enumeration |
| 8 | Magic link signs in and lands on passkey naming | click dev link | pass — redirect to `/#/passkey-setup`, header shows the address |
| 9 | Link is single use | replay the same URL | pass — `302` to `/#/sign-in?error=link-expired`, error shown (`…-signin-error-mobile.jpg`) |
| 10 | Passkey registration | Chromium virtual authenticator via CDP | pass — "Passkey saved", one row listed |
| 11 | Passkey sign-in after sign-out | UI | pass — signed back in with no email step |
| 12 | Sign-out clears the session | header control | pass — sign-in page returns, `GET /api/projects` → `401` |
| 13 | Last passkey cannot be removed | UI | pass — "Keep at least one passkey…" |
| 14 | New account sees no seeded books | second account by magic link | pass — welcome screen (`…-firstrun-desktop.jpg`), `GET /api/projects` → `{"projects":[]}` |
| 15 | New account can create a book | library form | pass — 1 book on the shelf, counts all zero |
| 16 | Cross-account read is blocked | new account, demo project id | pass — `404` |
| 17 | Cross-account import is blocked | same | pass — `404`, nothing appears in the demo book |
| 18 | Demo reset is demo-only | `POST /api/reset` as a real account | pass — `403` |
| 19 | Owner import still works | `POST /api/projects/:id/import` | pass — `201`, note created |
| 20 | Rate limit per address | 5 requests for one address | pass — 5th is `429`, neutral message |
| 21 | Rate limit per IP | further requests, varied addresses | pass — `429` with `retryAfter` |
| 22 | Foreign origin on a mutation | `Origin: https://evil.test` | pass — `403` |
| 23 | Session cookie flags | response header | pass locally — `HttpOnly; SameSite=Lax; Path=/; Expires=+30d`. `Secure` is set from `NODE_ENV=production` in code and must be confirmed on the live https host |
| 24 | Production build hides the demo path | prod server, browser + curl | pass — no demo panel; `dev/demo-sign-in` and `dev/config` → `404 {"error":"Unknown endpoint"}` |
| 25 | Passkey on a wrong host fails kindly | dev on `127.0.0.1:5000` with RP `localhost`, and prod build on `localhost:5051` with RP `littechnia.com`, desktop and mobile | pass — session reports `passkeyAvailableHere:false`, the page leads with the email link, the options endpoint returns `400`, and the alert reads "Passkeys are not available on this address. Use the email link, or open Wordsmithery on its proper https:// address." No browser text reaches the UI |
| 25a | Host matching is not a substring test | `Origin: https://www.littechnia.com` vs `https://notlittechnia.com` | pass — `true` and `false` respectively |
| 25b | Unknown ceremony failure falls back calmly | no authenticator present on a valid host | pass — "Passkeys did not work in this browser. Use the email link instead." |
| 25c | Technical detail is logged server-side only | server log after a refused ceremony | pass — one `[auth] passkey ceremony refused: host "127.0.0.1" … PASSKEY_RP_ID "localhost"` line per host, nothing equivalent on screen |
| 26 | Mobile drawer and nav still work | 390×844 | pass — drawer opens fully, Account reachable, sign-out works |
| 27 | Multi-book and import features preserved | switcher, library, import, snapshots | pass — library snapshot 26,204 B for the demo account this run |
| 28 | No AI surface introduced | code and copy review | pass — no generation anywhere; footer and sidebar still say so |

Not tested here, by necessity: real Resend delivery, a real platform
authenticator on `https://littechnia.com`, `Secure` in a live browser, and
proxy-level rate limiting.

---

## 7. Risks and honest limits

1. **No encryption at rest.** The SQLite file is plain text on disk. Anyone with
   the file or a backup can read every manuscript. Restrict permissions, encrypt
   the volume, encrypt backups.
2. **In-process rate limiting.** A `Map` in one Node process; it resets on
   restart and does not span instances. Add proxy limits before any real traffic.
3. **Email is the recovery path, and there is no other.** A compromised mailbox
   is a full account compromise; losing the mailbox and the passkey is
   unrecoverable. Deliberate, but it must be said in the product copy before real
   authors arrive.
4. **RP ID is load-bearing.** Changing the domain invalidates every passkey.
5. **Local-first is still not delivered.** Books live in the server's database,
   not in a folder the author owns. Exports remain the escape hatch. No sync, no
   offline, no client-side encryption — v0.3 does not claim otherwise and the UI
   copy was corrected to stop claiming memory-only privacy.
6. **Bundle size** is now 778,916 B raw / 219,564 B gzip. Code-splitting is still
   deferred.
7. **Single-tenant blast radius.** One process, one database file, application
   -level isolation. Adequate for a small trusted deployment; not a multi-tenant
   security boundary.
8. **No audit trail.** Only `last_used_at` on passkeys. Add sign-in logging if
   accounts become plural and shared.

---

## 8. What v0.4 should take next

1. Portable local-first storage: one folder per book on the author's own disk,
   plus import of Wordsmithery's own JSON snapshots (already exported, not yet
   readable back).
2. Session management UI: list and revoke active sessions per device.
3. Durable rate limiting and structured auth logging.
4. Encryption at rest, or an explicit statement in-product that it is absent.
5. Code-splitting the client bundle.
6. `.docx` import, and DOCX/EPUB export.
