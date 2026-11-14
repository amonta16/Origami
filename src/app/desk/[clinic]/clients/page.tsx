import { Suspense } from "react";
import { ClientList } from "@/components/desk/clients";
import { DeniedScreen, DeskHeader, DeskMain, NoDatabase, PageSkeleton, SampleNote } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";
import { leadSummaries } from "@/lib/desk/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Client profiles" };

type Props = { params: Promise<{ clinic: string }> };

export default function ClientsPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const leads = await leadSummaries(clinic.id);
  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="Client profiles" subtitle="Everyone who joined your app. Open a profile for points, visits, requests and rewards." />
      <SampleNote clinic={clinic} />
      {isSupabaseConfigured() ? <ClientList slug={clinic.slug} leads={leads} /> : <NoDatabase />}
    </DeskMain>
  );
}
