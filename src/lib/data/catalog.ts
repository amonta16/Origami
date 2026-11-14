import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { MembershipPlan, Patient, Product, Reward } from "@/lib/types";

/** Shop items, plans and rewards for a clinic. Empty when Supabase isn't configured. */
export async function getProducts(clinicId: string): Promise<Product[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("products")
    .select("id, clinic_id, kind, name, description, price_cents, member_price_cents, sessions, image_url, sort")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("sort");
  if (error) throw error;
  return (data as Product[]) ?? [];
}

export async function getPlans(clinicId: string): Promise<MembershipPlan[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("membership_plans")
    .select("id, clinic_id, name, tagline, monthly_price_cents, perks, member_discount_pct, monthly_points, sort")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("sort");
  if (error) throw error;
  return (data as MembershipPlan[]) ?? [];
}

export async function getRewards(clinicId: string): Promise<Reward[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("rewards")
    .select("id, clinic_id, name, description, points_cost, image_url, sort")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("points_cost");
  if (error) throw error;
  return (data as Reward[]) ?? [];
}

export async function getPlan(clinicId: string, id: string): Promise<(MembershipPlan & { is_example?: boolean }) | null> {
  const sb = supabaseAdmin();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await sb
    .from("membership_plans")
    .select("id, clinic_id, name, tagline, monthly_price_cents, perks, member_discount_pct, monthly_points, sort, is_example")
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .maybeSingle();
  return (data as (MembershipPlan & { is_example?: boolean }) | null) ?? null;
}

/** Full patient view for the app, or null if the lead is gone. */
export async function getPatient(clinicId: string, leadId: string): Promise<Patient | null> {
  const sb = supabaseAdmin();
  if (!sb) return null;
  const [lead, ledger, redemptions, requests] = await Promise.all([
    sb
      .from("leads")
      .select("id, first_name, phone, checkin_code, notifications, membership_plan_id, membership_plans(id, clinic_id, name, tagline, monthly_price_cents, perks, member_discount_pct, monthly_points, sort)")
      .eq("id", leadId)
      .eq("clinic_id", clinicId)
      .maybeSingle(),
    sb.from("points_ledger").select("delta").eq("lead_id", leadId),
    sb
      .from("reward_redemptions")
      .select("id, reward_name, points_spent, code, used_at, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    sb
      .from("purchase_requests")
      .select("id, kind, item_name, price_cents, status, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
  ]);
  if (lead.error) throw lead.error;
  if (!lead.data) return null;
  const row = lead.data as unknown as {
    id: string;
    first_name: string | null;
    phone: string | null;
    checkin_code: string | null;
    notifications: boolean;
    membership_plans: MembershipPlan | MembershipPlan[] | null;
  };
  const plan = Array.isArray(row.membership_plans) ? row.membership_plans[0] ?? null : row.membership_plans;
  return {
    id: row.id,
    first_name: row.first_name,
    phone: row.phone,
    checkin_code: row.checkin_code,
    notifications: row.notifications,
    plan,
    points: (ledger.data ?? []).reduce((s, r: { delta: number }) => s + r.delta, 0),
    redemptions: (redemptions.data as Patient["redemptions"]) ?? [],
    requests: (requests.data as Patient["requests"]) ?? [],
  };
}
