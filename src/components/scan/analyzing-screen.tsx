"use client";

import * as React from "react";
import { tesselation } from "@/lib/face/landmarker";
import type { Capture } from "@/lib/types";

export const ANALYZE_STEPS = [
  "Reading 478 landmarks",
  "Cropping the zones",
  "Scoring skin concerns",
  "Matching treatments to the menu",
] as const;

export function AnalyzingScreen({ capture, step, clinicName }: { capture: Capture; step: number; clinicName: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

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
    };
    img.src = capture.photo;
  }, [capture]);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-phone flex-col bg-ink text-ivory">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="relative mt-auto bg-gradient-to-t from-ink via-ink/90 to-transparent px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24">
        <h2 className="font-display text-3xl">Analyzing your skin</h2>
        <p className="mt-1 text-sm text-ivory/70">Matching against {clinicName}&rsquo;s menu.</p>
        <ul className="mt-5 space-y-3">
          {ANALYZE_STEPS.map((label, i) => {
            const done = i < step, active = i === step;
            return (
              <li key={label} className="flex items-center gap-3 text-[15px]">
                <span
                  className={`grid size-6 place-items-center rounded-full border ${
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
                <span className={done || active ? "" : "text-ivory/50"}>{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
