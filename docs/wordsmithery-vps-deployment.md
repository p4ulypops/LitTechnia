# LitTechnia VPS deployment

*Updated for the two-environment (main + dev) deploy split.*

The GitHub Actions workflow at `.github/workflows/deploy-vps.yml` deploys on:

- every push to `develop` → automatically deploys to the **dev** environment (`littechnia-dev` service, `dev.littechnia.com`).
- manual `workflow_dispatch` only → deploys to either `dev` or `main` (production, `littechnia-main` service, `littechnia.com`). Production deploys are gated behind the GitHub **production** Environment's required reviewers, so a deploy to `main` needs an explicit approval click even when someone runs the workflow.

It checks TypeScript, builds the client and Express server on GitHub Actions, synchronises the release to the VPS over verified SSH, and restarts the target systemd service. Both environments run from the same repository and workflow, each with its own path, port, systemd service and database file.

## One-time VPS setup

Use a dedicated, non-root deployment user shared by both environments. It must own both application directories and be allowed to restart only the two LitTechnia services with `sudo`. A ready-to-run script for all of the steps below (user, directories, sudoers rule, both systemd units) is generated alongside the GitHub Actions deploy key — see the setup script provided with the deploy key.

```bash
sudo adduser --disabled-password --gecos "" littechnia-deploy
sudo mkdir -p /opt/littechnia/main /opt/littechnia/dev
sudo chown -R littechnia-deploy:littechnia-deploy /opt/littechnia
sudo visudo -f /etc/sudoers.d/littechnia-deploy
```

Add this narrow sudo rule, substituting the actual deploy username if different:

```text
littechnia-deploy ALL=(root) NOPASSWD: /bin/systemctl restart littechnia-main, /bin/systemctl is-active --quiet littechnia-main, /bin/systemctl restart littechnia-dev, /bin/systemctl is-active --quiet littechnia-dev
```

Create `/etc/systemd/system/littechnia-main.service` (port 5000, `WorkingDirectory=/opt/littechnia/main`) and `/etc/systemd/system/littechnia-dev.service` (port 5001, `WorkingDirectory=/opt/littechnia/dev`), each following the same template:

```ini
[Unit]
Description=LitTechnia (<main|dev>)
After=network.target

[Service]
Type=simple
User=littechnia-deploy
WorkingDirectory=/opt/littechnia/<main|dev>
Environment=NODE_ENV=production
Environment=PORT=<5000|5001>
EnvironmentFile=/opt/littechnia/<main|dev>/.env
ExecStart=/usr/bin/node /opt/littechnia/<main|dev>/dist/index.cjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable littechnia-main littechnia-dev
```

Place runtime configuration in `/opt/littechnia/main/.env` and `/opt/littechnia/dev/.env` separately, each owned by the service user with `chmod 600`. The workflow deliberately excludes `.env`, the `data/` directory and `node_modules` from deletion on every sync.

The application stores accounts, sessions, passkeys and every book in SQLite, so each environment needs its own database file, outside the release tree:

```bash
sudo -u littechnia-deploy mkdir -p /opt/littechnia/main/data /opt/littechnia/dev/data
sudo chmod 700 /opt/littechnia/main/data /opt/littechnia/dev/data
# main .env: DATABASE_PATH=/opt/littechnia/main/data/littechnia.db
# dev  .env: DATABASE_PATH=/opt/littechnia/dev/data/littechnia-dev.db
```

Confirm the deploy workflow's rsync exclusions cover `.env`, `data/` and `node_modules` for both environments. Back each database up separately from code — see [`wordsmithery-security-notes.md`](wordsmithery-security-notes.md).

## Required VPS environment values

These live only in each environment's own `/opt/littechnia/<main|dev>/.env` on the server. **Do not add any of them to GitHub Actions secrets or variables** — the workflow builds and copies code, and never needs application secrets. `.env.example` is the annotated template.

