"use client";

import * as React from "react";
import { blendDose, loadImage } from "@/lib/face/mask";
import { DOSES } from "@/lib/sim/prompts";
import { cn } from "@/lib/cn";

/**
 * Before/after drag slider + dose slider. The "after" layer is the original blended
 * with the masked composite at `dose`, rendered live on a canvas.
 */
export function BeforeAfter({
  original,
  composite,
  width,
  height,
  initialDose = DOSES[0].value,
  onDoseChange,
  className,
}: {
  original: string;
  composite: string;
  width: number;
  height: number;
  initialDose?: number;
  onDoseChange?: (dose: number) => void;
  className?: string;
}) {
  const afterRef = React.useRef<HTMLCanvasElement>(null);
  const imgs = React.useRef<{ o: HTMLImageElement; c: HTMLImageElement } | null>(null);
  const [split, setSplit] = React.useState(0.5);
  const [dose, setDose] = React.useState(initialDose);
  const [ready, setReady] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let alive = true;
    Promise.all([loadImage(original), loadImage(composite)]).then(([o, c]) => {
      if (!alive) return;
      imgs.current = { o, c };
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [original, composite]);

  React.useEffect(() => {
    const cv = afterRef.current;
    if (!cv || !imgs.current) return;
    cv.width = width;
    cv.height = height;
    blendDose(cv, imgs.current.o, imgs.current.c, dose);
  }, [dose, ready, width, height]);

  const onPointer = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    setSplit(Math.max(0.02, Math.min(0.98, (e.clientX - r.left) / r.width)));
  };

  const doseLabel = DOSES.reduce((best, d) => (Math.abs(d.value - dose) < Math.abs(best.value - dose) ? d : best), DOSES[0]).label;

  return (
    <div className={cn("select-none", className)}>
      <div
        ref={wrapRef}
        className="relative w-full touch-none overflow-hidden rounded-card bg-ink"
        style={{ aspectRatio: `${width} / ${height}` }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          onPointer(e);
        }}
        onPointerMove={(e) => e.buttons > 0 && onPointer(e)}
      >
        {/* after (full) */}
        <canvas ref={afterRef} className="absolute inset-0 h-full w-full" />
        {/* before, clipped to the left of the split */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={original}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full"
          style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}
        />
        {/* handle */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `calc(${split * 100}% - 1px)` }}>
          <div className="h-full w-0.5 bg-ivory/90 shadow-[0_0_0_1px_rgba(0,0,0,.25)]" />
          <div className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ivory text-ink shadow-lift">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
              <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <span className="absolute top-3 left-3 rounded-chip bg-black/45 px-2.5 py-1 text-[11px] font-medium text-ivory backdrop-blur">Before</span>
        <span className="absolute top-3 right-3 rounded-chip bg-black/45 px-2.5 py-1 text-[11px] font-medium text-ivory backdrop-blur">After · {doseLabel}</span>
        <span className="absolute right-3 bottom-3 rounded-sm bg-black/40 px-2 py-1 text-[10px] text-ivory/90">AI simulation — results vary</span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Dose</span>
          <span className="text-ink-muted">{doseLabel}</span>
        </div>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.01}
          value={dose}
          aria-label="Dose"
          onChange={(e) => {
            const v = Number(e.target.value);
            setDose(v);
            onDoseChange?.(v);
          }}
          className="mt-2 w-full accent-[var(--accent)]"
        />
        <div className="mt-1 flex justify-between text-[12px] text-ink-muted">
          {DOSES.map((d) => (
            <button key={d.label} type="button" className="hover:text-ink" onClick={() => { setDose(d.value); onDoseChange?.(d.value); }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
