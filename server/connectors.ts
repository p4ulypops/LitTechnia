/**
 * Connections registry and availability resolver (v0.1).
 *
 * The single place that decides what the Connections page may show. It reads
 * only non-secret booleans off `env` (never a raw key value) and returns
 * `ConnectorAvailability[]` -- the exact, small, documented shape defined in
 * shared/schema.ts. No adapter code, OAuth flow or credential storage lives
 * here yet; this release ships the truthful registry only, per
 * docs/ux/connections-release-mechanics.md and section 4 of
 * docs/ux/one-shot-build-prompt.md.
 *
 * Every account-backed connector below resolves to `blocked_security` in
 * this release regardless of which environment flags are set, because the
 * shared prerequisite -- encrypted-at-rest credential storage -- is not
 * implemented yet, and neither is any adapter/job code. Presence booleans are
 * still read and reflected in `reason`, so an operator who sets a key sees an
 * accurate account of *why* it still won't work, rather than a static wall of
 * text that never changes.
 */
import { env as realEnv, type AppEnv } from "./env";
import type { ConnectorAvailability } from "@shared/schema";

/**
 * Accepts an env override so availability rules can be unit-tested against
 * every configuration combination without touching real process.env or
 * relying on module-mock plumbing. Production call sites never pass a
 * second argument, so they always get the real singleton.
 */
export function resolveConnectors(env: AppEnv = realEnv): ConnectorAvailability[] {
  const oauthReason = (label: string, configured: boolean) =>
    !env.credentialEncryptionConfigured
      ? "Needs CREDENTIAL_ENCRYPTION_KEY configured on the server before any OAuth token can be stored -- not set here."
      : configured
        ? `${label} credentials are configured, but the adapter, job model and QA pass this needs are not built yet.`
        : `Needs ${label} configured -- not set here.`;

  return [
    {
      id: "markdown-txt",
      name: "Markdown & plain text files",
      category: "file",
      state: "file_based",
      summary: "Import and export your manuscript as Markdown or plain text with no account.",
      reason: "Already live: see the Import page for .md/.txt import and the Exports page for Markdown, HTML, narration text and JSON.",
      actionLabel: "Open Exports",
      actionHref: "/exports",
    },
    {
      id: "rich-documents",
      name: "DOCX, PDF, EPUB, Obsidian, Craft & Goodreads CSV",
      category: "file",
      state: "unsupported",
      summary: "Bringing manuscripts in directly from Word, PDF, EPUB, an Obsidian vault, Craft, or a Goodreads CSV.",
      reason: "Not built yet -- only Markdown and plain text (.md/.txt) import exists today.",
      actionLabel: "Use Markdown import instead",
      actionHref: "/import",
    },
    {
      id: "rss-atom",
      name: "RSS 2.0 / Atom 1.0 feed",
      category: "feed",
      state: "file_based",
      summary: "Generate a spec-valid feed of your ready scenes for Substack, Medium, feed readers or podcast tools.",
      reason: "Built entirely from your book, in your browser, with no account -- generate it in the Feeds section further down this page.",
    },
    {
      id: "medium",
      name: "Medium",
      category: "publish",
      state: "handoff_only",
      summary: "No OAuth publishing or session-cookie automation. Generate a feed, then use Medium's own import feature to bring posts in from a feed URL you host.",
      reason: "LitTechnia does not and will not publish to Medium on your behalf.",
    },
    {
      id: "substack",
      name: "Substack",
      category: "publish",
      state: "handoff_only",
      summary: "No OAuth publishing or session-cookie automation. Generate a feed, then use Substack's own import feature.",
      reason: "LitTechnia does not and will not publish to Substack on your behalf.",
    },
    {
      id: "wordpress-self-hosted",
      name: "WordPress (self-hosted)",
      category: "publish",
      state: "blocked_security",
      summary: "Draft-first publishing to a self-hosted WordPress site using an application password.",
      reason: env.credentialEncryptionConfigured
        ? "CREDENTIAL_ENCRYPTION_KEY is configured, but the adapter and job model this needs are not built yet."
        : "Needs CREDENTIAL_ENCRYPTION_KEY configured on the server before any application password can be accepted -- not set here.",
    },
    {
      id: "wordpress-com",
      name: "WordPress.com",
      category: "publish",
      state: "blocked_security",
      summary: "Draft-first publishing to WordPress.com over OAuth.",
      reason: oauthReason(
        "WORDPRESS_COM_CLIENT_ID/SECRET/REDIRECT_URI",
        env.wordpressComOAuthConfigured,
      ),
    },
    {
      id: "google-docs",
      name: "Google Docs",
      category: "docs",
      state: "blocked_security",
      summary: "Export a manuscript into Google Docs after OAuth verification.",
      reason: oauthReason(
        "GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI",
        env.googleOAuthConfigured,
      ),
    },
    {
      id: "microsoft-onedrive",
      name: "Microsoft Graph / OneDrive",
      category: "docs",
      state: "blocked_security",
      summary: "Optional export to OneDrive after OAuth verification.",
      reason: oauthReason(
        "MICROSOFT_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI",
        env.microsoftOAuthConfigured,
      ),
    },
    {
      id: "elevenlabs",
      name: "ElevenLabs narration",
      category: "narration",
      state: "blocked_security",
      summary: "Asynchronous narration of your manuscript using your own ElevenLabs account.",
      reason: env.elevenLabsConfigured
        ? "ELEVENLABS_API_KEY is set, but the queueing, quota controls and recorded voice-clone consent this needs are not built yet."
        : "Needs ELEVENLABS_API_KEY configured, plus queueing, quota controls and recorded voice-clone consent -- none of that exists yet.",
    },
    {
      id: "youtube",
      name: "YouTube upload",
      category: "video",
      state: "unsupported",
      summary: "Uploading a narrated or video edition of your work to YouTube.",
      reason: "Needs a video-render worker and resumable-upload support that don't exist yet, on top of OAuth and encrypted credential storage.",
    },
    {
      id: "instagram",
      name: "Instagram",
      category: "video",
      state: "unsupported",
      summary: "Distributing clips or posts to Instagram.",
      reason: "Deferred until the platform's review/audit and public media hosting requirements are met.",
    },
    {
      id: "tiktok",
      name: "TikTok",
      category: "video",
      state: "unsupported",
      summary: "Distributing clips to TikTok.",
      reason: "Deferred until the platform's review/audit and policy requirements are met.",
    },
    {
      id: "goodreads",
      name: "Goodreads",
      category: "file",
      state: "unsupported",
      summary: "Bringing a Goodreads export in as a shelf or reading log.",
      reason: "CSV import isn't built yet, and Goodreads will only ever get file import -- never a posting or publish connector.",
      actionLabel: "Use Markdown import instead",
      actionHref: "/import",
    },
  ];
}
