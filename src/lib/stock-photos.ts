import type { Clinic, Treatment } from "@/lib/types";

/**
 * Stock photos that fill a clinic's empty photo slots (no treatment photo, no home photo, or a
 * scraped photo that fails to load). All are free under the Unsplash License, hotlinked from
 * Unsplash's CDN, picked by hand on Sat Nov 14 2026 and listed in CREDITS.md. They show generic
 * treatments and rooms, never before/after results, and the app says they are stock photos.
 */
const u = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;

const POOLS = {
  injectables: ["1746708810803-722593e53772", "1785861485926-93a13556d656", "1761819921052-2c34973e012c", "1785861084191-3600dfc2a6d6"],
  lips: ["1654374504608-67c4cfe65fca", "1785861084191-3600dfc2a6d6"],
  threads: ["1761819922656-d1b77eef49c0"],
  microneedling: ["1761819920857-7edc5e808fd3"],
  facial: ["1570172619644-dfd03ed5d881", "1552693673-1bf958298935", "1616394584738-fc6e612e71b9", "1731514771613-991a02407132", "1643684391140-c5056cfd3436", "1761718209835-c8586b7dcac0"],
  peel: ["1713085085470-fba013d67e65", "1761718209708-9ab9ba1c7252"],
  laser: ["1785861775561-c6db7da314a0", "1785861433534-8cd4c7b994fa", "1700760933574-9f0f4ea9aa3b"],
  body: ["1761819922058-d15028ed9817", "1741522509438-a120c0bb5e88"],
  wellness: ["1763310225009-50214e3c99d9", "1600334089648-b0d9d3028eb2", "1741522509438-a120c0bb5e88"],
  skincare: ["1608571423902-eed4a5ad8108", "1787569499510-ef18cc7ba7a5", "1552046122-03184de85e08", "1620916297397-a4a5402a3c6c"],
  consult: ["1655026392641-bf283a5f12d4", "1582004531597-6407189db7dd"],
  rooms: ["1773924093206-9a433a14bb44", "1693578538512-fc66f318c833", "1781513144825-aa1e284c5950"],
} as const;

type Pool = keyof typeof POOLS;

/** Name keywords first (most specific), then the menu category. */
const RULES: Array<[RegExp, Pool]> = [
  [/lip|kybella|chin filler/i, "lips"],
  [/thread|pdo/i, "threads"],
  [/micro.?needl|prp|vampire|morpheus|rf needl|potenza|vivace/i, "microneedling"],
  [/peel|dermaplan|vi peel/i, "peel"],
  [/laser|ipl|bbl|photofacial|hair removal|resurfac|co2|halo|moxi|clear ?\+ ?brilliant|tattoo/i, "laser"],
  [/botox|dysport|xeomin|daxxify|jeuveau|\btox|filler|juvederm|restylane|sculptra|radiesse|inject|neuro/i, "injectables"],
  [/facial|hydra|glow|extraction|oxygen|led|microderm|acne/i, "facial"],
  [/skin ?care|product|serum|cream|zo |skinceutical|obagi|retin|spf|plan/i, "skincare"],
  [/coolsculpt|sculpt|contour|emsculpt|body|cellulite|tighten|fat/i, "body"],
  [/\biv\b|drip|vitamin|b12|nad|weight|semaglutide|tirzepatide|hormone|wellness|massage/i, "wellness"],
  [/consult|assessment|analysis|evaluation/i, "consult"],
];
const BY_CATEGORY: Record<string, Pool> = { injectables: "injectables", skin: "facial", laser: "laser", body: "body", wellness: "wellness", consult: "consult" };

function poolFor(t: Pick<Treatment, "name" | "category">): Pool {
  for (const [re, pool] of RULES) if (re.test(t.name)) return pool;
  return BY_CATEGORY[t.category ?? ""] ?? "facial";
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Gives every treatment a photo. Treatments with the clinic's own photo keep it and get a stock
 * fallback for when it fails to load. Empty ones get a stock photo matched to the treatment,
 * walking each pool in order (offset per clinic) so neighbors rarely repeat.
 */
export function withStockPhotos<T extends Treatment>(clinicId: string, list: T[]): T[] {
  const offset = hash(clinicId);
  const used: Partial<Record<Pool, number>> = {};
  return list.map((t) => {
    const pool = poolFor(t);
    const n = used[pool] ?? 0;
    used[pool] = n + 1;
    const ids = POOLS[pool];
    const stock = u(ids[(offset + n) % ids.length]);
    return t.image_url ? { ...t, image_fallback: stock } : { ...t, image_url: stock, image_is_stock: true };
  });
}

/** Skincare and packages get stock photos too; gift cards keep their brand-color tile. */
export function withProductPhotos<T extends { kind: string; name: string; image_url: string | null }>(clinicId: string, list: T[]) {
  const offset = hash(clinicId);
  const used: Partial<Record<Pool, number>> = {};
  return list.map((p): T & { image_is_stock?: boolean; image_fallback?: string } => {
    if (p.kind === "gift_card") return p;
    const pool: Pool = p.kind === "skincare" ? "skincare" : poolFor({ name: p.name, category: undefined });
    const n = used[pool] ?? 0;
    used[pool] = n + 1;
    const ids = POOLS[pool];
    const stock = u(ids[(offset + n) % ids.length], 700);
    return p.image_url ? { ...p, image_fallback: stock } : { ...p, image_url: stock, image_is_stock: true };
  });
}

/** Home hero and About photos: the clinic's own when it has one, else two different stock rooms. */
export function clinicPhotos(clinic: Pick<Clinic, "id" | "hero_photo_url">) {
  const rooms = POOLS.rooms;
  const i = hash(clinic.id) % rooms.length;
  const stockHero = u(rooms[i], 1200);
  const stockAbout = u(rooms[(i + 1) % rooms.length], 1200);
  const own = clinic.hero_photo_url || null;
  return {
    hero: own ?? stockHero,
    heroFallback: stockHero,
    heroIsStock: !own,
    about: own ?? stockAbout,
    aboutFallback: stockAbout,
  };
}

export function anyStock(list: Array<{ image_is_stock?: boolean }>, heroIsStock = false) {
  return heroIsStock || list.some((t) => t.image_is_stock);
}
