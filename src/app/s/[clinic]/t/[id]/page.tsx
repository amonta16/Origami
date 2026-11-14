import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PatientShell } from "@/components/patient/patient-shell";
import { RequestButton } from "@/components/patient/actions";
import { ItemArt } from "@/components/patient/item-art";
import { CATEGORY_LABEL, Icon } from "@/components/patient/icons";
import { treatmentIcon } from "@/components/patient/sheet-items";
import { getTreatments } from "@/lib/data/clinics";
import { loadPatientPage } from "@/lib/patient/load";
import { money } from "@/lib/money";

// Treatment detail, laid out like the reference's treatment page: photo, chip, name, blurb, meta, price, Book now.
export default function TreatmentPage({ params }: PageProps<"/s/[clinic]/t/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Treatment params={params} />
    </Suspense>
  );
}

async function Treatment({ params }: { params: PageProps<"/s/[clinic]/t/[id]">["params"] }) {
  const { clinic: slug, id } = await params;
  const { clinic, patient, base } = await loadPatientPage(slug);
  const t = (await getTreatments(clinic.id)).find((x) => x.id === id);
  if (!t) notFound();
  const member = Boolean(patient?.plan) && t.member_price_cents != null;

  return (
    <PatientShell clinic={clinic} patient={patient} active="shop" back={{ href: `${base}/shop?tab=treatments`, title: "Shop" }}>
      <ItemArt src={t.image_url} icon={treatmentIcon(t)} alt={t.name} className="aspect-[4/3] rounded-none" />
      <div className="px-5 pt-5">
        <span className="inline-block rounded-full bg-[#ececee] px-3 py-1 text-[12px] font-bold tracking-[0.06em] text-[#4a4d55]">TREATMENT</span>
        <h1 className="mt-3 text-[28px] font-medium leading-tight tracking-[-0.02em]">{t.name}</h1>
        {t.description && <p className="mt-2.5 text-[16px] leading-[1.55] text-[#6f7380]">{t.description}</p>}
        <p className="mt-3.5 flex items-center gap-4 text-[15px] text-[#2a2d34]">
          {t.category && <span>{CATEGORY_LABEL[t.category]}</span>}
          {t.duration_min && (
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 1.5" strokeLinecap="round" /></svg>
              {t.duration_min} min
            </span>
          )}
        </p>
        <p className="mt-4 flex items-center gap-3 text-[17px]">
          {member ? (
            <>
              <span className="font-semibold text-brand">{money(t.member_price_cents)} member price</span>
              <span className="h-5 w-px bg-[#d9dbe0]" />
              <span className="text-[#7a7d86] line-through">{money(t.price_cents)}</span>
            </>
          ) : (
            <>
              <span className="font-semibold">{t.price_cents != null ? money(t.price_cents, { from: true }) : "Price on consultation"}</span>
              {t.member_price_cents != null && (
                <>
                  <span className="h-5 w-px bg-[#d9dbe0]" />
                  <span className="font-medium text-brand">{money(t.member_price_cents)} for Members</span>
                </>
              )}
            </>
          )}
        </p>
        <div className="mt-7">
          <RequestButton kind="treatment" itemId={t.id} label="Book now" sentNote="The front desk will text you a time. Nothing is charged in the app." />
        </div>
        <a href={`${base}/scan`} className="mt-4 flex items-center gap-3 rounded-card border border-line p-3.5 hover:border-line-strong">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            <Icon name="face" className="size-5" />
          </span>
          <span className="min-w-0 text-[13px] leading-snug">
            <span className="block font-medium text-ink">Not sure it&rsquo;s right for you?</span>
            <span className="text-ink-muted">Take the free AI face scan and see a preview on your own face.</span>
          </span>
          <Icon name="chevron" className="ml-auto size-4 shrink-0 text-ink-muted" />
        </a>
      </div>
    </PatientShell>
  );
}
