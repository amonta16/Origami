import { NextResponse } from "next/server";
import { getClinicBySlug } from "@/lib/data/clinics";
import { isOwner } from "@/lib/owner/session";
import { supabaseAdmin } from "@/lib/supabase/server";

/** "Wrong logo or color? Fix it": the owner edits their preview's name, color, logo and photo. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/build/[slug]">) {
  const { slug } = await ctx.params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) return NextResponse.json({ error: "Unknown app" }, { status: 404 });
  if (!(await isOwner(clinic.id))) return NextResponse.json({ error: "Only the person who built this preview can edit it." }, { status: 403 });
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: "Not available" }, { status: 503 });

  let b: { name?: string; brand_color?: string; logo_url?: string; hero_photo_url?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const patch: Record<string, string | null> = {};
  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim().slice(0, 80);
  if (typeof b.brand_color === "string") {
    if (!/^#[0-9a-f]{6}$/i.test(b.brand_color)) return NextResponse.json({ error: "Brand color must look like #2f6f5e." }, { status: 400 });
    patch.brand_color = b.brand_color.toLowerCase();
  }
  for (const k of ["logo_url", "hero_photo_url"] as const) {
    if (typeof b[k] === "string") {
      const v = b[k]!.trim();
      if (v && !/^https:\/\/\S+$/i.test(v)) return NextResponse.json({ error: "Image links must start with https://" }, { status: 400 });
      patch[k] = v || null;
    }
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  const { error } = await sb.from("clinics").update(patch).eq("id", clinic.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
