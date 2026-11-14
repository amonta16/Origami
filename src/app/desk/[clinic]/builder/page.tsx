import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DeniedScreen, DeskHeader, DeskMain, NoDatabase, PageSkeleton, SampleNote } from "@/components/desk/frame";
import { TreatmentsEditor } from "@/components/desk/builder/treatments";
import { ShopEditor } from "@/components/desk/builder/shop";
import { ScanSetting } from "@/components/desk/builder/scan";
import { PlansEditor } from "@/components/desk/builder/plans";
import { RewardsEditor } from "@/components/desk/builder/rewards";
import { BrandForm, DetailsForm, PointsForm } from "@/components/desk/builder/settings";
import { JourneyEditor } from "@/components/desk/builder/journey";
import { OffersEditor } from "@/components/desk/builder/offers";
import { getTreatments } from "@/lib/data/clinics";
import { clinicPhotos } from "@/lib/stock-photos";
import { resolveDesk } from "@/lib/desk/access";
import { deskPlans, deskProducts, deskRewards, deskTreatments } from "@/lib/desk/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "App Builder" };

type Props = { params: Promise<{ clinic: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { id: "journey", label: "Journey", subs: [{ id: "offers", label: "Automated offers" }, { id: "automations", label: "Automations" }] },
  { id: "products", label: "Products", subs: [{ id: "treatments", label: "Treatments" }, { id: "shop", label: "Shop" }, { id: "scan", label: "AI skin scan" }] },
  { id: "membership", label: "Membership", subs: [] },
  { id: "rewards", label: "Rewards", subs: [] },
  { id: "settings", label: "Settings", subs: [{ id: "brand", label: "Brand" }, { id: "details", label: "Clinic details" }, { id: "points", label: "Points" }] },
] as const;

export default function BuilderPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: Props) {
  const { clinic, allowed } = await resolveDesk(params);
  if (!allowed) return <DeniedScreen />;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab) ?? TABS[1];
  const subs = tab.subs as ReadonlyArray<{ id: string; label: string }>;
  const sub = subs.find((s) => s.id === sp.sub) ?? subs[0];
  const base = `/desk/${clinic.slug}/builder`;
  const settingsReady = clinic.settings !== undefined;

  let body: ReactNode = null;
  if (!isSupabaseConfigured()) body = <NoDatabase />;
  else if (tab.id === "products" && sub?.id === "treatments") body = <TreatmentsEditor slug={clinic.slug} items={await deskTreatments(clinic.id)} />;
  else if (tab.id === "products" && sub?.id === "shop") body = <ShopEditor slug={clinic.slug} items={await deskProducts(clinic.id)} />;
  else if (tab.id === "products" && sub?.id === "scan")
    body = <ScanSetting slug={clinic.slug} enabled={clinic.settings?.scan_enabled ?? true} settingsReady={settingsReady} />;
  else if (tab.id === "membership") body = <PlansEditor slug={clinic.slug} items={await deskPlans(clinic.id)} />;
  else if (tab.id === "rewards") body = <RewardsEditor slug={clinic.slug} items={await deskRewards(clinic.id)} />;
  else if (tab.id === "settings" && sub?.id === "brand")
    body = <BrandForm slug={clinic.slug} initial={{ name: clinic.name, brand_color: clinic.brand_color, logo_url: clinic.logo_url, hero_photo_url: clinic.hero_photo_url ?? null }} />;
  else if (tab.id === "settings" && sub?.id === "details")
    body = <DetailsForm slug={clinic.slug} initial={{ phone: clinic.phone, address: clinic.address, website: clinic.website, booking_url: clinic.booking_url }} />;
  else if (tab.id === "settings" && sub?.id === "points")
    body = <PointsForm slug={clinic.slug} initial={{ welcome_points: clinic.welcome_points ?? 100, visit_points: clinic.visit_points ?? 50, points_per_dollar: clinic.points_per_dollar ?? 1 }} />;
  else if (tab.id === "journey" && sub?.id !== "automations") {
    const photos = clinicPhotos(clinic);
    const all = await getTreatments(clinic.id);
    const popular = all.filter((t) => t.popular);
    body = (
      <OffersEditor
        slug={clinic.slug}
        initialOn={clinic.settings?.journey ?? {}}
        initialOverrides={clinic.settings?.offers ?? {}}
        settingsReady={settingsReady}
        preview={{
          clinicName: clinic.name,
          logoUrl: clinic.logo_url,
          hero: photos.hero,
          heroFallback: photos.heroFallback,
          treatments: (popular.length >= 2 ? popular : all).slice(0, 4).map((t) => ({ id: t.id, name: t.name, image_url: t.image_url ?? null, image_fallback: t.image_fallback, price_cents: t.price_cents })),
        }}
      />
    );
  } else if (tab.id === "journey")
    body = <JourneyEditor slug={clinic.slug} view={sub?.id === "automations" ? "automations" : "offers"} initial={clinic.settings?.journey ?? {}} settingsReady={settingsReady} />;

  return (
    <DeskMain>
      <DeskHeader clinic={clinic} title="App Builder" />
      <SampleNote clinic={clinic} />
      <nav aria-label="App Builder sections" className="-mx-4 overflow-x-auto overflow-y-hidden [scrollbar-width:none] border-b border-line px-4 md:mx-0 md:px-0">
        <ul className="flex gap-6">
          {TABS.map((t) => {
            const active = t.id === tab.id;
            return (
              <li key={t.id}>
                <Link
                  href={`${base}?tab=${t.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative inline-block whitespace-nowrap pb-2.5 text-[14px]", active ? "font-medium text-brand" : "text-ink-muted hover:text-ink")}
                >
                  {t.label}
                  {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {subs.length > 0 && (
        <div className="mt-4 inline-flex max-w-full overflow-x-auto rounded-chip bg-surface-muted p-1">
          {subs.map((s) => {
            const active = s.id === sub?.id;
            return (
              <Link
                key={s.id}
                href={`${base}?tab=${tab.id}&sub=${s.id}`}
                aria-current={active ? "page" : undefined}
                className={cn("whitespace-nowrap rounded-chip px-3.5 py-1.5 text-[13px] font-medium transition-colors", active ? "bg-surface text-ink shadow-soft" : "text-ink-muted hover:text-ink")}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      )}
      <div className="mt-5">{body}</div>
    </DeskMain>
  );
}
