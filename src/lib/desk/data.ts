import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CONCERN_BY_ID } from "@/lib/concerns";
import type { ScanResults } from "@/lib/types";
import { fullName, maskPhone, pacificParts } from "./format";
import type { DeskClinic, DeskPlan, DeskProduct, DeskReward, DeskTreatment, DueRow, LeadDetail, LeadSummary, OrderRow } from "./types";

const DAY = 86_400_000;

function db(): SupabaseClient | null {
  return supabaseAdmin();
}

function must<T>(res: { data: T | null; error: { message: string } | null }, fallback: T): T {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? fallback;
}

// ---------------------------------------------------------------------------
// Catalog (all rows, active or not)
// ---------------------------------------------------------------------------
export async function deskTreatments(clinicId: string): Promise<DeskTreatment[]> {
  const sb = db();
  if (!sb) return [];
  const res = await sb
    .from("treatments")
    .select("id, name, description, category, duration_min, price_cents, member_price_cents, result_days, popular, active, sort")
    .eq("clinic_id", clinicId)
    .order("sort")
    .order("created_at");
  return must(res, []) as DeskTreatment[];
}

export async function deskProducts(clinicId: string): Promise<DeskProduct[]> {
  const sb = db();
  if (!sb) return [];
  const res = await sb
    .from("products")
    .select("id, kind, name, description, price_cents, member_price_cents, sessions, image_url, active, sort")
    .eq("clinic_id", clinicId)
    .order("kind")
    .order("sort");
  return must(res, []) as DeskProduct[];
}

export async function deskPlans(clinicId: string): Promise<DeskPlan[]> {
  const sb = db();
  if (!sb) return [];
  const res = await sb
    .from("membership_plans")
    .select("id, name, tagline, monthly_price_cents, perks, member_discount_pct, monthly_points, active, sort")
    .eq("clinic_id", clinicId)
    .order("sort");
  return must(res, []) as DeskPlan[];
}

export async function deskRewards(clinicId: string): Promise<DeskReward[]> {
  const sb = db();
  if (!sb) return [];
  const res = await sb
    .from("rewards")
    .select("id, name, description, points_cost, image_url, active, sort")
    .eq("clinic_id", clinicId)
    .order("points_cost");
  return must(res, []) as DeskReward[];
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------
type LeadRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  checkin_code: string | null;
  membership_plan_id: string | null;
  member_since: string | null;
  created_at: string;
};

const LEAD_COLS = "id, first_name, last_name, phone, checkin_code, membership_plan_id, member_since, created_at";

