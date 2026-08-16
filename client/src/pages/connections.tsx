import { useState } from "react";
import { Check, ClipboardCopy, Download, Eye, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ListSkeleton, Panel, StatusPill } from "@/components/fields";
import { feedsKey, useConnections, useProjectFeeds, useSnapshot, useWorkspace } from "@/lib/workspace";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { copyText, downloadExport, exportSpecs, type ExportKind, type ExportResult } from "@/lib/exporters";
import type {
  ConnectorAvailability,
  ConnectorState,
  CreatedFeedResponse,
  FeedDetailLevel,
  PublicFeedDefinition,
} from "@shared/schema";

const stateCopy: Record<ConnectorState, { label: string; tone: "neutral" | "accent" | "quiet" }> = {
  available: { label: "available now", tone: "accent" },
  file_based: { label: "works now, no account", tone: "accent" },
  handoff_only: { label: "manual handoff", tone: "neutral" },
  setup_required: { label: "needs setup", tone: "quiet" },
  blocked_security: { label: "not enabled yet", tone: "quiet" },
  unsupported: { label: "not built yet", tone: "quiet" },
};

const categoryLabel: Record<ConnectorAvailability["category"], string> = {
  file: "Files",
  feed: "Feeds",
  publish: "Publishing",
  docs: "Documents",
  narration: "Narration",
  video: "Video",
};

const categoryOrder: ConnectorAvailability["category"][] = [
  "file",
  "feed",
  "publish",
  "docs",
  "narration",
  "video",
];

const feedKinds: ExportKind[] = ["rss", "atom"];

const detailLevelCopy: Record<FeedDetailLevel, { label: string; hint: string }> = {
  metadata_only: {
    label: "Titles only",
    hint: "Scene titles and timestamps only — no prose is ever sent.",
  },
  summary: {
    label: "Titles & short excerpts",
    hint: "The first few lines of each ready scene, never the full text.",
  },
  full: {
    label: "Full text",
    hint: "The complete text of every ready scene — treat the URL like a manuscript copy.",
  },
};

