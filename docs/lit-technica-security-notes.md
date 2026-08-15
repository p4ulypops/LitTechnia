# Lit Technica security notes and runbook (v0.3)

Scope: the passwordless authentication foundation added in v0.3. Written for the
person who operates the VPS. It states what the code actually does, what is
verified, and what is not yet true.

---

## 1. Design in one page

| Concern | Decision |
| --- | --- |
| Passwords | None. There is no password field, no password reset and no Basic Auth anywhere. |
| Primary sign-in | WebAuthn passkey, verified server-side with `@simplewebauthn/server` v13. |
| Fallback sign-in | Single-use magic link emailed through Resend, valid `MAGIC_LINK_TTL_MINUTES` (default 15). |
| Session | Opaque 32-byte random token in an `httpOnly` cookie. Only its SHA-256 hash is stored. |
| Store | SQLite (`better-sqlite3` + Drizzle). Accounts, sessions, passkeys, magic-link hashes, challenges and every book live in one file. |
| Authorisation | Every `/api/projects` and `/api/library` route requires a session, and every storage call is scoped by the session's user id. |
| Owner ids | Always taken from the server session. A client-supplied owner id is never read. |

### Why SimpleWebAuthn rather than Better Auth

Better Auth was the brief's first suggestion and is a reasonable choice. It was
not adopted here because this repository has a single hand-written Drizzle schema
file, no migration CLI in the deploy path, Express 5 and zod 4 — Better Auth
would have introduced its own schema ownership and a migration step on the VPS.
`@simplewebauthn/server` plus a small session table keeps one schema, one
build artefact and no deploy-time database tooling. This is a trade-off, not a
claim that Better Auth is broken: the cost is that session, rate-limit and
magic-link code is ours to maintain and review.

---

## 2. Threat-model notes

**What this protects against**

- Unauthenticated reading or writing of anybody's books. Every data route is
  behind `requireAuth`; unauthenticated calls get `401 {"error":"Sign in to continue"}`.
- Cross-account access. `SqliteStorage` takes `ownerId` as its first argument on
  every read and write, and `owns()` is checked before a snapshot, patch, import
  or delete resolves. A request for another owner's book id returns `404`, not `403`,
  so ids are not confirmed.
- Credential theft from the database. Passkeys store only public keys and
  counters. Sessions and magic links store only SHA-256 hashes, so a database
  reader cannot replay a token from the row alone.
- Replay of a magic link. Tokens are single-use, deleted on consumption, and any
  older unused token for the same address is deleted when a new one is issued.
- WebAuthn ceremony tampering. Challenges are generated and stored server-side
  with a five-minute TTL, single use, and verification checks the challenge,
  the origin against `env.origins` and the RP ID against `PASSKEY_RP_ID`.
- Simple cross-site request forgery. The session cookie is `SameSite=Lax`, and
  `checkOrigin` rejects any state-changing `/api` request whose `Origin` is not
  a configured origin (`403`).
- Email enumeration. `POST /api/auth/magic-link/request` always answers `202`
  with the same neutral message whether or not the address has an account.

**What it does not protect against, and you should know**

- **Email account compromise.** A magic link in a compromised mailbox is a full
  sign-in. This is inherent to the fallback; encourage passkeys.
- **In-process rate limiting.** The limiter is a `Map` in the Node process. It
  resets on restart and does not coordinate across multiple instances. Put real
  limits in the reverse proxy if you scale out or expect abuse.
- **No encryption at rest.** The SQLite file is plain. Anyone with the file, or a
  backup of it, can read every book. Disk-level encryption and restricted file
  permissions are your responsibility.
- **No email verification beyond possession.** Clicking the link is the proof.
- **No account recovery.** Losing both the passkey and the mailbox means losing
  access. There is no support back door, by design.
- **No audit log.** Sign-ins are not recorded beyond `lastUsedAt` on a passkey.
- **Single-tenant trust.** Every account on the instance shares one database
  file and one process; isolation is enforced in application code, not by the
  database.

---

## 3. Required production configuration

