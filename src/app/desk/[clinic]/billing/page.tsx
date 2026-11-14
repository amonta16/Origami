import { Suspense } from "react";
import { DeniedScreen, DeskHeader, DeskMain, EmptyState, PageSkeleton, Panel } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";

export const metadata = { title: "Billing" };

type Props = { params: Promise<{ clinic: string }> };

export default function BillingPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="Billing" />
      <Panel>
        <EmptyState icon="card" title="Billing isn't part of this build">
          Facet is a student hackathon project and doesn&rsquo;t charge clinics anything. There are no plans, invoices or cards on file here.
        </EmptyState>
      </Panel>
    </DeskMain>
  );
}
