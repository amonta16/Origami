import "server-only";
import { notFound } from "next/navigation";
import { getClinicBySlug } from "@/lib/data/clinics";
import { getPatient } from "@/lib/data/catalog";
import { currentLeadId } from "@/lib/patient/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/** Clinic + signed-in patient (or null) for a patient-app page. Call inside <Suspense>. */
export async function loadPatientPage(slug: string) {
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();
  let patient = null;
  if (isSupabaseConfigured()) {
    const leadId = await currentLeadId(clinic.id);
    if (leadId) patient = await getPatient(clinic.id, leadId);
  }
  return { clinic, patient, base: `/s/${clinic.slug}` };
}
