import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Deletes raw scan photos whose 72-hour window is over (scans.delete_after <= now), unless the
 * patient chose to keep them (keep_photo). Removes the file from the private "scans" bucket,
 * then clears scans.photo_path so nothing points at it. Scores and results (no photo) stay.
 *
 * Safe to run any number of times: it only touches photos that are already due, so calling it
 * early or twice can never delete anything sooner than promised.
 */
export async function purgeExpiredPhotos(limit = 500) {
  const sb = supabaseAdmin();
  if (!sb) return { ok: false as const, error: "database not configured", deleted: 0, failed: 0 };

  const nowIso = new Date().toISOString();
  const { data: due, error } = await sb
    .from("scans")
    .select("id, photo_path")
    .not("photo_path", "is", null)
    .eq("keep_photo", false)
    .lte("delete_after", nowIso)
    .order("delete_after", { ascending: true })
    .limit(limit);
  if (error) return { ok: false as const, error: error.message, deleted: 0, failed: 0 };
  if (!due?.length) return { ok: true as const, deleted: 0, failed: 0, more: false };

  const paths = due.map((r) => r.photo_path as string);
  const removed = await sb.storage.from("scans").remove(paths);
  if (removed.error) return { ok: false as const, error: removed.error.message, deleted: 0, failed: due.length };

  // A path that was already gone from storage counts as deleted too; clear every due row.
  const ids = due.map((r) => r.id as string);
  const cleared = await sb.from("scans").update({ photo_path: null }).in("id", ids).is("keep_photo", false);
  if (cleared.error) return { ok: false as const, error: cleared.error.message, deleted: paths.length, failed: 0 };

  return { ok: true as const, deleted: paths.length, failed: 0, more: due.length === limit };
}
