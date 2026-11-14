/** Client-side event logging. Fire-and-forget to /api/events. */
export function track(name: string, props: Record<string, unknown> = {}, ids: { clinicId?: string; leadId?: string } = {}) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, props, clinic_id: ids.clinicId ?? null, lead_id: ids.leadId ?? null });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    }
  } catch {
    // never let analytics break the flow
  }
}
