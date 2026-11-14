/** Formatting helpers for the front desk. Safe on server and client. */

export const TZ = "America/Los_Angeles";

export function fullName(first: string | null | undefined, last?: string | null) {
  const n = [first, last].filter((s) => s && s.trim()).join(" ").trim();
  return n || "No name yet";
}

/** "(•••) •••-0142". Keeps the last four digits only. */
export function maskPhone(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "No phone";
  return `(•••) •••-${d.slice(-4)}`;
}

export function monogram(name: string) {
  const letters = name.replace(/[^a-zA-Z ]/g, "").trim();
  if (!letters) return "··";
  const parts = letters.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : letters.slice(0, 2)).toUpperCase();
}

const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function fmtDate(iso: string | null | undefined) {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}
export function fmtShort(iso: string | null | undefined) {
  return iso ? shortFmt.format(new Date(iso)) : "—";
}
export function fmtDateTime(iso: string | null | undefined) {
  return iso ? timeFmt.format(new Date(iso)) : "—";
}

/** Wall-clock parts in Pacific time. */
export function pacificParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    weekday: get("weekday"), // Mon, Tue, ...
  };
}

export function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "due again in 12 wk" style label for a result window in days. */
export function recallLabel(days: number | null | undefined) {
  if (!days) return "no recall set";
  if (days < 14) return `due again in ${days} days`;
  if (days < 120) return `due again in ${Math.round(days / 7)} wk`;
  return `due again in ${Math.round(days / 30)} mo`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  injectables: "Injectables",
  skin: "Skin",
  laser: "Laser",
  body: "Body",
  wellness: "Wellness",
  consult: "Consult",
};

export const PRODUCT_KIND_LABEL: Record<string, string> = {
  package: "Package",
  skincare: "Skincare",
  gift_card: "Gift card",
};

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** Dollars text ("45", "45.50", "$1,200") to cents. "" means null; NaN means invalid. */
export function dollarsToCents(v: string): number | null {
  const s = v.replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

export function centsToDollars(c: number | null | undefined) {
  if (c == null) return "";
  return c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2);
}
