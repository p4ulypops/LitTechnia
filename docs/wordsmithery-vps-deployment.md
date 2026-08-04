# Wordsmithery VPS deployment

The GitHub Actions workflow at `wordsmithery-app/.github/workflows/deploy-vps.yml` deploys every successful push to `main`. It checks TypeScript, builds the client and Express server on GitHub Actions, synchronises the release to the VPS over verified SSH, and restarts the `wordsmithery` systemd service.

## One-time VPS setup

Use a dedicated, non-root deployment user. The user must own the application directory and be allowed to restart only the Wordsmithery service with `sudo`.

```bash
sudo adduser --disabled-password --gecos "" wordsmithery
sudo mkdir -p /opt/wordsmithery
sudo chown wordsmithery:wordsmithery /opt/wordsmithery
sudo visudo -f /etc/sudoers.d/wordsmithery-deploy
```

Add this narrow sudo rule, substituting the actual deploy username if different:

```text
wordsmithery ALL=(root) NOPASSWD: /bin/systemctl restart wordsmithery, /bin/systemctl is-active --quiet wordsmithery
```

Create `/etc/systemd/system/wordsmithery.service`:

```ini
[Unit]
Description=Wordsmithery
After=network.target

[Service]
Type=simple
User=wordsmithery
WorkingDirectory=/opt/wordsmithery
Environment=NODE_ENV=production
Environment=PORT=5000
EnvironmentFile=-/opt/wordsmithery/.env
ExecStart=/usr/bin/node /opt/wordsmithery/dist/index.cjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable wordsmithery
```

Place runtime configuration in `/opt/wordsmithery/.env`. The workflow deliberately excludes this file, `data.db`, and `node_modules` from deletion. The current demo uses memory storage; when durable SQLite storage is enabled, keep its database in the excluded `data.db` path or move it to a managed volume.

Put the GitHub Actions public key in `~wordsmithery/.ssh/authorized_keys` on the VPS. Use an Ed25519 key dedicated to this repository, not a personal administrator key.

## Required GitHub Actions secrets

Create these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS hostname or IP address |
| `VPS_USER` | Dedicated deployment username, such as `wordsmithery` |
| `VPS_APP_PATH` | Application path, such as `/opt/wordsmithery` |
| `VPS_SSH_KEY` | Private half of the dedicated Ed25519 deployment key |
| `VPS_KNOWN_HOSTS` | Output of `ssh-keyscan -H your-vps-hostname`, reviewed against the provider’s host fingerprint |

Optionally create a repository variable named `VPS_PORT`; it defaults to `22`.

## First release

After the service and secrets are ready, push a commit to `main`, or run **Deploy Wordsmithery to VPS** manually from GitHub Actions. The workflow runs `npm run check` and `npm run build` before it uploads anything. A failed check or build leaves the active VPS release untouched.

## Reverse proxy

Put Caddy or Nginx in front of port 5000 for HTTPS. The application service should remain bound to localhost or a private network interface where practical; expose only the proxy’s TLS port publicly.

## Operational notes

- **Rollbacks** — GitHub retains the commit history. Revert the faulty commit and push `main`; the workflow redeploys the previous source.
- **Logs** — On the VPS, inspect `sudo journalctl -u wordsmithery -f`.
- **Backups** — Back up the application `.env` and the eventual durable project-data volume independently of code deploys.
- **Security** — Keep `VPS_KNOWN_HOSTS` pinned and never replace it with disabled host-key checking. Rotate the dedicated deploy key if it is exposed.
