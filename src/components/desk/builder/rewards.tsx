"use client";

import * as React from "react";
import type { DeskReward } from "@/lib/desk/types";
import { EmptyState } from "../empty";
import { DeskIcon } from "../icons";
import { AreaField, CheckRow, ErrorText, Field, Modal, PillButton, SavingToggle, useDeskAction } from "../ui";

function RewardArt({ src, className }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- clinic-supplied URL, any host
    <img src={src} alt="" className={`w-full object-cover ${className ?? ""}`} />
  ) : (
    <div className={`grid w-full place-items-center bg-brand-soft text-brand ${className ?? ""}`}>
      <DeskIcon name="gift" className="size-9" strokeWidth={1.3} />
    </div>
  );
}

export function RewardsEditor({ slug, items }: { slug: string; items: DeskReward[] }) {
  const [editing, setEditing] = React.useState<DeskReward | "new" | null>(null);
  const { run, error } = useDeskAction();
  const close = React.useCallback(() => setEditing(null), []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">What patients can spend points on. Shown in the app&rsquo;s Rewards tab, and codes are checked at the desk.</p>
        <PillButton onClick={() => setEditing("new")}>Add reward</PillButton>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {items.length === 0 ? (
        <div className="mt-4 rounded-card border border-line bg-surface">
          <EmptyState icon="gift" title="No rewards yet">
            Add a few things worth coming back for, like an add-on or a dollar amount off.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => (
            <li key={r.id} className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
              <RewardArt src={r.image_url} className="aspect-[16/9]" />
              <div className="p-4">
                <p className="text-[15px] font-medium">{r.name}</p>
                <p className="text-[12px] text-ink-muted">{r.points_cost.toLocaleString("en-US")} pts</p>
                <div className="mt-3 flex items-center gap-3">
                  <PillButton variant="ghost" className="h-9 flex-1" onClick={() => setEditing(r)}>
                    Edit
                  </PillButton>
                  <SavingToggle initial={r.active} label={`Show ${r.name} in the app`} onSave={async (v) => Boolean(await run(`/api/desk/${slug}/rewards/${r.id}`, "PATCH", { active: v }))} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={editing !== null} onClose={close} title={editing === "new" ? "Add reward" : "Edit reward"}>
        {editing !== null && <RewardForm key={editing === "new" ? "new" : editing.id} slug={slug} item={editing === "new" ? null : editing} onDone={close} />}
      </Modal>
    </div>
  );
}

function RewardForm({ slug, item, onDone }: { slug: string; item: DeskReward | null; onDone: () => void }) {
  const { run, pending, error, setError } = useDeskAction();
  const [f, setF] = React.useState({
    name: item?.name ?? "",
    points: item ? String(item.points_cost) : "",
    description: item?.description ?? "",
    image_url: item?.image_url ?? "",
    active: item?.active ?? true,
  });
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const previewUrl = /^https?:\/\/\S+$/.test(f.image_url.trim()) ? f.image_url.trim() : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const pts = Number(f.points);
    if (!Number.isInteger(pts) || pts < 1) return setError("Points must be a whole number above 0.");
    const body = { name: f.name, points_cost: pts, description: f.description, image_url: f.image_url, active: f.active };
    const ok = item ? await run(`/api/desk/${slug}/rewards/${item.id}`, "PATCH", body) : await run(`/api/desk/${slug}/rewards`, "POST", body);
    if (ok) onDone();
  }

  async function remove() {
    if (!item) return;
    if (await run(`/api/desk/${slug}/rewards/${item.id}`, "DELETE")) onDone();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3.5">
      <div className="overflow-hidden rounded-field border border-line">
        <RewardArt src={previewUrl} className="aspect-[16/8]" />
      </div>
      <Field label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} placeholder="$25 off any facial" />
      <Field label="Points" inputMode="numeric" value={f.points} onChange={(e) => set("points", e.target.value.replace(/\D/g, ""))} required placeholder="300" />
      <AreaField label="Description (optional)" rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
      <Field label="Image URL (optional)" type="url" value={f.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://" />
      <CheckRow label="Show in the app" hint="Off hides it from patients" checked={f.active} onChange={(v) => set("active", v)} />
      <ErrorText>{error}</ErrorText>
      <PillButton type="submit" className="h-11" disabled={pending}>
        {pending ? "Saving…" : item ? "Save reward" : "Add reward"}
      </PillButton>
      {item &&
        (confirmDelete ? (
          <div className="rounded-field bg-sev-pronounced-soft p-3 text-center">
            <p className="text-[13px] text-danger">Delete this reward for good? Codes patients already have still work at the desk.</p>
            <div className="mt-2 flex justify-center gap-2">
              <PillButton variant="secondary" className="h-9" onClick={() => setConfirmDelete(false)}>
                Keep it
              </PillButton>
              <PillButton variant="destructive" className="h-9" disabled={pending} onClick={remove}>
                Delete
              </PillButton>
            </div>
          </div>
        ) : (
          <PillButton variant="danger" className="mx-auto h-9" onClick={() => setConfirmDelete(true)}>
            Delete reward
          </PillButton>
        ))}
    </form>
  );
}
