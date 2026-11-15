"use client";

import * as React from "react";
import { runSimulation, type SimResult } from "@/lib/sim/client";
import { cn } from "@/lib/cn";
import type { Capture } from "@/lib/types";
import { BeforeAfter } from "./before-after";

type State = { status: "loading" } | { status: "done"; result: SimResult } | { status: "error"; error: string };

/**
 * "Your AI preview": one render of her weakest areas treated at once, strengths set from her scores
 * (see previewStrengths). Starts on its own when the results appear; swipe across to compare.
 */
export function ScanPreview({
  capture,
  photoId,
  sim,
  session,
  clinicSlug,
  onEvent,
}: {
  capture: Capture;
  photoId: string;
  sim: Record<string, number>;
  session?: string;
  clinicSlug: string;
  onEvent?: (name: string, props?: Record<string, unknown>) => void;
}) {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const simKey = JSON.stringify(sim);

  const render = React.useCallback(
    (force = false) => {
      // state starts as "loading"; a retry sets it back in its click handler
      onEvent?.("sim_requested", { kind: "scan", sim, from: "results" });
      runSimulation({ photoId, photo: capture.photo, landmarks: capture.landmarks, kind: "scan", sim, useMask: false, session, clinicSlug, force })
        .then((result) => {
          setState({ status: "done", result });
          onEvent?.("sim_viewed", { kind: "scan", provider: result.provider, ms: result.ms, from: "results" });
        })
        .catch((e: unknown) => {
          const error = e instanceof Error ? e.message : "Preview failed";
          setState({ status: "error", error });
          onEvent?.("sim_failed", { kind: "scan", message: error, from: "results" });
        });
    },
    // simKey stands in for sim (a fresh object each render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capture.landmarks, capture.photo, clinicSlug, onEvent, photoId, session, simKey],
  );

  React.useEffect(() => {
    render();
  }, [render]);

  return (
    <section className="mt-6 px-4" aria-label="Your AI preview">
      <h2 className="font-display text-[19px]">Your AI preview</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-muted">Your lowest-scoring areas, treated. Swipe across the photo to compare.</p>
      <div className="mt-3">
        {state.status === "done" ? (
          <BeforeAfter
            key={state.result.key}
            inline
            original={state.result.original}
            composite={state.result.composite}
            width={state.result.width}
            height={state.result.height}
            initialDose={0.85}
            onDoseChange={(d) => onEvent?.("dose_changed", { kind: "scan", dose: d })}
          />
        ) : (
          <div className="relative overflow-hidden rounded-card bg-ink" style={{ aspectRatio: "3 / 4" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- her own photo, a data URL */}
            <img src={capture.photo} alt="Your photo" className={cn("absolute inset-0 h-full w-full object-cover", state.status === "loading" && "opacity-60 blur-[1px]")} />
            {state.status === "loading" ? (
              <>
                <div className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-24" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-4 pt-12 text-ivory">
                  <p className="text-[14px] font-medium">Creating your preview</p>
                  <p className="text-[12px] text-ivory/75">About 10 seconds.</p>
                </div>
              </>
            ) : (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4 pt-12 text-ivory">
                <p className="text-[14px] font-medium">We couldn&rsquo;t make a preview from this photo.</p>
                <p className="mt-0.5 text-[12px] leading-snug text-ivory/80">{state.error} Your scores are below.</p>
                <button
                  type="button"
                  onClick={() => {
                    setState({ status: "loading" });
                    render(true);
                  }}
                  className="mt-2 rounded-chip bg-ivory px-3 py-1.5 text-[12px] font-medium text-ink">
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
        An AI simulation of what treating these areas could look like, not a promise of results. Your provider will walk you through what to expect.
      </p>
    </section>
  );
}
