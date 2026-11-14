import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icons";

/**
 * Item artwork. Uses the clinic's photo when there is one; otherwise a quiet tile in the
 * clinic's brand tint with the category's line icon. We never stand in stock photos for a
 * clinic's real rooms or results.
 */
export function ItemArt({
  src,
  icon,
  alt,
  className,
  tone = "muted",
}: {
  src?: string | null;
  icon: IconName;
  alt: string;
  className?: string;
  tone?: "muted" | "brand";
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cn("aspect-square w-full rounded-card object-cover", className)} />;
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "relative grid aspect-square w-full place-items-center overflow-hidden rounded-card",
        tone === "brand" ? "bg-brand-soft text-brand/70" : "bg-surface-muted text-ink-muted/60",
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(90%_70%_at_30%_15%,rgba(255,255,255,.75),transparent_60%)]" />
      <Icon name={icon} className="relative size-9" strokeWidth={1.3} />
    </div>
  );
}
