"use client";

import * as React from "react";
import { usePatient } from "./patient-provider";

/**
 * "A gift for you": a wrapped welcome gift. Layout matched to the reference screenshots
 * (kraft wrap, striped ribbon in the clinic color, bow, handwritten "For you" tag, dark
 * "Scratch to unwrap" tooltip). One short swipe or a tap unwraps it in about half a second.
 * Pure CSS/SVG: no canvas, nothing heavy on the main thread.
 */
export function GiftCard({ amountLabel, claimBy, signedIn }: { amountLabel: string; claimBy: string; signedIn: boolean }) {
  const { openJoin, clinicName } = usePatient();
  const [state, setState] = React.useState<"wrapped" | "opening" | "open">("wrapped");
  const start = React.useRef<{ x: number; y: number } | null>(null);

  const unwrap = React.useCallback(() => {
    setState((s) => {
      if (s !== "wrapped") return s;
      window.setTimeout(() => setState("open"), 520);
      return "opening";
    });
  }, []);

  return (
    <div>
      <div className="relative aspect-[1.65] overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_-12px_rgba(0,0,0,.18)]">
        {/* the gift underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(90%_80%_at_50%_0%,var(--brand-soft),#fff_70%)] px-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-white text-brand shadow-[0_6px_16px_-8px_rgba(0,0,0,.35)]">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 10h16v10H4zM12 10v10M3 7h18v3H3zM12 7c-1.5 0-4-1-4-2.5S10 2 12 4.5C14 2 16 3 16 4.5S13.5 7 12 7Z" />
            </svg>
          </span>
          <p className="mt-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#8b8e96]">WELCOME GIFT</p>
          <p className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-brand">{amountLabel}</p>
          <p className="mt-1 text-[12.5px] leading-snug text-[#6f7380]">Our thank-you for joining. Use it on any treatment or product at {clinicName}.</p>
        </div>

        {/* the wrapping */}
        {state !== "open" && (
          <button
            type="button"
            aria-label="Unwrap your welcome gift"
            onClick={unwrap}
            onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
            onPointerMove={(e) => {
              if (!start.current) return;
              if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 22) {
                start.current = null;
                unwrap();
              }
            }}
            onPointerUp={() => (start.current = null)}
            className={`gift-wrap absolute inset-0 cursor-grab touch-pan-y select-none ${state === "opening" ? "is-opening" : ""}`}
          >
            <span className="gift-paper absolute inset-0" />
            <span className="gift-ribbon-v absolute inset-y-0 left-1/2 w-[30px] -translate-x-1/2" />
            <span className="gift-ribbon-h absolute inset-x-0 top-[54%] h-[30px] -translate-y-1/2" />
            <Bow />
            <span className="gift-tag font-hand absolute bottom-[10%] left-[6%] -rotate-[7deg] rounded-[6px] bg-[#fdf0f1] px-6 py-1.5 text-[30px] leading-none text-[#3a2a2c] shadow-[0_6px_14px_-6px_rgba(0,0,0,.35)]">
              For you
            </span>
            {state === "wrapped" && (
              <span className="gift-hint absolute left-1/2 top-[9%] whitespace-nowrap rounded-[10px] bg-[#1f2330] px-4 py-2 text-[15px] font-medium text-white shadow-lg">
                Scratch to unwrap
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-[7px] border-t-[7px] border-x-transparent border-t-[#1f2330]" />
              </span>
            )}
            {state === "opening" &&
              Array.from({ length: 16 }, (_, i) => (
                <span
                  key={i}
                  className="gift-confetti absolute left-1/2 top-[54%] h-2.5 w-1.5 rounded-[1px]"
                  style={
                    {
                      "--dx": `${Math.cos((i / 16) * Math.PI * 2) * (90 + (i % 3) * 30)}px`,
                      "--dy": `${Math.sin((i / 16) * Math.PI * 2) * (70 + (i % 4) * 18) - 20}px`,
                      "--r": `${i * 47}deg`,
                      background: i % 3 === 0 ? "#f4c542" : i % 3 === 1 ? "var(--brand)" : "#f28ca0",
                    } as React.CSSProperties
                  }
                />
              ))}
          </button>
        )}
      </div>

      {state === "open" &&
        (signedIn ? (
          <p className="mt-3 rounded-[12px] bg-brand-soft px-3 py-2.5 text-center text-[13px] text-brand-ink">Mention your welcome gift at checkout. Claim by {claimBy}.</p>
        ) : (
          <button type="button" onClick={() => openJoin(`Join to claim ${amountLabel}.`)} className="gift-claim mt-3 h-[50px] w-full rounded-[14px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-deep">
            Claim my gift
          </button>
        ))}

      <style>{`
        .gift-paper {
          background:
            radial-gradient(120% 90% at 18% 8%, rgba(255,236,214,.75) 0%, transparent 55%),
            radial-gradient(90% 80% at 100% 100%, rgba(150,92,46,.22) 0%, transparent 60%),
            linear-gradient(135deg, #efc9a1 0%, #e6b688 55%, #d9a06c 100%);
        }
        .gift-paper::after {
          content: ""; position: absolute; inset: 0; opacity: .22; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .18  0 0 0 .55 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>");
        }
        .gift-ribbon-v, .gift-ribbon-h {
          background: repeating-linear-gradient(135deg, var(--brand) 0 7px, color-mix(in oklab, var(--brand) 62%, white) 7px 13px);
          box-shadow: 0 0 0 1px color-mix(in oklab, var(--brand) 70%, black) inset, 0 4px 10px -4px rgba(0,0,0,.35);
        }
        .gift-hint { animation: gift-bob 1.8s ease-in-out infinite; }
        @keyframes gift-bob { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -4px); } }
        .gift-wrap .gift-paper, .gift-wrap .gift-tag { transition: transform .5s cubic-bezier(.5,0,.3,1), opacity .45s ease; }
        .gift-wrap .gift-ribbon-v { transition: transform .45s cubic-bezier(.5,0,.3,1); }
        .gift-wrap .gift-ribbon-h { transition: transform .45s cubic-bezier(.5,0,.3,1); }
        .gift-wrap .gift-bow { transition: transform .35s cubic-bezier(.4,1.6,.5,1), opacity .3s ease .1s; }
        .gift-wrap.is-opening .gift-paper { transform: scale(1.12) rotate(-2deg); opacity: 0; }
        /* the -translate-* utilities use the separate CSS "translate" property, so transforms here only add motion */
        .gift-wrap.is-opening .gift-ribbon-v { transform: translateY(-110%); }
        .gift-wrap.is-opening .gift-ribbon-h { transform: translateX(110%); }
        .gift-wrap.is-opening .gift-bow { transform: scale(1.35); opacity: 0; }
        .gift-wrap.is-opening .gift-tag { transform: translate(-30px, 40px) rotate(-24deg); opacity: 0; }
        .gift-confetti { animation: gift-pop .6s cubic-bezier(.2,.7,.3,1) forwards; }
        @keyframes gift-pop { from { transform: translate(-50%,-50%) rotate(0); opacity: 1; } to { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--r)); opacity: 0; } }
        .gift-claim { animation: gift-in .35s ease-out both; }
        @keyframes gift-in { from { transform: translateY(6px); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .gift-hint, .gift-confetti, .gift-claim { animation: none !important; } }
      `}</style>
    </div>
  );
}

