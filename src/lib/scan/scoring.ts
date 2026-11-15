import { CONCERN_BY_ID } from "@/lib/concerns";
import type { ScanResults } from "@/lib/types";

/**
 * Shared scan scoring rules (client-safe). Patient-facing marker scores run 0–100 with higher =
 * healthier: the scanner's own score, or 100 minus our concern score for the vision models.
 */

/** A marker below this is worth treating. */
export const WEAK_BELOW = 75;

/** Names for the scanner's twelve markers (named for the quality, since higher = better). */
export const MARKER_LABEL: Record<string, string> = {
  fine_lines: "Fine lines & wrinkles",
  sagging: "Firmness",
  acne: "Breakouts",
  hydration: "Hydration",
  under_eye_puffiness: "Under-eye puffiness",
  dark_circles: "Dark circles",
  under_eye_hollows: "Under-eye hollows",
  pigmentation: "Sun spots & pigment",
  dullness: "Radiance",
  redness: "Redness",
  pores: "Pores",
  texture: "Texture",
};

/** One line on what each marker measures. */
export const MARKER_ABOUT: Record<string, string> = {
  fine_lines: "Lines across the forehead, between the brows and around the eyes and mouth.",
  sagging: "How lifted and elastic the skin along the cheeks and jaw looks.",
  acne: "Active blemishes and congestion.",
  hydration: "How plump and well moisturized the skin looks.",
  under_eye_puffiness: "Swelling and bags below the eyes.",
  dark_circles: "Shadow and pigment under the eyes.",
  under_eye_hollows: "Hollowing between the lower lid and the cheek.",
  pigmentation: "Sun spots, age spots and uneven pigment.",
  dullness: "Glow and brightness.",
  redness: "Flushing, visible capillaries and irritation.",
  pores: "How visible pores are on the nose, cheeks and forehead.",
  texture: "How smooth and even the surface of the skin is.",
};

/** Our concern id -> YouCam Skin Simulation key (markers without one can't be previewed). */
export const SIM_KEY: Record<string, string> = {
  fine_lines: "wrinkle",
  texture: "texture",
  pores: "pores",
  pigmentation: "spots",
  redness: "redness",
  acne: "acne",
  dark_circles: "dark_circle",
  under_eye_puffiness: "eye_bags",
  dullness: "radiance",
};

export type Marker = { id: string; label: string; score: number; about: string; reason: string };

export function markerLabel(id: string) {
  return MARKER_LABEL[id] ?? CONCERN_BY_ID[id]?.label ?? id;
}

/** All markers, weakest first, on the higher-is-better scale. */
export function markers(results: ScanResults): Marker[] {
  return results.concerns
    .map((c) => ({ id: c.id, label: markerLabel(c.id), score: 100 - c.score, about: MARKER_ABOUT[c.id] ?? CONCERN_BY_ID[c.id]?.blurb ?? "", reason: c.reason }))
    .sort((a, b) => a.score - b.score);
}

export function weakest(results: ScanResults, n = 4) {
  return markers(results).filter((m) => m.score < WEAK_BELOW).slice(0, n);
}

export function scoreWord(score: number) {
  return score >= 85 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Fair" : "Needs care";
}

/** Bar color by score: brand when healthy, amber when worth a look, red when low. */
export function scoreColor(score: number) {
  return score >= WEAK_BELOW ? "var(--brand)" : score >= 60 ? "#E7A33C" : "#D9544A";
}

/**
 * Strengths for "Your AI preview": her five weakest markers plus her goals, each that the simulator
 * can show. Lower scores get a stronger correction; the floor keeps the change visible on a phone
 * and the ceiling keeps it believable. Nothing to work on: a gentle glow.
 */
export function previewStrengths(results: ScanResults, goals: string[] = []) {
  const ms = markers(results);
  const byId = new Map(ms.map((m) => [m.id, m]));
  const ids = [...new Set([...ms.filter((m) => m.score < WEAK_BELOW).slice(0, 5).map((m) => m.id), ...goals])];
  const sim: Record<string, number> = {};
  for (const id of ids) {
    const key = SIM_KEY[id];
    if (!key) continue;
    const score = byId.get(id)?.score ?? 70;
    sim[key] = Math.round(Math.min(0.95, Math.max(0.6, 0.45 + (100 - score) / 60)) * 100) / 100;
  }
  return Object.keys(sim).length ? sim : { radiance: 0.5 };
}
