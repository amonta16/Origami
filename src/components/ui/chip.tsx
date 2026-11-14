"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type Severity = "none" | "mild" | "moderate" | "pronounced";

const severityDot: Record<Severity, string> = {
  none: "bg-sev-none",
  mild: "bg-sev-mild",
  moderate: "bg-sev-moderate",
  pronounced: "bg-sev-pronounced",
};

export const severityLabel: Record<Severity, string> = {
  none: "Clear",
  mild: "Mild",
  moderate: "Moderate",
  pronounced: "Pronounced",
};

/** Static tag. Small, quiet, pill. Optionally shows a severity dot. */
export function Chip({
  severity,
  tone = "muted",
  className,
  children,
}: {
  severity?: Severity;
  tone?: "muted" | "brand" | "ink" | "outline" | "ok" | "ivory" | "accent";
  className?: string;
  children: React.ReactNode;
}) {
  const t = tone === "ivory" ? "muted" : tone === "accent" ? "brand" : tone;
  const tones = {
    muted: "bg-surface-muted text-ink-soft",
    brand: "bg-brand-soft text-brand-ink",
    ink: "bg-ink text-white",
    outline: "border border-line-strong text-ink-soft bg-surface",
    ok: "bg-emerald-50 text-emerald-700",
  }[t];
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-chip px-2.5 text-[12px] font-medium",
        tones,
        className,
      )}
    >
      {severity && <span aria-hidden="true" className={cn("size-1.5 rounded-full", severityDot[severity])} />}
      {children}
    </span>
  );
}

/** Tap-to-select chip for the patient questions. */
export function ChoiceChip({
  selected,
  onToggle,
  className,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip border px-4 text-[14px] font-medium transition-[background-color,border-color,color] duration-150 active:translate-y-px",
        selected ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-ink",
        className,
      )}
    >
      {selected && (
        <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </button>
  );
}

/** Segmented control, as in the reference's sub-tabs: gray track, white active pill. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-chip bg-surface-muted p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-chip px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            value === o.value ? "bg-surface text-ink shadow-soft" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Brand-colored toggle switch. */
export function Toggle({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-chip transition-colors",
        checked ? "bg-brand" : "bg-line-strong",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-1 size-5 rounded-full bg-white shadow-soft transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
