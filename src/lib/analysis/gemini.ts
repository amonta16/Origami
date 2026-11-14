import "server-only";

/**
 * Vision analysis through the Gemini API (generateContent, JSON output).
 * Default picked by measurement on the live deployment, Sat Nov 14 2026 ~3:20 AM Pacific, via
 * GET /api/analyze?ping=1&model=...: gemini-4-hydrogen answered "ok" in 35.7 s (free-tier queue),
 * gemini-3-flash-preview in 1.0 s, gemini-flash-latest refused with "high demand". A scan sends
 * nine images and must fit a 60 s function, so the fast one wins. Override with GEMINI_VISION_MODEL.
 * Gemini's JSON-schema subset drops some keywords, so callers pass a simplified schema.
 */
export const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3-flash-preview";

function splitDataUrl(d: string) {
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(d);
  if (!m) throw new Error("Expected a base64 image data URL");
  return { mime: m[1], b64: m[2] };
}

export async function geminiStructured<T>(args: {
  system: string;
  user: string;
  images: string[];
  schema: Record<string, unknown>;
}): Promise<{ data: T; model: string; usage: unknown }> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

  const parts: unknown[] = [{ text: args.user }];
  for (const img of args.images) {
    const { mime, b64 } = splitDataUrl(img);
    parts.push({ inline_data: { mime_type: mime, data: b64 } });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: args.system }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        response_mime_type: "application/json",
        response_json_schema: args.schema,
        temperature: 0.4,
        // Thinking tokens count against this cap on Gemini 3 (a one-word probe spent 60 on thought),
        // so leave generous room or the JSON gets cut off mid-object.
        max_output_tokens: 16000,
      },
    }),
  });

  const json = (await res.json()) as {
    error?: { message: string };
    modelVersion?: string;
    usageMetadata?: unknown;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!res.ok) throw new Error(json.error?.message || `Gemini error ${res.status}`);
  const cand = json.candidates?.[0] as { finishReason?: string; content?: { parts?: Array<{ text?: string }> } } | undefined;
  const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (cand?.finishReason === "MAX_TOKENS") throw new Error("Gemini ran out of output tokens before finishing the analysis");
  if (!text) throw new Error(`Gemini returned no text${cand?.finishReason ? ` (${cand.finishReason})` : ""}`);
  return { data: JSON.parse(text) as T, model: json.modelVersion ?? GEMINI_VISION_MODEL, usage: json.usageMetadata };
}
