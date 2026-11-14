import * as React from "react";

/** White builder card with a title row, as in the App Builder screens. */
export function Section({ title, description, action, children }: { title: string; description?: React.ReactNode; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-soft md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[18px]">{title}</h2>
          {description && <p className="mt-1 max-w-[560px] text-[13px] leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
