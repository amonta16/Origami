import type { SimKind, Treatment, ZoneId } from "./types";

export type ConcernDef = {
  id: string;
  label: string;
  zones: ZoneId[];
  blurb: string;
};

/** The concerns the analysis can report. Ids match the sample treatment menu. */
export const CONCERNS: ConcernDef[] = [
  { id: "forehead_lines", label: "Forehead lines", zones: ["forehead"], blurb: "Horizontal lines from raising the brows." },
  { id: "frown_lines", label: "Frown lines", zones: ["glabella"], blurb: "Vertical lines between the brows." },
  { id: "crows_feet", label: "Crow's feet", zones: ["crows_feet_left", "crows_feet_right"], blurb: "Fine lines fanning from the outer eyes." },
  { id: "dark_circles", label: "Dark circles", zones: ["under_eye_left", "under_eye_right"], blurb: "Shadow and pigment under the eyes." },
  { id: "under_eye_hollows", label: "Under-eye hollows", zones: ["under_eye_left", "under_eye_right"], blurb: "Volume loss in the tear trough." },
  { id: "under_eye_puffiness", label: "Under-eye puffiness", zones: ["under_eye_left", "under_eye_right"], blurb: "Swelling below the lower lid." },
  { id: "fine_lines", label: "Fine lines", zones: ["full_face"], blurb: "Early lines across the face." },
  { id: "volume_loss", label: "Volume loss", zones: ["cheek_left", "cheek_right"], blurb: "Flattening of the mid-face." },
  { id: "sagging", label: "Sagging", zones: ["jawline", "cheek_left", "cheek_right"], blurb: "Softening along the jaw and cheeks." },
  { id: "nasolabial_folds", label: "Smile lines", zones: ["nasolabial_left", "nasolabial_right"], blurb: "Folds from nose to mouth corners." },
  { id: "lip_volume", label: "Lip volume", zones: ["lips"], blurb: "Thinness of the lips." },
  { id: "lip_definition", label: "Lip definition", zones: ["lips"], blurb: "Softness of the lip border." },
  { id: "pigmentation", label: "Sun spots", zones: ["full_face"], blurb: "Brown spots and patches." },
  { id: "uneven_tone", label: "Uneven tone", zones: ["full_face"], blurb: "Patchy color across the face." },
  { id: "redness", label: "Redness", zones: ["cheek_left", "cheek_right", "nose"], blurb: "Flushing or visible capillaries." },
  { id: "pores", label: "Pores", zones: ["nose", "cheek_left", "cheek_right"], blurb: "Visible enlarged pores." },
  { id: "texture", label: "Texture", zones: ["full_face"], blurb: "Roughness or unevenness of the surface." },
  { id: "acne", label: "Breakouts", zones: ["full_face"], blurb: "Active blemishes." },
  { id: "acne_scars", label: "Acne scars", zones: ["cheek_left", "cheek_right"], blurb: "Marks left after breakouts." },
  { id: "dullness", label: "Dullness", zones: ["full_face"], blurb: "Lack of glow." },
  { id: "hydration", label: "Dehydration", zones: ["full_face"], blurb: "Tightness and fine crinkling from dry skin." },
  { id: "sun_damage", label: "Sun damage", zones: ["full_face"], blurb: "Cumulative UV changes." },
];

export const CONCERN_IDS = CONCERNS.map((c) => c.id);
export const CONCERN_BY_ID = Object.fromEntries(CONCERNS.map((c) => [c.id, c])) as Record<string, ConcernDef>;

export const ZONE_IDS: ZoneId[] = [
  "forehead",
  "glabella",
  "crows_feet_left",
  "crows_feet_right",
  "under_eye_left",
  "under_eye_right",
  "cheek_left",
  "cheek_right",
  "nasolabial_left",
  "nasolabial_right",
  "nose",
  "lips",
  "chin",
  "jawline",
  "full_face",
];

export const ZONE_LABEL: Record<ZoneId, string> = {
  forehead: "Forehead",
  glabella: "Between the brows",
  crows_feet_left: "Left crow's feet",
  crows_feet_right: "Right crow's feet",
  under_eye_left: "Left under-eye",
  under_eye_right: "Right under-eye",
  cheek_left: "Left cheek",
  cheek_right: "Right cheek",
  nasolabial_left: "Left smile line",
  nasolabial_right: "Right smile line",
  nose: "Nose",
  lips: "Lips",
  chin: "Chin",
  jawline: "Jawline",
  full_face: "Whole face",
};

/** Which kind of simulation a treatment implies, from its zones and concerns. */
export function simKindFor(t: Pick<Treatment, "zones" | "concerns">): SimKind {
  const z = new Set(t.zones);
  const c = new Set(t.concerns);
  if (z.has("lips")) return "lip_filler";
  if (z.has("under_eye_left") || z.has("under_eye_right")) return "under_eye_filler";
  if (z.has("cheek_left") || z.has("cheek_right")) return "cheek_filler";
  if (z.has("forehead") || z.has("glabella") || z.has("crows_feet_left")) return "neurotoxin";
  if (c.has("pigmentation") || c.has("redness") || c.has("sun_damage") || c.has("uneven_tone")) return "tone";
  if (c.has("texture") || c.has("pores") || c.has("acne_scars") || c.has("fine_lines")) return "resurfacing";
  return "glow";
}

/** Zones the simulation is allowed to change, per kind. */
export const SIM_ZONES: Record<SimKind, ZoneId[]> = {
  scan: ["full_face"],
  neurotoxin: ["forehead", "glabella", "crows_feet_left", "crows_feet_right"],
  lip_filler: ["lips"],
  under_eye_filler: ["under_eye_left", "under_eye_right"],
  cheek_filler: ["cheek_left", "cheek_right", "nasolabial_left", "nasolabial_right"],
  resurfacing: ["full_face"],
  tone: ["full_face"],
  glow: ["full_face"],
};

export function severityFromScore(score: number) {
  if (score < 15) return "none" as const;
  if (score < 40) return "mild" as const;
  if (score < 70) return "moderate" as const;
  return "pronounced" as const;
}
