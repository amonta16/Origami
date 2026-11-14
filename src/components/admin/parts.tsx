import * as React from "react";
import { cn } from "@/lib/cn";
import type { FunnelStep } from "@/lib/admin/data";

export function Section({ title, description, action, children, className }: { title: string; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card border border-line bg-surface p-5 shadow-soft md:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[17px]">{title}</h2>
          {description && <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Tag({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "outline" | "ink" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-chip px-2 text-[10px] font-semibold uppercase tracking-wide",
        tone === "muted" && "bg-surface-muted text-ink-soft",
        tone === "outline" && "border border-line-strong text-ink-muted",
        tone === "ink" && "bg-ink text-white",
      )}
    >
      {children}
    </span>
  );
}

export function SampleTag() {
  return <Tag>Sample</Tag>;
}

export function TeamTestTag() {
  return <Tag tone="outline">Team test</Tag>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 rounded-field bg-surface-muted px-4 py-3 text-[13px] text-ink-muted">{children}</p>;
}

function pct(n: number, d: number) {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

/** Horizontal funnel: one bar per step, sized to the first step, with conversion from the step it follows. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(1, steps[0]?.all ?? 0);
  const byKey = new Map(steps.map((s) => [s.key, s]));
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="text-[11px] text-ink-muted">
          <tr>
            <th className="pb-2 pr-3 font-medium">Step</th>
            <th className="w-[44%] pb-2 pr-3 font-medium">All time</th>
            <th className="pb-2 pr-3 text-right font-medium">Count</th>
            <th className="pb-2 pr-3 text-right font-medium">From prev.</th>
            <th className="pb-2 text-right font-medium">Last 7 days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {steps.map((s) => {
            const prev = s.from ? byKey.get(s.from) : undefined;
            return (
              <tr key={s.key}>
                <td className="py-2.5 pr-3">
                  <span className="block font-medium">{s.label}</span>
                  <span className="block font-mono text-[11px] text-ink-muted">
                    {s.key}
                    {prev ? ` · after ${prev.key}` : ""}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="block h-3 w-full overflow-hidden rounded-full bg-surface-muted">
                    <span className="block h-full rounded-full bg-ink" style={{ width: s.all ? `${Math.max(2, (s.all / top) * 100)}%` : "0%" }} />
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right text-[15px] font-semibold tabular-nums">{s.all.toLocaleString("en-US")}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-ink-soft">{prev ? pct(s.all, prev.all) : ""}</td>
                <td className="py-2.5 text-right tabular-nums text-ink-soft">
                  {s.week.toLocaleString("en-US")}
                  {prev && <span className="ml-1 text-[11px] text-ink-muted">({pct(s.week, prev.week)})</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LinkPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded-chip border border-line-strong bg-surface px-2.5 text-[12px] font-medium text-ink hover:border-ink">
      {children}
    </a>
  );
}
