import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SAMPLE_CLINIC, SAMPLE_TREATMENTS } from "@/lib/sample-clinic";
import { withStockPhotos } from "@/lib/stock-photos";
import type { Clinic, Treatment } from "@/lib/types";

/** Clinic by slug. Falls back to the in-code sample clinic when Supabase isn't configured. */
export async function getClinicBySlug(slug: string): Promise<Clinic | null> {
  const sb = supabaseAdmin();
  if (!sb) return slug === "sample" ? SAMPLE_CLINIC : null;
  const { data, error } = await sb.from("clinics").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data && slug === "sample") return SAMPLE_CLINIC;
  return (data as Clinic | null) ?? null;
}

/** Active treatments in menu order. Empty photo slots get matched stock photos (see stock-photos.ts). */
export async function getTreatments(clinicId: string): Promise<Treatment[]> {
  return withStockPhotos(clinicId, await loadTreatments(clinicId));
}

async function loadTreatments(clinicId: string): Promise<Treatment[]> {
  const sb = supabaseAdmin();
  if (!sb || clinicId === SAMPLE_CLINIC.id) return SAMPLE_TREATMENTS;
  const { data, error } = await sb
    .from("treatments")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("sort", { ascending: true });
  if (error) throw error;
  return (data as Treatment[]) ?? [];
}
