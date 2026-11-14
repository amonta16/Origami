import "server-only";
import { geminiStructured } from "@/lib/analysis/gemini";
import { extractFacts, fetchPage, nameMatches, normalizeUrl, type SiteFacts } from "./site";

/**
 * Type-ahead for the owner funnel: "medspa sl" → MedSpa SLO · San Luis Obispo, CA · medspaslo.com.
 *
 * Gemini's free tier can't search Google (grounding returned 429 on our key, Nov 14 2026), so a
 * light model proposes spas from what it knows, and every proposal is checked live: we load the
 * site and keep it only if it answers, looks like a med spa, and carries the spa's name. Models
 * invent plausible spas and domains for short names, so nothing unverified is ever shown.
 * The city is shown only when the site's own text mentions it.
 */
export type SpaSuggestion = { name: string; place: string | null; website: string; host: string; icon: string | null };

const MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]; // light models keep the scan's quota free
const SKIP_HOSTS = /yelp|google|facebook|instagram|vagaro|mindbody|booksy|groupon|realself|linkedin|yellowpages|bbb\.org|mapquest|zocdoc|tiktok/i;
const PARKED = /domain (is )?for sale|buy this domain|this domain (name )?(is|may be) (for sale|parked)|parked (free|domain)|hugedomains|sedo|dan\.com|godaddy.*(parked|for sale)/i;
const SPA_WORDS = /botox|dysport|filler|facial|laser|aesthetic|med ?spa|medical spa|injectable|skin|microneedl|peel|hydrafacial|wellness|iv therapy|coolsculpt/i;

const cache = new Map<string, { at: number; list: SpaSuggestion[] }>();
const siteCache = new Map<string, { at: number; facts: SiteFacts | null }>();
const TTL = 30 * 60 * 1000;

function remember<T>(map: Map<string, { at: number } & T>, key: string, value: Omit<{ at: number } & T, "at">) {
  if (map.size > 400) map.delete(map.keys().next().value!);
  map.set(key, { at: Date.now(), ...value } as { at: number } & T);
}

async function readSite(u: URL): Promise<SiteFacts | null> {
  const key = u.hostname.replace(/^www\./, "");
  const hit = siteCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.facts;
  let facts: SiteFacts | null = null;
  try {
    facts = extractFacts(await fetchPage(u, 3500));
  } catch {
    facts = null;
  }
  remember(siteCache, key, { facts });
  return facts;
}

function verified(f: SiteFacts | null, name: string) {
  if (!f) return false;
  const head = `${f.title} ${f.description} ${f.text.slice(0, 3000)}`;
  if (PARKED.test(head)) return false;
  if (!SPA_WORDS.test(`${head} ${f.text.slice(3000, 9000)}`)) return false;
  return nameMatches(f, name);
}

async function propose(q: string): Promise<Array<{ name: string; city: string; state: string; website: string }>> {
  const schema = {
    type: "object",
    properties: {
      spas: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, city: { type: "string" }, state: { type: "string" }, website: { type: "string" } },
          required: ["name", "city", "state", "website"],
        },
      },
    },
    required: ["spas"],
  };
  for (const model of MODELS) {
    try {
      const out = await geminiStructured<{ spas: Array<{ name: string; city: string; state: string; website: string }> }>({
        model,
        noFallback: true,
        system:
          'You autocomplete US medical spa names while an owner types. The text may stop mid-word ("MedSpa SL" can mean "MedSpa SLO"), may include a city, and may be lowercase or missing spaces. List up to 6 real, currently operating med spas or aesthetic clinics whose name starts with or contains it, most likely first, with the official homepage domain. Never list directories or social profiles. Return fewer when unsure.',
        user: `Typed so far: ${q}`,
        images: [],
        schema,
        temperature: 0,
      });
      return out.data.spas ?? [];
    } catch {
      // quota or overload on this model; try the next light one
    }
  }
  return [];
}

export async function suggestSpas(raw: string): Promise<SpaSuggestion[]> {
  const q = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.list;

  // Typed a website? Check just that.
  const direct = /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(q) ? normalizeUrl(q) : null;
  const proposals = direct ? [{ name: "", city: "", state: "", website: direct.toString() }] : await propose(q);

  const seen = new Set<string>();
  const candidates = proposals
    .map((p) => ({ ...p, url: normalizeUrl(p.website) }))
    .filter((p): p is typeof p & { url: URL } => {
      if (!p.url || SKIP_HOSTS.test(p.url.hostname)) return false;
      const h = p.url.hostname.replace(/^www\./, "");
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    })
    .slice(0, 6);

  const checked = await Promise.all(
    candidates.map(async (p) => {
      const f = await readSite(new URL(p.url.origin));
      const name = p.name || f?.siteName || f?.title.split(/\s[|\-–—]\s/)[0] || "";
      if (!f || !name || !verified(f, name)) return null;
      const place = p.city && f.text.toLowerCase().includes(p.city.toLowerCase()) ? `${p.city}${p.state ? `, ${p.state}` : ""}` : null;
      const s: SpaSuggestion = {
        name: name.trim().slice(0, 60),
        place,
        website: new URL(f.url).origin,
        host: new URL(f.url).hostname.replace(/^www\./, ""),
        icon: f.icons.find((i) => /apple-touch|180|192|png/i.test(i)) ?? f.icons[0] ?? null,
      };
      return s;
    }),
  );
  // two proposed domains can redirect to the same site; keep the first (most likely) name
  const list = checked.filter((x, i, arr): x is SpaSuggestion => Boolean(x) && arr.findIndex((y) => y?.host === x!.host) === i).slice(0, 5);
  remember(cache, key, { list });
  return list;
}
