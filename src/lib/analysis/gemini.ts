import "server-only";

/**
 * Vision analysis through the Gemini API (generateContent, JSON output).
 * Default picked by measurement on the live deployment, Sat Nov 14 2026 ~3:20 AM Pacific, via
 * GET /api/analyze?ping=1&model=...: gemini-4-hydrogen answered "ok" in 35.7 s (free-tier queue),
 * gemini-3-flash-preview in 1.0 s, gemini-flash-latest refused with "high demand". A scan sends
 * nine images and must fit a 60 s function, so the fast one wins. Override with GEMINI_VISION_MODEL.
 * Gemini's JSON-schema subset drops some keywords, so callers pass a simplified schema.
 */
// Default moved to gemini-3.5-flash at 7:40 AM after Gemini 3 Flash's 20/day free quota ran out;
// the fallback chain below covers quota and overload either way.
export const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash";

function splitDataUrl(d: string) {
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(d);
  if (!m) throw new Error("Expected a base64 image data URL");
  return { mime: m[1], b64: m[2] };
}

/**
 * Free-tier Gemini quotas are per model and small (Gemini 3 Flash: 20 requests/day, measured
 * Nov 14 2026), so every call walks this chain on 429 (quota) or 503 (overloaded).
 * Order = quality first, then speed. Measured on our key: 3.5 Flash 2.2 s, 3.5 Flash Lite 0.5 s,
 * 3.1 Flash Lite 0.6 s.
 */
export const GEMINI_FALLBACKS = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

class RetryableGeminiError extends Error {}

export async function geminiStructured<T>(args: Parameters<typeof geminiOnce>[0]): Promise<{ data: T; model: string; usage: unknown; fellBackFrom?: string[] }> {
  const first = args.model || GEMINI_VISION_MODEL;
  const chain = [first, ...GEMINI_FALLBACKS.filter((m) => m !== first)];
  const skipped: string[] = [];
  let lastErr: unknown;
  for (const model of chain) {
    try {
      const out = await geminiOnce<T>({ ...args, model });
      return skipped.length ? { ...out, fellBackFrom: skipped } : out;
    } catch (e) {
      lastErr = e;
      if (!(e instanceof RetryableGeminiError)) throw e;
      console.warn(`gemini: ${model} unavailable (${e.message.slice(0, 80)}), trying next`);
      skipped.push(model);
    }
  }
  throw lastErr instanceof Error ? new Error(`All Gemini models are busy or out of free quota right now. ${lastErr.message.slice(0, 120)}`) : new Error("Gemini unavailable");
}

async function geminiOnce<T>(args: {
  system: string;
  user: string;
  images: string[];
  schema: Record<string, unknown>;
  /** override the default model (scan model picker, funnel) */
  model?: string;
  temperature?: number;
}): Promise<{ data: T; model: string; usage: unknown }> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  const modelId = args.model || GEMINI_VISION_MODEL;

  const parts: unknown[] = [{ text: args.user }];
  for (const img of args.images) {
    const { mime, b64 } = splitDataUrl(img);
    parts.push({ inline_data: { mime_type: mime, data: b64 } });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: args.system }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        response_mime_type: "application/json",
        response_json_schema: args.schema,
        temperature: args.temperature ?? 0.4,
        // Thinking tokens count against this cap on Gemini 3 (a one-word probe spent 60 on thought),
        // so leave generous room or the JSON gets cut off mid-object.
        max_output_tokens: 16000,
        // Gemini 3 thinks by default; "low" trades a little depth for a lot of latency.
        // GEMINI_THINKING_LEVEL=off omits the setting (for models that reject it).
        ...(process.env.GEMINI_THINKING_LEVEL === "off"
          ? {}
          : { thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING_LEVEL || "low" } }),
      },
    }),
  });

  const json = (await res.json()) as {
    error?: { message: string };
    modelVersion?: string;
    usageMetadata?: unknown;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (res.status === 429 || res.status === 503 || res.status === 404) throw new RetryableGeminiError(json.error?.message || `Gemini error ${res.status}`);
  if (!res.ok) throw new Error(json.error?.message || `Gemini error ${res.status}`);
  const cand = json.candidates?.[0] as { finishReason?: string; content?: { parts?: Array<{ text?: string }> } } | undefined;
  const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (cand?.finishReason === "MAX_TOKENS") throw new Error("Gemini ran out of output tokens before finishing the analysis");
  if (!text) throw new Error(`Gemini returned no text${cand?.finishReason ? ` (${cand.finishReason})` : ""}`);
  return { data: JSON.parse(text) as T, model: json.modelVersion ?? modelId, usage: json.usageMetadata };
}
