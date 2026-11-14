import { NextResponse } from "next/server";
import { UUID, deskApi, fail, guard } from "@/lib/desk/access";
import { leadDetail } from "@/lib/desk/data";

type Ctx = { params: Promise<{ clinic: string; id: string }> };

/** Everything the desk shows about one patient. */
export async function GET(_req: Request, { params }: Ctx) {
  const ctx = await deskApi(params);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!UUID.test(id)) return fail(400, "Unknown patient");
  return guard(async () => {
    const detail = await leadDetail(ctx.sb, ctx.clinic.id, id);
    if (!detail) return fail(404, "That patient isn't in this clinic.");
    return NextResponse.json({ lead: detail });
  });
}
