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
const MISS_TTL = 60 * 1000;

function remember<T>(map: Map<string, { at: number } & T>, key: string, value: Omit<{ at: number } & T, "at">) {
  if (map.size > 400) map.delete(map.keys().next().value!);
  map.set(key, { at: Date.now(), ...value } as { at: number } & T);
}

/** Resolves to `fallback` if `p` hasn't settled in `ms` (DNS and redirect hops have no limit of their own). */
function deadline<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      },
    );
  });
}

async function readSite(u: URL): Promise<SiteFacts | null> {
  const key = u.hostname.replace(/^www\./, "");
  const hit = siteCache.get(key);
  // A miss is kept only briefly: one slow load must not hide a real spa for half an hour.
  if (hit && Date.now() - hit.at < (hit.facts ? TTL : MISS_TTL)) return hit.facts;
  const facts = await deadline(
    fetchPage(u, 3500).then((page) => extractFacts(page)),
    4500,
    null,
  );
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
  type Spa = { name: string; city: string; state: string; website: string };
  const ask = (model: string) =>
    geminiStructured<{ spas: Spa[] }>({
      model,
      noFallback: true,
      system:
        'You autocomplete US medical spa names while an owner types. The text may stop mid-word ("MedSpa SL" can mean "MedSpa SLO"), may include a city, and may be lowercase or missing spaces. List up to 6 real, currently operating med spas or aesthetic clinics whose name starts with or contains it, most likely first, with the official homepage domain. Never list directories or social profiles. Return fewer when unsure.',
      user: `Typed so far: ${q}`,
      images: [],
      schema,
      temperature: 0,
    }).then((o) => o.data.spas ?? []);

  // Hedged: the first light model usually answers in ~1 s, but from Vercel it sometimes stalls
  // for 6 s+. If it hasn't answered in 1.2 s (or fails), the second starts; first answer wins.
  return new Promise<Spa[]>((resolve) => {
    let settled = false;
    let failures = 0;
    let started = 0;
    const done = (list: Spa[]) => {
      if (!settled) {
        settled = true;
        resolve(list);
      }
    };
    const start = (i: number) => {
      if (settled || i >= MODELS.length || i < started) return;
      started = i + 1;
      ask(MODELS[i]).then(done, () => {
        failures++;
        if (failures >= MODELS.length) done([]);
        else start(i + 1);
      });
    };
    start(0);
    setTimeout(() => start(1), 1200);
    setTimeout(() => done([]), 8000);
  });
}

/** Website builders' placeholder site names ("Mysite" on Wix) say nothing about the spa. */
const PLACEHOLDER_NAME = /^(my ?site|home|homepage|welcome|untitled|wix|squarespace|wordpress|site)$/i;

/** The spa's name as its own site gives it: og:site_name, else the first part of the <title>. */
function siteDisplayName(f: SiteFacts) {
  const fromTitle = f.title.split(/\s[|\-–—:]\s/)[0]?.trim() ?? "";
  const og = f.siteName.trim();
  const usable = (s: string) => Boolean(s) && !PLACEHOLDER_NAME.test(s) && !/\.[a-z]{2,}$/i.test(s);
  return usable(og) ? og : usable(fromTitle) ? fromTitle : "";
}

const squash = (s: string) => s.toLowerCase().replace(/&|\+/g, "and").replace(/[^a-z0-9]+/g, "");

/**
 * Name to show for a guessed domain: the site's own name when it is clearly the spa that was
 * typed ("Citrine + Sage Aesthetics"), else the typed name in title case, never a tagline like
 * "Experts in Laser Hair Removal".
 */
