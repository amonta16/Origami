import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { loadProof, type ProofHour } from "@/lib/admin/proof";

export const metadata = { title: "Proof" };

/** Public, no login. Live counts from production; sample and team-test rows never counted. No PII. */
export default function ProofPage() {
  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-10 md:px-8 md:pt-14">
      <p className="text-[13px] font-medium text-ink-muted">
        <Link href="/" className="hover:text-ink">
          Facet
        </Link>{" "}
        · CPVC × OCOB × CPE AI Hackathon
      </p>
      <h1 className="font-display mt-2 text-[32px] md:text-[40px]">Weekend proof</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">Real numbers from Nov 13–15, 2026. Sample and test data excluded.</p>

      <Suspense fallback={<Skeleton />}>
        <Numbers />
      </Suspense>

      <footer className="mt-10 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-muted">
        Numbers update live from the production database. Rows from our fictional Sample clinic and from team testing on it are never counted.
        <span className="mt-1 block text-[12px]">Counted from Fri Nov 13, 2026, 5:00 PM Pacific. Team test builds are excluded by name in the code.</span>
      </footer>
    </main>
  );
}

function Skeleton() {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-card bg-surface-muted" />
      ))}
    </div>
  );
}

async function Numbers() {
  await connection();
  let d: Awaited<ReturnType<typeof loadProof>>;
  try {
    d = await loadProof();
  } catch {
    return <p className="mt-8 rounded-card bg-surface-muted p-5 text-[14px] text-ink-muted">The numbers couldn&rsquo;t load right now. Refresh in a moment.</p>;
  }
  if (!d) return <p className="mt-8 rounded-card bg-surface-muted p-5 text-[14px] text-ink-muted">The database isn&rsquo;t connected on this server, so there is nothing to count.</p>;

  return (
    <>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {d.kpis.map((k) => (
          <div key={k.key} className="rounded-card border border-line bg-surface p-5 shadow-soft">
            <p className="font-display-numeral text-[30px] font-semibold tabular-nums">{k.value.toLocaleString("en-US")}</p>
            <p className="mt-1 text-[14px] font-medium">{k.label}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{k.definition}</p>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-card border border-line bg-surface p-5 shadow-soft md:p-6">
        <h2 className="font-display text-[17px]">Activity by hour</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          {d.totalEvents.toLocaleString("en-US")} tracked app event{d.totalEvents === 1 ? "" : "s"} across the weekend (scans, previews, joins, desk actions and owner builds), Pacific time.
        </p>
        <HourChart hours={d.hours} />
      </section>

      <section className="mt-4 rounded-card border border-line bg-surface p-5 shadow-soft md:p-6">
        <h2 className="font-display text-[17px]">Spas that built an app</h2>
        <p className="mt-1 text-[13px] text-ink-muted">Name and city only.</p>
        {d.spas.length === 0 ? (
          <p className="mt-4 rounded-field bg-surface-muted px-4 py-3 text-[13px] text-ink-muted">No med spa outside the team has built an app yet. This list fills in as soon as one does.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {d.spas.map((s, i) => (
              <li key={`${s.name}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-[14px]">
                <span className="font-medium">{s.name}</span>
                {s.place && <span className="text-[13px] text-ink-muted">{s.place}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function pacificParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: get("weekday"), hour: Number(get("hour")) };
}

function hourLabel(h: number) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function HourChart({ hours }: { hours: ProofHour[] }) {
  const max = Math.max(1, ...hours.map((h) => h.count));
  const labeled = hours.map((h) => ({ ...h, ...pacificParts(h.start) }));
  const summary = labeled
    .filter((h) => h.count > 0)
    .map((h) => `${h.day} ${hourLabel(h.hour)}: ${h.count}`)
    .join(", ");
  return (
    <div className="mt-6">
      <div className="flex h-44 items-end gap-[2px]" role="img" aria-label={summary ? `Events per hour. ${summary}` : "No events yet."}>
        {labeled.map((h) => (
          <div key={h.start} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${h.day} ${hourLabel(h.hour)}: ${h.count}`}>
            <div className="w-full rounded-t-[3px] bg-ink" style={{ height: h.count ? `${Math.max(3, (h.count / max) * 100)}%` : "1px", opacity: h.count ? 1 : 0.15 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] border-t border-line pt-1.5 text-[11px] text-ink-muted">
        {labeled.map((h, i) => (
          <div key={h.start} className="relative min-w-0 flex-1">
            {(i === 0 || h.hour === 0 || h.hour === 12) && <span className="absolute left-0 whitespace-nowrap">{i === 0 || h.hour === 0 ? `${h.day} ${hourLabel(h.hour)}` : hourLabel(h.hour)}</span>}
          </div>
        ))}
      </div>
      <div className="h-4" />
      <p className="mt-1 text-[12px] text-ink-muted">Peak hour: {max === 1 && !hours.some((h) => h.count) ? "none yet" : `${max.toLocaleString("en-US")} event${max === 1 ? "" : "s"}`}.</p>
    </div>
  );
}
