"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { simKindFor } from "@/lib/concerns";
import { runSimulation, type SimResult } from "@/lib/sim/client";
import { cn } from "@/lib/cn";
import type { Capture, Treatment } from "@/lib/types";
import { BeforeAfter } from "./before-after";

type State = { status: "loading" } | { status: "done"; result: SimResult } | { status: "error"; error: string };

/**
 * The "after" shown right on the results screen: her photo with the top matched treatment applied,
 * swipe left and right to compare. Renders the first treatment on its own; chips switch to the others
 * (each rendered once, on first tap). Shares the preview cache with the "Preview on my face" sheet, so
 * opening that sheet for the same treatment is instant.
 */
export function InlineAfter({
  treatments,
  capture,
  photoId,
  session,
  clinicSlug,
  price,
  onBook,
  onEvent,
}: {
  treatments: Treatment[];
  capture: Capture;
  photoId: string;
  session?: string;
  clinicSlug: string;
  price: (t: Treatment) => string;
  onBook: (t: Treatment) => void;
  onEvent?: (name: string, props?: Record<string, unknown>) => void;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(treatments[0]?.id ?? null);
  const [states, setStates] = React.useState<Record<string, State>>({});
  const started = React.useRef<Set<string>>(new Set());

  const render = React.useCallback(
    (t: Treatment, force = false) => {
      if (started.current.has(t.id) && !force) return;
      started.current.add(t.id);
      const kind = simKindFor(t);
      setStates((s) => ({ ...s, [t.id]: { status: "loading" } }));
      onEvent?.("sim_requested", { treatment: t.name, kind, from: "inline" });
      runSimulation({ photoId, photo: capture.photo, landmarks: capture.landmarks, kind, useMask: false, session, clinicSlug, force })
        .then((result) => {
          setStates((s) => ({ ...s, [t.id]: { status: "done", result } }));
          onEvent?.("sim_viewed", { treatment: t.name, kind, provider: result.provider, ms: result.ms, from: "inline" });
        })
        .catch((e: unknown) => {
          const error = e instanceof Error ? e.message : "Preview failed";
          setStates((s) => ({ ...s, [t.id]: { status: "error", error } }));
          onEvent?.("sim_failed", { treatment: t.name, kind, message: error, from: "inline" });
        });
    },
    [capture.landmarks, capture.photo, clinicSlug, onEvent, photoId, session],
  );

  const active = treatments.find((t) => t.id === activeId) ?? null;
  React.useEffect(() => {
    if (active) render(active);
  }, [active, render]);

  if (!active) return null;
  const state = states[active.id] ?? { status: "loading" as const };

  return (
    <section className="mt-6 px-4" aria-label="Your before and after">
      <p className="text-[11px] font-medium tracking-[0.12em] text-brand-ink">YOUR AFTER</p>
      <h2 className="font-display mt-1 text-[20px] leading-snug">See {active.name} on your own face</h2>
      {treatments.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {treatments.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={cn(
                "shrink-0 rounded-chip border px-3 py-1.5 text-[12px] font-medium",
                t.id === active.id ? "border-ink bg-ink text-white" : "border-line-strong bg-surface",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {state.status === "done" ? (
          <>
            <BeforeAfter
              key={state.result.key}
              inline
              original={state.result.original}
              composite={state.result.composite}
              width={state.result.width}
              height={state.result.height}
              initialDose={0.7}
              onDoseChange={(d) => onEvent?.("dose_changed", { treatment: active.name, dose: d, from: "inline" })}
            />
            <p className="mt-2 text-[12px] text-ink-muted">Swipe across the photo to compare. Only the treated area changes.</p>
          </>
        ) : (
          <div className="relative overflow-hidden rounded-card bg-ink" style={{ aspectRatio: `${capture.width} / ${capture.height}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- her own photo, a data URL */}
            <img src={capture.photo} alt="Your photo" className={cn("absolute inset-0 h-full w-full object-cover", state.status === "loading" && "opacity-60 blur-[1px]")} />
            {state.status === "loading" ? (
              <>
                <div className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-24" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-4 pt-12 text-ivory">
                  <p className="text-[14px] font-medium">Rendering your after</p>
                  <p className="text-[12px] text-ivory/75">About 10 seconds. Only the treated area changes.</p>
                </div>
              </>
            ) : (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4 pt-12 text-ivory">
                <p className="text-[14px] font-medium">The after didn&rsquo;t render.</p>
                <p className="mt-0.5 text-[12px] leading-snug text-ivory/80">{state.error}</p>
                <button type="button" onClick={() => render(active, true)} className="mt-2 rounded-chip bg-ivory px-3 py-1.5 text-[12px] font-medium text-ink">
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="min-w-0 text-[13px] leading-snug text-ink-muted">{price(active)}</span>
        <Button size="sm" className="shrink-0" onClick={() => onBook(active)}>
          Book this
        </Button>
      </div>
    </section>
  );
}
