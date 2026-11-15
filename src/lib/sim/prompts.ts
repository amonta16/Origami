import type { SimKind } from "@/lib/types";

/**
 * Treatment-specific edit prompts. We ask the model for the FULL, clearly visible
 * result of a well-done treatment; the dose slider blends it back toward the
 * original, so "Subtle" is always available without a second render. Our mask
 * decides which pixels survive compositing, so the prompt's job is a convincing
 * change inside the zone and an untouched face everywhere else.
 */
const KEEP =
  "This must remain the exact same person: identical face shape, eyes, nose, mouth, bone structure, skin tone, freckles, moles, pores, hair, expression, head angle, lighting, white balance, clothing and background. No beauty filter, no airbrushing, no smoothing outside the treated area, no reshaping of anything not named. Output a photorealistic, unretouched phone photo at the same framing and resolution.";

export const SIM_PROMPTS: Record<SimKind, { label: string; prompt: string }> = {
  scan: {
    label: "Your AI preview (weakest areas from the scan)",
    prompt: `Edit this photo to show the skin after a well-planned course of med spa treatments: fine lines softer, texture smoother, pores finer, sun spots and redness faded, under-eyes brighter and less puffy, and a healthy natural glow, with real pores and texture still visible and no filter look. ${KEEP}`,
  },
  neurotoxin: {
    label: "Neurotoxin (forehead, frown lines, crow's feet)",
    prompt: `Edit this photo to show the full result two weeks after a well-done neurotoxin treatment of the upper face. The horizontal forehead lines, the vertical frown lines between the eyebrows and the crow's feet at the outer corners of the eyes are clearly smoothed and nearly gone; the skin there looks rested and even but still has real pores and fine texture, not plastic. Brow position and eye shape stay natural. ${KEEP}`,
  },
  lip_filler: {
    label: "Lip filler",
    prompt: `Edit this photo to show the full result of a well-done hyaluronic acid lip filler: the upper and lower lips are noticeably fuller and more hydrated, the cupid's bow and vermilion border are crisper, the lips are symmetric and softly projected, with no duck shape, no change in lip color, and natural lip lines still visible. ${KEEP}`,
  },
  under_eye_filler: {
    label: "Under-eye filler",
    prompt: `Edit this photo to show the full result of a well-done tear-trough filler: the hollows under both eyes are filled and smooth, the dark shadows are clearly lighter, the transition from lower lid to cheek is seamless, with the eyes themselves, eyelashes and eye shape unchanged. ${KEEP}`,
  },
  cheek_filler: {
    label: "Cheek filler",
    prompt: `Edit this photo to show the full result of a well-done cheek filler: the cheekbones are visibly fuller and gently lifted, the mid-face looks restored and youthful, and the nasolabial folds are clearly softer, with no change to the eyes, nose, lips, chin or jaw outline. ${KEEP}`,
  },
  resurfacing: {
    label: "Resurfacing (microneedling, laser)",
    prompt: `Edit this photo to show the skin three months after a full series of microneedling or fractional laser resurfacing: pores visibly tighter, texture clearly smoother and more even, fine lines and acne scars markedly reduced, with the skin still looking like real skin under phone-camera light (visible pores, natural sheen), never blurred or airbrushed. ${KEEP}`,
  },
  tone: {
    label: "Tone (peel, IPL)",
    prompt: `Edit this photo to show the skin six weeks after a full series of chemical peels or IPL photofacials: sun spots and brown patches clearly faded, redness and visible capillaries clearly reduced, overall tone even and bright. Every mole and freckle stays exactly where it is, only lighter if it is sun damage; texture and pores unchanged. ${KEEP}`,
  },
  glow: {
    label: "Glow (facial, skincare)",
    prompt: `Edit this photo to show the skin one week after a professional hydrating medical facial and a prescription skincare routine: visibly better hydrated and plumper, brighter and calmer, with a healthy natural glow and more even tone, pores and texture fully intact and no filter look. ${KEEP}`,
  },
};

/** Strength words shown on the dose slider; the number is the blend amount. */
export const DOSES = [
  { label: "Subtle", value: 0.4 },
  { label: "Natural", value: 0.7 },
  { label: "Full", value: 1 },
] as const;
