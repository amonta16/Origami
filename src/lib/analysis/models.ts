/**
 * Models testers can pick on the results screen. Client-safe (no keys).
 * Gemini ids verified against this key's model list on Nov 14 2026; latency measured on a
 * one-word prompt. Each Gemini model has its own small free daily quota.
 */
export type AnalysisModel = { id: string; provider: "gemini" | "openai"; label: string; note: string };

export const ANALYSIS_MODELS: AnalysisModel[] = [
  { id: "gemini-3.5-flash", provider: "gemini", label: "Gemini 3.5 Flash", note: "Default · balanced" },
  { id: "gemini-3-flash-preview", provider: "gemini", label: "Gemini 3 Flash", note: "Previous default" },
  { id: "gemini-3.1-pro-preview", provider: "gemini", label: "Gemini 3.1 Pro", note: "Most careful · slow" },
  { id: "gemini-3.5-flash-lite", provider: "gemini", label: "Gemini 3.5 Flash Lite", note: "Fastest" },
  { id: "gemini-3.1-flash-lite", provider: "gemini", label: "Gemini 3.1 Flash Lite", note: "Fast · older" },
  { id: "gpt-6.1-terra", provider: "openai", label: "GPT-6.1 Terra", note: "OpenAI · needs credits" },
];

export const SIM_PROVIDER_LABEL: Record<"gemini" | "fal" | "openai", string> = {
  gemini: "Nano Banana",
  fal: "FLUX Kontext",
  openai: "GPT Image 2.5",
};

export function analysisModel(id: string | null | undefined) {
  return ANALYSIS_MODELS.find((m) => m.id === id) ?? null;
}
