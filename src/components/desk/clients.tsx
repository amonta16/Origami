"use client";

import * as React from "react";
import { fmtDate, fmtShort, plural } from "@/lib/desk/format";
import type { LeadSummary } from "@/lib/desk/types";
import { EmptyState } from "./empty";
import { DeskIcon } from "./icons";
import { PatientPanel, useLeadDetail } from "./patient-panel";
import { ErrorText } from "./ui";

export function ClientList({ slug, leads }: { slug: string; leads: LeadSummary[] }) {
  const [q, setQ] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const detail = useLeadDetail(slug);

  const needle = q.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = needle
    ? leads.filter((l) => l.name.toLowerCase().includes(needle) || (digits.length >= 4 && l.phone_masked.endsWith(digits.slice(-4))) || l.checkin_code === needle)
    : leads;

  function open(id: string) {
    setOpenId(id);
    detail.load(id);
  }
  const { setLead } = detail;
  const close = React.useCallback(() => {
    setOpenId(null);
    setLead(null);
  }, [setLead]);

  React.useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId, close]);

  return (
    <>
      <div className="rounded-card border border-line bg-surface shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="relative w-full max-w-xs">
            <DeskIcon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <label htmlFor="client-search" className="sr-only">
              Search patients
            </label>
            <input
              id="client-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, last 4 of phone or code"
              className="h-10 w-full rounded-chip border border-line bg-page pl-9 pr-3 text-[13px] focus:border-ink focus:outline-none"
            />
          </div>
          <p className="text-[13px] text-ink-muted">
            {shown.length === leads.length ? plural(leads.length, "patient") :`${shown.length} of ${leads.length}`}
          </p>
        </div>

        {leads.length === 0 ? (
          <EmptyState icon="user" title="No patients yet">
            Patients appear here when they join from the clinic&rsquo;s app link.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState icon="search" title="No one matches that search" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 text-right font-medium">Points</th>
                  <th className="px-4 py-2.5 font-medium">Membership</th>
                  <th className="px-4 py-2.5 font-medium">Last visit</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((l) => (
                  <tr key={l.id} className="cursor-pointer hover:bg-page" onClick={() => open(l.id)}>
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-medium hover:underline" onClick={(e) => (e.stopPropagation(), open(l.id))}>
                        {l.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-muted">{l.phone_masked}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.points.toLocaleString("en-US")}</td>
                    <td className="px-4 py-3">{l.plan_name ? <span className="rounded-chip bg-brand-soft px-2 py-0.5 text-[12px] font-medium text-brand-ink">{l.plan_name}</span> : <span className="text-ink-muted">—</span>}</td>
                    <td className="px-4 py-3 text-ink-muted">{l.last_visit_at ? fmtShort(l.last_visit_at) : "Not yet"}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" tabIndex={-1} aria-label="Close" onClick={close} className="absolute inset-0 bg-ink/30" />
          <aside role="dialog" aria-modal="true" aria-label="Patient profile" className="relative h-full w-full max-w-[520px] overflow-y-auto bg-surface p-5 shadow-lift md:p-6">
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={close} className="grid size-8 place-items-center rounded-full hover:bg-surface-muted" aria-label="Close profile">
                <DeskIcon name="close" className="size-4" />
              </button>
            </div>
            {detail.error ? (
              <ErrorText>{detail.error}</ErrorText>
            ) : detail.lead && detail.lead.id === openId ? (
              <PatientPanel slug={slug} lead={detail.lead} onChanged={() => detail.load(openId, { silent: true })} />
            ) : (
              <p className="py-16 text-center text-[13px] text-ink-muted">Loading…</p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
