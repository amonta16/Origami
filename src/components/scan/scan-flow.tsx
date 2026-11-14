"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { track } from "@/lib/events";
import { buildAnalysisCrops, resizeDataUrl } from "@/lib/face/image";
import type { Capture, Clinic, ScanResults, Treatment } from "@/lib/types";
import { AnalyzingScreen } from "./analyzing-screen";
import { ConsentScreen } from "./consent-screen";
import { FaceCapture } from "./face-capture";
import { ResultsScreen } from "./results-screen";

type Step = "consent" | "capture" | "analyzing" | "results" | "error";

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
  const [step, setStep] = React.useState<Step>("consent");
  const [capture, setCapture] = React.useState<Capture | null>(null);
  const [analyzeStep, setAnalyzeStep] = React.useState(0);
  const [results, setResults] = React.useState<ScanResults | null>(null);
  const [scanId, setScanId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const ev = React.useCallback(
    (name: string, props: Record<string, unknown> = {}) => track(name, { ...props, clinic: clinic.slug }, { clinicId: clinic.id }),
    [clinic.id, clinic.slug],
  );

  React.useEffect(() => {
    ev("scan_started", {});
  }, [ev]);

  const analyze = React.useCallback(
    async (cap: Capture) => {
      setStep("analyzing");
      setAnalyzeStep(0);
      ev("analysis_started", { source: cap.source });
      try {
        const small = await resizeDataUrl(cap.photo, 1024, 0.9);
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
          }),
        });
        const json = (await res.json()) as { results?: ScanResults; scanId?: string | null; error?: string };
        if (!res.ok || !json.results) throw new Error(json.error || `Analysis failed (${res.status})`);
        setAnalyzeStep(3);
        setResults(json.results);
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
    [answers, clinic.slug, ev, firstName],
  );

  if (step === "consent") {
    return (
      <ConsentScreen
        clinic={clinic}
        onAgree={() => {
          ev("consent_given", {});
          setStep("capture");
        }}
      />
    );
  }

  if (step === "capture") {
    return (
      <FaceCapture
        onEvent={ev}
        onCapture={(c) => {
          setCapture(c);
          void analyze(c);
        }}
      />
    );
  }

  if (step === "analyzing" && capture) {
    return <AnalyzingScreen capture={capture} step={analyzeStep} clinicName={clinic.name} />;
  }

  if (step === "results" && capture && results) {
    return (
      <ResultsScreen
        clinic={clinic}
        treatments={treatments}
        capture={capture}
        results={results}
        scanId={scanId}
        firstName={firstName}
        onEvent={ev}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-phone flex-col px-5 pt-16">
      <h2 className="font-display text-3xl">The analysis didn&rsquo;t finish</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{error}</p>
      <div className="mt-6 flex gap-3">
        {capture && (
          <Button onClick={() => void analyze(capture)}>Try again</Button>
        )}
        <Button variant="secondary" onClick={() => { setCapture(null); setStep("capture"); }}>
          Retake photo
        </Button>
      </div>
    </div>
  );
}
