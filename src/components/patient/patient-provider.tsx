"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, Button, Chip, Input } from "@/components/ui";
import { money } from "@/lib/money";
import { Icon } from "./icons";

/** What the item sheet can show: a treatment, a shop product or a membership plan. */
export type SheetItem = {
  kind: "treatment" | "product" | "membership";
  id: string;
  name: string;
  eyebrow?: string;
  description?: string | null;
  price_cents: number | null;
  member_price_cents?: number | null;
  perMonth?: boolean;
  meta?: string[];
  perks?: string[];
};

type Ctx = {
  clinicSlug: string;
  clinicName: string;
  signedIn: boolean;
  isMember: boolean;
  openJoin: (reason?: string) => void;
  openItem: (item: SheetItem) => void;
  showCode: (title: string, code: string, note?: string) => void;
};

const PatientCtx = React.createContext<Ctx | null>(null);

export function usePatient() {
  const ctx = React.useContext(PatientCtx);
  if (!ctx) throw new Error("usePatient must be used inside <PatientProvider>");
  return ctx;
}

export function PatientProvider({
  clinicSlug,
  clinicName,
  welcomePoints,
  signedIn,
  isMember,
  children,
}: {
  clinicSlug: string;
  clinicName: string;
  welcomePoints: number;
  signedIn: boolean;
  isMember: boolean;
  children: React.ReactNode;
}) {
  const [join, setJoin] = React.useState<{ open: boolean; reason?: string }>({ open: false });
  const [item, setItem] = React.useState<SheetItem | null>(null);
  const [itemOpen, setItemOpen] = React.useState(false);
  const [code, setCode] = React.useState<{ title: string; code: string; note?: string } | null>(null);
  const [pendingItem, setPendingItem] = React.useState<SheetItem | null>(null);

  const ctx = React.useMemo<Ctx>(
    () => ({
      clinicSlug,
      clinicName,
      signedIn,
      isMember,
      openJoin: (reason) => setJoin({ open: true, reason }),
      openItem: (it) => {
        setItem(it);
        setItemOpen(true);
      },
      showCode: (title, c, note) => setCode({ title, code: c, note }),
    }),
    [clinicSlug, clinicName, signedIn, isMember],
  );

  return (
    <PatientCtx.Provider value={ctx}>
      {children}
      <JoinSheet
        open={join.open}
        reason={join.reason}
        onClose={() => setJoin({ open: false })}
        onJoined={() => {
          setJoin({ open: false });
          if (pendingItem) {
            setItem(pendingItem);
            setItemOpen(true);
            setPendingItem(null);
          }
        }}
        clinicSlug={clinicSlug}
        clinicName={clinicName}
        welcomePoints={welcomePoints}
      />
      <ItemSheet
        open={itemOpen}
        item={item}
        onClose={() => setItemOpen(false)}
        onNeedJoin={(it) => {
          setItemOpen(false);
          setPendingItem(it);
          setJoin({ open: true, reason: "Join to send this request to the front desk." });
        }}
      />
      <BottomSheet open={Boolean(code)} onClose={() => setCode(null)} title={code?.title}>
        <div className="rounded-card border border-line bg-surface-muted py-6 text-center">
          <p className="font-display-numeral pl-[0.3em] text-[34px]" style={{ letterSpacing: "0.3em" }}>
            {code?.code}
          </p>
        </div>
        {code?.note && <p className="mt-3 text-center text-[13px] text-ink-muted">{code.note}</p>}
        <Button full size="lg" className="mt-5" onClick={() => setCode(null)}>
          Done
        </Button>
      </BottomSheet>
    </PatientCtx.Provider>
  );
}

/* ---------------------------------------------------------------- Join */

