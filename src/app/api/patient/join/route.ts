import { NextResponse } from "next/server";
import { clinicContext, fail, sixDigits } from "@/lib/patient/api";
import { cookieName, sessionCookieOptions, sessionValue } from "@/lib/patient/session";

/**
 * Join a clinic's app on this device: first name + mobile + 18+ confirmation.
 * Creates the lead, a 6-digit check-in code and the welcome points, then sets the session cookie.
 */
export async function POST(req: Request) {
  let body: { clinicSlug?: string; firstName?: string; phone?: string; adult?: boolean; textsOk?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Bad request");
  }
  const ctx = await clinicContext(body.clinicSlug);
  if (ctx instanceof NextResponse) return ctx;
  const { clinic, sb } = ctx;

  const firstName = (body.firstName ?? "").trim().replace(/\s+/g, " ");
  const digits = (body.phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (!firstName || firstName.length > 40) return fail(400, "Add your first name.");
  if (digits.length !== 10) return fail(400, "Add a 10-digit US mobile number.");
  if (body.adult !== true) return fail(400, "You need to be 18 or older to join.");
  const phone = `+1${digits}`;

  const existing = await sb.from("leads").select("id").eq("clinic_id", clinic.id).eq("phone", phone).limit(1);
  if (existing.error) return fail(500, existing.error.message);
  if (existing.data?.length) {
    return fail(409, `That number already has a card at ${clinic.name}. The front desk can move it to this phone.`);
  }

  // Unique per clinic; retry on the rare collision.
  let leadId: string | null = null;
  for (let attempt = 0; attempt < 5 && !leadId; attempt++) {
    const { data, error } = await sb
      .from("leads")
      .insert({
        clinic_id: clinic.id,
        first_name: firstName,
        phone,
        source: "app",
        consent_at: new Date().toISOString(),
        checkin_code: sixDigits(),
        notifications: Boolean(body.textsOk),
        answers: { joined_via: "patient_app", texts_ok: Boolean(body.textsOk) },
      })
      .select("id")
      .single();
    if (!error) leadId = data.id as string;
    else if (error.code !== "23505") return fail(500, error.message);
  }
  if (!leadId) return fail(500, "Couldn't create your card. Try again.");

  const welcome = clinic.welcome_points ?? 100;
  if (welcome > 0) {
    await sb.from("points_ledger").insert({ clinic_id: clinic.id, lead_id: leadId, delta: welcome, reason: "Welcome bonus" });
  }
  await sb.from("events").insert({ clinic_id: clinic.id, lead_id: leadId, name: "patient_joined", props: { texts_ok: Boolean(body.textsOk) } });

  const res = NextResponse.json({ ok: true, welcomePoints: welcome });
  res.cookies.set(cookieName(clinic.id), sessionValue(leadId), sessionCookieOptions);
  return res;
}
