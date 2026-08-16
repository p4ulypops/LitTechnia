/**
 * Visual reference gallery (Sub-PRD A — upload-only MVP).
 *
 * Authors upload their own photos — including photos of real people they
 * know — to inspire characters, world entries and scenes. The rules this
 * component keeps visible rather than hidden in prose:
 *
 *   - Originals are preserved: a gentle edit saves as a NEW derived image,
 *     never overwrites the upload.
 *   - A real-world reference is an attachment with role "real_world_ref" and
 *     an optional private note — never a links row. It is visually distinct
 *     and is excluded from every export by default.
 *   - Uploads are raster images only: PNG, JPEG, WebP, GIF, AVIF. SVG is
 *     refused at the server (it can carry active content).
 */
import { useRef, useState } from "react";
import {
  Download,
  Eye,
  ImagePlus,
  Image as ImageIcon,
  Link2,
  Loader2,
  Paperclip,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/fields";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageEditorDialog } from "@/components/image-editor";
import { useSnapshot, useStoryActions } from "@/lib/workspace";
import { UPLOAD_MIME_ALLOWLIST, isIdentityEdit, type ImageEditOps } from "@shared/media";
import type { Attachment, EntityKind } from "@shared/schema";

const prettySize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const prettyDate = (iso: string) => {
  if (!iso) return "unknown date";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
};

/** The gallery grid card for one attachment. */
function GalleryCard({
  attachment,
  thumbnailUrl,
  contentUrl,
  isDisplayImage,
  displayCount,
  onSetDisplay,
  onClearDisplay,
  onEdit,
  onRemove,
  pending,
}: {
  attachment: Attachment;
  thumbnailUrl: string;
  contentUrl: string;
  isDisplayImage: boolean;
  displayCount: number;
  onSetDisplay: () => void;
  onClearDisplay: () => void;
  onEdit: () => void;
  onRemove: () => void;
  pending: boolean;
}) {
  return (
    <li
      className="overflow-hidden rounded-sm border border-border bg-background/60"
      data-testid={`gallery-card-${attachment.id}`}
      data-role={attachment.role}
    >
      <div className="relative aspect-[4/3] bg-muted/40">
        <img
          src={thumbnailUrl}
          alt={attachment.altText || attachment.caption || attachment.fileName}
          loading="lazy"
          className="h-full w-full object-cover"
          data-testid={`img-thumb-${attachment.id}`}
        />
        {attachment.role === "real_world_ref" && (
          <Badge
            variant="secondary"
            className="absolute left-1.5 top-1.5 border-amber-600/40 bg-amber-100/90 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200"
            data-testid={`badge-realworld-${attachment.id}`}
          >
            Real-world reference · private
          </Badge>
        )}
        {isDisplayImage && (
          <Badge
            variant="secondary"
            className="absolute right-1.5 top-1.5 bg-primary/90 text-primary-foreground"
            data-testid={`badge-display-${attachment.id}`}
          >
            <Star className="mr-1 h-3 w-3" aria-hidden /> Display image
          </Badge>
        )}
      </div>
      <div className="space-y-2 p-2.5">
        <p
          className="truncate text-sm font-medium"
          title={attachment.fileName}
          data-testid={`text-gallery-name-${attachment.id}`}
        >
          {attachment.caption || attachment.fileName}
        </p>
        <p className="text-xs text-muted-foreground" data-testid={`text-gallery-meta-${attachment.id}`}>
          {attachment.origin === "edited" ? "Edited copy" : "Uploaded"} · {prettySize(attachment.size)}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {isDisplayImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onClearDisplay}
              disabled={pending}
              data-testid={`button-clear-display-${attachment.id}`}
            >
              Clear display image
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onSetDisplay}
              disabled={pending}
              data-testid={`button-set-display-${attachment.id}`}
            >
              <Star className="mr-1 h-3 w-3" aria-hidden />
              {displayCount === 0 ? "Set as display image" : "Change display image"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onEdit}
            data-testid={`button-edit-image-${attachment.id}`}
          >
            <Pencil className="mr-1 h-3 w-3" aria-hidden /> Edit a copy
          </Button>
          <a
            href={contentUrl}
            download={attachment.fileName}
            aria-label={`Download the original ${attachment.fileName}`}
            data-testid={`link-download-${attachment.id}`}
            className="inline-flex h-7 items-center rounded-sm px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Download className="mr-1 h-3 w-3" aria-hidden /> Original
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove ${attachment.fileName}`}
            data-testid={`button-remove-gallery-${attachment.id}`}
          >
            <Trash2 className="h-3 w-3" aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Caption, alt text, private note and provenance for the selected image. */
function GalleryDetails({
  attachment,
  all,
  contentUrl,
}: {
  attachment: Attachment;
  all: Attachment[];
  contentUrl: string;
}) {
  const actions = useStoryActions();
  const parent = attachment.derivedFromId
    ? all.find((a) => a.id === attachment.derivedFromId)
    : undefined;
  const children = all.filter((a) => a.derivedFromId === attachment.id);

  return (
    <div className="space-y-3" data-testid={`gallery-details-${attachment.id}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Caption"
          value={attachment.caption}
          testId={`input-caption-${attachment.id}`}
          placeholder="What is this image of?"
          onSave={(v) => actions.patch("attachments", attachment.id, { caption: v })}
        />
        <Field
          label="Alt text (accessibility)"
          value={attachment.altText}
          testId={`input-alt-${attachment.id}`}
          placeholder="Describe the image for screen readers"
          onSave={(v) => actions.patch("attachments", attachment.id, { altText: v })}
        />
      </div>

      {attachment.role === "real_world_ref" && (
        <div
          className="space-y-2 rounded-sm border border-amber-600/30 bg-amber-50/50 p-3 dark:bg-amber-950/20"
          data-testid={`panel-realworld-${attachment.id}`}
        >
          <Field
            label="Private note — never exported"
            value={attachment.privateNote}
            testId={`input-privatenote-${attachment.id}`}
            multiline
            rows={2}
            placeholder="Who is this person to the character? This stays on your machine."
            onSave={(v) => actions.patch("attachments", attachment.id, { privateNote: v })}
          />
          <p className="text-xs text-muted-foreground">
            This photo and its note are excluded from every export and share by default. The
            character’s own fictional fields are untouched by this reference.
          </p>
        </div>
      )}

      <div
        className="rounded-sm border border-border bg-background/60 p-3 text-xs text-muted-foreground"
        data-testid={`panel-provenance-${attachment.id}`}
      >
        <p className="eyebrow mb-1.5">Provenance</p>
        <dl className="grid gap-1 sm:grid-cols-2">
          <div className="flex gap-1.5">
            <dt className="font-medium text-foreground">Origin:</dt>
            <dd data-testid={`text-origin-${attachment.id}`}>
              {attachment.origin === "edited" ? "Edited copy (client-side)" : "Uploaded by you"}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-foreground">Added:</dt>
            <dd data-testid={`text-created-${attachment.id}`}>{prettyDate(attachment.createdAt)}</dd>
          </div>
          <div className="flex gap-1.5 sm:col-span-2">
            <dt className="font-medium text-foreground">Derived from:</dt>
            <dd data-testid={`text-derivedfrom-${attachment.id}`}>
              {parent ? (
                <span className="inline-flex items-center gap-1">
                  <Link2 className="h-3 w-3" aria-hidden /> {parent.caption || parent.fileName}
                </span>
              ) : (
                "Nothing — this is an original"
              )}
            </dd>
          </div>
          {children.length > 0 && (
            <div className="flex gap-1.5 sm:col-span-2">
              <dt className="font-medium text-foreground">Edits of this:</dt>
              <dd data-testid={`text-children-${attachment.id}`}>
                {children.map((c) => c.caption || c.fileName).join(", ")}
              </dd>
            </div>
          )}
        </dl>
        <a
          href={contentUrl}
          download={attachment.fileName}
          className="mt-2 inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
          data-testid={`link-original-${attachment.id}`}
        >
          <Eye className="h-3 w-3" aria-hidden /> View the original file ({attachment.mimeType},{" "}
          {prettySize(attachment.size)})
        </a>
      </div>
    </div>
  );
}

