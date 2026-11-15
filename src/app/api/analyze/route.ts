import { NextResponse } from "next/server";
import { analysisSchema, analysisSchemaGemini } from "@/lib/analysis/schema";
import { analysisSystemPrompt, analysisUserPrompt } from "@/lib/analysis/prompt";
import { openaiStructured, OPENAI_VISION_MODEL } from "@/lib/analysis/openai";
import { analysisModel, type AnalysisProvider } from "@/lib/analysis/models";
import { geminiStructured, GEMINI_VISION_MODEL } from "@/lib/analysis/gemini";
import { youcamAnalyze, youcamConfigured, YOUCAM_MODEL_ID } from "@/lib/analysis/youcam";
import { CONCERN_IDS, severityFromScore } from "@/lib/concerns";
import { getClinicBySlug, getTreatments } from "@/lib/data/clinics";
import { isSupabaseConfigured, supabaseAdmin, supabaseEnv } from "@/lib/supabase/server";
import type { ScanResults } from "@/lib/types";

// A full scan is one photo + up to 8 crops; Gemini took ~36 s on a single image in testing,
// and a failed primary provider adds its own time before the fallback runs.
export const maxDuration = 120;

const DISCLAIMER = "Cosmetic estimates from a photo, not a medical diagnosis. A clinician confirms in person.";

type Body = {
  clinicSlug: string;
  photo: string; // data URL (<=1024px)
  crops: Array<{ id: string; dataUrl: string }>;
  landmarks: Array<{ x: number; y: number; z: number }>;
  blendshapes?: Record<string, number>;
  quality?: unknown;
  source: "camera" | "upload";
  width: number;
  height: number;
  firstName?: string | null;
  answers?: Record<string, unknown> | null;
  leadId?: string | null;
  /** tester model pick (ANALYSIS_MODELS id) */
  model?: string;
  /** client-generated id for one captured photo; groups model runs in scan_runs */
  session?: string;
  /** true when re-running the same photo with another model */
  rerun?: boolean;
  /** the photo is a face crop with a short side of at least 1080 px: run the scanner in HD */
  hd?: boolean;
  /** concern ids from the goals step */
  goals?: string[];
};