export default function ConnectionsPage() {
  const { data, isLoading, isError } = useConnections();
  const { data: snapshot } = useSnapshot();
  const { activeProjectId } = useWorkspace();
  const [last, setLast] = useState<ExportResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExportKind | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState
          title="Couldn't read connector availability"
          body="Reloading the page usually fixes this. Nothing about your book is affected."
          testId="empty-connections-error"
        />
      </div>
    );
  }

  const byCategory = new Map<ConnectorAvailability["category"], ConnectorAvailability[]>();
  for (const connector of data.connectors) {
    const list = byCategory.get(connector.category) ?? [];
    list.push(connector);
    byCategory.set(connector.category, list);
  }

  const previewText = preview && snapshot ? exportSpecs[preview].build(snapshot) : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="max-w-2xl">
        <p className="eyebrow">Material</p>
        <h1 className="font-serif text-xl font-medium leading-tight">Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every capability below is reported by the server from real configuration, not a hand-written
          status label. Nothing here can silently become live — a card only changes state after the
          underlying feature is actually built and reviewed.
        </p>
      </div>

      {categoryOrder
        .filter((category) => byCategory.has(category))
        .map((category) => (
          <div key={category} className="space-y-3">
            <h2 className="eyebrow" data-testid={`heading-connections-${category}`}>
              {categoryLabel[category]}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {byCategory.get(category)!.map((connector) => (
                <Panel
                  key={connector.id}
                  testId={`panel-connector-${connector.id}`}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-base leading-tight">{connector.name}</h3>
                    <StatusPill
                      label={stateCopy[connector.state].label}
                      tone={stateCopy[connector.state].tone}
                      testId={`status-connector-${connector.id}`}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{connector.summary}</p>
                  <p
                    className="rounded-sm border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground"
                    data-testid={`text-connector-reason-${connector.id}`}
                  >
                    {connector.reason}
                  </p>
                  {connector.actionHref && (
                    <a
                      href={connector.actionHref}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      data-testid={`link-connector-action-${connector.id}`}
                    >
                      {connector.actionLabel ?? "Open"} →
                    </a>
                  )}
                </Panel>
              ))}
            </div>
          </div>
        ))}

      <Panel eyebrow="Feeds" title="Generate your RSS or Atom feed" testId="panel-connections-feed">
        {!snapshot ? (
          <p className="text-sm text-muted-foreground">Open a book first to generate its feed.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Built in your browser from <strong className="font-medium">{snapshot.project.title}</strong>,
              from scenes marked "Ready to read" only — draft-zero material is never included. This
              prototype doesn't track a per-scene edit time, so every item in one feed shares a single
              "generated at" timestamp rather than a fabricated distinct one.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {feedKinds.map((kind) => {
                const spec = exportSpecs[kind];
                return (
                  <div key={kind} className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setLast(downloadExport(snapshot, kind))}
                      data-testid={`button-export-${kind}`}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> {spec.label}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      data-testid={`button-copy-${kind}`}
                      onClick={async () => {
                        const ok = await copyText(spec.build(snapshot));
                        setCopied(ok ? kind : `${kind}-failed`);
                        window.setTimeout(() => setCopied(null), 2500);
                      }}
                    >
                      <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" /> Copy text
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreview(preview === kind ? null : kind)}
                      data-testid={`button-preview-${kind}`}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> {preview === kind ? "Hide" : "Preview"}
                    </Button>
                    {copied === kind && (
                      <span className="flex items-center gap-1 text-xs text-primary" role="status">
                        <Check className="h-3 w-3" /> copied to clipboard
                      </span>
                    )}
                    {copied === `${kind}-failed` && (
                      <span className="text-xs text-muted-foreground" role="status">
                        clipboard blocked — use Preview and select the text
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {last && (
              <p className="mt-3 text-xs text-muted-foreground" data-testid="text-connections-last-export">
                {last.fileName} · {last.bytes.toLocaleString()} bytes · {last.at}
              </p>
            )}
            {preview && (
              <textarea
                readOnly
                value={previewText.slice(0, 4000)}
                aria-label={`${exportSpecs[preview].label} preview text`}
                data-testid="text-connections-preview"
                className="mt-3 h-64 w-full resize-y rounded-sm border border-border bg-background/60 p-3 font-mono text-xs"
              />
            )}

            {/* Hosted feeds: the server-rendered, token-addressed form of the
                same feed. Management lives in this panel, not in the
                connector card array above. */}
            {activeProjectId && (
              <HostedFeeds projectId={activeProjectId} projectTitle={snapshot.project.title} />
            )}
          </>
        )}
      </Panel>

      <Panel eyebrow="What this proves, and what it doesn't" title="Honest limits">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            Proven here: every card's state comes from the server reading real, non-secret
            configuration — never a client-side guess, and never a bare label without a reason.
          </li>
          <li>
            Proven here: RSS and Atom feeds of your "Ready to read" scenes work two ways — generated
            live in your browser with no account, and minted as a hosted, token-addressed URL that
            any feed reader can subscribe to until you revoke it.
          </li>
          <li>
            Not proven here: any OAuth flow, encrypted credential storage, or publish/upload job has
            been built. Every account-backed connector reports <code>blocked_security</code> this
            release regardless of whether its environment variables are set, because the shared
            prerequisite — encrypted-at-rest credential storage — doesn't exist yet.
          </li>
          <li>
            LitTechnia will never publish to Medium or Substack on your behalf; those cards describe
            the manual handoff through your own feed, not a hidden integration.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

/**
 * The hosted-feed manager inside the Feeds panel: list the book's feeds, mint
 * a new one (URL shown exactly once), revoke one (hard 404 on the public
 * route). Deliberately NOT a per-feed connector card.
 */
function HostedFeeds({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const { data, isLoading, isError } = useProjectFeeds(projectId);
  const [detailLevel, setDetailLevel] = useState<FeedDetailLevel>("metadata_only");
  const [audienceLabel, setAudienceLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<CreatedFeedResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const feeds = data?.feeds ?? [];
  const live = feeds.filter((feed) => !feed.revokedAt);
  const revoked = feeds.filter((feed) => feed.revokedAt);

  const createFeed = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await apiRequest("POST", `/api/projects/${projectId}/feeds`, {
        feedType: "manuscript",
        detailLevel,
        audienceLabel: audienceLabel.trim(),
      });
      const created = (await res.json()) as CreatedFeedResponse;
      setMinted(created);
      setCopiedUrl(false);
      setAudienceLabel("");
      await queryClient.invalidateQueries({ queryKey: feedsKey(projectId) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The feed could not be created.");
    } finally {
      setPending(false);
    }
  };

  const revokeFeed = async (feedId: string) => {
    await apiRequest("POST", `/api/projects/${projectId}/feeds/${feedId}/revoke`);
    await queryClient.invalidateQueries({ queryKey: feedsKey(projectId) });
  };

  return (
    <div className="mt-6 border-t border-border pt-5" data-testid="panel-hosted-feeds">
      <h3 className="font-serif text-base leading-tight">Hosted feed URLs</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Mint a URL for <strong className="font-medium">{projectTitle}</strong> that renders this
        same feed on the server, so a feed reader can subscribe to it directly — for Substack's
        importer, a podcast tool, or anyone you hand the link to.
      </p>
      <p
        className="mt-2 rounded-sm border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground"
        data-testid="text-hosted-feed-notice"
      >
        Anyone who has the link can read the feed — no sign-in. The link is effectively public once
        shared, and it cannot be recovered later: only its hash is stored. Revoking a feed makes its
        URL answer 404 immediately. This is a notification channel, not collaboration — readers get
        no access to your book.
      </p>

      {isLoading && <ListSkeleton rows={2} />}
      {isError && (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="text-hosted-feeds-error">
          Couldn't load this book's feeds. The page can be reloaded safely — nothing is affected.
        </p>
      )}

      {!isLoading && !isError && live.length > 0 && (
        <ul className="mt-4 space-y-2" data-testid="list-hosted-feeds">
          {live.map((feed) => (
            <HostedFeedRow key={feed.id} feed={feed} onRevoke={revokeFeed} />
          ))}
        </ul>
      )}

      {!isLoading && !isError && live.length === 0 && !minted && (
        <p className="mt-4 text-sm text-muted-foreground" data-testid="text-hosted-feeds-empty">
          No hosted feeds yet. Mint one to get a URL you can paste into any feed reader.
        </p>
      )}

      {revoked.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground" data-testid="text-hosted-feeds-revoked">
          {revoked.length} revoked {revoked.length === 1 ? "feed" : "feeds"}:{" "}
          {revoked.map((feed) => feed.audienceLabel || `created ${feed.createdAt.slice(0, 10)}`).join(", ")}{" "}
          — their URLs now answer 404.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="feed-detail-level" className="eyebrow">
            How much each item shows
          </Label>
          <Select value={detailLevel} onValueChange={(value) => setDetailLevel(value as FeedDetailLevel)}>
            <SelectTrigger data-testid="select-feed-detail-level" aria-label="Feed detail level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(detailLevelCopy) as FeedDetailLevel[]).map((level) => (
                <SelectItem key={level} value={level} data-testid={`option-feed-detail-${level}`}>
                  {detailLevelCopy[level].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{detailLevelCopy[detailLevel].hint}</p>
        </div>
        <div className="min-w-48 space-y-1.5">
          <Label htmlFor="feed-audience-label" className="eyebrow">
            Label (optional, only you see it)
          </Label>
          <Input
            id="feed-audience-label"
            value={audienceLabel}
            onChange={(event) => setAudienceLabel(event.target.value)}
            placeholder='e.g. "for my publicist"'
            maxLength={120}
            data-testid="input-feed-audience-label"
          />
        </div>
        <Button size="sm" onClick={createFeed} disabled={pending} data-testid="button-create-feed">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {pending ? "Minting…" : "Mint a feed URL"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert" data-testid="text-create-feed-error">
          {error}
        </p>
      )}

      {minted && (
        <div
          className="mt-4 rounded-sm border border-primary/40 bg-primary/5 px-4 py-3"
          data-testid="panel-feed-minted"
        >
          <p className="text-sm font-medium">
            Your new feed URL — shown once, right now. Copy it before leaving this page:
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code
              className="break-all rounded-sm border border-border bg-background/80 px-2 py-1 font-mono text-xs"
              data-testid="text-feed-url"
            >
              {minted.url}
            </code>
            <Button
              size="sm"
              variant="secondary"
              data-testid="button-copy-feed-url"
              onClick={async () => {
                const ok = await copyText(minted.url);
                setCopiedUrl(ok);
                if (ok) window.setTimeout(() => setCopiedUrl(false), 2500);
              }}
            >
              <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" /> Copy URL
            </Button>
            {copiedUrl && (
              <span className="flex items-center gap-1 text-xs text-primary" role="status">
                <Check className="h-3 w-3" /> copied to clipboard
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Only a hash of this URL's token is stored, so it cannot be shown again. If you lose it,
            revoke this feed and mint a new one. RSS 2.0 is served by default; add{" "}
            <code>?format=atom</code> to the URL for Atom 1.0.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            data-testid="button-dismiss-minted-feed"
            onClick={() => setMinted(null)}
          >
            Done — I've saved the URL
          </Button>
        </div>
      )}
    </div>
  );
}

function HostedFeedRow({
  feed,
  onRevoke,
}: {
  feed: PublicFeedDefinition;
  onRevoke: (feedId: string) => Promise<void>;
}) {
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background/60 px-3 py-2"
      data-testid={`row-hosted-feed-${feed.id}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {feed.audienceLabel || "Manuscript feed"}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            · {detailLevelCopy[feed.detailLevel as FeedDetailLevel]?.label ?? feed.detailLevel} ·{" "}
            created {feed.createdAt.slice(0, 10)}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="h-3 w-3 shrink-0" />
          Live at its unguessable URL — the address was shown once at mint time and is not stored.
        </p>
      </div>
      <ConfirmDialog
        testId={`revoke-feed-${feed.id}`}
        title="Revoke this feed?"
        description="The feed's URL stops working immediately — it answers 404, for everyone, and there is no undo. You can mint a fresh URL afterwards. Nothing in your book is touched."
        confirmLabel="Revoke feed"
        pendingLabel="Revoking…"
        tone="destructive"
        onConfirm={() => onRevoke(feed.id)}
        trigger={
          <Button size="sm" variant="ghost" data-testid={`button-revoke-feed-${feed.id}`}>
            Revoke
          </Button>
        }
      />
    </li>
  );
}