The process **exits 1** at startup and prints the offending names when any of
these is missing under `NODE_ENV=production`:

- `APP_URL` — must start with `https://`
- `PASSKEY_RP_ID`
- `RESEND_API_KEY`
- `EMAIL_FROM`

It also exits if `DEV_ECHO_MAGIC_LINK` or `LIT_TECHNICA_DEMO_SEED` is set in
production, so the development conveniences cannot be switched on by accident.

Verified locally:

```
$ NODE_ENV=production node dist/index.cjs
Lit Technica cannot start: invalid configuration.
  - APP_URL
  - PASSKEY_RP_ID
  - RESEND_API_KEY
  - EMAIL_FROM
  - APP_URL must be an https:// URL in production
See .env.example and docs/lit-technica-vps-deployment.md.
(exit 1)

$ NODE_ENV=production LIT_TECHNICA_DEMO_SEED=true ... node dist/index.cjs
Lit Technica cannot start: invalid configuration.
  - LIT_TECHNICA_DEMO_SEED must not be set in production
(exit 1)
```

See `lit-technica-app/.env.example` for every value with commentary.

---

## 3a. Wrong-address passkey handling

WebAuthn only runs when the page hostname equals `PASSKEY_RP_ID` or is a
subdomain of it. Reaching the same server by another name — `127.0.0.1` instead
of `localhost`, a LAN IP, a tunnel host, an IP-based production visit — makes the
*browser* throw, and its text names infrastructure the author cannot act on
("127.0.0.1 is an invalid domain"). Three layers now prevent that reaching the
screen:

1. **Advertised.** `publicAuthConfig(hostname)` returns
   `passkeyAvailableHere`, computed per request from the `Origin` header (falling
   back to `Host`) against `env.rpId`. Exact match or subdomain only, so
   `notlittechnia.com` is rejected while `www.littechnia.com` is accepted. The
   sign-in page then leads with the email link and explains why.
2. **Enforced.** `requirePasskeyHost` guards both passkey *options* endpoints and
   answers `400 {"error":"Passkeys are not available on this address…","reason":"passkey-wrong-address"}`.
   A client that ignores the hint still gets a usable message, and no challenge
   is minted for a ceremony that cannot succeed.
3. **Normalised.** `passkeyErrorMessage()` in `client/src/lib/auth.tsx` translates
   by exception *name* and maps everything unrecognised to
   "Passkeys did not work in this browser. Use the email link instead." Raw
   browser text is never rendered.

The technical detail is kept where an operator will find it — the server logs, once
per offending host:

```
[auth] passkey ceremony refused: host "127.0.0.1" does not match PASSKEY_RP_ID
"localhost". WebAuthn would fail in the browser. Open the app on
http://localhost:5000 or set PASSKEY_RP_ID to match the address in use.
```

If authors report this message on the real site, check that they are reaching
`https://littechnia.com` (not an IP, not a bare `www` variant missing from DNS)
and that `PASSKEY_RP_ID` matches the domain they actually use.

## 4. Runbook

### First deployment of v0.3

1. Create the database directory and lock it down:
   ```bash
   sudo -u lit-technica mkdir -p /opt/lit-technica/data
   sudo chmod 700 /opt/lit-technica/data
   ```
2. Write `/opt/lit-technica/.env` from `.env.example`, `chmod 600` it, owned by
   the service user. Set `DATABASE_PATH=/opt/lit-technica/data/lit-technica.db`.
3. Verify DNS and TLS for `littechnia.com` first. Passkeys require a real
   `https://` origin whose host matches `PASSKEY_RP_ID` exactly.
4. Deploy, then `sudo systemctl restart lit-technica` and confirm:
   ```bash
   curl -s https://littechnia.com/api/health
   # {"status":"ok","auth":{"magicLinkEnabled":true,"passkeyEnabled":true,"demoEnabled":false}}
   ```
   `demoEnabled` must be `false`. If it is `true`, a development switch reached
   production — stop and fix `.env`.
5. Create the first real account: open the site, request an email link, click it,
   then name and create a passkey on the page you land on.
