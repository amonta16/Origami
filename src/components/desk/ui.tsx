"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { DeskIcon } from "./icons";

/** POST/PATCH/DELETE to a desk API route, then refresh the server components. */
export function useDeskAction() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(
    async <T = Record<string, unknown>,>(url: string, method: "POST" | "PATCH" | "DELETE" | "GET", body?: unknown, opts: { refresh?: boolean } = {}): Promise<T | null> => {
      setPending(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = (await res.json().catch(() => ({}))) as T & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "That didn't save. Try again.");
          return null;
        }
        if (opts.refresh !== false && method !== "GET") router.refresh();
        return data;
      } catch {
        setError("Couldn't reach the server. Check your connection.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [router],
  );

  return { run, pending, error, setError };
}

/** Centered dialog for desktop forms. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-sheet bg-surface p-5 shadow-lift outline-none sm:rounded-sheet sm:p-6",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-[18px]">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-surface-muted" aria-label="Close">
            <DeskIcon name="close" className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const fieldCls =
  "block w-full rounded-field border border-line bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-muted/70 focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10 disabled:opacity-50";

export function Field({ label, hint, className, ...rest }: { label: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <input id={id} {...rest} className={cn(fieldCls, "h-11")} />
      {hint && <p className="text-[12px] text-ink-muted">{hint}</p>}
    </div>
  );
}

export function AreaField({ label, hint, className, rows = 3, ...rest }: { label: string; hint?: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <textarea id={id} rows={rows} {...rest} className={cn(fieldCls, "py-2.5 leading-relaxed")} />
      {hint && <p className="text-[12px] text-ink-muted">{hint}</p>}
    </div>
  );
}

export function SelectField({ label, options, className, ...rest }: { label: string; options: Array<{ value: string; label: string }>; className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <select id={id} {...rest} className={cn(fieldCls, "h-11 pr-8")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CheckRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = React.useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 rounded-field bg-surface-muted px-4 py-3">
      <span>
        <span className="block text-[14px] font-medium">{label}</span>
        {hint && <span className="block text-[12px] text-ink-muted">{hint}</span>}
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5" />
    </label>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-field bg-sev-pronounced-soft px-3 py-2 text-[13px] text-danger">
      {children}
    </p>
  );
}

/** Brand toggle that saves itself: optimistic, reverts on failure. */
export function SavingToggle({ initial, label, onSave }: { initial: boolean; label: string; onSave: (v: boolean) => Promise<boolean> }) {
  const [on, setOn] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={async () => {
        const next = !on;
        setOn(next);
        setBusy(true);
        const ok = await onSave(next);
        if (!ok) setOn(!next);
        setBusy(false);
      }}
      className={cn("relative h-7 w-12 shrink-0 rounded-chip transition-colors disabled:opacity-70", on ? "bg-brand" : "bg-line-strong")}
    >
      <span className={cn("absolute left-0 top-1 size-5 rounded-full bg-white shadow-soft transition-transform", on ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

export function Monogram({ text, className }: { text: string; className?: string }) {
  return <span className={cn("grid size-11 shrink-0 place-items-center rounded-field bg-surface-muted text-[12px] font-semibold tracking-wide text-ink-muted", className)}>{text}</span>;
}

export function PillButton({
  variant = "primary",
  className,
  children,
  ...rest
}: { variant?: "primary" | "secondary" | "brand" | "ghost" | "danger" | "destructive"; className?: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: "bg-ink text-white hover:bg-ink-soft",
    secondary: "border border-line-strong bg-surface text-ink hover:border-ink",
    brand: "bg-brand text-white hover:bg-brand-deep",
    ghost: "bg-surface-muted text-ink hover:bg-line",
    danger: "text-danger hover:bg-sev-pronounced-soft",
    destructive: "bg-danger text-white hover:opacity-90",
  }[variant];
  return (
    <button type="button" {...rest} className={cn("inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-chip px-4 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50", v, className)}>
      {children}
    </button>
  );
}
