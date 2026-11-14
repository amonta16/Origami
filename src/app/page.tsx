import Link from "next/link";
import { OwnerFunnel } from "@/components/funnel/owner-funnel";

// Owner funnel entry: type your spa, watch your app get built, land on your preview.
export default function Home() {
  return (
    <main className="min-h-dvh bg-page">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
          <FacetMark />
          Facet
        </span>
        <Link href="/s/sample" className="rounded-chip px-3 py-2 text-[14px] text-ink-soft hover:bg-surface-muted hover:text-ink">
          See a sample app
        </Link>
      </header>

      <section className="mx-auto w-full max-w-3xl px-5 pb-10 pt-10 sm:px-8 sm:pt-20">
        <p className="text-[14px] text-ink-muted">For med spa owners</p>
        <h1 className="font-display mt-3 text-[40px] leading-[1.02] sm:text-[60px]">Your spa&rsquo;s own app, built from your website in under a minute.</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-muted">
          Your name, colors, photos and real menu. Patients scan their face, see a treatment on themselves, book, and come back when it&rsquo;s due.
        </p>
        <div className="mt-9">
          <OwnerFunnel />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-3xl gap-3 px-5 pb-16 sm:grid-cols-3 sm:px-8">
        {[
          ["Built from what's already yours", "We read your public website for your menu, photos and colors. You fix anything in a click."],
          ["An AI face scan that sells", "Each patient sees a realistic preview of your treatments on their own face, then books."],
          ["A front desk that fills slow days", "Check-ins, points, memberships and who's due for a touch-up, in one place."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-card border border-line bg-surface p-5">
            <p className="text-[15px] font-medium">{t}</p>
            <p className="mt-1.5 text-[14px] leading-snug text-ink-muted">{d}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto w-full max-w-3xl px-5 pb-10 text-[12px] leading-relaxed text-ink-muted sm:px-8">
        Facet is a student project built at the CPVC × OCOB × CPE AI Hackathon, Cal Poly, Nov 13–15, 2026. Previews are private links, built only from public website content, and labeled &ldquo;Preview&rdquo; until a spa chooses to go live.
      </footer>
    </main>
  );
}

function FacetMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path d="M12 2.5 20.5 7.5v9L12 21.5 3.5 16.5v-9Z" fill="#111318" />
      <path d="M12 2.5v19M3.5 7.5 20.5 16.5M20.5 7.5 3.5 16.5" stroke="white" strokeOpacity=".35" strokeWidth=".8" />
    </svg>
  );
}
