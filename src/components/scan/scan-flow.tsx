"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { track } from "@/lib/events";
import { ANALYSIS_MODELS, analysisModel } from "@/lib/analysis/models";
import { buildAnalysisCrops, cropForScanner } from "@/lib/face/image";
import type { Capture, Clinic, ScanResults, Treatment } from "@/lib/types";
import { ClinicTheme } from "@/components/clinic-theme";
import { AnalyzingScreen } from "./analyzing-screen";
import { ConsentScreen } from "./consent-screen";
import { FaceCapture } from "./face-capture";
import { GoalsScreen, goalConcerns } from "./goals-screen";
import { ResultsScreen } from "./results-screen";

type Step = "goals" | "consent" | "capture" | "analyzing" | "results" | "error";

const MODEL_KEY = "facet:model:analysis";
const DEFAULT_MODEL = ANALYSIS_MODELS[0].id;

export type StoredScan = {
  capture: Capture;
  results: ScanResults;
  scanId: string | null;
  at: number;
};

export function ScanFlow({
  clinic,
  treatments,
  firstName,
  answers,
}: {
  clinic: Clinic;
  treatments: Treatment[];
  firstName?: string;
  answers?: Record<string, unknown>;
}) {
  const [step, setStep] = React.useState<Step>("goals");
  // concern ids from the goals step; steer the after-preview and the treatment ranking
  const [goals, setGoals] = React.useState<string[]>([]);
  const [capture, setCapture] = React.useState<Capture | null>(null);
  const [analyzeStep, setAnalyzeStep] = React.useState(0);
  const [results, setResults] = React.useState<ScanResults | null>(null);
  const [scanId, setScanId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Model comparison: one session per captured photo; results kept per model id.
  const [session, setSession] = React.useState<string>("");
  const [runs, setRuns] = React.useState<Record<string, ScanResults>>({});
  const [activeModel, setActiveModel] = React.useState<string>(DEFAULT_MODEL);
  const [busyModel, setBusyModel] = React.useState<string | null>(null);
  const [modelError, setModelError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // A patient scan always starts on the server default (YouCam, the paid scanner, with its
    // fallbacks). An old tester pick saved in this browser used to pin every scan to that model
    // with no fallback, so a Gemini pick kept failing once its free quota ran out. Clear it.
    try {
      localStorage.removeItem(MODEL_KEY);
    } catch {
      /* private mode */
    }
  }, []);

  const ev = React.useCallback(
    (name: string, props: Record<string, unknown> = {}) => track(name, { ...props, clinic: clinic.slug }, { clinicId: clinic.id }),
    [clinic.id, clinic.slug],
  );

  React.useEffect(() => {
    ev("scan_started", {});
  }, [ev]);

  /** Re-run the same photo with another model (results screen "Model" buttons). */
  const rerun = React.useCallback(
    async (modelId: string) => {
      if (!capture) return;
      if (runs[modelId]) {
        setActiveModel(modelId);
        setResults(runs[modelId]);
        setModelError(null);
        return;
      }
      setBusyModel(modelId);
      setModelError(null);
      try {
        const small = await cropForScanner(capture.photo, capture.landmarks);
        const crops = await buildAnalysisCrops(capture.photo, capture.landmarks);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clinicSlug: clinic.slug,
            photo: small.dataUrl,
            crops,
            landmarks: capture.landmarks,
            source: capture.source,
            width: capture.width,
            height: capture.height,
            firstName: firstName ?? null,
            answers: answers ?? null,
            model: modelId,
            session,
            rerun: true,
            hd: small.hd,
            goals,
          }),
        });
        const json = (await res.json()) as { results?: ScanResults; error?: string };
        if (!res.ok || !json.results) throw new Error(json.error || `Analysis failed (${res.status})`);
        setRuns((r) => ({ ...r, [modelId]: json.results! }));
        setActiveModel(modelId);
        setResults(json.results);
        ev("model_compared", { model: modelId, score: json.results.overall_score });
      } catch (e) {
        setModelError(`${analysisModel(modelId)?.label ?? modelId}: ${e instanceof Error ? e.message : "failed"}`);
      } finally {
        setBusyModel(null);
      }
    },
    [answers, capture, clinic.slug, ev, firstName, goals, runs, session],
  );

  const analyze = React.useCallback(
    async (cap: Capture) => {
      setStep("analyzing");
      setAnalyzeStep(0);
      ev("analysis_started", { source: cap.source });
      const sess = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setSession(sess);
      setRuns({});
      setModelError(null);
      try {
        // the scanner sees a face crop (face ~70% of the width), HD when the crop is big enough
        const small = await cropForScanner(cap.photo, cap.landmarks);
        setAnalyzeStep(1);
        const crops = await buildAnalysisCrops(cap.photo, cap.landmarks);
        setAnalyzeStep(2);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clinicSlug: clinic.slug,
            photo: small.dataUrl,
            crops,
            landmarks: cap.landmarks,
            blendshapes: cap.blendshapes,
            quality: cap.quality,
            source: cap.source,
            width: cap.width,
            height: cap.height,
            firstName: firstName ?? null,
            answers: answers ?? null,
            session: sess,
            hd: small.hd,
            goals,
          }),
        });
        const json = (await res.json()) as { results?: ScanResults; scanId?: string | null; error?: string };
        if (!res.ok || !json.results) throw new Error(json.error || `Analysis failed (${res.status})`);
        setAnalyzeStep(3);
        setResults(json.results);
        // File the run under the model that actually answered (fallback may have changed it).
        const served = analysisModel(json.results.model)?.id ?? ANALYSIS_MODELS.find((m) => json.results!.model.startsWith(m.id))?.id ?? DEFAULT_MODEL;
        setActiveModel(served);
        setRuns({ [served]: json.results });
        setScanId(json.scanId ?? null);
        try {
          sessionStorage.setItem(
            `facet:scan:${clinic.slug}`,
            JSON.stringify({ capture: cap, results: json.results, scanId: json.scanId ?? null, at: Date.now() } satisfies StoredScan),
          );
        } catch {
          /* storage may be full; results still render */
        }
        ev("scan_done", { score: json.results.overall_score, concerns: json.results.concerns.length, provider: json.results.provider });
        setStep("results");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Analysis failed";
        ev("analysis_failed", { message: msg });
        setError(msg);
        setStep("error");
      }
    },
    [answers, clinic.slug, ev, firstName, goals],
  );

  let body: React.ReactNode;
  if (step === "goals") {
    body = (
      <GoalsScreen
        clinic={clinic}
        onNext={(ids) => {
          setGoals(goalConcerns(ids));
          ev("goals_picked", { goals: ids });
          setStep("consent");
        }}
      />
    );
  } else if (step === "consent") {
    body = (
      <ConsentScreen
        clinic={clinic}
        onAgree={() => {
          ev("consent_given", {});
          setStep("capture");
        }}
      />
    );
  } else if (step === "capture") {
    body = (
      <FaceCapture
        onEvent={ev}
        onCapture={(c) => {
          setCapture(c);
          void analyze(c);
        }}
      />
    );
  } else if (step === "analyzing" && capture) {
    body = <AnalyzingScreen capture={capture} step={analyzeStep} clinicName={clinic.name} />;
  } else if (step === "results" && capture && results) {
    body = (
      <ResultsScreen
        clinic={clinic}
        treatments={treatments}
        capture={capture}
        results={results}
        scanId={scanId}
        firstName={firstName}
        onEvent={ev}
        onRestart={() => {
          ev("scan_restarted", {});
          setCapture(null);
          setResults(null);
          setRuns({});
          setGoals([]);
          try {
            sessionStorage.removeItem(`facet:scan:${clinic.slug}`);
          } catch {
            /* ignore */
          }
          window.scrollTo({ top: 0 });
          setStep("goals");
        }}
        models={{ active: activeModel, runs, busy: busyModel, error: modelError, onPick: rerun, session }}
      />
    );
  } else {
    body = (
      <div className="mx-auto flex min-h-dvh w-full max-w-phone flex-col px-4 pt-16">
        <h2 className="font-display text-[24px]">The analysis didn&rsquo;t finish</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{error}</p>
        <div className="mt-6 flex gap-3">
          {capture && <Button onClick={() => void analyze(capture)}>Try again</Button>}
          <Button
            variant="secondary"
            onClick={() => {
              setCapture(null);
              setStep("capture");
            }}
          >
            Retake photo
          </Button>
        </div>
      </div>
    );
  }

  return <ClinicTheme clinic={clinic}>{body}</ClinicTheme>;
}
