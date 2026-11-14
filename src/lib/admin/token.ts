import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure admin-auth helpers (no Next.js imports) so they can be checked in isolation.
 * The cookie value is HMAC-SHA256("admin") with the server's session secret.
 */
export function signAdmin(secret: string) {
  return createHmac("sha256", secret).update("admin").digest("base64url");
}

/** Constant-time string compare. Hashes both sides first so lengths never leak or throw. */
export function safeEqual(a: string, b: string) {
  const ha = createHmac("sha256", "facet-admin-compare").update(a).digest();
  const hb = createHmac("sha256", "facet-admin-compare").update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

export function passwordMatches(input: string, expected: string) {
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function adminTokenValid(token: string | undefined, secret: string) {
  if (!token || !secret) return false;
  return safeEqual(token, signAdmin(secret));
}

/** Tiny in-memory limiter for login attempts (per server instance; good enough for a team page). */
export function createLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    /** Returns true when this attempt is allowed and records it. */
    allow(key: string, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}
