import { Suspense } from "react";
import { DeniedScreen, DeskHeader, DeskMain, EmptyState, PageSkeleton, Panel } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";

export const metadata = { title: "Payouts" };

type Props = { params: Promise<{ clinic: string }> };

export default function PayoutsPage({ params }: Props) {
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
      <DeskHeader clinic={clinic} title="Payouts" />
      <Panel>
        <EmptyState icon="wallet" title="Payouts aren't part of this build">
          Facet doesn&rsquo;t take card payments, so there&rsquo;s nothing to pay out. Patients ask for things in the app and pay you at the desk the way they do today.
        </EmptyState>
      </Panel>
    </DeskMain>
  );
}
