import { NextResponse } from "next/server";
import { SIM_PROMPTS } from "@/lib/sim/prompts";
import { MODELS, providerConfigured, runEdit } from "@/lib/sim/providers";
import type { SimKind, SimProvider } from "@/lib/types";

export const maxDuration = 120;

type Body = {
  image: string; // JPEG data URL, <= ~1024px
  mask?: string | null; // PNG data URL with alpha (transparent = editable) — OpenAI
  maskBW?: string | null; // PNG data URL white-on-black (white = editable) — FLUX fill
  useMask?: boolean; // ask the provider to honor the mask (fal switches to the fill model)
  kind: SimKind;
  provider?: SimProvider;
  promptOverride?: string;
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

  const provider: SimProvider | undefined =
    body.provider && ORDER.includes(body.provider)
      ? body.provider
      : ((process.env.SIM_PRIMARY_PROVIDER as SimProvider | undefined) && providerConfigured(process.env.SIM_PRIMARY_PROVIDER as SimProvider)
          ? (process.env.SIM_PRIMARY_PROVIDER as SimProvider)
          : ORDER.find(providerConfigured));
  if (!provider) {
    return NextResponse.json({ error: "No image-edit provider is configured on the server." }, { status: 503 });
  }
  if (!providerConfigured(provider)) {
    return NextResponse.json({ error: `${provider} is not configured on the server.` }, { status: 503 });
  }

  const prompt = body.promptOverride?.trim() || SIM_PROMPTS[body.kind].prompt;
  try {
    const out = await runEdit(provider, {
      image: body.image,
      mask: body.useMask ? body.mask ?? null : null,
      maskBW: body.useMask ? body.maskBW ?? null : null,
      useMask: Boolean(body.useMask),
      prompt,
    });
    return NextResponse.json({ image: out.image, provider, model: out.model, ms: out.ms });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Simulation failed";
    return NextResponse.json({ error: msg, provider }, { status: 502 });
  }
}
