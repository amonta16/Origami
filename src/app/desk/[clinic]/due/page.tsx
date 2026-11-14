import { Suspense } from "react";
import { CopyButton } from "@/components/desk/copy-button";
import { DeniedScreen, DeskHeader, DeskMain, EmptyState, NoDatabase, PageSkeleton, Panel, SampleNote } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";
import { dueList } from "@/lib/desk/data";
import { fmtShort } from "@/lib/desk/format";
import type { DeskClinic, DueRow } from "@/lib/desk/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Patients due" };

type Props = { params: Promise<{ clinic: string }> };

export default function DuePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

function recallText(clinic: DeskClinic, r: DueRow) {
  const hi = r.first_name ? `Hi ${r.first_name}` : "Hi there";
  const when = r.days_until < 0 ? "is ready for a touch-up" : `will be ready for a touch-up around ${fmtShort(r.next_due_at)}`;
  const book = clinic.booking_url ? ` Book here: ${clinic.booking_url}` : clinic.phone ? ` Call us at ${clinic.phone}.` : "";
  return `${hi}, it's ${clinic.name}. Your ${r.treatment_name}${r.visit_at ? ` from ${fmtShort(r.visit_at)}` : ""} ${when}. Want us to save you a spot?${book}`;
}

async function Content({ params }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const { rows } = await dueList(clinic.id);
  const groups = [
    { title: "Overdue", rows: rows.filter((r) => r.days_until < 0) },
    { title: "This week", rows: rows.filter((r) => r.days_until >= 0 && r.days_until < 7) },
    { title: "Next week", rows: rows.filter((r) => r.days_until >= 7) },
  ];

  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="Patients due" subtitle="Who's ready for their next visit, from each treatment's result window. Latest visit per patient and treatment." />
      <SampleNote clinic={clinic} />
      {!isSupabaseConfigured() ? (
        <NoDatabase />
      ) : (
        <>
          <p className="mb-4 rounded-field border border-line bg-surface px-4 py-2.5 text-[12px] text-ink-muted">
            Texting isn&rsquo;t connected in this build, so nothing is sent from here. <strong className="font-medium text-ink">Copy text</strong> gives you a ready-made message to send from your own phone or system.
          </p>
          {rows.length === 0 ? (
            <Panel>
              <EmptyState icon="clock" title="No one is due in the next two weeks">
                When you check someone in for a treatment with a result window, they show up here as it runs out.
              </EmptyState>
            </Panel>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g) => (
                <Panel key={g.title} padding={false} title={`${g.title} · ${g.rows.length}`}>
                  {g.rows.length === 0 ? (
                    <p className="px-5 pb-5 pt-2 text-[13px] text-ink-muted md:px-6">No one.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-line border-t border-line">
                      {g.rows.map((r) => (
                        <li key={r.key} className="flex flex-wrap items-center gap-3 px-5 py-3 md:px-6">
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-medium">{r.name}</span>
                            <span className="block text-[12px] text-ink-muted">
                              {r.treatment_name} · last visit {fmtShort(r.visit_at)} · {r.phone_masked}
                            </span>
                          </span>
                          <span className={r.days_until < 0 ? "text-[12px] font-medium text-brand" : "text-[12px] text-ink-muted"}>
                            {r.days_until < 0 ? `${Math.abs(r.days_until)} day${Math.abs(r.days_until) === 1 ? "" : "s"} overdue` : r.days_until === 0 ? "Due today" : `Due ${fmtShort(r.next_due_at)}`}
                          </span>
                          <CopyButton text={recallText(clinic, r)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              ))}
            </div>
          )}
        </>
      )}
    </DeskMain>
  );
}
