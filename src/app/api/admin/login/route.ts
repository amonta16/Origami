import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, adminCookieOptions, adminCookieValue, checkAdminPassword, loginLimiter } from "@/lib/admin/auth";

/** Admin sign-in. Accepts a plain form post (works without JS) or JSON { password }. */
export async function POST(req: Request) {
  const back = (q: string) => NextResponse.redirect(new URL(`/admin${q}`, req.url), 303);
  if (!adminConfigured()) return back("");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!loginLimiter.allow(ip)) return back("?error=slow");

  let password = "";
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const b = (await req.json()) as { password?: unknown };
      password = typeof b.password === "string" ? b.password : "";
    } else {
      const f = await req.formData();
      const v = f.get("password");
      password = typeof v === "string" ? v : "";
    }
  } catch {
    return back("?error=1");
  }

  if (!checkAdminPassword(password)) return back("?error=1");
  loginLimiter.reset(ip);
  const res = back("");
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(), adminCookieOptions);
  return res;
}
