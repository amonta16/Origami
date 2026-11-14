"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icons";

/**
 * Walks a list of photo URLs: shows the first, moves to the next when one fails to load or is
 * narrower than `minWidth` (a scraped thumbnail or icon stretched over a tile looks broken).
 * Also checks after mount, because a server-rendered image can finish before React hydrates.
 */
function usePhotoChain(chain: string[], minWidth: number) {
  const [step, setStep] = React.useState(0);
  const ref = React.useRef<HTMLImageElement>(null);
  const current = chain[step] ?? null;
  const check = React.useCallback(
    (img: HTMLImageElement) => {
      if (!img.complete) return;
      const bad = img.naturalWidth === 0 || (step < chain.length - 1 && img.naturalWidth < minWidth);
      if (bad) setStep((s) => (s === step ? s + 1 : s));
    },
    [step, chain.length, minWidth],
  );
  React.useEffect(() => {
    if (ref.current) check(ref.current);
  }, [check, current]);
  return {
    current,
    imgProps: {
      ref,
      onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => check(e.currentTarget),
      onError: () => setStep((s) => (s === step ? s + 1 : s)),
    },
  };
}

/**
 * Item artwork. The clinic's own photo when it has one, else (or when that one is broken) the
 * matched stock `fallback` from lib/stock-photos.ts, else a quiet tile with the category icon.
 */
export function ItemArt({
  src,
  fallback,
  icon,
  alt,
  className,
  tone = "muted",
}: {
  src?: string | null;
  fallback?: string | null;
  icon: IconName;
  alt: string;
  className?: string;
  tone?: "muted" | "brand";
}) {
  const chain = [src, fallback].filter((x): x is string => Boolean(x));
  const { current, imgProps } = usePhotoChain(chain, 260);

  if (current) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={current} alt={alt} loading="lazy" {...imgProps} className={cn("aspect-square w-full rounded-card bg-surface-muted object-cover", className)} />
    );
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

/** A full-bleed photo (home hero, About, membership) that falls back to a stock room. */
export function CoverPhoto({ src, fallback, alt, className }: { src: string; fallback?: string | null; alt: string; className?: string }) {
  const chain = [src, fallback].filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i);
  const { current, imgProps } = usePhotoChain(chain, 400);
  if (!current) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={current} alt={alt} {...imgProps} className={cn("absolute inset-0 h-full w-full object-cover", className)} />;
}