6. Confirm the cookie on the live site has `Secure`, `HttpOnly` and
   `SameSite=Lax` (browser dev tools → Application → Cookies). `Secure` cannot
   be observed over plain http locally; it is set from `NODE_ENV=production` in
   `server/auth/session.ts`.

### Rotating the Resend key

1. Create the new key in Resend.
2. Edit `/opt/lit-technica/.env`, `sudo systemctl restart lit-technica`.
3. Request a link to your own address and confirm delivery.
4. Revoke the old key. Existing sessions are unaffected.

### Changing the domain

Changing `PASSKEY_RP_ID` invalidates every existing passkey — authors will need
an email link and must create a new passkey. Announce it, and keep email working
before you touch the RP ID.

### Locking out an account or ending all sessions

There is no admin UI. Operate on the database with the service stopped:

```bash
sudo systemctl stop lit-technica
sudo -u lit-technica sqlite3 /opt/lit-technica/data/lit-technica.db \
  "DELETE FROM sessions;"                 -- sign everyone out
sudo systemctl start lit-technica
```

Replace the statement with `DELETE FROM sessions WHERE user_id = '…';` for one
account, or `DELETE FROM passkeys WHERE user_id = '…';` to force the email path.

### Backups

Back up `DATABASE_PATH` and `.env` separately from code. Use SQLite's own
backup to avoid copying a torn file:

```bash
sudo -u lit-technica sqlite3 /opt/lit-technica/data/lit-technica.db \
  ".backup '/opt/lit-technica/data/backup-$(date +%F).db'"
```

Treat backups as sensitive: they contain everybody's manuscripts.

### Incident: suspected session theft

1. `DELETE FROM sessions;` as above — all cookies become useless immediately.
2. Rotate `RESEND_API_KEY`.
3. Read `sudo journalctl -u lit-technica -S -24h | grep '/api/auth'`. Auth
   request bodies are deliberately not logged, so expect paths and status codes
   only.

---

## 5. What was tested, and how

Verified locally against the built server (`npm run check` and `npm run build`
both clean):

- Unauthenticated `GET /api/projects` → `401`; `GET /api/health` → `200`.
- Magic link end to end in development (`DEV_ECHO_MAGIC_LINK=true`): request →
  neutral `202` → callback `302` to `/#/passkey-setup` → session cookie set.
- Reusing the same link → `302` to `/#/sign-in?error=link-expired`, and the
  sign-in page shows the error.
- Passkey registration and passkey sign-in through a Chromium virtual
  authenticator (CDP `WebAuthn.addVirtualAuthenticator`), including sign-out and
  signing back in with the passkey only.
- Removing the only passkey is refused with a plain-language message.
- A second account created by magic link sees an empty library, gets `404` on
  the demo owner's book id, `403` on `POST /api/reset`, and its import attempt
  against another owner's book neither succeeds nor appears in that book.
- Rate limits: the fifth request for one address in the window → `429`; the
  per-IP ceiling → `429`, both with a neutral message.
- `Origin: https://evil.test` on a state-changing request → `403`.
- Production build with placeholder configuration: no development demo panel is
  rendered, `POST /api/auth/dev/demo-sign-in` and `GET /api/dev/config` return
  `404 {"error":"Unknown endpoint"}`, and a passkey attempt on the wrong host
  shows "Passkeys are not available on this address…".
- Wrong-address passkey handling at three independent layers (see below):
  `GET /api/auth/session` reports `passkeyAvailableHere: false`, the passkey
  option endpoints answer `400` with the author-facing sentence, and the client
  maps any browser exception onto a fixed set of calm messages. Verified on
  `http://127.0.0.1:5000` with `PASSKEY_RP_ID=localhost` at 390×844 and
  1440×900, and on the production build with `PASSKEY_RP_ID=littechnia.com`.

**Not verifiable here, must be checked on the VPS:** real Resend delivery and
deliverability, a real platform authenticator on `https://littechnia.com`, the
`Secure` cookie attribute in a live browser, and proxy-level rate limiting.
