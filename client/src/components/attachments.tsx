import { useRef } from "react";
import { FileAudio, FileImage, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSnapshot, useStoryActions } from "@/lib/workspace";
import type { EntityKind } from "@shared/schema";

const prettySize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Attachment area. The prototype records the file the author picked — name,
 * type and size — and links it to the item. It deliberately does not copy or
 * upload the file: in the shipped product the original stays in the author's
 * own project folder.
 */
export function AttachmentArea({
  ownerKind,
  ownerId,
  label = "Reference material",
}: {
  ownerKind: EntityKind;
  ownerId: string;
  label?: string;
}) {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = (snapshot?.attachments ?? []).filter(
    (a) => a.ownerKind === ownerKind && a.ownerId === ownerId,
  );

  return (
    <div className="space-y-2" data-testid={`panel-attachments-${ownerId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          data-testid={`button-attach-${ownerId}`}
        >
          <Paperclip className="mr-1.5 h-3.5 w-3.5" /> Attach a file
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-label={`Attach a reference file to this ${ownerKind}`}
        data-testid={`input-attach-${ownerId}`}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          await actions.create("attachments", {
            ownerKind,
            ownerId,
            fileName: file.name,
            mimeType: file.type || "unknown",
            size: file.size,
            caption: "",
          });
          e.target.value = "";
        }}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid={`text-noattachments-${ownerId}`}>
          No reference files on this item yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-sm border border-border bg-background/60 px-3 py-2"
              data-testid={`row-attachment-${a.id}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {a.mimeType.startsWith("audio") ? (
                  <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="min-w-0">
                  <span
                    className="block truncate text-sm font-medium"
                    data-testid={`text-attachment-name-${a.id}`}
                  >
                    {a.fileName}
                  </span>
                  <span
                    className="block text-xs text-muted-foreground"
                    data-testid={`text-attachment-meta-${a.id}`}
                  >
                    {a.mimeType} · {prettySize(a.size)}
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => actions.remove("attachments", a.id)}
                aria-label={`Remove ${a.fileName} from this item`}
                data-testid={`button-remove-attachment-${a.id}`}
                className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Prototype behaviour: the file itself is never copied or uploaded. Only its name, type and
        size are recorded for this session, and the reference is lost when the prototype restarts.
      </p>
    </div>
  );
}
