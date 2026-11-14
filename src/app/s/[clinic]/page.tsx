import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppBar, Button, Chip, TabBar } from "@/components/ui";
import { ClinicTheme } from "@/components/clinic-theme";
import { getClinicBySlug, getTreatments } from "@/lib/data/clinics";

// Patient landing. Phase 3 adds the five questions, booking and My plan behind the tabs.
export default function ClinicLanding({ params }: PageProps<"/s/[clinic]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Landing params={params} />
    </Suspense>
  );
}

async function Landing({ params }: { params: PageProps<"/s/[clinic]">["params"] }) {
  const { clinic: slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();
  const treatments = await getTreatments(clinic.id);
  const base = `/s/${clinic.slug}`;

  return (
    <ClinicTheme clinic={clinic}>
      <div className="mx-auto w-full max-w-phone pb-28">
        <AppBar
          title={clinic.name}
          logoUrl={clinic.logo_url}
          right={
            <>
              {clinic.is_sample && <Chip>Sample clinic</Chip>}
              {clinic.is_preview && <Chip tone="brand">Preview — not live yet</Chip>}
            </>
          }
        />

        {/* hero card: brand gradient panel with the scan promise */}
        <section className="px-4 pt-2">
          <div className="overflow-hidden rounded-card bg-ink text-white shadow-soft">
            <div className="relative aspect-[4/3] bg-[radial-gradient(120%_90%_at_20%_0%,rgba(255,255,255,.14),transparent_55%),linear-gradient(180deg,#1a1c22_0%,#101216_100%)]">
              <MeshMark />
              <span className="absolute top-3 left-3 rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium tracking-wide text-ink">LIVE 3D FACE SCAN</span>
              <span className="absolute top-[38%] right-4 rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" />Fine lines</span>
              <span className="absolute top-[56%] left-4 rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" />Under-eye</span>
              <span className="absolute top-[70%] right-8 rounded-chip bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" />Sun spots</span>
            </div>
            <div className="bg-[linear-gradient(180deg,var(--brand)_0%,var(--brand-deep)_100%)] px-5 pb-5 pt-4">
              <p className="text-[11px] font-medium tracking-[0.12em] text-white/80">FREE AI FACE SCAN</p>
              <h1 className="font-display mt-1 text-[22px] text-white">See what treatments could look like on you.</h1>
              <p className="mt-1.5 text-[13px] leading-snug text-white/85">
                One selfie. Your skin score, what to treat first, and a realistic preview of {clinic.name}&rsquo;s treatments on your own face.
              </p>
              <Button href={`${base}/scan`} variant="white" size="md" className="mt-4">
                Start the 1-minute scan
              </Button>
            </div>
          </div>
        </section>

        {/* how it works */}
        <section className="px-4 pt-6">
          <h2 className="font-display text-[17px]">How it works</h2>
          <ol className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
            {[
              ["Consent, then camera", "Your face is biometric data. We say exactly what happens with it before anything opens."],
              ["Live 3D mesh maps your face", "478 points, on your phone. We score cosmetic concerns zone by zone."],
              ["See the after, dial the dose", "Only the treated zone changes. Slide from Subtle to Full, then book."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-[12px] font-semibold">{i + 1}</span>
                <div>
                  <p className="text-[14px] font-medium">{t}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* menu peek */}
        <section className="px-4 pt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[17px]">On the menu</h2>
            <span className="text-[12px] text-ink-muted">{treatments.length} treatments</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {treatments.slice(0, 4).map((t) => (
              <div key={t.id} className="rounded-card border border-line bg-surface p-3">
                <div className="aspect-[4/3] rounded-field bg-surface-muted" />
                <p className="mt-2 truncate text-[13px] font-medium">{t.name}</p>
                <p className="text-[12px] text-ink-muted">
                  {t.price_cents != null ? `From $${Math.round(t.price_cents / 100).toLocaleString()}` : "Price on consultation"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <p className="px-4 pt-6 text-center text-[11px] leading-relaxed text-ink-muted">
          18+ · consent first · cosmetic estimates, not a diagnosis · photos deleted after 72 h
        </p>
      </div>
      <TabBar active="home" base={base} />
    </ClinicTheme>
  );
}

/** Abstract face-mesh mark for the hero when there's no consented photo yet. */
function MeshMark() {
  const pts: Array<[number, number]> = [];
  const cx = 50, cy = 50;
  for (let r = 10; r <= 40; r += 10) {
    const n = r * 0.6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r]);
    }
  }
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-70" aria-hidden="true">
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
