"use client";

import * as React from "react";
import { CONCERN_BY_ID } from "@/lib/concerns";
import { drawHeatmap, loadImage } from "@/lib/face/mask";
import type { ConcernResult, Landmark, ZoneId } from "@/lib/types";
import { cn } from "@/lib/cn";

const SEV_COLOR = {
  none: "#c9d9d0",
  mild: "#e8c48a",
  moderate: "#d98d5a",
  pronounced: "#b4443e",
} as const;

/** Her photo with tinted zone overlays for the selected concern(s). */
export function HeatmapPhoto({
  photo,
  landmarks,
  concerns,
  active,
  className,
}: {
  photo: string;
  landmarks: Landmark[];
  concerns: ConcernResult[];
  /** concern id to highlight; null = all */
  active: string | null;
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

  return (
    <canvas
      ref={ref}
      className={cn("w-full rounded-card bg-ink", className)}
      style={{ aspectRatio: `${ratio}` }}
      aria-label="Your photo with concern heat map"
      role="img"
    />
  );
}
