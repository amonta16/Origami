import Link from "next/link";
import { OwnerFunnel } from "@/components/funnel/owner-funnel";
import { DeskArt, ScanArt, SiteToAppArt } from "@/components/marketing/pillar-art";
import { FlockBackground } from "@/components/marketing/flock";

// Owner funnel entry: type your spa, watch your app get built, land on your preview.
// Centered hero over a flock of paper birds; serif headline with one chrome word.
export default function Home() {
  return (
    <main className="brand-type min-h-dvh bg-page">
      <div className="relative isolate">
        {/* flock of paper birds behind the hero, fading out before the cards */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(180deg,#000_0%,#000_72%,transparent_100%)]">
          <FlockBackground />
        </div>

        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/atlas-engine-bird.png" alt="" width={32} height={32} className="size-8" />
            <span className="font-brand-serif text-[25px] leading-none">Facet</span>
          </Link>
          <Link href="/s/sample" className="rounded-[10px] bg-ink px-4 py-2.5 text-[14px] font-medium text-white hover:bg-ink-soft">
            See a sample app
          </Link>
        </header>

        <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-20 pt-12 text-center sm:px-8 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3.5 text-[13px] text-ink-soft shadow-soft backdrop-blur-sm">
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
            For med spa owners
          </p>
          <h1 className="font-display mt-7 max-w-[19ch] text-balance text-[44px] sm:text-[66px]">
            Your spa&rsquo;s <span className="chrome-text">own app</span>, built in under a minute.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-soft sm:text-[18px]">
            Type your spa&rsquo;s name. We read your website for your name, colors, photos and real menu, then patients scan their face, book, and come back when it&rsquo;s due.
          </p>
          <div className="mt-9 w-full max-w-[38rem]">
            <OwnerFunnel />
          </div>
          <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[13px] text-ink-soft">
            {["Built from your website", "Works on any phone", "No card needed"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[13px] text-ink-muted">
            Powered by <span className="chrome-text font-medium">Atlas Engine</span>
          </p>
        </section>
      </div>

      <section className="mx-auto grid w-full max-w-5xl gap-3 px-5 pb-16 sm:grid-cols-3 sm:px-8">
        {[
          { art: <SiteToAppArt />, t: "Built from what's already yours", d: "We read your public website for your menu, photos and colors. You fix anything in a click." },
          { art: <ScanArt />, t: "An AI face scan that sells", d: "Each patient sees a realistic preview of your treatments on their own face, then books." },
          { art: <DeskArt />, t: "A front desk that fills slow days", d: "Check-ins, points, memberships and who's due for a touch-up, in one place." },
        ].map(({ art, t, d }) => (
          <div key={t} className="rounded-card border border-line bg-surface p-2.5 pb-5">
            {art}
            <p className="font-brand-serif mt-4 px-2.5 text-[21px]">{t}</p>
            <p className="mt-1.5 px-2.5 text-[14px] leading-snug text-ink-muted">{d}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto w-full max-w-3xl px-5 pb-10 text-center text-[12px] leading-relaxed text-ink-muted sm:px-8">
        Facet is built by Atlas Engine, a student team at the CPVC × OCOB × CPE AI Hackathon, Cal Poly, Nov 13–15, 2026. Previews are private links, built only from public website content, and labeled &ldquo;Preview&rdquo; until a spa chooses to go live.
      </footer>
    </main>
  );
}
