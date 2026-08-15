import { useState } from "react";
import { Check, ClipboardCopy, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton, Panel, StatusPill } from "@/components/fields";
import { useConnections, useSnapshot } from "@/lib/workspace";
import { copyText, downloadExport, exportSpecs, type ExportKind, type ExportResult } from "@/lib/exporters";
import type { ConnectorAvailability, ConnectorState } from "@shared/schema";

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

export default function ConnectionsPage() {
  const { data, isLoading, isError } = useConnections();
  const { data: snapshot } = useSnapshot();
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
            Proven here: RSS and Atom feeds are generated live from your own "Ready to read" scenes,
            entirely client-side, with no account.
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
