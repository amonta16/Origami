import { Suspense } from "react";
import Link from "next/link";
import { PatientShell } from "@/components/patient/patient-shell";
import { JoinTrigger } from "@/components/patient/patient-provider";
import { GiftCard } from "@/components/patient/gift-card";
import { ScanCard } from "@/components/patient/scan-card";
import { ItemArt } from "@/components/patient/item-art";
import { CATEGORY_LABEL, Icon } from "@/components/patient/icons";
import { treatmentIcon } from "@/components/patient/sheet-items";
import { getTreatments } from "@/lib/data/clinics";
import { getPlans, getRewards } from "@/lib/data/catalog";
import { loadPatientPage } from "@/lib/patient/load";
import { money } from "@/lib/money";

// Patient home, matched section by section to the team's reference screenshots (sizes, spacing,
// radii, order). Words are Facet's own; no financing banner (Facet has no financing partner).
export default function ClinicHome({ params }: PageProps<"/s/[clinic]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Home params={params} />
    </Suspense>
  );
}

async function Home({ params }: { params: PageProps<"/s/[clinic]">["params"] }) {
  const { clinic: slug } = await params;
  const { clinic, patient, base } = await loadPatientPage(slug);
  const [treatments, plans, rewards] = await Promise.all([getTreatments(clinic.id), getPlans(clinic.id), getRewards(clinic.id)]);
  const popular = treatments.filter((t) => t.popular);
  const grid = (popular.length >= 2 ? popular : treatments).slice(0, 4);
  const explainers = treatments.filter((t) => !grid.includes(t)).slice(0, 6);
  const gift = clinic.first_visit_credit_cents ?? 0;
  const claimBy = claimByLabel();
  const tel = clinic.phone?.replace(/[^\d+]/g, "");
  const bookHref = clinic.booking_url ?? (tel ? `tel:${tel}` : `${base}/shop?tab=treatments`);
  const visitPts = clinic.visit_points ?? 50;

  return (
    <PatientShell clinic={clinic} patient={patient} active="home">
      {/* hero + points pill */}
      <section className="relative">
        <div className="relative aspect-[4/3] overflow-hidden bg-brand-deep">
          {clinic.hero_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinic.hero_photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(110%_80%_at_85%_10%,rgba(255,255,255,.18),transparent_55%),linear-gradient(160deg,var(--brand)_0%,var(--brand-deep)_100%)]" />
          )}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="absolute left-5 right-5 top-5 text-white">
            <h1 className="text-[22px] font-bold leading-[1.2] tracking-[-0.015em] drop-shadow-sm">{patient?.first_name ? `Welcome back, ${patient.first_name}!` : `Welcome to ${clinic.name}`}</h1>
            <p className="mt-1 text-[14px] text-white/75">{clinic.name}</p>
          </div>
        </div>
        <div className="relative z-10 -mt-[26px] px-4">
          {patient ? (
            <Link href={`${base}/rewards`} className="flex h-[52px] items-center gap-2.5 rounded-[18px] bg-white px-4 shadow-[0_10px_28px_-10px_rgba(17,19,24,.28)]">
              <span className="text-[17px] font-semibold tabular-nums">{patient.points.toLocaleString()}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-[#6f7380]">{clinic.name} points</span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] ${patient.plan ? "bg-brand-soft text-brand-ink" : "bg-[#ececee] text-[#2a2d34]"}`}>{patient.plan ? patient.plan.name : "Not a member"}</span>
              <Icon name="chevron" className="size-4 shrink-0" strokeWidth={2} />
            </Link>
          ) : (
            <JoinTrigger className="flex h-[52px] w-full items-center gap-2.5 rounded-[18px] bg-white px-4 text-left shadow-[0_10px_28px_-10px_rgba(17,19,24,.28)]">
              <span className="text-[17px] font-semibold tabular-nums">0</span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-[#6f7380]">{clinic.name} points</span>
              <span className="shrink-0 rounded-full bg-[#ececee] px-3 py-1 text-[13px] text-[#2a2d34]">Not a member</span>
              <Icon name="chevron" className="size-4 shrink-0" strokeWidth={2} />
            </JoinTrigger>
          )}
        </div>
      </section>

      {/* a gift for you */}
      {gift > 0 && !patient && (
        <section className="px-4 pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[21px] font-semibold tracking-[-0.015em]">A gift for you</h2>
            <span className="text-[14px] text-[#7a7d86]">Claim by {claimBy}</span>
          </div>
          <div className="mt-3.5">
            <GiftCard amountLabel={`${money(gift)} off your first purchase`} claimBy={claimBy} signedIn={Boolean(patient)} />
          </div>
        </section>
      )}

      {/* popular right now */}
      {grid.length > 0 && (
        <section className="px-4 pt-9">
          <h2 className="text-center text-[20px] font-semibold tracking-[-0.015em]">Popular right now</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
            {grid.map((t) => (
              <Link key={t.id} href={`${base}/t/${t.id}`} className="block">
                <ItemArt src={t.image_url} icon={treatmentIcon(t)} alt={t.name} className="aspect-[4/5] rounded-[10px]" />
                <p className="mt-2.5 truncate text-[14px]">{t.name}</p>
                <p className="mt-0.5 text-[14px] font-medium">{t.price_cents != null ? money(t.price_cents, { from: true }) : "Price on consultation"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* points row (same shape as the reference's pay-over-time row) */}
      <section className="px-4 pt-6">
        <Link href={`${base}/rewards`} className="flex items-center gap-3.5 rounded-[16px] bg-[#f3f4f6] px-4 py-4">
          <span className="shrink-0 rounded-[8px] bg-brand-soft px-3 py-1.5 text-[13px] font-bold text-brand-ink">Points</span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold leading-snug">Earn {visitPts} points every visit.</span>
            <span className="block text-[13px] text-[#7a7d86]">Show your code at check-in, spend them on rewards.</span>
          </span>
        </Link>
      </section>

      {/* member promo */}
      {plans.length > 0 && (
        <section className="px-4 pt-4">
          <div className="metal-card relative overflow-hidden rounded-[16px] px-6 py-7 text-center text-white">
            <p className="relative text-[19px] font-semibold leading-[1.3] tracking-[-0.01em]">Save more as a {clinic.name} member</p>
            <p className="relative mt-2 text-[13.5px] leading-snug text-white/70">Treatments every month. Member pricing. Members-only perks.</p>
            <Link href={plans.length === 1 ? `${base}/m/${plans[0].id}` : `${base}/shop?tab=memberships`} className="relative mt-5 inline-flex h-11 items-center rounded-[12px] bg-white px-6 text-[15px] font-medium text-[#111318]">
              See benefits
            </Link>
          </div>
        </section>
      )}

      {/* rewards row */}
      {rewards.length > 0 && (
        <section className="pt-9">
          <div className="flex items-baseline justify-between px-4">
            <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Rewards</h2>
            <Link href={`${base}/rewards`} className="flex items-center gap-1 text-[14px] font-medium">
              See more <Icon name="chevron" className="size-3.5" strokeWidth={2} />
            </Link>
          </div>
          <ul className="mt-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {rewards.map((r) => {
              const unlocked = Boolean(patient) && (patient?.points ?? 0) >= r.points_cost;
              return (
                <li key={r.id} className="w-[42%] shrink-0">
                  <Link href={`${base}/rewards`} className="block overflow-hidden rounded-[14px] bg-[#f1f1f2]">
                    <RewardArt image={r.image_url} logo={clinic.logo_url} unlocked={unlocked} />
                    <div className="flex flex-col items-center px-2 pb-4 pt-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e4e4e7] px-2.5 py-1 text-[11px] font-bold tracking-[0.03em] text-[#3a3d45]">
                        {!unlocked && <Icon name="lock" className="size-3" strokeWidth={2.2} />}
                        {r.points_cost.toLocaleString()} POINTS
                      </span>
                      <p className="mt-2 line-clamp-2 text-[14px] leading-snug">{r.name}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* book next visit */}
      <section className="px-4 pt-7">
        <a href={bookHref} className="flex items-center gap-3.5 rounded-[16px] bg-[#f3f4f6] px-4 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#111318] text-white">
            <Icon name="calendar" className="size-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-[16px] font-medium">Book your next visit</span>
            <span className="block text-[14px] text-[#7a7d86]">Online, by text, or give us a call</span>
          </span>
          <Icon name="chevron" className="ml-auto size-4 shrink-0 text-[#9a9ca3]" />
        </a>
      </section>

      {/* educate yourself + skin analysis */}
      <section className="px-4 pt-9">
        <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Educate yourself</h2>
        <p className="mt-1 text-[14px] leading-snug text-[#7a7d86]">Know what your skin needs, then how each treatment works.</p>
        <div className="mt-4">
          <ScanCard href={`${base}/scan`} clinicName={clinic.name} />
        </div>
      </section>

      {/* treatment explainers */}
      {explainers.length > 0 && (
        <section className="pt-4">
          <ul className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {explainers.map((t) => (
              <li key={t.id} className="w-[46%] shrink-0">
                <Link href={`${base}/t/${t.id}`} className="block overflow-hidden rounded-[14px] border border-[#ececef] bg-white">
                  <ItemArt src={t.image_url} icon={treatmentIcon(t)} alt={t.name} className="aspect-[4/3] rounded-none" />
                  <div className="p-3">
                    {t.category && <span className="inline-block rounded-full bg-[#ececee] px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-[#5a5d66]">{CATEGORY_LABEL[t.category].toUpperCase()}</span>}
                    <p className="mt-1.5 truncate text-[14px] font-medium">{t.name}</p>
                    {t.description && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#7a7d86]">{t.description}</p>}
                    <p className="mt-1.5 flex items-center gap-0.5 text-[12px] font-medium">How it works <Icon name="chevron" className="size-3" strokeWidth={2} /></p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* about + map + call */}
      <section className="px-4 pt-9">
        {(clinic.hero_photo_url || clinic.logo_url) && (
          <div className="relative aspect-[16/8] overflow-hidden rounded-[16px] bg-brand">
            {clinic.hero_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clinic.hero_photo_url} alt={clinic.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clinic.logo_url!} alt={clinic.name} className="absolute inset-0 m-auto max-h-[55%] max-w-[70%] object-contain brightness-0 invert" />
            )}
          </div>
        )}
        <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">About us</h2>
        <p className="mt-1.5 text-[15px] leading-[1.65] text-[#6f7380]">
          {clinic.about ?? `${clinic.name} offers ${treatments.length ? treatments.slice(0, 3).map((t) => t.name.toLowerCase()).join(", ") : "aesthetic treatments"} and more.`}
        </p>
        {clinic.address && (
          <div className="mt-5 overflow-hidden rounded-[16px] bg-[#f3f4f6]">
            <div className="relative">
              <iframe
                title={`Map to ${clinic.name}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(clinic.address)}&z=15&output=embed`}
                className="block aspect-[16/10] w-full border-0 [filter:grayscale(1)_invert(.92)_contrast(.9)]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="px-4 py-4">
              <p className="text-[16px] font-semibold">{clinic.name}</p>
              <p className="mt-1 flex items-start gap-1.5 text-[14px] leading-snug text-[#6f7380]">
                <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M8 14s5-4.3 5-8A5 5 0 0 0 3 6c0 3.7 5 8 5 8Z" /><circle cx="8" cy="6" r="1.8" /></svg>
                {clinic.address}
              </p>
            </div>
          </div>
        )}
        {tel && (
          <a href={`tel:${tel}`} className="mt-4 flex h-[52px] items-center justify-center rounded-[14px] bg-black text-[16px] font-semibold text-white">
            Call now
          </a>
        )}
      </section>

      <p className="px-6 pt-8 text-center text-[11px] leading-relaxed text-[#9a9ca3]">
        {clinic.is_sample && <>Sample clinic for demos. Prices are typical, not a real offer. </>}
        Skin analysis results are cosmetic estimates, not a medical diagnosis. 18+.{" "}
        <Link href={`${base}/legal`} className="underline underline-offset-2">
          Privacy and terms
        </Link>
      </p>

    </PatientShell>
  );
}

/** Reward card art: the reward's photo, else the clinic logo on a soft gray field (as in the reference). */
function RewardArt({ image, logo, unlocked }: { image: string | null; logo: string | null; unlocked: boolean }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={`aspect-[5/4] w-full object-cover ${unlocked ? "" : "grayscale"}`} />;
  }
  return (
    <div className="relative grid aspect-[5/4] w-full place-items-center overflow-hidden bg-[radial-gradient(120%_90%_at_30%_20%,#b4b5b9,#8c8d92)]">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="max-h-[60%] max-w-[78%] object-contain opacity-90 brightness-0 invert" />
      ) : (
        <Icon name="gift" className="size-9 text-white/90" strokeWidth={1.3} />
      )}
    </div>
  );
}

/** Welcome gifts are good for a week from when the patient first sees them. */
function claimByLabel() {
  return new Date(Date.now() + 7 * 864e5).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
}
