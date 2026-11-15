import type { Metadata } from "next";
import Link from "next/link";
import { RoiCalculator } from "@/components/marketing/roi-calculator";

export const metadata: Metadata = {
  title: "Is Origami worth it? | Origami",
  description: "Slide in your own numbers and see what patients who come back are worth next to Origami's $250 a month.",
};

// Owner-facing ROI calculator: two sliders, a pallet of cash that fills as the number grows.
export default function RoiPage() {
  return (
    <main className="brand-type relative isolate min-h-dvh bg-page">
      <div aria-hidden="true" className="roi-glow absolute inset-x-0 top-0 -z-10 h-[620px]" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/atlas-engine-bird.png" alt="" width={32} height={32} className="size-8" />
          <span className="font-brand-serif text-[25px] leading-none">Origami</span>
        </Link>
        <Link href="/" className="rounded-[10px] bg-ink px-3.5 py-2.5 text-[14px] font-medium text-white hover:bg-ink-soft">
          Build my app
        </Link>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pb-8 pt-8 sm:px-8 sm:pt-14">
        <p className="roi-pink text-[13px] font-semibold uppercase tracking-[0.14em]">The math</p>
        <h1 className="font-display mt-4 max-w-[22ch] text-balance text-[40px] sm:text-[60px]">
          Origami is $250 a month. What&rsquo;s a patient who comes back worth?
        </h1>
        <p className="mt-5 max-w-[38rem] text-[17px] leading-relaxed text-ink-soft sm:text-[18px]">
          Price only means something next to what it brings back. Two sliders, your own numbers, about thirty seconds.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-10 sm:px-8">
        <RoiCalculator />
      </section>

      <footer className="mx-auto w-full max-w-3xl px-5 pb-12 text-center text-[12.5px] leading-relaxed text-ink-muted sm:px-8">
        An estimate, not a promise or a forecast: it multiplies the two numbers you enter (spend per visit &times; extra
        returning visits a month) and compares the result with Origami&rsquo;s $250 monthly price. Real results depend on
        your spa, your prices and your patients. Origami is built by Atlas Engine, a student team at the CPVC &times; OCOB
        &times; CPE AI Hackathon, Cal Poly, Nov 13&ndash;15, 2026.
      </footer>
    </main>
  );
}
