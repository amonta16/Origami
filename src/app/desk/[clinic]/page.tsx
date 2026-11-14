import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DeniedScreen, DeskHeader, DeskMain, PageSkeleton, Panel, SampleNote } from "@/components/desk/frame";
import { DeskIcon } from "@/components/desk/icons";
import { resolveDesk } from "@/lib/desk/access";
import { homeState } from "@/lib/desk/data";
import { greetingFor } from "@/lib/desk/format";

export const metadata = { title: "Home" };

type Props = { params: Promise<{ clinic: string }> };

export default function DeskHome({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home params={params} />
    </Suspense>
  );
}

async function Home({ params }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const s = await homeState(clinic);
  const base = `/desk/${clinic.slug}`;

  const steps = [
    { label: "Add your treatment menu", done: s.treatments > 0, href: `${base}/builder?tab=products&sub=treatments`, note: s.treatments ? `${s.treatments} active` : "Nothing on the menu yet" },
    { label: "Connect your booking page", done: Boolean(clinic.booking_url), href: `${base}/builder?tab=settings&sub=details`, note: clinic.booking_url ? "Linked" : "Paste your booking link" },
    { label: "Pick your rewards", done: s.rewards > 0, href: `${base}/builder?tab=rewards`, note: s.rewards ? `${s.rewards} active` : "No rewards yet" },
    { label: "Offer a membership", done: s.plans > 0, href: `${base}/builder?tab=membership`, note: s.plans ? `${s.plans} active` : "No plans yet" },
    { label: "Set your brand color", done: Boolean(clinic.brand_color), href: `${base}/builder?tab=settings&sub=brand`, note: clinic.brand_color ?? "Using the default" },
    { label: "Your first patient joins", done: s.leads > 0, href: `/s/${clinic.slug}`, note: s.leads ? `${s.leads} joined` : "Share your app link" },
    { label: "Your first check-in", done: s.checkins > 0, href: `${base}/check-in`, note: s.checkins ? `${s.checkins} so far` : "Check someone in at the desk" },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const nextIdx = steps.findIndex((x) => !x.done);

  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title={`${greetingFor(s.hour)}, ${clinic.name}.`} />
      <SampleNote clinic={clinic} />

      {/* Setup cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <SetupCard
          title="Your treatment menu"
          done={s.treatments > 0}
          body={s.treatments ? `${s.treatments} treatments are live in your app. Check prices and how long results last, so the desk knows who's due.` : "Add the treatments you offer. Prices, timing and recall windows live here."}
          action={<CardLink href={`${base}/builder?tab=products&sub=treatments`}>Review</CardLink>}
          art={<MenuArt />}
        />
        <SetupCard
          title="Connect your booking"
          done={Boolean(clinic.booking_url)}
          body={clinic.booking_url ? "Patients tap Book and land on the booking page you already use." : "Paste the link to the booking page you already use and every Book button goes there."}
          action={<CardLink href={`${base}/builder?tab=settings&sub=details`}>{clinic.booking_url ? "Review" : "Add link"}</CardLink>}
          art={clinic.booking_url ? <span className="max-w-[220px] truncate rounded-chip border border-line bg-surface px-3 py-1.5 text-[11px] text-ink-muted shadow-soft">{prettyUrl(clinic.booking_url)}</span> : null}
        />
        <SetupCard
          title="Payments"
          done={false}
          body="Card payments and payouts aren't part of this build. Requests from the app are confirmed and paid at the desk."
          action={<span className="inline-flex h-9 items-center rounded-chip bg-surface-muted px-4 text-[13px] font-medium text-ink-muted">Not in this build</span>}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        {/* Checklist */}
        <Panel padding={false} className="pb-3">
          <div className="flex items-center gap-3 px-5 pt-5 md:px-6">
            <ProgressRing done={doneCount} total={steps.length} />
            <div>
              <h2 className="font-display text-[17px]">Finish setting up</h2>
              <p className="text-[13px] text-ink-muted">
                {doneCount} of {steps.length} done{nextIdx >= 0 ? ` · next: ${steps[nextIdx].label.toLowerCase()}` : " · you're all set"}
              </p>
            </div>
          </div>
          <div className="mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted md:mx-6">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }} />
          </div>
          <ol className="mt-3 px-2 md:px-3">
            {steps.map((st, i) => (
              <li key={st.label}>
                <Link
                  href={st.href}
                  className={cn("flex items-center gap-3 rounded-field px-3 py-2.5 transition-colors hover:bg-surface-muted", i === nextIdx && "bg-brand-soft hover:bg-brand-soft")}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                      st.done ? "bg-brand text-white" : "border border-line-strong text-ink-muted",
                    )}
                  >
                    {st.done ? <DeskIcon name="check" className="size-3.5" strokeWidth={2.2} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[14px]", st.done ? "text-ink-muted line-through decoration-ink-muted/40" : "font-medium")}>{st.label}</span>
                    {!st.done && <span className="block text-[12px] text-ink-muted">{st.note}</span>}
                  </span>
                  {i === nextIdx && <span className="rounded-chip bg-brand px-2.5 py-1 text-[11px] font-medium text-white">Next up</span>}
                  <DeskIcon name="chevron" className="size-4 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="Your access"
            action={<span className="rounded-chip bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-ink-soft">{clinic.is_sample ? "Open demo" : "Owner"}</span>}
          >
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              {clinic.is_sample
                ? "Anyone with the link can use the sample desk, so you can try every screen. Changes here show up in the sample app for everyone."
                : "This browser built the clinic, so it holds the keys to this desk. Separate staff logins aren't part of this build yet."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`${base}/check-in`} className="inline-flex h-9 items-center rounded-chip bg-ink px-4 text-[13px] font-medium text-white hover:bg-ink-soft">
                Check someone in
              </Link>
              <Link href={`/s/${clinic.slug}`} className="inline-flex h-9 items-center rounded-chip border border-line-strong bg-surface px-4 text-[13px] font-medium hover:border-ink">
                Open the patient app
              </Link>
            </div>
          </Panel>
          <div className="rounded-card bg-brand-soft p-5">
            <p className="font-display text-[16px]">How the desk fits the day</p>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-soft">
              <li>Patients join from your app link and get welcome points.</li>
              <li>At the front desk, scan their QR or type their code to check them in and add points.</li>
              <li>Patients due shows who&rsquo;s ready for a touch-up, from the result window on each treatment.</li>
            </ul>
          </div>
        </div>
      </div>
    </DeskMain>
  );
}

