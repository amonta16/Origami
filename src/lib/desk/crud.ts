import "server-only";
import { NextResponse } from "next/server";
import { UUID, deskApi, fail, guard, readJson } from "./access";

type Parser = (body: Record<string, unknown>, create?: boolean) => Record<string, unknown>;
type Table = "treatments" | "products" | "membership_plans" | "rewards";

/** POST /api/desk/[clinic]/<collection>: create a row for this clinic, placed last. */
export function createRoute(table: Table, parse: Parser) {
  return async function POST(req: Request, { params }: { params: Promise<{ clinic: string }> }) {
    const ctx = await deskApi(params);
    if (ctx instanceof NextResponse) return ctx;
    const { clinic, sb } = ctx;
    return guard(async () => {
      const body = await readJson(req);
      if (!body) return fail(400, "Bad request");
      const row = parse(body, true);
      const last = await sb.from(table).select("sort").eq("clinic_id", clinic.id).order("sort", { ascending: false }).limit(1);
      const sort = ((last.data?.[0]?.sort as number | undefined) ?? 0) + 1;
      const { data, error } = await sb.from(table).insert({ ...row, clinic_id: clinic.id, sort }).select("id").single();
      if (error) return fail(500, error.message);
      return NextResponse.json({ ok: true, id: data.id });
    });
  };
}

/** PATCH /api/desk/[clinic]/<collection>/[id]: update the sent fields on this clinic's row. */
export function updateRoute(table: Table, parse: Parser) {
  return async function PATCH(req: Request, { params }: { params: Promise<{ clinic: string; id: string }> }) {
    const ctx = await deskApi(params);
    if (ctx instanceof NextResponse) return ctx;
    const { clinic, sb } = ctx;
    const { id } = await params;
    if (!UUID.test(id)) return fail(400, "Unknown item");
    return guard(async () => {
      const body = await readJson(req);
      if (!body) return fail(400, "Bad request");
      const row = parse(body, false);
      if (!Object.keys(row).length) return fail(400, "Nothing to change.");
      const { data, error } = await sb.from(table).update(row).eq("id", id).eq("clinic_id", clinic.id).select("id");
      if (error) return fail(500, error.message);
      if (!data?.length) return fail(404, "That item isn't in this clinic.");
      return NextResponse.json({ ok: true });
    });
  };
}

/** DELETE /api/desk/[clinic]/<collection>/[id]. */
export function deleteRoute(table: Table) {
  return async function DELETE(_req: Request, { params }: { params: Promise<{ clinic: string; id: string }> }) {
    const ctx = await deskApi(params);
    if (ctx instanceof NextResponse) return ctx;
    const { clinic, sb } = ctx;
    const { id } = await params;
    if (!UUID.test(id)) return fail(400, "Unknown item");
    return guard(async () => {
      const { data, error } = await sb.from(table).delete().eq("id", id).eq("clinic_id", clinic.id).select("id");
      if (error) return fail(500, error.message);
      if (!data?.length) return fail(404, "That item isn't in this clinic.");
      return NextResponse.json({ ok: true });
    });
  };
}
