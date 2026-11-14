import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getClinicBySlug } from "@/lib/data/clinics";
import { ownerCookieName, ownerCookieOptions, ownerCookieValue } from "@/lib/owner/session";

/** Exchange the token from a finished build for the owner cookie of that preview clinic. */
export async function POST(req: Request) {
  let body: { slug?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const clinic = body.slug ? await getClinicBySlug(body.slug) : null;
  if (!clinic || !body.token) return NextResponse.json({ error: "Unknown app" }, { status: 404 });
  const expected = Buffer.from(ownerCookieValue(clinic.id));
  const given = Buffer.from(body.token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return NextResponse.json({ error: "Not yours" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ownerCookieName(clinic.id), body.token, ownerCookieOptions);
  return res;
}