| Variable | Required | Main value | Dev value |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | `production` | `production` |
| `PORT` | no (default `5000`) | `5000` | `5001` |
| `APP_URL` | **yes** | `https://littechnia.com` | `https://dev.littechnia.com` |
| `DATABASE_PATH` | no (default `./data.db`) | `/opt/littechnia/main/data/littechnia.db` | `/opt/littechnia/dev/data/littechnia-dev.db` |
| `PASSKEY_RP_ID` | **yes** | `littechnia.com` | `dev.littechnia.com` |
| `PASSKEY_RP_NAME` | no | `LitTechnia` | `LitTechnia Dev` |
| `PASSKEY_ORIGIN` | no | defaults to `APP_URL` | defaults to `APP_URL` |
| `TRUSTED_ORIGINS` | no | comma-separated extra origins | comma-separated extra origins |
| `RESEND_API_KEY` | **yes** | restricted sending key from Resend | can share the same key or use a separate one |
| `EMAIL_FROM` | **yes** | `LitTechnia <no-reply@littechnia.com>`, verified in Resend | `LitTechnia Dev <no-reply@dev.littechnia.com>` |
| `SESSION_COOKIE_NAME` | no | `littechnia_session` | `littechnia_dev_session` (keep distinct so cookies don't collide if ever proxied under one apex) |
| `SESSION_TTL_DAYS` | no | `30` (1–90) | `30` (1–90) |
| `MAGIC_LINK_TTL_MINUTES` | no | `15` (clamped 5–60) | `15` (clamped 5–60) |
| `DEV_ECHO_MAGIC_LINK` | **must be absent** | development only; the server exits if set in production | same |
| `WORDSMITHERY_DEMO_SEED` | **must be absent** | development only; the server exits if set in production | same |

A missing required value is not a silent degradation: the process prints the exact names and exits with status 1, leaving the previous release running if you deploy without restarting.

Put the GitHub Actions deploy public key in `~littechnia-deploy/.ssh/authorized_keys` on the VPS. Use an Ed25519 key dedicated to this repository, not a personal administrator key. Both environments share the same deploy user and key; only the target path/service differ per deploy.

## Required GitHub Actions secrets

Create these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS hostname or IP address (shared by both environments) |
| `VPS_USER` | Dedicated deployment username, `littechnia-deploy` |
| `VPS_APP_PATH_MAIN` | `/opt/littechnia/main` |
| `VPS_APP_PATH_DEV` | `/opt/littechnia/dev` |
| `VPS_SSH_KEY` | Private half of the dedicated Ed25519 deployment key |
| `VPS_KNOWN_HOSTS` | Output of `ssh-keyscan -H your-vps-hostname`, reviewed against the provider's host fingerprint |

Optionally create a repository variable named `VPS_PORT`; it defaults to `22`.

Set up a GitHub **production** Environment (Settings → Environments → New environment → `production`) with required reviewers, so a manual deploy targeting `main` needs an explicit approval. The **development** environment can be left without protection rules since pushes to `develop` deploy automatically.

## GitHub Actions: what to preserve

The workflow at `.github/workflows/deploy-vps.yml` selects `VPS_APP_PATH_MAIN`/`littechnia-main` or `VPS_APP_PATH_DEV`/`littechnia-dev` based on the deploy target. It needs exactly the six secrets and one variable listed above, all of which describe *how to reach the server* — never application configuration.

- Keep: `VPS_HOST`, `VPS_USER`, `VPS_APP_PATH_MAIN`, `VPS_APP_PATH_DEV`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, and the optional `VPS_PORT` variable.
- Do not add: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `PASSKEY_RP_ID` or anything else from `.env`. If a future workflow step appears to need them, it is doing something that belongs on the server.
- Keep the rsync exclusions for `.env`, the `data/` directory and `node_modules`, so a deploy can never delete accounts or books.

## First release

After both services and secrets are ready:

- **Dev**: push a commit to the `develop` branch — it deploys automatically.
- **Main (production)**: run **Deploy LitTechnia to VPS** manually from GitHub Actions with `environment: main`, then approve the run in the `production` Environment's review gate.

The workflow runs `npm run check` and `npm run build` before it uploads anything. A failed check or build leaves the active VPS release untouched.

## Reverse proxy

Put Caddy or Nginx in front of both ports for HTTPS: `littechnia.com` → `127.0.0.1:5000`, `dev.littechnia.com` → `127.0.0.1:5001`. Both application services should remain bound to localhost or a private network interface where practical; expose only the proxy's TLS ports publicly.

## Operational notes

- **Rollbacks** — GitHub retains the commit history. Revert the faulty commit and push `develop` (dev) or re-run the manual workflow against an earlier commit on `main` (production); the workflow redeploys that source.
- **Logs** — On the VPS, inspect `sudo journalctl -u littechnia-main -f` or `sudo journalctl -u littechnia-dev -f`.
- **Backups** — Back up each environment's `.env` and `DATABASE_PATH` independently of code deploys, using `sqlite3 … ".backup"` rather than a plain file copy. Backups contain every author's manuscript: store them encrypted.
- **Health check** — `curl -s https://littechnia.com/api/health` (and the `dev.` equivalent) must report `"demoEnabled":false`. If it reports `true`, a development switch reached production.
- **Sign everyone out** — stop the relevant service and `DELETE FROM sessions;` in that environment's database. Full procedure in the security notes.
- **Passkey domain** — `PASSKEY_RP_ID` is part of every stored credential and differs per environment. Changing the domain invalidates every passkey and forces authors back through the email link. Do not change it casually.
- **Security** — Keep `VPS_KNOWN_HOSTS` pinned and never replace it with disabled host-key checking. Rotate the dedicated deploy key if it is exposed.
