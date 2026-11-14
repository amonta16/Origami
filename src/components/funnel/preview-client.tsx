"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, Button, Input } from "@/components/ui";

/** Phone frame with the live patient app inside. `reloadKey` remounts the iframe after edits. */
export function PhoneFrame({ src, title }: { src: string; title: string }) {
  const [key, setKey] = React.useState(0);
  React.useEffect(() => {
    const onReload = () => setKey((k) => k + 1);
    window.addEventListener("facet:reload-preview", onReload);
    return () => window.removeEventListener("facet:reload-preview", onReload);
  }, []);
  return (
    <div id="your-app" className="relative mx-auto w-[300px] scroll-mt-6 sm:w-[340px]">
      <div className="relative aspect-[9/19.2] rounded-[52px] border-[11px] border-[#111318] bg-[#111318] shadow-[0_50px_90px_-35px_rgba(17,19,24,.5)]">
        <div className="absolute inset-0 overflow-hidden rounded-[41px] bg-white">
          {/* status bar */}
          <div className="relative z-10 flex h-10 items-center justify-between bg-white px-7 text-[12px] font-semibold">
            <span>9:41</span>
            <span className="absolute left-1/2 top-2 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-[#111318]" aria-hidden="true" />
            <span className="flex items-center gap-1" aria-hidden="true">
              <svg viewBox="0 0 18 12" className="h-2.5 w-4"><path d="M1 11h2V8H1zm4 0h2V6H5zm4 0h2V3H9zm4 0h2V1h-2z" fill="currentColor" /></svg>
              <svg viewBox="0 0 26 12" className="h-2.5 w-6"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" /><rect x="2" y="2" width="18" height="8" rx="1.5" fill="currentColor" /><path d="M24 4v4" stroke="currentColor" strokeWidth="1.5" /></svg>
            </span>
          </div>
          <iframe key={key} src={src} title={title} className="absolute inset-x-0 bottom-0 top-10 h-[calc(100%-2.5rem)] w-full border-0" />
          <span className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 h-1 w-28 -translate-x-1/2 rounded-full bg-ink/80" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

/** Copies text (an embed snippet) and says so for two seconds. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Copy this code:", text);
        }
      }}
      className="inline-flex h-9 items-center rounded-chip bg-ink px-3.5 text-[13px] font-medium text-white hover:bg-ink/85"
    >
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

export function LookAroundButton() {
  return (
    <button
      type="button"
      onClick={() => document.getElementById("your-app")?.scrollIntoView({ behavior: "smooth", block: "center" })}
      className="flex h-[52px] flex-col items-center justify-center rounded-[14px] border border-line-strong bg-surface px-5 hover:border-ink"
    >
      <span className="text-[14px] font-medium leading-tight">Just look around</span>
      <span className="text-[11px] leading-tight text-ink-muted">tap through your app</span>
    </button>
  );
}

export function BookCallButton({ slug, spaName }: { slug: string; spaName: string }) {
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({ name: "", role: "Owner", email: "", phone: "", bestTime: "" });
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/owner-lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, ...f }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Couldn't send. Try again.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-[52px] flex-col items-center justify-center rounded-[14px] bg-brand px-5 text-white shadow-soft hover:bg-brand-deep">
        <span className="text-[14px] font-medium leading-tight">Book my free call</span>
        <span className="text-[11px] leading-tight text-white/80">15 minutes, no obligation</span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={sent ? "You're on the list" : "Book a free call"}>
        {sent ? (
          <div>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              Thanks. A member of the Atlas Engine team will reach out to set up a 15-minute call about taking {spaName}&rsquo;s app live.
            </p>
            <Button full size="lg" className="mt-5" onClick={() => setOpen(false)}>
              Back to my app
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <p className="-mt-1 text-[14px] text-ink-muted">We&rsquo;ll walk through going live for {spaName}. No card needed.</p>
            <Input label="Your name" value={f.name} onChange={set("name")} required autoComplete="name" />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
              Your role
              <select value={f.role} onChange={set("role")} className="h-12 rounded-field border border-line bg-surface px-3 text-[16px] text-ink">
                {["Owner", "Medical director", "Manager", "Front desk", "Other"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <Input label="Email" type="email" value={f.email} onChange={set("email")} autoComplete="email" />
            <Input label="Mobile (optional if you gave an email)" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel-national" />
            <Input label="Best time to reach you (optional)" value={f.bestTime} onChange={set("bestTime")} placeholder="Weekdays after 4" />
            {error && <p role="alert" className="rounded-field bg-sev-pronounced-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
            <Button type="submit" full size="lg" loading={busy}>
              Request my call
            </Button>
          </form>
        )}
      </BottomSheet>
    </>
  );
}

export function FixItButton({ slug, initial }: { slug: string; initial: { name: string; brand_color: string; logo_url: string; hero_photo_url: string } }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/build/${slug}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Couldn't save.");
      setOpen(false);
      router.refresh();
      window.dispatchEvent(new Event("facet:reload-preview"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-[12px] text-ink-muted hover:text-ink">
        Wrong logo or color? <span className="font-medium text-ink underline underline-offset-2">Fix it</span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Fix your app">
        <form onSubmit={save} className="flex flex-col gap-3.5">
          <Input label="Spa name" value={f.name} onChange={set("name")} required />
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
              Color
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(f.brand_color) ? f.brand_color : "#111318"} onChange={set("brand_color")} className="h-12 w-14 cursor-pointer rounded-field border border-line bg-surface p-1" />
            </label>
            <Input label="Brand color (hex)" value={f.brand_color} onChange={set("brand_color")} placeholder="#2f6f5e" className="flex-1" />
          </div>
          <Input label="Logo image link" value={f.logo_url} onChange={set("logo_url")} placeholder="https://…" />
          <Input label="Home photo link" value={f.hero_photo_url} onChange={set("hero_photo_url")} placeholder="https://…" />
          {error && <p role="alert" className="rounded-field bg-sev-pronounced-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
          <Button type="submit" full size="lg" loading={busy}>
            Save and refresh my app
          </Button>
        </form>
      </BottomSheet>
    </>
  );
}
