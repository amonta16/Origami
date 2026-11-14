import { NextResponse } from "next/server";
import { deskApi, fail, guard, readJson } from "@/lib/desk/access";
import { parseClinic } from "@/lib/desk/parse";

type Ctx = { params: Promise<{ clinic: string }> };

/** Brand, clinic details and points rules. Only sent fields change. */
export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await deskApi(params);
  if (ctx instanceof NextResponse) return ctx;
  const { clinic, sb } = ctx;
  return guard(async () => {
    const body = await readJson(req);
    if (!body) return fail(400, "Bad request");
    const row = parseClinic(body);
    if (!Object.keys(row).length) return fail(400, "Nothing to change.");
    const { error } = await sb.from("clinics").update(row).eq("id", clinic.id);
    if (error) return fail(500, error.message);
    return NextResponse.json({ ok: true });
  });
}