const EDGE: React.CSSProperties = { stroke: "color-mix(in oklab, var(--brand) 65%, black)" };

function Bow() {
  return (
    <span className="gift-bow absolute left-1/2 top-[54%] h-[86px] w-[150px] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
      <svg viewBox="0 0 150 86" className="h-full w-full overflow-visible">
        <defs>
          <pattern id="bowStripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" style={{ fill: "var(--brand)" }} />
            <rect width="4" height="10" style={{ fill: "color-mix(in oklab, var(--brand) 62%, white)" }} />
          </pattern>
        </defs>
        {/* tails */}
        <path d="M70 46 L52 84 L62 80 L67 88 L76 50Z" fill="url(#bowStripe)" style={EDGE} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M80 46 L98 84 L88 80 L83 88 L74 50Z" fill="url(#bowStripe)" style={EDGE} strokeWidth="1.5" strokeLinejoin="round" />
        {/* loops */}
        <path d="M75 40 C58 14 18 8 14 30 C11 48 46 52 75 42Z" fill="url(#bowStripe)" style={EDGE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M75 40 C92 14 132 8 136 30 C139 48 104 52 75 42Z" fill="url(#bowStripe)" style={EDGE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M70 38 C58 24 32 20 28 30 C26 38 44 42 68 40Z" fill="rgba(0,0,0,.18)" />
        <path d="M80 38 C92 24 118 20 122 30 C124 38 106 42 82 40Z" fill="rgba(0,0,0,.18)" />
        {/* knot */}
        <ellipse cx="75" cy="42" rx="11" ry="10" style={{ ...EDGE, fill: "var(--brand)" }} strokeWidth="2" />
        <ellipse cx="72" cy="39" rx="4" ry="3" fill="rgba(255,255,255,.35)" />
      </svg>
    </span>
  );
}
