import * as React from "react";
import { cn } from "@/lib/cn";

/** White card with a hairline border and a whisper of shadow, per the reference. */
type Tone = "surface" | "muted" | "ink" | "brand" | "brand-soft";

const tones: Record<Tone, string> = {
  surface: "bg-surface text-ink border border-line shadow-soft",
  muted: "bg-surface-muted text-ink",
  ink: "bg-ink text-white",
  brand: "bg-brand text-white",
  "brand-soft": "bg-brand-soft text-ink border border-brand/10",
};

export function Card({
  tone = "surface",
  padding = "md",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: Tone | "ivory" | "accent";
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const t: Tone = tone === "ivory" ? "muted" : tone === "accent" ? "brand" : tone;
  const pad = { none: "", sm: "p-4", md: "p-5", lg: "p-6 sm:p-7" }[padding];
  return (
    <div {...rest} className={cn("rounded-card", tones[t], pad, className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  as: Tag = "h3",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "h2" | "h3" | "h4";
}) {
  return <Tag className={cn("font-display text-[17px]", className)}>{children}</Tag>;
}

export function CardText({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-[13px] leading-relaxed text-ink-muted", className)}>{children}</p>;
}
