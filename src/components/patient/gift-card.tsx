"use client";

import * as React from "react";
import type { OfferTheme } from "@/lib/offers";
import { GiftArt } from "./gift-art";
import { usePatient } from "./patient-provider";

/**
 * Wrapped gifts with "Scratch to unwrap". Each offer has its own illustrated wrapping
 * (gift-art.tsx) with a handwritten name tag; one short swipe or a tap peels it away in about
 * half a second, with confetti, to show the gift underneath. Pure CSS/SVG.
 */

const GIFT = "M4 10h16v10H4zM12 10v10M3 7h18v3H3zM12 7c-1.5 0-4-1-4-2.5S10 2 12 4.5C14 2 16 3 16 4.5S13.5 7 12 7Z";
const HEART = "M12 21s-7-4.4-9.3-8.6C1 9 3 5.5 6.5 5.5c2 0 3.6 1.2 5.5 3.2 1.9-2 3.5-3.2 5.5-3.2C21 5.5 23 9 21.3 12.4 19 16.6 12 21 12 21Z";
const STAR = "M12 2.5l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7Z";
const TAG = "M3 12V4h8l10 10-8 8L3 12ZM7.5 7.5h.01";

/** What's under the wrapping: background tint, accent color, icon and confetti colors. */
const INSIDE: Record<OfferTheme, { inner: string; accent: string; glyph: string; stroke?: boolean; confetti: string[] }> = {
  welcome: { inner: "radial-gradient(90% 80% at 50% 0%, var(--brand-soft), #fff 70%)", accent: "var(--brand)", glyph: GIFT, stroke: true, confetti: ["#f4c542", "var(--brand)", "#f28ca0"] },
  birthday: { inner: "radial-gradient(90% 80% at 50% 0%, #ffe6dc, #fff 70%)", accent: "#d7262b", glyph: GIFT, stroke: true, confetti: ["#d7262b", "#f4c542", "#4fc3f7", "#9c6ade"] },
  anniversary: { inner: "radial-gradient(90% 80% at 50% 0%, #f7ecd9, #fff 70%)", accent: "#9a7334", glyph: STAR, confetti: ["#c08f35", "#f6dc8f", "#ffffff", "#6a5630"] },
  new_year: { inner: "radial-gradient(90% 80% at 50% 0%, #fff3d6, #fff 70%)", accent: "#a87a1f", glyph: STAR, confetti: ["#e9c46a", "#ffffff", "#c0c4d6", "#7a5f2c"] },
  valentines: { inner: "radial-gradient(90% 80% at 50% 0%, #ffe1ec, #fff 70%)", accent: "#e01e76", glyph: HEART, confetti: ["#ff4f9f", "#ffc6df", "#ffffff", "#4a1030"] },
  st_patricks: { inner: "radial-gradient(90% 80% at 50% 0%, #e0f6e8, #fff 70%)", accent: "#1e7d4a", glyph: GIFT, stroke: true, confetti: ["#6cc860", "#1f8040", "#f2c230", "#ffffff"] },
  easter: { inner: "radial-gradient(90% 80% at 50% 0%, #fff4cf, #fff 70%)", accent: "#8a55c9", glyph: GIFT, stroke: true, confetti: ["#2bb3b1", "#ff7aa8", "#9b6bd6", "#ffd45e"] },
  summer: { inner: "radial-gradient(90% 80% at 50% 0%, #def5ff, #fff 70%)", accent: "#0b84b8", glyph: GIFT, stroke: true, confetti: ["#ffd23f", "#ff5a5f", "#47b9e8", "#ffffff"] },
  halloween: { inner: "radial-gradient(90% 80% at 50% 0%, #ffe9d4, #fff 70%)", accent: "#e06c00", glyph: GIFT, stroke: true, confetti: ["#f08a1c", "#5b2f86", "#ffd84a", "#1a0a28"] },
  black_friday: { inner: "radial-gradient(90% 80% at 50% 0%, #ececee, #fff 70%)", accent: "#111318", glyph: TAG, stroke: true, confetti: ["#111318", "#8d8d92", "#ffffff", "#e33652"] },
  christmas: { inner: "radial-gradient(90% 80% at 50% 0%, #fde3ea, #fff 70%)", accent: "#c8102e", glyph: GIFT, stroke: true, confetti: ["#d3112f", "#2f9e5a", "#ffffff", "#c8a032"] },
  winback: { inner: "radial-gradient(90% 80% at 50% 0%, #ece7ff, #fff 70%)", accent: "#5b4b9a", glyph: HEART, confetti: ["#a68ee8", "#ff5a8f", "#ffffff", "#3d3170"] },
};

