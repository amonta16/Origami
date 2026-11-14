import { Suspense } from "react";
import { PatientShell, SectionTitle } from "@/components/patient/patient-shell";
import { JoinTrigger } from "@/components/patient/patient-provider";
import { RedeemButton, ShowCodeButton } from "@/components/patient/actions";
import { Icon } from "@/components/patient/icons";
import { getRewards } from "@/lib/data/catalog";
import { loadPatientPage } from "@/lib/patient/load";

export const metadata = { title: "Rewards" };

export default function RewardsPage({ params }: PageProps<"/s/[clinic]/rewards">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Rewards params={params} />
    </Suspense>
  );
}

async function Rewards({ params }: { params: PageProps<"/s/[clinic]/rewards">["params"] }) {
  const { clinic: slug } = await params;
  const { clinic, patient } = await loadPatientPage(slug);
  const rewards = await getRewards(clinic.id);
  const points = patient?.points ?? 0;
  const next = rewards.find((r) => r.points_cost > points);
  const ready = patient?.redemptions.filter((r) => !r.used_at) ?? [];

  const earn: Array<{ label: string; sub?: string; pts: number; icon: "sparkle" | "qr" | "bag" }> = [
    { label: "Join the app", sub: "Once, when you sign up", pts: clinic.welcome_points ?? 100, icon: "sparkle" as const },
    { label: "Visit our clinic", sub: "Show your code at check-in", pts: clinic.visit_points ?? 50, icon: "qr" as const },
    ...(clinic.points_per_dollar ? [{ label: "Make a purchase", sub: `${clinic.points_per_dollar} point per $1 spent`, pts: clinic.points_per_dollar, icon: "bag" as const }] : []),
  ].filter((e) => e.pts > 0);

  return (
    <PatientShell clinic={clinic} patient={patient} active="rewards" title="Rewards">
      {/* points card */}
      <section className="px-4 pt-2">
        <div className="bronze-card relative aspect-[1.72] overflow-hidden rounded-[16px] p-5 text-white shadow-[0_18px_34px_-18px_rgba(60,45,30,.55)]">
          <div className="relative flex h-full flex-col">
            <p className="text-[40px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{points.toLocaleString()}</p>
            <p className="mt-1.5 text-[13px] text-white/90">{clinic.name} points</p>
            <div className="mt-auto flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{patient?.first_name ?? "Guest"}</p>
                <p className="mt-1 truncate text-[11px] font-bold tracking-[0.18em]">{clinic.name.toUpperCase()}</p>
              </div>
              {!patient && (
                <JoinTrigger reason="Your card collects points at every visit." className="h-8 shrink-0 rounded-full bg-white px-4 text-[13px] font-medium text-[#111318]">
                  Sign in
                </JoinTrigger>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[13px] text-[#7a7d86]">
          {!patient
            ? `Sign in to start your card with ${clinic.welcome_points ?? 100} points.`
            : next
              ? `${(next.points_cost - points).toLocaleString()} points to ${next.name}`
              : rewards.length
                ? "You can redeem any reward below."
                : null}
        </p>
      </section>

      {/* ready to use */}
      {ready.length > 0 && (
        <section className="px-3 pt-8">
          <div className="px-1">
            <SectionTitle>Ready to use</SectionTitle>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {ready.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-soft">
                <span className="grid size-11 shrink-0 place-items-center rounded-field bg-brand-soft text-brand">
                  <Icon name="gift" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{r.reward_name}</span>
                  <span className="block text-[12px] text-ink-muted">Reward · {r.code}</span>
                </span>
                <span className="ml-auto">
                  <ShowCodeButton title={r.reward_name} code={r.code} note="Show this at the front desk when you pay." />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* catalog */}
      <section className="px-4 pt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Rewards</h2>
          <span className="flex items-center gap-1 text-[14px] font-medium">
            {rewards.length} available
          </span>
        </div>
        {rewards.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {rewards.map((r) => {
              const unlocked = Boolean(patient) && points >= r.points_cost;
              return (
                <li key={r.id} className="flex flex-col overflow-hidden rounded-[14px] bg-[#f1f1f2]">
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="" className={`aspect-[5/4] w-full object-cover ${unlocked ? "" : "grayscale"}`} />
                  ) : (
                    <div className="grid aspect-[5/4] w-full place-items-center bg-[radial-gradient(120%_90%_at_30%_20%,#b4b5b9,#8c8d92)]">
                      {clinic.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={clinic.logo_url} alt="" className="max-h-[60%] max-w-[78%] object-contain opacity-90 brightness-0 invert" />
                      ) : (
                        <Icon name="gift" className="size-9 text-white/90" strokeWidth={1.3} />
                      )}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col items-center px-2 pb-3 pt-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.03em] ${unlocked ? "bg-brand-soft text-brand-ink" : "bg-[#e4e4e7] text-[#3a3d45]"}`}>
                      {!unlocked && <Icon name="lock" className="size-3" strokeWidth={2.2} />}
                      {r.points_cost.toLocaleString()} POINTS
                    </span>
                    <p className="mt-2 text-[14px] leading-snug">{r.name}</p>
                  </div>
                  <div className="border-t border-[#e2e2e5]">
                    <RedeemButton rewardId={r.id} rewardName={r.name} cost={r.points_cost} points={patient ? points : null} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-card bg-surface-muted p-4 text-[14px] text-ink-muted">{clinic.name} hasn&rsquo;t set up rewards yet.</p>
        )}
      </section>

      {/* ways to earn */}
      {earn.length > 0 && (
        <section className="px-4 pt-9">
          <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Need more points?</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {earn.map((e) => (
              <li key={e.label} className="flex items-center gap-3.5 rounded-[14px] bg-[#f3f4f6] px-4 py-3.5">
                <Icon name={e.icon} className="size-[22px] shrink-0 text-[#2a2d34]" strokeWidth={1.5} />
                <span className="min-w-0">
                  <span className="block text-[15px]">{e.label}</span>
                  {e.sub && <span className="block text-[13px] text-[#7a7d86]">{e.sub}</span>}
                </span>
                <span className="ml-auto shrink-0 rounded-full bg-black px-3 py-1.5 text-[13px] font-semibold text-white">
                  +{e.pts} {e.pts === 1 ? "point" : "points"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[12px] text-[#9a9ca3]">The front desk adds visit and purchase points when you check in or pay.</p>
        </section>
      )}
    </PatientShell>
  );
}
