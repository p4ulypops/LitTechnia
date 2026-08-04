import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  value: string;
  onSave: (value: string) => void | Promise<unknown>;
  testId: string;
  hint?: string;
  rows?: number;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  prose?: boolean;
};

/**
 * Text field that keeps local edits and writes on blur (or Cmd/Ctrl+Enter).
 * Shows a quiet "saved" acknowledgement — never a score or judgement.
 */
export function Field({
  label,
  value,
  onSave,
  testId,
  hint,
  rows = 3,
  multiline = false,
  placeholder,
  className,
  prose = false,
}: FieldProps) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = async () => {
    if (draft === value) return;
    await onSave(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const shared = {
    id: testId,
    value: draft,
    placeholder,
    "data-testid": testId,
    onBlur: commit,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void commit();
      }
    },
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={testId} className="eyebrow">
          {label}
        </Label>
        {saved && (
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            data-testid={`status-saved-${testId}`}
          >
            <Check className="h-3 w-3" /> saved
          </span>
        )}
      </div>
      {multiline ? (
        <Textarea
          {...shared}
          rows={rows}
          className={cn(
            "resize-y bg-background/60 text-sm leading-relaxed",
            prose && "font-prose text-base leading-[1.75]",
          )}
        />
      ) : (
        <Input {...shared} className="bg-background/60 text-sm" />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className,
  testId,
}: {
  title?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section
      className={cn("paper-panel rounded-md p-5", className)}
      data-testid={testId}
    >
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            {title && <h2 className="font-serif text-lg font-medium leading-tight">{title}</h2>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
  testId,
}: {
  label: string;
  tone?: "neutral" | "accent" | "quiet";
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
        tone === "accent" && "border-primary/40 bg-primary/10 text-primary",
        tone === "neutral" && "border-border bg-secondary text-secondary-foreground",
        tone === "quiet" && "border-transparent bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
  testId,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border px-5 py-8"
      data-testid={testId}
    >
      <h3 className="font-serif text-base">{title}</h3>
      <p className="max-w-prose text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" data-testid="status-loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-md bg-muted"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}
