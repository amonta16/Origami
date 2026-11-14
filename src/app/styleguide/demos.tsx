"use client";

import * as React from "react";
import { BottomSheet, Button, ChoiceChip, Input, ScoreRing } from "@/components/ui";

export function ChoiceChipDemo() {
  const options = ["Fine lines", "Dark circles", "Redness", "Pores", "Sun spots", "Volume loss"];
  const [picked, setPicked] = React.useState<string[]>(["Fine lines", "Dark circles"]);
  const toggle = (o: string) =>
    setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));
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

export function ScoreRingDemo() {
  const [v, setV] = React.useState(72);
  return (
    <div className="flex flex-col items-center gap-5">
      <ScoreRing value={v} potential={86} caption="Potential 86" />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setV(58)}>
          Set 58
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setV(72)}>
          Set 72
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setV(91)}>
          Set 91
        </Button>
      </div>
    </div>
  );
}

export function BottomSheetDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative mx-auto h-[640px] w-full max-w-phone overflow-hidden rounded-[40px] border border-line-strong bg-ivory shadow-lift">
      <div className="flex h-full flex-col px-5 pt-14">
        <p className="text-sm text-ink-muted">Sample clinic</p>
        <h3 className="font-display mt-1 text-[32px]">Your results are ready</h3>
        <p className="mt-3 text-[15px] text-ink-muted">
          The sheet below is the booking step. It slides up over the results and
          stays reachable with one thumb.
        </p>
        <div className="mt-auto pb-6">
          <Button full onClick={() => setOpen(true)}>
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
          <p className="text-center text-xs text-ink-muted">
            The clinic confirms by text. No payment today.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}
