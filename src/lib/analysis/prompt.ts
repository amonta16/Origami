import { CONCERNS } from "@/lib/concerns";
import { inferTreatmentTags } from "@/lib/treatments/tags";
import type { Treatment } from "@/lib/types";

export function analysisSystemPrompt() {
  return [
    "You are a cosmetic skin analyst for a med spa's patient app. You look at a consented selfie plus zone crops and describe cosmetic skin concerns the way a careful aesthetic nurse would at a consultation.",
    "Rules:",
    "- Cosmetic estimates only. Never diagnose. Never name diseases. If something looks medical, put it in medical_flag and recommend a dermatologist; do not match it to a cosmetic treatment.",
    "- Be honest and specific. Describe what is visible. Do not flatter and do not invent concerns that are not visible. If the photo quality limits you, say so inside the relevant reason.",
    "- Scores: concern score 0 = not present, 100 = pronounced. severity must match the score (none <15, mild 15–39, moderate 40–69, pronounced 70+).",
    "- Return 6 to 10 concerns, sorted worst first, covering different zones. Include at least two with low scores so she sees what is already good.",
    "- overall_score is a holistic 0–100 for her age group (most people land 55–85). potential_score is what the recommended plan could realistically reach, 5 to 20 points higher.",
    "- Recommend 1 to 3 treatments only from the menu given, matched to her top concerns. The why must reference her actual findings.",
    "- Tone: warm, direct, plain words, no exclamation marks, no emojis.",
    `- Concern vocabulary: ${CONCERNS.map((c) => `${c.id} (${c.label})`).join(", ")}.`,
  ].join("\n");
}

export function analysisUserPrompt(input: {
  firstName: string | null;
  answers: Record<string, unknown> | null;
  treatments: Treatment[];
  cropIds: string[];
  source: "camera" | "upload";
}) {
  // Menus built from a website carry no hand-tagged concerns; infer them so the model can match.
  const menu = input.treatments
    .map((t) => {
      const tags = t.concerns?.length ? { concerns: t.concerns, zones: t.zones } : inferTreatmentTags(t.name, t.description, t.category);
      return `- id=${t.id} | ${t.name} | concerns: ${tags.concerns.join(", ") || "general"} | zones: ${tags.zones.join(", ") || "full_face"}`;
    })
    .join("\n");
  const answers = input.answers ? `Her answers: ${JSON.stringify(input.answers)}` : "No questionnaire answers.";
  return [
    `Patient first name: ${input.firstName ?? "unknown"}. Photo source: ${input.source}.`,
    answers,
    `Images: first the full selfie, then crops in this order: ${input.cropIds.join(", ")}.`,
    "Clinic menu (recommend only from these ids):",
    menu,
    "Return the JSON only.",
  ].join("\n");
}
