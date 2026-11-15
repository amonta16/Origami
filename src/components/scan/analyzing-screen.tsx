"use client";

import * as React from "react";
import { tesselation } from "@/lib/face/landmarker";
import type { Capture } from "@/lib/types";

export const ANALYZE_STEPS = ["Reading 478 landmarks", "Preparing your photo", "Measuring skin signals", "Matching treatments to the menu"] as const;

/** What the scanner is measuring while step 2 runs; cycles so the wait reads as work, not a hang. */
const SIGNALS = ["fine lines", "firmness", "pores", "texture", "hydration", "dark circles", "puffiness", "redness", "sun spots", "radiance", "breakouts", "tear troughs"];

/**
 * The wait between capture and results. Her photo sits under the live mesh with a scan line
 * sweeping over it; the step list ticks as the client works and the signal list cycles while
 * the server measures. Nothing here is fake progress: steps advance on real events.
 */
export function AnalyzingScreen({ capture, step, clinicName }: { capture: Capture; step: number; clinicName: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = React.useState(0);
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const img = new Image();
    img.onload = () => {
      const W = 390 * 2, H = Math.round((W * capture.height) / capture.width);
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      ctx.fillStyle = "rgba(23,19,15,0.35)";
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(200, 240, 222, 0.5)";
      ctx.beginPath();
      for (const c of tesselation()) {
        const a = capture.landmarks[c.start], b = capture.landmarks[c.end];
        ctx.moveTo(a.x * W, a.y * H);
        ctx.lineTo(b.x * W, b.y * H);
      }
      ctx.stroke();
      // landmark dots, so the mesh reads as measurement rather than decoration
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (let i = 0; i < capture.landmarks.length; i += 3) {
        const p = capture.landmarks[i];
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    img.src = capture.photo;
  }, [capture]);

  React.useEffect(() => {
    const a = setInterval(() => setTick((t) => t + 1), 1400);
    const b = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  const signal = SIGNALS[tick % SIGNALS.length];
  const progress = Math.min(0.95, (step + 0.5) / ANALYZE_STEPS.length);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-phone flex-col overflow-hidden bg-ink text-ivory">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover opacity-80" />
      {/* scan line: a bright band sweeping down the face, with a soft glow trail */}
      <div className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-28" aria-hidden="true" />
      <div className="relative mt-auto bg-gradient-to-t from-ink via-ink/90 to-transparent px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-28">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">Analyzing your skin</h2>
            <p className="mt-1 text-sm text-ivory/70">Matching against {clinicName}&rsquo;s menu.</p>
          </div>
          <span className="font-display-numeral text-[13px] tabular-nums text-ivory/50">{seconds}s</span>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-ivory/15">
          <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-700 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
        <ul className="mt-4 space-y-3">
          {ANALYZE_STEPS.map((label, i) => {
            const done = i < step, active = i === step;
            return (
              <li key={label} className="flex items-center gap-3 text-[15px]">
                <span
                  className={`grid size-6 place-items-center rounded-full border transition-colors ${
                    done ? "border-emerald-400 bg-emerald-400 text-ink" : active ? "border-ivory/80" : "border-ivory/25"
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
                      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : active ? (
                    <span className="size-2 animate-pulse rounded-full bg-ivory" />
                  ) : null}
                </span>
                <span className={done || active ? "" : "text-ivory/50"}>
                  {label}
                  {active && i === 2 && (
                    <span key={signal} className="signal-fade ml-2 text-ivory/60">
                      · {signal}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-ivory/45">Cosmetic estimates, not a diagnosis. Your photo is deleted after 72 hours unless you keep it.</p>
      </div>
    </div>
  );
}
