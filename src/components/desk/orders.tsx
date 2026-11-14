"use client";

import * as React from "react";
import { Segmented } from "@/components/ui/chip";
import { money } from "@/lib/money";
import { fmtDateTime } from "@/lib/desk/format";
import type { OrderRow } from "@/lib/desk/types";
import { EmptyState } from "./empty";
import { ErrorText, PillButton, useDeskAction } from "./ui";

type Filter = "requested" | "confirmed" | "cancelled";

const KIND: Record<OrderRow["kind"], string> = { treatment: "Treatment", product: "Shop item", membership: "Membership" };

export function Orders({ slug, rows }: { slug: string; rows: OrderRow[] }) {
  const [filter, setFilter] = React.useState<Filter>("requested");
  const { run, pending, error } = useDeskAction();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const count = (s: Filter) => rows.filter((r) => r.status === s).length;
  const shown = rows.filter((r) => r.status === filter);

  async function act(id: string, status: "confirmed" | "cancelled") {
    setBusyId(id);
    await run(`/api/desk/${slug}/requests/${id}`, "POST", { status });
    setBusyId(null);
  }

  return (
    <div className="rounded-card border border-line bg-surface shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "requested", label: `Waiting · ${count("requested")}` },
            { value: "confirmed", label: `Confirmed · ${count("confirmed")}` },
            { value: "cancelled", label: `Cancelled · ${count("cancelled")}` },
          ]}
        />
        <p className="text-[12px] text-ink-muted">No payment is taken in the app. Confirm when you&rsquo;ve charged them at the desk.</p>
      </div>
      {error && (
        <div className="p-4 pb-0">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState icon="bag" title={filter === "requested" ? "Nothing waiting" : filter === "confirmed" ? "No confirmed orders yet" : "No cancelled orders"}>
          {filter === "requested" ? "When a patient taps Buy or Join in the app, the request lands here." : null}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 md:px-5">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium">{r.item_name}</span>
                  <span className="shrink-0 rounded-chip bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">{KIND[r.kind]}</span>
                </span>
                <span className="block text-[12px] text-ink-muted">
                  {r.lead_name} · {r.lead_phone} · {fmtDateTime(r.created_at)}
                  {r.note ? ` · “${r.note}”` : ""}
                </span>
              </span>
              <span className="text-[14px] font-medium tabular-nums">{r.price_cents != null ? money(r.price_cents, { perMonth: r.kind === "membership" }) : "Price at the desk"}</span>
              {r.status === "requested" ? (
                <span className="flex gap-1.5">
                  <PillButton className="h-8 px-3.5" disabled={pending && busyId === r.id} onClick={() => act(r.id, "confirmed")}>
                    Confirm
                  </PillButton>
                  <PillButton variant="ghost" className="h-8 px-3.5" disabled={pending && busyId === r.id} onClick={() => act(r.id, "cancelled")}>
                    Cancel
                  </PillButton>
                </span>
              ) : (
                <span className={r.status === "confirmed" ? "rounded-chip bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700" : "rounded-chip bg-surface-muted px-2.5 py-1 text-[12px] font-medium text-ink-muted"}>
                  {r.status === "confirmed" ? "Confirmed" : "Cancelled"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
