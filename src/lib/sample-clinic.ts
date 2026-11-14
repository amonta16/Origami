import type { Clinic, Treatment } from "./types";

/**
 * The sample clinic, mirrored from supabase/migrations/20261114000200_seed_sample_clinic.sql.
 * Used when Supabase isn't configured (local dev before the project exists) and as the
 * always-available demo. Labeled "Sample clinic" in the UI; excluded from proof counts.
 */
export const SAMPLE_CLINIC: Clinic = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "sample",
  name: "Sample Aesthetics",
  logo_url: null,
  brand_color: "#92191c",
  phone: "(805) 555-0100",
  // a public intersection, not a business address (migration 20261114000700)
  address: "State St & Canon Perdido St, Santa Barbara, CA 93101",
  city: "Santa Barbara",
  website: "https://example.com",
  booking_url: "https://example.com/book",
  is_sample: true,
  is_preview: false,
  first_visit_credit_cents: null,
  referral_credit_cents: null,
};

const T = (
  n: number,
  name: string,
  description: string,
  price: number,
  member: number,
  concerns: string[],
  zones: string[],
  result_days: number,
): Treatment => ({
  id: `00000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`,
  clinic_id: SAMPLE_CLINIC.id,
  name,
  description,
  price_cents: price,
  member_price_cents: member,
  concerns,
  zones,
  result_days,
  booking_url: null,
  sort: n,
  active: true,
});

export const SAMPLE_TREATMENTS: Treatment[] = [
  T(1, "Neurotoxin (Botox / Dysport)", "Relaxes the muscles that fold the skin, softening forehead lines, frown lines and crow's feet. Results show in 5 to 14 days.", 48000, 42000, ["forehead_lines", "frown_lines", "crows_feet"], ["forehead", "glabella", "crows_feet_left", "crows_feet_right"], 100),
  T(2, "Lip filler", "Hyaluronic acid filler for volume, definition and symmetry. Subtle to full, your call.", 75000, 67500, ["lip_volume", "lip_definition"], ["lips"], 270),
  T(3, "Under-eye filler", "Fills the tear trough to soften hollows and the shadows that read as dark circles.", 90000, 81000, ["dark_circles", "under_eye_hollows"], ["under_eye_left", "under_eye_right"], 365),
  T(4, "Cheek filler", "Restores mid-face volume and lift, which also softens nasolabial folds.", 95000, 85500, ["volume_loss", "sagging", "nasolabial_folds"], ["cheek_left", "cheek_right"], 450),
  T(5, "Microneedling", "Tiny controlled channels trigger collagen. Improves texture, pores, fine lines and acne scars over a series.", 35000, 29500, ["texture", "pores", "fine_lines", "acne_scars"], ["full_face"], 45),
  T(6, "Chemical peel", "Medical-grade peel for uneven tone, dullness, sun damage and breakouts. Light peeling for 3 to 5 days.", 22500, 19000, ["pigmentation", "uneven_tone", "dullness", "acne"], ["full_face"], 35),
  T(7, "IPL photofacial", "Light-based treatment for sun spots, redness and broken capillaries. Best in a series of three.", 45000, 38000, ["pigmentation", "redness", "sun_damage"], ["full_face"], 365),
  T(8, "Laser resurfacing", "Fractional laser for deeper lines, texture and scarring. A week of downtime, months of results.", 150000, 135000, ["fine_lines", "texture", "acne_scars", "pigmentation"], ["full_face"], 540),
  T(9, "Signature hydrating facial", "Deep cleanse, gentle exfoliation, extractions and a hydration infusion. Glow for the week, no downtime.", 22500, 18500, ["hydration", "dullness", "pores"], ["full_face"], 30),
  T(10, "Medical-grade skincare plan", "A prescription-strength routine (retinoid, antioxidant, SPF) chosen from your scan. Refills every 90 days.", 18000, 15000, ["uneven_tone", "fine_lines", "acne", "dullness"], ["full_face"], 90),
];
