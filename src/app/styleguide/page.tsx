import type { Metadata } from "next";
import { AppBar, Button, Card, CardText, CardTitle, Chip, Input, TabBar, Textarea } from "@/components/ui";
import type { Severity } from "@/components/ui";
import { GiftArt } from "@/components/patient/gift-art";
import { OFFERS } from "@/lib/offers";
import { BottomSheetDemo, ChoiceChipDemo, ControlsDemo, ScoreRingDemo } from "./demos";

export const metadata: Metadata = { title: "Styleguide" };

const colors: Array<{ name: string; token: string; cls: string }> = [
  { name: "Page", token: "--page", cls: "bg-page border border-line" },
  { name: "Surface", token: "--surface", cls: "bg-surface border border-line" },
  { name: "Surface muted", token: "--surface-muted", cls: "bg-surface-muted" },
  { name: "Line", token: "--line", cls: "bg-line" },
  { name: "Ink", token: "--ink", cls: "bg-ink" },
  { name: "Ink muted", token: "--ink-muted", cls: "bg-ink-muted" },
  { name: "Brand (per clinic)", token: "--brand", cls: "bg-brand" },
  { name: "Brand soft", token: "--brand-soft", cls: "bg-brand-soft" },
];

const severities: Severity[] = ["none", "mild", "moderate", "pronounced"];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10 first:border-t-0">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div>
          <h2 className="font-display text-[22px]">{title}</h2>
          {note && <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{note}</p>}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <header className="pb-8">
        <p className="text-[13px] text-ink-muted">Origami design system</p>
        <h1 className="font-display mt-2 max-w-3xl text-[40px] sm:text-[52px]">White, near-black, hairlines, and one clinic color.</h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-muted">
          Retuned to the team&rsquo;s disclosed design reference (see reference/REFERENCE.md). Black pill primaries, white bordered secondaries, the clinic&rsquo;s brand color for the one brand action, toggles, rings and underlines. Inter throughout. Patient screens at 390px, the desk at desktop width.
        </p>
      </header>

      <Section title="Color" note="Tokens live in globals.css and double as Tailwind utilities (bg-brand, text-ink-muted). --brand is overridden per clinic on /s/[clinic]. The severity ramp is only for concerns.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map((c) => (
            <div key={c.token} className="overflow-hidden rounded-card border border-line bg-surface">
              <div className={`h-16 ${c.cls}`} />
              <div className="px-3 py-2">
                <div className="text-[13px] font-medium">{c.name}</div>
                <div className="text-[11px] text-ink-muted">{c.token}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className="text-[13px] text-ink-muted">Severity</span>
          <div className="flex flex-1 overflow-hidden rounded-chip">
            <div className="h-2.5 flex-1 bg-sev-none" />
            <div className="h-2.5 flex-1 bg-sev-mild" />
            <div className="h-2.5 flex-1 bg-sev-moderate" />
            <div className="h-2.5 flex-1 bg-sev-pronounced" />
          </div>
        </div>
      </Section>

      <Section title="Type" note="Inter for everything. Headings semibold with tight tracking; body 14px on the phone, 13px for meta. A serif is reserved for report-style moments (font-serif-display).">
        <div className="space-y-5">
          <div className="font-display text-[44px]">Good morning, Sample Aesthetics.</div>
          <div className="font-display text-[24px]">See what treatments could look like on you.</div>
          <div className="font-display text-[17px]">Due for a touch-up in 12 days</div>
          <p className="max-w-prose text-[14px] leading-relaxed">
            Body copy stays plain and direct: tell her what the scan found, what it could look like, and what happens next. No medical claims, no exclamation marks.
          </p>
          <p className="text-[12px] text-ink-muted">Meta, 12px, for consent lines and footnotes. Results are cosmetic estimates, not a medical diagnosis.</p>
          <div className="flex items-baseline gap-6">
            <span className="font-display font-display-numeral text-[56px]">72</span>
            <span className="font-display font-display-numeral text-[40px] text-ink-muted">86</span>
            <span className="font-display font-display-numeral text-[28px] text-ink-muted">$650</span>
          </div>
          <div className="font-serif-display text-[36px]">November, month to date</div>
        </div>
      </Section>

      <Section title="Buttons" note="Black pill primary. White bordered secondary. Brand pill for the one brand action on a desk screen (Scan QR). White pill on dark or brand panels.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Add treatment</Button>
          <Button variant="secondary">Review</Button>
          <Button variant="brand">Scan QR</Button>
          <Button variant="ghost">Not now</Button>
          <Button loading>Building your scanner</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="mt-4 flex max-w-phone flex-col gap-3 rounded-card bg-brand p-5">
          <p className="text-[13px] text-white/85">On a brand panel</p>
          <Button variant="white">Start the 1-minute scan</Button>
        </div>
      </Section>

      <Section title="Controls" note="Segmented sub-tabs (gray track, white active pill) and brand-colored toggles, straight from the desk reference.">
        <ControlsDemo />
      </Section>

      <Section title="Inputs" note="16px text so iOS doesn't zoom. Labels above, hints below, errors replace hints. Focus ring is ink, not brand.">
        <div className="grid max-w-phone gap-4">
          <Input label="First name" placeholder="Maya" />
          <Input label="Mobile" type="tel" placeholder="(805) 555-0100" hint="We text your results link here." />
          <Input label="Email" type="email" defaultValue="maya@" error="That email looks incomplete." />
          <Textarea label="Notes for the clinic" placeholder="Anything they should know?" />
        </div>
      </Section>

      <Section title="Chips" note="Small, quiet pills. Choice chips are the tap targets on the five questions. Severity dots carry the concern ramp.">
        <div className="flex flex-wrap gap-2">
          <Chip>Sample clinic</Chip>
          <Chip tone="brand">Preview — not live yet</Chip>
          <Chip tone="ink">New lead</Chip>
          <Chip tone="outline">Botox · 90 days</Chip>
          <Chip tone="ok">Full access</Chip>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {severities.map((s) => (
            <Chip key={s} severity={s}>
              Forehead lines · {s === "none" ? "Clear" : s[0].toUpperCase() + s.slice(1)}
            </Chip>
          ))}
        </div>
        <div className="mt-6">
          <ChoiceChipDemo />
        </div>
      </Section>

      <Section title="Cards" note="White, 16px radius, hairline border, a whisper of shadow. Ink and brand cards for the one moment on a screen that must win.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <Chip className="h-6 px-2 text-[10px] tracking-wide">TREATMENT</Chip>
            <CardTitle className="mt-2">Lip filler</CardTitle>
            <CardText className="mt-1">Adds volume and definition to the lips. Results last 6 to 12 months.</CardText>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-display font-display-numeral text-[20px]">$650</span>
              <Button size="sm" variant="secondary">
                Preview on my face
              </Button>
            </div>
          </Card>
          <Card tone="brand-soft">
            <CardTitle>Why this is relevant to you</CardTitle>
            <CardText className="mt-1 text-brand-ink">Your lip definition scored 48. Volume loss at the vermilion border is the main driver.</CardText>
          </Card>
          <Card tone="ink">
            <CardTitle>Due for a touch-up</CardTitle>
            <CardText className="mt-1 text-white/70">7 patients, about $3,400 in repeat revenue waiting on a text.</CardText>
            <div className="mt-4">
              <Button size="sm" variant="white">
                Open the list
              </Button>
            </div>
          </Card>
          <Card tone="brand">
            <CardTitle>Your scanner is ready</CardTitle>
            <CardText className="mt-1 text-white/80">Scan the code to open it on your phone.</CardText>
          </Card>
        </div>
      </Section>

      <Section title="App chrome" note="Patient app top bar (clinic mark, two icons) and the floating five-tab bar. Tabs without a destination yet render muted.">
        <div className="relative mx-auto h-[420px] w-full max-w-phone overflow-hidden rounded-[40px] border border-line-strong bg-white shadow-lift">
          <AppBar title="Sample Aesthetics" right={<Chip>Sample clinic</Chip>} />
          <div className="px-4">
            <div className="aspect-[4/3] rounded-card bg-surface-muted" />
            <p className="font-display mt-4 text-[17px]">Popular right now</p>
          </div>
          <TabBar active="home" base="/s/sample" className="!absolute" />
        </div>
      </Section>

      <Section title="Score ring" note="Animates from zero on first paint. The thin outer arc is her Potential after the recommended plan. Brand-colored.">
        <ScoreRingDemo />
      </Section>

      <Section title="Bottom sheet" note="Booking, consent and confirmations live here on the phone. Escape and backdrop close it. Shown inside a 390px frame.">
        <BottomSheetDemo />
      </Section>
      <section id="gift-cards" className="mt-14">
        <h2 className="font-display text-[22px]">Offer gift cards</h2>
        <p className="mt-1 text-[14px] text-ink-muted">The wrapping for every automated offer, drawn for Origami.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERS.map((o) => (
            <figure key={o.key}>
              <div className="relative aspect-[1.72] overflow-hidden rounded-[16px] shadow-[0_10px_26px_-12px_rgba(0,0,0,.28)]">
                <GiftArt theme={o.theme} year={2027} />
                <span className="font-hand absolute bottom-[9%] left-[5%] -rotate-[9deg] rounded-[4px] bg-[#fdeef3] px-5 py-1.5 text-[26px] leading-none text-[#2a1d22]">First Name</span>
              </div>
              <figcaption className="mt-2 text-[13px] text-ink-muted">{o.title}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
