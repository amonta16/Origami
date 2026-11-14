"use client";

import * as React from "react";
import { usePatient } from "./patient-provider";

/**
 * "A gift for you": a scratch-to-unwrap welcome gift. The wrapping is drawn on a canvas in the
 * clinic's brand color; scratching clears it, and past ~40% it opens fully.
 */
export function GiftCard({ amountLabel, claimBy, signedIn }: { amountLabel: string; claimBy: string; signedIn: boolean }) {
  const { openJoin, clinicName } = usePatient();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [opened, setOpened] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const drawing = React.useRef(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = wrap.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const brand = getComputedStyle(wrap).getPropertyValue("--brand").trim() || "#92191c";
    // paper
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#e9d2b4");
    g.addColorStop(1, "#d8b88f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    // subtle paper fibers
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = i % 2 ? "#fff" : "#7a5a3a";
      ctx.fillRect(Math.random() * width, Math.random() * height, Math.random() * 30 + 4, 1);
    }
    ctx.globalAlpha = 1;
    // ribbons in brand color
    ctx.fillStyle = brand;
    ctx.fillRect(width * 0.58, 0, 22, height);
    ctx.fillRect(0, height * 0.42, width, 22);
    // bow
    const bx = width * 0.58 + 11,
      by = height * 0.42 + 11;
    ctx.beginPath();
    ctx.ellipse(bx - 24, by - 6, 24, 13, -0.5, 0, Math.PI * 2);
    ctx.ellipse(bx + 24, by - 6, 24, 13, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fill();
    // tag
    ctx.save();
    ctx.translate(width * 0.12, height * 0.68);
    ctx.rotate(-0.08);
    ctx.fillStyle = "#fbf6ef";
    ctx.fillRect(0, 0, 112, 42);
    ctx.fillStyle = "#3a2a1a";
    ctx.font = "italic 600 20px Georgia, serif";
    ctx.fillText("For you", 18, 28);
    ctx.restore();
  }, []);

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || opened) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - rect.left, e.clientY - rect.top, 26, 0, Math.PI * 2);
    ctx.fill();
  };

  const check = () => {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas || opened) return;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear++;
    if (clear / (data.length / 64) > 0.4) setOpened(true);
  };

  return (
    <div>
      <div ref={wrapRef} className="relative aspect-[1.55] overflow-hidden rounded-card border border-line bg-white select-none">
        {/* the gift underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <svg viewBox="0 0 24 24" className="size-7 text-brand" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 10h16v10H4zM12 10v10M3 7h18v3H3zM12 7c-1.5 0-4-1-4-2.5S10 2 12 4.5C14 2 16 3 16 4.5S13.5 7 12 7Z" />
          </svg>
          <p className="mt-2 text-[10px] font-semibold tracking-[0.14em] text-ink-muted">WELCOME GIFT</p>
          <p className="font-display mt-1 text-[22px] text-brand">{amountLabel}</p>
          <p className="mt-1 text-[12px] leading-snug text-ink-muted">Our thank-you for joining. Use it on any treatment or product at {clinicName}.</p>
        </div>
        {/* wrapping */}
        <canvas
          ref={canvasRef}
          aria-label="Scratch to unwrap your gift"
          role="img"
          className={`absolute inset-0 h-full w-full touch-none transition-opacity duration-500 ${opened ? "pointer-events-none opacity-0" : "cursor-grab opacity-100"}`}
          onPointerDown={(e) => {
            drawing.current = true;
            setStarted(true);
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            scratch(e);
          }}
          onPointerMove={scratch}
          onPointerUp={check}
          onPointerCancel={check}
        />
        {!started && !opened && (
          <button type="button" onClick={() => setOpened(true)} className="absolute left-1/2 top-4 -translate-x-1/2 rounded-chip bg-ink/85 px-3 py-1.5 text-[12px] font-medium text-white">
            Scratch to unwrap
          </button>
        )}
      </div>
      {opened &&
        (signedIn ? (
          <p className="mt-3 rounded-field bg-brand-soft px-3 py-2.5 text-center text-[13px] text-brand-ink">Mention your welcome gift at checkout. Claim by {claimBy}.</p>
        ) : (
          <button type="button" onClick={() => openJoin(`Join to claim ${amountLabel}.`)} className="mt-3 h-12 w-full rounded-chip bg-brand text-[15px] font-medium text-white hover:bg-brand-deep">
            Claim my gift
          </button>
        ))}
    </div>
  );
}
