import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the secret key (bypasses RLS).
 * Only ever imported from server routes and server components.
 * Returns null when the project isn't configured yet so local dev keeps working
 * on the in-code sample clinic.
 */
let cached: SupabaseClient | null | undefined;

/** Env values pasted into dashboards often carry a trailing newline or space; strip it. */
export function supabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "",
    key: process.env.SUPABASE_SECRET_KEY?.trim() || "",
  };
}

export function isSupabaseConfigured() {
  const { url, key } = supabaseEnv();
  return Boolean(url && key);
}

export function supabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const { url, key } = supabaseEnv();
  if (!url || !key) {
    cached = null;
    return cached;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
