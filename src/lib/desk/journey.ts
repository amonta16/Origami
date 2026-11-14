/**
 * Journey switches the clinic can turn on now. They're saved to clinics.settings.journey;
 * nothing sends until texting is connected, and the desk says so next to every list.
 */
import { OFFERS } from "@/lib/offers";

export type JourneyItem ={ key: string; title: string; detail: string };
export type JourneyGroup = { title: string; items: JourneyItem[] };

// Offers (with their themed gifts) live in lib/offers.ts; the switches use the same keys.
export const AUTOMATED_OFFERS: JourneyItem[] = OFFERS.map((o) => ({ key: o.key, title: o.title, detail: o.when }));

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
