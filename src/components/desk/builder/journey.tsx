"use client";

import * as React from "react";
import { AUTOMATED_OFFERS, AUTOMATIONS, type JourneyItem } from "@/lib/desk/journey";
import { ErrorText, SavingToggle, useDeskAction } from "../ui";
import { Section } from "./section";

export function JourneyEditor({ slug, view, initial, settingsReady }: { slug: string; view: "offers" | "automations"; initial: Record<string, boolean>; settingsReady: boolean }) {
  const { run, error } = useDeskAction();
  const save = async (key: string, v: boolean) => Boolean(await run(`/api/desk/${slug}/settings`, "PATCH", { journey: { [key]: v } }, { refresh: false }));

  const row = (it: JourneyItem) => (
    <li key={it.key} className="flex items-center gap-4 px-4 py-3.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">{it.title}</span>
        <span className="block text-[12px] text-ink-muted">{it.detail}</span>
      </span>
      <span className="hidden text-right text-[11px] leading-tight text-ink-muted sm:block">
        <span className="font-medium text-ink-soft">0</span> sent
        <br />
        not connected
      </span>
      {settingsReady ? (
        <SavingToggle initial={initial[it.key] ?? false} label={`${it.title} on or off`} onSave={(v) => save(it.key, v)} />
      ) : (
        <span className="rounded-chip bg-surface-muted px-2.5 py-1 text-[11px] text-ink-muted">Pending</span>
      )}
    </li>
  );

  return (
    <Section
      title={view === "offers" ? "Automated offers" : "Automations"}
      description={view === "offers" ? "Moments when your app reaches out with a note or a small gift." : "Messages that follow what a patient does in the app or at the desk."}
    >
      <p className="mt-4 rounded-field border border-line bg-page px-4 py-2.5 text-[12px] text-ink-muted">
        {settingsReady
          ? "Saved now; messages start sending once texting is connected. Nothing is sent from this build."
          : "These switches save once the desk settings database update is applied. Nothing is sent from this build."}
      </p>
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {view === "offers" ? (
        <ul className="mt-4 divide-y divide-line rounded-field border border-line">{AUTOMATED_OFFERS.map(row)}</ul>
      ) : (
        AUTOMATIONS.map((g) => (
          <div key={g.title} className="mt-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{g.title}</h3>
            <ul className="divide-y divide-line rounded-field border border-line">{g.items.map(row)}</ul>
          </div>
        ))
      )}
    </Section>
  );
}
