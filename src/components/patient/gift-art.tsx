"use client";

import * as React from "react";
import type { OfferTheme } from "@/lib/offers";

/**
 * Illustrated wrapping for each offer's gift card, drawn for Origami in a flat sticker style
 * (bold outlines, flat fills, one highlight). 330 × 200 artboard; the handwritten name tag is
 * laid over it in HTML so it can carry the patient's first name.
 */
export function GiftArt({ theme, year, className }: { theme: OfferTheme; year?: number; className?: string }) {
  const uid = React.useId().replace(/:/g, "");
  const id = (s: string) => `${s}-${uid}`;
  const Art = ART[theme];
  return (
    <svg viewBox="0 0 330 200" preserveAspectRatio="xMidYMid slice" className={className ?? "h-full w-full"} aria-hidden="true">
      <Art id={id} year={year ?? defaultYear()} />
    </svg>
  );
}

/** The year a New Year gift celebrates: next year from July on. */
function defaultYear() {
  const d = new Date();
  return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
}

type ArtProps = { id: (s: string) => string; year: number };

const HEART = "M12 21s-7-4.4-9.3-8.6C1 9 3 5.5 6.5 5.5c2 0 3.6 1.2 5.5 3.2 1.9-2 3.5-3.2 5.5-3.2C21 5.5 23 9 21.3 12.4 19 16.6 12 21 12 21Z";

/* ---------- shared bits ---------- */

/** A many-loop gift bow centered at (cx, cy). */
function Bow({ cx, cy, fill, light, edge, r = 1 }: { cx: number; cy: number; fill: string; light: string; edge: string; r?: number }) {
  const loop = "M0 0 C-9 -26 -30 -44 -10 -50 C10 -54 12 -26 0 0Z";
  return (
    <g transform={`translate(${cx} ${cy}) scale(${r})`}>
      <path d="M-4 4 L-26 46 L-16 42 L-12 52 L4 8Z" style={{ fill, stroke: edge }} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M4 4 L22 48 L12 44 L8 54 L-2 8Z" style={{ fill, stroke: edge }} strokeWidth="2.4" strokeLinejoin="round" />
      {[-70, -35, 0, 35, 70, 110, 250].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d={loop} style={{ fill, stroke: edge }} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M-2 -8 C-6 -24 -16 -36 -9 -42" fill="none" style={{ stroke: light }} strokeWidth="2.4" strokeLinecap="round" opacity=".9" />
        </g>
      ))}
      <circle r="9" style={{ fill, stroke: edge }} strokeWidth="2.4" />
      <circle cx="-2.5" cy="-2.5" r="3" style={{ fill: light }} opacity=".8" />
    </g>
  );
}

function Ribbons({ x, y, w, fill, light, edge }: { x: number; y: number; w: number; fill: string; light: string; edge: string }) {
  return (
    <g>
      <rect x={x - w / 2} y="-5" width={w} height="210" style={{ fill, stroke: edge }} strokeWidth="2" />
      <rect x={x - 3} y="-5" width="4" height="210" style={{ fill: light }} opacity=".75" />
      <rect x="-5" y={y - w / 2} width="340" height={w} style={{ fill, stroke: edge }} strokeWidth="2" />
      <rect x="-5" y={y - 3} width="340" height="4" style={{ fill: light }} opacity=".75" />
    </g>
  );
}

/* ---------- themes ---------- */

