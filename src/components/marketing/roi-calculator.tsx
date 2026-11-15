"use client";

import * as React from "react";
import Link from "next/link";
import { CashPallet } from "./cash-pallet";

// Origami's price, per month.
const FEE = 250;

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Eases a number toward its target so figures count up instead of jumping.
function useTween(value: number) {
  const [shown, setShown] = React.useState(value);
  const cur = React.useRef(value);
  React.useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      cur.current += (value - cur.current) * (1 - Math.exp(-dt * 7));
      if (Math.abs(value - cur.current) < 0.5) {
        cur.current = value;
        setShown(value);
        return;
      }
      setShown(cur.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

function Slider({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
  format,
  minLabel,
  maxLabel,
}: {
  id: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
  minLabel: string;
  maxLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <label htmlFor={id} className="block text-[17px] font-medium leading-snug text-ink sm:text-[18px]">
        {label}
      </label>
      {hint && <p className="mt-1.5 text-[14px] text-ink-muted">{hint}</p>}
      <div className="relative mt-12">
        <output
          htmlFor={id}
          className="pointer-events-none absolute -top-11 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-[17px] font-semibold tabular-nums text-white"
          style={{ left: `calc(${pct}% + ${(0.5 - pct / 100) * 24}px)` }}
        >
          {format(value)}
        </output>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="roi-range"
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />
      </div>
      <div className="mt-2 flex justify-between text-[13px] text-ink-muted">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

const WAITS = [
  { label: "In 12 months", months: 12 },
  { label: "In 6 months", months: 6 },
  { label: "In 3 months", months: 3 },
  { label: "Yesterday (so, now)", months: 0 },
];

export function RoiCalculator() {
  const [price, setPrice] = React.useState(450);
  const [returns, setReturns] = React.useState(6);
  const [wait, setWait] = React.useState<number | null>(null);

  const monthly = price * returns;
  const yearlyKept = (monthly - FEE) * 12;
  const multiple = monthly / FEE;

  const shownMonthly = useTween(monthly);
  const shownYear = useTween(monthly * 12);
  const shownKept = useTween(yearlyKept);
  const shownMultiple = useTween(multiple * 10) / 10;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Inputs */}
      <section aria-label="Your numbers" className="rounded-[28px] border border-line bg-surface p-6 shadow-lift sm:p-9">
        <div className="space-y-10">
          <Slider
            id="roi-price"
            label="What does a patient spend per visit, on average?"
            hint="It varies. Closest is fine."
            min={100}
            max={1500}
            step={25}
            value={price}
            onChange={setPrice}
            format={usd}
            minLabel="$100"
            maxLabel="$1,500"
          />
          <Slider
            id="roi-returns"
            label="If every patient left with their own face scan, a treatment plan and a reminder when it's due, how many more would come back each month?"
            min={1}
            max={30}
            step={1}
            value={returns}
            onChange={setReturns}
            format={(n) => (n >= 30 ? "30+" : String(n))}
            minLabel="1"
            maxLabel="30+"
          />
        </div>

        <div className="mt-10 border-t border-line pt-8">
          <p className="text-[17px] font-medium text-ink sm:text-[18px]">When do you want that money back?</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {WAITS.map((wt) => (
              <button
                key={wt.label}
                type="button"
                onClick={() => setWait(wt.months)}
                aria-pressed={wait === wt.months}
                className={`rounded-full border px-3 py-3 text-[14.5px] font-medium transition-colors ${
                  wait === wt.months ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink"
                }`}
              >
                {wt.label}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-4 min-h-[1.5em] text-[15px] text-ink-soft">
            {wait === null
              ? " "
              : wait === 0
                ? "Good call. Your app builds from your website in about a minute."
                : <>Waiting {wait} months leaves about <strong className="text-ink">{usd(monthly * wait)}</strong> on the table.</>}
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-4 text-[16px] font-medium text-white transition-colors hover:bg-ink-soft sm:w-auto"
          >
            Build my app free &rarr;
          </Link>
        </div>
      </section>

      {/* Result + 3D */}
      <section aria-label="What it adds up to" className="flex flex-col overflow-hidden rounded-[28px] border border-line bg-surface shadow-lift">
        <div className="px-6 pt-7 text-center sm:px-9 sm:pt-9">
          <p className="text-[15px] text-ink-muted">Right now that&rsquo;s</p>
          <p className="font-brand-serif mt-2 text-[46px] tabular-nums sm:text-[64px]" aria-live="polite">
            <span className="whitespace-nowrap">{usd(shownMonthly)}</span> <span className="whitespace-nowrap text-ink-soft">a month</span>
          </p>
          <p className="mt-2 text-[15px] text-ink-muted">walking out your door instead of coming back.</p>
        </div>

        <CashPallet monthly={monthly} fee={FEE} className="min-h-[300px] w-full flex-1 sm:min-h-[380px]" />

        <dl className="grid grid-cols-3 border-t border-line text-center">
          <div className="px-2 py-5">
            <dt className="text-[12px] uppercase tracking-[0.08em] text-ink-muted">A year</dt>
            <dd className="font-brand-serif mt-1 text-[22px] tabular-nums sm:text-[28px]">{usd(shownYear)}</dd>
          </div>
          <div className="border-x border-line px-2 py-5">
            <dt className="text-[12px] uppercase tracking-[0.08em] text-ink-muted">Origami</dt>
            <dd className="font-brand-serif mt-1 text-[22px] tabular-nums sm:text-[28px]">
              {usd(FEE)}
              <span className="text-[14px] text-ink-muted">/mo</span>
            </dd>
          </div>
          <div className="px-2 py-5">
            <dt className="text-[12px] uppercase tracking-[0.08em] text-ink-muted">Return</dt>
            <dd className="font-brand-serif mt-1 text-[22px] tabular-nums sm:text-[28px]">
              <span className="roi-pink">{shownMultiple.toFixed(1)}&times;</span>
            </dd>
          </div>
        </dl>
        <p className="border-t border-line bg-surface-muted px-6 py-4 text-center text-[14.5px] text-ink-soft sm:px-9">
          After Origami&rsquo;s fee, that&rsquo;s <strong className="tabular-nums text-ink">{usd(shownKept)}</strong> a year you keep.
        </p>
      </section>
    </div>
  );
}
