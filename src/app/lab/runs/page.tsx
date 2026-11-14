import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { analysisModel, SIM_PROVIDER_LABEL } from "@/lib/analysis/models";
import type { ScanResults } from "@/lib/types";

export const metadata = { title: "Model runs", robots: { index: false } };

type Run = {
  id: string;
  session_id: string;
  kind: "analysis" | "sim";
  provider: string;
  model_requested: string | null;
  model_served: string | null;
  sim_kind: string | null;
  used_mask: boolean | null;
  ok: boolean;
  error: string | null;
  ms: number | null;
  results: ScanResults | null;
  created_at: string;
  clinics: { name: string; slug: string } | null;
};

// Tester page: every saved model run (analysis + after-image), grouped by photo session.
// No photos are stored or shown here.
export default function RunsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[13px] text-ink-muted">
        <Link href="/lab" className="hover:text-ink">Lab</Link> / Model runs
      </p>
      <h1 className="font-display mt-2 text-[30px]">Model runs</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
        Each scan session is one photo. Pick models on the results screen to compare; every run lands here with its timing and scores. Photos are never saved here.
      </p>
      <Suspense fallback={<p className="mt-8 text-[14px] text-ink-muted">Loading…</p>}>
        <Runs />
      </Suspense>
    </main>
  );
}

async function Runs() {
  await connection();
  const sb = supabaseAdmin();
  if (!sb) return <p className="mt-8 text-[14px] text-ink-muted">The database isn&rsquo;t connected on this server.</p>;
  const { data, error } = await sb
    .from("scan_runs")
    .select("id, session_id, kind, provider, model_requested, model_served, sim_kind, used_mask, ok, error, ms, results, created_at, clinics(name, slug)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return <p className="mt-8 text-[14px] text-danger">{error.message}</p>;
  const runs = (data as unknown as Run[]) ?? [];
  if (!runs.length) return <p className="mt-8 rounded-card bg-surface-muted p-5 text-[14px] text-ink-muted">No runs yet. Do a scan, then tap &ldquo;Compare models&rdquo; on the results.</p>;

  const sessions = new Map<string, Run[]>();
  for (const r of runs) sessions.set(r.session_id, [...(sessions.get(r.session_id) ?? []), r]);

  return (
    <div className="mt-8 flex flex-col gap-6">
      {[...sessions.entries()].map(([sid, rs]) => {
        const first = rs[rs.length - 1];
        const analyses = rs.filter((r) => r.kind === "analysis").reverse();
        const sims = rs.filter((r) => r.kind === "sim").reverse();
        return (
          <section key={sid} className="rounded-card border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-medium">
                Session {sid.slice(0, 8)} <span className="font-normal text-ink-muted">· {first.clinics?.name ?? "unknown clinic"}</span>
              </h2>
              <span className="text-[12px] text-ink-muted">{new Date(first.created_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </div>

            {analyses.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead className="text-[11px] text-ink-muted">
                    <tr>
                      <th className="pb-2 font-medium">Analysis model</th>
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Score → potential</th>
                      <th className="pb-2 font-medium">Skin age</th>
                      <th className="pb-2 font-medium">Top concerns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line align-top">
                    {analyses.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-3">
                          <span className="font-medium">{analysisModel(r.model_requested)?.label ?? r.model_served ?? r.provider}</span>
                          {r.model_served && r.model_requested && !r.model_served.startsWith(r.model_requested) && <span className="block text-[11px] text-ink-muted">served by {r.model_served}</span>}
                          {!r.model_requested && <span className="block text-[11px] text-ink-muted">default · {r.model_served}</span>}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{r.ms != null ? `${(r.ms / 1000).toFixed(1)} s` : "–"}</td>
                        {r.ok && r.results ? (
                          <>
                            <td className="py-2 pr-3 tabular-nums">{r.results.overall_score} → {r.results.potential_score}</td>
                            <td className="py-2 pr-3 tabular-nums">{r.results.skin_age ?? "–"}</td>
                            <td className="py-2 text-ink-soft">
                              {r.results.concerns.slice(0, 3).map((c) => `${c.id.replace(/_/g, " ")} ${c.score}`).join(", ")}
                              <span className="mt-0.5 block text-[11px] text-ink-muted">{r.results.insight}</span>
                            </td>
                          </>
                        ) : (
                          <td colSpan={3} className="py-2 text-danger">{r.error}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sims.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {sims.map((r) => (
                  <li key={r.id} className={`rounded-field border px-3 py-2 text-[12px] ${r.ok ? "border-line" : "border-sev-pronounced-soft bg-sev-pronounced-soft/40"}`}>
                    <span className="font-medium">{SIM_PROVIDER_LABEL[r.provider as keyof typeof SIM_PROVIDER_LABEL] ?? r.provider}</span>
                    <span className="text-ink-muted">
                      {" "}· {r.sim_kind?.replace(/_/g, " ")} · mask {r.used_mask ? "on" : "off"} · {r.ms != null ? `${(r.ms / 1000).toFixed(1)} s` : "–"}
                    </span>
                    {!r.ok && <span className="block max-w-xs truncate text-danger">{r.error}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
