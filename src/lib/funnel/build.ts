import "server-only";
import { randomInt } from "node:crypto";
import { geminiStructured } from "@/lib/analysis/gemini";
import { supabaseAdmin } from "@/lib/supabase/server";
import { extractFacts, fetchPage, menuLinks, nameMatches, normalizeUrl, type SiteFacts } from "./site";

/**
 * Owner funnel: from "MedSpa SLO, San Luis Obispo" (or a URL) to a branded preview app.
 * 1. find the official site (owner's URL, or Gemini's suggestions verified by fetching them)
 * 2. read the homepage + up to two menu pages
 * 3. Gemini extracts name, about, contact, colors, logo/photo picks and the real treatment menu
 * 4. create a preview clinic (is_preview) with the menu, plus clearly-flagged example plans/rewards
 */
export type BuildStep = "find" | "read" | "menu" | "brand" | "build";
export type BuildEvent =
  | { type: "step"; step: BuildStep; status: "start" | "done"; detail?: string }
  | { type: "need_website"; message: string }
  | { type: "done"; slug: string; clinicId: string; name: string; brand: string | null; treatments: number }
  | { type: "error"; message: string };

const CATS = ["injectables", "skin", "laser", "body", "wellness", "consult"] as const;

type Extracted = {
  name: string;
  tagline: string;
  about: string;
  phone: string;
  address: string;
  city: string;
  booking_url: string;
  brand_color: string;
  logo_index: number;
  hero_index: number;
  treatments: Array<{
    name: string;
    description: string;
    category: (typeof CATS)[number];
    duration_min: number;
    price_dollars: number;
    image_index: number;
    popular: boolean;
  }>;
};

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "The spa's public business name exactly as the site writes it" },
    tagline: { type: "string", description: "Short tagline from the site, max 60 chars, or empty" },
    about: { type: "string", description: "2–3 sentence 'about us' summary in the spa's own words from the site, max 400 chars" },
    phone: { type: "string" },
    address: { type: "string", description: "Street address with city, state, zip if on the site, else empty" },
    city: { type: "string" },
    booking_url: { type: "string", description: "Absolute URL of their online booking page if linked, else empty" },
    brand_color: { type: "string", description: "Hex like #2f6f5e: the spa's primary brand color, chosen from the candidate list; empty if unsure" },
    logo_index: { type: "integer", description: "Index of the logo image in the image list, or -1" },
    hero_index: { type: "integer", description: "Index of the best wide photo of the spa or a treatment for the app's home hero (not a logo, not a face close-up), or -1" },
    treatments: {
      type: "array",
      description: "Treatments/services the spa actually offers per these pages, max 14, most important first. No invented items.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string", description: "One sentence, max 160 chars, plain language" },
          category: { type: "string", enum: [...CATS] },
          duration_min: { type: "integer", description: "Minutes if stated, else 0" },
          price_dollars: { type: "number", description: "Starting price in dollars if stated on the site, else 0" },
          image_index: { type: "integer", description: "Index of a photo clearly about this treatment, or -1" },
          popular: { type: "boolean", description: "True for the 4 headline services" },
        },
        required: ["name", "description", "category", "duration_min", "price_dollars", "image_index", "popular"],
      },
    },
  },
  required: ["name", "tagline", "about", "phone", "address", "city", "booking_url", "brand_color", "logo_index", "hero_index", "treatments"],
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

function shortName(name: string) {
  return name.split(/\s+[|\-–—·]\s+|\s+l\s+/)[0].trim();
}

function fmtPhone(p: string) {
  const d = p.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p.trim() || null;
}

async function tryFetch(u: URL): Promise<SiteFacts | null> {
  try {
    return extractFacts(await fetchPage(u));
  } catch {
    return null;
  }
}

