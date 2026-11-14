import type { Clinic, TreatmentCategory } from "@/lib/types";

/** Desk-only settings stored in clinics.settings (migration 20261114000500_desk.sql). */
export type DeskSettings = {
  scan_enabled?: boolean;
  journey?: Record<string, boolean>;
};

/** Clinic row as the desk reads it. `settings` is undefined until the desk migration runs. */
export type DeskClinic = Clinic & { settings?: DeskSettings | null };

export type DeskTreatment = {
  id: string;
  name: string;
  description: string | null;
  category: TreatmentCategory | null;
  duration_min: number | null;
  price_cents: number | null;
  member_price_cents: number | null;
  result_days: number | null;
  popular: boolean | null;
  active: boolean;
  sort: number;
};

export type DeskProduct = {
  id: string;
  kind: "package" | "skincare" | "gift_card";
  name: string;
  description: string | null;
  price_cents: number | null;
  member_price_cents: number | null;
  sessions: number | null;
  image_url: string | null;
  active: boolean;
  sort: number;
};

export type DeskPlan = {
  id: string;
  name: string;
  tagline: string | null;
  monthly_price_cents: number;
  perks: string[];
  member_discount_pct: number;
  monthly_points: number;
  active: boolean;
  sort: number;
};

export type DeskReward = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
  active: boolean;
  sort: number;
};

/** One patient row in lists. */
export type LeadSummary = {
  id: string;
  name: string;
  phone_masked: string;
  checkin_code: string | null;
  points: number;
  plan_name: string | null;
  last_visit_at: string | null;
  created_at: string;
};

/** The full patient panel at the desk. */
export type LeadDetail = LeadSummary & {
  member_since: string | null;
  ledger: Array<{ id: string; delta: number; reason: string; created_at: string }>;
  visits: Array<{ id: string; treatment_name: string | null; status: string; visit_at: string | null; next_due_at: string | null }>;
  requests: Array<{ id: string; kind: string; item_name: string; price_cents: number | null; status: string; created_at: string }>;
  redemptions: Array<{ id: string; reward_name: string; points_spent: number; code: string; used_at: string | null; created_at: string }>;
  latest_scan: { created_at: string; overall_score: number | null } | null;
};

export type OrderRow = {
  id: string;
  kind: "treatment" | "product" | "membership";
  item_name: string;
  price_cents: number | null;
  status: "requested" | "confirmed" | "cancelled";
  note: string | null;
  created_at: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
};

export type DueRow = {
  key: string;
  lead_id: string;
  first_name: string | null;
  name: string;
  phone_masked: string;
  treatment_name: string;
  visit_at: string | null;
  next_due_at: string;
  days_until: number; // negative = overdue
};
