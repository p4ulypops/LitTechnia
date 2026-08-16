/**
 * Gentle-edit dialog (Sub-PRD A).
 *
 * Deterministic client-side edits only — crop, quarter-turn rotate, flip,
 * brightness/contrast. Saving uploads the result as a NEW derived attachment
 * (origin "edited", derivedFromId → the parent); the original is preserved
 * untouched. There is no AI editing and no generative fill, by design.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { FlipHorizontal2, FlipVertical2, Loader2, RotateCcw, RotateCw, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyImageEdits, canvasToBlob, loadEditableImage } from "@/lib/image-edits";
import {
  DEFAULT_IMAGE_EDIT_OPS,
  isIdentityEdit,
  type ImageEditOps,
} from "@shared/media";
import type { Attachment } from "@shared/schema";

type CropDrag = { startX: number; startY: number; x: number; y: number } | null;

export function ImageEditorDialog({
  attachment,
  contentUrl,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  attachment: Attachment;
  /** URL of the original bytes (the /content route). */
  contentUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the encoded edited image plus the ops that produced it. */
  onSave: (blob: Blob, ops: ImageEditOps) => Promise<void>;
  saving: boolean;
}) {
  const [ops, setOps] = useState<ImageEditOps>({ ...DEFAULT_IMAGE_EDIT_OPS });
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drag, setDrag] = useState<CropDrag>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Load the original bytes once per dialog opening.
  useEffect(() => {
    if (!open) return;
    setOps({ ...DEFAULT_IMAGE_EDIT_OPS });
    setDrag(null);
    setSource(null);
    setLoadError(null);
    let cancelled = false;
    loadEditableImage(contentUrl)
      .then((img) => {
        if (!cancelled) setSource(img);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load image");
      });
    return () => {
      cancelled = true;
    };
  }, [open, contentUrl]);

  // Redraw the preview whenever the ops change.
  useEffect(() => {
    if (!source || !canvasRef.current) return;
    const result = applyImageEdits(source, ops);
    const canvas = canvasRef.current;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(result, 0, 0);
  }, [source, ops]);

  const patch = (part: Partial<ImageEditOps>) => setOps((prev) => ({ ...prev, ...part }));

  /** Pointer position as fractions of the displayed preview. */
  const fraction = useCallback((e: React.PointerEvent) => {
    const frame = frameRef.current;
    if (!frame) return { x: 0, y: 0 };
    const rect = frame.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!source) return;
    const p = fraction(e);
    setDrag({ startX: p.x, startY: p.y, x: p.x, y: p.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = fraction(e);
    setDrag({ ...drag, x: p.x, y: p.y });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const x = Math.min(drag.startX, drag.x);
    const y = Math.min(drag.startY, drag.y);
    const width = Math.abs(drag.x - drag.startX);
    const height = Math.abs(drag.y - drag.startY);
    setDrag(null);
    // Ignore accidental taps; a real crop covers at least 2% each way.
    if (width < 0.02 || height < 0.02) return;
    patch({ crop: { x, y, width, height } });
  };

  const save = async () => {
    if (!source) return;
    const canvas = applyImageEdits(source, ops);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    await onSave(blob, ops);
  };

  const cropOverlay = drag
    ? {
        left: `${Math.min(drag.startX, drag.x) * 100}%`,
        top: `${Math.min(drag.startY, drag.y) * 100}%`,
        width: `${Math.abs(drag.x - drag.startX) * 100}%`,
        height: `${Math.abs(drag.y - drag.startY) * 100}%`,
      }
    : ops.crop
      ? {
          left: `${ops.crop.x * 100}%`,
          top: `${ops.crop.y * 100}%`,
          width: `${ops.crop.width * 100}%`,
          height: `${ops.crop.height * 100}%`,
        }
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl"
        data-testid={`dialog-edit-${attachment.id}`}
        aria-label={`Edit a copy of ${attachment.fileName}`}
      >
        <DialogHeader>
          <DialogTitle>Edit a copy of “{attachment.fileName}”</DialogTitle>
          <DialogDescription>
            Crop, rotate, flip and gentle brightness/contrast only. Saving creates a new derived
            image — the original stays exactly as it was.
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <p className="text-sm text-destructive" role="alert" data-testid="text-edit-error">
            {loadError}
          </p>
        ) : !source ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the image…
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div
              ref={frameRef}
              className="relative touch-none select-none overflow-hidden rounded-sm border border-border bg-background/60"
              style={{ cursor: "crosshair" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              data-testid="edit-preview-frame"
            >
              <canvas ref={canvasRef} className="block h-auto max-h-[50vh] w-full object-contain" />
              {cropOverlay && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10"
                  style={cropOverlay}
                  data-testid="edit-crop-overlay"
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="eyebrow">Rotate &amp; flip</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      patch({ rotate: (((ops.rotate - 90) % 360) + 360) % 360 as ImageEditOps["rotate"] })
                    }
                    data-testid="button-rotate-left"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> 90° left
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => patch({ rotate: ((ops.rotate + 90) % 360) as ImageEditOps["rotate"] })}
                    data-testid="button-rotate-right"
                  >
                    <RotateCw className="mr-1 h-3.5 w-3.5" /> 90° right
                  </Button>
                  <Button
                    type="button"
                    variant={ops.flipH ? "secondary" : "outline"}
                    size="sm"
                    aria-pressed={ops.flipH}
                    onClick={() => patch({ flipH: !ops.flipH })}
                    data-testid="button-flip-h"
                  >
                    <FlipHorizontal2 className="mr-1 h-3.5 w-3.5" /> Flip
                  </Button>
                  <Button
                    type="button"
                    variant={ops.flipV ? "secondary" : "outline"}
                    size="sm"
                    aria-pressed={ops.flipV}
                    onClick={() => patch({ flipV: !ops.flipV })}
                    data-testid="button-flip-v"
                  >
                    <FlipVertical2 className="mr-1 h-3.5 w-3.5" /> Flip
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="eyebrow">
                  Brightness <span className="font-mono">{ops.brightness.toFixed(2)}</span>
                </p>
                <Slider
                  min={0.2}
                  max={2}
                  step={0.05}
                  value={[ops.brightness]}
                  onValueChange={([v]) => patch({ brightness: v })}
                  aria-label="Brightness"
                  data-testid="slider-brightness"
                />
              </div>
              <div className="space-y-1.5">
                <p className="eyebrow">
                  Contrast <span className="font-mono">{ops.contrast.toFixed(2)}</span>
                </p>
                <Slider
                  min={0.2}
                  max={2}
                  step={0.05}
                  value={[ops.contrast]}
                  onValueChange={([v]) => patch({ contrast: v })}
                  aria-label="Contrast"
                  data-testid="slider-contrast"
                />
              </div>

              <div className="space-y-1.5">
                <p className="eyebrow">Crop</p>
                <p className="text-xs text-muted-foreground">
                  Drag across the image to choose the part to keep.
                </p>
                {ops.crop && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => patch({ crop: null })}
                    data-testid="button-clear-crop"
                  >
                    <Scissors className="mr-1 h-3.5 w-3.5" /> Clear crop
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="button-edit-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={!source || saving || isIdentityEdit(ops)}
            data-testid="button-edit-save"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null}
            Save as a new copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
