"use client";

import * as React from "react";
import type { OfferTheme } from "@/lib/offers";
import { usePatient } from "./patient-provider";

/**
 * Wrapped gifts with "Scratch to unwrap". The welcome gift is matched to the reference
 * screenshots (kraft wrap, striped ribbon in the clinic color, bow, handwritten tag); every
 * automated offer gets its own wrapping: birthday confetti, New Year's stars, Valentine's hearts,
 * St. Patrick's shamrocks, summer suns, Halloween bats, Christmas snowflakes, anniversary
 * sparkles, a win-back lilac. One short swipe or a tap unwraps it in about half a second.
 * Pure CSS/SVG: no canvas, nothing heavy on the main thread.
 */

const svgTile = (inner: string, size = 72) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${inner}</svg>`)}")`;

const HEART = "M12 21s-7-4.4-9.3-8.6C1 9 3 5.5 6.5 5.5c2 0 3.6 1.2 5.5 3.2 1.9-2 3.5-3.2 5.5-3.2C21 5.5 23 9 21.3 12.4 19 16.6 12 21 12 21Z";
const STAR = "M12 2.5l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7Z";
const SPARK = "M12 2c.6 6 4 9.4 10 10-6 .6-9.4 4-10 10-.6-6-4-9.4-10-10 6-.6 9.4-4 10-10Z";
const SHAMROCK = "M12 12c-1.8-3.2-6-3.4-6-.6 0 2.4 3.6 2.4 6 .6Zm0 0c1.8-3.2 6-3.4 6-.6 0 2.4-3.6 2.4-6 .6Zm0 0c-3-1.6-2.8-6.2 0-6.2s3 4.6 0 6.2Zm0 0c.4 3 1.4 5.6 3 8";
const SNOW = "M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5";
const SUN = "M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9ZM12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1";
const BAT = "M1 9c3-2 5-2 7 0 .6-2 1.8-3 3-3l.5-2 .5 1.5h0l.5-1.5.5 2c1.2 0 2.4 1 3 3 2-2 4-2 7 0-2.4.6-3.4 2.4-3.6 4.6-1.8-1.6-3.4-1.4-4.6.4-.8-.8-1.6-1.2-2.8-1.2s-2 .4-2.8 1.2c-1.2-1.8-2.8-2-4.6-.4C4.4 11.4 3.4 9.6 1 9Z";
const GIFT = "M4 10h16v10H4zM12 10v10M3 7h18v3H3zM12 7c-1.5 0-4-1-4-2.5S10 2 12 4.5C14 2 16 3 16 4.5S13.5 7 12 7Z";

const at = (d: string, x: number, y: number, s: number, fill: string, op = 1, stroke = false, rot = 0) =>
  `<g transform='translate(${x} ${y}) rotate(${rot} ${12 * s} ${12 * s}) scale(${s})' opacity='${op}'><path d='${d}' ${stroke ? `fill='none' stroke='${fill}' stroke-width='1.6' stroke-linecap='round'` : `fill='${fill}'`}/></g>`;

type Theme = {
  paper: string;
  motif?: string;
  ribbon: [string, string, string]; // stripe A, stripe B, edge
  tag: [string, string]; // bg, ink
  inner: string; // under-the-wrap background
  accent: string;
  glyph: string;
  glyphStroke?: boolean;
  confetti: string[];
  texture?: boolean;
};

