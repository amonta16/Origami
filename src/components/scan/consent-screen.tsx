"use client";

import * as React from "react";
import { AppBar, Button, Chip } from "@/components/ui";
import { preloadLandmarker } from "@/lib/face/landmarker";
import type { Clinic } from "@/lib/types";

export function ConsentScreen({ clinic, onAgree }: { clinic: Clinic; onAgree: () => void }) {
  const [biometric, setBiometric] = React.useState(false);
  const [adult, setAdult] = React.useState(false);

  React.useEffect(() => {
    preloadLandmarker();
  }, []);

  const ready = biometric && adult;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-phone flex-col bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
      <AppBar title={clinic.name} logoUrl={clinic.logo_url} right={clinic.is_sample ? <Chip>Sample clinic</Chip> : null} />
      <div className="px-4 pt-2">
        <p className="text-[11px] font-medium tracking-[0.12em] text-brand-ink">BEFORE THE CAMERA OPENS</p>
        <h1 className="font-display mt-1 text-[24px]">Here is exactly what happens with your photo.</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          Facet maps your face with a live 3D mesh, scores a few cosmetic concerns and shows what a treatment could look like on you.
        </p>

        <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-surface">
          {[
            ["Your face is biometric data", "The scan runs on your phone. One photo goes to our servers and an AI image service to score it and render the preview."],
            ["Kept 72 hours, then deleted", "Unless you choose to keep your results. Never sold, never used to train anything, never used for anything but your scan."],
            ["Cosmetic estimates, not a diagnosis", "A clinician confirms everything in person. If something looks medical, we say so and suggest a doctor."],
            ["Student project", "Facet is being built at the Cal Poly AI Hackathon, Nov 13–15, 2026."],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3 p-4">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
              <div>
                <p className="text-[14px] font-medium">{t}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{d}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2.5">
          <Check checked={biometric} onChange={setBiometric}>
            I consent to Facet processing a photo of my face as described above.
          </Check>
          <Check checked={adult} onChange={setAdult}>
            I am 18 or older.
          </Check>
        </div>
      </div>

      <div className="mt-auto px-4 pt-6">
        <Button full size="lg" disabled={!ready} onClick={onAgree}>
          Open the camera
        </Button>
        <p className="mt-3 text-center text-[12px] text-ink-muted">You can stop at any time. Nothing is saved until your scan finishes.</p>
      </div>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line bg-surface p-4 has-[:checked]:border-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0" />
      <span className="text-[14px] leading-snug">{children}</span>
    </label>
  );
}
