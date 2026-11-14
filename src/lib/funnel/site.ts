import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Reads a med spa's public website for the owner funnel.
 * Safety: http(s) only, no private/loopback/link-local addresses (checked after DNS and on
 * every redirect), 8 s timeout, 1.5 MB cap. We only read pages; nothing is submitted.
 */
const MAX_BYTES = 1_500_000;
const UA = "Mozilla/5.0 (compatible; AtlasEnginePreviewBot/0.1; student hackathon project)";

function privateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
function privateV6(ip: string) {
  const x = ip.toLowerCase();
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80") || x.startsWith("::ffff:127.") || x.startsWith("::ffff:10.") || x.startsWith("::ffff:192.168.");
}

async function assertPublic(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) websites");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new Error("Not a public website");
  const ips = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  for (const { address, family } of ips) {
    if ((family === 4 && privateV4(address)) || (family === 6 && privateV6(address))) throw new Error("Not a public website");
  }
}

export function normalizeUrl(input: string): URL | null {
  const s = input.trim();
  if (!s || /\s/.test(s)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!u.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

export type FetchedPage = { url: string; html: string };

export async function fetchPage(start: URL, timeoutMs = 8000): Promise<FetchedPage> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error(`Redirect without location (${res.status})`);
      url = new URL(loc, url);
      continue;
    }
    if (!res.ok) throw new Error(`Website answered ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!/html/i.test(type)) throw new Error("That address isn't a web page");
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Empty page");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return { url: url.toString(), html: Buffer.concat(chunks).toString("utf8") };
  }
  throw new Error("Too many redirects");
}

/* ------------------------------------------------------------ extraction */

export type SiteFacts = {
  url: string;
  title: string;
  description: string;
  siteName: string;
  ogImage: string | null;
  themeColor: string | null;
  icons: string[];
  logoCandidates: string[];
  images: Array<{ src: string; alt: string }>;
  links: Array<{ href: string; text: string }>;
  colors: string[];
  text: string;
  phones: string[];
};

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

function attr(tag: string, name: string) {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : "";
}

function abs(href: string, base: string) {
  try {
    const u = new URL(href, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function meta(html: string, key: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`, "i");
  const tag = re.exec(html)?.[0];
  return tag ? attr(tag, "content") : "";
}

export function extractFacts(page: FetchedPage): SiteFacts {
  const { html, url } = page;
  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "");
  const ogImage = abs(meta(html, "og:image") || meta(html, "twitter:image"), url);
  const themeColor = meta(html, "theme-color") || null;

  const icons = [...html.matchAll(/<link[^>]+rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*>/gi)]
    .map((m) => abs(attr(m[0], "href"), url))
    .filter((x): x is string => Boolean(x));

  const images: SiteFacts["images"] = [];
  const logoCandidates: string[] = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const raw = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-lazy-src") || (attr(tag, "srcset").split(",")[0] ?? "").trim().split(/\s+/)[0];
    const src = raw && !raw.startsWith("data:") ? abs(raw, url) : null;
    if (!src) continue;
    const alt = attr(tag, "alt");
    const cls = `${attr(tag, "class")} ${attr(tag, "id")} ${src}`;
    if (/logo/i.test(cls) || /logo/i.test(alt)) logoCandidates.push(src);
    else if (!/icon|sprite|pixel|tracking|badge|svg$/i.test(src)) images.push({ src, alt });
  }

  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: abs(decode(m[1]), url), text: decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() }))
    .filter((l): l is { href: string; text: string } => Boolean(l.href) && l.text.length > 0 && l.text.length < 60);

  // Brand color candidates: hex colors in <style> and style="" weighted by frequency, minus near-neutrals.
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n") + [...html.matchAll(/style\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join("\n");
  const counts = new Map<string, number>();
  for (const m of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let h = m[1].toLowerCase();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 28 || max < 40 || min > 225) continue; // grays, near-black, near-white
    counts.set(`#${h}`, (counts.get(`#${h}`) ?? 0) + 1);
  }
  const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);

  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h\d|\/section)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 14000);

  const phones = [...new Set([...text.matchAll(/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g)].map((m) => m[0]))].slice(0, 3);

  return {
    url,
    title,
    description: meta(html, "description") || meta(html, "og:description"),
    siteName: meta(html, "og:site_name"),
    ogImage,
    themeColor: /^#[0-9a-f]{6}$/i.test(themeColor ?? "") ? themeColor : null,
    icons: [...new Set(icons)].slice(0, 5),
    logoCandidates: [...new Set(logoCandidates)].slice(0, 5),
    images: images.filter((im, i, arr) => arr.findIndex((x) => x.src === im.src) === i).slice(0, 40),
    links,
    colors,
    text,
    phones,
  };
}

/** Pages worth reading for the menu: services, treatments, menu, pricing. */
export function menuLinks(f: SiteFacts, max = 2) {
  const host = new URL(f.url).hostname;
  return f.links
    .filter((l) => {
      try {
        return new URL(l.href).hostname === host && /service|treatment|menu|pric|injectable|facial|laser|skin|wellness/i.test(`${l.text} ${l.href}`);
      } catch {
        return false;
      }
    })
    .map((l) => l.href.split("#")[0])
    .filter((h, i, arr) => arr.indexOf(h) === i && h !== f.url)
    .slice(0, max);
}

/** Does this page plausibly belong to the spa the owner typed? */
export function nameMatches(f: SiteFacts, query: string) {
  const generic = new Set(["med", "spa", "medspa", "medical", "aesthetics", "aesthetic", "clinic", "the", "and", "of", "beauty", "skin", "wellness", "laser", "center", "studio", "llc", "inc", "ca", "california"]);
  // Only the name part counts ("MedSpa SLO, San Luis Obispo" → "medspa slo"), so another spa in
  // the same city can't pass on the city name alone.
  const namePart = query.split(/,| in | near /i)[0];
  const tokens = namePart
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !generic.has(t));
  const head = `${f.title} ${f.siteName} ${new URL(f.url).hostname}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const squashedHead = head.replace(/\s+/g, "");
  if (!tokens.length) {
    // Name made only of generic words: require the whole squashed name in title/domain.
    const squashed = namePart.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return squashed.length >= 5 && squashedHead.includes(squashed);
  }
  const hay = `${head} ${f.text.slice(0, 4000).toLowerCase()}`;
  const inHead = tokens.some((t) => head.includes(t) || squashedHead.includes(t));
  return inHead && tokens.filter((t) => hay.includes(t)).length >= Math.min(2, tokens.length);
}
