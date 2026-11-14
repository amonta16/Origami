import { NextResponse } from "next/server";
import { analysisSchema, analysisSchemaGemini } from "@/lib/analysis/schema";
import { analysisSystemPrompt, analysisUserPrompt } from "@/lib/analysis/prompt";
import { openaiStructured, OPENAI_VISION_MODEL } from "@/lib/analysis/openai";
import { geminiStructured, GEMINI_VISION_MODEL } from "@/lib/analysis/gemini";
import { severityFromScore } from "@/lib/concerns";
import { getClinicBySlug, getTreatments } from "@/lib/data/clinics";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase/server";
import type { ScanResults } from "@/lib/types";

export const maxDuration = 60;

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
};

/** Which analysis provider the server would use right now, from env alone. */
function pickProvider(): "openai" | "gemini" | null {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  const wanted = process.env.ANALYSIS_PROVIDER;
  if (wanted === "gemini" && hasGemini) return "gemini";
  if (wanted === "openai" && hasOpenAI) return "openai";
  return hasOpenAI ? "openai" : hasGemini ? "gemini" : null;
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
  const model = modelOverride ?? (provider === "openai" ? OPENAI_VISION_MODEL : provider === "gemini" ? GEMINI_VISION_MODEL : null);
  const out: Record<string, unknown> = {
    analysis: { provider, model },
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
            generationConfig: { max_output_tokens: 64, ...(noThink ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return;
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
      { error: "Analysis isn't configured yet (set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY on the server)." },
      { status: 503 },
    );
  }

  const crops = (body.crops ?? []).slice(0, 8).filter((c) => c.dataUrl?.startsWith("data:image/"));
  const t0 = Date.now();
  type Raw = Omit<ScanResults, "provider" | "model" | "disclaimer">;
  let raw: Raw;
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
  try {
    if (provider === "openai") {
      const out = await openaiStructured<Raw>({
        system,
        user,
        images,
        schemaName: "skin_analysis",
        schema: analysisSchema(ids) as unknown as Record<string, unknown>,
      });
      raw = out.data;
      model = out.model;
    } else {
      const out = await geminiStructured<Raw & { skin_age: number; medical_flag: string }>({
        system,
        user,
        images,
        schema: analysisSchemaGemini(ids) as unknown as Record<string, unknown>,
      });
      raw = {
        ...out.data,
        skin_age: out.data.skin_age && out.data.skin_age >= 16 ? out.data.skin_age : null,
        medical_flag: out.data.medical_flag?.trim() ? out.data.medical_flag.trim() : null,
      };
      model = out.model;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 502 });
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
    provider,
    model,
    disclaimer: DISCLAIMER,
  };

  // Persist when Supabase is configured (photo + derived data, 72 h retention).
  let scanId: string | null = null;
  const sb = supabaseAdmin();
  if (sb && !clinic.is_sample) {
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
