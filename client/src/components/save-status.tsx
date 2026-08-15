import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

type UseSaveStatusResult = {
  state: SaveState;
  error: string | null;
  /** Wraps an async action: saving -> saved (auto-reverts) or saving -> error (stays until retried). */
  run: <T,>(fn: () => Promise<T>) => Promise<T | undefined>;
  /** Clears an error state without retrying, e.g. when the author edits the field again. */
  reset: () => void;
};

function messageFor(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Your change was not saved.";
}

/**
 * Tracks the outcome of one async write so a control can show a durable,
 * accessible acknowledgement or an inline, actionable error — never a silent
 * failure. `saved` auto-reverts to `idle`; `error` persists until the next
 * `run` call or an explicit `reset`, so the author always has time to read it.
 */
export function useSaveStatus(): UseSaveStatusResult {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const revertTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(revertTimer.current), []);

  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    window.clearTimeout(revertTimer.current);
    setState("saving");
    setError(null);
    try {
      const result = await fn();
      setState("saved");
      revertTimer.current = window.setTimeout(() => setState("idle"), 1800) as unknown as number;
      return result;
    } catch (err) {
      setState("error");
      setError(messageFor(err));
      return undefined;
    }
  }, []);

  const reset = useCallback(() => {
    window.clearTimeout(revertTimer.current);
    setState("idle");
    setError(null);
  }, []);

  return { state, error, run, reset };
}

/**
 * The visible + screen-reader-audible half of `useSaveStatus`. One `role`
 * region per state so assistive tech gets the right urgency: `status`
 * (polite) while saving or once saved, `alert` (assertive) on failure. Pass
 * `onRetry` to add a same-place retry action next to the error message.
 */
export function SaveStatusText({
  state,
  error,
  testId,
  savingLabel = "Saving…",
  savedLabel = "Saved",
  onRetry,
  className,
}: {
  state: SaveState;
  error?: string | null;
  testId: string;
  savingLabel?: string;
  savedLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  if (state === "idle") return null;

  if (state === "error") {
    return (
      <p
        role="alert"
        data-testid={`status-error-${testId}`}
        className={cn("flex flex-wrap items-center gap-1.5 text-xs text-destructive", className)}
      >
        <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden />
        <span>{error ?? "Something went wrong. Your change was not saved."}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            data-testid={`button-retry-${testId}`}
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        )}
      </p>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid={state === "saved" ? `status-saved-${testId}` : `status-saving-${testId}`}
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      {state === "saving" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
          {savingLabel}
        </>
      ) : (
        <>
          <Check className="h-3 w-3" aria-hidden />
          {savedLabel}
        </>
      )}
    </span>
  );
}
