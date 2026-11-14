import * as React from "react";
import { DeskIcon, type DeskIconName } from "./icons";

/** Quiet empty state, used by server and client desk components. */
export function EmptyState({ icon = "user", title, children }: { icon?: DeskIconName; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-surface-muted text-ink-muted">
        <DeskIcon name={icon} />
      </span>
      <p className="mt-3 text-[14px] font-medium text-ink-soft">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-ink-muted">{children}</div>}
    </div>
  );
}
