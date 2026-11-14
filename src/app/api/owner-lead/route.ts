import { NextResponse } from "next/server";
import { getClinicBySlug } from "@/lib/data/clinics";
import { supabaseAdmin } from "@/lib/supabase/server";

/** "Book my free call" from a preview page → owner_leads. */
export async function POST(req: Request) {
  let b: { slug?: string; name?: string; role?: string; email?: string; phone?: string; bestTime?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: "Not available on this server yet." }, { status: 503 });
  const clinic = b.slug ? await getClinicBySlug(b.slug) : null;
  if (!clinic) return NextResponse.json({ error: "Unknown app" }, { status: 404 });

  const name = (b.name ?? "").trim().slice(0, 80);
  const email = (b.email ?? "").trim().slice(0, 120);
  const digits = (b.phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (!name) return NextResponse.json({ error: "Add your name." }, { status: 400 });
  if (!email && digits.length !== 10) return NextResponse.json({ error: "Add an email or a 10-digit phone so we can reach you." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });

  const { error } = await sb.from("owner_leads").insert({
    spa_name: clinic.name,
    website: clinic.website,
    clinic_id: clinic.id,
    contact_name: name,
    role: (b.role ?? "").trim().slice(0, 40) || null,
    email: email || null,
    phone: digits.length === 10 ? `+1${digits}` : null,
    best_time: (b.bestTime ?? "").trim().slice(0, 60) || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from("events").insert({ clinic_id: clinic.id, name: "owner_lead_submitted", props: { role: b.role ?? null } });
  return NextResponse.json({ ok: true });
}
