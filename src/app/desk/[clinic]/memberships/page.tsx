import { Suspense } from "react";
import Link from "next/link";
import { DeniedScreen, DeskHeader, DeskMain, EmptyState, NoDatabase, PageSkeleton, Panel, SampleNote } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";
import { deskPlans, members } from "@/lib/desk/data";
import { fmtDate } from "@/lib/desk/format";
import { money } from "@/lib/money";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Memberships" };

type Props = { params: Promise<{ clinic: string }> };

export default function MembershipsPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const [plans, list] = await Promise.all([deskPlans(clinic.id), members(clinic.id)]);
  const planById = new Map(plans.map((p) => [p.id, p]));
  const base = `/desk/${clinic.slug}`;
  const monthly = list.reduce((s, m) => s + (planById.get(m.plan_id)?.monthly_price_cents ?? 0), 0);

  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="Memberships" subtitle="Who's on a monthly plan. Patients join from the app; you confirm them in Shop orders." />
      <SampleNote clinic={clinic} />
      {!isSupabaseConfigured() ? (
        <NoDatabase />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
          <Panel
            padding={false}
            title={`Members · ${list.length}`}
            description={list.length ? `${money(monthly, { perMonth: true })} in plan prices, collected at the desk (billing isn't part of this build).` : undefined}
          >
            {list.length === 0 ? (
              <EmptyState icon="repeat" title="No members yet">
                When a patient asks to join a plan in the app, confirm it in Shop orders and they show up here.
              </EmptyState>
            ) : (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {list.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">{m.name}</span>
                      <span className="block text-[12px] text-ink-muted">
                        {m.phone_masked} · member since {fmtDate(m.member_since)}
                      </span>
                    </span>
                    <span className="rounded-chip bg-brand-soft px-2.5 py-1 text-[12px] font-medium text-brand-ink">{planById.get(m.plan_id)?.name ?? "Removed plan"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Plans" action={<Link href={`${base}/builder?tab=membership`} className="text-[13px] font-medium text-brand hover:underline">Edit plans</Link>}>
            {plans.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink-muted">No plans yet. Add one in App Builder.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {plans.map((p) => {
                  const n = list.filter((m) => m.plan_id === p.id).length;
                  return (
                    <li key={p.id} className="rounded-field border border-line px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-medium">{p.name}</span>
                        <span className="text-[13px] tabular-nums">{money(p.monthly_price_cents, { perMonth: true })}</span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-ink-muted">
                        {n} member{n === 1 ? "" : "s"} · {p.member_discount_pct}% off · {p.monthly_points} pts/mo{p.active ? "" : " · hidden from the app"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </DeskMain>
  );
}
