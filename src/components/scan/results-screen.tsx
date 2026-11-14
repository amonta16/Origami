"use client";

import * as React from "react";
import { AppBar, BottomSheet, Button, Card, Chip, ScoreRing } from "@/components/ui";
import { CONCERN_BY_ID, ZONE_LABEL, simKindFor } from "@/lib/concerns";
import { runSimulation, type SimResult } from "@/lib/sim/client";
import type { Capture, Clinic, ScanResults, Treatment } from "@/lib/types";
import { BeforeAfter } from "./before-after";
import { HeatmapPhoto } from "./heatmap-photo";
import { MeshViewer } from "./mesh-viewer";

export function ResultsScreen({
  clinic,
  treatments,
  capture,
  results,
  scanId,
  firstName,
  onEvent,
}: {
  clinic: Clinic;
  treatments: Treatment[];
  capture: Capture;
  results: ScanResults;
  scanId: string | null;
  firstName?: string;
  onEvent?: (name: string, props?: Record<string, unknown>) => void;
}) {
  const [active, setActive] = React.useState<string | null>(null);
  const [sim, setSim] = React.useState<{ treatment: Treatment; result?: SimResult; error?: string; loading: boolean } | null>(null);
  const photoId = React.useMemo(() => scanId ?? `local-${capture.photo.length}-${capture.width}`, [scanId, capture]);

  const recommended = results.recommendations
    .map((r) => ({ ...r, treatment: treatments.find((t) => t.id === r.treatment_id) }))
    .filter((r): r is typeof r & { treatment: Treatment } => Boolean(r.treatment));

  const preview = async (treatment: Treatment) => {
    const kind = simKindFor(treatment);
    setSim({ treatment, loading: true });
    onEvent?.("sim_requested", { treatment: treatment.name, kind });
    try {
      const result = await runSimulation({ photoId, photo: capture.photo, landmarks: capture.landmarks, kind });
      setSim({ treatment, result, loading: false });
      onEvent?.("sim_viewed", { treatment: treatment.name, kind, provider: result.provider, ms: result.ms });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Preview failed";
      setSim({ treatment, error: msg, loading: false });
      onEvent?.("sim_failed", { treatment: treatment.name, kind, message: msg });
    }
  };

  const price = (t: Treatment) => (t.price_cents != null ? `$${Math.round(t.price_cents / 100).toLocaleString()}` : "Price on consultation");
  const sevLabel = (s: string) => (s === "none" ? "Clear" : s[0].toUpperCase() + s.slice(1));

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-phone bg-white pb-28">
      <AppBar title={clinic.name} logoUrl={clinic.logo_url} right={clinic.is_sample ? <Chip>Sample clinic</Chip> : null} />

      {/* score */}
      <section className="px-4 pt-1">
        <p className="text-[11px] font-medium tracking-[0.12em] text-brand-ink">YOUR RESULTS</p>
        <h1 className="font-display mt-1 text-[24px]">{firstName ? `${firstName}, here is what we found.` : "Here is what we found."}</h1>
        <div className="mt-4 flex items-center gap-4 rounded-card border border-line bg-surface p-4">
          <ScoreRing value={results.overall_score} potential={results.potential_score} size={150} label="Skin score" caption={`Potential ${results.potential_score}`} />
          <div className="min-w-0 flex-1">
            {results.skin_age != null && (
              <div>
                <div className="font-display font-display-numeral text-[32px]">{results.skin_age}</div>
                <div className="text-[12px] text-ink-muted">skin age estimate</div>
              </div>
            )}
            <MeshViewer landmarks={capture.landmarks} aspect={capture.width / capture.height} size={104} className="-ml-2 mt-1" />
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed">{results.insight}</p>
        {results.medical_flag && (
          <Card tone="brand-soft" padding="sm" className="mt-3">
            <p className="text-[13px] leading-relaxed">
              <strong className="font-medium">Worth showing a dermatologist.</strong> {results.medical_flag}
            </p>
          </Card>
        )}
      </section>

      {/* heat map */}
      <section className="mt-6 px-4">
        <HeatmapPhoto photo={capture.photo} landmarks={capture.landmarks} concerns={results.concerns} active={active} />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActive(null)}
            className={`shrink-0 rounded-chip border px-3 py-1.5 text-[12px] font-medium ${active === null ? "border-ink bg-ink text-white" : "border-line-strong bg-surface"}`}
          >
            All
          </button>
          {results.concerns.map((c) => (
            <button
              key={c.id + c.zone}
              type="button"
              onClick={() => setActive(active === c.id ? null : c.id)}
              className={`shrink-0 rounded-chip border px-3 py-1.5 text-[12px] font-medium ${active === c.id ? "border-ink bg-ink text-white" : "border-line-strong bg-surface"}`}
            >
              {CONCERN_BY_ID[c.id]?.label ?? c.id}
            </button>
          ))}
        </div>
      </section>

      {/* concerns */}
      <section className="mt-6 px-4">
        <h2 className="font-display text-[17px]">What the scan found</h2>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
          {results.concerns.map((c) => (
            <li key={c.id + c.zone}>
              <button
                type="button"
                onClick={() => setActive(active === c.id ? null : c.id)}
                className={`flex w-full items-center justify-between gap-3 p-4 text-left ${active === c.id ? "bg-brand-soft/60" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium">{CONCERN_BY_ID[c.id]?.label ?? c.id}</span>
                    <Chip severity={c.severity}>{sevLabel(c.severity)}</Chip>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                    {ZONE_LABEL[c.zone]} · {c.reason}
                  </p>
                </div>
                <span className="font-display font-display-numeral text-[20px] text-ink-muted">{100 - c.score}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{results.disclaimer}</p>
      </section>

      {/* treatments */}
      <section className="mt-6 px-4">
        <h2 className="font-display text-[17px]">Treatments matched to you</h2>
        <p className="mt-0.5 text-[12px] text-ink-muted">From {clinic.name}&rsquo;s menu, with their prices.</p>
        <ul className="mt-3 space-y-3">
          {recommended.map(({ treatment, why }) => (
            <li key={treatment.id}>
              <Card padding="sm">
                <Chip className="h-6 px-2 text-[10px] tracking-wide">TREATMENT</Chip>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-[16px]">{treatment.name}</h3>
                    <p className="mt-1 text-[13px] leading-snug text-ink-muted">{treatment.description}</p>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-ink-muted">
                  {treatment.result_days && <>Lasts ~{treatment.result_days >= 60 ? `${Math.round(treatment.result_days / 30)} mo` : `${treatment.result_days} days`} · </>}
                  <span className="text-ink">{price(treatment)}</span>
                </p>
                <p className="mt-3 rounded-field bg-brand-soft p-3 text-[13px] leading-snug text-brand-ink">
                  <span className="font-medium">Why this is relevant to you.</span> {why}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => preview(treatment)}>
                    Preview on my face
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onEvent?.("book_clicked", { from: "card", treatment: treatment.name })}>
                    Book
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* sticky book bar (Phase 3 wires the booking flow) */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-phone border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <Button full size="lg" onClick={() => onEvent?.("book_clicked", { from: "results" })}>
          {recommended[0] ? `Book ${recommended[0].treatment.name}` : "Book a consultation"}
        </Button>
      </div>

      {/* simulation sheet */}
      <BottomSheet open={sim !== null} onClose={() => setSim(null)} title={sim?.treatment.name} className="max-h-[92dvh] overflow-y-auto">
        {sim?.loading && (
          <div className="py-10 text-center">
            <div className="mx-auto size-10 animate-spin rounded-full border-2 border-line border-t-ink" />
            <p className="mt-4 text-[14px] font-medium">Rendering your after</p>
            <p className="mt-1 text-[13px] text-ink-muted">Only the treated zone changes. Everything else stays you.</p>
          </div>
        )}
        {sim?.error && (
          <div className="py-6">
            <p className="text-[14px] font-medium">The preview didn&rsquo;t render.</p>
            <p className="mt-1 text-[13px] text-ink-muted">{sim.error}</p>
            <Button className="mt-4" variant="secondary" onClick={() => preview(sim.treatment)}>
              Try again
            </Button>
          </div>
        )}
        {sim?.result && (
          <div>
            <BeforeAfter
              original={sim.result.original}
              composite={sim.result.composite}
              width={sim.result.width}
              height={sim.result.height}
              onDoseChange={(d) => onEvent?.("dose_changed", { treatment: sim.treatment.name, dose: d })}
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[13px] text-ink-muted">{price(sim.treatment)} at {clinic.name}</span>
              <Button size="sm" onClick={() => onEvent?.("book_clicked", { from: "sim", treatment: sim.treatment.name })}>
                Book this
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
