"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "call_booked", label: "Call booked" },
  { value: "founding", label: "Founding clinic" },
  { value: "live", label: "Live" },
  { value: "lost", label: "Lost" },
];

const field = "rounded-field border border-line bg-surface px-3 text-[13px] text-ink focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10 disabled:opacity-50";

/** Stage dropdown + notes for one owner lead. Saves to /api/admin/owner-leads/[id]. */
export function LeadEditor({ id, stage, notes }: { id: string; stage: string; notes: string | null }) {
  const router = useRouter();
  const [s, setS] = React.useState(stage);
  const [n, setN] = React.useState(notes ?? "");
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = React.useState<string | null>(null);
  const dirty = s !== stage || n.trim() !== (notes ?? "").trim();

  async function save() {
    setState("saving");
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/owner-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: s, notes: n }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setState("error");
        setMsg(res.status === 401 ? "Signed out. Reload and sign in again." : (data.error ?? "That didn't save."));
        return;
      }
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
      setMsg("Couldn't reach the server.");
    }
  }

  return (
    <div className="flex min-w-[260px] flex-col gap-2">
      <select aria-label="Stage" value={s} onChange={(e) => setS(e.target.value)} className={cn(field, "h-9 pr-8")}>
        {STAGES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <textarea aria-label="Notes" rows={2} value={n} onChange={(e) => setN(e.target.value)} placeholder="Notes" className={cn(field, "py-2 leading-relaxed")} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === "saving"}
          className="inline-flex h-8 items-center rounded-chip bg-ink px-3.5 text-[12px] font-medium text-white hover:bg-ink-soft disabled:pointer-events-none disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" && !dirty && <span className="text-[12px] text-ok">Saved</span>}
        {msg && (
          <span role="alert" className="text-[12px] text-danger">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
