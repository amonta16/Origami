import { NextResponse } from "next/server";
import { UUID, deskApi, fail, guard, readJson, vText } from "@/lib/desk/access";

type Ctx = { params: Promise<{ clinic: string; id: string }> };

const DAY = 86_400_000;

/**
 * Check a patient in at the desk: logs a completed visit (with the recall date from the
 * treatment's result window) and adds the clinic's visit points. Optional purchase points.
 */
export async function POST(req: Request, { params }: Ctx) {
  const ctx = await deskApi(params);
  if (ctx instanceof NextResponse) return ctx;
  const { clinic, sb } = ctx;
  const { id: leadId } = await params;
  if (!UUID.test(leadId)) return fail(400, "Unknown patient");

  return guard(async () => {
    const body = (await readJson(req)) ?? {};
    const treatmentId = vText(body.treatmentId, "Treatment", { max: 40 });
    if (treatmentId && !UUID.test(treatmentId)) return fail(400, "Unknown treatment");
    const dollars = body.dollars == null || body.dollars === "" ? 0 : Number(body.dollars);
    if (!Number.isFinite(dollars) || dollars < 0 || dollars > 100_000) return fail(400, "Purchase amount must be between $0 and $100,000.");
    const purchaseOnly = body.purchaseOnly === true;

    const lead = await sb.from("leads").select("id").eq("id", leadId).eq("clinic_id", clinic.id).maybeSingle();
    if (lead.error) return fail(500, lead.error.message);
    if (!lead.data) return fail(404, "That patient isn't in this clinic.");

    type T = { id: string; name: string; result_days: number | null };
    let treatment: T | null = null;
    if (treatmentId) {
      const t = await sb.from("treatments").select("id, name, result_days").eq("id", treatmentId).eq("clinic_id", clinic.id).maybeSingle();
      if (t.error) return fail(500, t.error.message);
      if (!t.data) return fail(404, "That treatment isn't on this clinic's menu.");
      treatment = t.data as T;
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    let visitId: string | null = null;
    let visitPoints = 0;

    if (!purchaseOnly) {
      const v = await sb
        .from("visits")
        .insert({
          clinic_id: clinic.id,
          lead_id: leadId,
          treatment_id: treatment?.id ?? null,
          status: "done",
          visit_at: nowIso,
          next_due_at: treatment?.result_days ? new Date(now + treatment.result_days * DAY).toISOString() : null,
        })
        .select("id")
        .single();
      if (v.error) return fail(500, v.error.message);
      visitId = v.data.id as string;
      visitPoints = Math.max(0, clinic.visit_points ?? 50);
    }

    const perDollar = clinic.points_per_dollar ?? 1;
    const purchasePoints = Math.floor(dollars) * perDollar;
    const rows = [
      ...(visitPoints > 0 ? [{ clinic_id: clinic.id, lead_id: leadId, delta: visitPoints, reason: "Visit check-in" }] : []),
      ...(purchasePoints > 0 ? [{ clinic_id: clinic.id, lead_id: leadId, delta: purchasePoints, reason: `Purchase points ($${Math.floor(dollars)})` }] : []),
    ];
    if (rows.length) {
      const p = await sb.from("points_ledger").insert(rows);
      if (p.error) return fail(500, p.error.message);
    }
    if (!purchaseOnly) {
      // The lead has now visited; keep the funnel status honest.
      await sb.from("leads").update({ status: "visited" }).eq("id", leadId).eq("clinic_id", clinic.id);
      await sb.from("events").insert({ clinic_id: clinic.id, lead_id: leadId, name: "desk_checkin", props: { treatment_id: treatment?.id ?? null } });
    }

    return NextResponse.json({ ok: true, visitId, visitPoints, purchasePoints, treatment: treatment?.name ?? null });
  });
}
