import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ScanFlow } from "@/components/scan/scan-flow";
import { getClinicBySlug, getTreatments } from "@/lib/data/clinics";

export default function ScanPage({ params }: PageProps<"/s/[clinic]/scan">) {
  return (
    <Suspense fallback={<ScanShell />}>
      <ScanLoader params={params} />
    </Suspense>
  );
}

async function ScanLoader({ params }: { params: PageProps<"/s/[clinic]/scan">["params"] }) {
  const { clinic: slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();
  const treatments = await getTreatments(clinic.id);
  return <ScanFlow clinic={clinic} treatments={treatments} />;
}

function ScanShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-phone flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="h-4 w-28 animate-pulse rounded bg-ivory-deep" />
      <div className="mt-4 h-9 w-64 animate-pulse rounded bg-ivory-deep" />
      <div className="mt-6 space-y-3">
        <div className="h-16 animate-pulse rounded-field bg-ivory-deep" />
        <div className="h-16 animate-pulse rounded-field bg-ivory-deep" />
        <div className="h-16 animate-pulse rounded-field bg-ivory-deep" />
      </div>
    </div>
  );
}
