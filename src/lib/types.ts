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

export type SimProvider = "gemini" | "fal" | "openai";

export type SimKind =
  | "neurotoxin"
  | "lip_filler"
  | "under_eye_filler"
  | "cheek_filler"
  | "resurfacing"
  | "tone"
  | "glow";