function guessedName(own: string, q: string) {
  const typed = q.split(/,| in | near /i)[0].trim();
  const o = squash(own);
  const t = squash(typed);
  if (o && t && (o.includes(t) || (t.includes(o) && o.length >= 5))) return own;
  return typed.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Domains the spa is likely to own, built from what was typed ("citrine and sage" →
 * citrineandsage.com, citrineandsageaesthetics.com, …). These catch the small local spas the
 * model has never heard of. They go through the same live check as the model's proposals, and a
 * domain that doesn't exist fails at DNS in a few milliseconds.
 */
function guessDomains(q: string): string[] {
  const [namePart, ...rest] = q.toLowerCase().split(/,| in | near /);
  const s = squash(namePart ?? "");
  if (s.length < 6) return []; // too short to be a name yet ("medsp")
  const city = squash(rest.join(" "));
  const out = [`${s}.com`];
  if (!/spa|aesthetic|skin|clinic|laser|beauty|wellness/.test(s)) out.push(`${s}medspa.com`, `${s}aesthetics.com`);
  if (!s.startsWith("the")) out.push(`the${s}.com`);
  if (city.length >= 3) out.unshift(`${s}${city}.com`);
  out.push(`${s}.net`);
  return [...new Set(out)].slice(0, 5);
}

export async function suggestSpas(raw: string): Promise<SpaSuggestion[]> {
  const q = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.list.length ? TTL : MISS_TTL)) return hit.list;

  type Cand = { name: string; city: string; state: string; website: string; guessed?: boolean };
  const check = async (p: Cand & { url: URL }): Promise<SpaSuggestion | null> => {
    const f = await readSite(new URL(p.url.origin));
    if (!f) return null;
    const own = siteDisplayName(f);
    // A guessed domain has no name from the model: it must match what the owner typed.
    if (p.guessed && !verified(f, q)) return null;
    const name = p.name || own;
    if (!name || !verified(f, p.guessed ? q : name)) return null;
    const place = p.city && f.text.toLowerCase().includes(p.city.toLowerCase()) ? `${p.city}${p.state ? `, ${p.state}` : ""}` : null;
    return {
      name: (p.guessed ? guessedName(own, q) : name).trim().slice(0, 60),
      place,
      website: new URL(f.url).origin,
      host: new URL(f.url).hostname.replace(/^www\./, ""),
      icon: f.icons.find((i) => /apple-touch|180|192|png/i.test(i)) ?? f.icons[0] ?? null,
    };
  };
  const seen = new Set<string>();
  const usable = (list: Cand[]) =>
    list
      .map((p) => ({ ...p, url: normalizeUrl(p.website) }))
      .filter((p): p is Cand & { url: URL } => {
        if (!p.url || SKIP_HOSTS.test(p.url.hostname)) return false;
        const h = p.url.hostname.replace(/^www\./, "");
        if (seen.has(h)) return false;
        seen.add(h);
        return true;
      });

  // Typed a website? Check just that.
  const direct = /^[^\s,]+\.[a-z]{2,}(\/\S*)?$/i.test(q) ? normalizeUrl(q) : null;
  const t0 = Date.now();
  // Guessed domains start loading right away, while the model is still thinking.
  const guessed = direct ? [] : usable(guessDomains(q).map((website) => ({ name: "", city: "", state: "", website, guessed: true })));
  const guessChecks = guessed.map(check);
  const proposals: Cand[] = direct ? [{ name: "", city: "", state: "", website: direct.toString() }] : await propose(q);
  const t1 = Date.now();
  const modelChecks = usable(proposals).slice(0, 6).map(check);

  // Model picks first (most likely first), then any guessed domain the model didn't name.
  const checked = await Promise.all([...modelChecks, ...guessChecks]);
  // two proposed domains can redirect to the same site; keep the first (most likely) name
  const list = checked.filter((x, i, arr): x is SpaSuggestion => Boolean(x) && arr.findIndex((y) => y?.host === x!.host) === i).slice(0, 5);
  console.info(`suggest: ${proposals.length} proposed + ${guessed.length} guessed in ${t1 - t0} ms, ${list.length} verified in ${Date.now() - t1} ms`);
  remember(cache, key, { list });
  return list;
}
