# Lit Technica
## Import/Export & Syndication System — spec v0.1

**Status:** Draft v0.1
**Date:** 9 August 2026
**Companion documents:** [`lit-technica-prd-v0.2.md`](./lit-technica-prd-v0.2.md) (supersedes v0.1), `lit-technica-implementation-plan-v0.3.md`
**Audience:** Product, design, and engineering
**Scope:** A profile-level Connections system letting an author connect accounts or upload files for Google Docs, Microsoft Word, plain text, PDF, Markdown, Craft Docs, Obsidian, WordPress, Medium, ElevenLabs, ePub, Substack, YouTube (Shorts), GoodReads, and RSS/XML, plus the import/export/syndication mechanics behind each connector.

This document expands the PRD's P0 export contract and P2 "follow-on opportunities" list into a full architecture and per-platform build reference. It does not change the P0 commitment that portable-folder, `.docx`, PDF, Markdown, and HTML export work with no third-party account. Everything in this document is opt-in, additive, and gated behind the author explicitly opening the Connections page.

---

## 1. Why this exists

The PRD's non-goals (v0.1, "Direct publishing or audiobook generation") were correct for a first release but always described as a *sequencing* decision, not a permanent boundary — P2 already named Substack, WordPress, ElevenLabs, and Word/Obsidian import as follow-on opportunities. The author asked for a concrete Import/Export & Syndication System spanning fifteen destinations. This document is the research-grounded answer: what each platform's API actually allows in 2026, what it costs, what its auth model demands, and what Lit Technica should build first, second, and not at all.

The headline finding across all three research passes: **fidelity and API maturity vary enormously by platform, and several platforms the author might expect to have live APIs do not.** Medium's API is frozen and issues no new integration tokens. Goodreads has issued no developer key since December 2020. Substack's 2026 "Developer API" is a read-only LinkedIn-profile lookup with no posting capability. Obsidian has no official API at all — a vault is just a folder of Markdown files. Only WordPress offers a genuine bidirectional write API. This reshapes the build order: RSS/Atom generation is the single highest-leverage investment, because it is the one interface every laggard platform still consumes through its own importer.

## 2. Principles

These extend, and must not contradict, the PRD's product principles (`lit-technica-prd-v0.2.md` §"Product principles"):

- **Opt-in, never ambient.** No project data leaves the local project folder because of this system unless the author explicitly opens Connections and authorizes a specific platform action. This is the same rule the PRD already applies to AI requests.
- **Revocable.** Every connection can be disconnected from the Connections page in one action, which must delete the stored credential, not merely hide the UI card.
- **No lock-in through connectors.** A disconnected author must be able to reach every export in this document (Markdown, `.docx`, PDF, EPUB, RSS feed files, narration-script) with zero connected accounts, exactly as P0 already requires.
- **Honesty about fidelity and availability.** Where a platform's real capability is "paste this URL into their importer" rather than "click Publish," the UI must say so. Do not present Medium or Substack as fully automated destinations when they are not.
- **Encrypted credential storage is a blocking prerequisite**, not a nice-to-have. `lit-technica-security-notes.md` (v0.3 scope) documents no encryption at rest; storing OAuth tokens, Application Passwords, or API keys under that model is a regression the security review must close before any connector ships beyond file-based ones.

## 3. Architecture

### 3.1 Connections / Profile page

A new authenticated-account surface (sits on top of the v0.3 passwordless account system) listing every supported platform as a card:

- **Status:** Not connected / Connected as `{account}` / Needs re-auth / Error.
- **Direction badges:** Import, Export, or both.
- **Auth type badge:** OAuth2, Application Password, API key, File upload, or RSS (no account).
- **Actions:** Connect, Disconnect, Reconnect, View last sync.
- **Scope summary:** the exact permissions requested, in plain language (e.g. "Lit Technica can create draft posts and upload media to this site. It cannot read your other posts unless you also enable Import.").

Cards are grouped to match this document's structure: **Documents & Notes**, **Publishing & Syndication**, **Narration & Video**, **Feeds**. Platforms with no live account concept (Txt, PDF, Markdown, ePub, RSS/XML, Obsidian, Goodreads) either have no card (they are just export/import options in the manuscript export flow) or a lightweight "Upload a file here" card (Obsidian vault zip, Goodreads CSV, Craft TextBundle).

### 3.2 Auth patterns actually required