/** Keys present on the server, per provider. Never the values. */
function configured(p: AnalysisProvider) {
  if (p === "youcam") return youcamConfigured();
  if (p === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
}

/** Preference order: the measured scanner first, then the vision models. ANALYSIS_PROVIDER overrides. */
const PROVIDER_ORDER: AnalysisProvider[] = ["youcam", "openai", "gemini"];

/** Which analysis provider the server would use right now, from env alone. */
function pickProvider(): AnalysisProvider | null {
  const wanted = process.env.ANALYSIS_PROVIDER as AnalysisProvider | undefined;
  if (wanted && PROVIDER_ORDER.includes(wanted) && configured(wanted)) return wanted;
  return PROVIDER_ORDER.find(configured) ?? null;
}

/**
 * Health check for the lab and for smoke tests after a deploy. Never returns key values.
 *   GET /api/analyze          -> which provider/model is configured, whether Supabase is wired
 *   GET /api/analyze?ping=1   -> also makes one tiny text call to the provider and one count
 *                                query to Supabase, and reports ok / error text + latency
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const ping = params.get("ping") === "1";
  const provider = pickProvider();
  // ?model= lets the lab try another model id without a redeploy; ?nothink=1 turns thinking off on Gemini.
  const modelOverride = params.get("model")?.trim() || null;
  const noThink = params.get("nothink") === "1";
  const model =
    modelOverride ?? (provider === "youcam" ? YOUCAM_MODEL_ID : provider === "openai" ? OPENAI_VISION_MODEL : provider === "gemini" ? GEMINI_VISION_MODEL : null);
  const out: Record<string, unknown> = {
    analysis: { provider, model },
    providers: Object.fromEntries(PROVIDER_ORDER.map((p) => [p, configured(p)])),
    supabase: { configured: isSupabaseConfigured() },
  };
  if (!ping) return NextResponse.json(out);

  // Each probe gets its own 15 s budget and they run in parallel, so a hang is reported by name
  // instead of taking the whole function down with FUNCTION_INVOCATION_TIMEOUT.
  const PROBE_MS = Math.min(Math.max(Number(params.get("timeout")) || 25_000, 5_000), 50_000);

  // Gemini only: is the key accepted at all, and does the model id exist? (cheap GET, no generation)
  const probeGeminiModels = async () => {
    if (provider !== "gemini") return;
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const t0 = Date.now();
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
        headers: { "x-goog-api-key": key! },
        signal: AbortSignal.timeout(PROBE_MS),
      });
      const json = (await res.json()) as { error?: { message?: string; status?: string }; models?: Array<{ name: string }> };
      const names = (json.models ?? []).map((m) => m.name.replace(/^models\//, ""));
      out.geminiModels = {
        ok: res.ok,
        status: res.status,
        error: json.error?.message ?? null,
        hasConfiguredModel: names.includes(GEMINI_VISION_MODEL),
        count: names.length,
        sample: names.filter((n) => n.startsWith("gemini")).slice(0, 12),
        ms: Date.now() - t0,
      };
    } catch (e) {
      out.geminiModels = { ok: false, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), ms: Date.now() - t0 };
    }
  };

  const probeProvider = async () => {
    if (!provider) return;
    if (provider === "youcam") {
      // No ping call exists that doesn't spend a YouCam credit; the key's presence is the check.
      out.analysis = { provider, model, ok: true, note: "key present; a real scan is the only test" };
      return;
    }
    const t0 = Date.now();
    try {
      let res: Response;
      const signal = AbortSignal.timeout(PROBE_MS);
      if (provider === "gemini") {
        const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": key!, "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Reply with the single word ok." }] }],
            generationConfig: { max_output_tokens: 512,...(noThink ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
          }),
          signal,
        });
      } else {
        res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
          body: JSON.stringify({ model, input: "Reply with the single word ok.", max_output_tokens: 16 }),
          signal,
        });
      }
      const json = (await res.json()) as {
        error?: { message?: string };
        modelVersion?: string;
        model?: string;
        candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: unknown;
      };
      out.analysis = {
        provider,
        model,
        ok: res.ok,
        served: json.modelVersion ?? json.model ?? null,
        text: json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null,
        finishReason: json.candidates?.[0]?.finishReason ?? null,
        usage: json.usageMetadata ?? null,
        error: res.ok ? null : json.error?.message ?? `HTTP ${res.status}`,
        ms: Date.now() - t0,
      };
    } catch (e) {
      const msg = e instanceof Error ? (e.name === "TimeoutError" ? `no answer in ${PROBE_MS / 1000}s` : e.message) : String(e);
      out.analysis = { provider, model, ok: false, error: msg, ms: Date.now() - t0 };
    }
  };

  const probeSupabase = async () => {
    const sb = supabaseAdmin();
    if (!sb) return;
    const t0 = Date.now();
    try {
      const { count, error, status, statusText } = await sb
        .from("clinics")
        .select("id", { count: "exact", head: true })
        .abortSignal(AbortSignal.timeout(PROBE_MS));
      out.supabase = {
        configured: true,
        ok: !error,
        clinics: count ?? null,
        status,
        statusText,
        error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
        ms: Date.now() - t0,
      };
    } catch (e) {
      const msg = e instanceof Error ? (e.name === "TimeoutError" ? `no answer in ${PROBE_MS / 1000}s` : e.message) : String(e);
      out.supabase = { configured: true, ok: false, error: msg, ms: Date.now() - t0 };
    }
  };

  // Raw PostgREST call with the same key, bypassing supabase-js, to tell a key problem from a client problem.
  const probeSupabaseRaw = async () => {
    const rawKey = process.env.SUPABASE_SECRET_KEY ?? "";
    const { url, key } = supabaseEnv();
    if (!url || !key) return;
    // Shape only, never the value: length and whether the pasted value carried whitespace.
    out.supabaseKeyShape = {
      rawLength: rawKey.length,
      trimmedLength: key.length,
      hadOuterWhitespace: rawKey !== key,
      hasInnerWhitespace: /\s/.test(key),
      hasQuotes: /^["']|["']$/.test(key),
    };
    const t0 = Date.now();
    try {
      const res = await fetch(`${url}/rest/v1/clinics?select=id&limit=1`, {
        headers: { apikey: key, authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(PROBE_MS),
      });
      const text = await res.text();
      out.supabaseRaw = {
        status: res.status,
        ok: res.ok,
        keyShape: key.startsWith("sb_secret_") ? "sb_secret" : key.startsWith("sb_publishable_") ? "sb_publishable (wrong: that is the public key)" : key.startsWith("eyJ") ? "legacy jwt" : "unknown",
        body: text.slice(0, 200),
        ms: Date.now() - t0,
      };
    } catch (e) {
      out.supabaseRaw = { ok: false, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), ms: Date.now() - t0 };
    }
  };

  await Promise.all([probeGeminiModels(), probeProvider(), probeSupabase(), probeSupabaseRaw()]);
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!body?.photo?.startsWith("data:image/") || !Array.isArray(body.landmarks) || body.landmarks.length < 400) {
    return NextResponse.json({ error: "Photo and landmarks are required" }, { status: 400 });
  }
  if (body.photo.length > 3_000_000) return NextResponse.json({ error: "Photo too large" }, { status: 413 });

  const clinic = await getClinicBySlug(body.clinicSlug);
  if (!clinic) return NextResponse.json({ error: "Unknown clinic" }, { status: 404 });
  const treatments = await getTreatments(clinic.id);

  // Provider: explicit env, else whichever key exists (OpenAI first, then Gemini's free tier).
  const provider = pickProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "Analysis isn't configured yet (set YOUCAM_API_KEY, OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY on the server)." },
      { status: 503 },
    );
  }

  const crops = (body.crops ?? []).slice(0, 8).filter((c) => c.dataUrl?.startsWith("data:image/"));
  const goals = Array.isArray(body.goals) ? [...new Set(body.goals.filter((g): g is string => typeof g === "string" && CONCERN_IDS.includes(g)))].slice(0, 12) : [];
  const t0 = Date.now();
  type Raw = Omit<ScanResults, "provider" | "model" | "disclaimer">;
  let raw: Raw | null = null;
  let model = "";
  const system = analysisSystemPrompt();
  const user = analysisUserPrompt({
    firstName: body.firstName ?? null,
    answers: body.answers ?? null,
    treatments,
    cropIds: crops.map((c) => c.id),
    source: body.source,
  });
  const images = [body.photo, ...crops.map((c) => c.dataUrl)];
  const ids = treatments.map((t) => t.id);

  // Tester-picked model (results screen "Model" buttons): runs alone, no silent fallback.
  const picked = analysisModel(body.model);
  if (body.model && !picked) return NextResponse.json({ error: "Unknown model" }, { status: 400 });
  if (picked && !configured(picked.provider)) {
    const name = picked.provider === "youcam" ? "YouCam" : picked.provider === "openai" ? "OpenAI" : "Gemini";
    return NextResponse.json({ error: `${name} isn't configured on the server yet.` }, { status: 503 });
  }
  const session = typeof body.session === "string" ? body.session.slice(0, 64) : null;

  const runWith = async (p: AnalysisProvider): Promise<{ raw: Raw; model: string }> => {
    if (p === "youcam") {
      const out = await youcamAnalyze({ photo: body.photo, firstName: body.firstName ?? null, treatments, hd: Boolean(body.hd), goals });
      const { raw: _features, task_id: _task, hd: _hd, ...rest } = out;
      void _hd;
      void _features;
      void _task;
      return { raw: rest, model: YOUCAM_MODEL_ID };
    }
    if (p === "openai") {
      const out = await openaiStructured<Raw>({
        system,
        user,
        images,
        schemaName: "skin_analysis",
        schema: analysisSchema(ids) as unknown as Record<string, unknown>,
        model: picked?.provider === "openai" ? picked.id : undefined,
      });
      return { raw: out.data, model: out.model };
    }
    const out = await geminiStructured<Raw & { skin_age: number; medical_flag: string }>({
      system,
      user,
      images,
      schema: analysisSchemaGemini(ids) as unknown as Record<string, unknown>,
      model: picked?.provider === "gemini" ? picked.id : undefined,
      noFallback: Boolean(picked),
    });
    return {
      raw: {
        ...out.data,
        skin_age: out.data.skin_age && out.data.skin_age >= 16 ? out.data.skin_age : null,
        medical_flag: out.data.medical_flag?.trim() ? out.data.medical_flag.trim() : null,
      },
      model: out.model,
    };
  };

  // Primary provider first; if it errors (empty balance, outage, bad photo for the scanner) walk the
  // other configured providers, so a patient never hits a dead end over a billing problem.
  const chain: AnalysisProvider[] = picked ? [picked.provider] : [provider, ...PROVIDER_ORDER.filter((p) => p !== provider && configured(p))];
  let used: AnalysisProvider = chain[0];
  const failures: Array<{ provider: string; error: string }> = [];
  for (const p of chain) {
    try {
      const out = await runWith(p);
      raw = out.raw;
      model = out.model;
      used = p;
      break;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Analysis failed";
      console.warn(`analyze: ${p} failed: ${error}`);
      failures.push({ provider: p, error });
    }
  }
  const sbLog = supabaseAdmin();
  const logRun = (row: Record<string, unknown>) =>
    session && sbLog
      ? sbLog
          .from("scan_runs")
          .insert({ clinic_id: clinic.id, session_id: session, kind: "analysis", model_requested: picked?.id ?? null, ms: Date.now() - t0, ...row })
          .then(({ error }) => error && console.warn("scan_runs insert failed", error.message))
      : Promise.resolve();

  if (!raw) {
    const last = failures[failures.length - 1];
    await logRun({ provider: last.provider, ok: false, error: last.error.slice(0, 500) });
    return NextResponse.json({ error: last.error, failures }, { status: 502 });
  }

  // Normalize: severity must match score; sort worst first; potential >= overall.
  const concerns = raw.concerns
    .map((c) => ({ ...c, score: Math.round(c.score), severity: severityFromScore(c.score) }))
    .sort((a, b) => b.score - a.score);
  const treatmentIds = new Set(treatments.map((t) => t.id));
  const recommendations = raw.recommendations.filter((r) => treatmentIds.has(r.treatment_id)).slice(0, 3);
  const results: ScanResults = {
    overall_score: Math.round(raw.overall_score),
    potential_score: Math.max(Math.round(raw.potential_score), Math.round(raw.overall_score)),
    skin_age: raw.skin_age,
    insight: raw.insight,
    concerns,
    recommendations,
    medical_flag: raw.medical_flag,
    provider: used,
    model,
    disclaimer: DISCLAIMER,
    ...(raw.overlays?.length ? { overlays: raw.overlays } : {}),
    ...(raw.photo_url ? { photo_url: raw.photo_url } : {}),
    ...(raw.zones?.length ? { zones: raw.zones } : {}),
    ...(goals.length ? { goals } : {}),
  };

  // Tester log: structured results only, never the photo (overlay URLs are signed and expire, so they stay out too).
  const { overlays: _ov, photo_url: _pu, ...loggable } = results;
  void _pu;
  void _ov;
  await logRun({ provider: used, model_served: model, ok: true, results: loggable });

  // Persist when Supabase is configured (photo + derived data, 72 h retention). Model re-runs on the
  // same photo don't create another scan or upload the photo again.
  let scanId: string | null = null;
  const sb = supabaseAdmin();
  if (sb && !clinic.is_sample && !body.rerun) {
    try {
      const { data: row, error } = await sb
        .from("scans")
        .insert({
          clinic_id: clinic.id,
          lead_id: body.leadId ?? null,
          landmarks: body.landmarks,
          quality: body.quality ?? null,
          results,
        })
        .select("id")
        .single();
      if (error) throw error;
      scanId = row.id as string;
      const bytes = Buffer.from(body.photo.split(",")[1], "base64");
      const path = `${clinic.id}/${scanId}.jpg`;
      const up = await sb.storage.from("scans").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (!up.error) await sb.from("scans").update({ photo_path: path }).eq("id", scanId);
    } catch (e) {
      console.warn("scan persist failed", e);
    }
  }

  return NextResponse.json({ results, scanId, ms: Date.now() - t0 });
}
