"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { DeskIcon, type DeskIconName } from "./icons";

type NavItem = { href: string; label: string; icon: DeskIconName };

function navFor(slug: string): { main: NavItem[]; lower: NavItem[] } {
  const b = `/desk/${slug}`;
  return {
    main: [
      { href: b, label: "Home", icon: "home" },
      { href: `${b}/check-in`, label: "Check in", icon: "checkin" },
      { href: `${b}/clients`, label: "Client profiles", icon: "user" },
      { href: `${b}/due`, label: "Patients due", icon: "clock" },
      { href: `${b}/orders`, label: "Shop orders", icon: "bag" },
      { href: `${b}/scans`, label: "Skin scans", icon: "scan" },
      { href: `${b}/insights`, label: "Insights", icon: "chart" },
      { href: `${b}/memberships`, label: "Memberships", icon: "repeat" },
      { href: `${b}/builder`, label: "App Builder", icon: "sparkle" },
    ],
    lower: [
      { href: `${b}/payouts`, label: "Payouts", icon: "wallet" },
      { href: `${b}/billing`, label: "Billing", icon: "card" },
    ],
  };
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/atlas-engine-bird.png" alt="" width={28} height={28} className="size-7" />
      <span className="font-brand-serif text-[22px]">Origami</span>
    </span>
  );
}

function NavList({ items, pathname, home, onNavigate, small }: { items: NavItem[]; pathname: string; home: string; onNavigate?: () => void; small?: boolean }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((it) => {
        const active = it.href === home ? pathname === home : pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[10px] border px-3 transition-colors",
                small ? "h-9 text-[13px]" : "h-10 text-[14px]",
                active ? "border-line bg-surface font-medium text-brand shadow-soft" : "border-transparent text-ink-soft hover:bg-surface/70 hover:text-ink",
              )}
            >
              <DeskIcon name={it.icon} className={small ? "size-4" : "size-[18px]"} />
              <span className="flex-1">{it.label}</span>
              {active && <DeskIcon name="chevron" className="size-3.5" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function HelpBox() {
  return (
    <div className="rounded-card bg-brand-soft p-4">
      <p className="text-[14px] font-medium">Need help?</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">Origami is a student hackathon build. Find the team at the demo table and we&rsquo;ll walk you through it.</p>
      <Link href="/" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand">
        How Origami works <DeskIcon name="chevron" className="size-3" />
      </Link>
    </div>
  );
}

export function DeskSidebar({ slug, clinicName, isSample }: { slug: string; clinicName: string; isSample: boolean }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = React.useState(false);
  const nav = navFor(slug);
  const home = `/desk/${slug}`;
  const close = () => setOpen(false);

  const footer = (
    <div className="flex flex-col gap-3">
      <p className="truncate rounded-[10px] bg-surface px-3 py-2 text-[13px] font-medium shadow-soft" title={clinicName}>
        {clinicName}
      </p>
      <HelpBox />
      {isSample && (
        <span className="inline-flex h-6 w-fit items-center rounded-chip border border-line-strong bg-surface px-2.5 text-[11px] font-medium text-ink-soft">Sample clinic · demo</span>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop and tablet sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 overflow-y-auto border-r border-line bg-page px-3 py-5 md:flex">
        <Link href={home} className="px-2">
          <Wordmark />
        </Link>
        <nav aria-label="Front desk" className="flex flex-col gap-6">
          <NavList items={nav.main} pathname={pathname} home={home} />
          <div className="border-t border-line pt-4">
            <NavList items={nav.lower} pathname={pathname} home={home} small />
          </div>
        </nav>
        <div className="mt-auto">{footer}</div>
      </aside>

      {/* Phone top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-page/95 px-4 backdrop-blur md:hidden">
        <Link href={home}>
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="desk-mobile-nav"
          className="grid size-10 place-items-center rounded-full border border-line bg-surface"
        >
          <DeskIcon name={open ? "close" : "menu"} />
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
      {open && (
        <div id="desk-mobile-nav" className="fixed inset-x-0 top-14 bottom-0 z-30 overflow-y-auto bg-page px-4 pb-8 pt-3 md:hidden">
          <nav aria-label="Front desk" className="flex flex-col gap-4">
            <NavList items={nav.main} pathname={pathname} home={home} onNavigate={close} />
            <div className="border-t border-line pt-3">
              <NavList items={nav.lower} pathname={pathname} home={home} onNavigate={close} small />
            </div>
          </nav>
          <div className="mt-6">{footer}</div>
        </div>
      )}
    </>
  );
}
