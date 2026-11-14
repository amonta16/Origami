"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/money";
import { fmtDate, fmtDateTime, fmtShort, monogram } from "@/lib/desk/format";
import type { LeadDetail } from "@/lib/desk/types";
import { ErrorText, PillButton, useDeskAction } from "./ui";

/** Load one patient's desk panel by id. */
export function useLeadDetail(slug: string) {
  const [lead, setLead] = React.useState<LeadDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(
    async (id: string, opts: { silent?: boolean } = {}) => {
      // Silent reloads keep the panel (and any success message) on screen.
      if (!opts.silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/desk/${slug}/leads/${id}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { lead?: LeadDetail; error?: string };
        if (!res.ok || !data.lead) {
          setError(data.error ?? "Couldn't load that patient.");
          setLead(null);
        } else setLead(data.lead);
      } catch {
        setError("Couldn't reach the server.");
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );
  return { lead, setLead, loading, error, load };
}

export function PatientPanel({ slug, lead, onChanged, children }: { slug: string; lead: LeadDetail; onChanged: () => void; children?: React.ReactNode }) {
  const { run, pending, error } = useDeskAction();
  const unused = lead.redemptions.filter((r) => !r.used_at);
  const openReq = lead.requests.filter((r) => r.status === "requested");

  async function markUsed(id: string) {
    if (await run(`/api/desk/${slug}/redemptions/${id}`, "POST")) onChanged();
  }
  async function setRequest(id: string, status: "confirmed" | "cancelled") {
    if (await run(`/api/desk/${slug}/requests/${id}`, "POST", { status })) onChanged();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-soft text-[16px] font-semibold text-brand-ink">{monogram(lead.name)}</span>
        <div className="min-w-0">
          <h2 className="font-display truncate text-[20px]">{lead.name}</h2>
          <p className="text-[13px] text-ink-muted">
            {lead.phone_masked}
            {lead.checkin_code && <> · code {lead.checkin_code}</>} · joined {fmtDate(lead.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Points" value={lead.points.toLocaleString("en-US")} />
        <Stat label="Membership" value={lead.plan_name ?? "None"} sub={lead.member_since ? `since ${fmtShort(lead.member_since)}` : undefined} />
        <Stat label="Last visit" value={lead.last_visit_at ? fmtShort(lead.last_visit_at) : "Not yet"} sub={lead.latest_scan?.overall_score != null ? `scan score ${lead.latest_scan.overall_score}` : undefined} />
      </div>

      {children}

      <ErrorText>{error}</ErrorText>

      <Section title="Reward codes to use" empty="No unused reward codes." count={unused.length}>
        {unused.map((r) => (
          <Row key={r.id} title={r.reward_name} sub={`Code ${r.code} · redeemed ${fmtShort(r.created_at)} · ${r.points_spent.toLocaleString("en-US")} pts`}>
            <PillButton variant="secondary" className="h-8 px-3" disabled={pending} onClick={() => markUsed(r.id)}>
              Mark used
            </PillButton>
          </Row>
        ))}
      </Section>

      <Section title="Waiting requests" empty="Nothing waiting from the app." count={openReq.length}>
        {openReq.map((r) => (
          <Row key={r.id} title={r.item_name} sub={`${kindLabel(r.kind)} · ${r.price_cents != null ? money(r.price_cents, { perMonth: r.kind === "membership" }) : "price at the desk"} · ${fmtShort(r.created_at)}`}>
            <div className="flex gap-1.5">
              <PillButton className="h-8 px-3" disabled={pending} onClick={() => setRequest(r.id, "confirmed")}>
                Confirm
              </PillButton>
              <PillButton variant="ghost" className="h-8 px-3" disabled={pending} onClick={() => setRequest(r.id, "cancelled")}>
                Cancel
              </PillButton>
            </div>
          </Row>
        ))}
      </Section>

      <Section title="Visits" empty="No visits logged yet." count={lead.visits.length}>
        {lead.visits.slice(0, 8).map((v) => (
          <Row key={v.id} title={v.treatment_name ?? "Visit"} sub={`${v.status === "done" ? "Checked in" : v.status} ${v.visit_at ? fmtDateTime(v.visit_at) : ""}${v.next_due_at ? ` · due again ${fmtShort(v.next_due_at)}` : ""}`} />
        ))}
      </Section>

      <Section title="Points history" empty="No points yet." count={lead.ledger.length}>
        {lead.ledger.slice(0, 10).map((p) => (
          <Row key={p.id} title={p.reason} sub={fmtDateTime(p.created_at)}>
            <span className={cn("text-[14px] font-medium tabular-nums", p.delta < 0 ? "text-ink-muted" : "text-ok")}>
              {p.delta > 0 ? "+" : ""}
              {p.delta.toLocaleString("en-US")}
            </span>
          </Row>
        ))}
      </Section>

      {lead.redemptions.some((r) => r.used_at) && (
        <Section title="Used rewards" empty="" count={lead.redemptions.filter((r) => r.used_at).length}>
          {lead.redemptions
            .filter((r) => r.used_at)
            .slice(0, 6)
            .map((r) => (
              <Row key={r.id} title={r.reward_name} sub={`Used ${fmtShort(r.used_at)}`} />
            ))}
        </Section>
      )}
    </div>
  );
}

function kindLabel(k: string) {
  return k === "membership" ? "Membership" : k === "product" ? "Shop item" : "Treatment";
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-field bg-surface-muted px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-semibold">{value}</p>
      {sub && <p className="truncate text-[11px] text-ink-muted">{sub}</p>}
    </div>
  );
}

function Section({ title, empty, count, children }: { title: string; empty: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
        {title} {count > 0 && <span className="font-normal">· {count}</span>}
      </h3>
      {count ? <ul className="divide-y divide-line rounded-field border border-line">{children}</ul> : <p className="text-[13px] text-ink-muted">{empty}</p>}
    </section>
  );
}

function Row({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px]">{title}</span>
        {sub && <span className="block truncate text-[12px] text-ink-muted">{sub}</span>}
      </span>
      {children}
    </li>
  );
}