function Kraft({ id, ribbon = "#d7262b", light = "#ff8a8a", edge = "#9e1418", seal }: ArtProps & { ribbon?: string; light?: string; edge?: string; seal?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id={id("k")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0c697" />
          <stop offset=".6" stopColor="#e5b07c" />
          <stop offset="1" stopColor="#d69a63" />
        </linearGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("k")})`} />
      {[18, 46, 77, 104, 139, 171, 188].map((y, i) => (
        <path key={y} d={`M-5 ${y} C80 ${y + (i % 2 ? 4 : -3)} 210 ${y + (i % 2 ? -3 : 5)} 335 ${y + 1}`} stroke="#b8804b" strokeWidth=".8" opacity=".35" fill="none" />
      ))}
      <Ribbons x={150} y={112} w={24} fill={ribbon} light={light} edge={edge} />
      <Bow cx={150} cy={108} fill={ribbon} light={light} edge={edge} />
      {seal && (
        <g transform="translate(272 52)">
          <path d={starburst(34, 30, 40)} fill="#222" />
          <circle r="27" fill="#fff" />
          <circle r="22" fill="none" stroke="#222" strokeWidth="1" strokeDasharray="1.5 2.5" />
          <path id={id("arc")} d="M-19 0 A19 19 0 1 1 19 0 A19 19 0 1 1 -19 0" fill="none" />
          <text fontSize="6.4" fontWeight="700" letterSpacing="1.2" fill="#222" fontFamily="Helvetica, Arial, sans-serif">
            <textPath href={`#${id("arc")}`}>HAPPY BIRTHDAY ✦ HAPPY BIRTHDAY ✦</textPath>
          </text>
          <path d={HEART} transform="translate(-7 -8) scale(.6)" fill="#d7262b" />
        </g>
      )}
    </>
  );
}

function starburst(ro: number, ri: number, n: number) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = (i / (n * 2)) * Math.PI * 2;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
}

function Christmas({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={id("c")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d3112f" />
          <stop offset="1" stopColor="#a30a22" />
        </linearGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("c")})`} />
      {["M-10 40 C20 10 40 70 70 38 S120 20 130 50", "M210 170 C230 140 260 196 285 160 S320 150 340 175", "M240 20 C255 45 280 0 300 30 S320 50 340 30", "M10 150 C30 175 50 130 72 160"].map((d) => (
        <path key={d} d={d} fill="none" stroke="#c8a032" strokeWidth="2.6" strokeLinecap="round" />
      ))}
      {[[38, 112, 8, "#fff"], [262, 128, 9, "#fff"], [118, 186, 7, "#fff"], [294, 92, 6, "#f45a6e"], [70, 70, 5, "#2f9e5a"], [300, 186, 10, "#e33652"]].map(([x, y, r, f]) => (
        <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r={r as number} fill={f as string} />
      ))}
      <g transform="rotate(-6 165 100)">
        <Ribbons x={168} y={104} w={30} fill="#fde3ec" light="#ffffff" edge="#f2a9c0" />
      </g>
      <Bow cx={166} cy={96} fill="#fde3ec" light="#ffffff" edge="#e98fae" r={1.1} />
    </>
  );
}

function Valentines({ id }: ArtProps) {
  const scatter: Array<[number, number, number, number]> = [
    [10, 10, 1.1, -15], [62, 52, 0.8, 20], [24, 118, 1, 10], [96, 150, 0.9, -25], [104, 18, 0.7, 30], [270, 10, 1, 15], [300, 70, 0.8, -20], [280, 140, 1.1, 25], [230, 170, 0.8, -10], [140, 168, 0.7, 15], [150, 6, 0.6, -30], [50, 170, 0.7, 0],
  ];
  return (
    <>
      <defs>
        <radialGradient id={id("v")} cx=".5" cy=".4" r=".8">
          <stop offset="0" stopColor="#ff5aa5" />
          <stop offset="1" stopColor="#e3207a" />
        </radialGradient>
        <linearGradient id={id("b")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4f9f" />
          <stop offset="1" stopColor="#e01e76" />
        </linearGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("v")})`} />
      {scatter.map(([x, y, s, r]) => (
        <path key={`${x}-${y}`} d={HEART} transform={`translate(${x} ${y}) rotate(${r} 12 12) scale(${s * 1.3})`} fill="none" stroke="#ffc6df" strokeWidth={2.2 / (s * 1.3)} strokeLinejoin="round" opacity=".9" />
      ))}
      {/* strings, from each balloon's tip down off the card */}
      <path d="M240 112 C232 140 248 168 226 205" fill="none" stroke="#4a1030" strokeWidth="3" strokeLinecap="round" />
      <path d="M170 100 C182 134 160 166 178 205" fill="none" stroke="#4a1030" strokeWidth="3" strokeLinecap="round" />
      {/* back balloon, tilted, pivoting on its tip */}
      <g transform="translate(240 112) rotate(18) scale(4.3) translate(-12 -21)">
        <path d={HEART} fill={`url(#${id("b")})`} stroke="#4a1030" strokeWidth=".85" strokeLinejoin="round" />
      </g>
      <path d="M236 116 l4 -6 l4 6z" fill="#4a1030" />
      {/* front balloon */}
      <g transform="translate(170 100) rotate(-4) scale(5.1) translate(-12 -21)">
        <path d={HEART} fill={`url(#${id("b")})`} stroke="#4a1030" strokeWidth=".75" strokeLinejoin="round" />
        <path d="M5.2 10 C5.3 7.8 6.7 6.7 8.4 6.8" fill="none" stroke="#fff" strokeWidth=".9" strokeLinecap="round" />
      </g>
      <path d="M166 104 l4 -6 l4 6z" fill="#4a1030" />
    </>
  );
}

