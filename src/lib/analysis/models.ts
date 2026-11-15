/**
 * Models testers can pick on the results screen. Client-safe (no keys).
 * Gemini ids verified against this key's model list on Nov 14 2026; latency measured on a
 * one-word prompt. Each Gemini model has its own small free daily quota.
 */
export type AnalysisProvider = "youcam" | "gemini" | "openai";
export type AnalysisModel = { id: string; provider: AnalysisProvider; label: string; note: string };

export const ANALYSIS_MODELS: AnalysisModel[] = [
  // Perfect Corp's skin-analysis engine: measured concern scores plus zone masks. Default when its key is set.
  { id: "youcam-skin-v2", provider: "youcam", label: "YouCam", note: "Default · Perfect Corp skin-analysis engine, measured scores" },
  { id: "gemini-3.5-flash", provider: "gemini", label: "Gemini 3.5 Flash", note: "Vision model · balanced" },
  { id: "gemini-3-flash-preview", provider: "gemini", label: "Gemini 3 Flash", note: "Previous default" },
  { id: "gemini-3.1-pro-preview", provider: "gemini", label: "Gemini 3.1 Pro", note: "Most careful · slow" },
  { id: "gemini-3.5-flash-lite", provider: "gemini", label: "Gemini 3.5 Flash Lite", note: "Fastest" },
  { id: "gemini-3.1-flash-lite", provider: "gemini", label: "Gemini 3.1 Flash Lite", note: "Fast · older" },
  { id: "gpt-6.1-terra", provider: "openai", label: "GPT-6.1 Terra", note: "OpenAI · needs credits" },
];

export const SIM_PROVIDER_LABEL: Record<"youcam" | "gemini" | "fal" | "openai", string> = {
  youcam: "YouCam",
  gemini: "Nano Banana",
  fal: "FLUX Kontext",
  openai: "GPT Image 2.5",
};

export function analysisModel(id: string | null | undefined) {
  return ANALYSIS_MODELS.find((m) => m.id === id) ?? null;
}
