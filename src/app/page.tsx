import { Button } from "@/components/ui";

// Placeholder home. The owner funnel ("type your med spa's name") replaces this in Phase 2.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
      <p className="text-sm text-ink-muted">Facet · built at the CPVC AI Hackathon, Nov 13–15, 2026</p>
      <h1 className="font-display mt-3 text-5xl sm:text-7xl">
        The skin scanner, out of the back room and into her pocket.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
        A free AI face scan any med spa can hand every patient. She sees a
        realistic after on her own face, books, and gets reminded when it&rsquo;s
        time to come back.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/styleguide" variant="secondary">
          Design system
        </Button>
      </div>
    </main>
  );
}
