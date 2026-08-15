import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  /** The control that opens the dialog, e.g. a delete icon button. */
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  /**
   * `destructive` (red, for actions that lose data) or `neutral` (for
   * reversible actions like archiving, which still deserve a pause but not
   * an alarming colour).
   */
  tone?: "destructive" | "neutral";
  onConfirm: () => Promise<void>;
  testId: string;
};

function messageFor(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "That didn't go through. Nothing was changed — you can try again.";
}

/**
 * One confirmation step before any action that destroys or materially
 * changes an author's material. Stays open and shows the real error inline
 * on failure instead of closing on a guess; only closes once the action has
 * actually completed.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
  cancelLabel = "Cancel",
  tone = "destructive",
  onConfirm,
  testId,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      setPending(false);
      setOpen(false);
    } catch (err) {
      setPending(false);
      setError(messageFor(err));
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return; // Never dismiss mid-write.
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent data-testid={`dialog-confirm-${testId}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            role="alert"
            data-testid={`status-error-confirm-${testId}`}
            className="flex items-start gap-1.5 rounded-sm border border-destructive-border bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel data-testid={`button-cancel-confirm-${testId}`} disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>
          {/* Not AlertDialogAction: that primitive auto-closes on click, which would
              hide a failure. This Button stays under our control until we know the
              write actually succeeded. */}
          <Button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
            data-testid={`button-confirm-${testId}`}
            className={cn(tone === "destructive" && buttonVariants({ variant: "destructive" }))}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
