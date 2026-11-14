import "server-only";

/**
 * Vision analysis through the OpenAI Responses API with a strict JSON schema.
 * Model id is env-overridable; default is set from the provider docs at build time.
 */
// gpt-6.1-terra: vision + structured outputs, $1 / $5 per 1M tokens (docs checked Nov 14, 2026).
export const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-6.1-terra";

export async function openaiStructured<T>(args: {
  system: string;
  user: string;
  images: string[]; // data URLs
  schemaName: string;
  schema: Record<string, unknown>;
  model?: string;
}): Promise<{ data: T; model: string; usage: unknown }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: args.model || OPENAI_VISION_MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: args.system }] },
        {
          role: "user",
          content: [
            { type: "input_text", text: args.user },
            ...args.images.map((url) => ({ type: "input_image", image_url: url, detail: "high" })),
          ],
        },
      ],
      text: {
        format: { type: "json_schema", name: args.schemaName, strict: true, schema: args.schema },
      },
      max_output_tokens: 2500,
    }),
  });

  const json = (await res.json()) as {
    error?: { message: string };
    model?: string;
    usage?: unknown;
    output_text?: string;
    output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  };
  if (!res.ok) throw new Error(json.error?.message || `OpenAI error ${res.status}`);

  let text = json.output_text;
  if (!text) {
    const msg = json.output?.find((o) => o.type === "message");
    text = msg?.content?.find((c) => c.type === "output_text")?.text;
  }
  if (!text) throw new Error("OpenAI returned no text");
  return { data: JSON.parse(text) as T, model: json.model ?? OPENAI_VISION_MODEL, usage: json.usage };
}
