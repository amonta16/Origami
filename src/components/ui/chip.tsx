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

/** Static tag. Optionally shows a severity dot. */
export function Chip({
  severity,
  tone = "ivory",
  className,
  children,
}: {
  severity?: Severity;
  tone?: "ivory" | "accent" | "ink" | "outline";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    ivory: "bg-ivory-deep text-ink-soft",
    accent: "bg-accent-soft text-accent-ink",
    ink: "bg-ink text-ivory",
    outline: "border border-line-strong text-ink-soft",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-chip px-3 text-[13px] font-medium",
        tones,
        className,
      )}
    >
      {severity && (
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", severityDot[severity])}
        />
      )}
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
        "inline-flex h-11 items-center gap-2 rounded-chip border px-4 text-[15px] font-medium transition-[background-color,border-color,color] duration-150 active:translate-y-px",
        selected
          ? "border-accent bg-accent text-ivory"
          : "border-line-strong bg-surface text-ink hover:border-ink",
        className,
      )}
    >
      {selected && (
        <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3.5 8.5l3 3 6-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
