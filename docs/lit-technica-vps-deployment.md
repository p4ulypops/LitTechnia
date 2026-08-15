# Lit Technica VPS deployment

*Updated for v0.3 (passwordless authentication and SQLite persistence).*

The GitHub Actions workflow at `lit-technica-app/.github/workflows/deploy-vps.yml` deploys every successful push to `main`. It checks TypeScript, builds the client and Express server on GitHub Actions, synchronises the release to the VPS over verified SSH, and restarts the `lit-technica` systemd service.

## One-time VPS setup

Use a dedicated, non-root deployment user. The user must own the application directory and be allowed to restart only the Lit Technica service with `sudo`.

```bash
sudo adduser --disabled-password --gecos "" lit-technica
sudo mkdir -p /opt/lit-technica
sudo chown lit-technica:lit-technica /opt/lit-technica
sudo visudo -f /etc/sudoers.d/lit-technica-deploy
```

Add this narrow sudo rule, substituting the actual deploy username if different:

```text
lit-technica ALL=(root) NOPASSWD: /bin/systemctl restart lit-technica, /bin/systemctl is-active --quiet lit-technica
```

Create `/etc/systemd/system/lit-technica.service`:

```ini
[Unit]
Description=Lit Technica
After=network.target

[Service]
Type=simple
User=lit-technica
WorkingDirectory=/opt/lit-technica
Environment=NODE_ENV=production
Environment=PORT=5000
# Required from v0.3 onwards: the service will not start without it.
EnvironmentFile=/opt/lit-technica/.env
ExecStart=/usr/bin/node /opt/lit-technica/dist/index.cjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable lit-technica
```

Place runtime configuration in `/opt/lit-technica/.env`, owned by the service user with `chmod 600`. The workflow deliberately excludes this file, the database and `node_modules` from deletion.

From v0.3 the application stores accounts, sessions, passkeys and every book in SQLite, so the database is now real data rather than a demo cache. Keep it outside the release tree:

```bash
sudo -u lit-technica mkdir -p /opt/lit-technica/data
sudo chmod 700 /opt/lit-technica/data
# in .env
# DATABASE_PATH=/opt/lit-technica/data/lit-technica.db
```

Confirm the deploy workflow's rsync exclusions cover both `.env` and the `data/` directory before the first v0.3 release. Back the database up separately from code — see [`lit-technica-security-notes.md`](lit-technica-security-notes.md).

## Required VPS environment values (v0.3)

These live only in `/opt/lit-technica/.env` on the server. **Do not add any of them to GitHub Actions secrets or variables** — the workflow builds and copies code, and never needs application secrets. `lit-technica-app/.env.example` is the annotated template.

| Variable | Required | Value for this deployment |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` |
| `PORT` | no (default `5000`) | `5000` |
| `APP_URL` | **yes** | `https://littechnia.com` — must be `https://` |
| `DATABASE_PATH` | no (default `./data.db`) | `/opt/lit-technica/data/lit-technica.db` |
| `PASSKEY_RP_ID` | **yes** | `littechnia.com` — registrable domain, no scheme or port |
| `PASSKEY_RP_NAME` | no | `Lit Technica` |
| `PASSKEY_ORIGIN` | no | defaults to `APP_URL`; set only if the origin differs |
| `TRUSTED_ORIGINS` | no | comma-separated extra origins, e.g. a staging host |
| `RESEND_API_KEY` | **yes** | restricted sending key from Resend |
| `EMAIL_FROM` | **yes** | `Lit Technica <no-reply@littechnia.com>`, verified in Resend |
| `SESSION_COOKIE_NAME` | no | `lit-technica_session` |
| `SESSION_TTL_DAYS` | no | `30` (1–90) |
| `MAGIC_LINK_TTL_MINUTES` | no | `15` (clamped 5–60) |
| `DEV_ECHO_MAGIC_LINK` | **must be absent** | development only; the server exits if set in production |
| `LIT_TECHNICA_DEMO_SEED` | **must be absent** | development only; the server exits if set in production |

A missing required value is not a silent degradation: the process prints the exact names and exits with status 1, leaving the previous release running if you deploy without restarting.

Put the GitHub Actions public key in `~lit-technica/.ssh/authorized_keys` on the VPS. Use an Ed25519 key dedicated to this repository, not a personal administrator key.

## Required GitHub Actions secrets

Create these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS hostname or IP address |
| `VPS_USER` | Dedicated deployment username, such as `lit-technica` |
| `VPS_APP_PATH` | Application path, such as `/opt/lit-technica` |
| `VPS_SSH_KEY` | Private half of the dedicated Ed25519 deployment key |
| `VPS_KNOWN_HOSTS` | Output of `ssh-keyscan -H your-vps-hostname`, reviewed against the provider’s host fingerprint |

Optionally create a repository variable named `VPS_PORT`; it defaults to `22`.

## GitHub Actions: what to preserve

The workflow at `lit-technica-app/.github/workflows/deploy-vps.yml` stays as it is. It needs exactly the five secrets and one variable listed below, all of which describe *how to reach the server* — never application configuration.

- Keep: `VPS_HOST`, `VPS_USER`, `VPS_APP_PATH`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, and the optional `VPS_PORT` variable.
- Do not add: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `PASSKEY_RP_ID` or anything else from `.env`. If a future workflow step appears to need them, it is doing something that belongs on the server.
- Keep the rsync exclusions for `.env`, the database path and `node_modules`, so a deploy can never delete accounts or books.

## First release

After the service and secrets are ready, push a commit to `main`, or run **Deploy Lit Technica to VPS** manually from GitHub Actions. The workflow runs `npm run check` and `npm run build` before it uploads anything. A failed check or build leaves the active VPS release untouched.

## Reverse proxy

Put Caddy or Nginx in front of port 5000 for HTTPS. The application service should remain bound to localhost or a private network interface where practical; expose only the proxy’s TLS port publicly.

## Operational notes

- **Rollbacks** — GitHub retains the commit history. Revert the faulty commit and push `main`; the workflow redeploys the previous source.
- **Logs** — On the VPS, inspect `sudo journalctl -u lit-technica -f`.
- **Backups** — Back up `/opt/lit-technica/.env` and `DATABASE_PATH` independently of code deploys, using `sqlite3 … ".backup"` rather than a plain file copy. Backups contain every author's manuscript: store them encrypted.
- **Health check** — `curl -s https://littechnia.com/api/health` must report `"demoEnabled":false`. If it reports `true`, a development switch reached production.
- **Sign everyone out** — stop the service and `DELETE FROM sessions;` in the database. Full procedure in the security notes.
- **Passkey domain** — `PASSKEY_RP_ID` is part of every stored credential. Changing the domain invalidates every passkey and forces authors back through the email link. Do not change it casually.
- **Security** — Keep `VPS_KNOWN_HOSTS` pinned and never replace it with disabled host-key checking. Rotate the dedicated deploy key if it is exposed.
