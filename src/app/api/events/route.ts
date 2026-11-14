import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const ALLOWED = new Set([
  "scan_started",
  "consent_given",
  "camera_opened",
  "mesh_locked",
  "photo_captured",
  "photo_uploaded",
  "analysis_started",
  "scan_done",
  "analysis_failed",
  "sim_requested",
  "sim_viewed",
  "sim_failed",
  "dose_changed",
  "treatment_viewed",
  "book_clicked",
  "booked",
  "owner_scanner_built",
  "owner_lead_submitted",
  "lab_run",
]);

export async function POST(req: Request) {
  let body: { name?: string; props?: Record<string, unknown>; clinic_id?: string | null; lead_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.name || !ALLOWED.has(body.name)) return NextResponse.json({ ok: false }, { status: 400 });

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ ok: true, stored: false });

  const clinicId = body.clinic_id && /^[0-9a-f-]{36}$/i.test(body.clinic_id) ? body.clinic_id : null;
  const leadId = body.lead_id && /^[0-9a-f-]{36}$/i.test(body.lead_id) ? body.lead_id : null;
  // The sample clinic lives in code, not in the table, when seeded locally; skip FK errors quietly.
  const { error } = await sb.from("events").insert({
    name: body.name,
    props: body.props ?? {},
    clinic_id: clinicId,
    lead_id: leadId,
  });
  return NextResponse.json({ ok: !error, stored: !error });
}
