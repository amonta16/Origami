/**
 * Automated offers: each one is a moment when the app gives a patient a small, themed gift.
 * Gift and note are defaults the clinic edits in App Builder → Journey → Automated offers.
 * Date-based offers (holidays, summer) also show on the app's home screen during their window
 * when switched on; person-based ones (birthday, anniversary, win-back) wait for texting.
 */
export type OfferTheme = "welcome" | "birthday" | "new_year" | "valentines" | "st_patricks" | "summer" | "halloween" | "christmas" | "anniversary" | "winback";

export type OfferDef = {
  key: string;
  theme: OfferTheme;
  title: string;
  /** when it goes out, in plain words */
  when: string;
  /** home-screen section title */
  headline: string;
  /** small caps line inside the gift */
  label: string;
  /** handwritten tag on the wrapping */
  tag: string;
  gift: string;
  /** {clinic} is replaced with the clinic's name */
  note: string;
  /** date window (Pacific) when it shows on the home screen; month is 1–12 */
  window?: { month: number; from: number; to: number };
};

export const OFFERS: OfferDef[] = [
  { key: "offer_welcome", theme: "welcome", title: "Welcome gift", when: "The moment someone joins the app", headline: "A gift for you", label: "WELCOME GIFT", tag: "For you", gift: "$25 off your first purchase", note: "Our thank-you for joining. Use it on any treatment or product at {clinic}." },
  { key: "offer_birthday", theme: "birthday", title: "Birthday treat", when: "The week of their birthday", headline: "Happy birthday!", label: "BIRTHDAY GIFT", tag: "Happy birthday!", gift: "100 bonus points", note: "A little something from all of us at {clinic}. Enjoy your week." },
  { key: "offer_new_year", theme: "new_year", title: "New Year's", when: "Jan 1 – 7", headline: "Happy New Year", label: "NEW YEAR GIFT", tag: "Cheers!", gift: "$20 off any treatment", note: "New year, same you, just a little more glowy. On us at {clinic}.", window: { month: 1, from: 1, to: 7 } },
  { key: "offer_valentines", theme: "valentines", title: "Valentine's Day", when: "Feb 7 – 14", headline: "Happy Valentine's Day", label: "VALENTINE'S GIFT", tag: "Be mine", gift: "$25 off lip filler", note: "Treat yourself, or bring a friend. Love, {clinic}.", window: { month: 2, from: 7, to: 14 } },
  { key: "offer_st_patricks", theme: "st_patricks", title: "St. Patrick's Day", when: "Mar 14 – 17", headline: "Feeling lucky?", label: "LUCKY GIFT", tag: "Lucky you", gift: "17% off any facial", note: "A little luck for your skin this week at {clinic}.", window: { month: 3, from: 14, to: 17 } },
  { key: "offer_summer", theme: "summer", title: "Summer skin", when: "Jun 1 – 21", headline: "Summer skin is here", label: "SUMMER GIFT", tag: "Sun's out", gift: "Free SPF with any peel", note: "Get summer-ready and keep it protected. From {clinic}.", window: { month: 6, from: 1, to: 21 } },
  { key: "offer_halloween", theme: "halloween", title: "Halloween", when: "Oct 24 – 31", headline: "Trick or treat", label: "HALLOWEEN TREAT", tag: "Boo!", gift: "$31 off any treatment", note: "No tricks, just a treat from {clinic}.", window: { month: 10, from: 24, to: 31 } },
  { key: "offer_christmas", theme: "christmas", title: "Christmas", when: "Dec 18 – 25", headline: "Merry Christmas", label: "HOLIDAY GIFT", tag: "Merry & bright", gift: "$25 bonus on a $100 gift card", note: "The easiest gift on the list. Happy holidays from {clinic}.", window: { month: 12, from: 18, to: 25 } },
  { key: "offer_anniversary", theme: "anniversary", title: "One year with us", when: "A year after they joined", headline: "Happy anniversary", label: "ANNIVERSARY GIFT", tag: "One year!", gift: "200 bonus points", note: "Thank you for a year with {clinic}. Here's to the next one." },
  { key: "offer_winback", theme: "winback", title: "We miss you", when: "90 days without a visit", headline: "We miss you", label: "COME-BACK GIFT", tag: "Miss you", gift: "$20 off your next visit", note: "It's been a while. Come see us at {clinic}, this one's on us." },
];

export const OFFER_KEYS = new Set(OFFERS.map((o) => o.key));

export type OfferOverride = { gift?: string; note?: string };

/** The offer with the clinic's own gift and note applied. */
export function resolveOffer(def: OfferDef, clinicName: string, override?: OfferOverride) {
  const gift = override?.gift?.trim() || def.gift;
  const note = (override?.note?.trim() || def.note).replaceAll("{clinic}", clinicName);
  return { ...def, gift, note };
}

/** Today's month/day in Pacific time. */
function pacificToday(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric", year: "numeric" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** The switched-on date-based offer whose window includes today, if any, with its last day. */
export function activeSeasonalOffer(journey: Record<string, boolean> | undefined, now = new Date()) {
  const t = pacificToday(now);
  const def = OFFERS.find((o) => o.window && journey?.[o.key] && o.window.month === t.month && t.day >= o.window.from && t.day <= o.window.to);
  if (!def?.window) return null;
  const claimBy = new Date(Date.UTC(t.year, def.window.month - 1, def.window.to, 12)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return { def, claimBy };
}