const THEMES: Record<OfferTheme, Theme> = {
  welcome: {
    paper: "radial-gradient(120% 90% at 18% 8%, rgba(255,236,214,.75) 0%, transparent 55%), radial-gradient(90% 80% at 100% 100%, rgba(150,92,46,.22) 0%, transparent 60%), linear-gradient(135deg, #efc9a1 0%, #e6b688 55%, #d9a06c 100%)",
    ribbon: ["var(--brand)", "color-mix(in oklab, var(--brand) 62%, white)", "color-mix(in oklab, var(--brand) 65%, black)"],
    tag: ["#fdf0f1", "#3a2a2c"],
    inner: "radial-gradient(90% 80% at 50% 0%, var(--brand-soft), #fff 70%)",
    accent: "var(--brand)",
    glyph: GIFT,
    glyphStroke: true,
    confetti: ["#f4c542", "var(--brand)", "#f28ca0"],
    texture: true,
  },
  birthday: {
    paper: "linear-gradient(135deg, #ffd9e6, #ffc2d7)",
    motif: svgTile(`<circle cx='10' cy='12' r='3' fill='#ff6f91'/><rect x='40' y='8' width='9' height='5' rx='1.5' transform='rotate(30 44 10)' fill='#4fc3f7'/><circle cx='56' cy='44' r='2.5' fill='#ffd23f'/><rect x='14' y='46' width='9' height='5' rx='1.5' transform='rotate(-25 18 48)' fill='#9c6ade'/><circle cx='34' cy='32' r='2' fill='#4fc3f7'/><rect x='52' y='62' width='8' height='4' rx='1.5' fill='#ff6f91'/>`),
    ribbon: ["#ffd23f", "#fff4b8", "#c99a00"],
    tag: ["#ffffff", "#c2185b"],
    inner: "radial-gradient(90% 80% at 50% 0%, #ffe3ee, #fff 70%)",
    accent: "#d81b60",
    glyph: GIFT,
    glyphStroke: true,
    confetti: ["#ff6f91", "#4fc3f7", "#ffd23f", "#9c6ade"],
  },
  new_year: {
    paper: "radial-gradient(80% 70% at 20% 10%, rgba(255,215,120,.18), transparent 60%), linear-gradient(135deg, #1d2145, #0c0e20)",
    motif: svgTile(at(STAR, 6, 8, 0.7, "#f2c96b", 0.9) + at(STAR, 42, 40, 0.5, "#f2c96b", 0.7) + at(SPARK, 44, 4, 0.45, "#ffffff", 0.7) + at(SPARK, 8, 46, 0.4, "#ffffff", 0.6)),
    ribbon: ["#e9c46a", "#fbe8b4", "#a8862c"],
    tag: ["#fff8e1", "#1d2145"],
    inner: "radial-gradient(90% 80% at 50% 0%, #fff3d6, #fff 70%)",
    accent: "#a87a1f",
    glyph: STAR,
    confetti: ["#e9c46a", "#ffffff", "#c0c4d6", "#f2c96b"],
  },
  valentines: {
    paper: "linear-gradient(135deg, #d0244f, #9b0f37)",
    motif: svgTile(at(HEART, 8, 8, 0.75, "#ff9bb8", 0.75) + at(HEART, 44, 40, 0.6, "#ffd0dd", 0.6, false, -15) + at(HEART, 46, 6, 0.4, "#ffd0dd", 0.5, false, 20)),
    ribbon: ["#ffb3c8", "#ffe6ee", "#d65a7d"],
    tag: ["#ffffff", "#b0103f"],
    inner: "radial-gradient(90% 80% at 50% 0%, #ffe1ea, #fff 70%)",
    accent: "#c81d4e",
    glyph: HEART,
    confetti: ["#ff4d7d", "#ffb3c8", "#ffffff", "#c81d4e"],
  },
  st_patricks: {
    paper: "linear-gradient(135deg, #2f9460, #1b6640)",
    motif: svgTile(at(SHAMROCK, 6, 6, 1, "#9be0b5", 0.8, true) + at(SHAMROCK, 40, 38, 0.8, "#c9f0d6", 0.65, true, 25)),
    ribbon: ["#f2c94c", "#fdedb0", "#b38f1a"],
    tag: ["#fffbea", "#1b6640"],
    inner: "radial-gradient(90% 80% at 50% 0%, #e0f6e8, #fff 70%)",
    accent: "#1e7d4a",
    glyph: SHAMROCK,
    glyphStroke: true,
    confetti: ["#2f9460", "#9be0b5", "#f2c94c", "#ffffff"],
  },
  summer: {
    paper: "linear-gradient(160deg, #8fdcf5, #3db3e0)",
    motif: svgTile(at(SUN, 6, 6, 0.9, "#ffe066", 0.95, true) + at(SUN, 44, 42, 0.6, "#fff3b0", 0.8, true)),
    ribbon: ["#ff8a5b", "#ffd5c2", "#d9653a"],
    tag: ["#fffbe6", "#0b6e99"],
    inner: "radial-gradient(90% 80% at 50% 0%, #def5ff, #fff 70%)",
    accent: "#0b84b8",
    glyph: SUN,
    glyphStroke: true,
    confetti: ["#ffd23f", "#ff8a5b", "#3db3e0", "#ffffff"],
  },
  halloween: {
    paper: "radial-gradient(70% 60% at 80% 10%, rgba(255,140,26,.22), transparent 60%), linear-gradient(135deg, #3b2352, #1a0e26)",
    motif: svgTile(at(BAT, 6, 10, 1, "#ff8c1a", 0.85) + at(BAT, 40, 42, 0.7, "#c9a3ff", 0.7, false, -12)),
    ribbon: ["#ff8c1a", "#ffc999", "#b85c00"],
    tag: ["#fff3e6", "#3b2352"],
    inner: "radial-gradient(90% 80% at 50% 0%, #ffe9d4, #fff 70%)",
    accent: "#e06c00",
    glyph: BAT,
    confetti: ["#ff8c1a", "#7b4bb0", "#1a0e26", "#ffc999"],
  },
  christmas: {
    paper: "linear-gradient(135deg, #1f7a4a, #134e2f)",
    motif: svgTile(at(SNOW, 8, 8, 0.8, "#ffffff", 0.75, true) + at(SNOW, 44, 42, 0.55, "#ffffff", 0.55, true)),
    ribbon: ["#d62828", "#ffffff", "#9e1b1b"],
    tag: ["#ffffff", "#b11f1f"],
    inner: "radial-gradient(90% 80% at 50% 0%, #e3f3e9, #fff 70%)",
    accent: "#c62828",
    glyph: SNOW,
    glyphStroke: true,
    confetti: ["#d62828", "#1f7a4a", "#ffffff", "#f4c542"],
  },
  anniversary: {
    paper: "radial-gradient(100% 80% at 20% 0%, rgba(255,255,255,.6), transparent 60%), linear-gradient(135deg, #f1e3cb, #dcc7a1)",
    motif: svgTile(at(SPARK, 8, 8, 0.6, "#b8925a", 0.7) + at(SPARK, 44, 40, 0.45, "#ffffff", 0.9) + at(SPARK, 46, 8, 0.3, "#b8925a", 0.5)),
    ribbon: ["#b8925a", "#efdcb8", "#8a6a38"],
    tag: ["#fffaf0", "#6b4f24"],
    inner: "radial-gradient(90% 80% at 50% 0%, #f7ecd9, #fff 70%)",
    accent: "#9a7334",
    glyph: SPARK,
    confetti: ["#b8925a", "#efdcb8", "#ffffff", "#8a6a38"],
  },
  winback: {
    paper: "linear-gradient(135deg, #ddd4f6, #bfb0ec)",
    motif: svgTile(at(HEART, 10, 10, 0.55, "#ffffff", 0.7) + at(SPARK, 44, 40, 0.4, "#ffffff", 0.8)),
    ribbon: ["#5b4b9a", "#b9aee6", "#3d3170"],
    tag: ["#ffffff", "#4b3c8c"],
    inner: "radial-gradient(90% 80% at 50% 0%, #ece7ff, #fff 70%)",
    accent: "#5b4b9a",
    glyph: HEART,
    confetti: ["#5b4b9a", "#b9aee6", "#ffffff", "#ff9bb8"],
  },
};

