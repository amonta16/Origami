import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminTokenValid, createLimiter, passwordMatches, signAdmin } from "./token";

/**
 * Team-only admin access. The password lives in ADMIN_PASSWORD (server env only). A correct
 * password sets an httpOnly cookie signed with ADMIN_SESSION_SECRET (or SUPABASE_SECRET_KEY).
 */
export const ADMIN_COOKIE = "facet_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

export function adminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

export function adminConfigured() {
  return Boolean(adminPassword() && sessionSecret());
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || "";
}

export function checkAdminPassword(input: string) {
  return passwordMatches(input, adminPassword());
}

export function adminCookieValue() {
  const s = sessionSecret();
  if (!s) throw new Error("No admin session secret configured");
  return signAdmin(s);
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

/** True when ADMIN_PASSWORD is set and this browser holds a valid admin cookie. */
export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  return adminTokenValid(raw, sessionSecret());
}

/** For admin API routes: a 401 response when not signed in, else null. */
export async function requireAdminApi(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: "Not signed in to the admin." }, { status: 401 });
}

/** 10 tries per 15 minutes per IP, per server instance. */
export const loginLimiter = createLimiter(10, 15 * 60 * 1000);
