import type { SimKind } from "@/lib/types";

/**
 * Conservative, treatment-specific edit prompts. The model only ever sees the whole
 * photo; our mask decides which pixels survive compositing, so the prompt's job is a
 * believable change inside the zone and nothing anywhere else.
 */
const KEEP =
  "Keep the exact same person, identity, face shape, pores, skin texture, freckles, lighting, white balance, expression, hair, clothes and background. Do not retouch or smooth skin outside the treated area. Photorealistic, unretouched phone photo, same framing and resolution.";

export const SIM_PROMPTS: Record<SimKind, { label: string; prompt: string }> = {
  neurotoxin: {
    label: "Neurotoxin (forehead, frown lines, crow's feet)",
    prompt: `Soften the horizontal forehead lines, the vertical lines between the eyebrows and the crow's feet by about 50 percent, as two weeks after a conservative neurotoxin treatment. Lines fade and skin looks rested; keep natural pores and texture. ${KEEP}`,
  },
  lip_filler: {
    label: "Lip filler",
    prompt: `Add modest, natural volume to the lips as after a conservative hyaluronic acid lip filler: slightly fuller upper and lower lip, a crisper vermilion border, better symmetry, no duck shape, no color change. ${KEEP}`,
  },
  under_eye_filler: {
    label: "Under-eye filler",
    prompt: `Reduce the hollowness and shadow under the eyes as after a conservative tear-trough filler: the under-eye area looks smoother and less sunken, dark circles lighter, no change to the eyes themselves. ${KEEP}`,
  },
  cheek_filler: {
    label: "Cheek filler",
    prompt: `Restore subtle mid-face volume as after a conservative cheek filler: slightly fuller, lifted cheekbones and softer nasolabial folds, no change to the eyes, nose, lips or jaw. ${KEEP}`,
  },
  resurfacing: {
    label: "Resurfacing (microneedling, laser)",
    prompt: `Show the skin three months after a series of microneedling or fractional laser: finer pores, smoother texture, softer fine lines and acne scars, more even surface. Skin must still look like real skin with visible pores, not blurred or airbrushed. ${KEEP}`,
  },
  tone: {
    label: "Tone (peel, IPL)",
    prompt: `Show the skin six weeks after a chemical peel or IPL photofacial: sun spots and brown patches lighter, redness and visible capillaries reduced, more even tone. Texture, pores, moles and freckle placement stay exactly where they are. ${KEEP}`,
  },
  glow: {
    label: "Glow (facial, skincare)",
    prompt: `Show the skin a week after a hydrating medical facial: better hydrated, slightly brighter, calmer, with a healthy natural glow. No smoothing, no filter look, pores and texture intact. ${KEEP}`,
  },
};

/** Strength words shown on the dose slider; the number is the blend amount. */
export const DOSES = [
  { label: "Subtle", value: 0.45 },
  { label: "Natural", value: 0.75 },
  { label: "Full", value: 1 },
] as const;
