import { connection } from "next/server";
import { createLimiter } from "@/lib/admin/token";
import { purgeExpiredPhotos } from "@/lib/scans/purge";

export const maxDuration = 60;

/**
 * Enforces the 72-hour photo promise. Called every hour by Supabase pg_cron (migration
 * 20261115000800_purge_scan_photos.sql) and once a day by Vercel Cron (vercel.json) as a backup.
 *
 * No secret on purpose: it only deletes photos that are already past their delete date, so a
 * stranger calling it can't delete anything early or reach any data; it takes no input and
 * returns counts only.
 */
/** Plenty for an hourly + a daily caller; stops anyone hammering the database. */
const limiter = createLimiter(12, 10 * 60 * 1000);

async function run(req: Request) {
  await connection();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!limiter.allow(ip)) return Response.json({ ok: false, error: "Too many calls" }, { status: 429 });
  const r = await purgeExpiredPhotos();
  if (!r.ok) console.error("purge-photos failed:", r.error);
  else if (r.deleted) console.info(`purge-photos: deleted ${r.deleted} expired photo(s)${r.more ? ", more waiting" : ""}`);
  return Response.json({ ok: r.ok, deleted: r.deleted, failed: r.failed }, { status: r.ok ? 200 : 500, headers: { "cache-control": "no-store" } });
}

export const GET = run;
export const POST = run;
