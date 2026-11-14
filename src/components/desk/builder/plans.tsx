"use client";

import * as React from "react";
import { money } from "@/lib/money";
import { centsToDollars, dollarsToCents } from "@/lib/desk/format";
import type { DeskPlan } from "@/lib/desk/types";
import { EmptyState } from "../empty";
import { AreaField, CheckRow, ErrorText, Field, Modal, PillButton, SavingToggle, useDeskAction } from "../ui";
import { Section } from "./section";

export function PlansEditor({ slug, items }: { slug: string; items: DeskPlan[] }) {
  const [editing, setEditing] = React.useState<DeskPlan | "new" | null>(null);
  const { run, error } = useDeskAction();
  const close = React.useCallback(() => setEditing(null), []);

  return (
    <Section
      title="Membership plans"
      description="Monthly plans patients can ask to join in the app. You confirm and bill them at the desk; the app never charges a card."
      action={<PillButton onClick={() => setEditing("new")}>Add plan</PillButton>}
    >
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState icon="repeat" title="No plans yet">
          A simple monthly plan gives regulars a reason to stay. Add one to show it in the app.
        </EmptyState>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <li key={p.id} className="flex flex-col rounded-card border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{p.name}</p>
                  <p className="text-[13px] tabular-nums text-ink-soft">{money(p.monthly_price_cents, { perMonth: true })}</p>
                </div>
                <SavingToggle initial={p.active} label={`Show ${p.name} in the app`} onSave={async (v) => Boolean(await run(`/api/desk/${slug}/plans/${p.id}`, "PATCH", { active: v }))} />
              </div>
              {p.tagline && <p className="mt-2 text-[13px] text-ink-muted">{p.tagline}</p>}
              <ul className="mt-3 flex-1 space-y-1 text-[12px] text-ink-soft">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-brand" />
                    {perk}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-ink-muted">
                {p.member_discount_pct}% member discount · {p.monthly_points} bonus points a month
              </p>
              <PillButton variant="ghost" className="mt-3 h-9 w-full" onClick={() => setEditing(p)}>
                Edit
              </PillButton>
            </li>
          ))}
        </ul>
      )}
      <Modal open={editing !== null} onClose={close} title={editing === "new" ? "Add plan" : "Edit plan"}>
        {editing !== null && <PlanForm key={editing === "new" ? "new" : editing.id} slug={slug} item={editing === "new" ? null : editing} onDone={close} />}
      </Modal>
    </Section>
  );
}

function PlanForm({ slug, item, onDone }: { slug: string; item: DeskPlan | null; onDone: () => void }) {
  const { run, pending, error, setError } = useDeskAction();
  const [f, setF] = React.useState({
    name: item?.name ?? "",
    tagline: item?.tagline ?? "",
    price: centsToDollars(item?.monthly_price_cents),
    perks: (item?.perks ?? []).join("\n"),
    discount: String(item?.member_discount_pct ?? 10),
    points: String(item?.monthly_points ?? 0),
    active: item?.active ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const price = dollarsToCents(f.price);
    if (price == null || Number.isNaN(price)) return setError("Add a monthly price, like 99.");
    const body = {
      name: f.name,
      tagline: f.tagline,
      monthly_price_cents: price,
      perks: f.perks.split("\n").map((s) => s.trim()).filter(Boolean),
      member_discount_pct: Number(f.discount || 0),
      monthly_points: Number(f.points || 0),
      active: f.active,
    };
    const ok = item ? await run(`/api/desk/${slug}/plans/${item.id}`, "PATCH", body) : await run(`/api/desk/${slug}/plans`, "POST", body);
    if (ok) onDone();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3.5">
      <Field label="Plan name" value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
      <Field label="Tagline" value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={200} placeholder="One line about who it's for" />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Per month ($)" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} required />
        <Field label="Discount %" inputMode="numeric" value={f.discount} onChange={(e) => set("discount", e.target.value.replace(/\D/g, ""))} />
        <Field label="Points / mo" inputMode="numeric" value={f.points} onChange={(e) => set("points", e.target.value.replace(/\D/g, ""))} />
      </div>
      <AreaField label="Perks, one per line" rows={5} value={f.perks} onChange={(e) => set("perks", e.target.value)} />
      <CheckRow label="Show in the app" hint="Off hides it from patients; current members keep it" checked={f.active} onChange={(v) => set("active", v)} />
      <ErrorText>{error}</ErrorText>
      <PillButton type="submit" className="h-11" disabled={pending}>
        {pending ? "Saving…" : item ? "Save plan" : "Add plan"}
      </PillButton>
    </form>
  );
}
