"use client";

import * as React from "react";
import { AppBar, Button, Chip } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Clinic } from "@/lib/types";
import { BeforeAfter } from "./before-after";

/** What she can pick, and the concerns each choice points the scan and the treatment match at. */
export const GOALS: Array<{ id: string; label: string; hint: string; concerns: string[] }> = [
  { id: "lines", label: "Lines & wrinkles", hint: "Forehead, frown lines, crow's feet", concerns: ["fine_lines", "sagging"] },
  { id: "texture", label: "Texture & pores", hint: "Smoother, more refined skin", concerns: ["texture", "pores"] },
  { id: "spots", label: "Sun spots & tone", hint: "Even out pigment and brighten", concerns: ["pigmentation", "dullness"] },
  { id: "redness", label: "Redness", hint: "Calm flushing and capillaries", concerns: ["redness"] },
  { id: "breakouts", label: "Breakouts", hint: "Clearer, less congested skin", concerns: ["acne", "pores"] },
  { id: "eyes", label: "Tired eyes", hint: "Dark circles, puffiness, hollows", concerns: ["dark_circles", "under_eye_puffiness", "under_eye_hollows"] },
  { id: "volume", label: "Lost volume", hint: "Cheeks, jawline, under-eyes", concerns: ["sagging", "under_eye_hollows"] },
  { id: "dull", label: "Dull skin", hint: "Glow and hydration", concerns: ["dullness", "hydration"] },
];

export function goalConcerns(ids: string[]) {
  return [...new Set(GOALS.filter((g) => ids.includes(g.id)).flatMap((g) => g.concerns))];
}

/**
 * A real example at the top of the scan: a team-supplied selfie (rights confirmed by the team, Sun Nov 15
 * 2026) run through the same YouCam analysis and preview the app uses. The scores are YouCam's own
 * readings of the before and after images, not numbers we chose.
 */
const EXAMPLE = {
  before: "/examples/scan-example-before.jpg",
  after: "/examples/scan-example-after.jpg",
  width: 600,
  height: 854,
  overall: [75, 78] as const,
  changes: [
    { label: "Eye bags", from: 67, to: 80 },
    { label: "Texture", from: 74, to: 82 },
    { label: "Fine lines", from: 72, to: 79 },
  ],
};

function ExampleScan() {
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="text-[13px] font-medium">See what a scan shows</p>
        <p className="text-[11px] text-ink-muted">Swipe to compare</p>
      </div>
      <BeforeAfter className="mt-2" inline hideDose original={EXAMPLE.before} composite={EXAMPLE.after} width={EXAMPLE.width} height={EXAMPLE.height} initialDose={1} />
      <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[12px]">
        <li className="col-span-2 flex items-center justify-between rounded-field bg-surface-muted px-3 py-2">
          <span className="font-medium">Skin score</span>
          <span className="tabular-nums">
            {EXAMPLE.overall[0]} <span className="text-ink-muted">→</span> <span className="font-semibold text-brand-ink">{EXAMPLE.overall[1]}</span>
          </span>
        </li>
        {EXAMPLE.changes.map((c) => (
          <li key={c.label} className="flex items-center justify-between gap-2 rounded-field bg-surface-muted px-3 py-2 last:col-span-2">
            <span className="truncate">{c.label}</span>
            <span className="shrink-0 tabular-nums">
              {c.from} <span className="text-ink-muted">→</span> <span className="font-semibold text-brand-ink">{c.to}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-[11px] leading-snug text-ink-muted">
        Example photo, used with permission. Scores are YouCam&rsquo;s readings of the before and the AI preview, not a promise of results.
      </p>
    </div>
  );
}

/** Step 1 of 2, optional: what she wants to improve. Picks steer the after-preview and the treatment match. */
export function GoalsScreen({ clinic, onNext }: { clinic: Clinic; onNext: (goalIds: string[]) => void }) {
  const [picked, setPicked] = React.useState<string[]>([]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-phone flex-col bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
      <AppBar title={clinic.name} logoUrl={clinic.logo_url} right={clinic.is_sample ? <Chip>Sample clinic</Chip> : null} />
      <div className="px-4 pt-2">
        <ExampleScan />
        <p className="mt-6 text-[11px] font-medium tracking-[0.12em] text-brand-ink">STEP 1 OF 2 · OPTIONAL</p>
        <h1 className="font-display mt-1 text-[24px] leading-tight">What would you like to improve?</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">Pick any that apply. Your scan still checks everything; this just tells us where to look first.</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {GOALS.map((g) => {
            const on = picked.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(g.id)}
                className={cn(
                  "flex min-h-[78px] flex-col items-start justify-center rounded-card border p-3.5 text-left transition-colors",
                  on ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink",
                )}
              >
                <span className="text-[14px] font-medium leading-tight">{g.label}</span>
                <span className={cn("mt-1 text-[11.5px] leading-snug", on ? "text-white/70" : "text-ink-muted")}>{g.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-auto px-4 pt-6">
        <Button full size="lg" onClick={() => onNext(picked)}>
          {picked.length ? `Continue with ${picked.length} goal${picked.length > 1 ? "s" : ""}` : "Continue"}
        </Button>
        <button type="button" onClick={() => onNext([])} className="mt-3 w-full text-center text-[13px] font-medium text-ink-muted hover:text-ink">
          Skip, just scan my skin
        </button>
      </div>
    </div>
  );
}
