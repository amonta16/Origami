"use client";

import * as React from "react";
import { Segmented } from "@/components/ui/chip";
import { money } from "@/lib/money";
import { PRODUCT_KIND_LABEL, centsToDollars, dollarsToCents, monogram } from "@/lib/desk/format";
import type { DeskProduct } from "@/lib/desk/types";
import { EmptyState } from "../empty";
import { AreaField, ErrorText, Field, Modal, Monogram, PillButton, SavingToggle, useDeskAction } from "../ui";
import { Section } from "./section";

type Kind = DeskProduct["kind"];
type Filter = "all" | Kind;

export function ShopEditor({ slug, items }: { slug: string; items: DeskProduct[] }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [editing, setEditing] = React.useState<DeskProduct | { kind: Kind } | null>(null);
  const { run, error } = useDeskAction();
  const close = React.useCallback(() => setEditing(null), []);
  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const noPrice = items.filter((i) => i.price_cents == null).length;
  const count = (k: Kind) => items.filter((i) => i.kind === k).length;

  return (
    <Section
      title="Shop"
      description="Packages, skincare and gift cards patients can ask for in the app. Nothing is charged online: requests land in Shop orders and you take payment at the desk."
      action={
        <div className="flex flex-wrap gap-1.5">
          {(["package", "skincare", "gift_card"] as Kind[]).map((k) => (
            <PillButton key={k} variant="secondary" className="h-9 px-3.5" onClick={() => setEditing({ kind: k })}>
              + {PRODUCT_KIND_LABEL[k]}
            </PillButton>
          ))}
        </div>
      }
    >
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All · ${items.length}` },
            { value: "package", label: `Packages · ${count("package")}` },
            { value: "skincare", label: `Skincare · ${count("skincare")}` },
            { value: "gift_card", label: `Gift cards · ${count("gift_card")}` },
          ]}
        />
        {noPrice > 0 && <p className="text-[12px] text-ink-muted">{noPrice} item{noPrice === 1 ? " has" : "s have"} no price; the app shows &ldquo;Ask about this&rdquo;.</p>}
      </div>
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState icon="bag" title="Nothing here yet">
          Add a package, a skincare product or a gift card with the buttons above.
        </EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-field border border-line">
          {shown.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- clinic-supplied URL, any host
                <img src={p.image_url} alt="" className="size-11 shrink-0 rounded-field object-cover" />
              ) : (
                <Monogram text={monogram(p.name)} />
              )}
              <button type="button" onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14px] font-medium hover:underline">{p.name}</span>
                <span className="block truncate text-[12px] text-ink-muted">
                  {[PRODUCT_KIND_LABEL[p.kind], p.price_cents != null ? money(p.price_cents) : "No price yet", p.sessions ? `${p.sessions} sessions` : null].filter(Boolean).join(" · ")}
                </span>
              </button>
              <SavingToggle initial={p.active} label={`Show ${p.name} in the app`} onSave={async (v) => Boolean(await run(`/api/desk/${slug}/products/${p.id}`, "PATCH", { active: v }))} />
            </li>
          ))}
        </ul>
      )}
      <Modal open={editing !== null} onClose={close} title={editing && "id" in editing ? `Edit ${PRODUCT_KIND_LABEL[editing.kind].toLowerCase()}` : `Add ${editing ? PRODUCT_KIND_LABEL[editing.kind].toLowerCase() : "item"}`}>
        {editing && <ProductForm key={"id" in editing ? editing.id : `new-${editing.kind}`} slug={slug} kind={editing.kind} item={"id" in editing ? editing : null} onDone={close} />}
      </Modal>
    </Section>
  );
}

function ProductForm({ slug, kind, item, onDone }: { slug: string; kind: Kind; item: DeskProduct | null; onDone: () => void }) {
  const { run, pending, error, setError } = useDeskAction();
  const [f, setF] = React.useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: centsToDollars(item?.price_cents),
    member_price: centsToDollars(item?.member_price_cents),
    sessions: item?.sessions ? String(item.sessions) : "",
    image_url: item?.image_url ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const price = dollarsToCents(f.price);
    const member = dollarsToCents(f.member_price);
    if (Number.isNaN(price) || Number.isNaN(member)) return setError("Prices must be numbers, like 120 or 44.50.");
    const body = {
      kind,
      name: f.name,
      description: f.description,
      price_cents: price,
      member_price_cents: kind === "gift_card" ? null : member,
      sessions: kind === "package" && f.sessions ? Number(f.sessions) : null,
      image_url: f.image_url,
    };
    const ok = item ? await run(`/api/desk/${slug}/products/${item.id}`, "PATCH", body) : await run(`/api/desk/${slug}/products`, "POST", body);
    if (ok) onDone();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3.5">
      <Field label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
      <AreaField label="Description" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price ($)" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="Blank = ask" />
        {kind !== "gift_card" && <Field label="Member price ($)" inputMode="decimal" value={f.member_price} onChange={(e) => set("member_price", e.target.value)} placeholder="Optional" />}
        {kind === "package" && <Field label="Sessions" inputMode="numeric" value={f.sessions} onChange={(e) => set("sessions", e.target.value.replace(/\D/g, ""))} placeholder="3" />}
      </div>
      <Field label="Image URL (optional)" type="url" value={f.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://" />
      <ErrorText>{error}</ErrorText>
      <PillButton type="submit" className="h-11" disabled={pending}>
        {pending ? "Saving…" : item ? "Save" : "Add to shop"}
      </PillButton>
    </form>
  );
}
