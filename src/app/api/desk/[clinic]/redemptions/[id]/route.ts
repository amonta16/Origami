import { NextResponse } from "next/server";
import { UUID, deskApi, fail, guard } from "@/lib/desk/access";

type Ctx = { params: Promise<{ clinic: string; id: string }> };

/** Mark a reward code as used at the desk. */
export async function POST(_req: Request, { params }: Ctx) {
  const ctx = await deskApi(params);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!UUID.test(id)) return fail(400, "Unknown reward code");
  return guard(async () => {
    const { data, error } = await ctx.sb
      .from("reward_redemptions")
      .update({ used_at: new Date().toISOString() })
      .eq("id", id)
      .eq("clinic_id", ctx.clinic.id)
      .is("used_at", null)
      .select("id, used_at");
    if (error) return fail(500, error.message);
    if (!data?.length) return fail(409, "That code was already used, or it isn't from this clinic.");
    return NextResponse.json({ ok: true, used_at: data[0].used_at });
  });
}