function Halloween({ id }: ArtProps) {
  const pumpkin = (x: number, s: number) => (
    <g transform={`translate(${x} 150) scale(${s})`}>
      <path d="M-3 -34 C-3 -44 2 -48 8 -48" fill="none" stroke="#3d5a1e" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="-16" cy="0" rx="22" ry="30" fill="#f08a1c" stroke="#5a2a00" strokeWidth="3" />
      <ellipse cx="16" cy="0" rx="22" ry="30" fill="#f08a1c" stroke="#5a2a00" strokeWidth="3" />
      <ellipse cx="0" cy="0" rx="20" ry="32" fill="#f79a2c" stroke="#5a2a00" strokeWidth="3" />
      <path d="M-20 -8 l9 -9 l5 11z M20 -8 l-9 -9 l-5 11z" fill="#ffd84a" stroke="#5a2a00" strokeWidth="2" strokeLinejoin="round" />
      <path d="M-22 8 L-14 14 L-8 9 L-2 16 L4 9 L10 15 L16 9 L22 8 C16 24 -16 24 -22 8Z" fill="#ffd84a" stroke="#5a2a00" strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
  return (
    <>
      <defs>
        <linearGradient id={id("h")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b2f86" />
          <stop offset="1" stopColor="#2a1240" />
        </linearGradient>
        <radialGradient id={id("m")}>
          <stop offset="0" stopColor="#fff4c9" />
          <stop offset=".4" stopColor="#fff4c9" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff4c9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("h")})`} />
      <circle cx="270" cy="40" r="44" fill={`url(#${id("m")})`} />
      <circle cx="270" cy="40" r="16" fill="#fff4c9" />
      {[[40, 30], [96, 52], [200, 24]].map(([x, y]) => (
        <path key={x} d="M0 6c3-2 5-2 7 0 .6-2 1.8-3 3-3l.5-2 .5 1.5.5-1.5.5 2c1.2 0 2.4 1 3 3 2-2 4-2 7 0-2.4.6-3.4 2.4-3.6 4.6-1.8-1.6-3.4-1.4-4.6.4-.8-.8-1.6-1.2-2.8-1.2s-2 .4-2.8 1.2c-1.2-1.8-2.8-2-4.6-.4C3.4 8.4 2.4 6.6 0 6Z" transform={`translate(${x} ${y}) scale(1.4)`} fill="#1a0a28" />
      ))}
      <path d="M-5 172 C60 158 120 176 170 166 S280 156 335 170 L335 205 L-5 205Z" fill="#1d0b2c" />
      {pumpkin(72, 0.95)}
      {pumpkin(166, 1.15)}
      {pumpkin(262, 0.95)}
    </>
  );
}

function StPatricks({ id }: ArtProps) {
  const leaf = "M0 0 C-14 -6 -22 -24 -12 -32 C-4 -38 2 -30 0 -22 C-2 -30 6 -38 14 -32 C24 -24 14 -6 0 0Z";
  const shamrock = (x: number, y: number, s: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 C2 14 -2 26 -10 34" fill="none" stroke="#2c7a32" strokeWidth="4" strokeLinecap="round" />
      {[0, 120, 240].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d={leaf} fill="#6cc860" stroke="#2c7a32" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M0 -4 L0 -22" stroke="#3f9a44" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
  return (
    <>
      <defs>
        <linearGradient id={id("g")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f8040" />
          <stop offset="1" stopColor="#145a2c" />
        </linearGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("g")})`} />
      {shamrock(40, 46, 1.4, -20)}
      {shamrock(292, 40, 1.2, 25)}
      {shamrock(276, 162, 1.6, -10)}
      {shamrock(70, 168, 1, 15)}
      {shamrock(200, 186, 0.8, 40)}
      {/* leprechaun hat */}
      <g transform="translate(165 98) rotate(-8)">
        <ellipse cx="0" cy="34" rx="62" ry="14" fill="#9ccc2c" stroke="#3b5e10" strokeWidth="3" />
        <path d="M-34 32 L-26 -40 C-10 -46 10 -46 26 -40 L34 32 Z" fill="#b5dd3a" stroke="#3b5e10" strokeWidth="3" strokeLinejoin="round" />
        <path d="M-31 6 L31 6 L32 20 L-32 20Z" fill="#1d1d1d" />
        <rect x="-10" y="3" width="20" height="20" rx="2" fill="none" stroke="#f2c230" strokeWidth="4" />
        <path d="M-20 -36 L-14 16" stroke="#d6f07a" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      </g>
    </>
  );
}

function NewYear({ id, year }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={id("n")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a5f2c" />
          <stop offset=".55" stopColor="#3e2f15" />
          <stop offset="1" stopColor="#8a6d33" />
        </linearGradient>
        <linearGradient id={id("t")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe7a6" />
          <stop offset=".5" stopColor="#e0b85c" />
          <stop offset="1" stopColor="#b08431" />
        </linearGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("n")})`} />
      {Array.from({ length: 26 }, (_, i) => (
        <circle key={i} cx={(i * 53) % 330} cy={(i * 37 + 11) % 200} r={i % 4 ? 1.4 : 2.4} fill="#f6dc8f" opacity={i % 3 ? 0.5 : 0.9} />
      ))}
      {[[40, 30, -30], [292, 40, 20], [60, 172, 10], [280, 168, -20]].map(([x, y, r]) => (
        <rect key={x} x={x} y={y} width="10" height="3" rx="1.5" transform={`rotate(${r} ${x} ${y})`} fill="#e9c46a" />
      ))}
      <text x="165" y="58" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="4" fill="#f3dfa8" fontFamily="Helvetica, Arial, sans-serif">
        HAPPY NEW YEAR
      </text>
      <text x="165" y="142" textAnchor="middle" fontSize="84" fontWeight="800" fontFamily="Georgia, 'Times New Roman', serif" fill={`url(#${id("t")})`} stroke="#5a4317" strokeWidth="2" letterSpacing="2">
        {year}
      </text>
      <path d="M86 156 L244 156" stroke="#e0b85c" strokeWidth="1.5" opacity=".7" />
    </>
  );
}

function BlackFriday({ id }: ArtProps) {
  const tag = (x: number, y: number, r: number, label: string, s = 1) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M-30 -18 L22 -18 L36 0 L22 18 L-30 18 Z" fill="#2c2c2e" stroke="#444" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="24" cy="0" r="3.5" fill="#141414" stroke="#555" />
      <text x="-4" y="5" textAnchor="middle" fontSize="13" fontWeight="800" fill="#6a6a6e" fontFamily="Helvetica, Arial, sans-serif">
        {label}
      </text>
    </g>
  );
  return (
    <>
      <defs>
        <radialGradient id={id("bf")} cx=".5" cy=".5" r=".75">
          <stop offset="0" stopColor="#2a2a2c" />
          <stop offset="1" stopColor="#0e0e10" />
        </radialGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("bf")})`} />
      {tag(54, 34, -12, "SALE")}
      {tag(160, 26, 8, "50%", 1.1)}
      {tag(276, 40, -18, "80%", 1.15)}
      {tag(30, 112, 70, "60%")}
      {tag(120, 104, -6, "SALE", 1.3)}
      {tag(230, 112, 14, "90%", 1.2)}
      {tag(306, 140, -60, "SALE")}
      {tag(80, 182, 10, "40%")}
      {tag(196, 178, -14, "20%")}
      <text x="165" y="150" textAnchor="middle" fontSize="15" fontWeight="800" letterSpacing="5" fill="#8d8d92" fontFamily="Helvetica, Arial, sans-serif" opacity=".9">
        BLACK FRIDAY
      </text>
    </>
  );
}

function Easter({ id }: ArtProps) {
  const egg = "M0 -34 C18 -34 26 -6 26 8 C26 24 14 34 0 34 C-14 34 -26 24 -26 8 C-26 -6 -18 -34 0 -34Z";
  const eggs: Array<[number, number, number, string, string]> = [
    [58, 64, -20, "#2bb3b1", "#ff7aa8"],
    [252, 58, 18, "#9b6bd6", "#2bb3b1"],
    [118, 150, 12, "#ff7aa8", "#9b6bd6"],
    [292, 160, -14, "#2bb3b1", "#ffb347"],
  ];
  return (
    <>
      <rect width="330" height="200" fill="#ffd45e" />
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx={(i * 61 + 15) % 330} cy={(i * 43 + 7) % 200} r="3" fill="#fff3c4" />
      ))}
      {eggs.map(([x, y, r, a, b], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(1.25)`}>
          <clipPath id={id(`e${i}`)}>
            <path d={egg} />
          </clipPath>
          <path d={egg} fill="#fff7ec" />
          <g clipPath={`url(#${id(`e${i}`)})`}>
            <rect x="-30" y="-14" width="60" height="9" fill={a} />
            <path d="M-30 6 L-22 -2 L-14 6 L-6 -2 L2 6 L10 -2 L18 6 L26 -2 L30 2 L30 12 L-30 12Z" fill={b} />
            <rect x="-30" y="18" width="60" height="6" fill={a} />
            {[-14, 0, 14].map((cx) => (
              <circle key={cx} cx={cx} cy="-24" r="2.6" fill={b} />
            ))}
          </g>
          <path d={egg} fill="none" stroke="#3b2a4a" strokeWidth="2.6" />
        </g>
      ))}
    </>
  );
}

