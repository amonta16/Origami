/**
 * Automated offers: each one is a moment when the app gives a patient a small, themed gift.
 * Gift and note are defaults the clinic edits in App Builder → Journey → Automated offers.
 * Date-based offers (holidays, summer) also show on the app's home screen during their window
 * when switched on; person-based ones (birthday, anniversary, win-back) wait for texting.
 */
export type OfferTheme =
  | "welcome"
  | "birthday"
  | "new_year"
  | "valentines"
  | "st_patricks"
  | "easter"
  | "summer"
  | "halloween"
  | "black_friday"
  | "christmas"
  | "anniversary"
  | "winback";

/** A date window in a given year, as month/day pairs (Pacific calendar days, inclusive). */
type Window = { from: [number, number]; to: [number, number] };

export type OfferDef = {
  key: string;
  theme: OfferTheme;
  title: string;
  /** when it goes out, in plain words */
  when: string;
  /** home-screen title above the gift ({name} = patient's first name) */
  headline: string;
  /** line under the title */
  subline: string;
  /** small caps line inside the gift */
  label: string;
  /** handwritten tag on the wrapping when the name isn't known */
  tag: string;
  gift: string;
  /** {clinic} is replaced with the clinic's name */
  note: string;
  /** date window when it shows on the home screen; a function for holidays that move */
  window?: (year: number) => Window;
};

const fixed = (m: number, from: number, to: number) => () => ({ from: [m, from] as [number, number], to: [m, to] as [number, number] });