export function AttachmentArea({
  ownerKind,
  ownerId,
  label = "Visual references",
}: {
  ownerKind: EntityKind;
  ownerId: string;
  label?: string;
}) {
  const { data: snapshot } = useSnapshot();
  const actions = useStoryActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [asRealWorldRef, setAsRealWorldRef] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Attachment | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const rows = (snapshot?.attachments ?? [])
    .filter((a) => a.ownerKind === ownerKind && a.ownerId === ownerId)
    .sort((a, b) => a.sortIndex - b.sortIndex);
  const projectId = actions.projectId ?? "none";
  const thumbUrl = (a: Attachment) =>
    `/api/projects/${projectId}/attachments/${a.id}/thumbnail`;
  const contentUrl = (a: Attachment) =>
    `/api/projects/${projectId}/attachments/${a.id}/content`;

  // The display image is reversible and not canonical: it is a gallery
  // convention only, recorded in `sortIndex`. The chosen image carries the
  // unique lowest (negative) sortIndex so it floats to the front of the grid;
  // choosing another image — or clearing the choice — is always possible and
  // changes nothing about the underlying file or its role.
  const minSort = rows.length ? Math.min(...rows.map((a) => a.sortIndex)) : 0;
  const display = minSort < 0 ? (rows.find((a) => a.sortIndex === minSort) ?? null) : null;
  const selected = rows.find((a) => a.id === selectedId) ?? null;

  const upload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("ownerKind", ownerKind);
      form.append("ownerId", ownerId);
      form.append("role", asRealWorldRef ? "real_world_ref" : "reference");
      const res = await fetch(`/api/projects/${projectId}/attachments/upload`, {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Upload failed (${res.status})`);
      }
      const created = (await res.json()) as Attachment;
      // Keep the query cache in step with the rest of the workspace writes.
      await actions.patch("attachments", created.id, {});
      setSelectedId(created.id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "The upload did not go through.");
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async (blob: Blob, ops: ImageEditOps) => {
    if (!editing || isIdentityEdit(ops)) return;
    setSavingEdit(true);
    try {
      const form = new FormData();
      form.append("file", blob, editing.fileName.replace(/\.[a-z0-9]+$/i, "") + "-edited.jpg");
      form.append("edits", JSON.stringify(ops));
      const res = await fetch(
        `/api/projects/${projectId}/attachments/${editing.id}/derive`,
        { method: "POST", body: form, credentials: "same-origin" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `The edit could not be saved (${res.status})`);
      }
      const created = (await res.json()) as Attachment;
      await actions.patch("attachments", created.id, {}); // refresh the snapshot
      setEditing(null);
      setSelectedId(created.id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "The edit did not go through.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-3" data-testid={`panel-gallery-${ownerId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          data-testid={`button-upload-${ownerId}`}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          Upload a photo
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`realworld-${ownerId}`}
          checked={asRealWorldRef}
          onCheckedChange={(v) => setAsRealWorldRef(v === true)}
          data-testid={`check-realworld-${ownerId}`}
        />
        <label
          htmlFor={`realworld-${ownerId}`}
          className="text-xs text-muted-foreground"
          data-testid={`label-realworld-${ownerId}`}
        >
          This is a photo of a real person or place (a private real-world reference — excluded from
          exports)
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_MIME_ALLOWLIST.join(",")}
        className="sr-only"
        aria-label={`Upload a reference photo to this ${ownerKind}`}
        data-testid={`input-upload-${ownerId}`}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) await upload(file);
        }}
      />

      {uploadError && (
        <p className="text-sm text-destructive" role="alert" data-testid={`text-upload-error-${ownerId}`}>
          {uploadError}
        </p>
      )}

      {rows.length === 0 ? (
        <div
          className="rounded-sm border border-dashed border-border px-4 py-6 text-center"
          data-testid={`empty-gallery-${ownerId}`}
        >
          <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground/60" aria-hidden />
          <p className="mt-2 text-sm text-muted-foreground">
            No photos on this item yet. Upload your own reference photos — they stay private to
            this project.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid={`gallery-grid-${ownerId}`}>
          {rows.map((a) => (
            <GalleryCard
              key={a.id}
              attachment={a}
              thumbnailUrl={thumbUrl(a)}
              contentUrl={contentUrl(a)}
              isDisplayImage={display?.id === a.id}
              displayCount={display ? 1 : 0}
              pending={actions.pending}
              onSetDisplay={() =>
                actions.patch("attachments", a.id, { sortIndex: Math.min(0, minSort) - 1 })
              }
              onClearDisplay={() => actions.patch("attachments", a.id, { sortIndex: Date.now() })}
              onEdit={() => setEditing(a)}
              onRemove={() => setSelectedId(a.id)}
            />
          ))}
        </ul>
      )}

      {rows.length > 0 && selected && selectedId !== "__remove__" && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selected.fileName}</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setSelectedId(null)}
            data-testid={`button-deselect-${ownerId}`}
          >
            Close details
          </Button>
        </div>
      )}

      {rows.length > 0 && !selected && (
        <div className="flex flex-wrap gap-1.5" data-testid={`gallery-picker-${ownerId}`}>
          {rows.map((a) => (
            <Button
              key={a.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 max-w-40 truncate px-2 text-xs"
              onClick={() => setSelectedId(a.id)}
              data-testid={`button-inspect-${a.id}`}
            >
              <Paperclip className="mr-1 h-3 w-3 shrink-0" aria-hidden />
              {a.caption || a.fileName}
            </Button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <GalleryDetails attachment={selected} all={rows} contentUrl={contentUrl(selected)} />
          </div>
          <ConfirmDialog
            testId={`remove-attachment-${selected.id}`}
            title={`Remove “${selected.caption || selected.fileName}”?`}
            description="This deletes the image and its stored file from the project. Edits made from it stay. This cannot be undone."
            confirmLabel="Remove image"
            pendingLabel="Removing…"
            onConfirm={async () => {
              await actions.remove("attachments", selected.id);
              setSelectedId(null);
            }}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                data-testid={`button-delete-gallery-${selected.id}`}
              >
                <Trash2 className="mr-1 h-3 w-3" aria-hidden /> Remove
              </Button>
            }
          />
        </div>
      )}

      {editing && (
        <ImageEditorDialog
          attachment={editing}
          contentUrl={contentUrl(editing)}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          onSave={saveEdit}
          saving={savingEdit}
        />
      )}
    </div>
  );
}
