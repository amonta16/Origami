import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Patient-app chrome, per the reference: a top bar with the clinic mark on the left
 * and two icons on the right, and a floating five-tab bottom bar.
 */

export function AppBar({
  title,
  logoUrl,
  right,
  className,
}: {
  title: string;
  logoUrl?: string | null;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex h-14 items-center justify-between px-4 pt-[env(safe-area-inset-top)]", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={title} className="h-7 max-w-[140px] object-contain" />
        ) : (
          <span className="font-display truncate text-[17px]">{title}</span>
        )}
      </div>
      <div className="flex items-center gap-1 text-ink">{right}</div>
    </header>
  );
}

export type TabKey = "home" | "shop" | "scan" | "rewards" | "profile";

const ICONS: Record<TabKey, React.ReactNode> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
  ),
  shop: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M7 12h10" />
    </>
  ),
  rewards: (
    <>
      <path d="M4 10h16v10H4z" />
      <path d="M12 10v10M4 7h16v3H4zM12 7c-1.5 0-3.5-1-3.5-2.5S10 2 12 4c2-2 3.5-1 3.5.5S13.5 7 12 7Z" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
};

export function TabBar({
  active,
  base,
  available = ["home", "shop", "scan", "rewards", "profile"],
  className,
}: {
  active: TabKey;
  /** clinic base path, e.g. /s/sample */
  base: string;
  /** tabs that have a destination this build; others render muted */
  available?: TabKey[];
  className?: string;
}) {
  const tabs: Array<{ key: TabKey; href: string; label: string }> = [
    { key: "home", href: base, label: "Home" },
    { key: "shop", href: `${base}/shop`, label: "Shop" },
    // Center tab is the front-desk check-in code, as in the reference; the AI face scan
    // is the hero card on Home and is linked from the check-in screen too.
    { key: "scan", href: `${base}/visit`, label: "Check in" },
    { key: "rewards", href: `${base}/rewards`, label: "Rewards" },
    { key: "profile", href: `${base}/profile`, label: "Profile" },
  ];
  return (
    <nav
      aria-label="App"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-phone rounded-t-[18px] border-t border-line bg-surface/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_-16px_rgba(17,19,24,.25)] backdrop-blur",
        className,
      )}
    >
      <ul className="flex items-center justify-around">
        {tabs.map((t) => {
          const on = t.key === active;
          const enabled = available.includes(t.key);
          const icon = (
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[t.key]}
            </svg>
          );
          return (
            <li key={t.key}>
              {enabled ? (
                <Link
                  href={t.href}
                  aria-label={t.label}
                  aria-current={on ? "page" : undefined}
                  className={cn("grid size-11 place-items-center rounded-full", on ? "text-ink" : "text-ink-muted/70 hover:text-ink")}
                >
                  {icon}
                </Link>
              ) : (
                <span aria-label={`${t.label} (coming soon)`} className="grid size-11 place-items-center text-ink-muted/35">
                  {icon}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
