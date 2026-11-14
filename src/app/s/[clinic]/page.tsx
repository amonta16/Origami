import { Suspense } from "react";
import Link from "next/link";
import { Button, Chip } from "@/components/ui";
import { PatientShell, SectionTitle } from "@/components/patient/patient-shell";
import { ItemButton, JoinTrigger } from "@/components/patient/patient-provider";
import { ItemArt } from "@/components/patient/item-art";
import { Icon } from "@/components/patient/icons";
import { treatmentIcon, treatmentItem } from "@/components/patient/sheet-items";
import { getTreatments } from "@/lib/data/clinics";
import { loadPatientPage } from "@/lib/patient/load";
import { money } from "@/lib/money";

// Patient home. Layout follows the reference's home (hero, points pill, "Popular right now");
// the AI face scan card is Facet's own.
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
  const treatments = await getTreatments(clinic.id);
  const popular = treatments.filter((t) => t.popular);
  const grid = (popular.length >= 2 ? popular : treatments).slice(0, 6);
  const welcome = clinic.welcome_points ?? 100;

  return (
    <PatientShell clinic={clinic} patient={patient} active="home">
      {/* hero + points pill */}
      <section className="relative">
        <div className="relative aspect-[16/11] overflow-hidden bg-brand-deep">
          {clinic.hero_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinic.hero_photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(110%_80%_at_85%_10%,rgba(255,255,255,.22),transparent_55%),radial-gradient(90%_70%_at_0%_100%,rgba(0,0,0,.35),transparent_60%),linear-gradient(160deg,var(--brand)_0%,var(--brand-deep)_100%)]">
              <span className="absolute -right-6 bottom-6 select-none text-[150px] leading-none font-semibold tracking-[-0.06em] text-white/[.07]">
                {clinic.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2)}
              </span>
            </div>
          )}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="absolute left-4 right-4 top-4 text-white">
            <h1 className="font-display text-[24px] drop-shadow-sm">
              {patient?.first_name ? `Welcome back, ${patient.first_name}!` : `Welcome to ${clinic.name}`}
            </h1>
            <p className="mt-0.5 text-[13px] text-white/80">{patient ? clinic.name : "Your med spa, in your pocket."}</p>
          </div>
        </div>

        <div className="relative z-10 -mt-7 px-3">
          {patient ? (
            <Link href={`${base}/rewards`} className="flex h-14 items-center gap-2 rounded-card bg-surface px-4 shadow-lift">
              <span className="font-display-numeral text-[18px]">{patient.points.toLocaleString()}</span>
              <span className="truncate text-[13px] text-ink-muted">{clinic.name} points</span>
              <Chip className="ml-auto h-6 shrink-0 text-[11px]" tone={patient.plan ? "brand" : "muted"}>
                {patient.plan ? `${patient.plan.name} member` : "Not a member"}
              </Chip>
              <Icon name="chevron" className="size-4 shrink-0 text-ink-muted" />
            </Link>
          ) : (
            <JoinTrigger className="flex h-14 w-full items-center gap-2 rounded-card bg-surface px-4 text-left shadow-lift">
              <span className="text-[14px] font-medium">Join to earn points</span>
              {welcome > 0 && <Chip tone="brand" className="ml-auto h-6 text-[11px]">+{welcome} to start</Chip>}
              <Icon name="chevron" className={welcome > 0 ? "size-4 text-ink-muted" : "ml-auto size-4 text-ink-muted"} />
            </JoinTrigger>
          )}
        </div>
      </section>

      {/* AI face scan card */}
      <section className="px-4 pt-6">
        <div className="overflow-hidden rounded-card bg-ink text-white shadow-soft">
          <div className="relative aspect-[16/9] bg-[radial-gradient(120%_90%_at_20%_0%,rgba(255,255,255,.14),transparent_55%),linear-gradient(180deg,#1a1c22_0%,#101216_100%)]">
            <MeshMark />
            <span className="absolute left-3 top-3 rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink">Live 3D face scan</span>
            <span className="absolute right-4 top-[36%] rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" />Fine lines</span>
            <span className="absolute left-5 top-[58%] rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" />Under-eye</span>
            <span className="absolute bottom-4 right-8 rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" />Sun spots</span>
          </div>
          <div className="bg-[linear-gradient(180deg,var(--brand)_0%,var(--brand-deep)_100%)] px-5 pb-5 pt-4">
            <p className="text-[12px] font-medium text-white/80">Free AI face scan</p>
            <h2 className="font-display mt-1 text-[21px] text-white">See what a treatment could look like on you.</h2>
            <p className="mt-1.5 text-[13px] leading-snug text-white/85">
              One selfie: your skin score, what to treat first, and a preview of {clinic.name}&rsquo;s treatments on your own face.
            </p>
            <Button href={`${base}/scan`} variant="white" size="md" className="mt-4">
              Start the 1-minute scan
            </Button>
          </div>
        </div>
      </section>

      {/* popular right now */}
      <section className="px-3 pt-8">
        <SectionTitle center>Popular right now</SectionTitle>
        <div className="mt-4 grid grid-cols-2 gap-x-2.5 gap-y-5">
          {grid.map((t) => (
            <ItemButton key={t.id} item={treatmentItem(t)}>
              <ItemArt src={t.image_url} icon={treatmentIcon(t)} alt={t.name} />
              <p className="mt-2 truncate px-0.5 text-[13px]">{t.name}</p>
              <p className="px-0.5 text-[13px] font-medium">{money(t.price_cents, { from: true })}</p>
            </ItemButton>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Button href={`${base}/shop`} variant="secondary" size="sm">
            See the full menu
          </Button>
        </div>
      </section>

      <p className="px-6 pt-8 text-center text-[11px] leading-relaxed text-ink-muted">
        {clinic.is_sample && <>Sample clinic for demos. Prices are typical, not a real offer. </>}
        Face scan results are cosmetic estimates, not a medical diagnosis. 18+.{" "}
        <Link href={`${base}/legal`} className="underline underline-offset-2">
          Privacy and terms
        </Link>
      </p>
    </PatientShell>
  );
}

/** Abstract face-mesh mark for the scan card when there's no consented photo. */
function MeshMark() {
  const pts: Array<[number, number]> = [];
  const cx = 50,
    cy = 50;
  for (let r = 10; r <= 40; r += 10) {
    const n = r * 0.6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r]);
    }
  }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full opacity-70" aria-hidden="true">
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.55} fill="white" opacity={0.6} />
      ))}
      {[10, 20, 30, 40].map((r) => (
        <ellipse key={r} cx={cx} cy={cy} rx={r * 0.78} ry={r} fill="none" stroke="white" strokeOpacity={0.18} strokeWidth={0.3} />
      ))}
      <line x1="18" y1="50" x2="82" y2="50" stroke="white" strokeOpacity={0.18} strokeWidth={0.3} />
      <line x1="50" y1="10" x2="50" y2="90" stroke="white" strokeOpacity={0.18} strokeWidth={0.3} />
    </svg>
  );
}
