import { Suspense } from "react";
import { CheckIn } from "@/components/desk/check-in";
import { DeniedScreen, DeskHeader, DeskMain, NoDatabase, PageSkeleton, SampleNote } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";
import { deskTreatments } from "@/lib/desk/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Check in" };

type Props = { params: Promise<{ clinic: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function CheckInPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const sp = await searchParams;
  const treatments = (await deskTreatments(clinic.id)).filter((t) => t.active).map((t) => ({ id: t.id, name: t.name }));
  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="Check in" />
      <SampleNote clinic={clinic} />
      {isSupabaseConfigured() ? (
        <CheckIn
          key={sp.scan === "1" ? "scan" : "find"}
          slug={clinic.slug}
          treatments={treatments}
          visitPoints={clinic.visit_points ?? 50}
          pointsPerDollar={clinic.points_per_dollar ?? 1}
          autoScan={sp.scan === "1"}
        />
      ) : (
        <NoDatabase />
      )}
    </DeskMain>
  );
}
