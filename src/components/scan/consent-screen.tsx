"use client";

import * as React from "react";
import { Button } from "@/components/ui";
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
    <div className="mx-auto flex min-h-dvh w-full max-w-phone flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <p className="text-sm text-ink-muted">{clinic.name}{clinic.is_sample && " · Sample clinic"}</p>
      <h1 className="font-display mt-2 text-[34px]">Before the camera opens</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        Facet maps your face with a live 3D mesh, scores a few cosmetic concerns and
        shows what a treatment could look like on you. Here is exactly what happens
        with your photo.
      </p>

      <ul className="mt-5 space-y-3 text-[15px] leading-relaxed">
        <li className="flex gap-3">
          <Dot />
          <span>
            <strong className="font-medium">Your face is biometric data.</strong> The scan runs on
            your phone; one photo is sent to our servers and an AI image service to score
            it and render the preview.
          </span>
        </li>
        <li className="flex gap-3">
          <Dot />
          <span>
            <strong className="font-medium">Kept for 72 hours, then deleted,</strong> unless you
            choose to keep your results. Never sold, never used to train anything, never
            used for anything but your scan.
          </span>
        </li>
        <li className="flex gap-3">
          <Dot />
          <span>
            <strong className="font-medium">Cosmetic estimates, not a diagnosis.</strong> A
            clinician confirms everything in person. If something looks medical, we will
            say so and suggest a doctor.
          </span>
        </li>
        <li className="flex gap-3">
          <Dot />
          <span>
            <strong className="font-medium">Student project.</strong> Facet is being built at the
            Cal Poly AI Hackathon, Nov 13–15, 2026.
          </span>
        </li>
      </ul>

      <div className="mt-6 space-y-3">
        <Check checked={biometric} onChange={setBiometric}>
          I consent to Facet processing a photo of my face as described above.
        </Check>
        <Check checked={adult} onChange={setAdult}>
          I am 18 or older.
        </Check>
      </div>

      <div className="mt-auto pt-6">
        <Button full size="lg" disabled={!ready} onClick={onAgree}>
          Open the camera
        </Button>
        <p className="mt-3 text-center text-xs text-ink-muted">
          You can stop at any time. Nothing is saved until your scan finishes.
        </p>
      </div>
    </div>
  );
}

function Dot() {
  return <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />;
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-field border border-line-strong bg-surface p-4 has-[:checked]:border-accent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
      />
      <span className="text-[15px] leading-snug">{children}</span>
    </label>
  );
}
