"use client";

import * as React from "react";
import { ANALYSIS_MODELS, SIM_PROVIDER_LABEL, analysisModel } from "@/lib/analysis/models";
import type { ScanResults, SimProvider } from "@/lib/types";
import { cn } from "@/lib/cn";

export type ModelState = {
  active: string;
  runs: Record<string, ScanResults>;
  busy: string | null;
  error: string | null;
  onPick: (id: string) => void;
  session: string;
};

/**
 * Tester control on the results screen: which model scored this face. Tapping a model that
 * hasn't run re-analyzes the same photo with it; tapping one that has swaps its results in.
 * Every run is logged to scan_runs (no photos) and listed at /lab/runs.
 */
export function ModelBar({ models }: { models: ModelState }) {
  const [open, setOpen] = React.useState(false);
  const active = analysisModel(models.active);
  const ran = Object.keys(models.runs);
  return (
    <div className="rounded-card border border-line bg-surface-muted/60">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px]">
        <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] font-semibold text-white">AI</span>
        <span className="min-w-0 flex-1 truncate">
          <span className="text-ink-muted">Scored by </span>
          <span className="font-medium">{active?.label ?? models.active}</span>
          {ran.length > 1 && <span className="text-ink-muted"> · {ran.length} models compared</span>}
        </span>
        <span className="text-ink-muted">{open ? "Hide" : "Compare models"}</span>
      </button>
      {open && (
        <div className="border-t border-line px-3 pb-3 pt-2.5">
          <div className="flex flex-wrap gap-1.5">
            {ANALYSIS_MODELS.map((m) => {
              const run = models.runs[m.id];
              const on = m.id === models.active;
              const busy = models.busy === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={Boolean(models.busy)}
                  onClick={() => models.onPick(m.id)}
                  title={m.note}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-chip border px-3 text-[12px] font-medium transition-colors disabled:opacity-50",
                    on ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink",
                  )}
                >
                  {busy ? <span className="size-3 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : run ? <span className={cn("size-1.5 rounded-full", on ? "bg-white" : "bg-ok")} /> : null}
                  {m.label}
                  {run && <span className={on ? "text-white/70" : "text-ink-muted"}>{run.overall_score}</span>}
                </button>
              );
            })}
          </div>
          {models.error && <p className="mt-2 text-[12px] leading-snug text-danger">{models.error}</p>}
          <p className="mt-2 text-[11px] leading-snug text-ink-muted">
            Re-runs this same photo. Green dot = already run (number = skin score). Runs are saved without your photo{models.session ? ` under session ${models.session.slice(0, 8)}` : ""}.{" "}
            <a href="/lab/runs" className="underline underline-offset-2">
              See saved runs
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

/** Image-model picker inside the "after" sheet. */
export function SimPicker({
  providers,
  value,
  onChange,
  mask,
  onMask,
  disabled,
}: {
  providers: Array<{ id: SimProvider; configured: boolean }>;
  value: SimProvider | "auto";
  onChange: (v: SimProvider | "auto") => void;
  mask: boolean;
  onMask: (v: boolean) => void;
  disabled?: boolean;
}) {
  const opts: Array<{ id: SimProvider | "auto"; label: string; ok: boolean }> = [
    { id: "auto", label: "Auto", ok: true },
    ...providers.map((p) => ({ id: p.id, label: SIM_PROVIDER_LABEL[p.id], ok: p.configured })),
  ];
  return (
    <div className="mb-4 rounded-card border border-line bg-surface-muted/60 p-3">
      <p className="text-[11px] font-medium text-ink-muted">Image model</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled || !o.ok}
            onClick={() => onChange(o.id)}
            title={o.ok ? undefined : "Not configured on the server"}
            className={cn(
              "h-8 rounded-chip border px-3 text-[12px] font-medium disabled:opacity-40",
              value === o.id ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <label className="mt-2.5 flex items-center gap-2 text-[12px]">
        <input type="checkbox" checked={mask} onChange={(e) => onMask(e.target.checked)} disabled={disabled} className="size-4" />
        Send the zone mask to the model <span className="text-ink-muted">(our compositing always masks)</span>
      </label>
    </div>
  );
}
