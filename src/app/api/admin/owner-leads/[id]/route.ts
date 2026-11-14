import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { isOwnerLeadStage } from "@/lib/admin/data";
import { supabaseAdmin } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Update an owner lead's stage and/or notes. Team only. */
export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/owner-leads/[id]">) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Unknown lead." }, { status: 400 });

  let body: { stage?: unknown; notes?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  const patch: { stage?: string; notes?: string | null } = {};
  if (body.stage !== undefined) {
    if (!isOwnerLeadStage(body.stage)) return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
    patch.stage = body.stage;
  }
  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== "string") return NextResponse.json({ error: "Notes must be text." }, { status: 400 });
    const t = typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : "";
    patch.notes = t || null;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: "The database isn't connected on this server." }, { status: 503 });
  const { data, error } = await sb.from("owner_leads").update(patch).eq("id", id).select("id, stage, notes").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "That lead doesn't exist." }, { status: 404 });
  return NextResponse.json({ ok: true, lead: data });
}
