import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui";
import { PatientShell } from "@/components/patient/patient-shell";
import { JoinButton } from "@/components/patient/patient-provider";
import { AddToHomeRow, NotificationsToggle, SignOutRow } from "@/components/patient/actions";
import { Icon, type IconName } from "@/components/patient/icons";
import { loadPatientPage } from "@/lib/patient/load";
import { money } from "@/lib/money";

export const metadata = { title: "Profile" };

export default function ProfilePage({ params }: PageProps<"/s/[clinic]/profile">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Profile params={params} />
    </Suspense>
  );
}

const rowCls = "flex w-full items-center gap-3 px-4 py-3.5 text-left text-[14px] hover:bg-surface-muted/60";

function Row({ icon, label, sub, right, href }: { icon: IconName; label: string; sub?: string; right?: ReactNode; href?: string }) {
  const inner = (
    <>
      <Icon name={icon} className="size-[18px] shrink-0 text-ink-soft" />
      <span className="min-w-0">
        <span className="block">{label}</span>
        {sub && <span className="block text-[12px] text-ink-muted">{sub}</span>}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2 text-[12px] text-ink-muted">{right ?? <Icon name="chevron" className="size-4" />}</span>
    </>
  );
  if (!href) return <div className={rowCls}>{inner}</div>;
  return href.startsWith("/") ? (
    <Link href={href} className={rowCls}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={rowCls}>
      {inner}
    </a>
  );
}

function maskPhone(p: string | null) {
  const d = (p ?? "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) •••-${d.slice(6)}` : null;
}

async function Profile({ params }: { params: PageProps<"/s/[clinic]/profile">["params"] }) {
  const { clinic: slug } = await params;
  const { clinic, patient, base } = await loadPatientPage(slug);
  const tel = clinic.phone?.replace(/[^\d+]/g, "");

  return (
    <PatientShell clinic={clinic} patient={patient} active="profile" title="Profile">
      {/* identity card */}
      <section className="px-3 pt-2">
        {!patient ? (
          <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
            <h1 className="font-display text-[19px]">Sign in to {clinic.name}</h1>
            <p className="mt-1.5 text-[13px] leading-snug text-ink-muted">Earn points every visit, join a membership and book in seconds.</p>
            <JoinButton full size="lg" className="mt-4" reason="Your card holds your points, rewards and check-in code.">
              Sign up or log in
            </JoinButton>
          </div>
        ) : (
        <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-[18px] font-medium text-white">
              {patient?.first_name?.[0]?.toUpperCase() ?? <Icon name="user" className="size-5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[17px] font-medium">{patient?.first_name ?? "Guest"}</p>
              <p className="text-[13px] text-ink-muted">{patient ? maskPhone(patient.phone) ?? "Your phone number" : `Not joined ${clinic.name} yet`}</p>
            </div>
          </div>
          {patient ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-field bg-surface-muted p-3">
                <p className="text-[11px] font-medium tracking-[0.08em] text-ink-muted">POINTS</p>
                <p className="mt-0.5 text-[16px] font-medium">{patient.points.toLocaleString()}</p>
              </div>
              <div className="rounded-field bg-surface-muted p-3">
                <p className="text-[11px] font-medium tracking-[0.08em] text-ink-muted">MEMBERSHIP</p>
                <p className="mt-0.5 truncate text-[16px] font-medium">{patient.plan?.name ?? "Not a member"}</p>
              </div>
            </div>
          ) : null}
        </div>
        )}
      </section>

      {/* rows */}
      <section className="px-3 pt-4">
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {patient?.plan ? (
            <Row icon="sparkle" label={`${patient.plan.name} membership`} sub={money(patient.plan.monthly_price_cents, { perMonth: true })} href={`${base}/shop?tab=memberships`} />
          ) : (
            <Row icon="user" label="Become a member" href={`${base}/shop?tab=memberships`} />
          )}
          {patient && <Row icon="qr" label="My check-in code" href={`${base}/visit`} right={<><span className="tracking-[0.15em]">{patient.checkin_code}</span><Icon name="chevron" className="size-4" /></>} />}
          <Row icon="face" label="AI face scan" sub="Skin score and treatment previews" href={`${base}/scan`} />
          {patient && (
            <div className={rowCls}>
              <Icon name="bell" className="size-[18px] shrink-0 text-ink-soft" />
              <span>
                <span className="block">Text reminders</span>
                <span className="block text-[12px] text-ink-muted">Appointments, touch-ups and offers</span>
              </span>
              <span className="ml-auto">
                <NotificationsToggle initial={patient.notifications} />
              </span>
            </div>
          )}
          <AddToHomeRow className={rowCls}>
            <Icon name="homescreen" className="size-[18px] shrink-0 text-ink-soft" />
            <span>Add the app to your phone</span>
            <Icon name="chevron" className="ml-auto size-4 text-ink-muted" />
          </AddToHomeRow>
          {clinic.booking_url && <Row icon="calendar" label="Book online" href={clinic.booking_url} />}
          {tel && <Row icon="phone" label={`Call ${clinic.name}`} sub={clinic.phone ?? undefined} href={`tel:${tel}`} />}
          {patient && (
            <SignOutRow className={rowCls}>
              <Icon name="logout" className="size-[18px] shrink-0 text-ink-soft" />
              <span>Sign out on this phone</span>
              <Icon name="chevron" className="ml-auto size-4 text-ink-muted" />
            </SignOutRow>
          )}
        </div>
      </section>

      {/* requests */}
      {patient && (
        <section id="requests" className="scroll-mt-4 px-3 pt-6">
          <h2 className="font-display px-1 text-[17px]">My requests</h2>
          {patient.requests.length ? (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {patient.requests.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon name={r.kind === "membership" ? "sparkle" : r.kind === "treatment" ? "calendar" : "bag"} className="size-[18px] shrink-0 text-ink-soft" />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px]">{r.item_name}</span>
                    <span className="block text-[12px] text-ink-muted">
                      {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {r.price_cents != null && ` · ${money(r.price_cents, { perMonth: r.kind === "membership" })}`}
                    </span>
                  </span>
                  <Chip tone={r.status === "confirmed" ? "ok" : r.status === "cancelled" ? "outline" : "brand"} className="ml-auto h-6 shrink-0 text-[11px]">
                    {r.status === "requested" ? "Waiting for clinic" : r.status === "confirmed" ? "Confirmed" : "Cancelled"}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-card bg-surface-muted p-4 text-[14px] leading-snug text-ink-muted">
              Nothing yet. Requests you send from the shop show up here until the front desk confirms them.
            </p>
          )}
        </section>
      )}

      <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-6 pt-8 text-[12px] text-ink-muted">
        <Link href={`${base}/legal#terms`} className="hover:text-ink">Terms</Link>
        <Link href={`${base}/legal#privacy`} className="hover:text-ink">Privacy</Link>
        <Link href={`${base}/legal#face-scan`} className="hover:text-ink">AI face scan notice</Link>
        <Link href={`${base}/legal#california`} className="hover:text-ink">California notice</Link>
      </nav>
      <p className="pt-4 text-center text-[11px] text-ink-muted/70">Powered by Facet</p>
    </PatientShell>
  );
}