/** Easter Sunday (Gregorian), anonymous algorithm. */
function easter(year: number): [number, number] {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

/** Black Friday: the day after the fourth Thursday of November. */
function blackFriday(year: number): number {
  const first = new Date(Date.UTC(year, 10, 1)).getUTCDay(); // 0 Sun … 4 Thu
  const firstThursday = 1 + ((4 - first + 7) % 7);
  return firstThursday + 21 + 1;
}

const shift = ([m, d]: [number, number], year: number, days: number): [number, number] => {
  const t = new Date(Date.UTC(year, m - 1, d + days));
  return [t.getUTCMonth() + 1, t.getUTCDate()];
};

export const OFFERS: OfferDef[] = [
  { key: "offer_welcome", theme: "welcome", title: "Welcome gift", when: "The moment someone joins the app", headline: "A gift for you", subline: "Thanks for joining. Here's a little welcome…", label: "WELCOME GIFT", tag: "For you", gift: "$25 off your first purchase", note: "Our thank-you for joining. Use it on any treatment or product at {clinic}." },
  { key: "offer_birthday", theme: "birthday", title: "Birthday special", when: "The week of their birthday", headline: "{name}, happy birthday!", subline: "We got you a little gift!", label: "BIRTHDAY GIFT", tag: "Happy birthday!", gift: "100 bonus points", note: "A little something from all of us at {clinic}. Enjoy your week." },
  { key: "offer_anniversary", theme: "anniversary", title: "Client anniversary", when: "A year after they joined", headline: "Happy anniversary, {name}!", subline: "One year with us. Thank you!", label: "ANNIVERSARY GIFT", tag: "One year!", gift: "200 bonus points", note: "Thank you for a year with {clinic}. Here's to the next one." },
  { key: "offer_new_year", theme: "new_year", title: "New Year's", when: "Jan 1 – 7", headline: "Happy New Year!", subline: "New year, new glow. We made you a gift…", label: "NEW YEAR GIFT", tag: "Cheers!", gift: "$20 off any treatment", note: "New year, same you, just a little more glowy. On us at {clinic}.", window: fixed(1, 1, 7) },
  { key: "offer_valentines", theme: "valentines", title: "Valentine's Day", when: "Feb 7 – 14", headline: "It's Valentine's Day!", subline: "We made you a special offer…", label: "VALENTINE'S GIFT", tag: "Be mine", gift: "$25 off lip filler", note: "Treat yourself, or bring a friend. Love, {clinic}.", window: fixed(2, 7, 14) },
  { key: "offer_st_patricks", theme: "st_patricks", title: "St. Patrick's Day", when: "Mar 14 – 17", headline: "Feeling lucky?", subline: "A little luck for your skin…", label: "LUCKY GIFT", tag: "Lucky you", gift: "17% off any facial", note: "A little luck for your skin this week at {clinic}.", window: fixed(3, 14, 17) },
  { key: "offer_easter", theme: "easter", title: "Easter special", when: "Easter week", headline: "Happy Easter!", subline: "We hid a little something for you…", label: "EASTER GIFT", tag: "Hoppy Easter", gift: "15% off any peel", note: "A fresh-start treat for spring from {clinic}.", window: (y) => { const e = easter(y); return { from: shift(e, y, -6), to: e }; } },
  { key: "offer_summer", theme: "summer", title: "Summer skin", when: "Jun 1 – 21", headline: "Summer skin is here", subline: "Get glowing. This one's on us…", label: "SUMMER GIFT", tag: "Sun's out", gift: "Free SPF with any peel", note: "Get summer-ready and keep it protected. From {clinic}.", window: fixed(6, 1, 21) },
  { key: "offer_halloween", theme: "halloween", title: "Halloween", when: "Oct 24 – 31", headline: "Trick or treat!", subline: "No tricks here, just a treat…", label: "HALLOWEEN TREAT", tag: "Boo!", gift: "$31 off any treatment", note: "No tricks, just a treat from {clinic}.", window: fixed(10, 24, 31) },
  { key: "offer_black_friday", theme: "black_friday", title: "Black Friday", when: "Black Friday to Cyber Monday", headline: "It's Black Friday!", subline: "Scratch to reveal your deal…", label: "BLACK FRIDAY DEAL", tag: "For you", gift: "20% off all packages", note: "Our biggest deal of the year, this weekend only at {clinic}.", window: (y) => { const d = blackFriday(y); return { from: [11, d], to: shift([11, d], y, 3) }; } },
  { key: "offer_christmas", theme: "christmas", title: "Christmas", when: "Dec 18 – 25", headline: "Ho! Ho! Ho!", subline: "It's Christmas, we got you some presents!", label: "HOLIDAY GIFT", tag: "Merry & bright", gift: "$25 bonus on a $100 gift card", note: "The easiest gift on the list. Happy holidays from {clinic}.", window: fixed(12, 18, 25) },
  { key: "offer_winback", theme: "winback", title: "We miss you", when: "90 days without a visit", headline: "We miss you, {name}!", subline: "It's been a while. Here's a reason to come back…", label: "COME-BACK GIFT", tag: "Miss you", gift: "$20 off your next visit", note: "It's been a while. Come see us at {clinic}, this one's on us." },
];

export const OFFER_KEYS = new Set(OFFERS.map((o) => o.key));

export type OfferOverride = { gift?: string; note?: string };

/** The offer with the clinic's gift/note and the patient's first name applied. */
export function resolveOffer(def: OfferDef, clinicName: string, override?: OfferOverride, firstName?: string | null) {
  const gift = override?.gift?.trim() || def.gift;
  const note = (override?.note?.trim() || def.note).replaceAll("{clinic}", clinicName);
  const name = firstName?.trim() || "";
  // without a name: "{name}, happy birthday!" → "Happy birthday!", "We miss you, {name}!" → "We miss you!"
  const headline = name
    ? def.headline.replaceAll("{name}", name)
    : def.headline.replace("{name}, ", "").replace(", {name}", "").replace(/^./, (c) => c.toUpperCase());
  return { ...def, gift, note, headline };
}

/** Today's year/month/day in Pacific time. */
function pacificToday(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric", year: "numeric" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

const md = (m: number, d: number) => m * 100 + d;
const label = (year: number, [m, d]: [number, number]) => new Date(Date.UTC(year, m - 1, d, 12)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Days left in a window, counting today (1 on its last day). */
function daysLeft(t: { year: number; month: number; day: number }, to: [number, number]) {
  return Math.round((Date.UTC(t.year, to[0] - 1, to[1]) - Date.UTC(t.year, t.month - 1, t.day)) / 864e5) + 1;
}

/** The switched-on date-based offer whose window includes today, if any. */
export function activeSeasonalOffer(journey: Record<string, boolean> | undefined, now = new Date()) {
  const t = pacificToday(now);
  const today = md(t.month, t.day);
  for (const def of OFFERS) {
    if (!def.window || !journey?.[def.key]) continue;
    const w = def.window(t.year);
    if (today >= md(...w.from) && today <= md(...w.to)) return { def, claimBy: label(t.year, w.to), daysLeft: daysLeft(t, w.to) };
  }
  return null;
}

/** For previews: how long this offer runs (its window's length, or a week for person-based ones). */
export function previewDays(def: OfferDef, year: number) {
  if (!def.window) return 7;
  const w = def.window(year);
  return daysLeft({ year, month: w.from[0], day: w.from[1] }, w.to);
}

/** For previews: the last day of this year's window, or a week from today. */
export function previewClaimBy(def: OfferDef, now = new Date()) {
  const t = pacificToday(now);
  if (def.window) return label(t.year, def.window(t.year).to);
  return new Date(now.getTime() + 7 * 864e5).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
}
