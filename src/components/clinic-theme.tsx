import * as React from "react";
import type { Clinic } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Sets the clinic's brand color as the page's --brand and gives patient screens a white page. */
export function ClinicTheme({ clinic, className, children }: { clinic: Clinic; className?: string; children: React.ReactNode }) {
  const brand = clinic.brand_color && /^#[0-9a-f]{6}$/i.test(clinic.brand_color) ? clinic.brand_color : undefined;
  const style = brand
    ? ({ "--brand": brand, "--brand-deep": shade(brand, -0.22), "--brand-soft": tint(brand, 0.9), "--brand-ink": shade(brand, -0.15) } as React.CSSProperties)
    : undefined;
  return (
    <div style={style} className={cn("min-h-dvh bg-white text-ink", className)}>
      {children}
    </div>
  );
}

function hex(n: number) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}
function parse(h: string) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
/** Darken by fraction (negative) toward black. */
function shade(h: string, f: number) {
  const [r, g, b] = parse(h);
  return `#${hex(r * (1 + f))}${hex(g * (1 + f))}${hex(b * (1 + f))}`;
}
/** Mix toward white by fraction. */
function tint(h: string, f: number) {
  const [r, g, b] = parse(h);
  return `#${hex(r + (255 - r) * f)}${hex(g + (255 - g) * f)}${hex(b + (255 - b) * f)}`;
}
