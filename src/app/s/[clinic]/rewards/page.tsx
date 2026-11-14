import { Suspense } from "react";
import { Chip } from "@/components/ui";
import { PatientShell, SectionTitle } from "@/components/patient/patient-shell";
import { JoinTrigger } from "@/components/patient/patient-provider";
import { RedeemButton, ShowCodeButton } from "@/components/patient/actions";
import { ItemArt } from "@/components/patient/item-art";
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
      <section className="px-3 pt-2">
        <div className="relative aspect-[1.72] overflow-hidden rounded-card p-5 text-white shadow-lift [background:linear-gradient(125deg,color-mix(in_oklab,var(--brand)_45%,#c9b7a6)_0%,color-mix(in_oklab,var(--brand)_60%,#8a7462)_55%,color-mix(in_oklab,var(--brand-deep)_70%,#3d3129)_100%)]">
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,.28)_45%,transparent_60%)]" />
          <div className="relative flex h-full flex-col">
            <p className="font-display-numeral text-[40px]">{points.toLocaleString()}</p>
            <p className="text-[13px] text-white/85">{clinic.name} points</p>
            <div className="mt-auto flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{patient?.first_name ?? "Guest"}</p>
                <p className="mt-1 truncate text-[11px] font-semibold tracking-[0.2em]">{clinic.name.toUpperCase()}</p>
              </div>
              {!patient && (
                <JoinTrigger reason="Your card collects points at every visit." className="h-8 shrink-0 rounded-chip bg-white px-4 text-[12px] font-medium text-ink shadow-soft">
                  Sign in
                </JoinTrigger>
              )}
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-center text-[13px] text-ink-muted">
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
      <section className="px-3 pt-8">
        <div className="px-1">
          <SectionTitle>Rewards</SectionTitle>
        </div>
        {rewards.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {rewards.map((r) => {
              const unlocked = Boolean(patient) && points >= r.points_cost;
              return (
                <li key={r.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-surface-muted">
                  <ItemArt src={r.image_url} icon="gift" alt={r.name} tone={unlocked ? "brand" : "muted"} className={r.image_url && !unlocked ? "rounded-none grayscale" : "rounded-none"} />
                  <div className="flex flex-1 flex-col items-center px-2 pt-3 text-center">
                    <Chip tone={unlocked ? "brand" : "outline"} className="h-6 gap-1 text-[10px] font-semibold tracking-[0.06em]">
                      {!unlocked && <Icon name="lock" className="size-3" strokeWidth={2} />}
                      {r.points_cost.toLocaleString()} POINTS
                    </Chip>
                    <p className="mt-2 text-[13px] font-medium leading-snug">{r.name}</p>
                    {r.description && <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-muted">{r.description}</p>}
                  </div>
                  <div className="mt-2 border-t border-line bg-surface">
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
        <section className="px-3 pt-8">
          <div className="px-1">
            <SectionTitle>Need more points?</SectionTitle>
          </div>
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
            {earn.map((e) => (
              <li key={e.label} className="flex items-center gap-3 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted">
                  <Icon name={e.icon} className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px]">{e.label}</span>
                  {e.sub && <span className="block text-[12px] text-ink-muted">{e.sub}</span>}
                </span>
                <span className="ml-auto shrink-0 rounded-chip bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">
                  +{e.pts} {e.pts === 1 ? "point" : "points"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-1 text-[12px] text-ink-muted">The front desk adds visit and purchase points when you check in or pay.</p>
        </section>
      )}
    </PatientShell>
  );
}
