import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { NextResponse, connection } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getClinicBySlug } from "@/lib/data/clinics";
import { canUseDesk } from "@/lib/owner/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { DeskClinic } from "./types";

/**
 * Clinic + access check for a desk page. Cached per request so the layout and the page
 * share one lookup. Call inside <Suspense> (reads cookies for non-sample clinics).
 */
export const loadDesk = cache(async (slug: string): Promise<{ clinic: DeskClinic; allowed: boolean } | null> => {
  await connection();
  const clinic = (await getClinicBySlug(slug)) as DeskClinic | null;
  if (!clinic) return null;
  return { clinic, allowed: await canUseDesk(clinic) };
});

/** For desk pages: await params, load the clinic (404 if unknown) and the access flag. */
export async function resolveDesk(params: Promise<{ clinic: string }>) {
  const { clinic: slug } = await params;
  const d = await loadDesk(slug);
  if (!d) notFound();
  return d;
}

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Clinic + DB for a desk API route, or an error response (404 / 403 / 503). */
export async function deskApi(params: Promise<{ clinic: string }>): Promise<{ clinic: DeskClinic; sb: SupabaseClient } | NextResponse> {
  const { clinic: slug } = await params;
  const sb = supabaseAdmin();
  if (!sb) return fail(503, "The database isn't connected on this server.");
  const clinic = (await getClinicBySlug(slug)) as DeskClinic | null;
  if (!clinic) return fail(404, "Unknown clinic");
  if (!(await canUseDesk(clinic))) return fail(403, "This desk belongs to the clinic that built it.");
  return { clinic, sb };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Small validators. Each returns the clean value, or throws a ValidationError with a readable message. */
export class ValidationError extends Error {}

export function vText(v: unknown, label: string, opts: { max?: number; required?: boolean } = {}): string | null {
  if (v == null || (typeof v === "string" && !v.trim())) {
    if (opts.required) throw new ValidationError(`${label} is required.`);
    return null;
  }
  if (typeof v !== "string") throw new ValidationError(`${label} must be text.`);
  const s = v.trim();
  if (s.length > (opts.max ?? 500)) throw new ValidationError(`${label} is too long (max ${opts.max ?? 500} characters).`);
  return s;
}

export function vInt(v: unknown, label: string, opts: { min?: number; max?: number; required?: boolean } = {}): number | null {
  if (v == null || v === "") {
    if (opts.required) throw new ValidationError(`${label} is required.`);
    return null;
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n)) throw new ValidationError(`${label} must be a whole number.`);
  if (opts.min != null && n < opts.min) throw new ValidationError(`${label} must be at least ${opts.min}.`);
  if (opts.max != null && n > opts.max) throw new ValidationError(`${label} must be at most ${opts.max}.`);
  return n;
}

export function vBool(v: unknown, label: string): boolean {
  if (typeof v !== "boolean") throw new ValidationError(`${label} must be on or off.`);
  return v;
}

export function vUrl(v: unknown, label: string): string | null {
  const s = vText(v, label, { max: 1000 });
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    throw new ValidationError(`${label} must be a full web address starting with https://`);
  }
  return s;
}

/** Run a handler body; turn ValidationError into a 400. */
export async function guard(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ValidationError) return fail(400, e.message);
    console.error("[desk api]", e);
    return fail(500, "Something went wrong saving that. Try again.");
  }
}

/** Only copy keys that were sent. */
export function has(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}
