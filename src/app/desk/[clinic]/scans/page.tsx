import { Suspense } from "react";
import { DeniedScreen, DeskHeader, DeskMain, EmptyState, NoDatabase, PageSkeleton, Panel, SampleNote } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";
import { scanList, type ScanListRow } from "@/lib/desk/data";
import { fmtDateTime } from "@/lib/desk/format";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Skin scans" };

type Props = { params: Promise<{ clinic: string }> };

export default function ScansPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

function photoLabel(s: ScanListRow) {
  switch (s.photo) {
    case "none":
      return "No photo stored";
    case "kept":
      return "Photo kept (patient opted in)";
    case "within":
      return `Photo deletes ${fmtDateTime(s.delete_after)}`;
    case "deleted":
      return "Photo past 72 h, deleted";
  }
}

async function Content({ params }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const scans = await scanList(clinic.id);
  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="Skin scans" subtitle="Scans patients took in your app: the score, their top concerns and which model read it. Cosmetic estimates, not a medical diagnosis." />
      <SampleNote clinic={clinic} />
      {!isSupabaseConfigured() ? (
        <NoDatabase />
      ) : scans.length === 0 ? (
        <Panel>
          <EmptyState icon="scan" title="No scans yet">
            When a patient finishes the skin scan in your app, it shows up here.
          </EmptyState>
        </Panel>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Patient</th>
                <th className="px-4 py-2.5 text-right font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">Top concerns</th>
                <th className="px-4 py-2.5 font-medium">Read by</th>
                <th className="px-4 py-2.5 font-medium">Photo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {scans.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{fmtDateTime(s.created_at)}</td>
                  <td className="px-4 py-3">{s.lead_name ?? <span className="text-ink-muted">Not joined</span>}</td>
                  <td className="px-4 py-3 text-right text-[15px] font-semibold tabular-nums">{s.overall ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.top.length ? (
                      <span className="flex flex-wrap gap-1">
                        {s.top.map((c) => (
                          <span key={c.label} className="rounded-chip bg-surface-muted px-2 py-0.5 text-[12px]">
                            {c.label} <span className="text-ink-muted">{c.score}</span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                    {s.medical_flag && (
                      <p className="mt-1.5 max-w-xs rounded-field bg-sev-pronounced-soft px-2 py-1 text-[12px] text-danger">Flagged for a doctor: {s.medical_flag}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{[s.provider, s.model].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{photoLabel(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-[12px] text-ink-muted">Photos are never shown at the desk. Raw photos auto-delete 72 hours after the scan unless the patient chose to keep them.</p>
    </DeskMain>
  );
}
