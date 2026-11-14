"use client";

import * as React from "react";
import Link from "next/link";
import { ErrorText, SavingToggle, useDeskAction } from "../ui";
import { Section } from "./section";

export function ScanSetting({ slug, enabled, settingsReady }: { slug: string; enabled: boolean; settingsReady: boolean }) {
  const { run, error } = useDeskAction();
  return (
    <Section
      title="AI skin scan"
      description="Patients take a selfie and get a cosmetic skin score, a map of where their concerns are, and the treatments on your menu that fit. It's an estimate, not a medical diagnosis."
      action={
        <Link href={`/s/${slug}/scan`} className="inline-flex h-9 items-center rounded-chip border border-line-strong px-4 text-[13px] font-medium hover:border-ink">
          Try it
        </Link>
      }
    >
      <div className="mt-5 flex items-center justify-between gap-4 rounded-field bg-surface-muted px-4 py-3.5">
        <div>
          <p className="text-[14px] font-medium">Show the skin scan in your app</p>
          <p className="text-[12px] text-ink-muted">
            {settingsReady ? "Controls whether patients are offered the scan in your app." :"This switch saves once the desk settings database update is applied."}
          </p>
        </div>
        {settingsReady ? (
          <SavingToggle initial={enabled} label="Show the skin scan in your app" onSave={async (v) => Boolean(await run(`/api/desk/${slug}/settings`, "PATCH", { scan_enabled: v }))} />
        ) : (
          <span className="rounded-chip bg-surface px-3 py-1 text-[12px] text-ink-muted">Pending update</span>
        )}
      </div>
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {[
          { t: "Leads that come with context", d: "Finished scans appear in Skin scans with each patient's top concerns, so the consult starts informed." },
          { t: "Only your menu", d: "Recommendations come from treatments you offer and have switched on." },
          { t: "Careful with photos", d: "Consent comes first, adults only, and raw photos auto-delete after 72 hours unless the patient keeps them." },
        ].map((c) => (
          <div key={c.t} className="rounded-field bg-surface-muted px-4 py-3.5">
            <p className="text-[13px] font-medium">{c.t}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{c.d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
