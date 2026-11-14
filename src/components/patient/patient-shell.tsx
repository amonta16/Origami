import * as React from "react";
import Link from "next/link";
import { AppBar, Chip, TabBar } from "@/components/ui";
import type { TabKey } from "@/components/ui/app-chrome";
import { ClinicTheme } from "@/components/clinic-theme";
import type { Clinic, Patient } from "@/lib/types";
import { Icon } from "./icons";
import { PatientProvider } from "./patient-provider";

/**
 * Every patient-app screen: clinic theme, top bar (title or clinic mark, search, requests bag),
 * the floating five-tab bar, and the join / item / code sheets.
 */
export function PatientShell({
  clinic,
  patient,
  active,
  title,
  children,
}: {
  clinic: Clinic;
  patient: Patient | null;
  active: TabKey;
  /** inner screens show a title like "Shop"; home shows the clinic mark */
  title?: string;
  children: React.ReactNode;
}) {
  const base = `/s/${clinic.slug}`;
  const openRequests = patient?.requests.filter((r) => r.status === "requested").length ?? 0;
  return (
    <ClinicTheme clinic={clinic}>
      <PatientProvider
        clinicSlug={clinic.slug}
        clinicName={clinic.name}
        welcomePoints={clinic.welcome_points ?? 100}
        signedIn={Boolean(patient)}
        isMember={Boolean(patient?.plan)}
      >
        <div className="mx-auto w-full max-w-phone pb-28">
          <AppBar
            title={title ?? clinic.name}
            logoUrl={title ? null : clinic.logo_url}
            className={title ? "[&_span.font-display]:text-[20px]" : undefined}
            right={
              <>
                {clinic.is_sample && <Chip className="mr-1 h-6 text-[11px]">Sample clinic</Chip>}
                {clinic.is_preview && <Chip tone="brand" className="mr-1 h-6 text-[11px]">Preview</Chip>}
                <Link href={`${base}/shop?tab=treatments`} aria-label="Search treatments" className="grid size-10 place-items-center rounded-full hover:bg-surface-muted">
                  <Icon name="search" className="size-[21px]" />
                </Link>
                <Link href={`${base}/profile#requests`} aria-label={`My requests${openRequests ? ` (${openRequests} open)` : ""}`} className="relative grid size-10 place-items-center rounded-full hover:bg-surface-muted">
                  <Icon name="bag" className="size-[21px]" />
                  {openRequests > 0 && (
                    <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white">
                      {openRequests}
                    </span>
                  )}
                </Link>
              </>
            }
          />
          {children}
        </div>
        <TabBar active={active} base={base} />
      </PatientProvider>
    </ClinicTheme>
  );
}

/** Underlined tab row used on Shop (Browse / Memberships / Treatments). */
export function TopTabs({ tabs, active }: { tabs: Array<{ key: string; label: string; href: string }>; active: string }) {
  return (
    <nav aria-label="Sections" className="sticky top-0 z-30 grid border-b border-line bg-white/95 backdrop-blur" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={on ? "border-b-2 border-ink py-3 text-center text-[13px] font-medium text-ink" : "border-b-2 border-transparent py-3 text-center text-[13px] text-ink-muted hover:text-ink"}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SectionTitle({ children, action, center }: { children: React.ReactNode; action?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "flex justify-center" : "flex items-baseline justify-between"}>
      <h2 className="font-display text-[19px]">{children}</h2>
      {action}
    </div>
  );
}