/** Every patient with balance, plan and last visit. Small clinics; aggregated in JS. */
export async function leadSummaries(clinicId: string): Promise<LeadSummary[]> {
  const sb = db();
  if (!sb) return [];
  const [leads, ledger, visits, plans] = await Promise.all([
    sb.from("leads").select(LEAD_COLS).eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(2000),
    sb.from("points_ledger").select("lead_id, delta").eq("clinic_id", clinicId).limit(10000),
    sb.from("visits").select("lead_id, visit_at").eq("clinic_id", clinicId).eq("status", "done").limit(10000),
    sb.from("membership_plans").select("id, name").eq("clinic_id", clinicId),
  ]);
  const pts = new Map<string, number>();
  for (const r of must(ledger, []) as Array<{ lead_id: string; delta: number }>) pts.set(r.lead_id, (pts.get(r.lead_id) ?? 0) + r.delta);
  const last = new Map<string, string>();
  for (const v of must(visits, []) as Array<{ lead_id: string; visit_at: string | null }>) {
    if (v.visit_at && (!last.has(v.lead_id) || v.visit_at > last.get(v.lead_id)!)) last.set(v.lead_id, v.visit_at);
  }
  const planName = new Map((must(plans, []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
  return (must(leads, []) as LeadRow[]).map((l) => toSummary(l, pts.get(l.id) ?? 0, last.get(l.id) ?? null, l.membership_plan_id ? planName.get(l.membership_plan_id) ?? null : null));
}

function toSummary(l: LeadRow, points: number, lastVisit: string | null, planName: string | null): LeadSummary {
  return {
    id: l.id,
    name: fullName(l.first_name, l.last_name),
    phone_masked: maskPhone(l.phone),
    checkin_code: l.checkin_code,
    points,
    plan_name: planName,
    last_visit_at: lastVisit,
    created_at: l.created_at,
  };
}

export async function leadDetail(sb: SupabaseClient, clinicId: string, leadId: string): Promise<LeadDetail | null> {
  const lead = await sb.from("leads").select(LEAD_COLS).eq("clinic_id", clinicId).eq("id", leadId).maybeSingle();
  const row = must(lead, null) as LeadRow | null;
  if (!row) return null;
  const [ledger, visits, requests, redemptions, scan, plan] = await Promise.all([
    sb.from("points_ledger").select("id, delta, reason, created_at").eq("clinic_id", clinicId).eq("lead_id", leadId).order("created_at", { ascending: false }),
    sb.from("visits").select("id, status, visit_at, next_due_at, created_at, treatments(name)").eq("clinic_id", clinicId).eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    sb.from("purchase_requests").select("id, kind, item_name, price_cents, status, created_at").eq("clinic_id", clinicId).eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    sb.from("reward_redemptions").select("id, reward_name, points_spent, code, used_at, created_at").eq("clinic_id", clinicId).eq("lead_id", leadId).order("created_at", { ascending: false }).limit(50),
    sb.from("scans").select("created_at, results").eq("clinic_id", clinicId).eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    row.membership_plan_id ? sb.from("membership_plans").select("name").eq("id", row.membership_plan_id).eq("clinic_id", clinicId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const ledgerRows = must(ledger, []) as LeadDetail["ledger"];
  const visitRows = (must(visits, []) as Array<{ id: string; status: string; visit_at: string | null; next_due_at: string | null; treatments: { name: string } | { name: string }[] | null }>).map((v) => ({
    id: v.id,
    status: v.status,
    visit_at: v.visit_at,
    next_due_at: v.next_due_at,
    treatment_name: Array.isArray(v.treatments) ? v.treatments[0]?.name ?? null : v.treatments?.name ?? null,
  }));
  const lastVisit = visitRows.filter((v) => v.status === "done" && v.visit_at).map((v) => v.visit_at!).sort().at(-1) ?? null;
  const scanRow = must(scan, null) as { created_at: string; results: ScanResults | null } | null;
  return {
    ...toSummary(row, ledgerRows.reduce((s, r) => s + r.delta, 0), lastVisit, (plan.data as { name: string } | null)?.name ?? null),
    member_since: row.member_since,
    ledger: ledgerRows,
    visits: visitRows,
    requests: must(requests, []) as LeadDetail["requests"],
    redemptions: must(redemptions, []) as LeadDetail["redemptions"],
    latest_scan: scanRow ? { created_at: scanRow.created_at, overall_score: typeof scanRow.results?.overall_score === "number" ? scanRow.results.overall_score : null } : null,
  };
}

// ---------------------------------------------------------------------------
// Home: setup checklist from real state
// ---------------------------------------------------------------------------
export async function homeState(clinic: DeskClinic) {
  const sb = db();
  /** Row count for this clinic, optionally filtered by one column = value. */
  const count = async (table: string, col?: string, val?: string | boolean) => {
    if (!sb) return 0;
    let q = sb.from(table).select("id", { count: "exact", head: true }).eq("clinic_id", clinic.id);
    if (col) q = q.eq(col, val);
    const { count: c, error } = await q;
    if (error) throw new Error(error.message);
    return c ?? 0;
  };
  const [treatments, rewards, plans, leads, checkins] = await Promise.all([
    count("treatments", "active", true),
    count("rewards", "active", true),
    count("membership_plans", "active", true),
    count("leads"),
    count("visits", "status", "done"),
  ]);
  const hour = pacificParts(new Date()).hour;
  return { treatments, rewards, plans, leads, checkins, hour, dbReady: Boolean(sb) };
}

// ---------------------------------------------------------------------------
// Patients due
// ---------------------------------------------------------------------------
export async function dueList(clinicId: string): Promise<{ rows: DueRow[]; now: number }> {
  const sb = db();
  const now = Date.now();
  if (!sb) return { rows: [], now };
  const res = await sb
    .from("visits")
    .select("id, lead_id, treatment_id, visit_at, next_due_at, created_at, treatments(name), leads(first_name, last_name, phone)")
    .eq("clinic_id", clinicId)
    .eq("status", "done")
    .order("visit_at", { ascending: false })
    .limit(5000);
  type Row = {
    id: string;
    lead_id: string;
    treatment_id: string | null;
    visit_at: string | null;
    next_due_at: string | null;
    treatments: { name: string } | { name: string }[] | null;
    leads: { first_name: string | null; last_name: string | null; phone: string | null } | Array<{ first_name: string | null; last_name: string | null; phone: string | null }> | null;
  };
  const seen = new Set<string>();
  const rows: DueRow[] = [];
  for (const v of must(res, []) as Row[]) {
    // Latest visit per patient + treatment decides when they're due.
    const key = `${v.lead_id}:${v.treatment_id ?? "none"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!v.next_due_at) continue;
    const due = new Date(v.next_due_at).getTime();
    if (due > now + 14 * DAY) continue;
    const lead = Array.isArray(v.leads) ? v.leads[0] : v.leads;
    const t = Array.isArray(v.treatments) ? v.treatments[0] : v.treatments;
    rows.push({
      key,
      lead_id: v.lead_id,
      first_name: lead?.first_name ?? null,
      name: fullName(lead?.first_name, lead?.last_name),
      phone_masked: maskPhone(lead?.phone),
      treatment_name: t?.name ?? "their treatment",
      visit_at: v.visit_at,
      next_due_at: v.next_due_at,
      days_until: Math.floor((due - now) / DAY),
    });
  }
  rows.sort((a, b) => a.next_due_at.localeCompare(b.next_due_at));
  return { rows, now };
}

// ---------------------------------------------------------------------------
// Shop orders
// ---------------------------------------------------------------------------
export async function orders(clinicId: string): Promise<OrderRow[]> {
  const sb = db();
  if (!sb) return [];
  const res = await sb
    .from("purchase_requests")
    .select("id, kind, item_name, price_cents, status, note, created_at, lead_id, leads(first_name, last_name, phone)")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(500);
  type Row = Omit<OrderRow, "lead_name" | "lead_phone"> & {
    leads: { first_name: string | null; last_name: string | null; phone: string | null } | Array<{ first_name: string | null; last_name: string | null; phone: string | null }> | null;
  };
  return (must(res, []) as Row[]).map(({ leads, ...r }) => {
    const l = Array.isArray(leads) ? leads[0] : leads;
    return { ...r, lead_name: fullName(l?.first_name, l?.last_name), lead_phone: maskPhone(l?.phone) };
  });
}

export async function waitingOrderCount(clinicId: string): Promise<number> {
  const sb = db();
  if (!sb) return 0;
  const { count, error } = await sb.from("purchase_requests").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "requested");
  if (error) return 0;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Skin scans
// ---------------------------------------------------------------------------
export type ScanListRow = {
  id: string;
  created_at: string;
  lead_name: string | null;
  overall: number | null;
  top: Array<{ label: string; score: number }>;
  medical_flag: string | null;
  provider: string | null;
  model: string | null;
  photo: "kept" | "within" | "deleted" | "none";
  delete_after: string | null;
};

export async function scanList(clinicId: string): Promise<ScanListRow[]> {
  const sb = db();
  if (!sb) return [];
  const now = Date.now();
  const res = await sb
    .from("scans")
    .select("id, created_at, results, photo_path, keep_photo, delete_after, leads(first_name, last_name)")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(200);
  type Row = {
    id: string;
    created_at: string;
    results: Partial<ScanResults> | null;
    photo_path: string | null;
    keep_photo: boolean;
    delete_after: string | null;
    leads: { first_name: string | null; last_name: string | null } | Array<{ first_name: string | null; last_name: string | null }> | null;
  };
  return (must(res, []) as Row[]).map((s) => {
    const r = s.results ?? {};
    const l = Array.isArray(s.leads) ? s.leads[0] : s.leads;
    const concerns = Array.isArray(r.concerns) ? r.concerns : [];
    const top = [...concerns]
      .filter((c) => c && typeof c.score === "number")
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((c) => ({ label: CONCERN_BY_ID[c.id]?.label ?? c.id, score: Math.round(c.score) }));
    const photo: ScanListRow["photo"] = !s.photo_path
      ? "none"
      : s.keep_photo
        ? "kept"
        : s.delete_after && new Date(s.delete_after).getTime() > now
          ? "within"
          : "deleted";
    return {
      id: s.id,
      created_at: s.created_at,
      lead_name: l ? fullName(l.first_name, l.last_name) : null,
      overall: typeof r.overall_score === "number" ? Math.round(r.overall_score) : null,
      top,
      medical_flag: typeof r.medical_flag === "string" && r.medical_flag ? r.medical_flag : null,
      provider: typeof r.provider === "string" ? r.provider : null,
      model: typeof r.model === "string" ? r.model : null,
      photo,
      delete_after: s.delete_after,
    };
  });
}

// ---------------------------------------------------------------------------
// Insights (real counts only)
// ---------------------------------------------------------------------------
export async function insights(clinicId: string) {
  const sb = db();
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const since12w = new Date(now - 12 * 7 * DAY - 7 * DAY).toISOString();
  const empty = {
    now,
    dbReady: false,
    kpi: { visits30: 0, visitPatients30: 0, newPatients30: 0, totalPatients: 0, redeemed30: 0, pointsUsed30: 0, requests30: 0, requestedValue30: 0 },
    weeks: [] as Array<{ label: string; count: number; current: boolean }>,
    weekdays: [] as Array<{ day: string; count: number }>,
    patients: { total: 0, joined30: 0, cameBack: 0, visited: 0, members: 0 },
    rewards: { redeemedAll: 0, unused: 0, pointsIssued30: 0, pointsSpentAll: 0 },
    desk: { checkins30: 0, purchasePoints30: 0, confirmed30: 0, waiting: 0 },
  };
  if (!sb) return empty;
  const [leads, visits, redemptions, requests, ledger] = await Promise.all([
    sb.from("leads").select("id, created_at, membership_plan_id").eq("clinic_id", clinicId).limit(5000),
    sb.from("visits").select("lead_id, visit_at").eq("clinic_id", clinicId).eq("status", "done").not("visit_at", "is", null).limit(10000),
    sb.from("reward_redemptions").select("points_spent, used_at, created_at").eq("clinic_id", clinicId).limit(10000),
    sb.from("purchase_requests").select("status, price_cents, created_at").eq("clinic_id", clinicId).limit(10000),
    sb.from("points_ledger").select("delta, reason, created_at").eq("clinic_id", clinicId).gte("created_at", since30).limit(10000),
  ]);
  const L = must(leads, []) as Array<{ id: string; created_at: string; membership_plan_id: string | null }>;
  const V = must(visits, []) as Array<{ lead_id: string; visit_at: string }>;
  const R = must(redemptions, []) as Array<{ points_spent: number; used_at: string | null; created_at: string }>;
  const P = must(requests, []) as Array<{ status: string; price_cents: number | null; created_at: string }>;
  const G = must(ledger, []) as Array<{ delta: number; reason: string; created_at: string }>;

  const v30 = V.filter((v) => v.visit_at >= since30);
  const r30 = R.filter((r) => r.created_at >= since30);
  const p30 = P.filter((p) => p.created_at >= since30);
  const visitsByLead = new Map<string, number>();
  for (const v of V) visitsByLead.set(v.lead_id, (visitsByLead.get(v.lead_id) ?? 0) + 1);

  // 12 weekly buckets ending with the current week (weeks start Monday, Pacific).
  const todayP = pacificParts(new Date(now));
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayIdx = dow.indexOf(todayP.weekday);
  const dayNum = (d: Date) => {
    const p = pacificParts(d);
    return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / DAY);
  };
  const today = dayNum(new Date(now));
  const weekStart = today - (todayIdx < 0 ? 0 : todayIdx);
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = weekStart - (11 - i) * 7;
    const d = new Date(start * DAY);
    return { start, label: `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`, count: 0, current: i === 11 };
  });
  const weekdayCounts = dow.map((day) => ({ day, count: 0 }));
  for (const v of V) {
    if (v.visit_at < since12w) continue;
    const dn = dayNum(new Date(v.visit_at));
    const w = weeks.find((wk) => dn >= wk.start && dn < wk.start + 7);
    if (w) w.count++;
    if (dn >= today - 8 * 7) {
      const idx = dow.indexOf(pacificParts(new Date(v.visit_at)).weekday);
      if (idx >= 0) weekdayCounts[idx].count++;
    }
  }

  return {
    now,
    dbReady: true,
    kpi: {
      visits30: v30.length,
      visitPatients30: new Set(v30.map((v) => v.lead_id)).size,
      newPatients30: L.filter((l) => l.created_at >= since30).length,
      totalPatients: L.length,
      redeemed30: r30.length,
      pointsUsed30: r30.reduce((s, r) => s + r.points_spent, 0),
      requests30: p30.length,
      requestedValue30: p30.reduce((s, p) => s + (p.price_cents ?? 0), 0),
    },
    weeks: weeks.map(({ label, count, current }) => ({ label, count, current })),
    weekdays: weekdayCounts,
    patients: {
      total: L.length,
      joined30: L.filter((l) => l.created_at >= since30).length,
      visited: visitsByLead.size,
      cameBack: [...visitsByLead.values()].filter((n) => n >= 2).length,
      members: L.filter((l) => l.membership_plan_id).length,
    },
    rewards: {
      redeemedAll: R.length,
      unused: R.filter((r) => !r.used_at).length,
      pointsIssued30: G.filter((g) => g.delta > 0).reduce((s, g) => s + g.delta, 0),
      pointsSpentAll: R.reduce((s, r) => s + r.points_spent, 0),
    },
    desk: {
      checkins30: G.filter((g) => g.reason === "Visit check-in").length,
      purchasePoints30: G.filter((g) => g.reason.startsWith("Purchase points")).reduce((s, g) => s + g.delta, 0),
      confirmed30: p30.filter((p) => p.status === "confirmed").length,
      waiting: P.filter((p) => p.status === "requested").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------
export async function members(clinicId: string) {
  const sb = db();
  if (!sb) return [];
  const res = await sb
    .from("leads")
    .select("id, first_name, last_name, phone, membership_plan_id, member_since")
    .eq("clinic_id", clinicId)
    .not("membership_plan_id", "is", null)
    .order("member_since", { ascending: false, nullsFirst: false });
  return (must(res, []) as Array<{ id: string; first_name: string | null; last_name: string | null; phone: string | null; membership_plan_id: string; member_since: string | null }>).map((m) => ({
    id: m.id,
    name: fullName(m.first_name, m.last_name),
    phone_masked: maskPhone(m.phone),
    plan_id: m.membership_plan_id,
    member_since: m.member_since,
  }));
}
