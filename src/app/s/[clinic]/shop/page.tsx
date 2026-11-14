import { Suspense } from "react";
import Link from "next/link";
import { Button, Chip } from "@/components/ui";
import { PatientShell, SectionTitle, TopTabs } from "@/components/patient/patient-shell";
import { ItemButton } from "@/components/patient/patient-provider";
import { ItemArt } from "@/components/patient/item-art";
import { CATEGORY_LABEL, Icon, type IconName } from "@/components/patient/icons";
import { planItem, productItem, treatmentIcon, treatmentItem } from "@/components/patient/sheet-items";
import { getTreatments } from "@/lib/data/clinics";
import { getPlans, getProducts } from "@/lib/data/catalog";
import { loadPatientPage } from "@/lib/patient/load";
import { money } from "@/lib/money";
import type { Product, Treatment, TreatmentCategory } from "@/lib/types";

export const metadata = { title: "Shop" };

type Tab = "browse" | "memberships" | "treatments";
type Sort = "popular" | "price-asc" | "price-desc";

export default function ShopPage({ params, searchParams }: PageProps<"/s/[clinic]/shop">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Shop params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Shop({ params, searchParams }: Pick<PageProps<"/s/[clinic]/shop">, "params" | "searchParams">) {
  const { clinic: slug } = await params;
  const sp = await searchParams;
  const tab: Tab = sp.tab === "memberships" || sp.tab === "treatments" ? sp.tab : "browse";
  const { clinic, patient, base } = await loadPatientPage(slug);
  const [treatments, products, plans] = await Promise.all([getTreatments(clinic.id), getProducts(clinic.id), getPlans(clinic.id)]);
  const href = (q: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as Array<[string, string]>).toString();
    return `${base}/shop${s ? `?${s}` : ""}`;
  };

  return (
    <PatientShell clinic={clinic} patient={patient} active="shop" title="Shop">
      <TopTabs
        active={tab}
        tabs={[
          { key: "browse", label: "Browse", href: href({}) },
          { key: "memberships", label: "Memberships", href: href({ tab: "memberships" }) },
          { key: "treatments", label: "Treatments", href: href({ tab: "treatments" }) },
        ]}
      />
      {tab === "browse" && <Browse base={base} treatments={treatments} products={products} hasPlans={plans.length > 0} href={href} />}
      {tab === "memberships" && <Memberships plans={plans} currentPlanId={patient?.plan?.id ?? null} clinicName={clinic.name} />}
      {tab === "treatments" && (
        <Treatments
          treatments={treatments}
          cat={typeof sp.cat === "string" ? (sp.cat as TreatmentCategory) : undefined}
          sort={sp.sort === "price-asc" || sp.sort === "price-desc" ? sp.sort : "popular"}
          isMember={Boolean(patient?.plan)}
          href={href}
        />
      )}
    </PatientShell>
  );
}

/* ---------------------------------------------------------------- Browse */

