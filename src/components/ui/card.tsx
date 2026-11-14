import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "surface" | "ivory" | "ink" | "accent";

const tones: Record<Tone, string> = {
  surface: "bg-surface text-ink shadow-soft",
  ivory: "bg-ivory-deep/60 text-ink",
  ink: "bg-ink text-ivory shadow-lift",
  accent: "bg-accent text-ivory shadow-lift",
};

export function Card({
  tone = "surface",
  padding = "md",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad = {
    none: "",
    sm: "p-4",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
  }[padding];
  return (
    <div
      {...rest}
      className={cn("rounded-card", tones[tone], pad, className)}
    >
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
  return (
    <Tag className={cn("font-display text-xl sm:text-2xl", className)}>
      {children}
    </Tag>
  );
}

export function CardText({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-[15px] leading-relaxed text-ink-muted", className)}>
      {children}
    </p>
  );
}
