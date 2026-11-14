import "server-only";
import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getClinicBySlug } from "@/lib/data/clinics";
import { supabaseAdmin } from "@/lib/supabase/server";
import { currentLeadId } from "@/lib/patient/session";
import type { Clinic } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Resolve the clinic + DB client for a patient route, or an error response. */
export async function clinicContext(slug: unknown): Promise<{ clinic: Clinic; sb: SupabaseClient } | NextResponse> {
  if (typeof slug !== "string" || !slug) return fail(400, "clinicSlug is required");
  const sb = supabaseAdmin();
  if (!sb) return fail(503, "Accounts aren't available yet on this server.");
  const clinic = await getClinicBySlug(slug);
  if (!clinic) return fail(404, "Unknown clinic");
  return { clinic, sb };
}

/** Same, plus the signed-in patient's lead id. */
export async function patientContext(slug: unknown) {
  const ctx = await clinicContext(slug);
  if (ctx instanceof NextResponse) return ctx;
  const leadId = await currentLeadId(ctx.clinic.id);
  if (!leadId) return fail(401, "Join first so we can save this to your card.");
  return { ...ctx, leadId };
}

export function sixDigits() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Redemption code: 6 chars, no lookalikes (0/O, 1/I). */
export function redemptionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[randomInt(0, alphabet.length)]).join("");
}

export async function pointsBalance(sb: SupabaseClient, leadId: string) {
  const { data, error } = await sb.from("points_ledger").select("delta").eq("lead_id", leadId);
  if (error) throw error;
  return (data ?? []).reduce((s, r: { delta: number }) => s + r.delta, 0);
}
