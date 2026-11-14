import * as React from "react";
import type { TreatmentCategory } from "@/lib/types";

/** Line icons for the patient app, drawn for Facet on a 24px grid, 1.6 stroke. */
const paths = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  gift: (
    <>
      <path d="M4 10h16v10H4z" />
      <path d="M12 10v10M3 7h18v3H3zM12 7c-1.5 0-4-1-4-2.5S10 2 12 4.5C14 2 16 3 16 4.5S13.5 7 12 7Z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2" />
    </>
  ),
  phone: <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L16 13l4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 6a2 2 0 0 1 2-2Z" />,
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  homescreen: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M12 8v6M9 11h6" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  sparkle: <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  face: (
    <>
      <path d="M12 3c4 0 6.5 3 6.5 7.5S16 21 12 21 5.5 15 5.5 10.5 8 3 12 3Z" />
      <path d="M9.5 10h.01M14.5 10h.01M10 15c1.2.8 2.8.8 4 0" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 16h5" />
    </>
  ),
  // categories
  injectables: (
    <>
      <path d="m14 4 6 6M16 6l-9.5 9.5L5 19l3.5-1.5L18 8" />
      <path d="m9 11 4 4M3 21l2-2" />
    </>
  ),
  skin: (
    <>
      <path d="M4 8c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 4-1.5" />
      <path d="M4 12.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 4-1.5" />
      <path d="M6 17h.01M10 17.5h.01M14 17h.01M18 17.5h.01" />
    </>
  ),
  laser: (
    <>
      <path d="M4 20 15 9" />
      <path d="M15 9l3-3 1 1-3 3" />
      <path d="M8 6h.01M11 4h.01M19 13h.01M20 17h.01M17 10.5l2.5 1" />
    </>
  ),
  body: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M8 21l1.5-7L7 10l5-2 5 2-2.5 4L16 21" />
    </>
  ),
  wellness: (
    <>
      <path d="M4 7c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 4-1.5" />
      <path d="M4 11.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 4-1.5" />
      <path d="M4 16c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 4-1.5" />
      <path d="M7 20h.01M12 20.5h.01M17 20h.01" />
    </>
  ),
  consult: (
    <>
      <path d="M5 5h14v10H10l-4 4v-4H5z" />
      <path d="M9 9h6M9 12h4" />
    </>
  ),
  package: (
    <>
      <path d="M4 8 12 4l8 4v8l-8 4-8-4z" />
      <path d="m4 8 8 4 8-4M12 12v8" />
    </>
  ),
  skincare: (
    <>
      <rect x="8" y="9" width="8" height="12" rx="2" />
      <path d="M10 9V6h4v3M11 3h2v3h-2z" />
    </>
  ),
  gift_card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M8 6v12" />
    </>
  ),
} satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-[22px]", strokeWidth = 1.6 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export const CATEGORY_LABEL: Record<TreatmentCategory, string> = {
  injectables: "Injectables",
  skin: "Skin",
  laser: "Laser",
  body: "Body",
  wellness: "Wellness",
  consult: "Consult",
};
