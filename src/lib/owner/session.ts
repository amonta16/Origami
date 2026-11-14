import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Clinic } from "@/lib/types";

/**
 * Owner access to a clinic's front desk and preview editor.
 * The person who builds a preview in the owner funnel gets an httpOnly cookie signed for that
 * clinic id. The sample clinic is open to everyone as a labeled demo. Real staff accounts
 * (Supabase Auth + clinic_members) come later; this is the weekend's access model.
 */
const MAX_AGE = 60 * 60 * 24 * 90;

function secret() {
  const s = process.env.OWNER_SESSION_SECRET?.trim() || process.env.PATIENT_SESSION_SECRET?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();
  if (!s) throw new Error("No session secret configured");
  return s;
}

export function ownerCookieName(clinicId: string) {
  return `facet_o_${clinicId.replace(/-/g, "").slice(0, 12)}`;
}

function sign(clinicId: string) {
  return createHmac("sha256", secret()).update(`owner:${clinicId}`).digest("base64url");
}

export function ownerCookieValue(clinicId: string) {
  return sign(clinicId);
}

export const ownerCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

/** True when this browser built (owns) the clinic's preview. */
export async function isOwner(clinicId: string): Promise<boolean> {
  const raw = (await cookies()).get(ownerCookieName(clinicId))?.value;
  if (!raw) return false;
  try {
    const a = Buffer.from(raw);
    const b = Buffer.from(sign(clinicId));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Front desk access: owners of the clinic, or anyone for the labeled sample clinic. */
export async function canUseDesk(clinic: Clinic): Promise<boolean> {
  if (clinic.is_sample) return true;
  return isOwner(clinic.id);
}
