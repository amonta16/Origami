"use client";

import * as React from "react";
import { BottomSheet, Button, ChoiceChip, Input, ScoreRing, Segmented, Toggle } from "@/components/ui";

export function ChoiceChipDemo() {
  const options = ["Fine lines", "Dark circles", "Redness", "Pores", "Sun spots", "Volume loss"];
  const [picked, setPicked] = React.useState<string[]>(["Fine lines", "Dark circles"]);
  const toggle = (o: string) => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <ChoiceChip key={o} selected={picked.includes(o)} onToggle={() => toggle(o)}>
          {o}
        </ChoiceChip>
      ))}
    </div>
  );
}

export function ControlsDemo() {
  const [seg, setSeg] = React.useState<"treatments" | "shop" | "results" | "scan">("treatments");
  const [on, setOn] = React.useState(true);
  const [off, setOff] = React.useState(false);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Segmented
        value={seg}
        onChange={setSeg}
        options={[
          { value: "treatments", label: "Treatments" },
          { value: "shop", label: "Shop" },
          { value: "results", label: "Results" },
          { value: "scan", label: "AI skin scan" },
        ]}
      />
      <div className="flex items-center gap-3">
        <Toggle checked={on} onChange={setOn} label="Show the scan in your app" />
        <Toggle checked={off} onChange={setOff} label="Automatic follow-up" />
      </div>
    </div>
  );
}

export function ScoreRingDemo() {
  const [v, setV] = React.useState(72);
  return (
    <div className="flex flex-col items-center gap-5">
      <ScoreRing value={v} potential={86} caption="Potential 86" size={180} />
      <div className="flex gap-2">
        {[58, 72, 91].map((n) => (
          <Button key={n} size="sm" variant="secondary" onClick={() => setV(n)}>
            Set {n}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function BottomSheetDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative mx-auto h-[640px] w-full max-w-phone overflow-hidden rounded-[40px] border border-line-strong bg-white shadow-lift">
      <div className="flex h-full flex-col px-5 pt-14">
        <p className="text-[12px] text-ink-muted">Sample clinic</p>
        <h3 className="font-display mt-1 text-[24px]">Your results are ready</h3>
        <p className="mt-3 text-[14px] text-ink-muted">The sheet below is the booking step. It slides up over the results and stays reachable with one thumb.</p>
        <div className="mt-auto pb-6">
          <Button full size="lg" onClick={() => setOpen(true)}>
            Book lip filler
          </Button>
        </div>
      </div>
      <BottomSheet inset open={open} onClose={() => setOpen(false)} title="Request a visit">
        <div className="flex flex-col gap-3">
          <Input label="Preferred days" placeholder="Weekday evenings" />
          <Input label="Mobile" type="tel" placeholder="(805) 555-0100" />
          <Button full onClick={() => setOpen(false)}>
            Send request
          </Button>
          <p className="text-center text-[12px] text-ink-muted">The clinic confirms by text. No payment today.</p>
        </div>
      </BottomSheet>
    </div>
  );
}
