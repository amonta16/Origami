import { NextResponse } from "next/server";
import { fail, patientContext, pointsBalance, redemptionCode } from "@/lib/patient/api";

/** Spend points on a reward. Returns a code the patient shows at the front desk. */
export async function POST(req: Request) {
  let body: { clinicSlug?: string; rewardId?: string };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Bad request");
  }
  const ctx = await patientContext(body.clinicSlug);
  if (ctx instanceof NextResponse) return ctx;
  const { clinic, sb, leadId } = ctx;
  if (!body.rewardId || !/^[0-9a-f-]{36}$/i.test(body.rewardId)) return fail(400, "Unknown reward");

  const { data: reward, error } = await sb
    .from("rewards")
    .select("id, name, points_cost")
    .eq("id", body.rewardId)
    .eq("clinic_id", clinic.id)
    .eq("active", true)
    .maybeSingle();
  if (error) return fail(500, error.message);
  if (!reward) return fail(404, "That reward isn't available anymore.");

  const balance = await pointsBalance(sb, leadId);
  if (balance < reward.points_cost) return fail(400, `You need ${reward.points_cost - balance} more points for this one.`);

  const code = redemptionCode();
  const spend = await sb
    .from("points_ledger")
    .insert({ clinic_id: clinic.id, lead_id: leadId, delta: -reward.points_cost, reason: `Redeemed: ${reward.name}` });
  if (spend.error) return fail(500, spend.error.message);
  const { error: rErr } = await sb.from("reward_redemptions").insert({
    clinic_id: clinic.id,
    lead_id: leadId,
    reward_id: reward.id,
    reward_name: reward.name,
    points_spent: reward.points_cost,
    code,
  });
  if (rErr) {
    // Give the points back if the redemption row didn't land.
    await sb.from("points_ledger").insert({ clinic_id: clinic.id, lead_id: leadId, delta: reward.points_cost, reason: `Refund: ${reward.name}` });
    return fail(500, rErr.message);
  }
  await sb.from("events").insert({ clinic_id: clinic.id, lead_id: leadId, name: "reward_redeemed", props: { reward_id: reward.id } });
  return NextResponse.json({ ok: true, code });
}