function Browse({
  base,
  treatments,
  products,
  hasPlans,
  href,
}: {
  base: string;
  treatments: Treatment[];
  products: Product[];
  hasPlans: boolean;
  href: (q: Record<string, string | undefined>) => string;
}) {
  const cats = (["injectables", "skin", "laser", "body", "wellness", "consult"] as TreatmentCategory[]).filter((c) => treatments.some((t) => t.category === c));
  const popular = treatments.filter((t) => t.popular).slice(0, 4);
  const rows: Array<{ kind: Product["kind"]; title: string; icon: IconName }> = [
    { kind: "package", title: "Packages", icon: "package" },
    { kind: "skincare", title: "Skincare", icon: "skincare" },
    { kind: "gift_card", title: "Gift cards", icon: "gift_card" },
  ];

  return (
    <div className="pb-4">
      {hasPlans && (
        <section className="px-3 pt-3">
          <div className="relative overflow-hidden rounded-card bg-ink px-6 py-6 text-center text-white">
            <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_120%,rgba(255,255,255,.28),transparent_70%),radial-gradient(40%_80%_at_100%_0%,color-mix(in_oklab,var(--brand)_55%,transparent),transparent_70%)]" />
            <div className="relative">
              <p className="font-display text-[20px] leading-tight">Members pay less, every visit.</p>
              <p className="mt-1.5 text-[13px] text-white/75">Monthly plans with a treatment included and bonus points.</p>
              <Button href={href({ tab: "memberships" })} variant="white" size="sm" className="mt-4">
                See memberships
              </Button>
            </div>
          </div>
        </section>
      )}

      {cats.length > 0 && (
        <section className="grid grid-cols-4 gap-y-4 px-3 pt-6">
          {cats.map((c) => (
            <Link key={c} href={href({ tab: "treatments", cat: c })} className="flex flex-col items-center gap-1.5 rounded-field py-1 text-[12px] text-ink-soft hover:text-ink">
              <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-ink">
                <Icon name={c as IconName} className="size-[22px]" />
              </span>
              {CATEGORY_LABEL[c]}
            </Link>
          ))}
        </section>
      )}

      {popular.length > 0 && (
        <section className="px-3 pt-7">
          <SectionTitle action={<Link href={href({ tab: "treatments" })} className="text-[13px] text-ink-muted hover:text-ink">All treatments</Link>}>Most booked</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-5">
            {popular.map((t) => (
              <ItemButton key={t.id} item={treatmentItem(t)}>
                <ItemArt src={t.image_url} icon={treatmentIcon(t)} alt={t.name} />
                <p className="mt-2 truncate px-0.5 text-[13px]">{t.name}</p>
                <p className="px-0.5 text-[13px] font-medium">{money(t.price_cents, { from: true })}</p>
              </ItemButton>
            ))}
          </div>
        </section>
      )}

      {rows.map((row) => {
        const items = products.filter((p) => p.kind === row.kind);
        if (!items.length) return null;
        return (
          <section key={row.kind} className="pt-8">
            <div className="px-4">
              <SectionTitle>{row.title}</SectionTitle>
            </div>
            <ul className="mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-3 px-3 pb-1 [scrollbar-width:none]">
              {items.map((p) => (
                <li key={p.id} className="w-[44%] shrink-0 snap-start">
                  <ItemButton item={productItem(p)}>
                    <ItemArt src={p.image_url} icon={row.icon} alt={p.name} tone={row.kind === "gift_card" ? "brand" : "muted"} />
                    <p className="mt-2 line-clamp-2 px-0.5 text-[13px] leading-snug">{p.name}</p>
                    <p className="px-0.5 text-[13px] font-medium">{money(p.price_cents)}</p>
                  </ItemButton>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {!treatments.length && !products.length && (
        <p className="px-6 pt-16 text-center text-[14px] text-ink-muted">This clinic hasn&rsquo;t added its menu yet.</p>
      )}

      <p className="px-6 pt-8 text-center text-[11px] text-ink-muted">
        Requests go to the front desk. Nothing is charged in the app. <Link href={`${base}/legal`} className="underline underline-offset-2">Terms</Link>
      </p>
    </div>
  );
}

/* ---------------------------------------------------------- Memberships */

function Memberships({ plans, currentPlanId, clinicName }: { plans: Awaited<ReturnType<typeof getPlans>>; currentPlanId: string | null; clinicName: string }) {
  if (!plans.length) {
    return <p className="px-6 pt-16 text-center text-[14px] text-ink-muted">{clinicName} doesn&rsquo;t offer memberships yet.</p>;
  }
  return (
    <div className="flex flex-col gap-3 px-3 pt-4">
      <p className="px-1 text-[14px] leading-snug text-ink-muted">
        One monthly price, a treatment included, and member prices on everything else. Cancel anytime with the front desk.
      </p>
      {plans.map((m, i) => {
        const current = m.id === currentPlanId;
        const featured = !currentPlanId && i === 1;
        return (
          <article key={m.id} className={current || featured ? "rounded-card border-2 border-ink bg-surface p-5" : "rounded-card border border-line bg-surface p-5"}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-[20px]">{m.name}</h3>
                {m.tagline && <p className="mt-1 text-[13px] leading-snug text-ink-muted">{m.tagline}</p>}
              </div>
              {current ? <Chip tone="brand" className="h-6 shrink-0 text-[11px]">Your plan</Chip> : featured ? <Chip tone="ink" className="h-6 shrink-0 text-[11px]">Most chosen</Chip> : null}
            </div>
            <p className="mt-4">
              <span className="font-display-numeral text-[30px]">{money(m.monthly_price_cents)}</span>
              <span className="text-[14px] text-ink-muted"> /month</span>
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {m.perks.map((p) => (
                <li key={p} className="flex gap-2.5 text-[14px] leading-snug">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                    <Icon name="check" className="size-3.5" strokeWidth={2.2} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            {!current && (
              <ItemButton item={planItem(m)} className="mt-5 block w-full">
                <span className={featured ? "flex h-11 w-full items-center justify-center rounded-chip bg-ink text-[14px] font-medium text-white" : "flex h-11 w-full items-center justify-center rounded-chip border border-line-strong text-[14px] font-medium"}>
                  Choose {m.name}
                </span>
              </ItemButton>
            )}
          </article>
        );
      })}
      <p className="px-2 pb-2 pt-1 text-center text-[11px] leading-relaxed text-ink-muted">
        Choosing a plan sends a request. {clinicName} sets up billing with you in person; nothing is charged in the app.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- Treatments */

function Treatments({
  treatments,
  cat,
  sort,
  isMember,
  href,
}: {
  treatments: Treatment[];
  cat?: TreatmentCategory;
  sort: Sort;
  isMember: boolean;
  href: (q: Record<string, string | undefined>) => string;
}) {
  const cats = (["injectables", "skin", "laser", "body", "wellness", "consult"] as TreatmentCategory[]).filter((c) => treatments.some((t) => t.category === c));
  const price = (t: Treatment) => (isMember ? t.member_price_cents ?? t.price_cents : t.price_cents) ?? Number.MAX_SAFE_INTEGER;
  const list = treatments
    .filter((t) => !cat || t.category === cat)
    .slice()
    .sort((a, b) =>
      sort === "price-asc" ? price(a) - price(b) : sort === "price-desc" ? price(b) - price(a) : Number(Boolean(b.popular)) - Number(Boolean(a.popular)) || a.sort - b.sort,
    );
  const sorts: Array<{ v: Sort; label: string }> = [
    { v: "popular", label: "Popular" },
    { v: "price-asc", label: "Price ↑" },
    { v: "price-desc", label: "Price ↓" },
  ];

  return (
    <div className="pb-4">
      <div className="flex gap-2 overflow-x-auto px-3 pt-3 [scrollbar-width:none]">
        {[undefined, ...cats].map((c) => {
          const on = c === cat;
          return (
            <Link
              key={c ?? "all"}
              href={href({ tab: "treatments", cat: c, sort: sort === "popular" ? undefined : sort })}
              scroll={false}
              aria-current={on ? "true" : undefined}
              className={on ? "flex h-9 shrink-0 items-center rounded-chip bg-ink px-4 text-[13px] font-medium text-white" : "flex h-9 shrink-0 items-center rounded-chip border border-line-strong px-4 text-[13px] text-ink-soft hover:border-ink"}
            >
              {c ? CATEGORY_LABEL[c] : "All"}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-4 pt-3 text-[13px]">
        <span className="text-ink-muted">{list.length} treatments</span>
        <span className="flex gap-3">
          {sorts.map((s) => (
            <Link key={s.v} href={href({ tab: "treatments", cat, sort: s.v === "popular" ? undefined : s.v })} scroll={false} className={s.v === sort ? "font-medium text-ink" : "text-ink-muted hover:text-ink"}>
              {s.label}
            </Link>
          ))}
        </span>
      </div>

      <ul className="flex flex-col gap-7 px-3 pt-4">
        {list.map((t) => (
          <li key={t.id}>
            <ItemButton item={treatmentItem(t)}>
              <ItemArt src={t.image_url} icon={treatmentIcon(t)} alt={t.name} className="aspect-[16/9]" />
              <div className="px-1 pt-3">
                <Chip className="h-6 text-[10px] font-semibold tracking-[0.08em]">TREATMENT</Chip>
                <h3 className="font-display mt-2 text-[17px]">{t.name}</h3>
                {t.description && <p className="mt-1 text-[14px] leading-snug text-ink-muted">{t.description}</p>}
                <p className="mt-2 flex gap-3 text-[13px] text-ink-soft">
                  {t.category && <span>{CATEGORY_LABEL[t.category]}</span>}
                  {t.duration_min && <span>{t.duration_min} min</span>}
                </p>
                <p className="mt-1.5 text-[14px]">
                  {isMember && t.member_price_cents != null ? (
                    <>
                      <span className="font-medium text-brand-ink">{money(t.member_price_cents)} member</span>{" "}
                      <span className="text-ink-muted line-through">{money(t.price_cents)}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{money(t.price_cents, { from: true })}</span>
                      {t.member_price_cents != null && <span className="text-ink-muted"> · {money(t.member_price_cents)} for members</span>}
                    </>
                  )}
                </p>
              </div>
            </ItemButton>
          </li>
        ))}
      </ul>
      {!list.length && <p className="px-6 pt-12 text-center text-[14px] text-ink-muted">Nothing in this category yet.</p>}
    </div>
  );
}
