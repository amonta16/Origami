import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Button, Chip } from "@/components/ui";
import { getClinicBySlug } from "@/lib/data/clinics";

// Phase 3 turns this into the branded landing with questions. For now: brand + Start.
export default function ClinicLanding({ params }: PageProps<"/s/[clinic]">) {
  return (
    <Suspense fallback={null}>
      <Landing params={params} />
    </Suspense>
  );
}

async function Landing({ params }: { params: PageProps<"/s/[clinic]">["params"] }) {
  const { clinic: slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-phone flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <span className="font-display text-xl">{clinic.name}</span>
        {clinic.is_sample && <Chip>Sample clinic</Chip>}
        {clinic.is_preview && <Chip tone="accent">Preview — not live yet</Chip>}
      </div>
      <h1 className="font-display mt-10 text-[40px] leading-[1.02]">
        See what treatments could look like on you.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
        A free AI face scan in about 60 seconds. Live 3D mesh, your skin score, and a
        realistic preview of {clinic.name}&rsquo;s treatments on your own face.
      </p>
      <div className="mt-auto pt-8">
        <Button href={`/s/${clinic.slug}/scan`} full size="lg">
          Start my scan
        </Button>
        <p className="mt-3 text-center text-xs text-ink-muted">18+ · consent first · cosmetic estimates, not a diagnosis</p>
      </div>
    </main>
  );
}
