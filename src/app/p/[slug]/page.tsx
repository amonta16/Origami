import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClinicTheme } from "@/components/clinic-theme";
import { BookCallButton, FixItButton, LookAroundButton, PhoneFrame } from "@/components/funnel/preview-client";
import { getClinicBySlug, getTreatments } from "@/lib/data/clinics";
import { isOwner } from "@/lib/owner/session";

// Owner preview: their app running live in a phone, the pitch beside it.
// Layout follows the team's disclosed reference recording; copy is written for Facet.
export default function PreviewPage({ params }: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-page" />}>
      <Preview params={params} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  return { title: clinic ? `${clinic.name}: your app` : "Your app", robots: { index: false } };
}

async function Preview({ params }: { params: PageProps<"/p/[slug]">["params"] }) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();
  const [owner, treatments] = await Promise.all([isOwner(clinic.id), getTreatments(clinic.id)]);
  const shortName = clinic.name.split(/\s+[|\-–—·]\s+|\s+l\s+/)[0];

  return (
    <ClinicTheme clinic={clinic} className="bg-page">
      <div className="bg-[#111318] px-4 py-2 text-center text-[12px] text-white/85">
        {clinic.is_preview ? "This is a private preview of your app. It isn't live for patients yet." : `${clinic.name}'s app`}
      </div>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-14 md:px-8 md:pt-10">
        {/* phone */}
        <div className="flex flex-col items-center gap-2 md:sticky md:top-6 md:self-start">
          {owner ? (
            <FixItButton
              slug={clinic.slug}
              initial={{ name: clinic.name, brand_color: clinic.brand_color ?? "", logo_url: clinic.logo_url ?? "", hero_photo_url: clinic.hero_photo_url ?? "" }}
            />
          ) : (
            <span className="h-[18px]" />
          )}
          <PhoneFrame src={`/s/${clinic.slug}`} title={`${clinic.name} app preview`} />
          <p className="text-[12px] text-ink-muted">Tap around. It&rsquo;s the real app.</p>
        </div>

        {/* pitch */}
        <div className="max-w-xl">
          <h1 className="font-display text-[34px] leading-[1.06] sm:text-[44px]">
            {clinic.name},
            <br />
            this is your app.
          </h1>
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:flex">
            <BookCallButton slug={clinic.slug} spaName={shortName} />
            <LookAroundButton />
          </div>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">
            Built from {clinic.website ? new URL(clinic.website).hostname.replace(/^www\./, "") : "your website"} in seconds: your name, your colors{treatments.length ? `, and ${treatments.length} treatments from your menu` : ""}. It works on any phone, no download.
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {[
              "A free AI face scan shows each patient your treatments on their own face",
              "Touch-up reminders go out when a patient's treatment wears off",
              "Points, rewards and memberships that only work at your spa",
            ].map((t) => (
              <li key={t} className="flex gap-2.5 text-[15px] leading-snug">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white">
                  <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {t}
              </li>
            ))}
          </ul>

          <h2 className="font-display mt-10 text-[22px]">Where patients slip away</h2>
          <ul className="mt-4 flex flex-col gap-3.5">
            {[
              ["Reminders stop at the appointment.", "Booking tools remind people about visits they already made. Nobody nudges the patient whose filler wore off last month."],
              ["Loyalty belongs to the brand.", "Manufacturer points follow patients to whichever spa carries the product, including the one down the street."],
              ["Recall is a to-do list.", "Calling everyone who's overdue is the first thing dropped on a busy day."],
            ].map(([b, t]) => (
              <li key={b} className="flex gap-3 text-[15px] leading-snug">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sev-pronounced" aria-hidden="true" />
                <span>
                  <span className="font-medium">{b}</span> <span className="text-ink-muted">{t}</span>
                </span>
              </li>
            ))}
          </ul>

          <section className="mt-8 rounded-card border border-line bg-surface p-6 shadow-soft">
            <p className="text-[12px] font-medium text-brand-ink">How your app handles it</p>
            <h3 className="font-display mt-1 text-[20px]">Due-date recall</h3>
            <ol className="mt-4 flex flex-col gap-4">
              {[
                ["Knows when each treatment wears off", "Every item on your menu has a typical lasting time, so each patient's next visit has a date."],
                ["Reaches them first", "When that date comes up, your app sends a reminder in your name with a reason to book."],
                ["Rewards the return", "Points, rewards and memberships pay off only at your spa."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white">{i + 1}</span>
                  <span>
                    <span className="block text-[15px] font-medium">{t}</span>
                    <span className="block text-[14px] leading-snug text-ink-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {owner && (
            <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-ink p-5 text-white">
              <div>
                <p className="text-[15px] font-medium">Your front desk is ready too</p>
                <p className="text-[13px] text-white/70">Check-ins, points, orders and who&rsquo;s due, for this preview.</p>
              </div>
              <Link href={`/desk/${clinic.slug}`} className="rounded-chip bg-white px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-surface-muted">
                Open the front desk
              </Link>
            </section>
          )}

          <p className="mt-10 text-[12px] leading-relaxed text-ink-muted">
            Built from public content on your website. Photos and logo stay yours; memberships and rewards in this preview are examples you set yourself when you go live. Facet is a student project from the CPVC × OCOB × CPE AI Hackathon at Cal Poly.{" "}
            <Link href="/" className="underline underline-offset-2">
              Build another
            </Link>
          </p>
        </div>
      </main>
    </ClinicTheme>
  );
}
