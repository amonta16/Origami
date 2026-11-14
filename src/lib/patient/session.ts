import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Patient session: an httpOnly cookie per clinic holding the lead id plus an HMAC,
 * so a patient can't swap in someone else's id. No passwords this weekend: the cookie
 * is created when the patient joins on this device and removed on sign-out.
 */
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function secret() {
  const s = process.env.PATIENT_SESSION_SECRET?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();
  if (!s) throw new Error("No session secret (set PATIENT_SESSION_SECRET or SUPABASE_SECRET_KEY)");
  return s;
}

export function cookieName(clinicId: string) {
  return `facet_p_${clinicId.replace(/-/g, "").slice(0, 12)}`;
}

function sign(leadId: string) {
  return createHmac("sha256", secret()).update(`patient:${leadId}`).digest("base64url");
}

export function sessionValue(leadId: string) {
  return `${leadId}.${sign(leadId)}`;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

/** Lead id of the signed-in patient for this clinic, or null. Server components and route handlers. */
export async function currentLeadId(clinicId: string): Promise<string | null> {
  const raw = (await cookies()).get(cookieName(clinicId))?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const leadId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return null;
  try {
    const expected = Buffer.from(sign(leadId));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  } catch {
    return null;
  }
  return leadId;
}
