"use client";

import * as React from "react";
import { money } from "@/lib/money";
import { CATEGORY_LABEL, centsToDollars, dollarsToCents, monogram, recallLabel } from "@/lib/desk/format";
import type { DeskTreatment } from "@/lib/desk/types";
import { EmptyState } from "../empty";
import { AreaField, CheckRow, ErrorText, Field, Modal, Monogram, PillButton, SavingToggle, SelectField, useDeskAction } from "../ui";
import { Section } from "./section";

export function TreatmentsEditor({ slug, items }: { slug: string; items: DeskTreatment[] }) {
  const [editing, setEditing] = React.useState<DeskTreatment | "new" | null>(null);
  const { run, error: toggleError } = useDeskAction();
  const close = React.useCallback(() => setEditing(null), []);

  return (
    <Section
      title="Treatments"
      description="Your menu in the app. The result window is how the desk knows who's due again."
      action={<PillButton onClick={() => setEditing("new")}>Add treatment</PillButton>}
    >
      {toggleError && <div className="mt-4"><ErrorText>{toggleError}</ErrorText></div>}
      {items.length === 0 ? (
        <EmptyState icon="sparkle" title="No treatments yet">
          Add what you offer and it shows up in the app&rsquo;s shop and scan results.
        </EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-field border border-line">
          {items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
              <Monogram text={monogram(t.name)} />
              <button type="button" onClick={() => setEditing(t)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium hover:underline">{t.name}</span>
                  {t.popular && <span className="shrink-0 rounded-chip bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink">Popular</span>}
                </span>
                <span className="block truncate text-[12px] text-ink-muted">
                  {[CATEGORY_LABEL[t.category ?? "consult"], t.duration_min ? `${t.duration_min} min` : null, t.price_cents != null ? money(t.price_cents) : "No price yet", recallLabel(t.result_days)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
              <SavingToggle
                initial={t.active}
                label={`Show ${t.name} in the app`}
                onSave={async (v) => Boolean(await run(`/api/desk/${slug}/treatments/${t.id}`, "PATCH", { active: v }))}
              />
            </li>
          ))}
        </ul>
      )}
      <Modal open={editing !== null} onClose={close} title={editing === "new" ? "Add treatment" : "Edit treatment"}>
        {editing !== null && <TreatmentForm key={editing === "new" ? "new" : editing.id} slug={slug} item={editing === "new" ? null : editing} onDone={close} />}
      </Modal>
    </Section>
  );
}

function TreatmentForm({ slug, item, onDone }: { slug: string; item: DeskTreatment | null; onDone: () => void }) {
  const { run, pending, error, setError } = useDeskAction();
  const [f, setF] = React.useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    category: item?.category ?? "injectables",
    duration_min: item?.duration_min ? String(item.duration_min) : "",
    price: centsToDollars(item?.price_cents),
    member_price: centsToDollars(item?.member_price_cents),
    result_weeks: item?.result_days ? String(Math.round((item.result_days / 7) * 10) / 10) : "",
    popular: item?.popular ?? false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const price = dollarsToCents(f.price);
    const member = dollarsToCents(f.member_price);
    if (Number.isNaN(price) || Number.isNaN(member)) return setError("Prices must be numbers, like 450 or 45.50.");
    const weeks = f.result_weeks.trim() ? Number(f.result_weeks) : null;
    if (weeks != null && (!Number.isFinite(weeks) || weeks <= 0)) return setError("Due again must be a number of weeks.");
    const body = {
      name: f.name,
      description: f.description,
      category: f.category,
      duration_min: f.duration_min.trim() ? Number(f.duration_min) : null,
      price_cents: price,
      member_price_cents: member,
      result_days: weeks != null ? Math.max(1, Math.round(weeks * 7)) : null,
      popular: f.popular,
    };
    const ok = item ? await run(`/api/desk/${slug}/treatments/${item.id}`, "PATCH", body) : await run(`/api/desk/${slug}/treatments`, "POST", body);
    if (ok) onDone();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3.5">
      <Field label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
      <AreaField label="Description" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Category" value={f.category} onChange={(e) => set("category", e.target.value as typeof f.category)} options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))} />
        <Field label="Minutes" inputMode="numeric" value={f.duration_min} onChange={(e) => set("duration_min", e.target.value.replace(/\D/g, ""))} placeholder="45" />
        <Field label="Price ($)" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="Leave blank for ask" />
        <Field label="Member price ($)" inputMode="decimal" value={f.member_price} onChange={(e) => set("member_price", e.target.value)} placeholder="Optional" />
      </div>
      <Field label="Due again after (weeks)" inputMode="decimal" value={f.result_weeks} onChange={(e) => set("result_weeks", e.target.value)} hint="How long results usually last. Patients due shows them when this runs out." placeholder="12" />
      <CheckRow label="Popular" hint="Shown first in the app" checked={f.popular} onChange={(v) => set("popular", v)} />
      <ErrorText>{error}</ErrorText>
      <PillButton type="submit" className="h-11" disabled={pending}>
        {pending ? "Saving…" : item ? "Save treatment" : "Add treatment"}
      </PillButton>
    </form>
  );
}
