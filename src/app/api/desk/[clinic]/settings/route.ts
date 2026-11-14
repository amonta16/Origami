import { NextResponse } from "next/server";
import { deskApi, fail, guard, readJson } from "@/lib/desk/access";
import { ALL_JOURNEY_KEYS } from "@/lib/desk/journey";
import { OFFER_KEYS } from "@/lib/offers";
import type { DeskSettings } from "@/lib/desk/types";

type Ctx = { params: Promise<{ clinic: string }> };

/**
 * Desk switches stored in clinics.settings: the skin-scan toggle and journey switches.
 * Needs migration 20261114000500_desk.sql; says so plainly if it hasn't run yet.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await deskApi(params);
  if (ctx instanceof NextResponse) return ctx;
  const { clinic, sb } = ctx;
  return guard(async () => {
    const body = await readJson(req);
    if (!body) return fail(400, "Bad request");

    const cur = await sb.from("clinics").select("settings").eq("id", clinic.id).maybeSingle();
    if (cur.error) {
      if (/settings/.test(cur.error.message)) return fail(409, "This switch needs a database update that hasn't been applied yet (desk settings).");
      return fail(500, cur.error.message);
    }
    const settings: DeskSettings = { ...((cur.data?.settings as DeskSettings | null) ?? {}) };

    if ("scan_enabled" in body) {
      if (typeof body.scan_enabled !== "boolean") return fail(400, "scan_enabled must be on or off.");
      settings.scan_enabled = body.scan_enabled;
    }
    if ("journey" in body) {
      const j = body.journey;
      if (!j || typeof j !== "object" || Array.isArray(j)) return fail(400, "journey must be a set of switches.");
      const next = { ...(settings.journey ?? {}) };
      for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
        if (!ALL_JOURNEY_KEYS.has(k) || typeof v !== "boolean") return fail(400, `Unknown switch: ${k.slice(0, 40)}`);
        next[k] = v;
      }
      settings.journey = next;
    }
    if ("offers" in body) {
      const o = body.offers;
      if (!o || typeof o !== "object" || Array.isArray(o)) return fail(400, "offers must be a set of gifts.");
      const next = { ...(settings.offers ?? {}) };
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (!OFFER_KEYS.has(k) || !v || typeof v !== "object") return fail(400, `Unknown offer: ${k.slice(0, 40)}`);
        const { gift, note } = v as { gift?: unknown; note?: unknown };
        if ((gift !== undefined && typeof gift !== "string") || (note !== undefined && typeof note !== "string")) return fail(400, "Gift and note must be text.");
        next[k] = {
          gift: typeof gift === "string" ? gift.trim().slice(0, 60) : next[k]?.gift,
          note: typeof note === "string" ? note.trim().slice(0, 220) : next[k]?.note,
        };
      }
      settings.offers = next;
    }

    const { error } = await sb.from("clinics").update({ settings }).eq("id", clinic.id);
    if (error) return fail(500, error.message);
    return NextResponse.json({ ok: true, settings });
  });
}
