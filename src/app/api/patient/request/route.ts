import { NextResponse } from "next/server";
import { fail, patientContext } from "@/lib/patient/api";

/**
 * "I want this": a treatment, a shop item or a membership. Nothing is charged here;
 * the clinic sees the request, confirms it and takes payment in person.
 */
export async function POST(req: Request) {
  let body: { clinicSlug?: string; kind?: string; itemId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Bad request");
  }
  const ctx = await patientContext(body.clinicSlug);
  if (ctx instanceof NextResponse) return ctx;
  const { clinic, sb, leadId } = ctx;

  const kind = body.kind;
  if (kind !== "treatment" && kind !== "product" && kind !== "membership") return fail(400, "Unknown item type");
  if (!body.itemId || !/^[0-9a-f-]{36}$/i.test(body.itemId)) return fail(400, "Unknown item");

  const table = kind === "treatment" ? "treatments" : kind === "product" ? "products" : "membership_plans";
  const priceCol = kind === "membership" ? "monthly_price_cents" : "price_cents";
  const { data: item, error } = await sb
    .from(table)
    .select(`id, name, ${priceCol}`)
    .eq("id", body.itemId)
    .eq("clinic_id", clinic.id)
    .eq("active", true)
    .maybeSingle();
  if (error) return fail(500, error.message);
  if (!item) return fail(404, "That item isn't available anymore.");
  const row = item as unknown as Record<string, unknown>;

  // One open request per item is enough; repeat taps return the existing one.
  const open = await sb
    .from("purchase_requests")
    .select("id")
    .eq("lead_id", leadId)
    .eq("item_id", body.itemId)
    .eq("status", "requested")
    .limit(1);
  if (open.data?.length) return NextResponse.json({ ok: true, id: open.data[0].id, already: true });

  const { data, error: insErr } = await sb
    .from("purchase_requests")
    .insert({
      clinic_id: clinic.id,
      lead_id: leadId,
      kind,
      item_id: body.itemId,
      item_name: row.name as string,
      price_cents: (row[priceCol] as number | null) ?? null,
      note: body.note?.slice(0, 500) || null,
    })
    .select("id")
    .single();
  if (insErr) return fail(500, insErr.message);
  await sb.from("events").insert({ clinic_id: clinic.id, lead_id: leadId, name: "purchase_requested", props: { kind, item_id: body.itemId } });
  return NextResponse.json({ ok: true, id: data.id });
}
