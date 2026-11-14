import { NextResponse } from "next/server";
import { analysisSchema, analysisSchemaGemini } from "@/lib/analysis/schema";
import { analysisSystemPrompt, analysisUserPrompt } from "@/lib/analysis/prompt";
import { openaiStructured } from "@/lib/analysis/openai";
import { geminiStructured } from "@/lib/analysis/gemini";
import { severityFromScore } from "@/lib/concerns";
import { getClinicBySlug, getTreatments } from "@/lib/data/clinics";
import { supabaseAdmin } from "@/lib/supabase/server";
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
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  const wanted = process.env.ANALYSIS_PROVIDER;
  const provider: "openai" | "gemini" | null =
    wanted === "gemini" && hasGemini ? "gemini" : wanted === "openai" && hasOpenAI ? "openai" : hasOpenAI ? "openai" : hasGemini ? "gemini" : null;
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
