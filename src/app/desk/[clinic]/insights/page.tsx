import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { DeniedScreen, DeskHeader, DeskMain, NoDatabase, PageSkeleton, Panel, SampleNote } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";
import { insights } from "@/lib/desk/data";
import { plural } from "@/lib/desk/format";
import { money } from "@/lib/money";

export const metadata = { title: "Insights" };

type Props = { params: Promise<{ clinic: string }> };

export default function InsightsPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const d = await insights(clinic.id);
  const k = d.kpi;
  const maxWeek = Math.max(1, ...d.weeks.map((w) => w.count));
  const maxDay = Math.max(1, ...d.weekdays.map((w) => w.count));
  const weeksTotal = d.weeks.reduce((s, w) => s + w.count, 0);
  const weekdaysTotal = d.weekdays.reduce((s, w) => s + w.count, 0);

  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="Insights" subtitle="Counted live from your app and desk. Nothing here is estimated." />
      <SampleNote clinic={clinic} />
      {!d.dbReady ? (
        <NoDatabase />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi value={k.visits30} label="Visits · 30 days" sub={plural(k.visitPatients30, "different patient")} />
            <Kpi value={k.newPatients30} label="New patients · 30 days" sub={`${plural(k.totalPatients, "patient")} in total`} />
            <Kpi value={k.redeemed30} label="Rewards redeemed · 30 days" sub={`${k.pointsUsed30.toLocaleString("en-US")} points used`} />
            <Kpi value={k.requests30} label="App requests · 30 days" sub={k.requestedValue30 ? `${money(k.requestedValue30)} asked for, before the desk confirms` : "Buy and Join taps in the app"} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
            <Panel title="Last 12 weeks" description={`${plural(weeksTotal, "visit")} checked in at the desk`}>
              <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2" role="img" aria-label={`Visits per week for the last 12 weeks: ${d.weeks.map((w) => `${w.label} ${w.count}`).join(", ")}`}>
                {d.weeks.map((w) => (
                  <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    {w.count > 0 && <span className="text-[11px] tabular-nums text-ink-muted">{w.count}</span>}
                    <div
                      className={cn("w-full rounded-t-[6px]", w.current ? "bg-brand" : "bg-brand/35")}
                      style={{ height: w.count ? `${Math.max(6, (w.count / maxWeek) * 100)}%` : "3px" }}
                      title={`Week of ${w.label}: ${w.count}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
                <span>{d.weeks[0]?.label}</span>
                <span>This week</span>
              </div>
            </Panel>

            <Panel title="Visits by weekday" description="Last 8 weeks of check-ins">
              <ul className="mt-4 flex flex-col gap-2.5">
                {d.weekdays.map((w) => (
                  <li key={w.day} className="flex items-center gap-3 text-[12px]">
                    <span className={cn("w-8", w.count === maxDay && w.count > 0 ? "font-semibold" : "text-ink-muted")}>{w.day}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${(w.count / maxDay) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right tabular-nums text-ink-muted">{w.count}</span>
                  </li>
                ))}
              </ul>
              {weekdaysTotal === 0 && <p className="mt-3 text-[12px] text-ink-muted">No check-ins in the last 8 weeks yet.</p>}
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <StatCard
              title="Patients"
              sub="Who's in your app"
              rows={[
                { label: "Total patients", sub: `${d.patients.joined30} joined in the last 30 days`, value: d.patients.total.toLocaleString("en-US") },
                { label: "Came back", sub: `${d.patients.cameBack} of ${d.patients.visited} who visited, 2+ visits`, value: d.patients.visited ? `${Math.round((d.patients.cameBack / d.patients.visited) * 100)}%` : "—" },
                { label: "Members", sub: "On a monthly plan", value: d.patients.members.toLocaleString("en-US") },
              ]}
            />
            <StatCard
              title="Rewards & gifts"
              sub="Reasons to come back sooner"
              rows={[
                { label: "Rewards redeemed", sub: "All time", value: d.rewards.redeemedAll.toLocaleString("en-US") },
                { label: "Codes not used yet", sub: "Shown on the patient's desk panel", value: d.rewards.unused.toLocaleString("en-US") },
                { label: "Points given", sub: "Last 30 days", value: d.rewards.pointsIssued30.toLocaleString("en-US") },
              ]}
            />
            <StatCard
              title="At the desk"
              sub="What staff turned into data"
              rows={[
                { label: "Check-ins", sub: "Last 30 days", value: d.desk.checkins30.toLocaleString("en-US") },
                { label: "Purchase points added", sub: "Last 30 days", value: d.desk.purchasePoints30.toLocaleString("en-US") },
                { label: "Orders confirmed", sub: d.desk.waiting ? `${d.desk.waiting} still waiting` : "Nothing waiting", value: d.desk.confirmed30.toLocaleString("en-US") },
              ]}
            />
          </div>
        </>
      )}
    </DeskMain>
  );
}

function Kpi({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
      <p className="font-display-numeral text-[28px]">{value.toLocaleString("en-US")}</p>
      <p className="mt-1 text-[13px] text-ink-soft">{label}</p>
      <p className="mt-0.5 text-[12px] text-ink-muted">{sub}</p>
    </div>
  );
}

function StatCard({ title, sub, rows }: { title: string; sub: string; rows: Array<{ label: string; sub: string; value: string }> }) {
  return (
    <Panel title={title} description={sub}>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 py-3">
            <span>
              <span className="block text-[13px] font-medium">{r.label}</span>
              <span className="block text-[12px] text-ink-muted">{r.sub}</span>
            </span>
            <span className="text-[18px] font-semibold tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