function prettyUrl(u: string) {
  return u.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function SetupCard({ title, done, body, action, art }: { title: string; done: boolean; body: string; action: ReactNode; art?: ReactNode }) {
  return (
    <section className="relative flex min-h-[180px] flex-col overflow-hidden rounded-card border border-line bg-surface p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-[15px] font-medium">
        {title}
        {done && (
          <span className="grid size-5 place-items-center rounded-full bg-emerald-50 text-ok" aria-label="Done">
            <DeskIcon name="check" className="size-3" strokeWidth={2.4} />
          </span>
        )}
      </h2>
      <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-ink-muted">{body}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        {action}
        {art}
      </div>
    </section>
  );
}

function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-9 items-center rounded-chip border border-line bg-surface px-4 text-[13px] font-medium shadow-soft hover:border-ink">
      {children}
    </Link>
  );
}

function MenuArt() {
  return (
    <span aria-hidden="true" className="-mb-5 flex h-16 w-28 flex-col gap-1.5 rounded-t-[10px] border border-line bg-surface p-2.5 shadow-soft">
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="size-2 rounded-[3px] bg-brand/60" />
          <span className="h-1.5 flex-1 rounded-full bg-surface-muted" />
          <span className="h-1.5 w-4 rounded-full bg-brand-soft" />
        </span>
      ))}
    </span>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-11 place-items-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--surface-muted)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(done / total) * c} ${c}`} />
      </svg>
      <span className="text-[11px] font-semibold">
        {done}/{total}
      </span>
    </span>
  );
}
