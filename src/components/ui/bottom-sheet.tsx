"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Mobile bottom sheet. Renders in place (no portal) so it works inside the
 * phone-frame preview on desktop as well as full screen on a phone.
 * Pass `inset` to confine it to the nearest positioned ancestor.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  inset = false,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  inset?: boolean;
  className?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        inset ? "absolute" : "fixed",
        "inset-0 z-50 flex items-end justify-center",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-phone rounded-t-sheet bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-lift outline-none transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
          open ? "translate-y-0" : "translate-y-full",
          className,
        )}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line-strong"
        />
        {title && <h2 className="font-display mb-3 text-xl">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
