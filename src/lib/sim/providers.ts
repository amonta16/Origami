import "server-only";
import type { SimProvider } from "@/lib/types";

/**
 * Image-edit provider adapters. Each takes a JPEG data URL (+ optional alpha mask PNG)
 * and a prompt, and returns the edited image as a data URL. Model ids are env-overridable;
 * defaults are checked against provider docs at build time (see BUILD_LOG.md).
 */

// Verified against provider docs on Nov 14, 2026 (see BUILD_LOG.md):
//  - Gemini image editing: gemini-nano-banana-2.1 (prompt-only, no pixel mask) ~$0.034/image
//  - fal: fal-ai/flux-pro/kontext $0.04/image (no mask); fal-ai/flux-pro/v1/fill takes mask_url (white = edit)
//  - OpenAI: gpt-image-2.5-sunburst via /v1/images/edits, alpha-PNG mask, ~$0.05 medium
export const MODELS = {
  gemini: process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1",
  fal: process.env.FAL_EDIT_MODEL || "fal-ai/flux-pro/kontext",
  falFill: process.env.FAL_FILL_MODEL || "fal-ai/flux-pro/v1/fill",
  openai: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst",
};

export type EditInput = {
  image: string;
  /** PNG with alpha: transparent = editable (OpenAI style). */
  mask?: string | null;
  /** PNG white-on-black: white = editable (FLUX fill style). */
  maskBW?: string | null;
  prompt: string;
  /** fal only: use the masked fill endpoint instead of kontext. */
  useMask?: boolean;
};
export type EditOutput = { image: string; model: string; ms: number; raw?: unknown };

export function providerConfigured(p: SimProvider) {
  if (p === "gemini") return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  if (p === "fal") return Boolean(process.env.FAL_KEY);
  if (p === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

export async function runEdit(p: SimProvider, input: EditInput): Promise<EditOutput> {
  const t0 = Date.now();
  const out = p === "gemini" ? await gemini(input) : p === "fal" ? await fal(input) : await openai(input);
  return { ...out, ms: Date.now() - t0 };
}

function splitDataUrl(d: string) {
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(d);
  if (!m) throw new Error("Expected a base64 image data URL");
  return { mime: m[1], b64: m[2] };
}

/* ---------------- Gemini ---------------- */
async function gemini(input: EditInput): Promise<Omit<EditOutput, "ms">> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini key missing");
  const img = splitDataUrl(input.image);
  // Gemini has no pixel-mask input; the prompt names the zone and our compositing enforces it.
  const parts: unknown[] = [{ text: input.prompt }, { inline_data: { mime_type: img.mime, data: img.b64 } }];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );
  const json = (await res.json()) as {
    error?: { message: string };
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string } }> } }>;
  };
  if (!res.ok) throw new Error(json.error?.message || `Gemini error ${res.status}`);
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
  const data = part?.inlineData ?? (part?.inline_data ? { mimeType: part.inline_data.mime_type, data: part.inline_data.data } : undefined);
  if (!data) throw new Error("Gemini returned no image");
  return { image: `data:${data.mimeType};base64,${data.data}`, model: MODELS.gemini };
}

/* ---------------- fal.ai (FLUX) ---------------- */
async function fal(input: EditInput): Promise<Omit<EditOutput, "ms">> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY missing");
  const useFill = Boolean(input.useMask && input.maskBW);
  const model = useFill ? MODELS.falFill : MODELS.fal;
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    image_url: input.image,
    num_images: 1,
    output_format: "jpeg",
    safety_tolerance: "2",
  };
  if (useFill) body.mask_url = input.maskBW;
  else body.guidance_scale = 3;
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { authorization: `Key ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { detail?: unknown; images?: Array<{ url: string; content_type?: string }> };
  if (!res.ok) throw new Error(typeof json.detail === "string" ? json.detail : `fal error ${res.status}`);
  const url = json.images?.[0]?.url;
  if (!url) throw new Error("fal returned no image");
  // fetch the hosted result and inline it so the client never talks to fal
  const imgRes = await fetch(url);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const mime = imgRes.headers.get("content-type") || "image/jpeg";
  return { image: `data:${mime};base64,${buf.toString("base64")}`, model };
}

/* ---------------- OpenAI images/edits ---------------- */
async function openai(input: EditInput): Promise<Omit<EditOutput, "ms">> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const img = splitDataUrl(input.image);
  const form = new FormData();
  form.append("model", MODELS.openai);
  form.append("prompt", input.prompt);
  form.append("image", new Blob([Buffer.from(img.b64, "base64")], { type: img.mime }), "photo.jpg");
  if (input.mask) {
    const mk = splitDataUrl(input.mask);
    form.append("mask", new Blob([Buffer.from(mk.b64, "base64")], { type: "image/png" }), "mask.png");
  }
  form.append("size", "auto");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || "medium");
  form.append("output_format", "jpeg");
  // input_fidelity only exists on gpt-image-1.5; 2.x models are always high fidelity.
  if (/gpt-image-1\.5/.test(MODELS.openai)) form.append("input_fidelity", "high");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });
  const json = (await res.json()) as { error?: { message: string }; data?: Array<{ b64_json?: string }> };
  if (!res.ok) throw new Error(json.error?.message || `OpenAI images error ${res.status}`);
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image");
  return { image: `data:image/jpeg;base64,${b64}`, model: MODELS.openai };
}
