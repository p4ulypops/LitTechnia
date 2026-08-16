import { useState, useEffect } from "react";
import { Inbox, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSnapshot, useStoryActions, useWorkspace } from "@/lib/workspace";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { importKinds, type CaptureItem, type ImportKind } from "@shared/schema";
import { kindLabels } from "@/lib/workspace";

/**
 * Sub-PRD B — the capture inbox.
 *
 * A low-friction "new note" route plus a PWA share-target. Captures preserve
 * verbatim input and require confirmation before classification to a note or
 * story item. This is the stand-in for the blocked Apple Reminders/Calendar
 * sync — it delivers the underlying user need (fast capture) with no external
 * protocol.
 *
 * All text fields accept OS-level system dictation input. An acceptance test
 * verifies dictated text is preserved verbatim — there is no Wispr integration.
 */
export default function CaptureInboxPage() {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const { activeProjectId } = useWorkspace();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [classifying, setClassifying] = useState<CaptureItem | null>(null);

  // PWA share-target: when the app receives a share, the text arrives as a
  // query parameter on the /#/capture route. Pre-fill the capture form so the
  // author can review and confirm — the text is never auto-saved without
  // confirmation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("body") || params.get("text") || params.get("title");
    if (shared) {
      setDraft(shared);
      // Clean the URL so a refresh doesn't re-fill the form.
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, "", cleanUrl);
    }
  }, []);

  const items = (snapshot?.captureItems ?? []).filter((c) => c.status === "inbox");

  const submit = async () => {
    if (!draft.trim()) return;
    await actions.create("captureItems", {
      body: draft,
      source: "in_app",
      status: "inbox",
    });
    setDraft("");
    toast({ title: "Captured", description: "Your thought is in the inbox." });
  };

  const dismiss = async (id: string) => {
    await actions.patch("captureItems", id, { status: "dismissed" });
  };

  const classify = async (kind: ImportKind, title: string) => {
    if (!classifying || !activeProjectId) return;
    try {
      await apiRequest(
        "POST",
        `/api/projects/${activeProjectId}/capture-items/${classifying.id}/classify`,
        { kind, title },
      );
      await queryClient.invalidateQueries();
      setClassifying(null);
      toast({
        title: "Classified",
        description: `Saved as a ${kindLabels[kind].toLowerCase()}.`,
      });
    } catch (err) {
      toast({
        title: "Classification failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Capture inbox</h1>
        <p className="text-sm text-muted-foreground">
          Quick thoughts land here unclassified. Dictate freely — every field accepts
          system dictation. Classify when you're ready; the verbatim text is always preserved.
        </p>
      </div>

      <div className="space-y-2" data-testid="panel-capture-form">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type or dictate a thought…"
          rows={3}
          data-testid="input-capture-body"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            ⌘+Enter to capture · dictation-friendly
          </p>
          <Button
            onClick={submit}
            disabled={!draft.trim() || actions.pending}
            data-testid="button-capture-submit"
          >
            <Inbox className="mr-1.5 h-4 w-4" /> Capture
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground" data-testid="text-empty-inbox">
            Nothing captured yet. The inbox holds raw thoughts until you sort them.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border bg-card p-4 space-y-2"
            data-testid={`card-capture-${item.id}`}
          >
            <p className="text-sm whitespace-pre-wrap" data-testid={`text-capture-body-${item.id}`}>
              {item.body}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setClassifying(item)}
                data-testid={`button-classify-${item.id}`}
              >
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Classify
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismiss(item.id)}
                data-testid={`button-dismiss-${item.id}`}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>

      {classifying && (
        <ClassifyDialog
          item={classifying}
          onClassify={classify}
          onClose={() => setClassifying(null)}
        />
      )}
    </div>
  );
}

function ClassifyDialog({
  item,
  onClassify,
  onClose,
}: {
  item: CaptureItem;
  onClassify: (kind: ImportKind, title: string) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ImportKind>("note");
  const [title, setTitle] = useState(item.body.slice(0, 60).split("\n")[0] || "Untitled");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="dialog-classify">
        <DialogHeader>
          <DialogTitle>Classify this capture</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Verbatim text (preserved):</p>
            <p className="text-sm whitespace-pre-wrap" data-testid="text-classify-verbatim">
              {item.body}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Classify as</label>
            <Select value={kind} onValueChange={(v) => setKind(v as ImportKind)}>
              <SelectTrigger data-testid="select-classify-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {importKinds.map((k) => (
                  <SelectItem key={k} value={k} data-testid={`option-classify-${k}`}>
                    {kindLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-classify-title"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onClassify(kind, title)}
            disabled={!title.trim()}
            data-testid="button-classify-confirm"
          >
            Classify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
