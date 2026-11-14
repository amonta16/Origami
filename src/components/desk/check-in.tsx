"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { DeskIcon } from "./icons";
import { PatientPanel, useLeadDetail } from "./patient-panel";
import { QrScanner } from "./qr-scanner";
import { ErrorText, PillButton, SelectField, useDeskAction } from "./ui";
import { EmptyState } from "./empty";

type Match = { id: string; name: string; phone_masked: string; checkin_code: string | null };

export function CheckIn({
  slug,
  treatments,
  visitPoints,
  pointsPerDollar,
  autoScan,
}: {
  slug: string;
  treatments: Array<{ id: string; name: string }>;
  visitPoints: number;
  pointsPerDollar: number;
  autoScan: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [scanning, setScanning] = React.useState(autoScan);
  const [matches, setMatches] = React.useState<Match[] | null>(null);
  const [findError, setFindError] = React.useState<string | null>(null);
  const [finding, setFinding] = React.useState(false);
  const detail = useLeadDetail(slug);

  async function find(text: string) {
    const query = text.trim();
    if (!query) return;
    setFinding(true);
    setFindError(null);
    setMatches(null);
    detail.setLead(null);
    try {
      const res = await fetch(`/api/desk/${slug}/find`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query }) });
      const data = (await res.json().catch(() => ({}))) as { matches?: Match[]; error?: string };
      if (!res.ok) {
        setFindError(data.error ?? "Search didn't work. Try again.");
        return;
      }
      const m = data.matches ?? [];
      setMatches(m);
      if (m.length === 1) await detail.load(m[0].id);
    } catch {
      setFindError("Couldn't reach the server.");
    } finally {
      setFinding(false);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-3">
        <form
          className="rounded-card border border-line bg-surface p-4 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            find(q);
          }}
        >
          <label htmlFor="desk-find" className="sr-only">
            Phone, name or code
          </label>
          <div className="relative">
            <DeskIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="desk-find"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Phone, name or code"
              autoComplete="off"
              className="h-12 w-full rounded-field border border-brand/40 bg-surface pl-10 pr-3 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PillButton type="submit" disabled={finding || !q.trim()}>
              {finding ? "Finding…" : "Find"}
            </PillButton>
            <PillButton variant="ghost" className="text-brand" onClick={() => setScanning((s) => !s)}>
              <DeskIcon name="checkin" className="size-4" />
              {scanning ? "Hide camera" : "Scan QR"}
            </PillButton>
          </div>
        </form>

        {scanning && (
          <QrScanner
            onClose={() => setScanning(false)}
            onResult={(text) => {
              setScanning(false);
              const code = /^facet:checkin:[a-z0-9-]+:(\d{6})$/i.exec(text)?.[1];
              setQ(code ?? text);
              find(text);
            }}
          />
        )}

        <p className="rounded-card border border-line px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
          Ask for the phone number on their account, or scan the QR on their app&rsquo;s visit screen. You can also type their <strong className="font-medium text-ink">6-digit check-in code</strong> or a <strong className="font-medium text-ink">reward code</strong>.
        </p>

        {matches && matches.length > 1 && (
          <div className="rounded-card border border-line bg-surface p-2 shadow-soft">
            <p className="px-2 py-1.5 text-[12px] font-medium text-ink-muted">{matches.length} matches</p>
            <ul>
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => detail.load(m.id)}
                    className={cn("flex w-full items-center justify-between rounded-field px-3 py-2 text-left hover:bg-surface-muted", detail.lead?.id === m.id && "bg-brand-soft")}
                  >
                    <span className="text-[14px] font-medium">{m.name}</span>
                    <span className="text-[12px] text-ink-muted">{m.phone_masked}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="min-h-[320px] rounded-card border border-line bg-surface p-5 shadow-soft md:p-6">
        {findError || detail.error ? (
          <ErrorText>{findError ?? detail.error}</ErrorText>
        ) : detail.loading ? (
          <p className="py-16 text-center text-[13px] text-ink-muted">Loading…</p>
        ) : detail.lead ? (
          <PatientPanel slug={slug} lead={detail.lead} onChanged={() => detail.load(detail.lead!.id, { silent: true })}>
            <CheckInForm
              key={detail.lead.id}
              slug={slug}
              leadId={detail.lead.id}
              treatments={treatments}
              visitPoints={visitPoints}
              pointsPerDollar={pointsPerDollar}
              onDone={() => detail.load(detail.lead!.id, { silent: true })}
            />
          </PatientPanel>
        ) : matches && matches.length === 0 ? (
          <EmptyState icon="search" title="No patient found">
            Check the spelling or try their phone number. New patients join from the clinic&rsquo;s app link.
          </EmptyState>
        ) : matches && matches.length > 1 ? (
          <EmptyState icon="user" title="Pick the right patient from the list" />
        ) : (
          <EmptyState icon="user" title="Find a patient to check them in" />
        )}
      </div>
    </div>
  );
}