| Pattern | Platforms | Notes |
|---|---|---|
| **OAuth2, Authorization Code Flow** | Google Docs/Drive, Microsoft Graph (OneDrive), WordPress.com, YouTube Data API v3 | Store refresh tokens encrypted; each platform has its own re-auth cadence (WordPress.com tokens expire ~2 weeks — see §5.7). |
| **Delegated Application Password** | Self-hosted WordPress | No client secret; author is redirected to their own site's `authorize-application.php` and a credential is handed back via redirect — never ask the author to hand-type a password if discovery succeeds ([Application Passwords Integration Guide](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)). |
| **API key (server-held)** | ElevenLabs | No OAuth exists for this API; the key must live server-side only, scoped, quota-capped, and IP-allowlisted ([ElevenLabs Authentication](https://elevenlabs.io/docs/api-reference/authentication)). |
| **User-provisioned per-connection credential** | Craft Docs (optional live path) | Craft issues per-connection endpoints/credentials from its own Imagine tab, not a platform-wide OAuth app ([Craft API documentation](https://support.craft.do/en/integrate/api)). |
| **File upload, no account** | Txt, PDF, Markdown, ePub, MS Word (.docx, default path), Obsidian (vault export/zip), Craft (Markdown/TextBundle fallback), Goodreads (CSV export) | The safe default for every platform without a first-class API, and the *only* path for Obsidian and Goodreads. |
| **RSS/Atom, no account** | Medium (import only), Substack (import + export handoff), Goodreads (optional live import) | No auth; Lit Technica is either a feed consumer or a feed producer. |

### 3.3 Adapter (connector) pattern

Each platform is implemented behind a common `Connector` interface so the Connections UI, job queue, and manuscript-export flow do not special-case platforms:

```text
interface Connector {
  id: string;                     // "wordpress_self_hosted", "google_docs", …
  category: "documents" | "publishing" | "narration_video" | "feeds";
  authType: "oauth2" | "app_password" | "api_key" | "file_upload" | "rss";
  capabilities: {
    import: boolean;
    export: boolean;
    formats: string[];            // mime types / extensions this connector reads or writes
  };
  connect(profileId): AuthSession;
  disconnect(profileId): void;
  import?(source): CanonicalDocument[];
  export?(doc: CanonicalDocument, options): ExportResult | AsyncJob;
}
```

Adapters translate to/from Lit Technica's canonical interchange model (§3.4). This keeps platform-specific quirks — Google's tabbed documents, WordPress's draft-by-default requirement, ElevenLabs' character-limited chunking — isolated inside one adapter each, rather than leaking into the manuscript/export core.

### 3.4 Canonical interchange format

**Markdown with a single leading YAML front-matter block is Lit Technica's canonical interchange format**, confirmed across all three research passes as the highest-fidelity round-trip format available: it is Obsidian's native storage, a Craft import/export format, a Google Drive export MIME type, and a Microsoft Graph PDF-conversion source extension ([How Obsidian stores data](https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data); [Craft import and export](https://support.craft.do/en/import-and-export); [Drive export formats](https://developers.google.com/workspace/drive/api/guides/ref-export-formats); [Graph driveItem content-format](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format)). Every importer normalizes into this model; every exporter (docx, PDF, EPUB, HTML, RSS item) renders from it, using Pandoc (or an in-process equivalent) as the bridge to binary formats rather than maintaining N×M converters.

Front-matter must follow a single YAML block at the very start of the file, because CommonMark/GFM-mode parsing only recognizes one block, only at document start, and only in the first file of a multi-file input ([Pandoc manual — metadata blocks](https://pandoc.org/MANUAL.html#metadata-blocks)). Target CommonMark 0.31.2 as the base dialect and enable the GFM extensions `table`, `tasklist`, `strikethrough`, `autolink`, `tagfilter` for compatibility ([CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/); [GFM Spec](https://github.github.com/gfm/)).

### 3.5 Async job queue

Several operations in this system are not request/response: narrating a chapter through ElevenLabs, rendering a Short for YouTube, or resumable-uploading a large Google Doc export. These need a durable job model, which is new infrastructure relative to v0.3 (currently synchronous SQLite reads/writes per the implementation plan):

- A `jobs` table (SQLite, per-owner, consistent with the existing per-owner data isolation model) with `type`, `status`, `payload`, `result`, `attempts`, `created_at`, `updated_at`.
- Worker types: `narration` (ElevenLabs chunking + stitching), `video_render` (ffmpeg composition for Shorts), `publish` (WordPress/Google Docs/YouTube upload), `feed_rebuild` (RSS/Atom regeneration on manuscript change).
- Concurrency caps per job type must respect the upstream platform's own limits — e.g. ElevenLabs' plan-tier concurrent-request ceiling (Free: 2–4 concurrent; Creator: 5–10) ([ElevenLabs Models — concurrency](https://elevenlabs.io/docs/models)) and YouTube's 100 `videos.insert` calls/day/project ([YouTube Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)).
- Job status must be visible on the Connections page per connector ("Narrating Chapter 4… 2 of 6 chunks complete").

### 3.6 Credential storage

All platform secrets (OAuth refresh tokens, Application Passwords, ElevenLabs API keys, Craft connection credentials) must be encrypted at rest before this system ships anything beyond file-upload connectors. `lit-technica-security-notes.md` currently documents no encryption at rest for the v0.3 scope; this spec treats closing that gap as a blocking dependency (already flagged as an open PRD question — see §11). WordPress core ships libsodium, which the WordPress research explicitly suggests for Application Password storage ([Application Passwords Integration Guide](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)); the same primitive can protect every other connector's secret in the same SQLite-backed store.

---

## 4. Platform capability matrix

| Platform | Import | Export | Auth | Mechanism | Fidelity / status |
|---|---|---|---|---|---|
| Google Docs | Yes | Yes | OAuth2 (`drive.file`, non-sensitive) | Docs API v1 + Drive API v3, Google Picker | High for text; tabs add complexity; Drive API charges coming later in 2026 |
| Microsoft Word (.docx) | Yes | Yes | None (file-based default) or OAuth2 (Graph, optional) | mammoth.js / python-docx / `docx` npm / Pandoc; Graph DriveItem as optional connector | Good; mammoth does no sanitisation — must sanitise downstream |
| Txt | Yes | Yes | None | WHATWG Encoding Standard, UTF-8 canonical | Structure-free; encoding is the only real risk |
| PDF | Yes (best-effort) | Yes | None | PDF.js (import), Puppeteer or PDFKit (export) | Import is inherently lossy; export is high-fidelity |
| Markdown | Yes | Yes | None | CommonMark 0.31.2 + GFM extensions | Canonical interchange format — highest round-trip fidelity |
| Craft Docs | Yes | Yes | File-based (default) or user-provisioned API credential (optional) | Markdown/TextBundle export/import; Craft public API + MCP (v3.3.5+) | File-based path recommended first; live API auth details are undocumented |
| Obsidian | Yes | Yes | None (no official API) | Vault is a folder of Markdown files; optional desktop-only community "Local REST API" plugin | File-based is the only server-reachable path; plugin is localhost-bound |
| ePub | Yes (high-fidelity) | Yes | None | Unzip/parse via OCF+OPF+XHTML; generate via Pandoc EPUB3 writer, validate with EPUBCheck | Second only to Markdown for structural fidelity when tagged |
| WordPress.com | Yes | Yes | OAuth2 | REST API `/rest/v1.1/...`, WXR fallback | Full bidirectional; tokens expire ~2 weeks |
| WordPress self-hosted | Yes | Yes | Application Password (delegated) | REST API `wp/v2`, WXR/`/feed/` fallback | Full bidirectional; requires HTTPS |
| Medium | Partial (RSS, recent only) | No live API — handoff only | None (RSS) | Profile/publication RSS; "Import a story" URL handoff | API frozen since 2023; no new integration tokens issued |
| Substack | Yes (RSS + user export ZIP) | No live API — importer handoff only | None | Publication RSS; author pastes feed URL into Substack's importer (15-post ceiling) | 2026 "Developer API" is read-only LinkedIn profile lookup, not usable here |
| ElevenLabs | n.a. (not an import source) | Yes | API key (server-held) | REST, `POST /v1/text-to-speech/{voice_id}` | Mature API; character-limited chunking required for chapters |
| YouTube (Shorts) | n.a. | Yes | OAuth2 (`youtube.upload`) | Data API v3 `videos.insert`, resumable upload | No separate Shorts API; unaudited projects force uploads private; 100 uploads/day default |
| GoodReads | Yes (CSV export upload; optional shelf RSS) | No | None | User-initiated CSV export (primary); legacy unauthenticated shelf RSS (optional) | No developer keys issued since Dec 2020; export-only for Lit Technica's purposes |
| RSS/XML | Yes (universal fallback reader) | Yes | None | RSS 2.0 / Atom 1.0 generation and consumption | Keystone syndication format — unlocks Substack and podcast paths |
| *Instagram Reels (future)* | — | Phase 2 | OAuth2 + App Review | Meta Content Publishing API, two-step container flow | Needs public media hosting; 50 posts/24h cap |
| *TikTok (future)* | — | Phase 2 | OAuth2 + audit | Content Posting API | Unaudited clients capped at 5 users/24h; strict no-branding UX rules |

---

## 5. Detailed platform sections

### 5.1 Documents & notes formats

#### Google Docs

Integration is via the Docs API v1 (`documents.create`, `documents.get`, `documents.batchUpdate`) and Drive API v3 for file conversion, both OAuth2-only ([Docs API — `documents.create`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/create)). The recommended pattern uses the **non-sensitive `drive.file` scope** paired with the client-side **Google Picker**, which avoids Google's restricted-scope app verification and its annual re-verification cycle entirely — restricted scopes like bare `drive` require a security assessment and yearly re-approval, while `drive.file` does not ([Drive API-specific authorization](https://developers.google.com/workspace/drive/api/guides/api-specific-auth); [OAuth app verification](https://support.google.com/cloud/answer/13463073)).

Import: Picker → `files.export` to `text/markdown` (Drive supports Markdown and even EPUB as export MIME types) → local parser, falling back to the long-running `files.download` operation when the export would exceed the **10 MB `files.export` ceiling** ([Drive export MIME types](https://developers.google.com/workspace/drive/api/guides/ref-export-formats); [manage downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads)). Export: render the manuscript to `.docx` locally, then `files.create` with `mimeType: application/vnd.google-apps.document` to convert on upload (resumable upload above 5 MB) ([Drive upload guide](https://developers.google.com/workspace/drive/api/guides/manage-uploads)).

Watch item: Google has announced Drive API usage charges arriving later in 2026 with at least 90 days' notice — budget for this before relying on Drive API calls at scale ([Drive API usage limits](https://developers.google.com/workspace/drive/api/guides/limits)).

#### Microsoft Word (.docx)

Two independent paths, and the file-based one should be the default. **File-based (no Microsoft account needed):** parse uploaded `.docx` with mammoth.js (docx → HTML, but explicitly does no sanitisation — Lit Technica must sanitise downstream) or Pandoc's `docx+styles` reader (preserves Word styles as `custom-style` attributes) ([mammoth.js](https://github.com/mwilliamson/mammoth.js); [Pandoc manual](https://pandoc.org/MANUAL.html#option--extract-media)); generate `.docx` with the `docx` npm library (zero runtime dependencies, runs in-browser — a good fit for a local-first app) or Pandoc with `--reference-doc` for house styling ([docx.js.org](https://docx.js.org/)).

**Optional connector (Graph/OneDrive):** OAuth2 via Entra ID app registration, `GET /me/drive/items/{id}/content` to fetch bytes and `createUploadSession` to write back, with the OneDrive File Picker v8 for selection — note this picker requires SharePoint-resource tokens, not Graph tokens, a real integration gotcha ([driveItem content-format](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format); [createUploadSession](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession); [OneDrive File Picker v8](https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/)).

#### Txt

No API, no vendor. The entire risk surface is encoding: decode with `TextDecoder` per the WHATWG Encoding Standard, always normalise to UTF-8, strip a leading BOM, and always write UTF-8 without BOM on export ([WHATWG Encoding Standard](https://encoding.spec.whatwg.org/)). Paragraph-structure recovery is genuinely ambiguous with plain text (blank-line vs. every-line vs. indent-based); let the author choose a paragraph-detection mode rather than silently guessing, modelled on Calibre's `--paragraph-type` options ([Calibre `ebook-convert`](https://manual.calibre-ebook.com/generated/en/ebook-convert.html)).

#### PDF

Treat as a render target for export, a best-effort source for import — never the reverse. **Export:** HTML/CSS → Puppeteer `page.pdf()` server-side (note: defaults to `print` CSS media type, a common surprise) ([Puppeteer `page.pdf`](https://pptr.dev/api/puppeteer.page.pdf)), or build the PDF directly with PDFKit for a no-server path, which supports tagged-PDF/PDF-UA output for accessibility ([PDFKit repo](https://github.com/foliojs/pdfkit)). **Do not adopt wkhtmltopdf** — its repository was archived by its owner on 2 January 2023 and its last release was 2020, built on dead QtWebKit ([wkhtmltopdf repo](https://github.com/wkhtmltopdf/wkhtmltopdf)). **Import:** client-side PDF.js `getTextContent()`/`streamTextContent()`; attempt `getStructTree()` first for logical structure, but expect `null` on untagged PDFs, since whitespace is normalised to plain spaces regardless — warn the author up front that formatting will not survive ([PDFPageProxy API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html)).

#### Markdown

Already Lit Technica's canonical format (§3.4). Target CommonMark 0.31.2 plus the five common GFM extensions; keep front matter to a single YAML block at document start for maximum compatibility with strict parsers ([CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/); [Pandoc manual](https://pandoc.org/MANUAL.html#metadata-blocks)).

#### Craft Docs

Craft now ships a genuine first-party public API and an MCP server (Space-Level API Access, Craft v3.3.5+), a meaningful change from its previous export-only posture — but authentication specifics (token type, header format, rate limits) are not published, so this should be treated as an advanced, opt-in "power user" connector rather than the default path ([Craft API documentation](https://support.craft.do/en/integrate/api)). **Default path:** instruct the author to export Markdown or TextBundle from Craft and upload it; this works on every platform Craft ships on and sidesteps the undocumented auth surface entirely ([Craft document export](https://support.craft.do/en/import-and-export/export/document)). Note bulk export from Craft is Mac/iPad only, and Craft's web/Windows PDF export carries a watermark by default ([Craft document export](https://support.craft.do/en/import-and-export/export/document)).

#### Obsidian

**There is no official API.** An Obsidian vault is simply a folder of Markdown files plus a `.obsidian` config folder ([How Obsidian stores data](https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data)). The only HTTP surface is a third-party community plugin ("Local REST API"), which is desktop-only, binds to `127.0.0.1:27124`, and by construction **cannot be reached from Lit Technica's own servers** ([obsidian-local-rest-api repo](https://github.com/coddingtonbear/obsidian-local-rest-api)). **Build only the file-based path:** accept a multi-file `.md` selection or a zipped vault, parse with the same CommonMark pipeline used for Markdown import, and treat Obsidian-specific syntax (wiki-links, embeds) as an extension layer. For export, produce a folder (or zip) of `.md` files the author drops back into their vault, relying on Obsidian's automatic external-change refresh. Offer the Local REST API plugin only as a clearly-labelled advanced opt-in, with an explicit note it only works from the author's own machine.

#### ePub

The most structurally faithful import source after Markdown, because EPUB 3 (current W3C Recommendation, republished 2026-01-13) mandates a real package document with manifest, spine, and semantic navigation ([EPUB 3.3](https://www.w3.org/TR/epub-33/)). **Import:** unzip → `META-INF/container.xml` → `.opf` manifest/spine → parse XHTML content documents, mapping `epub:type` onto Lit Technica's chapter model; always sanitise imported XHTML and never enable scripted rendering (`epub.js` disables this by default for exactly this reason) ([epub.js repo](https://github.com/futurepress/epub.js)). **Export:** build via Pandoc's EPUB3 writer from the canonical Markdown, supplying metadata (`identifier`, `title`, `creator`, `lang`, `rights`, `cover-image`, accessibility fields) through a YAML block, then **validate every generated file with EPUBCheck** before handing it to the author ([Pandoc manual](https://pandoc.org/MANUAL.html#option--extract-media); [EPUBCheck repo](https://github.com/w3c/epubcheck)). Avoid the `epub-gen` npm package — its last release was 2019 ([epub-gen on npm](https://www.npmjs.com/package/epub-gen)).

### 5.2 Publishing & syndication platforms

#### WordPress (two connectors: WordPress.com and self-hosted)

The only platform in this document with a genuine, actively maintained, bidirectional write API on both its hosted and self-hosted variants.

**WordPress.com:** OAuth2 Authorization Code Flow; request only `posts media taxonomy` scopes; create posts via `POST /rest/v1.1/sites/$site/posts/new` ([Create a post](https://developer.wordpress.com/docs/api/1.1/post/sites/%24site/posts/new/)). **Critical implementation detail: the API's default `status` is `publish`** — Lit Technica must always send `status=draft` explicitly for any "send as draft" action, and `status=future` with a date for scheduling. Tokens currently expire in about two weeks, so build proactive silent refresh rather than letting connections quietly die ([WordPress.com OAuth2](https://developer.wordpress.com/docs/oauth2/)).

**Self-hosted:** Application Passwords via delegated authorization — probe `GET /wp-json/` for the `authorization` endpoint, redirect the author to their own site's `authorize-application.php` with `app_name=Lit Technica` and a stable `app_id` UUID, and receive the credential back via an HTTPS `success_url` rather than asking the author to hand-copy a password ([Application Passwords Integration Guide](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)). Requires the site to be served over HTTPS. Create/update via `POST /wp-json/wp/v2/posts` ([WP REST API — Posts](https://developer.wordpress.org/rest-api/reference/posts/)).

Neither variant publishes numeric rate limits; build backoff on `429`/`Retry-After` regardless. Offer WXR upload as an offline fallback import path, but flag that WXR exports link to media rather than including the files themselves ([WordPress.com Export support](https://wordpress.com/support/export/)).

#### Medium

**No usable API path for new integrations, full stop.** Medium's own help center states: "Medium will not be issuing any new integration tokens for our API and will not allow any new integrations. All existing tokens will continue to work." ([Medium Help Center](https://help.medium.com/hc/en-us/articles/213480228-API-Importing)). The docs repository is archived and read-only since March 2023 ([Medium/medium-api-docs](https://github.com/Medium/medium-api-docs)). **Do not build an OAuth Medium connector.** Instead: publish the chapter at a stable public URL (the author's own site or WordPress connection), then deep-link the author to Medium's own "Import a story" tool, which fetches the URL, automatically backdates the post, and automatically applies a canonical URL back to the original — Medium's supported and SEO-safe cross-posting mechanism ([Medium Help Center — Importing a post](https://help.medium.com/hc/en-us/articles/214550207-Import-a-post-to-Medium)). Offer profile/publication RSS as a partial, recent-only import path, clearly labelled — paywalled stories are excluded and feeds are effectively capped around 10 items ([Medium RSS help](https://help.medium.com/hc/en-us/articles/214874118-Using-RSS-feeds-of-profiles-publications-and-topics)).

#### Substack

Substack's new 2026 "Developer API" is a red herring for this use case — it is a single read-only LinkedIn-profile lookup with no posting, content, or subscriber capability whatsoever ([Substack API Terms of Use](https://substack.com/api-tos)). Substack has "deliberately never shipped a content API" ([usecarly.com analysis](https://www.usecarly.com/blog/claude-substack-integration/)); community tools that claim otherwise rely on the author's raw session cookie, a real security and ToS hazard that Lit Technica must not implement. The sanctioned path is RSS-driven: Substack's own importer lets an author paste an RSS/blog URL and pulls in the **15 most recent posts**; the same mechanism supports podcast import ([On Substack migration guide](https://on.substack.com/p/switch-newsletter)). Lit Technica's job is to generate a well-formed, publicly reachable RSS feed and instruct the author to paste its URL into Substack's importer — offering per-arc feeds to work around the 15-post ceiling for backlist chapters. For import, ingest the publication's own `/feed` and accept the user-initiated export ZIP (Settings → Exports) for full archives.

#### RSS/XML

The keystone syndication format. Generate both **RSS 2.0** (RSS Advisory Board spec v2.0.11) and **Atom 1.0** (RFC 4287) for every work: RSS for broadest consumer support (and because it's what Substack's importer and Apple Podcasts require), Atom for consumers wanting stable per-entry IDs and precise timestamps for revised chapters ([RSS 2.0 Specification](https://www.rssboard.org/rss-specification); [RFC 4287](https://datatracker.ietf.org/doc/html/rfc4287)). Give every chapter a permanent GUID/`atom:id` decoupled from its URL. Support optional `<enclosure>` for narrated-audio chapters (RSS 2.0 permits exactly one enclosure per item — audio and a downloadable EPUB cannot share an item) and gate an "Apple Podcasts-compatible" mode that adds `itunes:` namespace tags, artwork, and RFC 2822 dates when the author wants audiobook-style distribution ([Apple Podcasts RSS feed requirements](https://podcasters.apple.com/support/823-podcast-requirements)). Validate every generated feed with the W3C Feed Validation Service or the RSS Advisory Board's validator, wired into CI so template changes cannot silently break syndication ([W3C Feed Validation Service](https://validator.w3.org/feed/); [RSS Validator](https://www.rssboard.org/rss-validator/)).

Beyond this manuscript-distribution feed, additional purpose-built feed types (widget-app inspiration prompts, publisher/publicist micro-change tracking, gamification progress, version-history changelog) reusing this same `FeedDefinition`/RSS+Atom pipeline are captured, not yet sequenced, in the companion [Purpose-Built RSS Feeds sub-PRD v0.1](./lit-technica-purpose-built-rss-feeds-prd-v0.1.md).

#### GoodReads

**Import-only, and the API itself has been closed to new developers since 8 December 2020** ("Goodreads no longer issues new developer keys for our public developer API and plans to retire the current version of these tools" — [Goodreads Developers Group](https://www.goodreads.com/group/show/8095-goodreads-developers)), confirmed still closed as of 2026 ([Rollout integration guide](https://rollout.com/integration-guides/goodreads/api-essentials)). **No export/write path exists at all** — there is no way for Lit Technica to push a book listing, review, or shelf change to Goodreads on the author's behalf. The recommended default import is the author's own **user-initiated CSV export** (My Books → Tools → Import and Export → Export Library), which is complete and includes review text ([sample export CSV](https://www.goodreads.com/assets/sample_export.csv)). An optional, clearly-labelled advanced path is the legacy unauthenticated per-shelf RSS feed, keyed on numeric user ID, but this is undocumented, User-Agent filtered, and disallowed by Goodreads' robots.txt for automated fetchers — flag this for legal sign-off before shipping and never make it load-bearing ([Christi Richards build notes](https://christirichards.com/writing/currently-reading/)). Show Goodreads in the Connections UI explicitly as import-only, with a note that Goodreads does not allow apps to post reviews or books.

### 5.3 Narration & video

#### ElevenLabs

REST API, API-key-only (no OAuth exists for this service) — the key must never reach the browser and should be scope-restricted, credit-capped, and IP-allowlisted in ElevenLabs' dashboard ([ElevenLabs Authentication](https://elevenlabs.io/docs/api-reference/authentication)). Narration is billed per 1,000 characters (roughly $0.05–$0.10/1K depending on plan, ≈1,000 characters ≈ 1 minute of audio) ([ElevenLabs API pricing](https://elevenlabs.io/pricing/api)). **Per-request character ceilings force chunking of any real chapter**: `eleven_v3` caps at 5,000 characters, `eleven_multilingual_v2` at 10,000, `eleven_flash_v2_5` at 40,000 ([ElevenLabs Models](https://elevenlabs.io/docs/models)). Lit Technica must chunk chapters to the active model's limit, chain continuity across chunks via `previous_request_ids`/`next_request_ids`, and concatenate the returned audio segments itself — the API returns one audio payload per request, not an assembled audiobook. Rate limiting is **concurrency-based, not RPM** (Free tier: 2–4 concurrent requests; Creator: 5–10) ([ElevenLabs Models — concurrency](https://elevenlabs.io/docs/models)). If the author wants their own voice, Instant or Professional Voice Cloning both require an explicit in-product consent/verification step before any clone is usable, and commercial use requires a paid ElevenLabs plan ([Instant Voice Cloning](https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning); [ElevenLabs Terms of Service](https://elevenlabs.io/terms-of-use)). Implement as a server-side, asynchronous narration job (§3.5), with a Connections-page consent checkbox mirroring ElevenLabs' own cloning-consent language before enabling any voice-clone workflow.

#### YouTube (Shorts)

**There is no separate Shorts API.** A Short is simply a normal `videos.insert` upload whose file happens to meet Shorts criteria — up to 3 minutes, square or vertical aspect ratio, uploaded through the same endpoint as any other video ([videos.insert reference](https://developers.google.com/youtube/v3/docs/videos/insert); [Get started creating YouTube Shorts](https://support.google.com/youtube/answer/10059070)). OAuth2 is mandatory for any upload (`youtube.upload` scope minimum); API keys only cover public read calls ([YouTube Getting Started](https://developers.google.com/youtube/v3/getting-started)). **Critically, YouTube's API accepts a finished video file only — it does not generate video.** Lit Technica needs its own render stage (an ffmpeg worker composing the ElevenLabs narration audio with on-screen text, cover art, and captions into a Shorts-compatible MP4) before any upload call happens. Uploads from **unverified API projects are force-set to private** — an early API Compliance Audit is a prerequisite for any public-by-default publish flow — and the default quota is **100 `videos.insert` calls/day per project**, shared across all Lit Technica users unless increased ([videos.insert reference](https://developers.google.com/youtube/v3/docs/videos/insert); [YouTube Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)). Use the resumable-upload protocol for real files, publish `private`/`unlisted` first, and expose `containsSyntheticMedia` as a user-controlled toggle when AI narration/imagery is used ([Resumable Uploads guide](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol); [Videos resource reference](https://developers.google.com/youtube/v3/docs/videos)).

#### Adjacent / future: Instagram Reels and TikTok

Neither offers a simple self-serve "authenticate and post" flow the way YouTube does; both require platform review/audit before content is publicly visible. Instagram Reels needs a two-step container/publish flow on a Business/Creator account and — critically — the rendered video must already be hosted at a publicly reachable URL, since Meta fetches it server-side; publishing permission requires Meta App Review and is capped at 50 posts/24h ([Content Publishing guide](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/)). TikTok's Content Posting API restricts unaudited clients to 5 users/24h with mandatory private-only posting and prescriptive UX requirements (forced privacy selection, no default checked toggles, no branding overlays) ([TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started); [TikTok Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines)). Both are explicitly phase-2, deferred behind YouTube.

---

## 6. Connections page — acceptance criteria

- Given an author opens the Connections page with no connections, when they view it, then every platform in §4 appears as a card with an accurate direction badge and a plain-language description of what connecting would allow.
- Given an author connects a WordPress.com account, when they later export a chapter, then the default action creates a `draft` post, and scheduling or immediate publish are separate, explicit choices.
- Given an author disconnects a platform, when they view the Connections page afterward, then the stored credential is deleted (not merely hidden) and re-connecting requires a fresh authorization.
- Given an author has not connected any platform, when they export a manuscript, then portable folder, `.docx`, PDF, Markdown, HTML, and narration-script exports all still work with zero connected accounts, per the PRD's P0 contract.
- Given a platform has no supported export path (Medium, Substack, GoodReads), when the author views its card, then the UI states this explicitly rather than presenting a non-functional "Publish" button.
- Given a narration or video-render job is queued, when the author views the Connections page, then they see live per-job progress and can cancel a pending job.

---

## 7. Data model additions

New tables/entities layered onto the existing v0.3 per-owner SQLite model:

| Entity | Core fields |
|---|---|
| **Connection** | owner_id, platform_id, auth_type, encrypted_credential, scope, connected_at, last_used_at, status |
| **ImportJob** | connection_id (nullable for file uploads), source_type, source_ref, status, created_items[] |
| **ExportJob** | manuscript_id, connection_id (nullable), target_format, status, result_ref, error |
| **NarrationJob** | chapter_id, connection_id, voice_id, model_id, chunk_plan[], status, output_ref |
| **VideoRenderJob** | chapter_id or excerpt_ref, narration_job_id (optional), status, output_ref |
| **FeedDefinition** | scope (per-author / per-work / per-arc), format (rss2/atom), last_built_at, public_url |

---

## 8. Security, privacy, and legal considerations

- **Encryption at rest is blocking** for any connector beyond file upload (§3.6); this must be resolved alongside the PRD's existing "encrypted workspace" open question rather than as a separate, later effort.
- **Sanitise everything on import.** mammoth.js performs no HTML sanitisation and epub.js explicitly recommends server-side sanitisation of imported EPUB content ([mammoth.js](https://github.com/mwilliamson/mammoth.js); [epub.js repo](https://github.com/futurepress/epub.js)).
- **Never touch session cookies** for Substack or any platform without a sanctioned API — this is a standing security and ToS hazard flagged specifically in the Substack research and must be a hard rule for any future connector, not just Substack.
- **Respect platform terms explicitly reviewed during research:** Automattic's WordPress.com terms prohibit using WordPress.com content to compete with Automattic products — a legal review item since WordPress.com is itself a writing/publishing product ([Automattic API guidelines](https://developer.wordpress.com/docs/api/guidelines-for-responsible-use-of-automattics-apis/)); Substack's Developer API terms restrict any data actually pulled through it to non-competitive, attributed use ([Substack API Terms of Use](https://substack.com/api-tos)).
- **Goodreads shelf RSS is robots.txt-disallowed for automated fetchers** — treat as a compliance question for legal sign-off, not just an engineering choice, and never make it load-bearing for a core flow.
- **ElevenLabs voice cloning requires explicit, recorded consent** before any clone is created from a real person's voice, mirrored in Lit Technica's own UI rather than assumed from ElevenLabs' dashboard alone ([Instant Voice Cloning](https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning)).
- **YouTube/TikTok/Instagram all impose platform-side review before public visibility** — plan audit/App Review lead time into any release schedule that assumes public-by-default publishing.

---

## 9. Build order

1. **Canonical Markdown pipeline + file-based import/export** for Txt, Markdown, `.docx` (mammoth/docx-npm/Pandoc), PDF (PDFKit/Puppeteer/PDF.js), ePub (Pandoc EPUB3 writer + EPUBCheck), Obsidian (vault folder/zip), Craft (Markdown/TextBundle), GoodReads (CSV upload). No accounts, no OAuth, immediate value, closes most of the PRD's existing P2 "Import of Word documents, Obsidian vaults" line item.
2. **RSS/Atom generation.** Unlocks Substack's importer and the podcast/audiobook distribution path, and gives every laggard platform (Medium, Substack, GoodReads) a working import route into Lit Technica. No vendor relationship required.
3. **WordPress connectors** (self-hosted Application Passwords, then WordPress.com OAuth2) — the only genuinely bidirectional publishing integrations available in 2026.
4. **Google Docs connector** (`drive.file` + Picker) and **optional Microsoft Graph/OneDrive connector** — highest-value account-based document connectors, gated behind the OAuth verification/token-storage work.
5. **ElevenLabs narration jobs** — after the async job queue exists; provider-neutral export contract should be stable first, per the PRD's existing P2 note.
6. **YouTube Shorts publishing** — after a video-render worker exists and the API Compliance Audit is underway.
7. **Medium and Substack handoff flows** (canonical-URL import deep link; RSS-paste-into-importer instructions) — thin UI wrappers around already-built RSS/export capability, not new integrations.
8. **Phase 2 (deferred): Instagram Reels, TikTok** — only after public media hosting and platform review processes are in place.

## 10. Risks and mitigations (additions to PRD risk table)

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Credential storage regression** | Every OAuth/API-key connector needs encryption at rest, which v0.3 does not yet have. | Treat as a blocking dependency shared with the PRD's existing encryption-at-rest open question; do not ship any non-file-based connector before it closes. |
| **Platform capability mismatch with author expectations** | Authors may assume Medium/Substack/Goodreads work like WordPress. | Label every card's real capability plainly in the Connections UI; never present a broken "Publish" button. |
| **Silent auth expiry** | WordPress.com tokens expire in ~2 weeks; other platforms may revoke without notice. | Proactive refresh before expiry, visible "needs reconnect" status, no silent job failures. |
| **Vendor quota starvation** | YouTube's 100 uploads/day and ElevenLabs' concurrency caps are shared per project across all users if using a platform-wide key. | Per-user fair-use queueing; consider allowing power users to supply their own API project/key. |
| **Fragile unofficial paths** | Goodreads shelf RSS and any Substack session-cookie approach can break or violate ToS without warning. | Never make these load-bearing; keep the CSV-upload and RSS-paste paths as the supported defaults; monitor and gate advanced options behind explicit "unsupported" labelling. |
| **Sanitisation gaps on import** | mammoth.js and EPUB import both carry documented security/sanitisation caveats. | Route every import through a shared sanitisation step regardless of source connector. |

## 11. Open questions (additions to PRD open questions)

| Question | Owner | Blocking? |
|---|---|---|
| What encryption-at-rest design protects connector credentials (OAuth tokens, Application Passwords, API keys), and does it share the same design as the PRD's existing local-folder encryption question? | Engineering / security | **Blocking before any non-file-based connector ships** |
| Does Lit Technica operate its own platform-wide API keys/OAuth apps (billing usage to the author) for ElevenLabs/YouTube/Google, or require bring-your-own credentials? | Product / engineering | Blocking before narration/video connectors ship |
| What is the author-facing UX for platforms with no export path at all (Medium, Substack, Goodreads) — pure documentation, or an active in-app "copy for Medium" helper? | Product / design | Non-blocking for RSS/file-based build order; blocking before those cards ship |
| Who owns the YouTube API Compliance Audit application and Meta/TikTok App Review submissions, and on what timeline? | Product / legal | Blocking before public-by-default video/social publishing |
| Does Lit Technica pursue a live Craft API connector, or ship file-based Craft support only given the undocumented auth surface? | Product / engineering | Non-blocking — file-based path can ship independently |

---

## Sources

**Google Docs / Drive**
- [Docs API — `documents.create`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/create)
- [Docs API — document concepts](https://developers.google.com/workspace/docs/api/concepts/document)
- [Docs API — Work with tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs)
- [Drive API — export MIME types](https://developers.google.com/workspace/drive/api/guides/ref-export-formats)
- [Drive API — manage downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads)
- [Drive API — upload file data](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Drive API — API-specific authorization](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Drive API — usage limits and quotas](https://developers.google.com/workspace/drive/api/guides/limits)
- [Google Picker — overview](https://developers.google.com/workspace/drive/picker/guides/overview)
- [Google Cloud — OAuth app verification](https://support.google.com/cloud/answer/13463073)

**Microsoft Word / Graph**
- [Microsoft Graph — driveItem: get content in another format](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format)
- [Microsoft Graph — driveItem: createUploadSession](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession)
- [Microsoft Graph — throttling limits](https://learn.microsoft.com/en-us/graph/throttling-limits)
- [OneDrive File Picker v8](https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/)
- [mammoth.js](https://github.com/mwilliamson/mammoth.js)
- [python-docx](https://python-docx.readthedocs.io/en/latest/)
- [docx (npm)](https://docx.js.org/)

**Txt / PDF / Markdown**
- [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/)
- [Calibre `ebook-convert` manual](https://manual.calibre-ebook.com/generated/en/ebook-convert.html)
- [Puppeteer `page.pdf`](https://pptr.dev/api/puppeteer.page.pdf)
- [wkhtmltopdf (archived)](https://github.com/wkhtmltopdf/wkhtmltopdf)
- [PDFKit](https://github.com/foliojs/pdfkit)
- [PDF.js — `PDFPageProxy` API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html)
- [CommonMark Spec 0.31.2](https://spec.commonmark.org/0.31.2/)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [Pandoc manual — metadata blocks](https://pandoc.org/MANUAL.html#metadata-blocks)

**Craft / Obsidian / ePub**
- [Craft — API documentation](https://support.craft.do/en/integrate/api)
- [Craft — MCP security](https://support.craft.do/en/integrate/mcp/security)
- [Craft — export a document](https://support.craft.do/en/import-and-export/export/document)
- [Craft — import options](https://www.craft.do/s/gy4OMeABSTIlUw/b/793922A4-0E22-4890-9341-5F2E710F1C74/Import-Options)
- [Obsidian — how Obsidian stores data](https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data)
- [Obsidian Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [EPUB 3.3, W3C Recommendation](https://www.w3.org/TR/epub-33/)
- [Pandoc — creating an ebook with EPUB](https://pandoc.org/epub.html)
- [EPUBCheck](https://github.com/w3c/epubcheck)

**WordPress / Medium / Substack / Goodreads / RSS**
- [WordPress.com OAuth2](https://developer.wordpress.com/docs/oauth2/)
- [WordPress.com — Create a post](https://developer.wordpress.com/docs/api/1.1/post/sites/%24site/posts/new/)
- [Guidelines for Responsible Use of Automattic APIs](https://developer.wordpress.com/docs/api/guidelines-for-responsible-use-of-automattics-apis/)
- [WP REST API — Posts](https://developer.wordpress.org/rest-api/reference/posts/)
- [Application Passwords Integration Guide](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)
- [Medium/medium-api-docs (archived)](https://github.com/Medium/medium-api-docs)
- [Medium Help Center — API/Importing](https://help.medium.com/hc/en-us/articles/213480228-API-Importing)
- [Medium Help Center — Importing a post to Medium](https://help.medium.com/hc/en-us/articles/214550207-Import-a-post-to-Medium)
- [Substack API Terms of Use](https://substack.com/api-tos)
- [On Substack — How to migrate your newsletter](https://on.substack.com/p/switch-newsletter)
- [usecarly.com — Claude + Substack analysis](https://www.usecarly.com/blog/claude-substack-integration/)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [RFC 4287 — The Atom Syndication Format](https://datatracker.ietf.org/doc/html/rfc4287)
- [Apple Podcasts — RSS feed requirements](https://podcasters.apple.com/support/823-podcast-requirements)
- [W3C Feed Validation Service](https://validator.w3.org/feed/)
- [Goodreads Developers Group](https://www.goodreads.com/group/show/8095-goodreads-developers)
- [Goodreads — sample library export CSV](https://www.goodreads.com/assets/sample_export.csv)
- [Christi Richards — Build Notes: Currently Reading](https://christirichards.com/writing/currently-reading/)

**ElevenLabs / YouTube / Instagram / TikTok**
- [ElevenLabs — API Authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [ElevenLabs — Create speech reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [ElevenLabs — Models](https://elevenlabs.io/docs/models)
- [ElevenLabs — API pricing](https://elevenlabs.io/pricing/api)
- [ElevenLabs — Instant Voice Cloning](https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning)
- [ElevenLabs — Terms of Service](https://elevenlabs.io/terms-of-use)
- [YouTube Data API — `videos.insert` reference](https://developers.google.com/youtube/v3/docs/videos/insert)
- [YouTube Data API — Resumable Uploads guide](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
- [YouTube Data API — Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [YouTube — Get started creating YouTube Shorts](https://support.google.com/youtube/answer/10059070)
- [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [Meta — Content Publishing using the Instagram API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/)
- [TikTok — Content Posting API, Get Started](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [TikTok — Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines)
