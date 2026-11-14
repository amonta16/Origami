"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Skin score ring. Animates from 0 to `value` on mount. An optional outer
 * `potential` arc shows where the score could go after the recommended plan.
 */
export function ScoreRing({
  value,
  potential,
  size = 220,
  label = "Skin score",
  caption,
  className,
}: {
  value: number;
  potential?: number;
  size?: number;
  label?: string;
  caption?: string;
  className?: string;
}) {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(t);
  }, [value]);

  const stroke = Math.max(8, Math.round(size * 0.055));
  const outer = size / 2;
  const rMain = outer - stroke * 1.9;
  const rPot = outer - stroke * 0.6;
  const cMain = 2 * Math.PI * rMain;
  const cPot = 2 * Math.PI * rPot;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const mainOffset = cMain * (1 - clamp(shown) / 100);
  const potOffset = potential !== undefined ? cPot * (1 - clamp(potential) / 100) : cPot;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} ${Math.round(value)} out of 100${
        potential !== undefined ? `, potential ${Math.round(potential)}` : ""
      }`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* track */}
        <circle
          cx={outer}
          cy={outer}
          r={rMain}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        {/* potential arc (thin, dashed) */}
        {potential !== undefined && (
          <circle
            cx={outer}
            cy={outer}
            r={rPot}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity={0.35}
            strokeWidth={2}
            strokeDasharray={`${cPot}`}
            strokeDashoffset={potOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)" }}
          />
        )}
        {/* main arc */}
        <circle
          cx={outer}
          cy={outer}
          r={rMain}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeDasharray={`${cMain}`}
          strokeDashoffset={mainOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div
          className="font-display font-display-numeral"
          style={{ fontSize: size * 0.3 }}
        >
          {Math.round(shown)}
        </div>
        <div className="mt-1 text-[12px] font-medium text-ink-muted">{label}</div>
        {caption && <div className="text-[12px] text-brand-ink">{caption}</div>}
      </div>
    </div>
  );
}
