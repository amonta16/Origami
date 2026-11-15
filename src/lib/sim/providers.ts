import "server-only";
import sharp from "sharp";
import { YoucamError, youcamConfigured, youcamRunTask, youcamUpload } from "@/lib/analysis/youcam";
import type { SimKind, SimProvider } from "@/lib/types";

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
  youcam: "youcam-sim-v2",
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
  /** YouCam picks its API and sliders from the treatment kind, not a prompt. */
  kind?: SimKind;
  /** kind "scan": Skin Simulation strengths per key, 0..1 (from the scan's weakest scores) */
  sim?: Record<string, number>;
};
export type EditOutput = { image: string; model: string; ms: number; raw?: unknown };

export function providerConfigured(p: SimProvider) {
  if (p === "youcam") return youcamConfigured();
  if (p === "gemini") return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  if (p === "fal") return Boolean(process.env.FAL_KEY);
  if (p === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

export async function runEdit(p: SimProvider, input: EditInput): Promise<EditOutput> {
  const t0 = Date.now();
  const out =
    p === "youcam" ? await youcam(input) : p === "gemini" ? await gemini(input) : p === "fal" ? await fal(input) : await openai(input);
  return { ...out, ms: Date.now() - t0 };
}

/* ---------------- YouCam (Perfect Corp) ---------------- */
/**
 * Purpose-built treatment simulators instead of a prompted image model, on the same key as the scan.
 * Each kind maps to one YouCam API at a fixed, clearly visible strength; the dose slider then blends
 * back toward the original, and our zone mask still decides which pixels change.
 * Units per call (docs, Nov 15 2026): Skin Simulation 4 (1–4 concerns), Face Lift 1, Face Reshape 1.
 */
const YOUCAM_SIM: Record<SimKind, { path: string; body: Record<string, unknown> }> = {
  scan: { path: "/s2s/v2.0/task/skin-simulation", body: { radiance: 0.5 } }, // replaced by the scan's own strengths
  neurotoxin: { path: "/s2s/v2.0/task/skin-simulation", body: { wrinkle: 1 } },
  under_eye_filler: { path: "/s2s/v2.0/task/skin-simulation", body: { eye_bags: 1, dark_circle: 0.8 } },
  resurfacing: { path: "/s2s/v2.0/task/skin-simulation", body: { texture: 1, pores: 1, wrinkle: 0.5, acne: 0.7 } },
  tone: { path: "/s2s/v2.0/task/skin-simulation", body: { spots: 1, redness: 0.9, radiance: 0.4 } },
  glow: { path: "/s2s/v2.0/task/skin-simulation", body: { radiance: 1, texture: 0.4, redness: 0.3 } },
  lip_filler: {
    path: "/s2s/v2.0/task/face-reshape",
    body: { version: "1.0", features: { lip_size: 65, lip_height_top: 35, lip_height_bottom: 25 }, global: { skin_smooth_strength: 0, skin_smooth_color_intensity: 0 } },
  },
  cheek_filler: {
    path: "/s2s/v2.0/task/face-lift",
    body: { version: "1.0", type: "custom", features: { cheek: 70, mouth: 45, shape: 25 }, global: { skin_smooth_strength: 0, skin_smooth_color_intensity: 0 } },
  },
};

/** Skin Simulation keys we let a client set (oiliness left out on purpose: at full strength it adds shine). */
const SIM_KEYS = ["wrinkle", "radiance", "acne", "eye_bags", "dark_circle", "spots", "pores", "texture", "redness"];
function simBody(sim: Record<string, number> | undefined) {
  const body: Record<string, number> = {};
  for (const k of SIM_KEYS) {
    const v = Number(sim?.[k]);
    if (Number.isFinite(v) && v > 0) body[k] = Math.round(Math.min(1, v) * 100) / 100;
  }
  return Object.keys(body).length ? body : { radiance: 0.5 };
}

async function youcam(input: EditInput): Promise<Omit<EditOutput, "ms">> {
  if (!input.kind) throw new Error("YouCam preview needs the treatment kind");
  const spec = input.kind === "scan" ? { path: YOUCAM_SIM.scan.path, body: simBody(input.sim) } : YOUCAM_SIM[input.kind];
  const model = `${MODELS.youcam}:${spec.path.split("/").pop()}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 100_000);
  const t0 = Date.now();
  const render = async (image: string) => {
    const fileId = await youcamUpload(image, ac.signal);
    const data = await youcamRunTask(spec.path, { src_file_id: fileId, ...spec.body }, ac.signal, 85_000 - (Date.now() - t0));
    const results = data.results as { url?: string } | Array<{ url?: string }> | undefined;
    const url = Array.isArray(results) ? results[0]?.url : results?.url;
    if (!url) throw new Error("YouCam returned no result image");
    // download server-side so the browser never talks to YouCam and the 2-hour link can't expire mid-session
    const imgRes = await fetch(url, { signal: ac.signal });
    if (!imgRes.ok) throw new Error(`YouCam result download failed (HTTP ${imgRes.status})`);
    return Buffer.from(await imgRes.arrayBuffer());
  };
  try {
    let out: Buffer;
    try {
      out = await render(input.image);
    } catch (e) {
      // A close-up selfie can crop the forehead or chin, which the skin simulator rejects as "face out of bound".
      // Failed tasks cost nothing, so retry once with the photo extended above and below (mirrored edges), then
      // crop back to the original frame. Width is untouched, so the "face fills 60% of the width" rule still holds.
      if (!(e instanceof YoucamError && e.code === "error_src_face_out_of_bound")) throw e;
      const src = Buffer.from(input.image.split(",")[1], "base64");
      const meta = await sharp(src).metadata();
      const W = meta.width ?? 0, H = meta.height ?? 0;
      const pad = Math.round(H * 0.18);
      const padded = await sharp(src).extend({ top: pad, bottom: pad, extendWith: "mirror" }).jpeg({ quality: 92 }).toBuffer();
      const res = await render(`data:image/jpeg;base64,${padded.toString("base64")}`);
      out = await sharp(res).resize(W, H + 2 * pad, { fit: "fill" }).extract({ left: 0, top: pad, width: W, height: H }).jpeg({ quality: 92 }).toBuffer();
    }
    const head = out.subarray(0, 4).toString("hex");
    const mime = head.startsWith("89504e47") ? "image/png" : "image/jpeg";
    return { image: `data:${mime};base64,${out.toString("base64")}`, model };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("YouCam took too long to render the preview. Please try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