function Anniversary({ id }: ArtProps) {
  return (
    <>
      <defs>
        <radialGradient id={id("a")} cx=".5" cy=".45" r=".8">
          <stop offset="0" stopColor="#6a5630" />
          <stop offset="1" stopColor="#241c0e" />
        </radialGradient>
        <linearGradient id={id("o")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe7a6" />
          <stop offset="1" stopColor="#c08f35" />
        </linearGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("a")})`} />
      {[30, 70, 120, 210, 260, 300].map((x, i) => (
        <path key={x} d={`M${x} -5 L${x - 40} 205`} stroke="#e8c779" strokeWidth={i % 2 ? 1 : 2} opacity=".18" />
      ))}
      {Array.from({ length: 18 }, (_, i) => (
        <path key={i} d="M0 -5 C.6 -1 1 -.6 5 0 C1 .6 .6 1 0 5 C-.6 1 -1 .6 -5 0 C-1 -.6 -.6 -1 0 -5Z" transform={`translate(${(i * 71 + 20) % 330} ${(i * 29 + 14) % 200}) scale(${i % 3 ? 0.7 : 1.3})`} fill="#f6dc8f" opacity={i % 2 ? 0.6 : 1} />
      ))}
      <text x="165" y="128" textAnchor="middle" fontSize="104" fontWeight="800" fontFamily="Georgia, 'Times New Roman', serif" fill={`url(#${id("o")})`} stroke="#4a3714" strokeWidth="2">
        1
      </text>
      <text x="165" y="156" textAnchor="middle" fontSize="9.5" fontWeight="700" letterSpacing="3.5" fill="#f3dfa8" fontFamily="Helvetica, Arial, sans-serif">
        YEAR AS A CLIENT
      </text>
    </>
  );
}

