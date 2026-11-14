import type { Metadata } from "next";
import { Button, Card, CardText, CardTitle, Chip, Input, Textarea } from "@/components/ui";
import type { Severity } from "@/components/ui";
import { BottomSheetDemo, ChoiceChipDemo, ScoreRingDemo } from "./demos";

export const metadata: Metadata = { title: "Styleguide" };

const colors: Array<{ name: string; token: string; cls: string; dark?: boolean }> = [
  { name: "Ivory", token: "--ivory", cls: "bg-ivory border border-line" },
  { name: "Ivory deep", token: "--ivory-deep", cls: "bg-ivory-deep" },
  { name: "Surface", token: "--surface", cls: "bg-surface border border-line" },
  { name: "Line", token: "--line", cls: "bg-line" },
  { name: "Ink", token: "--ink", cls: "bg-ink", dark: true },
  { name: "Ink muted", token: "--ink-muted", cls: "bg-ink-muted", dark: true },
  { name: "Accent", token: "--accent", cls: "bg-accent", dark: true },
  { name: "Accent soft", token: "--accent-soft", cls: "bg-accent-soft" },
];

const severities: Severity[] = ["none", "mild", "moderate", "pronounced"];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-12 first:border-t-0">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div>
          <h2 className="font-display text-3xl">{title}</h2>
          {note && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{note}</p>}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <header className="pb-10">
        <p className="text-sm text-ink-muted">Facet design system</p>
        <h1 className="font-display mt-2 max-w-3xl text-5xl sm:text-6xl">
          Clinical luxe, built for a phone held at arm&rsquo;s length.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Warm ivory, deep ink, one green. Fraunces carries the headlines and the
          numbers; Inter does the work. Patient screens are designed at 390px, the
          clinic dashboard breathes at desktop width.
        </p>
      </header>

      <Section title="Color" note="Tokens live in globals.css and double as Tailwind utilities (bg-accent, text-ink-muted). The severity ramp is only for concerns, never for brand.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map((c) => (
            <div key={c.token} className="overflow-hidden rounded-card border border-line bg-surface">
              <div className={`h-20 ${c.cls}`} />
              <div className="px-3 py-2">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-ink-muted">{c.token}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm text-ink-muted">Severity</span>
          <div className="flex flex-1 overflow-hidden rounded-chip">
            <div className="h-3 flex-1 bg-sev-none" />
            <div className="h-3 flex-1 bg-sev-mild" />
            <div className="h-3 flex-1 bg-sev-moderate" />
            <div className="h-3 flex-1 bg-sev-pronounced" />
          </div>
        </div>
      </Section>

      <Section title="Type" note="Fraunces with the SOFT axis raised for headlines and scores. Inter at 15–16px for UI. Line length stays under 70 characters.">
        <div className="space-y-6">
          <div className="font-display text-6xl sm:text-7xl">Your skin, in 60 seconds.</div>
          <div className="font-display text-4xl">See the after before you book.</div>
          <div className="font-display text-2xl">Due for a touch-up in 12 days</div>
          <p className="max-w-prose text-base leading-relaxed">
            Body copy sits in Inter. It stays plain and direct: tell her what the
            scan found, what it could look like, and what happens next. No
            medical claims, no exclamation marks.
          </p>
          <p className="text-sm text-ink-muted">
            Small print, 14px, for consent lines and footnotes. Results are
            cosmetic estimates, not a medical diagnosis.
          </p>
          <div className="flex items-baseline gap-6">
            <span className="font-display font-display-numeral text-7xl">72</span>
            <span className="font-display font-display-numeral text-5xl text-ink-muted">86</span>
            <span className="font-display font-display-numeral text-3xl text-ink-muted">$650</span>
          </div>
        </div>
      </Section>

      <Section title="Buttons" note="Pills. Primary is the green, one per screen. Secondary for the quiet choice. Ink for the dashboard's heavy actions.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Start my scan</Button>
          <Button variant="secondary">Upload a photo instead</Button>
          <Button variant="ghost">Not now</Button>
          <Button variant="ink">Mark as sent</Button>
          <Button loading>Building your scanner</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="mt-4 max-w-phone">
          <Button full size="lg">
            Book lip filler · $650
          </Button>
        </div>
      </Section>

      <Section title="Inputs" note="16px text so iOS doesn't zoom. Labels above, hints below, errors replace hints.">
        <div className="grid max-w-phone gap-4">
          <Input label="First name" placeholder="Maya" />
          <Input label="Mobile" type="tel" placeholder="(805) 555-0100" hint="We text your results link here." />
          <Input label="Email" type="email" defaultValue="maya@" error="That email looks incomplete." />
          <Textarea label="Notes for the clinic" placeholder="Anything they should know?" />
        </div>
      </Section>

      <Section title="Chips" note="Static chips tag things. Choice chips are the tap targets on the five questions. Severity dots carry the concern ramp.">
        <div className="flex flex-wrap gap-2">
          <Chip>Sample clinic</Chip>
          <Chip tone="accent">Preview — not live yet</Chip>
          <Chip tone="ink">New lead</Chip>
          <Chip tone="outline">Botox · 90 days</Chip>
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

      <Section title="Cards" note="One radius (20px), one soft warm shadow. Ink and accent cards are for the one moment on a screen that must win.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>Lip filler</CardTitle>
            <CardText className="mt-2">
              Adds volume and definition to the lips. Results last 6 to 12 months.
            </CardText>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-display font-display-numeral text-2xl">$650</span>
              <Button size="sm" variant="secondary">
                Preview on my face
              </Button>
            </div>
          </Card>
          <Card tone="ivory">
            <CardTitle>Why this is relevant to you</CardTitle>
            <CardText className="mt-2">
              Your lip definition scored 48. Volume loss at the vermilion border
              is the main driver.
            </CardText>
          </Card>
          <Card tone="ink">
            <CardTitle>Due for a touch-up</CardTitle>
            <CardText className="mt-2 text-ivory/75">
              7 patients, about $3,400 in repeat revenue waiting on a text.
            </CardText>
            <div className="mt-4">
              <Button size="sm" variant="primary">
                Open the list
              </Button>
            </div>
          </Card>
          <Card tone="accent">
            <CardTitle>Your scanner is ready</CardTitle>
            <CardText className="mt-2 text-ivory/80">
              Scan the code to open it on your phone.
            </CardText>
          </Card>
        </div>
      </Section>

      <Section title="Score ring" note="Animates from zero on first paint. The thin outer arc is her Potential after the recommended plan. Fraunces numerals, tabular.">
        <ScoreRingDemo />
      </Section>

      <Section title="Bottom sheet" note="Booking, consent and confirmations live here on the phone. Escape and backdrop close it. Shown inside a 390px frame.">
        <BottomSheetDemo />
      </Section>
    </main>
  );
}
