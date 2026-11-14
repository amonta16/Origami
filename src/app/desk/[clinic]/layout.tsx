import { Suspense, type ReactNode } from "react";
import { ClinicTheme } from "@/components/clinic-theme";
import { DeskSidebar } from "@/components/desk/sidebar";
import { DeniedScreen } from "@/components/desk/frame";
import { resolveDesk } from "@/lib/desk/access";

export const metadata = { title: { default: "Front desk", template: "%s · Front desk · Origami" } };

type Props = { children: ReactNode; params: Promise<{ clinic: string }> };

export default function DeskLayout({ children, params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-page" />}>
      <DeskFrame params={params}>{children}</DeskFrame>
    </Suspense>
  );
}

async function DeskFrame({ params, children }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  return (
    <ClinicTheme clinic={clinic}>
      <div className="min-h-dvh w-full bg-page">
        <DeskSidebar slug={clinic.slug} clinicName={clinic.name} isSample={clinic.is_sample} />
        <main className="min-w-0 md:pl-60">{children}</main>
      </div>
    </ClinicTheme>
  );
}