function Winback({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={id("w")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d6c8f8" />
          <stop offset="1" stopColor="#a68ee8" />
        </linearGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("w")})`} />
      {[[20, 20, 1, -15], [80, 150, 0.8, 20], [270, 20, 1.1, 15], [290, 140, 0.9, -20], [36, 96, 0.7, 10], [230, 172, 0.7, 0]].map(([x, y, s, r]) => (
        <path key={`${x}-${y}`} d={HEART} transform={`translate(${x} ${y}) rotate(${r} 12 12) scale(${s * 1.3})`} fill="none" stroke="#ffffff" strokeWidth={2.2 / (s * 1.3)} opacity=".85" />
      ))}
      <g transform="translate(165 104) rotate(-6)">
        <rect x="-62" y="-40" width="124" height="80" rx="6" fill="#ffffff" stroke="#3d3170" strokeWidth="3.5" />
        <path d="M-62 -36 L0 8 L62 -36" fill="none" stroke="#3d3170" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M-62 40 L-14 0 M62 40 L14 0" stroke="#3d3170" strokeWidth="2.5" />
        <path d={HEART} transform="translate(-13 -6) scale(1.1)" fill="#ff5a8f" stroke="#3d3170" strokeWidth="2" />
      </g>
    </>
  );
}

function Summer({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={id("s")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8adcf8" />
          <stop offset="1" stopColor="#47b9e8" />
        </linearGradient>
      </defs>
      <rect width="330" height="200" fill={`url(#${id("s")})`} />
      <g transform="translate(262 52)">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M0 -40 L6 -30 L-6 -30Z" transform={`rotate(${i * 30})`} fill="#ffd23f" stroke="#c97a00" strokeWidth="2" strokeLinejoin="round" />
        ))}
        <circle r="26" fill="#ffd23f" stroke="#c97a00" strokeWidth="3" />
        <path d="M-12 4 C-6 12 6 12 12 4" fill="none" stroke="#c97a00" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <path d="M-5 150 C30 136 60 160 95 146 S160 132 200 148 S280 162 335 144 L335 205 L-5 205Z" fill="#1f8fd0" stroke="#0b4a6f" strokeWidth="3" />
      <path d="M20 170 C40 162 56 176 76 168 M150 176 C170 168 186 182 206 174 M250 168 C270 160 286 174 306 166" fill="none" stroke="#bfe9ff" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(82 92)">
        <circle r="34" fill="#fff" stroke="#0b4a6f" strokeWidth="3" />
        <path d="M0 -34 C-20 -20 -20 20 0 34 C-30 30 -40 -10 0 -34Z" fill="#ff5a5f" />
        <path d="M0 -34 C20 -20 20 20 0 34 C30 30 40 -10 0 -34Z" fill="#ffc53d" />
        <circle r="34" fill="none" stroke="#0b4a6f" strokeWidth="3" />
        <circle r="6" fill="#fff" stroke="#0b4a6f" strokeWidth="2.5" />
      </g>
    </>
  );
}

const ART: Record<OfferTheme, (p: ArtProps) => React.ReactElement> = {
  welcome: (p) => <Kraft {...p} ribbon="var(--brand)" light="color-mix(in oklab, var(--brand) 45%, white)" edge="color-mix(in oklab, var(--brand) 65%, black)" />,
  birthday: (p) => <Kraft {...p} seal />,
  christmas: Christmas,
  valentines: Valentines,
  halloween: Halloween,
  st_patricks: StPatricks,
  new_year: NewYear,
  black_friday: BlackFriday,
  easter: Easter,
  anniversary: Anniversary,
  winback: Winback,
  summer: Summer,
};
