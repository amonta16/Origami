import type * as React from "react";
import Link from "next/link";
import { PLACEHOLDER_FACE as F } from "@/lib/placeholder-face";

/**
 * "Free skin analysis" card, laid out like the reference: example face with the mesh traced on
 * it, a scanning band, BEFORE + concern pills, and the brand panel with a white pill CTA.
 * The dots sit on landmarks measured from this exact photo (see placeholder-face.ts).
 */
/** The example face with its traced mesh and scanning band. Used on Home and before the camera opens. */
export function MeshPhoto({ fadeTo, className, children }: { fadeTo?: "brand"; className?: string; children?: React.ReactNode }) {
  const k = 95 / 100; // viewBox is 100 × 95 to match the 900 × 855 photo
  const pt = ([x, y]: [number, number]) => `${x},${(y * k).toFixed(2)}`;
  const ovalPath = `M${F.oval.map(pt).join(" L")} Z`;
  const dots = [...F.oval.filter((_, i) => i % 2 === 0), ...F.browL, ...F.browR, ...F.lips.filter((_, i) => i % 2 === 0)];
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={{ aspectRatio: String(F.aspect) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={F.src} alt="Example face for the skin analysis" className="absolute inset-0 h-full w-full object-cover" />
      <svg viewBox="0 0 100 95" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={ovalPath} fill="none" stroke="white" strokeOpacity=".75" strokeWidth=".35" strokeDasharray="1.2 1.4" />
        {dots.map((d, i) => (
          <circle key={i} cx={d[0]} cy={d[1] * k} r={i % 3 === 0 ? 1.05 : 0.8} fill="white" opacity={0.95} className="scan-dot" style={{ animationDelay: `${(i % 12) * 90}ms` }} />
        ))}
      </svg>
      <span aria-hidden="true" className="scan-band pointer-events-none absolute inset-x-0 h-[9%]" />
      {children}
      <span className="absolute bottom-1.5 right-2 z-10 text-[9px] text-white/75">Example photo · Unsplash</span>
      {fadeTo === "brand" && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-deep to-transparent" />}
      <style>{`
        .scan-band { top: 0; background: linear-gradient(180deg, transparent, rgba(255,255,255,.55) 45%, rgba(255,255,255,.55) 55%, transparent); animation: scan-sweep 3.2s ease-in-out infinite; }
        @keyframes scan-sweep { 0% { transform: translateY(80%); } 50% { transform: translateY(820%); } 100% { transform: translateY(80%); } }
        .scan-dot { animation: scan-dot 2.4s ease-in-out infinite; }
        @keyframes scan-dot { 0%,100% { opacity: .95; } 50% { opacity: .55; } }
        @media (prefers-reduced-motion: reduce) { .scan-band, .scan-dot { animation: none; } }
      `}</style>
    </div>
  );
}

export function ScanCard({ href, clinicName }: { href: string; clinicName: string }) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-brand-deep shadow-[0_10px_30px_-18px_rgba(0,0,0,.5)]">
      <MeshPhoto fadeTo="brand">
        <span className="absolute left-3 top-3 rounded-[8px] bg-black/55 px-2.5 py-1 text-[12px] font-bold tracking-[0.04em] text-white backdrop-blur-sm">BEFORE</span>
        <span className="absolute rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#3a3d45] backdrop-blur-sm" style={{ left: `${F.pills.fineLines[0]}%`, top: `${F.pills.fineLines[1]}%` }}>
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#b9bcc4] align-middle" />
          Fine lines
        </span>
      </MeshPhoto>
      <div className="bg-[linear-gradient(180deg,var(--brand-deep)_0%,color-mix(in_oklab,var(--brand-deep)_80%,black)_100%)] px-5 pb-6 pt-2">
        <p className="text-[12px] font-semibold tracking-[0.12em] text-white/75">FREE SKIN ANALYSIS</p>
        <h3 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.015em] text-white">What is your skin asking for?</h3>
        <p className="mt-2 text-[14px] leading-snug text-white/85">One selfie. Your skin score, what to treat first, and a preview of your results with {clinicName}.</p>
        <Link href={href} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-medium text-[#111318] hover:bg-white/90">
          Start the 1-minute scan
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
