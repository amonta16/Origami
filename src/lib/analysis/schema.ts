import { CONCERN_IDS, ZONE_IDS } from "@/lib/concerns";

/** Strict JSON schema for the vision model's output. Mirrors ScanResults. */
export function analysisSchema(treatmentIds: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["overall_score", "potential_score", "skin_age", "insight", "concerns", "recommendations", "medical_flag"],
    properties: {
      overall_score: { type: "integer", minimum: 0, maximum: 100, description: "Overall cosmetic skin score now. 100 = flawless for her age group." },
      potential_score: { type: "integer", minimum: 0, maximum: 100, description: "Realistic score after the recommended plan. Always >= overall_score." },
      skin_age: { type: ["integer", "null"], minimum: 16, maximum: 90, description: "Estimated cosmetic skin age in years, or null if unsure." },
      insight: { type: "string", description: "Two warm, specific sentences for her. Use her first name if given. No medical claims." },
      concerns: {
        type: "array",
        minItems: 6,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "zone", "score", "severity", "reason"],
          properties: {
            id: { type: "string", enum: CONCERN_IDS },
            zone: { type: "string", enum: ZONE_IDS },
            score: { type: "integer", minimum: 0, maximum: 100, description: "0 = not present, 100 = pronounced." },
            severity: { type: "string", enum: ["none", "mild", "moderate", "pronounced"] },
            reason: { type: "string", description: "One short sentence on what you see, in plain words." },
          },
        },
      },
      recommendations: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["treatment_id", "why"],
          properties: {
            treatment_id: { type: "string", enum: treatmentIds.length ? treatmentIds : ["none"] },
            why: { type: "string", description: "One sentence: why this is relevant to her, using her actual concerns." },
          },
        },
      },
      medical_flag: {
        type: ["string", "null"],
        description: "If anything looks like it needs a doctor (asymmetric or changing mole, lesion, infection), say what and that a dermatologist should look. Otherwise null.",
      },
    },
  } as const;
}
