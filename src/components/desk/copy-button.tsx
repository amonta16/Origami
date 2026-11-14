"use client";

import * as React from "react";
import { DeskIcon } from "./icons";

/** Copies text to the clipboard. Nothing is sent from Facet. */
export function CopyButton({ text, label = "Copy text" }: { text: string; label?: string }) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-line-strong bg-surface px-3 text-[12px] font-medium hover:border-ink"
      title={text}
    >
      <DeskIcon name={state === "copied" ? "check" : "copy"} className="size-3.5" />
      {state === "copied" ? "Copied" : state === "failed" ? "Copy blocked" : label}
    </button>
  );
}
