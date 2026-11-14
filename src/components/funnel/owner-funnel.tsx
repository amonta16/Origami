"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

type Step = "find" | "read" | "menu" | "brand" | "build";
type StepState = { status: "wait" | "run" | "done"; detail?: string };
type Ev =
  | { type: "step"; step: Step; status: "start" | "done"; detail?: string }
  | { type: "need_website"; message: string }
  | { type: "done"; slug: string; clinicId: string; name: string; brand: string | null; treatments: number; ownerToken: string }
  | { type: "error"; message: string };

const STEPS: Array<{ key: Step; label: string; running: string }> = [
  { key: "find", label: "Found your spa", running: "Finding your spa" },
  { key: "read", label: "Read your website", running: "Reading your website" },
  { key: "menu", label: "Pulled your treatments", running: "Pulling your treatments" },
  { key: "brand", label: "Matched your colors", running: "Matching your colors" },
  { key: "build", label: "Put your app together", running: "Putting your app together" },
];

const EMPTY: Record<Step, StepState> = { find: { status: "wait" }, read: { status: "wait" }, menu: { status: "wait" }, brand: { status: "wait" }, build: { status: "wait" } };

export function OwnerFunnel() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [showSite, setShowSite] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "building" | "error">("idle");
  const [steps, setSteps] = React.useState<Record<Step, StepState>>(EMPTY);
  const [brand, setBrand] = React.useState<string | null>(null);
  const [tiles, setTiles] = React.useState(0);
  const [name, setName] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const siteRef = React.useRef<HTMLInputElement>(null);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim().length < 3 && !website.trim()) return;
    setPhase("building");
    setSteps(EMPTY);
    setBrand(null);
    setTiles(0);
    setName(null);
    setMessage(null);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim(), website: website.trim() || undefined }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "The builder didn't answer. Try again.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as Ev;
          if (ev.type === "step") {
            setSteps((s) => ({ ...s, [ev.step]: { status: ev.status === "start" ? "run" : "done", detail: ev.detail ?? s[ev.step].detail } }));
            if (ev.step === "menu" && ev.status === "done") {
              const n = parseInt(ev.detail ?? "0", 10) || 6;
              // pop tiles in one by one for the reveal
              for (let i = 1; i <= Math.min(n, 6); i++) setTimeout(() => setTiles(i), i * 140);
            }
            if (ev.step === "brand" && ev.status === "done" && /^#[0-9a-f]{6}$/i.test(ev.detail ?? "")) setBrand(ev.detail!);
          } else if (ev.type === "need_website") {
            setPhase("idle");
            setShowSite(true);
            setMessage(ev.message);
            setTimeout(() => siteRef.current?.focus(), 50);
            return;
          } else if (ev.type === "error") {
            throw new Error(ev.message);
          } else if (ev.type === "done") {
            setName(ev.name);
            await fetch("/api/build/claim", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ slug: ev.slug, token: ev.ownerToken }),
            });
            // let the finished phone sit on screen for a beat
            await new Promise((r) => setTimeout(r, 1400));
            router.push(`/p/${ev.slug}`);
            return;
          }
        }
      }
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (phase === "building" || (phase === "error" && Object.values(steps).some((s) => s.status !== "wait"))) {
    return <BuildScreen steps={steps} brand={brand} tiles={tiles} name={name} query={query || website} error={phase === "error" ? message : null} onRetry={() => setPhase("idle")} />;
  }

  return (
    <form onSubmit={run} className="w-full">
      <div className="flex flex-col gap-2 rounded-[20px] border border-line-strong bg-surface p-2 shadow-lift sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <span className="sr-only">Your med spa&rsquo;s name and city</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Your med spa’s name and city"
            autoComplete="organization"
            className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-muted/70"
          />
        </label>
        <Button type="submit" size="lg" disabled={query.trim().length < 3 && !website.trim()} className="sm:shrink-0">
          Build my app
        </Button>
      </div>

      {showSite ? (
        <div className="mt-3 flex flex-col gap-2 rounded-[16px] border border-line bg-surface p-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-3 px-1">
            <span className="shrink-0 text-[13px] text-ink-muted">Website</span>
            <input
              ref={siteRef}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="yourspa.com"
              inputMode="url"
              autoComplete="url"
              className="h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-muted/70"
            />
          </label>
        </div>
      ) : (
        <button type="button" onClick={() => setShowSite(true)} className="mt-3 text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
          Know your website? Add it for a faster match.
        </button>
      )}
      {message && (
        <p role="status" className="mt-3 rounded-field bg-brand-soft px-3 py-2 text-[14px] text-brand-ink">
          {message}
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------ build screen */

function BuildScreen({
  steps,
  brand,
  tiles,
  name,
  query,
  error,
  onRetry,
}: {
  steps: Record<Step, StepState>;
  brand: string | null;
  tiles: number;
  name: string | null;
  query: string;
  error: string | null;
  onRetry: () => void;
}) {
  const doneCount = STEPS.filter((s) => steps[s.key].status === "done").length;
  const current = STEPS.find((s) => steps[s.key].status === "run");
  const finished = doneCount === STEPS.length;
  const color = brand ?? "#111318";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-page" style={{ ["--b" as string]: color }}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 transition-opacity duration-1000" style={{ opacity: brand ? 1 : 0, background: `radial-gradient(70% 55% at 30% 40%, ${color}22, transparent 70%)` }} />
      <div className="relative mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-6 py-10 md:grid-cols-[minmax(0,380px)_1fr]">
        {/* the phone that builds itself */}
        <div className="mx-auto w-[280px] md:w-[320px]">
          <div className="relative aspect-[9/19] rounded-[46px] border-[10px] border-[#111318] bg-white shadow-[0_40px_80px_-30px_rgba(17,19,24,.45)]">
            <div className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-[#111318]" />
            <div className="absolute inset-0 overflow-hidden rounded-[36px]">
              {/* scanning beam while reading the site */}
              <div className={cn("fb-beam absolute inset-x-0 z-10 h-16", steps.read.status === "run" || steps.find.status === "run" ? "opacity-100" : "opacity-0")} />
              {/* top bar */}
              <div className="flex h-14 items-end justify-between px-4 pb-2">
                <span className={cn("fb-block h-3 rounded-full", steps.find.status === "done" ? "w-24 bg-ink/80" : "w-16")} />
                <span className="flex gap-2">
                  <span className="fb-block size-3 rounded-full" />
                  <span className="fb-block size-3 rounded-full" />
                </span>
              </div>
              {/* hero */}
              <div className="relative mx-0 h-[30%] overflow-hidden">
                <div className="fb-block absolute inset-0 rounded-none" />
                <div className="absolute inset-0 origin-left transition-transform duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)]" style={{ background: `linear-gradient(160deg, ${color}, ${color}cc)`, transform: `scaleX(${brand ? 1 : 0})` }} />
                <div className={cn("absolute left-4 top-4 space-y-1.5 transition-opacity duration-500", steps.read.status === "done" ? "opacity-100" : "opacity-0")}>
                  <span className="block h-3 w-36 rounded-full bg-white/90" />
                  <span className="block h-2 w-20 rounded-full bg-white/60" />
                </div>
              </div>
              {/* points pill */}
              <div className="relative -mt-4 mx-3 flex h-9 items-center gap-2 rounded-xl bg-white px-3 shadow-soft">
                <span className="fb-block h-2.5 w-8 rounded-full" />
                <span className="fb-block h-2 w-20 rounded-full" />
                <span className={cn("ml-auto h-4 w-12 rounded-full transition-colors duration-700", brand ? "" : "fb-block")} style={brand ? { background: `${color}26` } : undefined} />
              </div>
              {/* treatment tiles */}
              <div className="grid grid-cols-2 gap-2 px-3 pt-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="space-y-1">
                    <div className={cn("aspect-square rounded-xl", i < tiles ? "fb-pop" : "fb-block")} style={i < tiles ? { background: `linear-gradient(140deg, ${color}33, ${color}12)` } : undefined} />
                    <span className={cn("block h-2 rounded-full", i < tiles ? "w-3/4 bg-ink/70 fb-pop" : "fb-block w-1/2")} />
                  </div>
                ))}
              </div>
              {/* tab bar */}
              <div className={cn("absolute inset-x-0 bottom-0 flex h-14 items-center justify-around border-t border-line bg-white transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)]", steps.build.status !== "wait" ? "translate-y-0" : "translate-y-full")}>
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="size-4 rounded-md" style={{ background: i === 0 ? color : "#d9dbe0" }} />
                ))}
              </div>
              {finished && <div className="fb-flash pointer-events-none absolute inset-0 z-30 bg-white" />}
            </div>
          </div>
        </div>

        {/* progress */}
        <div aria-live="polite">
          <p className="text-[13px] text-ink-muted">{query}</p>
          <h1 className="font-display mt-2 text-[34px] leading-[1.05] sm:text-[44px]">
            {finished ? `${name ?? "Your"} app is ready.` : error ? "We hit a snag." : "Building your app…"}
          </h1>
          <ol className="mt-8 flex flex-col gap-4">
            {STEPS.map((s, i) => {
              const st = steps[s.key];
              return (
                <li key={s.key} className={cn("flex items-center gap-3 transition-opacity duration-300", st.status === "wait" ? "opacity-35" : "opacity-100")}>
                  <span
                    className={cn("grid size-8 shrink-0 place-items-center rounded-full border text-[12px] font-semibold transition-colors duration-500", st.status === "done" ? "border-transparent text-white" : "border-line-strong text-ink-muted")}
                    style={st.status === "done" ? { background: color } : undefined}
                  >
                    {st.status === "done" ? (
                      <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                        <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : st.status === "run" ? (
                      <span className="size-3 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="text-[17px]">
                    {st.status === "done" ? s.label : s.running}
                    {st.detail && st.status === "done" && (
                      <span className="ml-2 text-[14px] text-ink-muted">
                        {s.key === "brand" && /^#/.test(st.detail) ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block size-3 rounded-full align-middle" style={{ background: st.detail }} />
                            {st.detail}
                          </span>
                        ) : (
                          st.detail
                        )}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
          {!finished && !error && (
            <div className="mt-8 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(8, (doneCount / STEPS.length) * 100)}%`, background: color }} />
            </div>
          )}
          {current && !error && <p className="mt-3 text-[13px] text-ink-muted">Usually about 15 seconds.</p>}
          {error && (
            <div className="mt-6 max-w-md">
              <p className="rounded-field bg-sev-pronounced-soft px-3 py-2 text-[14px] text-danger">{error}</p>
              <Button className="mt-4" onClick={onRetry}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .fb-block { background: linear-gradient(90deg, #eef0f3 0%, #f7f8fa 40%, #eef0f3 80%); background-size: 200% 100%; animation: fb-shimmer 1.3s linear infinite; }
        .fb-beam { top: 0; background: linear-gradient(180deg, transparent, color-mix(in oklab, var(--b) 22%, transparent), transparent); animation: fb-scan 1.6s ease-in-out infinite; transition: opacity .4s; }
        .fb-pop { animation: fb-pop .45s cubic-bezier(.2,1.4,.4,1) both; }
        .fb-flash { animation: fb-flash .9s ease-out both; }
        @keyframes fb-shimmer { to { background-position: -200% 0; } }
        @keyframes fb-scan { 0% { transform: translateY(-20%); } 100% { transform: translateY(1100%); } }
        @keyframes fb-pop { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fb-flash { 0% { opacity: .9; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .fb-block, .fb-beam, .fb-pop, .fb-flash { animation: none !important; } }
      `}</style>
    </div>
  );
}
