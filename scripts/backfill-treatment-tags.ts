/**
 * One-off: tag treatments that were built from a website before the build pipeline inferred
 * concerns and zones (Sun Nov 15, 2026). Reads the service key from .env.local, never prints it.
 *
 *   node scripts/backfill-treatment-tags.ts            # dry run: prints what would change
 *   node scripts/backfill-treatment-tags.ts --write    # applies the updates
 *
 * Node 22.6+ (type stripping). Only rows whose `concerns` is empty are touched.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { inferTreatmentTags } from "../src/lib/treatments/tags.ts";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be in .env.local");
const write = process.argv.includes("--write");

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await sb.from("treatments").select("id, clinic_id, name, description, category, concerns").eq("concerns", "{}");
if (error) throw error;
let changed = 0;
for (const t of data ?? []) {
  const tags = inferTreatmentTags(t.name, t.description, t.category);
  if (!tags.concerns.length) continue;
  changed++;
  console.log(`${write ? "update" : "would update"}  ${t.name.padEnd(40)} -> ${tags.concerns.join(", ")}`);
  if (write) {
    const { error: e } = await sb.from("treatments").update({ concerns: tags.concerns, zones: tags.zones }).eq("id", t.id);
    if (e) console.error("  failed:", e.message);
  }
}
console.log(`${data?.length ?? 0} untagged treatments, ${changed} ${write ? "updated" : "would be updated"}`);
