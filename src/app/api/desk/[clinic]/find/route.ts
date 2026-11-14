import { NextResponse } from "next/server";
import { deskApi, fail, guard, readJson } from "@/lib/desk/access";
import { fullName, maskPhone } from "@/lib/desk/format";

type Ctx = { params: Promise<{ clinic: string }> };

/**
 * Find a patient at the desk by phone, name, 6-digit check-in code, a scanned
 * `facet:checkin:{slug}:{code}` QR payload, or a reward code.
 */
export async function POST(req: Request, { params }: Ctx) {
  const ctx = await deskApi(params);
  if (ctx instanceof NextResponse) return ctx;
  const { clinic, sb } = ctx;
  return guard(async () => {
    const body = await readJson(req);
    let q = typeof body?.q === "string" ? body.q.trim().slice(0, 120) : "";
    if (!q) return fail(400, "Type a phone number, name or code.");

    const qr = /^facet:checkin:([a-z0-9-]+):(\d{6})$/i.exec(q);
    if (qr) {
      if (qr[1].toLowerCase() !== clinic.slug) return fail(400, "That QR code is for a different clinic.");
      q = qr[2];
    } else if (/^facet:/i.test(q)) {
      return fail(400, "That QR code isn't a Facet check-in code.");
    }

    const { data, error } = await sb
      .from("leads")
      .select("id, first_name, last_name, phone, checkin_code")
      .eq("clinic_id", clinic.id)
      .limit(5000);
    if (error) return fail(500, error.message);
    const leads = (data ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null; phone: string | null; checkin_code: string | null }>;

    let matched: typeof leads = [];
    let via: "code" | "reward" | "phone" | "name" = "name";
    const digits = q.replace(/\D/g, "");

    if (/^\d{6}$/.test(q)) {
      matched = leads.filter((l) => l.checkin_code === q);
      via = "code";
    }
    if (!matched.length && /^[A-Za-z0-9]{6}$/.test(q)) {
      const red = await sb.from("reward_redemptions").select("lead_id").eq("clinic_id", clinic.id).eq("code", q.toUpperCase()).limit(1);
      const id = red.data?.[0]?.lead_id as string | undefined;
      if (id) {
        matched = leads.filter((l) => l.id === id);
        via = "reward";
      }
    }
    if (!matched.length && digits.length >= 4 && digits.length === q.replace(/[\s()+.-]/g, "").length) {
      matched = leads.filter((l) => (l.phone ?? "").replace(/\D/g, "").includes(digits));
      via = "phone";
    }
    if (!matched.length && /[a-z]/i.test(q)) {
      const needle = q.toLowerCase();
      matched = leads.filter((l) => fullName(l.first_name, l.last_name).toLowerCase().includes(needle));
      via = "name";
    }

    return NextResponse.json({
      via,
      matches: matched.slice(0, 8).map((l) => ({
        id: l.id,
        name: fullName(l.first_name, l.last_name),
        phone_masked: maskPhone(l.phone),
        checkin_code: l.checkin_code,
      })),
    });
  });
}
