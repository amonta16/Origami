export type Clinic = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  booking_url: string | null;
  is_sample: boolean;
  is_preview: boolean;
  first_visit_credit_cents: number | null;
  referral_credit_cents: number | null;
  /** patient app (migration 0300); optional so the in-code sample fallback stays valid */
  hero_photo_url?: string | null;
  welcome_points?: number;
  visit_points?: number;
  referral_points?: number;
  scan_points?: number;
  points_per_dollar?: number;
  /** owner funnel (migration 0450) */
  about?: string | null;
  city?: string | null;
  source_url?: string | null;
  built_at?: string | null;
  /** desk switches (migration 0500): journey on/off and each automated offer's gift and note */
  settings?: { scan_enabled?: boolean; journey?: Record<string, boolean>; offers?: Record<string, { gift?: string; note?: string }> } | null;
};

export type TreatmentCategory = "injectables" | "skin" | "laser" | "body" | "wellness" | "consult";

export type Product = {
  id: string;
  clinic_id: string;
  kind: "package" | "skincare" | "gift_card";
  name: string;
  description: string | null;
  price_cents: number | null;
  member_price_cents: number | null;
  sessions: number | null;
  image_url: string | null;
  sort: number;
};

export type MembershipPlan = {
  id: string;
  clinic_id: string;
  name: string;
  tagline: string | null;
  monthly_price_cents: number;
  perks: string[];
  member_discount_pct: number;
  monthly_points: number;
  sort: number;
};

export type Reward = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
  sort: number;
};

export type Redemption = {
  id: string;
  reward_name: string;
  points_spent: number;
  code: string;
  used_at: string | null;
  created_at: string;
};

export type PurchaseRequest = {
  id: string;
  kind: "treatment" | "product" | "membership";
  item_name: string;
  price_cents: number | null;
  status: "requested" | "confirmed" | "cancelled";
  created_at: string;
};

/** The signed-in patient as the patient app sees them. */
export type Patient = {
  id: string;
  first_name: string | null;
  phone: string | null;
  checkin_code: string | null;
  points: number;
  plan: MembershipPlan | null;
  notifications: boolean;
  redemptions: Redemption[];
  requests: PurchaseRequest[];
};

export type Treatment = {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  member_price_cents: number | null;
  concerns: string[];
  zones: string[];
  result_days: number | null;
  booking_url: string | null;
  sort: number;
  active: boolean;
  category?: TreatmentCategory;
  duration_min?: number | null;
  image_url?: string | null;
  popular?: boolean;
  /** set by withStockPhotos: the photo is a stock stand-in, or a stock backup for a failed load */
  image_is_stock?: boolean;
  image_fallback?: string;
};

/** Zone ids used for landmarks, masks, heat maps and treatment matching. */
export type ZoneId =
  | "forehead"
  | "glabella"
  | "crows_feet_left"
  | "crows_feet_right"
  | "under_eye_left"
  | "under_eye_right"
  | "cheek_left"
  | "cheek_right"
  | "nasolabial_left"
  | "nasolabial_right"
  | "nose"
  | "lips"
  | "chin"
  | "jawline"
  | "full_face";

export type Severity = "none" | "mild" | "moderate" | "pronounced";

export type ConcernResult = {
  id: string; // concern id from concerns.ts
  zone: ZoneId;
  severity: Severity;
  score: number; // 0 (not present) .. 100 (pronounced)
  reason: string;
};

export type Recommendation = {
  treatment_id: string;
  why: string;
};

export type ScanResults = {
  overall_score: number; // "Now" 0..100, higher is better
  potential_score: number; // after the recommended plan
  skin_age: number | null;
  insight: string;
  concerns: ConcernResult[];
  recommendations: Recommendation[];
  medical_flag: string | null;
  provider: string;
  model: string;
  disclaimer: string;
  /** Per-concern overlay images from the scanner (YouCam masks), aligned to the analyzed photo. Short-lived URLs. */
  overlays?: Array<{ id: string; url: string }>;
};

export type Landmark = { x: number; y: number; z: number };

export type CaptureQuality = {
  centered: boolean;
  sized: boolean;
  angled: boolean;
  eyesOpen: boolean;
  lit: boolean;
  still: boolean;
  yaw: number;
  pitch: number;
  roll: number;
  brightness: number;
  faceHeightRatio: number;
};

/** What the capture step hands to the rest of the flow. */
export type Capture = {
  /** Full-resolution JPEG data URL (true orientation, not mirrored). */
  photo: string;
  width: number;
  height: number;
  landmarks: Landmark[]; // 478 normalized points
  blendshapes: Record<string, number>;
  quality: CaptureQuality | null;
  source: "camera" | "upload";
};

export type SimProvider = "youcam" | "gemini" | "fal" | "openai";

export type SimKind =
  | "neurotoxin"
  | "lip_filler"
  | "under_eye_filler"
  | "cheek_filler"
  | "resurfacing"
  | "tone"
  | "glow";
