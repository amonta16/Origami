import { Suspense } from "react";
import { Orders } from "@/components/desk/orders";
import { DeniedScreen, DeskHeader, DeskMain, NoDatabase, PageSkeleton, SampleNote } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";
import { orders } from "@/lib/desk/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Shop orders" };

type Props = { params: Promise<{ clinic: string }> };

export default function OrdersPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const rows = await orders(clinic.id);
  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="Shop orders" subtitle="Treatments, shop items and memberships patients asked for in the app." />
      <SampleNote clinic={clinic} />
      {isSupabaseConfigured() ? <Orders slug={clinic.slug} rows={rows} /> : <NoDatabase />}
    </DeskMain>
  );
}
