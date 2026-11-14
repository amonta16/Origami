import type { MembershipPlan, Product, Treatment } from "@/lib/types";
import type { SheetItem } from "./patient-provider";
import { CATEGORY_LABEL, type IconName } from "./icons";

export function treatmentItem(t: Treatment): SheetItem {
  const meta = [t.category ? CATEGORY_LABEL[t.category] : null, t.duration_min ? `${t.duration_min} min` : null].filter(Boolean) as string[];
  return {
    kind: "treatment",
    id: t.id,
    name: t.name,
    eyebrow: "Treatment",
    description: t.description,
    price_cents: t.price_cents,
    member_price_cents: t.member_price_cents,
    meta,
  };
}

const PRODUCT_EYEBROW: Record<Product["kind"], string> = { package: "Package", skincare: "Skincare", gift_card: "Gift card" };

export function productItem(p: Product): SheetItem {
  return {
    kind: "product",
    id: p.id,
    name: p.name,
    eyebrow: PRODUCT_EYEBROW[p.kind],
    description: p.description,
    price_cents: p.price_cents,
    member_price_cents: p.member_price_cents,
    meta: p.sessions ? [`${p.sessions} sessions`] : undefined,
  };
}

export function planItem(m: MembershipPlan): SheetItem {
  return {
    kind: "membership",
    id: m.id,
    name: `${m.name} membership`,
    eyebrow: "Membership",
    description: m.tagline,
    price_cents: m.monthly_price_cents,
    perMonth: true,
    perks: m.perks,
  };
}

export function treatmentIcon(t: Treatment): IconName {
  return (t.category ?? "consult") as IconName;
}
