"use client";

import * as React from "react";
import { ErrorText, Field, PillButton, useDeskAction } from "../ui";
import { Section } from "./section";

function SaveRow({ pending, saved, error, dirty }: { pending: boolean; saved: boolean; error: string | null; dirty: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <PillButton type="submit" disabled={pending || !dirty}>
        {pending ? "Saving…" : "Save changes"}
      </PillButton>
      {saved && !dirty && <span className="text-[13px] text-ok">Saved</span>}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

/** Shared form state for a settings card: tracks dirty and saved, PATCHes /clinic. */
function useClinicForm<T extends Record<string, string>>(slug: string, initial: T) {
  const [f, setF] = React.useState<T>(initial);
  const [base, setBase] = React.useState<T>(initial);
  const [saved, setSaved] = React.useState(false);
  const { run, pending, error, setError } = useDeskAction();
  const dirty = Object.keys(f).some((k) => f[k] !== base[k]);
  const set = (k: keyof T, v: string) => {
    setSaved(false);
    setF((p) => ({ ...p, [k]: v }));
  };
  async function save(body: Record<string, unknown>) {
    const ok = await run(`/api/desk/${slug}/clinic`, "PATCH", body);
    if (ok) {
      setBase(f);
      setSaved(true);
    }
  }
  return { f, set, dirty, saved, save, pending, error, setError };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function BrandForm({ slug, initial }: { slug: string; initial: { name: string; brand_color: string | null; logo_url: string | null; hero_photo_url: string | null } }) {
  const form = useClinicForm(slug, {
    name: initial.name,
    brand_color: initial.brand_color ?? "",
    logo_url: initial.logo_url ?? "",
    hero_photo_url: initial.hero_photo_url ?? "",
  });
  const { f, set } = form;
  const color = HEX.test(f.brand_color) ? f.brand_color : "#92191c";
  const logoOk = /^https?:\/\/\S+$/.test(f.logo_url.trim());
  const heroOk = /^https?:\/\/\S+$/.test(f.hero_photo_url.trim());

  return (
    <Section title="Brand" description="How your clinic looks in the patient app. One color does all the accent work: buttons, highlights and progress bars.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (f.brand_color && !HEX.test(f.brand_color)) return form.setError("Brand color must be a hex code like #92191c.");
          form.save({ name: f.name, brand_color: f.brand_color || null, logo_url: f.logo_url, hero_photo_url: f.hero_photo_url });
        }}
      >
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Clinic name" value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="brand-hex" className="text-[13px] font-medium text-ink-soft">
                Brand color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label="Pick brand color"
                  value={color}
                  onChange={(e) => set("brand_color", e.target.value)}
                  className="h-11 w-12 shrink-0 cursor-pointer rounded-field border border-line bg-surface p-1"
                />
                <input
                  id="brand-hex"
                  value={f.brand_color}
                  onChange={(e) => set("brand_color", e.target.value.trim())}
                  placeholder="#92191c"
                  maxLength={7}
                  className="h-11 w-full rounded-field border border-line bg-surface px-3.5 font-mono text-[14px] focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10"
                />
              </div>
              <p className="text-[12px] text-ink-muted">Buttons, highlights and progress bars.</p>
            </div>
            <Field label="Logo URL" type="url" value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://" hint="A wide PNG with a clear background looks best." />
            <Field label="Home photo URL" type="url" value={f.hero_photo_url} onChange={(e) => set("hero_photo_url", e.target.value)} placeholder="https://" hint="The big photo at the top of your app's Home." />
          </div>

          {/* Live preview */}
          <div aria-label="Preview" className="overflow-hidden rounded-card border border-line bg-page">
            <div className="flex h-11 items-center justify-between border-b border-line bg-surface px-3">
              {logoOk ? (
                // eslint-disable-next-line @next/next/no-img-element -- clinic-supplied URL, any host
                <img src={f.logo_url.trim()} alt="" className="h-6 max-w-[140px] object-contain" />
              ) : (
                <span className="truncate text-[13px] font-semibold">{f.name || "Your clinic"}</span>
              )}
              <span className="size-5 rounded-full" style={{ background: color }} />
            </div>
            <div className="relative h-28" style={heroOk ? undefined : { background: `linear-gradient(135deg, ${color}22, ${color}66)` }}>
              {heroOk && (
                // eslint-disable-next-line @next/next/no-img-element -- clinic-supplied URL, any host
                <img src={f.hero_photo_url.trim()} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="space-y-2.5 p-3">
              <span className="block h-2 w-3/4 rounded-full bg-line" />
              <span className="block h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <span className="block h-full w-2/3 rounded-full" style={{ background: color }} />
              </span>
              <span className="inline-flex h-8 items-center rounded-chip px-4 text-[12px] font-medium text-white" style={{ background: color }}>
                Book now
              </span>
            </div>
          </div>
        </div>
        <SaveRow pending={form.pending} saved={form.saved} error={form.error} dirty={form.dirty} />
      </form>
    </Section>
  );
}

export function DetailsForm({ slug, initial }: { slug: string; initial: { phone: string | null; address: string | null; website: string | null; booking_url: string | null } }) {
  const form = useClinicForm(slug, {
    phone: initial.phone ?? "",
    address: initial.address ?? "",
    website: initial.website ?? "",
    booking_url: initial.booking_url ?? "",
  });
  const { f, set } = form;
  return (
    <Section title="Clinic details" description="Shown in the app so patients can call, find you and book.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.save({ ...f });
        }}
      >
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
          <Field label="Address" value={f.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
          <Field label="Website" type="url" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          <Field label="Booking link" type="url" value={f.booking_url} onChange={(e) => set("booking_url", e.target.value)} placeholder="https://" hint="Every Book button in the app opens this page." />
        </div>
        <SaveRow pending={form.pending} saved={form.saved} error={form.error} dirty={form.dirty} />
      </form>
    </Section>
  );
}

export function PointsForm({ slug, initial }: { slug: string; initial: { welcome_points: number; visit_points: number; points_per_dollar: number } }) {
  const form = useClinicForm(slug, {
    welcome_points: String(initial.welcome_points),
    visit_points: String(initial.visit_points),
    points_per_dollar: String(initial.points_per_dollar),
  });
  const { f, set } = form;
  const digits = (v: string) => v.replace(/\D/g, "");
  return (
    <Section title="Points" description="How patients earn points. The desk adds visit and purchase points when you check someone in.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.save({ welcome_points: Number(f.welcome_points || 0), visit_points: Number(f.visit_points || 0), points_per_dollar: Number(f.points_per_dollar || 0) });
        }}
      >
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Welcome points" inputMode="numeric" value={f.welcome_points} onChange={(e) => set("welcome_points", digits(e.target.value))} hint="When someone joins the app" />
          <Field label="Visit points" inputMode="numeric" value={f.visit_points} onChange={(e) => set("visit_points", digits(e.target.value))} hint="Each check-in at the desk" />
          <Field label="Points per $1 spent" inputMode="numeric" value={f.points_per_dollar} onChange={(e) => set("points_per_dollar", digits(e.target.value))} hint="Added at the desk from the amount paid" />
        </div>
        <SaveRow pending={form.pending} saved={form.saved} error={form.error} dirty={form.dirty} />
      </form>
    </Section>
  );
}
