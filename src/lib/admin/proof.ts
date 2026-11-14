import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hostOf, sampleIds, type AdminClinic } from "./data";
import { TEAM_TEST_CLINIC_SLUGS, WEEKEND_END_ISO, WEEKEND_START_ISO } from "./exclusions";

/**
 * Public proof numbers. Only rows created at/after the hackathon start that belong to a clinic
 * that is neither the fictional sample nor one of the team's own test builds. Rows with no
 * clinic can't be attributed, so they are left out too (SQL `not in` drops nulls).
 * Returns no personal data: spa names and city/host only.
 */
export type ProofKpi = { key: string; label: string; value: number; definition: string };
export type ProofSpa = { name: string; place: string | null };
export type ProofHour = { start: string; count: number };
export type ProofData = { kpis: ProofKpi[]; spas: ProofSpa[]; hours: ProofHour[]; totalEvents: number };

const HOUR = 60 * 60 * 1000;

function scoped(sb: SupabaseClient, table: string, excluded: string[]) {
  return sb
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", WEEKEND_START_ISO)
    .not("clinic_id", "in", `(${excluded.join(",")})`);
}

async function n(q: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function loadProof(): Promise<ProofData | null> {
  const sb = supabaseAdmin();
  if (!sb) return null;

  const { data, error } = await sb.from("clinics").select("id, slug, name, is_sample, is_preview, built_at, source_url, website, city, created_at").limit(5000);
  if (error) throw new Error(error.message);
  const clinics = (data ?? []) as AdminClinic[];
  const teamTest = new Set(TEAM_TEST_CLINIC_SLUGS);
  const excluded = [...new Set([...sampleIds(clinics), ...clinics.filter((c) => teamTest.has(c.slug)).map((c) => c.id)])];
  const isExcluded = new Set(excluded);

  const built = clinics
    .filter((c) => c.is_preview && !isExcluded.has(c.id) && c.created_at >= WEEKEND_START_ISO)
    .sort((a, b) => (a.built_at ?? a.created_at).localeCompare(b.built_at ?? b.created_at));

  const ev = (name: string) => n(scoped(sb, "events", excluded).eq("name", name));
  const [ownerLeads, scansDone, simsViewed, joined, shop, checkins] = await Promise.all([
    n(scoped(sb, "owner_leads", excluded)),
    ev("scan_done"),
    ev("sim_viewed"),
    ev("patient_joined"),
    n(scoped(sb, "purchase_requests", excluded)),
    n(scoped(sb, "visits", excluded).eq("status", "done")),
  ]);

  const kpis: ProofKpi[] = [
    { key: "apps", label: "Apps built", value: built.length, definition: "Preview apps generated from a real med spa's website by the owner funnel." },
    { key: "calls", label: "Owner calls requested", value: ownerLeads, definition: "Owners who filled in the call form after seeing their app." },
    { key: "scans", label: "Face scans completed", value: scansDone, definition: "Scans that returned a cosmetic estimate (scan_done events)." },
    { key: "sims", label: "After-previews viewed", value: simsViewed, definition: "Times a simulated after-image was shown (sim_viewed events)." },
    { key: "joined", label: "Patients joined", value: joined, definition: "People who joined a clinic's app (patient_joined events)." },
    { key: "shop", label: "Shop requests", value: shop, definition: "Treatment, product or membership requests sent to a clinic from its app." },
    { key: "checkins", label: "Check-ins", value: checkins, definition: "Visits marked done at a clinic's front desk." },
  ];

  // Hourly activity across the weekend window, up to now.
  const start = Date.parse(WEEKEND_START_ISO);
  const end = Math.min(Date.now(), Date.parse(WEEKEND_END_ISO));
  const slots = Math.max(1, Math.ceil((end - start) / HOUR));
  const counts = new Array<number>(slots).fill(0);
  let totalEvents = 0;
  if (end > start) {
    for (let from = 0; from < 100000; from += 1000) {
      const page = await sb
        .from("events")
        .select("created_at")
        .gte("created_at", WEEKEND_START_ISO)
        .lt("created_at", new Date(end).toISOString())
        .not("clinic_id", "in", `(${excluded.join(",")})`)
        .order("created_at", { ascending: true })
        .range(from, from + 999);
      if (page.error) throw new Error(page.error.message);
      for (const r of page.data ?? []) {
        const i = Math.floor((Date.parse((r as { created_at: string }).created_at) - start) / HOUR);
        if (i >= 0 && i < slots) {
          counts[i] += 1;
          totalEvents += 1;
        }
      }
      if (!page.data || page.data.length < 1000) break;
    }
  }
  const hours = counts.map((count, i) => ({ start: new Date(start + i * HOUR).toISOString(), count }));

  const spas = built.map((c) => ({ name: c.name, place: c.city || hostOf(c.source_url) || hostOf(c.website) }));

  return { kpis, spas, hours, totalEvents };
}