/** A wrapped, themed gift. `children` shows once it's open (claim button, note). */
export function ThemedGift({
  theme = "welcome",
  label,
  gift,
  note,
  tag,
  children,
}: {
  theme?: OfferTheme;
  label: string;
  gift: string;
  note: string;
  tag: string;
  children?: React.ReactNode;
}) {
  const t = THEMES[theme];
  const [state, setState] = React.useState<"wrapped" | "opening" | "open">("wrapped");
  const start = React.useRef<{ x: number; y: number } | null>(null);

  const unwrap = React.useCallback(() => {
    setState((s) => {
      if (s !== "wrapped") return s;
      window.setTimeout(() => setState("open"), 520);
      return "opening";
    });
  }, []);

  const vars = { "--rA": t.ribbon[0], "--rB": t.ribbon[1], "--rEdge": t.ribbon[2] } as React.CSSProperties;
  const long = gift.length > 22;

  return (
    <div style={vars}>
      <div className="relative aspect-[1.65] overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_-12px_rgba(0,0,0,.18)]">
        {/* the gift underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-5 text-center" style={{ background: t.inner }}>
          <span className={`grid shrink-0 place-items-center rounded-full bg-white shadow-[0_6px_16px_-8px_rgba(0,0,0,.35)] ${long ? "size-9" : "size-12"}`} style={{ color: t.accent }}>
            <svg viewBox="0 0 24 24" className={long ? "size-5" : "size-6"} aria-hidden="true">
              <path d={t.glyph} {...(t.glyphStroke ? { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } : { fill: "currentColor" })} />
            </svg>
          </span>
          <p className={`${long ? "mt-1.5" : "mt-2.5"} text-[11px] font-semibold tracking-[0.16em] text-[#8b8e96]`}>{label}</p>
          <p className={`mt-1 font-semibold leading-tight tracking-[-0.02em] ${long ? "text-[19px]" : "text-[24px]"}`} style={{ color: t.accent }}>
            {gift}
          </p>
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-[#6f7380]">{note}</p>
        </div>

        {/* the wrapping */}
        {state !== "open" && (
          <button
            type="button"
            aria-label={`Unwrap your gift: ${tag}`}
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
            <span className={`gift-paper absolute inset-0 ${t.texture ? "has-texture" : ""}`} style={{ background: t.motif ? `${t.motif} 0 0 / 72px 72px, ${t.paper}` : t.paper }} />
            <span className="gift-ribbon-v absolute inset-y-0 left-1/2 w-[30px] -translate-x-1/2" />
            <span className="gift-ribbon-h absolute inset-x-0 top-[54%] h-[30px] -translate-y-1/2" />
            <Bow />
            <span
              className="gift-tag font-hand absolute bottom-[10%] left-[6%] max-w-[64%] -rotate-[7deg] truncate rounded-[6px] px-5 py-1.5 text-[28px] leading-none shadow-[0_6px_14px_-6px_rgba(0,0,0,.35)]"
              style={{ background: t.tag[0], color: t.tag[1] }}
            >
              {tag}
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
                      background: t.confetti[i % t.confetti.length],
                    } as React.CSSProperties
                  }
                />
              ))}
          </button>
        )}
      </div>

      {state === "open" && children}

      <style>{`
        .gift-paper.has-texture::after {
          content: ""; position: absolute; inset: 0; opacity: .22; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .18  0 0 0 .55 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>");
        }
        .gift-ribbon-v, .gift-ribbon-h {
          background: repeating-linear-gradient(135deg, var(--rA) 0 7px, var(--rB) 7px 13px);
          box-shadow: 0 0 0 1px var(--rEdge) inset, 0 4px 10px -4px rgba(0,0,0,.35);
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

/** The gift on the patient home: welcome gift by default, or a seasonal offer while it runs. */
export function GiftCard({
  amountLabel,
  claimBy,
  signedIn,
  theme = "welcome",
  label = "WELCOME GIFT",
  tag = "For you",
  note,
}: {
  amountLabel: string;
  claimBy: string;
  signedIn: boolean;
  theme?: OfferTheme;
  label?: string;
  tag?: string;
  note?: string;
}) {
  const { openJoin, clinicName } = usePatient();
  return (
    <ThemedGift theme={theme} label={label} tag={tag} gift={amountLabel} note={note ?? `Our thank-you for joining. Use it on any treatment or product at ${clinicName}.`}>
      {signedIn ? (
        <p className="gift-claim mt-3 rounded-[12px] bg-brand-soft px-3 py-2.5 text-center text-[13px] text-brand-ink">Mention your gift at checkout. Claim by {claimBy}.</p>
      ) : (
        <button type="button" onClick={() => openJoin(`Join to claim ${amountLabel}.`)} className="gift-claim mt-3 h-[50px] w-full rounded-[14px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-deep">
          Claim my gift
        </button>
      )}
    </ThemedGift>
  );
}

/** A small square of a theme's wrapping paper and ribbon, for lists. */
export function GiftSwatch({ theme, className = "size-10" }: { theme: OfferTheme; className?: string }) {
  const t = THEMES[theme];
  return (
    <span aria-hidden="true" className={`relative block shrink-0 overflow-hidden rounded-[10px] ${className}`} style={{ background: t.motif ? `${t.motif} 0 0 / 40px 40px, ${t.paper}` : t.paper }}>
      <span className="absolute inset-y-0 left-1/2 w-[22%] -translate-x-1/2" style={{ background: `repeating-linear-gradient(135deg, ${t.ribbon[0]} 0 3px, ${t.ribbon[1]} 3px 6px)` }} />
      <span className="absolute inset-x-0 top-1/2 h-[22%] -translate-y-1/2" style={{ background: `repeating-linear-gradient(135deg, ${t.ribbon[0]} 0 3px, ${t.ribbon[1]} 3px 6px)` }} />
    </span>
  );
}

const EDGE: React.CSSProperties = { stroke: "var(--rEdge)" };

function Bow() {
  const id = `bow${React.useId().replace(/:/g, "")}`;
  return (
    <span className="gift-bow absolute left-1/2 top-[54%] aspect-[150/86] w-[42%] max-w-[150px] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
      <svg viewBox="0 0 150 86" className="h-full w-full overflow-visible">
        <defs>
          <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" style={{ fill: "var(--rA)" }} />
            <rect width="4" height="10" style={{ fill: "var(--rB)" }} />
          </pattern>
        </defs>
        {/* tails */}
        <path d="M70 46 L52 84 L62 80 L67 88 L76 50Z" fill={`url(#${id})`} style={EDGE} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M80 46 L98 84 L88 80 L83 88 L74 50Z" fill={`url(#${id})`} style={EDGE} strokeWidth="1.5" strokeLinejoin="round" />
        {/* loops */}
        <path d="M75 40 C58 14 18 8 14 30 C11 48 46 52 75 42Z" fill={`url(#${id})`} style={EDGE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M75 40 C92 14 132 8 136 30 C139 48 104 52 75 42Z" fill={`url(#${id})`} style={EDGE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M70 38 C58 24 32 20 28 30 C26 38 44 42 68 40Z" fill="rgba(0,0,0,.18)" />
        <path d="M80 38 C92 24 118 20 122 30 C124 38 106 42 82 40Z" fill="rgba(0,0,0,.18)" />
        {/* knot */}
        <ellipse cx="75" cy="42" rx="11" ry="10" style={{ ...EDGE, fill: "var(--rA)" }} strokeWidth="2" />
        <ellipse cx="72" cy="39" rx="4" ry="3" fill="rgba(255,255,255,.35)" />
      </svg>
    </span>
  );
}
