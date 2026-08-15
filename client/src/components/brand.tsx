/** LitTechnia mark: a nib-cut ink stroke on a page rule, with a single ink point. */
export function LitTechniaMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="LitTechnia"
      data-testid="img-logo"
    >
      <path
        d="M6 6.5 L10.5 21 L16 11.5 L21.5 21 L26 6.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path d="M5 25.5 H27" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
      <circle cx="16" cy="25.5" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function LitTechniaLockup() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="text-primary">
        <LitTechniaMark className="h-7 w-7" />
      </span>
      <span className="font-serif text-lg font-medium leading-none tracking-tight">
        LitTechnia
      </span>
    </span>
  );
}
