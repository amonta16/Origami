import { NextResponse } from "next/server";
import { SIM_PROMPTS } from "@/lib/sim/prompts";
import { MODELS, providerConfigured, runEdit } from "@/lib/sim/providers";
import type { SimKind, SimProvider } from "@/lib/types";
import { getClinicBySlug } from "@/lib/data/clinics";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 120;

type Body = {
  image: string; // JPEG data URL, <= ~1024px
  mask?: string | null; // PNG data URL with alpha (transparent = editable) — OpenAI
  maskBW?: string | null; // PNG data URL white-on-black (white = editable) — FLUX fill
  useMask?: boolean; // ask the provider to honor the mask (fal switches to the fill model)
  kind: SimKind;
  provider?: SimProvider;
  promptOverride?: string;
  /** groups runs in scan_runs for the tester comparison page */
  session?: string;
  clinicSlug?: string;
};

const ORDER: SimProvider[] = ["gemini", "fal", "openai"];

export function GET() {
  return NextResponse.json({
    providers: ORDER.map((p) => ({ id: p, configured: providerConfigured(p), model: MODELS[p] })),
  });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!body?.image?.startsWith("data:image/") || !(body.kind in SIM_PROMPTS)) {
    return NextResponse.json({ error: "image and kind are required" }, { status: 400 });
  }
  if (body.image.length > 4_000_000) return NextResponse.json({ error: "Image too large" }, { status: 413 });
  if ((body.mask?.length ?? 0) > 4_000_000 || (body.maskBW?.length ?? 0) > 4_000_000) {
    return NextResponse.json({ error: "Mask too large" }, { status: 413 });
  }

  // An explicit provider (the /lab bake-off) runs alone so its own error shows.
  // Otherwise: SIM_PRIMARY_PROVIDER first, then every other configured provider in ORDER,
  // so one provider's outage or empty balance never blanks the patient's "after".
  const explicit = body.provider && ORDER.includes(body.provider) ? body.provider : null;
  if (explicit && !providerConfigured(explicit)) {
    return NextResponse.json({ error: `${explicit} is not configured on the server.` }, { status: 503 });
  }
  const primary = process.env.SIM_PRIMARY_PROVIDER as SimProvider | undefined;
  const chain: SimProvider[] = explicit
    ? [explicit]
    : [...(primary && ORDER.includes(primary) ? [primary] : []), ...ORDER.filter((p) => p !== primary)].filter(providerConfigured);
  if (!chain.length) {
    return NextResponse.json({ error: "No image-edit provider is configured on the server." }, { status: 503 });
  }

  const prompt = body.promptOverride?.trim() || SIM_PROMPTS[body.kind].prompt;
  const failures: Array<{ provider: SimProvider; error: string }> = [];

  // Tester log (scan_runs): provider, timing, mask on/off and errors. Never the images.
  const session = typeof body.session === "string" ? body.session.slice(0, 64) : null;
  const sb = supabaseAdmin();
  const clinic = session && sb && body.clinicSlug ? await getClinicBySlug(body.clinicSlug) : null;
  const logRun = async (row: Record<string, unknown>) => {
    if (!session || !sb) return;
    const { error } = await sb.from("scan_runs").insert({
      clinic_id: clinic?.id ?? null,
      session_id: session,
      kind: "sim",
      sim_kind: body.kind,
      used_mask: Boolean(body.useMask),
      model_requested: explicit,
      ...row,
    });
    if (error) console.warn("scan_runs insert failed", error.message);
  };

  for (const provider of chain) {
    const t0 = Date.now();
    try {
      const out = await runEdit(provider, {
        image: body.image,
        mask: body.useMask ? body.mask ?? null : null,
        maskBW: body.useMask ? body.maskBW ?? null : null,
        useMask: Boolean(body.useMask),
        prompt,
      });
      await logRun({ provider, model_served: out.model, ok: true, ms: out.ms });
      return NextResponse.json({
        image: out.image,
        provider,
        model: out.model,
        ms: out.ms,
        fellBackFrom: failures.length ? failures : undefined,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "Simulation failed";
      console.warn(`simulate: ${provider} failed: ${error}`);
      failures.push({ provider, error });
      await logRun({ provider, ok: false, error: error.slice(0, 500), ms: Date.now() - t0 });
    }
  }
  const last = failures[failures.length - 1];
  return NextResponse.json({ error: last.error, provider: last.provider, failures }, { status: 502 });
}
