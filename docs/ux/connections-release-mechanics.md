# Connections release mechanics

## Decision

The import/export/syndication specification is part of the final build plan. It is implemented as an opt-in, profile-level Connections surface and never replaces portable file export. No connector ships as live until credential storage is encrypted at rest, the platform's sanctioned capability has passed QA, and its required server configuration is present.

## Lean build crew

- Connector architect: canonical Markdown pipeline, adapter contract, job model and platform capability truthfulness.
- Security and deployment reviewer: credential encryption, secret boundaries, rotation, least privilege, server configuration and audit trail.
- Accessibility reviewer: card semantics, unavailable-state explanation, keyboard/dialog behaviour, status announcements and contrast.
- Integration UX reviewer: connection consent, scope clarity, auth expiry, draft-first publishing, cancellation and recovery.
- Main critic: rejects any connector that misrepresents platform capabilities or weakens no-account export.

## Non-negotiable product rules

- Markdown, TXT, DOCX, PDF, HTML, EPUB, RSS/Atom and supported file-based imports remain usable without any connected account.
- Connections are author-initiated, explicitly scoped and revocable. Disconnect deletes the stored credential.
- Credentials are never sent to the browser, logged, committed, put in test fixtures, or embedded in client bundles.
- Do not use unsanctioned session-cookie automation for Medium, Substack, Goodreads or any other platform.
- WordPress publishing defaults to a draft. Publish and schedule are separate deliberate actions.

## Capability-gated UI

The browser receives only non-secret, server-computed connector availability: `available`, `setup_required`, `blocked_security`, `handoff_only`, `file_based`, or `unsupported`. It never checks an environment key directly.

- `available`: an enabled Connect or Export control, clear scope text and a status badge.
- `setup_required`: a non-interactive card action labelled `Admin setup required`; it has a visible explanation and a programmatic description.
- `blocked_security`: a non-interactive `Coming after credential encryption` action; no credential form is rendered.
- `handoff_only`: no misleading Connect/Publish button. Show the actual path, such as `Generate RSS feed` or `Open Medium importer`.
- `file_based`: show the real file action, for example `Export Markdown folder` or `Upload DOCX`; no account card is necessary.
- `unsupported`: show `Not available` with a plain-language reason and the nearest safe alternative.

Do not rely on low-contrast grey alone. Disabled/TBC controls must remain legible, expose why they are unavailable, and never be the only way to access an export that needs no connector.

## Release order

1. Canonical Markdown pipeline and file-based import/export: TXT, Markdown, DOCX, PDF, HTML, EPUB, Obsidian vault folder/ZIP, Craft Markdown/TextBundle and Goodreads CSV.
2. RSS 2.0 and Atom 1.0 generation and validation. This enables transparent Substack, Medium and podcast-style handoff without vendor credentials.
3. Encrypted credential storage, Connections data model, secure disconnect and job status model.
4. WordPress self-hosted and WordPress.com draft-first adapters.
5. Google Docs and optional Microsoft Graph/OneDrive adapters after OAuth verification and token storage work.
6. ElevenLabs asynchronous narration after queueing, quota controls and recorded voice-clone consent exist.
7. YouTube upload only after a video-render worker, resumable upload support and API-compliance requirements are complete.
8. Defer Instagram and TikTok until their review/audit, public-media hosting and policy requirements have been met.

## Environment and secret boundary

The current deployment deliberately preserves the VPS `.env` and excludes it from rsync. Keep that safety property: real values belong only in the VPS environment file or secret manager, never in Git.

GitHub repository/environment secrets may be the delivery source only when an approved deployment step writes an atomically replaced, owner-readable server environment file over SSH. The workflow must not echo, print, cache or commit values. A deployment cannot create provider credentials; it can only deliver values already created in the provider dashboard and stored as approved GitHub secrets.

Proposed server-only configuration groups, added to `.env.example` as empty documented placeholders only:

- `CREDENTIAL_ENCRYPTION_KEY` — required before any OAuth token, application password, API key or Craft credential is accepted.
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`.
- `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_REDIRECT_URI`.
- `WORDPRESS_COM_CLIENT_ID`, `WORDPRESS_COM_CLIENT_SECRET`, `WORDPRESS_COM_REDIRECT_URI`.
- `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET`, `YOUTUBE_OAUTH_REDIRECT_URI`.
- `ELEVENLABS_API_KEY` — server-side only, restricted and quota-capped.
- `CONNECTORS_ENABLED` and per-connector non-secret allow-list flags, used solely by the server's availability resolver.

All OAuth redirect URIs, encryption-key lifecycle, secret rotation procedure, backup/restore behaviour and production ownership must be reviewed before enabling any account connector. No secret value is added to this document or repository.

## Deployment gates

- Validate required variables by connector at server start; configuration errors name the missing key but never disclose values.
- Run type-check, build and connector contract tests before deployment.
- Run a post-deploy health check that confirms app health and reports only non-secret connector availability.
- Use GitHub Environments with production protection for any workflow that can deliver secrets to the VPS.
- Roll back code and preserve the existing server `.env` if deployment or health checks fail.

## Acceptance checks

- A user without any keys can complete every file-based import/export route.
- A configured connector shows only its real capabilities and requested scope.
- A missing key produces an explained, accessible TBC/setup-required state, not a broken or misleading action.
- Credential-backed connectors cannot be enabled until encrypted-at-rest storage is verified.
- Disconnect removes the encrypted credential and the UI updates to Not connected.
- Job progress, auth expiry, retry and failure are visible in a polite live region.
- No build artefact, client response, Git history or workflow log contains a secret.
