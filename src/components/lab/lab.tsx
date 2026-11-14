"use client";

import * as React from "react";
import { Button, Card, Chip, Textarea } from "@/components/ui";
import { SIM_ZONES } from "@/lib/concerns";
import { getLandmarker } from "@/lib/face/landmarker";
import { buildAnalysisCrops, resizeDataUrl } from "@/lib/face/image";
import { buildMask } from "@/lib/face/mask";
import { blendshapeMap } from "@/lib/face/quality";
import { runSimulation, type SimResult } from "@/lib/sim/client";
import { SIM_PROMPTS } from "@/lib/sim/prompts";
import { track } from "@/lib/events";
import type { Landmark, ScanResults, SimKind, SimProvider } from "@/lib/types";
import { BeforeAfter } from "@/components/scan/before-after";

type ProviderInfo = { id: SimProvider; configured: boolean; model: string };
type Run = { provider: SimProvider; useMask: boolean; status: "running" | "done" | "error"; result?: SimResult; error?: string };

export function Lab() {
  const [providers, setProviders] = React.useState<ProviderInfo[]>([]);
  const [photo, setPhoto] = React.useState<{ dataUrl: string; width: number; height: number; landmarks: Landmark[] } | null>(null);
  const [kind, setKind] = React.useState<SimKind>("neurotoxin");
  const [prompt, setPrompt] = React.useState(SIM_PROMPTS.neurotoxin.prompt);
  const [runs, setRuns] = React.useState<Run[]>([]);
  const [maskPreview, setMaskPreview] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"composite" | "raw">("composite");
  const [analysis, setAnalysis] = React.useState<{ status: "idle" | "running" | "done" | "error"; results?: ScanResults; ms?: number; error?: string }>({ status: "idle" });
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/simulate").then((r) => r.json()).then((j) => setProviders(j.providers ?? [])).catch(() => {});
  }, []);

  React.useEffect(() => {
    setPrompt(SIM_PROMPTS[kind].prompt);
  }, [kind]);

  React.useEffect(() => {
    if (!photo) return;
    const m = buildMask(SIM_ZONES[kind], photo.landmarks, Math.round(photo.width / 2), Math.round(photo.height / 2));
    setMaskPreview(m.toDataURL("image/png"));
  }, [photo, kind]);

  const onFile = async (file: File) => {
    setMsg(null);
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(file);
    });
    const small = await resizeDataUrl(dataUrl, 1600, 0.92);
    const img = new Image();
    img.src = small.dataUrl;
    await img.decode();
    const lm = await getLandmarker("IMAGE");
    const res = lm.detect(img);
    const face = res.faceLandmarks?.[0];
    if (!face) {
      setMsg("No face found in that photo.");
      return;
    }
    setPhoto({ dataUrl: small.dataUrl, width: small.width, height: small.height, landmarks: face.map((p) => ({ x: p.x, y: p.y, z: p.z })) });
    setRuns([]);
    setAnalysis({ status: "idle" });
    void blendshapeMap(res.faceBlendshapes?.[0]?.categories);
  };

  const runAll = async () => {
    if (!photo) return;
    const todo: Array<{ provider: SimProvider; useMask: boolean }> = [];
    for (const p of providers.filter((p) => p.configured)) {
      todo.push({ provider: p.id, useMask: false });
      if (p.id !== "gemini") todo.push({ provider: p.id, useMask: true });
    }
    if (!todo.length) {
      setMsg("No provider keys configured on the server yet.");
      return;
    }
    setRuns(todo.map((t) => ({ ...t, status: "running" })));
    track("lab_run", { kind, providers: todo.map((t) => `${t.provider}${t.useMask ? "+mask" : ""}`) });
    const photoId = `lab-${photo.dataUrl.length}`;
    await Promise.all(
      todo.map(async (t, i) => {
        try {
          const result = await runSimulation({
            photoId,
            photo: photo.dataUrl,
            landmarks: photo.landmarks,
            kind,
            provider: t.provider,
            useMask: t.useMask,
            promptOverride: prompt !== SIM_PROMPTS[kind].prompt ? prompt : undefined,
            force: true,
          });
          setRuns((r) => r.map((x, j) => (j === i ? { ...x, status: "done", result } : x)));
        } catch (e) {
          setRuns((r) => r.map((x, j) => (j === i ? { ...x, status: "error", error: e instanceof Error ? e.message : "failed" } : x)));
        }
      }),
    );
  };

  const runAnalysis = async () => {
    if (!photo) return;
    setAnalysis({ status: "running" });
    const t0 = performance.now();
    try {
      const small = await resizeDataUrl(photo.dataUrl, 1024, 0.9);
      const crops = await buildAnalysisCrops(photo.dataUrl, photo.landmarks);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicSlug: "sample", photo: small.dataUrl, crops, landmarks: photo.landmarks, source: "upload", width: photo.width, height: photo.height }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAnalysis({ status: "done", results: json.results, ms: Math.round(performance.now() - t0) });
    } catch (e) {
      setAnalysis({ status: "error", error: e instanceof Error ? e.message : "failed" });
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Origami · internal</p>
          <h1 className="font-display mt-1 text-4xl">Bake-off lab</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">
            Same selfie, same treatment, every configured model, side by side at 100%. Toggle raw vs. composited to see how much the mask saves.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <Chip key={p.id} tone={p.configured ? "accent" : "outline"}>
              {p.id} · {p.configured ? p.model : "no key"}
            </Chip>
          ))}
        </div>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <label className="block text-sm font-medium">Selfie</label>
            <input type="file" accept="image/*" className="mt-2 block w-full text-sm" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            {photo && <p className="mt-2 text-xs text-ink-muted">{photo.width}×{photo.height} · 478 landmarks found</p>}
            {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
          </Card>
          <Card>
            <label className="block text-sm font-medium">Treatment</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(SIM_PROMPTS) as SimKind[]).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-chip border px-3 py-1.5 text-[13px] ${kind === k ? "border-ink bg-ink text-ivory" : "border-line-strong"}`}>
                  {k.replace("_", " ")}
                </button>
              ))}
            </div>
            <Textarea className="mt-4" label="Prompt" rows={7} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            {maskPreview && (
              <div className="mt-4">
                <p className="text-xs text-ink-muted">Mask (white = may change)</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={maskPreview} alt="" className="mt-1 w-full rounded-field border border-line" />
              </div>
            )}
          </Card>
          <Button full disabled={!photo} onClick={runAll}>Run all models</Button>
          <Button full variant="secondary" disabled={!photo} loading={analysis.status === "running"} onClick={runAnalysis}>
            Run analysis (vision LLM)
          </Button>
        </div>

        <div className="space-y-6">
          {runs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-muted">Show</span>
              <button type="button" onClick={() => setView("composite")} className={`rounded-chip border px-3 py-1 text-[13px] ${view === "composite" ? "border-ink bg-ink text-ivory" : "border-line-strong"}`}>Composited (ours)</button>
              <button type="button" onClick={() => setView("raw")} className={`rounded-chip border px-3 py-1 text-[13px] ${view === "raw" ? "border-ink bg-ink text-ivory" : "border-line-strong"}`}>Raw model output</button>
            </div>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            {runs.map((r, i) => (
              <Card key={i} padding="sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.provider}{r.useMask ? " + mask" : ""}</span>
                  <span className="text-xs text-ink-muted">
                    {r.status === "running" ? "running…" : r.status === "error" ? "error" : `${r.result?.model} · ${((r.result?.ms ?? 0) / 1000).toFixed(1)}s`}
                  </span>
                </div>
                {r.status === "error" && <p className="mt-2 text-sm text-danger">{r.error}</p>}
                {r.result && (
                  <div className="mt-3">
                    <BeforeAfter
                      original={r.result.original}
                      composite={view === "composite" ? r.result.composite : r.result.edited}
                      width={r.result.width}
                      height={r.result.height}
                      initialDose={1}
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>

          {analysis.status !== "idle" && (
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">Analysis (Option B: vision LLM)</h2>
                {analysis.ms && <span className="text-xs text-ink-muted">{(analysis.ms / 1000).toFixed(1)}s · {analysis.results?.model}</span>}
              </div>
              {analysis.status === "error" && <p className="mt-2 text-sm text-danger">{analysis.error}</p>}
              {analysis.results && (
                <pre className="mt-3 max-h-[480px] overflow-auto rounded-field bg-ivory-deep/60 p-3 text-xs leading-relaxed">{JSON.stringify(analysis.results, null, 2)}</pre>
              )}
            </Card>
          )}
          <p className="text-xs text-ink-muted">
            Option A (Perfect Corp Skin Analysis API) needs a developer-console key; wire it here once the team has one. Flow: upload file → create task → poll → masks + scores.
          </p>
        </div>
      </section>
    </main>
  );
}
