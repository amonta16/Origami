import { Suspense } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui";
import { PatientShell } from "@/components/patient/patient-shell";
import { JoinButton } from "@/components/patient/patient-provider";
import { Icon } from "@/components/patient/icons";
import { loadPatientPage } from "@/lib/patient/load";

export const metadata = { title: "Check in" };

// Center tab: the front-desk check-in code, laid out like the reference's check-in screen.
export default function VisitPage({ params }: PageProps<"/s/[clinic]/visit">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Visit params={params} />
    </Suspense>
  );
}

async function Visit({ params }: { params: PageProps<"/s/[clinic]/visit">["params"] }) {
  const { clinic: slug } = await params;
  const { clinic, patient, base } = await loadPatientPage(slug);
  const visitPoints = clinic.visit_points ?? 50;

  // The QR carries only the clinic slug and the 6-digit code; the front desk looks the patient up from it.
  const qr = patient?.checkin_code
    ? await QRCode.toString(`facet:checkin:${clinic.slug}:${patient.checkin_code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111318", light: "#ffffff" } })
    : null;

  return (
    <PatientShell clinic={clinic} patient={patient} active="scan" title="Check in">
      <section className="px-6 pt-6 text-center">
        <h1 className="font-display text-[22px]">Visiting {clinic.name}?</h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-[14px] leading-snug text-ink-muted">
          {patient
            ? `Show this code at the front desk to check in${visitPoints ? ` and earn ${visitPoints} points` : ""}.`
            : `Join on this phone to get your check-in code${visitPoints ? ` and earn ${visitPoints} points at every visit` : ""}.`}
        </p>

        {patient && qr ? (
          <>
            <div className="mx-auto mt-6 w-52 rounded-[22px] border border-line bg-white p-5 shadow-soft">
              <div className="aspect-square [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`Check-in QR code for ${patient.checkin_code}`} dangerouslySetInnerHTML={{ __html: qr }} />
            </div>
            <p className="font-display-numeral mt-6 pl-[0.35em] text-[26px]" style={{ letterSpacing: "0.35em" }} aria-label={`Code ${patient.checkin_code?.split("").join(" ")}`}>
              {patient.checkin_code}
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {patient.first_name} · {patient.points.toLocaleString()} points
            </p>
            <Button href={`${base}/rewards`} size="lg" className="mt-6 w-full max-w-[15rem]">
              See my points
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto mt-6 grid w-52 place-items-center rounded-[22px] border border-dashed border-line-strong bg-surface-muted p-5 text-ink-muted">
              <div className="grid aspect-square w-full place-items-center">
                <Icon name="qr" className="size-16" strokeWidth={1.2} />
              </div>
            </div>
            <JoinButton size="lg" className="mt-6 w-full max-w-[15rem]" reason="Your card gets a QR code the front desk scans when you arrive.">
              Get my check-in code
            </JoinButton>
          </>
        )}
      </section>

      <section className="px-4 pt-10">
        <a href={`${base}/scan`} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-line-strong">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            <Icon name="face" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-medium">Free AI face scan</span>
            <span className="block text-[13px] leading-snug text-ink-muted">Your skin score and a preview of treatments on your own face.</span>
          </span>
          <Icon name="chevron" className="ml-auto size-4 shrink-0 text-ink-muted" />
        </a>
      </section>
    </PatientShell>
  );
}
