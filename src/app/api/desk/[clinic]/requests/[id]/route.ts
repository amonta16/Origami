import { NextResponse } from "next/server";
import { UUID, deskApi, fail, guard, readJson } from "@/lib/desk/access";

type Ctx = { params: Promise<{ clinic: string; id: string }> };

/**
 * Confirm or cancel a patient's request from the app. Confirming a membership request
 * puts the patient on that plan. No money moves here; the desk charges in person.
 */
export async function POST(req: Request, { params }: Ctx) {
  const ctx = await deskApi(params);
  if (ctx instanceof NextResponse) return ctx;
  const { clinic, sb } = ctx;
  const { id } = await params;
  if (!UUID.test(id)) return fail(400, "Unknown request");

  return guard(async () => {
    const body = await readJson(req);
    const status = body?.status;
    if (status !== "confirmed" && status !== "cancelled") return fail(400, "Status must be confirmed or cancelled.");

    const cur = await sb.from("purchase_requests").select("id, kind, item_id, lead_id, status").eq("id", id).eq("clinic_id", clinic.id).maybeSingle();
    if (cur.error) return fail(500, cur.error.message);
    if (!cur.data) return fail(404, "That request isn't in this clinic.");
    const r = cur.data as { id: string; kind: string; item_id: string; lead_id: string; status: string };
    if (r.status !== "requested") return fail(409, `That request is already ${r.status}.`);

    if (status === "confirmed" && r.kind === "membership") {
      const plan = await sb.from("membership_plans").select("id").eq("id", r.item_id).eq("clinic_id", clinic.id).maybeSingle();
      if (plan.error) return fail(500, plan.error.message);
      if (!plan.data) return fail(409, "That membership plan no longer exists. Cancel this request instead.");
      const up = await sb
        .from("leads")
        .update({ membership_plan_id: r.item_id, member_since: new Date().toISOString() })
        .eq("id", r.lead_id)
        .eq("clinic_id", clinic.id);
      if (up.error) return fail(500, up.error.message);
    }

    const { error } = await sb.from("purchase_requests").update({ status }).eq("id", id).eq("clinic_id", clinic.id).eq("status", "requested");
    if (error) return fail(500, error.message);
    await sb.from("events").insert({ clinic_id: clinic.id, lead_id: r.lead_id, name: status === "confirmed" ? "purchase_confirmed" : "purchase_cancelled", props: { kind: r.kind } });
    return NextResponse.json({ ok: true, status });
  });
}
