"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, Button, Toggle } from "@/components/ui";
import { usePatient } from "./patient-provider";
import { Icon } from "./icons";

/** Redeem a reward (signed in, enough points) or say what's missing. */
export function RedeemButton({ rewardId, rewardName, cost, points }: { rewardId: string; rewardName: string; cost: number; points: number | null }) {
  const { clinicSlug, signedIn, openJoin, showCode } = usePatient();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [armed, setArmed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Second tap confirms; the armed state times out so a stray tap later doesn't spend points.
  React.useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!signedIn) {
    return (
      <button type="button" onClick={() => openJoin("Join to start earning points toward rewards.")} className="h-10 w-full text-[13px] text-ink-muted hover:text-ink">
        Join to unlock
      </button>
    );
  }
  if ((points ?? 0) < cost) {
    return (
      <span className="flex h-10 items-center justify-center gap-1.5 text-[13px] text-ink-muted">
        <Icon name="lock" className="size-3.5" /> {cost - (points ?? 0)} more points
      </span>
    );
  }
  const redeem = async () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/patient/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicSlug, rewardId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't redeem. Try again.");
      router.refresh();
      showCode(rewardName, json.code, "Show this code at the front desk. It's also saved under Ready to use.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't redeem.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="p-2">
      <Button full size="sm" variant={armed ? "brand" : "primary"} loading={busy} onClick={redeem}>
        {armed ? `Use ${cost.toLocaleString()} points` : "Redeem"}
      </Button>
      {error && <p className="mt-1 text-center text-[11px] text-danger">{error}</p>}
    </div>
  );
}

/** Full-width black "Book now" / "Subscribe now" on detail pages. Sends a request; joins first if needed. */
export function RequestButton({ kind, itemId, label, sentNote }: { kind: "treatment" | "product" | "membership"; itemId: string; label: string; sentNote: string }) {
  const { clinicSlug, clinicName, signedIn, openJoin } = usePatient();
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const send = async () => {
    if (!signedIn) return openJoin("Join so the front desk knows who's asking. Then tap again to send.");
    setState("busy");
    setError(null);
    try {
      const res = await fetch("/api/patient/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clinicSlug, kind, itemId }) });
      const j = await res.json();
      if (res.status === 401) {
        setState("idle");
        return openJoin();
      }
      if (!res.ok) throw new Error(j.error || "Couldn't send.");
      setState("sent");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send.");
      setState("idle");
    }
  };
  if (state === "sent") {
    return (
      <div className="rounded-card bg-brand-soft p-4 text-[14px] leading-snug text-brand-ink">
        <p className="font-medium">Sent to {clinicName}.</p>
        <p className="mt-0.5">{sentNote}</p>
      </div>
    );
  }
  return (
    <div>
      <Button full size="lg" loading={state === "busy"} onClick={send}>
        {label}
      </Button>
      {error && <p role="alert" className="mt-2 text-center text-[12px] text-danger">{error}</p>}
    </div>
  );
}

export function ShowCodeButton({ title, code, note, label = "Show" }: { title: string; code: string; note?: string; label?: string }) {
  const { showCode } = usePatient();
  return (
    <Button size="sm" onClick={() => showCode(title, code, note)}>
      {label}
    </Button>
  );
}

export function NotificationsToggle({ initial }: { initial: boolean }) {
  const { clinicSlug } = usePatient();
  const [on, setOn] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const change = async (v: boolean) => {
    setOn(v);
    setSaving(true);
    try {
      const res = await fetch("/api/patient/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicSlug, notifications: v }),
      });
      if (!res.ok) setOn(!v);
    } catch {
      setOn(!v);
    } finally {
      setSaving(false);
    }
  };
  return (
    <span className="flex items-center gap-3">
      <span className="sr-only" aria-live="polite">{saving ? "Saving" : on ? "On" : "Off"}</span>
      <Toggle checked={on} onChange={change} label="Text reminders" />
    </span>
  );
}

export function SignOutRow({ className, children }: { className?: string; children: React.ReactNode }) {
  const { clinicSlug } = usePatient();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const out = async () => {
    setBusy(true);
    await fetch(`/api/patient/me?clinic=${encodeURIComponent(clinicSlug)}`, { method: "DELETE" });
    setOpen(false);
    setBusy(false);
    router.refresh();
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Sign out on this phone?">
        <p className="text-[14px] leading-relaxed text-ink-soft">Your points, rewards and requests stay on your card at the clinic. To get back in on this phone, ask the front desk.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button full size="lg" loading={busy} onClick={out}>
            Sign out
          </Button>
          <Button full size="lg" variant="ghost" onClick={() => setOpen(false)}>
            Stay signed in
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}

export function AddToHomeRow({ className, children }: { className?: string; children: React.ReactNode }) {
  const { clinicName } = usePatient();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Add to your home screen">
        <p className="text-[14px] leading-relaxed text-ink-soft">Keep {clinicName} one tap away, like an app. No download needed.</p>
        <ol className="mt-4 flex flex-col gap-3 text-[14px] leading-snug">
          <li className="rounded-field bg-surface-muted p-3">
            <span className="font-medium">iPhone (Safari):</span> tap the Share button, then <span className="font-medium">Add to Home Screen</span>.
          </li>
          <li className="rounded-field bg-surface-muted p-3">
            <span className="font-medium">Android (Chrome):</span> tap the ⋮ menu, then <span className="font-medium">Add to Home screen</span> or <span className="font-medium">Install app</span>.
          </li>
        </ol>
        <Button full size="lg" className="mt-5" onClick={() => setOpen(false)}>
          Got it
        </Button>
      </BottomSheet>
    </>
  );
}