/** A wrapped, themed gift. `children` shows once it's open (claim button, note). */
export function ThemedGift({
  theme = "welcome",
  label,
  gift,
  note,
  tag,
  hint = "Scratch to unwrap",
  children,
}: {
  theme?: OfferTheme;
  label: string;
  gift: string;
  note: string;
  /** handwritten on the name tag: the patient's first name, or a short phrase */
  tag: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  const t = INSIDE[theme];
  const [state, setState] = React.useState<"wrapped" | "opening" | "open">("wrapped");
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const long = gift.length > 22;

  const unwrap = React.useCallback(() => {
    setState((s) => {
      if (s !== "wrapped") return s;
      window.setTimeout(() => setState("open"), 520);
      return "opening";
    });
  }, []);

  return (
    <div>
      <div className="relative aspect-[1.72] overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.06),0_10px_26px_-12px_rgba(0,0,0,.28)]">
        {/* the gift underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-5 text-center" style={{ background: t.inner }}>
          <span className={`grid shrink-0 place-items-center rounded-full bg-white shadow-[0_6px_16px_-8px_rgba(0,0,0,.35)] ${long ? "size-9" : "size-12"}`} style={{ color: t.accent }}>
            <svg viewBox="0 0 24 24" className={long ? "size-5" : "size-6"} aria-hidden="true">
              <path d={t.glyph} {...(t.stroke ? { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const } : { fill: "currentColor" })} />
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
            aria-label={`Unwrap your gift: ${label.toLowerCase()}`}
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
            <span className="gift-art absolute inset-0">
              <GiftArt theme={theme} />
            </span>
            <span className="gift-tag font-hand absolute bottom-[9%] left-[5%] max-w-[58%] -rotate-[9deg] truncate rounded-[4px] bg-[#fdeef3] px-5 py-1.5 text-[26px] leading-none text-[#2a1d22] shadow-[0_6px_14px_-6px_rgba(0,0,0,.45)]">
              {tag}
            </span>
            {state === "wrapped" && (
              <span className="gift-hint absolute left-1/2 top-[7%] whitespace-nowrap rounded-[8px] bg-[#1f2126] px-3.5 py-2 text-[14px] font-medium text-white shadow-lg">
                {hint}
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-[7px] border-t-[7px] border-x-transparent border-t-[#1f2126]" />
              </span>
            )}
            {state === "opening" &&
              Array.from({ length: 18 }, (_, i) => (
                <span
                  key={i}
                  className="gift-confetti absolute left-1/2 top-[52%] h-2.5 w-1.5 rounded-[1px]"
                  style={
                    {
                      "--dx": `${Math.cos((i / 18) * Math.PI * 2) * (90 + (i % 3) * 30)}px`,
                      "--dy": `${Math.sin((i / 18) * Math.PI * 2) * (70 + (i % 4) * 18) - 20}px`,
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
        .gift-hint { animation: gift-bob 1.8s ease-in-out infinite; }
        @keyframes gift-bob { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -4px); } }
        .gift-wrap .gift-art { transition: transform .5s cubic-bezier(.5,0,.3,1), opacity .45s ease, clip-path .5s cubic-bezier(.5,0,.3,1); clip-path: inset(0 0 0 0 round 16px); }
        .gift-wrap .gift-tag { transition: transform .45s cubic-bezier(.5,0,.3,1), opacity .4s ease; }
        .gift-wrap.is-opening .gift-art { transform: scale(1.1) rotate(-3deg) translateY(-6%); opacity: 0; clip-path: inset(0 0 100% 0 round 16px); }
        .gift-wrap.is-opening .gift-tag { transform: translate(-30px, 46px) rotate(-26deg); opacity: 0; }
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
  firstName,
  theme = "welcome",
  label = "WELCOME GIFT",
  tag = "For you",
  note,
}: {
  amountLabel: string;
  claimBy: string;
  signedIn: boolean;
  firstName?: string | null;
  theme?: OfferTheme;
  label?: string;
  tag?: string;
  note?: string;
}) {
  const { openJoin, clinicName } = usePatient();
  return (
    <ThemedGift theme={theme} label={label} tag={firstName?.trim() || tag} gift={amountLabel} note={note ?? `Our thank-you for joining. Use it on any treatment or product at ${clinicName}.`}>
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

/** A small card of an offer's wrapping with its name tag, for lists and notifications. */
export function GiftSwatch({ theme, className = "h-[56px] w-[92px]" }: { theme: OfferTheme; className?: string }) {
  return (
    <span aria-hidden="true" className={`relative block shrink-0 overflow-hidden rounded-[10px] ${className}`}>
      <GiftArt theme={theme} />
      <span className="font-hand absolute bottom-[10%] left-[5%] -rotate-[9deg] rounded-[2px] bg-[#fdeef3] px-[7%] text-[8px] leading-[1.5] text-[#2a1d22]">First Name</span>
    </span>
  );
}
