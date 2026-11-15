import type { TreatmentCategory, ZoneId } from "@/lib/types";

/**
 * Infers which concerns and face zones a treatment addresses from its name and description.
 * Used when a clinic's menu was built from its website (no hand-tagged concerns), so the scan can
 * still match findings to the clinic's own treatments. Vocabulary = src/lib/concerns.ts.
 */
type Rule = { re: RegExp; concerns: string[]; zones: ZoneId[] };

const FACE: ZoneId[] = ["full_face"];
const UPPER: ZoneId[] = ["forehead", "glabella", "crows_feet_left", "crows_feet_right"];
const MID: ZoneId[] = ["cheek_left", "cheek_right", "nasolabial_left", "nasolabial_right"];
const EYES: ZoneId[] = ["under_eye_left", "under_eye_right"];
const LOWER: ZoneId[] = ["jawline", "chin", "cheek_left", "cheek_right"];

const RULES: Rule[] = [
  { re: /\blip\b|\blips\b/, concerns: ["lip_volume", "lip_definition"], zones: ["lips"] },
  { re: /under[- ]?eye|tear trough/, concerns: ["under_eye_hollows", "dark_circles"], zones: EYES },
  { re: /botox|dysport|xeomin|jeuveau|daxxify|neurotoxin|neuromodulator|\btox\b|wrinkle relax/, concerns: ["forehead_lines", "frown_lines", "crows_feet", "fine_lines"], zones: UPPER },
  { re: /filler|juv[eé]derm|restylane|sculptra|radiesse|rha\b|volum/, concerns: ["volume_loss", "nasolabial_folds", "sagging"], zones: MID },
  { re: /kybella|double chin|jawline|jowl/, concerns: ["sagging"], zones: LOWER },
  { re: /ultherapy|sofwave|thermage|morpheus|tighten|lifting|skin lift|\brf\b|radio ?frequency/, concerns: ["sagging", "fine_lines"], zones: LOWER },
  { re: /microneedl|micro-needl|skinpen|\bprp\b|\bprf\b|platelet|vampire|exosome/, concerns: ["texture", "pores", "fine_lines", "acne_scars"], zones: FACE },
  { re: /\bpeel\b|chemical|vi peel|perfect derma/, concerns: ["texture", "pigmentation", "uneven_tone", "dullness", "acne"], zones: FACE },
  { re: /\bipl\b|photofacial|\bbbl\b|broadband|halo|fraxel|moxi|resurfac|clear ?\+? ?brilliant|co2|laser/, concerns: ["pigmentation", "sun_damage", "redness", "texture", "fine_lines"], zones: FACE },
  { re: /pigment|melasma|brighten|dark spot|sun ?spot/, concerns: ["pigmentation", "uneven_tone", "sun_damage"], zones: FACE },
  { re: /rosacea|redness|vascular|vein/, concerns: ["redness"], zones: FACE },
  { re: /\bacne\b|blemish|breakout/, concerns: ["acne", "acne_scars", "pores"], zones: FACE },
  // "facial" alone also appears in "facial lines" and "facial fillers", so only the treatment forms count
  { re: /hydrafacial|hydra ?facial|dermaplan|oxygen facial|signature facial|custom facial|\bfacials\b|facial treatment|jetpeel|hydrating/, concerns: ["hydration", "dullness", "texture", "pores"], zones: FACE },
  { re: /microderm|diamond glow/, concerns: ["texture", "dullness", "pores"], zones: FACE },
  { re: /\bled\b|light therapy|celluma/, concerns: ["redness", "acne", "dullness"], zones: FACE },
];

const BY_CATEGORY: Partial<Record<TreatmentCategory, string[]>> = {
  skin: ["texture", "dullness", "hydration"],
  injectables: ["fine_lines", "forehead_lines", "volume_loss"],
  laser: ["pigmentation", "texture", "redness"],
};

export function inferTreatmentTags(name: string, description?: string | null, category?: TreatmentCategory | null): { concerns: string[]; zones: ZoneId[] } {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  const concerns: string[] = [];
  const zones: ZoneId[] = [];
  // Drips, shots and other wellness items share words with skin care ("hydration") but don't treat the face.
  if (/\biv\b|intravenous|\bdrip\b|infusion|vitamin shot|\bb12\b|weight loss|semaglutide|tirzepatide|hormone|massage|\bhair\b|scalp|body contour|accufit|emsculpt|coolsculpt|cellulite|laser hair/.test(text)) return { concerns, zones };
  for (const r of RULES) {
    if (!r.re.test(text)) continue;
    for (const c of r.concerns) if (!concerns.includes(c)) concerns.push(c);
    for (const z of r.zones) if (!zones.includes(z)) zones.push(z);
  }
  if (!concerns.length && category && BY_CATEGORY[category]) {
    concerns.push(...BY_CATEGORY[category]!);
    zones.push("full_face");
  }
  return { concerns, zones };
}
