import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { waitingOrderCount } from "@/lib/desk/data";
import type { DeskClinic } from "@/lib/desk/types";
import { DeskIcon } from "./icons";
import { EmptyState } from "./empty";

export { EmptyState };

/** Page header: title, bell (waiting shop orders), brand "Scan QR", "View app". */
export async function DeskHeader({ clinic, title, subtitle }: { clinic: DeskClinic; title: React.ReactNode; subtitle?: React.ReactNode }) {
  const waiting = await waitingOrderCount(clinic.id);
  const base = `/desk/${clinic.slug}`;
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-6 pt-6 md:pt-8">
      <div className="min-w-0">
        <h1 className="font-display text-[24px] md:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <Link
            href={`${base}/orders`}
            className="relative grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:text-ink"
            aria-label={waiting ? `${waiting} shop orders waiting` : "No shop orders waiting"}
          >
            <DeskIcon name="bell" className="size-4" />
            {waiting > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">{waiting}</span>
            )}
          </Link>
          <Link href={`${base}/check-in?scan=1`} className="inline-flex h-9 items-center gap-2 rounded-chip bg-brand px-4 text-[13px] font-medium text-white hover:bg-brand-deep">
            <DeskIcon name="checkin" className="size-4" />
            Scan QR
          </Link>
        </div>
        <Link href={`/s/${clinic.slug}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline">
          <DeskIcon name="eye" className="size-3.5" />
          View app
        </Link>
      </div>
    </header>
  );
}

export function DeskMain({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1180px] px-4 pb-16 md:px-8", className)}>{children}</div>;
}

export function Panel({ title, description, action, className, children, padding = true }: { title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string; children?: React.ReactNode; padding?: boolean }) {
  return (
    <section className={cn("rounded-card border border-line bg-surface shadow-soft", padding && "p-5 md:p-6", className)}>
      {(title || action) && (
        <div className={cn("flex flex-wrap items-start justify-between gap-3", !padding && "px-5 pt-5 md:px-6 md:pt-6")}>
          <div className="min-w-0">
            {title && <h2 className="font-display text-[17px]">{title}</h2>}
            {description && <p className="mt-1 max-w-[560px] text-[13px] leading-relaxed text-ink-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SampleNote({ clinic }: { clinic: DeskClinic }) {
  if (!clinic.is_sample) return null;
  return (
    <p className="mb-5 flex items-start gap-2 rounded-field border border-line bg-surface px-4 py-2.5 text-[12px] text-ink-muted">
      <span className="mt-px inline-flex h-5 shrink-0 items-center rounded-chip bg-surface-muted px-2 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Sample</span>
      This is the fictional sample clinic. Patients and numbers here come from demo activity, not a real med spa, and are left out of any proof counts.
    </p>
  );
}

export function NoDatabase() {
  return (
    <Panel>
      <EmptyState icon="help" title="The database isn't connected on this server">
        Once Supabase is configured, this page fills in from real data.
      </EmptyState>
    </Panel>
  );
}

export function DeniedScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-page px-4">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-soft">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-muted text-ink-muted">
          <DeskIcon name="user" />
        </span>
        <h1 className="font-display mt-4 text-[20px]">This desk belongs to the clinic that built it</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          Only the browser that set up this clinic can open its front desk. Staff logins aren&rsquo;t part of this build yet.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/desk/sample" className="inline-flex h-10 items-center rounded-chip bg-ink px-5 text-[14px] font-medium text-white hover:bg-ink-soft">
            Try the sample desk
          </Link>
          <Link href="/" className="inline-flex h-10 items-center rounded-chip border border-line-strong bg-surface px-5 text-[14px] font-medium hover:border-ink">
            Back to Origami
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-card bg-surface-muted", className)} />;
}

export function PageSkeleton() {
  return (
    <DeskMain>
      <div className="pb-6 pt-8">
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="mt-4 h-72" />
    </DeskMain>
  );
}
