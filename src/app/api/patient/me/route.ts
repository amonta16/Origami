import { NextResponse } from "next/server";
import { clinicContext, fail, patientContext } from "@/lib/patient/api";
import { cookieName } from "@/lib/patient/session";

/** Update the patient's own settings (notifications for now). */
export async function PATCH(req: Request) {
  let body: { clinicSlug?: string; notifications?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Bad request");
  }
  const ctx = await patientContext(body.clinicSlug);
  if (ctx instanceof NextResponse) return ctx;
  if (typeof body.notifications !== "boolean") return fail(400, "Nothing to update");
  const { error } = await ctx.sb.from("leads").update({ notifications: body.notifications }).eq("id", ctx.leadId).eq("clinic_id", ctx.clinic.id);
  if (error) return fail(500, error.message);
  return NextResponse.json({ ok: true });
}

/** Sign out on this device. The card and points stay with the clinic. */
export async function DELETE(req: Request) {
  const slug = new URL(req.url).searchParams.get("clinic");
  const ctx = await clinicContext(slug);
  if (ctx instanceof NextResponse) return ctx;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(ctx.clinic.id), "", { path: "/", maxAge: 0 });
  return res;
}