/** Step 1: the owner's URL, or Gemini's best guesses verified against the live site. */
async function findSite(query: string, website: string | null): Promise<SiteFacts | null> {
  const direct = normalizeUrl(website ?? "") ?? (/\.[a-z]{2,}(\/|$)/i.test(query) && !/\s/.test(query.trim()) ? normalizeUrl(query) : null);
  if (direct) return tryFetch(direct);

  const out = await geminiStructured<{ candidates: string[] }>({
    system: "You help find the official website of a US medical spa. Answer only with likely official homepage URLs, best first. Never list directories, Yelp, Google, Facebook, Instagram or booking platforms.",
    user: `Med spa: ${query}\nReturn up to 4 candidate official homepage URLs.`,
    images: [],
    schema: { type: "object", properties: { candidates: { type: "array", items: { type: "string" } } }, required: ["candidates"] },
    temperature: 0.2,
  });
  for (const c of out.data.candidates.slice(0, 4)) {
    const u = normalizeUrl(c);
    if (!u || /yelp|google|facebook|instagram|vagaro|mindbody|booksy|groupon|realself/i.test(u.hostname)) continue;
    const facts = await tryFetch(u);
    if (facts && nameMatches(facts, query)) return facts;
  }
  return null;
}

export async function buildPreview(input: { query: string; website: string | null }, emit: (e: BuildEvent) => void) {
  const sb = supabaseAdmin();
  if (!sb) return emit({ type: "error", message: "The builder isn't connected to a database yet." });

  // 1. find
  emit({ type: "step", step: "find", status: "start", detail: input.query });
  const home = await findSite(input.query, input.website);
  if (!home) {
    return emit({ type: "need_website", message: "We couldn't confirm your website from the name alone. Paste your website and we'll build from it." });
  }
  const host = new URL(home.url).hostname.replace(/^www\./, "");
  emit({ type: "step", step: "find", status: "done", detail: host });

  // 2. read
  emit({ type: "step", step: "read", status: "start", detail: host });
  const extra = (await Promise.all(menuLinks(home).map((l) => tryFetch(new URL(l))))).filter((x): x is SiteFacts => Boolean(x));
  emit({ type: "step", step: "read", status: "done", detail: `${1 + extra.length} page${extra.length ? "s" : ""}` });

  // 3. menu + brand via Gemini
  emit({ type: "step", step: "menu", status: "start" });
  const imgs: Array<{ src: string; alt: string }> = [];
  const pushImg = (src: string | null | undefined, alt: string) => {
    if (src && !imgs.some((i) => i.src === src) && imgs.length < 60) imgs.push({ src, alt });
  };
  home.logoCandidates.forEach((s) => pushImg(s, "logo candidate"));
  pushImg(home.ogImage, "social share image");
  [home, ...extra].forEach((p) => p.images.forEach((im) => pushImg(im.src, im.alt)));
  const colorCands = [...new Set([home.themeColor, ...home.colors, ...extra.flatMap((e) => e.colors)].filter(Boolean))].slice(0, 12);

  const pagesText = [home, ...extra].map((p, i) => `--- PAGE ${i + 1}: ${p.url}\nTITLE: ${p.title}\nDESCRIPTION: ${p.description}\n${p.text.slice(0, i === 0 ? 9000 : 6000)}`).join("\n\n");
  const imgList = imgs.map((im, i) => `[${i}] ${im.alt || "(no alt)"} — ${im.src.split("/").pop()?.slice(0, 80)}`).join("\n");

  let x: Extracted;
  try {
    const out = await geminiStructured<Extracted>({
      system:
        "You read a med spa's own website and fill in their patient app. Use only facts on these pages. Never invent treatments, prices, phone numbers or addresses; leave a field empty (or 0 / -1) when the site doesn't say. Keep the spa's own wording for names.",
      user: `Owner typed: ${input.query}\nSite: ${home.url}\nPhone numbers seen: ${home.phones.join(", ") || "none"}\nBrand color candidates (most used first): ${colorCands.join(", ") || "none"}\n\nIMAGES:\n${imgList || "(none)"}\n\n${pagesText}`,
      images: [],
      schema: EXTRACT_SCHEMA,
      temperature: 0.2,
    });
    x = out.data;
  } catch (e) {
    return emit({ type: "error", message: `We couldn't read the menu (${e instanceof Error ? e.message : "unknown error"}).` });
  }
  const treatments = (x.treatments ?? []).filter((t) => t.name?.trim()).slice(0, 14);
  emit({ type: "step", step: "menu", status: "done", detail: `${treatments.length} treatments` });

  emit({ type: "step", step: "brand", status: "start" });
  const brand = /^#[0-9a-f]{6}$/i.test(x.brand_color ?? "") ? x.brand_color.toLowerCase() : colorCands[0] ?? null;
  const img = (i: number) => (Number.isInteger(i) && i >= 0 && i < imgs.length ? imgs[i].src : null);
  const logo = img(x.logo_index) ?? home.logoCandidates[0] ?? null;
  const hero = img(x.hero_index) ?? home.ogImage ?? null;
  emit({ type: "step", step: "brand", status: "done", detail: brand ?? "neutral" });

  // 4. build
  emit({ type: "step", step: "build", status: "start" });
  const name = (x.name || home.siteName || input.query.split(",")[0]).trim().slice(0, 80);
  const base = slugify(shortName(name)) || "medspa";
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const slug = `${base}-${Array.from({ length: 4 }, () => alphabet[randomInt(0, alphabet.length)]).join("")}`;

  const { data: clinic, error } = await sb
    .from("clinics")
    .insert({
      slug,
      name,
      brand_color: brand,
      logo_url: logo,
      hero_photo_url: hero,
      phone: fmtPhone(x.phone || home.phones[0] || ""),
      address: x.address || null,
      city: x.city || null,
      website: home.url,
      booking_url: normalizeUrl(x.booking_url ?? "")?.toString() ?? null,
      about: x.about || home.description || null,
      is_preview: true,
      source_url: home.url,
      built_at: new Date().toISOString(),
      first_visit_credit_cents: 2500,
    })
    .select("id")
    .single();
  if (error || !clinic) return emit({ type: "error", message: `Couldn't save your app (${error?.message ?? "unknown"}).` });
  const clinicId = clinic.id as string;

  const anyPopular = treatments.some((t) => t.popular);
  if (treatments.length) {
    await sb.from("treatments").insert(
      treatments.map((t, i) => ({
        clinic_id: clinicId,
        name: t.name.trim().slice(0, 80),
        description: t.description?.trim().slice(0, 240) || null,
        category: CATS.includes(t.category) ? t.category : "consult",
        duration_min: t.duration_min > 0 ? Math.round(t.duration_min) : null,
        price_cents: t.price_dollars > 0 ? Math.round(t.price_dollars * 100) : null,
        image_url: img(t.image_index),
        popular: anyPopular ? Boolean(t.popular) : i < 4,
        sort: i + 1,
      })),
    );
  }

  const short = shortName(name);
  await Promise.all([
    sb.from("membership_plans").insert({
      clinic_id: clinicId,
      name: `${short} Membership`,
      tagline: "Member pricing on everything, points on every visit and members-only offers.",
      monthly_price_cents: 9900,
      perks: ["Member pricing on every treatment", "Points on every visit", "Members-only offers and early booking", "Cancel any month"],
      member_discount_pct: 10,
      monthly_points: 100,
      is_example: true,
    }),
    sb.from("rewards").insert(
      [
        ["Free consultation", 100, "A one-on-one skin consultation with our team."],
        ["$25 off any treatment", 300, "Take $25 off your next visit."],
        ["Free add-on", 600, "Add a finishing treatment to any appointment."],
        ["$100 off a package", 1500, "Toward any multi-session package."],
      ].map(([n, pts, d], i) => ({ clinic_id: clinicId, name: n, points_cost: pts, description: d, sort: i + 1, is_example: true })),
    ),
    sb.from("products").insert(
      [5000, 10000, 25000].map((c, i) => ({
        clinic_id: clinicId,
        kind: "gift_card",
        name: `Gift card · $${c / 100}`,
        description: "Good for any treatment or product.",
        price_cents: c,
        sort: i + 1,
      })),
    ),
    sb.from("events").insert({ clinic_id: clinicId, name: "owner_scanner_built", props: { query: input.query.slice(0, 120), site: host, treatments: treatments.length } }),
  ]);
  emit({ type: "step", step: "build", status: "done" });
  emit({ type: "done", slug, clinicId, name, brand, treatments: treatments.length });
}
