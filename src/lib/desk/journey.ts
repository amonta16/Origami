/**
 * Journey switches the clinic can turn on now. They're saved to clinics.settings.journey;
 * nothing sends until texting is connected, and the desk says so next to every list.
 */
export type JourneyItem = { key: string; title: string; detail: string };
export type JourneyGroup = { title: string; items: JourneyItem[] };

export const AUTOMATED_OFFERS: JourneyItem[] = [
  { key: "offer_birthday", title: "Birthday treat", detail: "A note and bonus points in the week of their birthday" },
  { key: "offer_anniversary", title: "One year with us", detail: "Thanks on the day they joined, a year later" },
  { key: "offer_welcome", title: "Welcome gift", detail: "Welcome points the moment someone joins the app" },
  { key: "offer_winback", title: "We miss you", detail: "Bonus points for anyone who hasn't visited in 90 days" },
  { key: "offer_holiday", title: "Holiday season", detail: "A December gift-card reminder for people who love the clinic" },
  { key: "offer_summer", title: "Summer skin", detail: "A June nudge toward sunscreen and gentle peels" },
];

export const AUTOMATIONS: JourneyGroup[] = [
  {
    title: "New patients",
    items: [
      { key: "auto_welcome", title: "Welcome series", detail: "Joins the app · same day, day 2, day 7" },
      { key: "auto_scan_followup", title: "After a skin scan", detail: "Finished a scan, didn't book · next morning" },
    ],
  },
  {
    title: "Turning interest into visits",
    items: [
      { key: "auto_request_waiting", title: "Request still waiting", detail: "Asked for a treatment or item, not confirmed yet · 24 hours" },
      { key: "auto_membership_interest", title: "Membership interest", detail: "Second visit as a non-member · day after the visit" },
    ],
  },
  {
    title: "Care and rebooking",
    items: [
      { key: "auto_aftercare", title: "Aftercare check-in", detail: "Checked in for a treatment · next day" },
      { key: "auto_recall", title: "Time for a touch-up", detail: "Treatment's result window is ending · 7 days before it's due" },
      { key: "auto_reward_ready", title: "Reward ready", detail: "Points balance passes a reward · same day" },
    ],
  },
];

export const ALL_JOURNEY_KEYS = new Set([...AUTOMATED_OFFERS.map((i) => i.key), ...AUTOMATIONS.flatMap((g) => g.items.map((i) => i.key))]);
