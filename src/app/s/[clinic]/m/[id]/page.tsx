import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PatientShell } from "@/components/patient/patient-shell";
import { RequestButton } from "@/components/patient/actions";
import { Icon } from "@/components/patient/icons";
import { getPlan } from "@/lib/data/catalog";
import { loadPatientPage } from "@/lib/patient/load";
import { money } from "@/lib/money";

// Membership detail, laid out like the reference's membership page.
export default function MembershipPage({ params }: PageProps<"/s/[clinic]/m/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Membership params={params} />
    </Suspense>
  );
}

async function Membership({ params }: { params: PageProps<"/s/[clinic]/m/[id]">["params"] }) {
  const { clinic: slug, id } = await params;
  const { clinic, patient, base } = await loadPatientPage(slug);
  const plan = await getPlan(clinic.id, id);
  if (!plan) notFound();
  const current = patient?.plan?.id === plan.id;
  const [checks, tiles] = [plan.perks.slice(0, Math.max(2, plan.perks.length - 2)), plan.perks.slice(Math.max(2, plan.perks.length - 2))];

  return (
    <PatientShell clinic={clinic} patient={patient} active="shop" back={{ href: `${base}/shop?tab=memberships`, title: "Memberships" }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        {clinic.hero_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clinic.hero_photo_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 grayscale" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" aria-hidden="true" />
        <p className="absolute inset-x-5 top-1/2 -translate-y-1/2 text-[24px] font-semibold uppercase leading-tight tracking-[0.08em] text-white">{plan.name}</p>
      </div>

      <div className="px-4 pt-4">
        <p className="text-[10px] font-semibold tracking-[0.1em] text-ink-muted">{clinic.name.toUpperCase()} · MEMBERSHIP</p>
        <h1 className="font-display mt-1.5 text-[22px]">{plan.tagline ?? "Member pricing on everything"}</h1>
        <p className="mt-3">
          <span className="font-display-numeral text-[26px]">{money(plan.monthly_price_cents)}</span>
          <span className="text-[13px] text-ink-muted">/mo</span>
        </p>

        <h2 className="font-display mt-6 text-center text-[17px]">Membership benefits</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {checks.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[14px] leading-snug">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-ink-muted text-ink-muted">
                <Icon name="check" className="size-2.5" strokeWidth={2.4} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        {tiles.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {tiles.map((p, i) => (
              <div key={p} className="flex min-h-[84px] flex-col justify-between rounded-field bg-ink p-3 text-white">
                <Icon name={i === 0 ? "sparkle" : "calendar"} className="size-4" />
                <p className="text-[13px] font-medium leading-snug">{p}</p>
              </div>
            ))}
          </div>
        )}
        {plan.member_discount_pct > 0 && (
          <p className="mt-4 text-center text-[13px] text-ink-muted">
            Members save {plan.member_discount_pct}%{plan.monthly_points ? ` and earn ${plan.monthly_points} bonus points every month` : ""}.
          </p>
        )}

        <div className="mt-6">
          {current ? (
            <p className="rounded-card bg-brand-soft p-4 text-center text-[14px] font-medium text-brand-ink">You&rsquo;re a member. Thanks for being here.</p>
          ) : (
            <RequestButton kind="membership" itemId={plan.id} label="Subscribe now" sentNote="The front desk will confirm and set up billing with you. Nothing is charged in the app." />
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-muted">{money(plan.monthly_price_cents)} billed monthly once {clinic.name} confirms. Cancel any month.</p>
        {plan.is_example && (
          <p className="mt-4 flex items-start gap-2 rounded-field bg-surface-muted p-3 text-[12px] leading-snug text-ink-muted">
            <Icon name="doc" className="size-4 shrink-0" />
            Example membership. The spa sets its own price and perks when the app goes live.
          </p>
        )}
      </div>
    </PatientShell>
  );
}