function JoinSheet({
  open,
  reason,
  onClose,
  onJoined,
  clinicSlug,
  clinicName,
  welcomePoints,
}: {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onJoined: () => void;
  clinicSlug: string;
  clinicName: string;
  welcomePoints: number;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [adult, setAdult] = React.useState(false);
  const [textsOk, setTextsOk] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/patient/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicSlug, firstName, phone, adult, textsOk }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't join. Try again.");
      router.refresh();
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`Join ${clinicName}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="-mt-1 text-[14px] leading-snug text-ink-muted">
          {reason ?? "Your card holds your points, rewards and check-in code."}
          {welcomePoints > 0 && <> You start with {welcomePoints} points.</>}
        </p>
        <Input label="First name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={40} />
        <Input
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(805) 555-0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <label className="flex items-start gap-3 text-[14px] leading-snug">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={adult} onChange={(e) => setAdult(e.target.checked)} required />
          <span>I&rsquo;m 18 or older.</span>
        </label>
        <label className="flex items-start gap-3 text-[14px] leading-snug">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={textsOk} onChange={(e) => setTextsOk(e.target.checked)} />
          <span>
            Text me appointment reminders and offers from {clinicName}. <span className="text-ink-muted">Optional. Reply STOP anytime.</span>
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-field bg-sev-pronounced-soft px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}
        <Button type="submit" full size="lg" loading={busy} disabled={!firstName.trim() || !phone.trim() || !adult}>
          {welcomePoints > 0 ? `Join and get ${welcomePoints} points` : "Join"}
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-ink-muted">
          Facet is a student hackathon project. We keep your first name and number for {clinicName} only, never sell them, and never ask for payment details in the app.
        </p>
      </form>
    </BottomSheet>
  );
}

/* ---------------------------------------------------------------- Item */

function ItemSheet({
  open,
  item,
  onClose,
  onNeedJoin,
}: {
  open: boolean;
  item: SheetItem | null;
  onClose: () => void;
  onNeedJoin: (item: SheetItem) => void;
}) {
  const { clinicSlug, clinicName, signedIn, isMember } = usePatient();
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setState("idle");
        setError(null);
      });
    }
  }, [open, item?.id]);

  if (!item) return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;

  const action = item.kind === "membership" ? "Request to join" : item.kind === "treatment" ? "Request an appointment" : "Request this";
  const showMember = item.member_price_cents != null && item.member_price_cents !== item.price_cents;

  const send = async () => {
    if (!signedIn) return onNeedJoin(item);
    setState("busy");
    setError(null);
    try {
      const res = await fetch("/api/patient/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicSlug, kind: item.kind, itemId: item.id }),
      });
      const json = await res.json();
      if (res.status === 401) return onNeedJoin(item);
      if (!res.ok) throw new Error(json.error || "Couldn't send. Try again.");
      setState("sent");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send. Try again.");
      setState("error");
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="max-h-[70dvh] overflow-y-auto">
        {item.eyebrow && <Chip className="h-6 text-[10px] font-semibold tracking-[0.08em]">{item.eyebrow.toUpperCase()}</Chip>}
        <h2 className="font-display mt-2 text-[22px]">{item.name}</h2>
        {item.meta && item.meta.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-ink-soft">
            {item.meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </p>
        )}
        {item.description && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{item.description}</p>}
        {item.perks && item.perks.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2.5">
            {item.perks.map((p) => (
              <li key={p} className="flex gap-2.5 text-[14px] leading-snug">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                  <Icon name="check" className="size-3.5" strokeWidth={2.2} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-[13px] text-ink-muted">{item.kind === "membership" ? "Monthly" : "Price"}</span>
          <span className="text-right">
            <span className={showMember && isMember ? "text-[13px] text-ink-muted line-through" : "text-[17px] font-semibold"}>
              {money(item.price_cents, { perMonth: item.perMonth })}
            </span>
            {showMember && (
              <span className="block text-[13px] text-brand-ink">
                {isMember ? <span className="text-[17px] font-semibold">{money(item.member_price_cents)}</span> : money(item.member_price_cents)} member price
              </span>
            )}
          </span>
        </div>
      </div>

      {state === "sent" ? (
        <div className="mt-5 rounded-card bg-brand-soft p-4 text-[14px] leading-snug text-brand-ink">
          <p className="font-medium">Sent to {clinicName}.</p>
          <p className="mt-0.5">The front desk will text you to confirm. Nothing has been charged.</p>
        </div>
      ) : (
        <>
          {error && (
            <p role="alert" className="mt-4 rounded-field bg-sev-pronounced-soft px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}
          <Button full size="lg" className="mt-5" loading={state === "busy"} onClick={send}>
            {action}
          </Button>
          <p className="mt-2 text-center text-[11px] text-ink-muted">No payment in the app. {clinicName} confirms and charges in person.</p>
        </>
      )}
    </BottomSheet>
  );
}

/* ------------------------------------------------- small client buttons */

/** A tappable card that opens the item sheet. Children are the card's visual. */
export function ItemButton({ item, className, children }: { item: SheetItem; className?: string; children: React.ReactNode }) {
  const { openItem } = usePatient();
  return (
    <button type="button" onClick={() => openItem(item)} className={className ?? "block w-full text-left"}>
      {children}
    </button>
  );
}

/** Any element that opens the join sheet (e.g. the points pill on Home). */
export function JoinTrigger({ reason, className, children }: { reason?: string; className?: string; children: React.ReactNode }) {
  const { openJoin } = usePatient();
  return (
    <button type="button" onClick={() => openJoin(reason)} className={className}>
      {children}
    </button>
  );
}

export function JoinButton({ children, reason, ...rest }: React.ComponentProps<typeof Button> & { reason?: string }) {
  const { openJoin } = usePatient();
  return (
    <Button {...(rest as object)} onClick={() => openJoin(reason)}>
      {children}
    </Button>
  );
}
