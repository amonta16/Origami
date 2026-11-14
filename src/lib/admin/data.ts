import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SAMPLE_CLINIC } from "@/lib/sample-clinic";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isTeamTestSlug } from "./exclusions";

export const OWNER_LEAD_STAGES = ["new", "contacted", "call_booked", "founding", "live", "lost"] as const;
export type OwnerLeadStage = (typeof OWNER_LEAD_STAGES)[number];

export const STAGE_LABEL: Record<OwnerLeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  call_booked: "Call booked",
  founding: "Founding clinic",
  live: "Live",
  lost: "Lost",
};

export type AdminClinic = {
  id: string;
  slug: string;
  name: string;
  is_sample: boolean;
  is_preview: boolean;
  built_at: string | null;
  source_url: string | null;
  website: string | null;
  city: string | null;
  created_at: string;
};

export type OwnerLeadRow = {
  id: string;
  spa_name: string;
  website: string | null;
  clinic_id: string | null;
  contact_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  best_time: string | null;
  stage: OwnerLeadStage;
  notes: string | null;
  created_at: string;
  clinic: AdminClinic | null;
};

export type BuiltApp = AdminClinic & { treatments: number; patients: number; scans: number; teamTest: boolean };

export type FunnelStep = { key: string; label: string; all: number; week: number; from?: string };

export type ActivityRow = { id: string; name: string; created_at: string; clinic: AdminClinic | null };

export type AdminData = {
  leads: OwnerLeadRow[];
  apps: BuiltApp[];
  ownerFunnel: FunnelStep[];
  patientFunnel: FunnelStep[];
  activity: ActivityRow[];
  includeSample: boolean;
};

const CLINIC_COLS = "id, slug, name, is_sample, is_preview, built_at, source_url, website, city, created_at";

export function hostOf(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Clinic ids that are the fictional sample (from the table, plus the in-code constant). */
export function sampleIds(clinics: AdminClinic[]) {
  return [...new Set([SAMPLE_CLINIC.id, ...clinics.filter((c) => c.is_sample).map((c) => c.id)])];
}

async function countEvents(sb: SupabaseClient, name: string, opts: { since?: string; excludeIds?: string[] }) {
  let q = sb.from("events").select("id", { count: "exact", head: true }).eq("name", name);
  if (opts.since) q = q.gte("created_at", opts.since);
  // Keep events with no clinic; drop only events tied to an excluded clinic.
  if (opts.excludeIds?.length) q = q.or(`clinic_id.is.null,clinic_id.not.in.(${opts.excludeIds.join(",")})`);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Every value of one column for rows in the given clinics (paged, for small per-clinic tallies). */
async function clinicIdsOf(sb: SupabaseClient, table: string, ids: string[]) {
  if (!ids.length) return [] as string[];
  const out: string[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await sb.from(table).select("clinic_id").in("clinic_id", ids).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []).map((r) => (r as { clinic_id: string }).clinic_id));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function tally(ids: string[]) {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

const OWNER_STEPS: Array<Omit<FunnelStep, "all" | "week">> = [
  { key: "owner_scanner_built", label: "Built a preview app" },
  { key: "owner_lead_submitted", label: "Asked for a call", from: "owner_scanner_built" },
];

const PATIENT_STEPS: Array<Omit<FunnelStep, "all" | "week">> = [
  { key: "scan_started", label: "Started a scan" },
  { key: "consent_given", label: "Gave photo consent", from: "scan_started" },
  { key: "scan_done", label: "Finished the scan", from: "consent_given" },
  { key: "sim_viewed", label: "Viewed an after-preview", from: "scan_done" },
  { key: "book_clicked", label: "Tapped book", from: "sim_viewed" },
  { key: "patient_joined", label: "Joined the clinic app", from: "sim_viewed" },
  { key: "purchase_requested", label: "Requested a purchase", from: "patient_joined" },
];

export async function loadAdminData({ includeSample }: { includeSample: boolean }): Promise<AdminData | null> {
  const sb = supabaseAdmin();
  if (!sb) return null;

  const [clinicsRes, leadsRes, activityRes] = await Promise.all([
    sb.from("clinics").select(CLINIC_COLS).order("created_at", { ascending: false }).limit(2000),
    sb
      .from("owner_leads")
      .select("id, spa_name, website, clinic_id, contact_name, role, email, phone, best_time, stage, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    sb.from("events").select("id, name, created_at, clinic_id").order("created_at", { ascending: false }).limit(50),
  ]);
  if (clinicsRes.error) throw new Error(clinicsRes.error.message);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (activityRes.error) throw new Error(activityRes.error.message);

  const clinics = (clinicsRes.data ?? []) as AdminClinic[];
  const byId = new Map(clinics.map((c) => [c.id, c]));

  const leads = ((leadsRes.data ?? []) as Array<Omit<OwnerLeadRow, "clinic">>).map((l) => ({ ...l, clinic: l.clinic_id ? (byId.get(l.clinic_id) ?? null) : null }));

  const previews = clinics
    .filter((c) => c.is_preview)
    .sort((a, b) => (b.built_at ?? b.created_at).localeCompare(a.built_at ?? a.created_at));
  const previewIds = previews.map((c) => c.id);
  const [tIds, lIds, sIds] = await Promise.all([clinicIdsOf(sb, "treatments", previewIds), clinicIdsOf(sb, "leads", previewIds), clinicIdsOf(sb, "scans", previewIds)]);
  const [t, l, s] = [tally(tIds), tally(lIds), tally(sIds)];
  const apps: BuiltApp[] = previews.map((c) => ({ ...c, treatments: t.get(c.id) ?? 0, patients: l.get(c.id) ?? 0, scans: s.get(c.id) ?? 0, teamTest: isTeamTestSlug(c.slug) }));

  const excludeIds = includeSample ? [] : sampleIds(clinics);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const funnel = async (steps: typeof OWNER_STEPS) =>
    Promise.all(
      steps.map(async (st) => {
        const [all, week] = await Promise.all([countEvents(sb, st.key, { excludeIds }), countEvents(sb, st.key, { excludeIds, since })]);
        return { ...st, all, week };
      }),
    );
  const [ownerFunnel, patientFunnel] = await Promise.all([funnel(OWNER_STEPS), funnel(PATIENT_STEPS)]);

  const activity = ((activityRes.data ?? []) as Array<{ id: string; name: string; created_at: string; clinic_id: string | null }>).map((e) => ({
    id: e.id,
    name: e.name,
    created_at: e.created_at,
    clinic: e.clinic_id ? (byId.get(e.clinic_id) ?? null) : null,
  }));

  return { leads, apps, ownerFunnel, patientFunnel, activity, includeSample };
}

export function isOwnerLeadStage(v: unknown): v is OwnerLeadStage {
  return typeof v === "string" && (OWNER_LEAD_STAGES as readonly string[]).includes(v);
}

export function pacific(iso: string, withDay = true) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    ...(withDay ? { weekday: "short", month: "short", day: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
  });
}
