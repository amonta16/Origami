"use client";

import * as React from "react";
import Link from "next/link";
import { AppBar, BottomSheet, Button, Card, Chip, ScoreRing } from "@/components/ui";
import { simKindFor } from "@/lib/concerns";
import { SIM_PROVIDER_LABEL } from "@/lib/analysis/models";
import { markers, previewStrengths, scoreColor, scoreWord, WEAK_BELOW, markerLabel } from "@/lib/scan/scoring";
import { runSimulation, type SimResult } from "@/lib/sim/client";
import { cn } from "@/lib/cn";
import type { Capture, Clinic, ScanResults, SimProvider, Treatment } from "@/lib/types";
import { BeforeAfter } from "./before-after";
import { HeatmapPhoto } from "./heatmap-photo";
import { ModelBar, SimPicker, type ModelState } from "./model-bar";
import { ScanPreview } from "./scan-preview";

/**
 * Results, top to bottom: score, the AI preview of her weakest areas, the clinic's matched
 * treatments, the skin map, every marker, scan again. Scores read higher = healthier throughout.
 */
export function ResultsScreen({
  clinic,
  treatments,
  capture,
  results,
  scanId,
  firstName,
  onEvent,
  onRestart,
  models,
}: {
  clinic: Clinic;
  treatments: Treatment[];
  capture: Capture;
  results: ScanResults;
  scanId: string | null;
  firstName?: string;
  onEvent?: (name: string, props?: Record<string, unknown>) => void;
  onRestart?: () => void;
  models?: ModelState;
}) {
  const photoId = React.useMemo(() => scanId ?? `local-${capture.photo.length}-${capture.width}`, [scanId, capture]);
  const ms = React.useMemo(() => markers(results), [results]);
  const weak = ms.filter((m) => m.score < WEAK_BELOW);
  const sim = React.useMemo(() => previewStrengths(results, results.goals ?? []), [results]);

  const recommended = results.recommendations
    .map((r) => ({ ...r, treatment: treatments.find((t) => t.id === r.treatment_id) }))
    .filter((r): r is typeof r & { treatment: Treatment } => Boolean(r.treatment));

  const price = (t: Treatment) => (t.price_cents != null ? `From $${Math.round(t.price_cents / 100).toLocaleString()}` : "Price on consultation");
  const book = (from: string, t?: Treatment) => {
    onEvent?.("book_clicked", { from, treatment: t?.name });
    const url = t?.booking_url || clinic.booking_url;
    if (url) window.open(url, "_blank", "noopener");
    else if (clinic.phone) window.location.href = `tel:${clinic.phone.replace(/[^\d+]/g, "")}`;
  };

  // ---- per-treatment "Preview on my face" sheet (kept from the earlier flow) ----
  const [sheet, setSheet] = React.useState<{ treatment: Treatment; result?: SimResult; error?: string; loading: boolean } | null>(null);
  const [simProviders, setSimProviders] = React.useState<Array<{ id: SimProvider; configured: boolean }>>([]);
  const [simProvider, setSimProvider] = React.useState<SimProvider | "auto">("auto");
  React.useEffect(() => {
    fetch("/api/simulate")
      .then((r) => r.json())
      .then((j: { providers?: Array<{ id: SimProvider; configured: boolean }> }) => setSimProviders(j.providers ?? []))
      .catch(() => {});
  }, []);
  const preview = async (treatment: Treatment, provider: SimProvider | "auto" = simProvider) => {
    const kind = simKindFor(treatment);
    setSheet({ treatment, loading: true });
    onEvent?.("sim_requested", { treatment: treatment.name, kind, provider });
    try {
      const result = await runSimulation({
        photoId,
        photo: capture.photo,
        landmarks: capture.landmarks,
        kind,
        provider: provider === "auto" ? undefined : provider,
        useMask: false,
        session: models?.session,
        clinicSlug: clinic.slug,
      });
      setSheet({ treatment, result, loading: false });
      onEvent?.("sim_viewed", { treatment: treatment.name, kind, provider: result.provider, ms: result.ms });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Preview failed";
      setSheet({ treatment, error: msg, loading: false });
      onEvent?.("sim_failed", { treatment: treatment.name, kind, message: msg });
    }
  };

  // ---- skin map: the scanner's own drawings when we have them, else our zone tint ----
  const overlays = React.useMemo(() => {
    const byId = new Map((results.overlays ?? []).map((o) => [o.id, o.url]));
    return ms.filter((m) => byId.has(m.id)).map((m) => ({ ...m, url: byId.get(m.id)! }));
  }, [ms, results.overlays]);
  const [mapId, setMapId] = React.useState<string | null>(null);
  const mapActive = overlays.find((o) => o.id === (mapId ?? overlays[0]?.id)) ?? null;
  const [openMarker, setOpenMarker] = React.useState<string | null>(null);
  const [heatActive, setHeatActive] = React.useState<string | null>(null);

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-phone bg-white pb-28">
      <AppBar title={clinic.name} logoUrl={clinic.logo_url} right={clinic.is_sample ? <Chip>Sample clinic</Chip> : null} />

      {/* 1. score */}
      <section className="px-4 pt-1">
        <p className="text-[11px] font-medium tracking-[0.12em] text-brand-ink">YOUR RESULTS</p>
        <h1 className="font-display mt-1 text-[24px]">{firstName ? `${firstName}, here is your skin.` : "Here is your skin."}</h1>
        <div className="mt-4 flex items-center gap-4 rounded-card border border-line bg-surface p-4">
          <ScoreRing value={results.overall_score} size={148} label="Skin score" caption={scoreWord(results.overall_score)} />
          <div className="grid min-w-0 flex-1 gap-2.5">
            <div className="rounded-field bg-surface-muted px-3 py-2.5">
              <div className="font-display font-display-numeral text-[26px] leading-none">{results.skin_age ?? "—"}</div>
              <div className="mt-1 text-[11.5px] text-ink-muted">Skin age</div>
            </div>
            <div className="rounded-field bg-surface-muted px-3 py-2.5">
              <div className="font-display font-display-numeral text-[26px] leading-none">{ms.length}</div>
              <div className="mt-1 text-[11.5px] text-ink-muted">Skin markers</div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed">
          {weak.length ? (
            <>
              <span className="font-medium">Your biggest opportunities:</span> {weak.slice(0, 3).map((m) => m.label.toLowerCase()).join(", ")}.
            </>
          ) : (
            "Every marker is in a healthy range."
          )}
        </p>
        {results.medical_flag && (
          <Card tone="brand-soft" padding="sm" className="mt-3">
            <p className="text-[13px] leading-relaxed">
              <strong className="font-medium">Worth showing a dermatologist.</strong> {results.medical_flag}
            </p>
          </Card>
        )}
      </section>

      {/* 2. AI preview of her weakest areas */}
      <ScanPreview capture={capture} photoId={photoId} sim={sim} session={models?.session} clinicSlug={clinic.slug} onEvent={onEvent} />

      {/* 3. recommended */}
      <section className="mt-7 px-4">
        <h2 className="font-display text-[19px]">Recommended for you</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">From the {clinic.name} menu, matched to your scan.</p>
        {recommended.length ? (
          <ul className="mt-3 space-y-3">
            {recommended.map(({ treatment, why, targets }) => (
              <li key={treatment.id} className="overflow-hidden rounded-card border border-line bg-surface">
                <Link href={`/s/${clinic.slug}/t/${treatment.id}`} className="flex gap-3 p-3">
                  {treatment.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- clinic or stock photo URL
                    <img src={treatment.image_url} alt="" className="size-20 shrink-0 rounded-field object-cover" />
                  ) : (
                    <span className="size-20 shrink-0 rounded-field bg-brand-soft" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display text-[16px] leading-snug">{treatment.name}</h3>
                    <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">{targets?.length ? `Targets ${targets.join(", ")}` : why}</p>
                    <p className="mt-1.5 text-[13px] font-medium">{price(treatment)}</p>
                  </div>
                </Link>
                <div className="flex gap-2 border-t border-line px-3 py-2.5">
                  <Button size="sm" variant="secondary" onClick={() => preview(treatment)}>
                    Preview on my face
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => book("card", treatment)}>
                    Book
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-card border border-line bg-surface p-4 text-[13.5px] leading-relaxed">
            Your skin is in great shape. A consultation is the best next step to plan anything you&rsquo;d like to refine.
          </p>
        )}
        <Button full size="lg" className="mt-3" onClick={() => book("results")}>
          Book a consultation
        </Button>
      </section>

      {/* 4. skin map */}
      <section className="mt-7 px-4">
        <h2 className="font-display text-[19px]">Your skin map</h2>
        {overlays.length && mapActive ? (
          <>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">Tap a marker to see where the scanner found it.</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {overlays.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setMapId(o.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-chip border px-3 py-1.5 text-[12px] font-medium",
                    o.id === mapActive.id ? "border-ink bg-ink text-white" : "border-line-strong bg-surface",
                  )}
                >
                  <span className="size-1.5 rounded-full" style={{ background: scoreColor(o.score) }} />
                  {o.label}
                  <span className={o.id === mapActive.id ? "text-white/70" : "text-ink-muted"}>{o.score}</span>
                </button>
              ))}
            </div>
            <div className="relative mt-2 overflow-hidden rounded-card bg-ink" style={{ aspectRatio: "3 / 4" }}>
              {results.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element -- scanner's signed URL
                <img src={results.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element -- scanner's signed URL */}
              <img key={mapActive.url} src={mapActive.url} alt={`Where the scanner found ${mapActive.label.toLowerCase()}`} className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </>
        ) : (
          <>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">Where each concern shows on your photo.</p>
            <HeatmapPhoto className="mt-3" photo={capture.photo} landmarks={capture.landmarks} concerns={results.concerns} active={heatActive} />
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {results.concerns.map((c) => (
                <button
                  key={c.id + c.zone}
                  type="button"
                  onClick={() => setHeatActive(heatActive === c.id ? null : c.id)}
                  className={cn("shrink-0 rounded-chip border px-3 py-1.5 text-[12px] font-medium", heatActive === c.id ? "border-ink bg-ink text-white" : "border-line-strong bg-surface")}
                >
                  {markerLabel(c.id)}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 5. every marker */}
      <section className="mt-7 px-4">
        <h2 className="font-display text-[19px]">Every marker</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">Out of 100, higher is healthier. Tap one for what it measures.</p>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
          {ms.map((m) => {
            const open = openMarker === m.id;
            return (
              <li key={m.id}>
                <button type="button" aria-expanded={open} onClick={() => setOpenMarker(open ? null : m.id)} className="w-full px-4 py-3 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-medium">{m.label}</span>
                    <span className="font-display-numeral text-[15px] font-medium tabular-nums">{m.score}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full" style={{ width: `${m.score}%`, background: scoreColor(m.score) }} />
                  </div>
                  {open && (
                    <div className="mt-2 text-[12.5px] leading-snug text-ink-muted">
                      <p>{m.about}</p>
                      <p className="mt-1">{m.reason}</p>
                      {m.id === "fine_lines" && results.zones?.length ? (
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          {results.zones.map((z) => (
                            <span key={z.id} className="flex justify-between rounded-field bg-surface-muted px-2.5 py-1.5 text-[12px]">
                              {z.label}
                              <span className="font-medium" style={{ color: z.score < WEAK_BELOW ? "#D9544A" : undefined }}>
                                {z.score}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 6. scan again + footer */}
      <section className="mt-6 px-4">
        {onRestart && (
          <Button full variant="secondary" onClick={onRestart}>
            Scan again
          </Button>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
          {results.provider === "youcam" ? "Skin analysis by Perfect Corp's YouCam AI. " : ""}
          {results.disclaimer} The preview is an AI simulation, not a promise of results. Your photo is deleted after 72 hours unless you keep it.
        </p>
        {models && (
          <div className="mt-4">
            <ModelBar models={models} />
          </div>
        )}
      </section>

      {/* sticky book bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-phone border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <Button full size="lg" onClick={() => book("sticky", recommended[0]?.treatment)}>
          {recommended[0] ? `Book ${recommended[0].treatment.name}` : "Book a consultation"}
        </Button>
      </div>

      {/* per-treatment preview sheet */}
      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet?.treatment.name} className="max-h-[92dvh] overflow-y-auto">
        {sheet && (
          <SimPicker
            providers={simProviders}
            value={simProvider}
            disabled={sheet.loading}
            onChange={(p) => {
              setSimProvider(p);
              void preview(sheet.treatment, p);
            }}
            mask={false}
            onMask={() => {}}
          />
        )}
        {sheet?.result && !sheet.loading && (
          <p className="-mt-2 mb-3 text-[11px] text-ink-muted">
            Rendered by {SIM_PROVIDER_LABEL[sheet.result.provider] ?? sheet.result.provider} in {(sheet.result.ms / 1000).toFixed(1)} s
          </p>
        )}
        {sheet?.loading && (
          <div className="py-10 text-center">
            <div className="mx-auto size-10 animate-spin rounded-full border-2 border-line border-t-ink" />
            <p className="mt-4 text-[14px] font-medium">Rendering your after</p>
            <p className="mt-1 text-[13px] text-ink-muted">Only the treated zone changes. Everything else stays you.</p>
          </div>
        )}
        {sheet?.error && (
          <div className="py-6">
            <p className="text-[14px] font-medium">The preview didn&rsquo;t render.</p>
            <p className="mt-1 text-[13px] text-ink-muted">{sheet.error}</p>
            <Button className="mt-4" variant="secondary" onClick={() => preview(sheet.treatment)}>
              Try again
            </Button>
          </div>
        )}
        {sheet?.result && (
          <div>
            <BeforeAfter
              original={sheet.result.original}
              composite={sheet.result.composite}
              width={sheet.result.width}
              height={sheet.result.height}
              onDoseChange={(d) => onEvent?.("dose_changed", { treatment: sheet.treatment.name, dose: d })}
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[13px] text-ink-muted">{price(sheet.treatment)} at {clinic.name}</span>
              <Button size="sm" onClick={() => book("sim", sheet.treatment)}>
                Book this
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
