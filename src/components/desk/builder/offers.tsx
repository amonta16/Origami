"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { OFFERS, resolveOffer, type OfferDef, type OfferOverride } from "@/lib/offers";
import { GiftSwatch, ThemedGift } from "@/components/patient/gift-card";
import { CoverPhoto, ItemArt } from "@/components/patient/item-art";
import { Icon } from "@/components/patient/icons";
import { money } from "@/lib/money";
import { AreaField, ErrorText, Field, PillButton, SavingToggle, useDeskAction } from "../ui";
import { Section } from "./section";

export type OfferPreviewData = {
  clinicName: string;
  logoUrl: string | null;
  hero: string;
  heroFallback: string;
  treatments: Array<{ id: string; name: string; image_url: string | null; image_fallback?: string; price_cents: number | null }>;
};

/** Claim-by line for the preview: the offer's last day, or a week from today for person-based offers. */
function claimByFor(def: OfferDef) {
  if (def.window) return new Date(Date.UTC(new Date().getUTCFullYear(), def.window.month - 1, def.window.to, 12)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return new Date(Date.now() + 7 * 864e5).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
}

/**
 * App Builder → Journey → Automated offers. Each offer has a themed, wrapped gift; pick one to
 * edit its gift and note and see it on a patient's home screen in the phone, exactly as the app
 * draws it (same gift component, same photos and menu).
 */
export function OffersEditor({
  slug,
  initialOn,
  initialOverrides,
  settingsReady,
  preview,
}: {
  slug: string;
  initialOn: Record<string, boolean>;
  initialOverrides: Record<string, OfferOverride>;
  settingsReady: boolean;
  preview: OfferPreviewData;
}) {
  const { run, error, pending } = useDeskAction();
  const [selected, setSelected] = React.useState(OFFERS[1].key);
  const [saved, setSaved] = React.useState<Record<string, OfferOverride>>(initialOverrides);
  const [drafts, setDrafts] = React.useState<Record<string, OfferOverride>>(initialOverrides);
  const [wrapKey, setWrapKey] = React.useState(0);
  const [justSaved, setJustSaved] = React.useState<string | null>(null);

  const def = OFFERS.find((o) => o.key === selected)!;
  const draft = drafts[selected] ?? {};
  const shown = resolveOffer(def, preview.clinicName, draft);
  const dirty = (draft.gift ?? "") !== (saved[selected]?.gift ?? "") || (draft.note ?? "") !== (saved[selected]?.note ?? "");

  const toggle = async (key: string, v: boolean) => Boolean(await run(`/api/desk/${slug}/settings`, "PATCH", { journey: { [key]: v } }, { refresh: false }));
  const setDraft = (patch: OfferOverride) => setDrafts((d) => ({ ...d, [selected]: { ...d[selected], ...patch } }));
  const save = async () => {
    const body = { gift: draft.gift ?? "", note: draft.note ?? "" };
    if (await run(`/api/desk/${slug}/settings`, "PATCH", { offers: { [selected]: body } }, { refresh: false })) {
      setSaved((s) => ({ ...s, [selected]: body }));
      setJustSaved(selected);
      setTimeout(() => setJustSaved(null), 2000);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Section title="Automated offers" description="Moments when your app gives a patient a small gift, each in its own wrapping. Pick one to edit it and see it on a patient's phone.">
        <p className="mt-4 rounded-field border border-line bg-page px-4 py-2.5 text-[12px] leading-relaxed text-ink-muted">
          {settingsReady
            ? "Holiday and summer gifts show on your app's home screen during their dates when switched on. Birthday, anniversary and win-back gifts go out by text once texting is connected; nothing is texted from this build."
            : "These switches save once the desk settings database update is applied. Nothing is sent from this build."}
        </p>
        {error && (
          <div className="mt-3">
            <ErrorText>{error}</ErrorText>
          </div>
        )}
        <ul className="mt-4 divide-y divide-line rounded-field border border-line">
          {OFFERS.map((o) => {
            const active = o.key === selected;
            return (
              <li key={o.key} className={cn("transition-colors", active && "bg-brand-soft/40")}>
                <div className="flex items-center gap-3.5 px-3.5 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(o.key);
                      setWrapKey((k) => k + 1);
                    }}
                    aria-pressed={active}
                    className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                  >
                    <GiftSwatch theme={o.theme} className={cn("size-10", active && "ring-2 ring-brand ring-offset-2")} />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium">{o.title}</span>
                      <span className="block truncate text-[12px] text-ink-muted">
                        {o.when} · {resolveOffer(o, preview.clinicName, saved[o.key]).gift}
                      </span>
                    </span>
                  </button>
                  {settingsReady ? (
                    <SavingToggle initial={initialOn[o.key] ?? false} label={`${o.title} on or off`} onSave={(v) => toggle(o.key, v)} />
                  ) : (
                    <span className="rounded-chip bg-surface-muted px-2.5 py-1 text-[11px] text-ink-muted">Pending</span>
                  )}
                </div>
                {active && (
                  <div className="grid gap-3 px-3.5 pb-4 sm:grid-cols-[1fr_1.4fr]">
                    <Field label="Gift" value={draft.gift ?? ""} maxLength={60} placeholder={def.gift} onChange={(e) => setDraft({ gift: e.target.value })} />
                    <AreaField label="Note" rows={2} value={draft.note ?? ""} maxLength={220} placeholder={def.note.replaceAll("{clinic}", preview.clinicName)} onChange={(e) => setDraft({ note: e.target.value })} />
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                      <PillButton variant="brand" disabled={!dirty || pending || !settingsReady} onClick={save}>
                        {justSaved === selected ? "Saved" : "Save offer"}
                      </PillButton>
                      {(draft.gift || draft.note) && (
                        <PillButton variant="ghost" onClick={() => setDraft({ gift: "", note: "" })}>
                          Use our suggestion
                        </PillButton>
                      )}
                      <span className="text-[12px] text-ink-muted">Empty fields use the suggestion shown in gray.</span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-center text-[12px] font-medium text-ink-muted">What patients see · {def.title}</p>
        <PhonePreview data={preview} offer={shown} claimBy={claimByFor(def)} wrapKey={`${selected}-${wrapKey}`} />
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={() => setWrapKey((k) => k + 1)} className="rounded-chip px-3 py-1.5 text-[12px] font-medium text-ink-muted hover:bg-surface-muted hover:text-ink">
            Wrap it again
          </button>
        </div>
        <p className="mt-1 text-center text-[11px] leading-snug text-ink-muted">Shown for an example patient. Tap or swipe the gift to unwrap it.</p>
      </div>
    </div>
  );
}

/** The patient home screen, top section, drawn with the app's own pieces. */
function PhonePreview({ data, offer, claimBy, wrapKey }: { data: OfferPreviewData; offer: ReturnType<typeof resolveOffer>; claimBy: string; wrapKey: string }) {
  const grid = data.treatments.slice(0, 4);
  return (
    <div className="mx-auto w-[300px]">
      <div className="relative aspect-[9/19] rounded-[46px] border-[10px] border-[#111318] bg-[#111318] shadow-[0_40px_80px_-35px_rgba(17,19,24,.5)]">
        <div className="patient-font absolute inset-0 overflow-hidden rounded-[36px] bg-white">
          <div className="relative z-10 flex h-9 items-center justify-between bg-white px-6 text-[11px] font-semibold">
            <span>9:41</span>
            <span className="absolute left-1/2 top-1.5 h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-[#111318]" aria-hidden="true" />
            <span className="h-2 w-5 rounded-[3px] border border-current" aria-hidden="true" />
          </div>
          <div className="absolute inset-x-0 bottom-0 top-9 overflow-y-auto [scrollbar-width:none]">
            {/* app bar */}
            <div className="flex h-12 items-center justify-between px-4">
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoUrl} alt={data.clinicName} className="h-8 max-w-[130px] object-contain object-left" />
              ) : (
                <span className="truncate text-[16px] font-semibold">{data.clinicName}</span>
              )}
              <span className="flex gap-3 text-[#111318]">
                <Icon name="search" className="size-[18px]" />
                <Icon name="bag" className="size-[18px]" />
              </span>
            </div>
            {/* hero + points */}
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden bg-brand-deep">
                <CoverPhoto src={data.hero} fallback={data.heroFallback} alt="" />
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-black/45 to-transparent" />
                <div className="absolute left-4 right-4 top-4 text-white">
                  <p className="text-[18px] font-bold leading-tight drop-shadow-sm">Welcome back!</p>
                  <p className="mt-0.5 truncate text-[12px] text-white/75">{data.clinicName}</p>
                </div>
              </div>
              <div className="relative z-10 -mt-[22px] px-3">
                <div className="flex h-11 items-center gap-2 rounded-[16px] bg-white px-3.5 shadow-[0_10px_28px_-10px_rgba(17,19,24,.28)]">
                  <span className="text-[15px] font-semibold tabular-nums">350</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[#6f7380]">{data.clinicName} points</span>
                  <Icon name="chevron" className="size-3.5 shrink-0" strokeWidth={2} />
                </div>
              </div>
            </div>
            {/* the offer */}
            <section className="px-3 pt-6">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate text-[17px] font-semibold tracking-[-0.015em]">{offer.headline}</h3>
                <span className="shrink-0 text-[11.5px] text-[#7a7d86]">Claim by {claimBy}</span>
              </div>
              <div className="mt-3 [&_.gift-hint]:text-[12px] [&_.gift-tag]:text-[22px]">
                <ThemedGift key={wrapKey} theme={offer.theme} label={offer.label} tag={offer.tag} gift={offer.gift} note={offer.note}>
                  <span className="gift-claim mt-2.5 flex h-[42px] w-full items-center justify-center rounded-[12px] bg-brand text-[14px] font-semibold text-white">Claim my gift</span>
                </ThemedGift>
              </div>
            </section>
            {/* popular */}
            {grid.length > 0 && (
              <section className="px-3 pb-8 pt-7">
                <h3 className="text-center text-[16px] font-semibold">Popular right now</h3>
                <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-4">
                  {grid.map((t) => (
                    <div key={t.id}>
                      <ItemArt src={t.image_url} fallback={t.image_fallback} icon="sparkle" alt={t.name} className="aspect-[4/5] rounded-[8px]" />
                      <p className="mt-1.5 truncate text-[12px]">{t.name}</p>
                      <p className="text-[12px] font-medium">{t.price_cents != null ? money(t.price_cents, { from: true }) : "Price on consultation"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