function CheckInForm({
  slug,
  leadId,
  treatments,
  visitPoints,
  pointsPerDollar,
  onDone,
}: {
  slug: string;
  leadId: string;
  treatments: Array<{ id: string; name: string }>;
  visitPoints: number;
  pointsPerDollar: number;
  onDone: () => void;
}) {
  const { run, pending, error } = useDeskAction();
  const [treatmentId, setTreatmentId] = React.useState("");
  const [dollars, setDollars] = React.useState("");
  const [done, setDone] = React.useState<string | null>(null);
  const amount = Math.floor(Number(dollars.replace(/[$,]/g, "")) || 0);
  const purchasePts = amount * pointsPerDollar;

  async function submit(purchaseOnly: boolean) {
    setDone(null);
    const res = await run<{ visitPoints: number; purchasePoints: number; treatment: string | null }>(`/api/desk/${slug}/leads/${leadId}/checkin`, "POST", {
      treatmentId: treatmentId || null,
      dollars: amount,
      purchaseOnly,
    });
    if (res) {
      const parts = [
        purchaseOnly ? null : `Checked in${res.treatment ? ` for ${res.treatment}` : ""}`,
        res.visitPoints ? `+${res.visitPoints} visit points` : null,
        res.purchasePoints ? `+${res.purchasePoints} purchase points` : null,
      ].filter(Boolean);
      setDone(parts.join(" · ") || "Saved");
      setDollars("");
      onDone();
    }
  }

  return (
    <div className="rounded-field border border-line bg-page p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Treatment today (optional)"
          value={treatmentId}
          onChange={(e) => setTreatmentId(e.target.value)}
          options={[{ value: "", label: "Not recorded" }, ...treatments.map((t) => ({ value: t.id, label: t.name }))]}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="desk-dollars" className="text-[13px] font-medium text-ink-soft">
            Spent today, for purchase points
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-ink-muted">$</span>
            <input
              id="desk-dollars"
              inputMode="decimal"
              value={dollars}
              onChange={(e) => setDollars(e.target.value)}
              placeholder="0"
              className="h-11 w-full rounded-field border border-line bg-surface pl-7 pr-3 text-[14px] focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10"
            />
          </div>
          <p className="text-[12px] text-ink-muted">
            {pointsPerDollar} point{pointsPerDollar === 1 ? "" : "s"} per $1{purchasePts > 0 ? ` · +${purchasePts.toLocaleString("en-US")} points` : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <PillButton variant="brand" disabled={pending} onClick={() => submit(false)}>
          <DeskIcon name="check" className="size-4" strokeWidth={2} />
          Check in{visitPoints > 0 ? ` · +${visitPoints} points` : ""}
        </PillButton>
        {purchasePts > 0 && (
          <PillButton variant="secondary" disabled={pending} onClick={() => submit(true)}>
            Only add purchase points
          </PillButton>
        )}
      </div>
      {done && (
        <p role="status" className="mt-3 rounded-field bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          {done}
        </p>
      )}
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </div>
  );
}
