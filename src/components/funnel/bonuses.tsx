import type * as React from "react";
import { MeshPhoto } from "@/components/patient/scan-card";
import { clinicPhotos } from "@/lib/stock-photos";
import { money } from "@/lib/money";
import type { Clinic, Treatment } from "@/lib/types";
import { CopyButton } from "./preview-client";

/**
 * Three launch bonuses on the owner preview, each made from this spa's own name, color, photos
 * and menu: a website banner (real file + embed code), three short promo reels (animated
 * previews), and a counter card with a QR code to the scan (real print file).
 */
export function Bonuses({ clinic, treatments, origin }: { clinic: Clinic; treatments: Treatment[]; origin: string }) {
  const short = clinic.name.split(/\s+[|\-–—·]\s+|\s+l\s+/)[0];
  const banner = `/api/promo/${clinic.slug}/banner`;
  const card = `/api/promo/${clinic.slug}/scan-card`;
  const embed = `<a href="${origin}/s/${clinic.slug}/scan"><img src="${origin}${banner}" alt="Free AI skin analysis at ${short.replace(/"/g, "")}" width="600" style="max-width:100%;height:auto"></a>`;

  return (
    <section className="mt-10">
      <p className="text-[12px] font-medium text-brand-ink">Free when you go live</p>
      <h2 className="font-display mt-1 text-[22px]">Three launch bonuses, made for {short}</h2>
      <p className="mt-1.5 text-[14px] leading-snug text-ink-muted">Built from your name, colors, photos and menu, like the app.</p>

      <div className="mt-5 flex flex-col gap-4">
        {/* 1. website banner */}
        <article className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="bg-surface-muted p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner} alt={`Website banner for ${short}`} className="w-full rounded-[10px] shadow-[0_10px_24px_-14px_rgba(17,19,24,.45)]" />
          </div>
          <div className="p-4">
            <BonusTitle n={1} title="A website banner that starts the scan" />
            <p className="mt-1 text-[14px] leading-snug text-ink-muted">Paste it on your site or link page. Visitors tap it and land in your free skin scan.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={embed} label="Copy embed code" />
              <a href={`${banner}?download=1`} className="inline-flex h-9 items-center rounded-chip border border-line-strong px-3.5 text-[13px] font-medium hover:bg-surface-muted">
                Download banner
              </a>
            </div>
          </div>
        </article>

        {/* 2. promo reels */}
        <article className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="bg-[#111318] p-4">
            <PromoReels clinic={clinic} treatments={treatments} short={short} />
          </div>
          <div className="p-4">
            <BonusTitle n={2} title="Three short promo videos" />
            <p className="mt-1 text-[14px] leading-snug text-ink-muted">Vertical clips for Reels, TikTok and Stories: your new app, the free scan, and your most popular treatment. Shown here as animated previews; we export them as videos at launch.</p>
          </div>
        </article>

        {/* 3. scan counter card */}
        <article className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="relative grid place-items-center overflow-hidden bg-surface-muted px-4 py-5">
            <div className="relative w-[46%] max-w-[210px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card} alt={`Counter card with a QR code to ${short}'s skin scan`} className="w-full rounded-[8px] shadow-[0_14px_30px_-16px_rgba(17,19,24,.5)]" />
              <ScanningPhone />
            </div>
          </div>
          <div className="p-4">
            <BonusTitle n={3} title="A scan station for your front desk" />
            <p className="mt-1 text-[14px] leading-snug text-ink-muted">A 5 × 7 counter card with your QR code. Waiting patients scan their face, see what to treat, and book before they leave.</p>
            <div className="mt-3">
              <a href={`${card}?download=1`} className="inline-flex h-9 items-center rounded-chip border border-line-strong px-3.5 text-[13px] font-medium hover:bg-surface-muted">
                Download print file
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function BonusTitle({ n, title }: { n: number; title: string }) {
  return (
    <h3 className="flex items-center gap-2.5 text-[16px] font-semibold">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[12px] text-white">{n}</span>
      {title}
    </h3>
  );
}

/** A phone that floats over the counter card and "reads" the QR (loop). */
function ScanningPhone() {
  return (
    <span aria-hidden="true" className="bn-phone absolute -right-[38%] top-[44%] h-[46%] w-[38%] rounded-[12px] border-[3px] border-[#111318] bg-[#1b1c20] shadow-[0_16px_30px_-12px_rgba(0,0,0,.55)]">
      <span className="absolute inset-[6%] overflow-hidden rounded-[8px] bg-[radial-gradient(circle_at_50%_40%,#3a3d45,#16171a)]">
        <span className="bn-frame absolute left-1/2 top-[38%] size-[56%] -translate-x-1/2 -translate-y-1/2 rounded-[6px] border-2 border-white/80" />
        <span className="bn-ok absolute inset-x-[10%] bottom-[10%] rounded-full bg-white py-[3px] text-center text-[7px] font-semibold text-[#111318]">Skin scan</span>
      </span>
      <style>{`
        .bn-phone { animation: bn-float 4.2s ease-in-out infinite; }
        @keyframes bn-float { 0%, 100% { transform: translate(0, 0) rotate(-8deg); } 50% { transform: translate(-30%, -24%) rotate(-4deg); } }
        .bn-frame { animation: bn-frame 4.2s ease-in-out infinite; }
        @keyframes bn-frame { 0%, 35% { border-color: rgba(255,255,255,.8); } 50%, 80% { border-color: #7fe0b0; } 100% { border-color: rgba(255,255,255,.8); } }
        .bn-ok { opacity: 0; animation: bn-ok 4.2s ease-in-out infinite; }
        @keyframes bn-ok { 0%, 45% { opacity: 0; transform: translateY(4px); } 55%, 85% { opacity: 1; transform: none; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .bn-phone, .bn-frame, .bn-ok { animation: none; } .bn-ok { opacity: 1; } }
      `}</style>
    </span>
  );
}

/** Three 9:16 story-style clips: photo motion, progress bars and captions on a 6.6 s loop. */
function PromoReels({ clinic, treatments, short }: { clinic: Clinic; treatments: Treatment[]; short: string }) {
  const photos = clinicPhotos(clinic);
  const star = treatments.find((t) => t.popular && t.image_url) ?? treatments.find((t) => t.image_url) ?? null;
  const reels: Array<{ key: string; bg: React.ReactNode; captions: [string, string, string]; tag: string }> = [
    {
      key: "app",
      tag: "Your new app",
      // eslint-disable-next-line @next/next/no-img-element
      bg: <img src={photos.hero} alt="" className="rl-kb absolute inset-0 h-full w-full object-cover" />,
      captions: [`${short} has an app`, "Points on every visit", "Tap the link to join"],
    },
    {
      key: "scan",
      tag: "Free skin scan",
      bg: <MeshPhoto creditTop className="!absolute inset-0 !aspect-auto h-full w-full" />,
      captions: ["One selfie", "Your skin score in 60 s", `Free at ${short}`],
    },
    {
      key: "star",
      tag: "Most popular",
      // eslint-disable-next-line @next/next/no-img-element
      bg: star?.image_url ? <img src={star.image_url} alt="" className="rl-kb absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0 bg-brand" />,
      captions: [star?.name ?? "Our favorite treatment", star?.price_cents != null ? money(star.price_cents, { from: true }) : "Ask about pricing", "Book it in the app"],
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5" aria-label="Animated previews of three promo videos">
      {reels.map((r) => (
        <div key={r.key} className="relative aspect-[9/16] overflow-hidden rounded-[12px] bg-[#1b1c20]">
          {r.bg}
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.45)_0%,transparent_30%,transparent_55%,rgba(0,0,0,.75)_100%)]" />
          <span aria-hidden="true" className="absolute inset-x-2 top-2 flex gap-1">
            {[1, 2, 3].map((i) => (
              <span key={i} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/35">
                <span className={`rl-seg rl-seg${i} block h-full origin-left rounded-full bg-white`} />
              </span>
            ))}
          </span>
          <span className="absolute left-2 top-4 text-[9px] font-semibold text-white/90">{r.tag}</span>
          <span className="absolute inset-x-2 bottom-3 h-[3.2em] text-[12px] font-bold leading-tight text-white sm:text-[13px]">
            {r.captions.map((c, i) => (
              <span key={i} className={`rl-cap rl-cap${i + 1} absolute inset-x-0 bottom-0`}>
                {c}
              </span>
            ))}
          </span>
        </div>
      ))}
      <style>{`
        .rl-kb { animation: rl-kb 13.2s ease-in-out infinite alternate; }
        @keyframes rl-kb { from { transform: scale(1.04); } to { transform: scale(1.18) translate(-3%, -2%); } }
        .rl-seg { transform: scaleX(0); animation: 6.6s linear infinite; }
        .rl-seg1 { animation-name: rl-seg1; } .rl-seg2 { animation-name: rl-seg2; } .rl-seg3 { animation-name: rl-seg3; }
        @keyframes rl-seg1 { 0% { transform: scaleX(0); } 33.3%, 100% { transform: scaleX(1); } }
        @keyframes rl-seg2 { 0%, 33.3% { transform: scaleX(0); } 66.6%, 100% { transform: scaleX(1); } }
        @keyframes rl-seg3 { 0%, 66.6% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
        .rl-cap { opacity: 0; animation: 6.6s ease-out infinite; }
        .rl-cap1 { animation-name: rl-cap1; } .rl-cap2 { animation-name: rl-cap2; } .rl-cap3 { animation-name: rl-cap3; }
        @keyframes rl-cap1 { 0% { opacity: 0; transform: translateY(8px); } 4%, 30% { opacity: 1; transform: none; } 33.3%, 100% { opacity: 0; } }
        @keyframes rl-cap2 { 0%, 33.3% { opacity: 0; transform: translateY(8px); } 37.3%, 63.6% { opacity: 1; transform: none; } 66.6%, 100% { opacity: 0; } }
        @keyframes rl-cap3 { 0%, 66.6% { opacity: 0; transform: translateY(8px); } 70.6%, 97% { opacity: 1; transform: none; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .rl-kb, .rl-seg, .rl-cap { animation: none; } .rl-seg { transform: scaleX(1); } .rl-cap1 { opacity: 1; } }
      `}</style>
    </div>
  );
}
