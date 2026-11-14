"use client";

import * as React from "react";
import { CONCERN_BY_ID } from "@/lib/concerns";
import { zoneBounds } from "@/lib/face/landmarks";
import { drawHeatmap, loadImage } from "@/lib/face/mask";
import type { ConcernResult, Landmark, ZoneId } from "@/lib/types";
import { cn } from "@/lib/cn";

const SEV_COLOR = {
  none: "#cfd8d3",
  mild: "#e6c38a",
  moderate: "#d98d5a",
  pronounced: "#b4443e",
} as const;

/**
 * Her photo with tinted zone overlays for the selected concern(s), plus floating
 * concern pills ("Fine lines · 72") anchored to each zone, as in the reference card.
 */
export function HeatmapPhoto({
  photo,
  landmarks,
  concerns,
  active,
  pills = 3,
  className,
}: {
  photo: string;
  landmarks: Landmark[];
  concerns: ConcernResult[];
  /** concern id to highlight; null = all */
  active: string | null;
  /** how many top-concern pills to float on the photo */
  pills?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = React.useState(3 / 4);

  React.useEffect(() => {
    let alive = true;
    loadImage(photo).then((img) => {
      if (!alive || !ref.current) return;
      const W = 780;
      const H = Math.round((W * img.naturalHeight) / img.naturalWidth);
      setRatio(img.naturalWidth / img.naturalHeight);
      const cv = ref.current;
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      const shown = concerns.filter((c) => (active ? c.id === active : c.score >= 15));
      const items = shown.map((c) => {
        const def = CONCERN_BY_ID[c.id];
        const zones: ZoneId[] = def?.zones.includes(c.zone) || !def ? [c.zone] : def.zones;
        return { zones, color: SEV_COLOR[c.severity], alpha: 0.18 + (c.score / 100) * 0.42 };
      });
      drawHeatmap(ctx, items, landmarks, W, H);
    });
    return () => {
      alive = false;
    };
  }, [photo, landmarks, concerns, active]);

  const shownPills = (active ? concerns.filter((c) => c.id === active) : concerns.slice(0, pills)).map((c, i) => {
    const b = zoneBounds(c.zone, landmarks);
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    // alternate the pill to the left/right of the zone so they don't stack
    const left = cx > 0.5;
    return { c, x: cx, y: cy, left, i };
  });

  return (
    <div className={cn("relative overflow-hidden rounded-card bg-ink", className)} style={{ aspectRatio: `${ratio}` }}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-label="Your photo with concern heat map" role="img" />
      {shownPills.map(({ c, x, y, left, i }) => (
        <span
          key={c.id + c.zone + i}
          className="absolute flex -translate-y-1/2 items-center gap-1.5 rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink shadow-soft"
          style={{ top: `${y * 100}%`, ...(left ? { right: `${(1 - x) * 100 + 4}%` } : { left: `${x * 100 + 4}%` }) }}
        >
          <span className="size-1.5 rounded-full" style={{ background: SEV_COLOR[c.severity] }} />
          {CONCERN_BY_ID[c.id]?.label ?? c.id}
          <span className="text-ink-muted">{100 - c.score}</span>
        </span>
      ))}
    </div>
  );
}
