import { SIM_ZONES } from "@/lib/concerns";
import { resizeDataUrl } from "@/lib/face/image";
import { buildMask, compositeMasked, loadImage, maskToAlphaPng } from "@/lib/face/mask";
import type { Landmark, SimKind, SimProvider } from "@/lib/types";

export type SimResult = {
  key: string;
  kind: SimKind;
  provider: SimProvider;
  model: string;
  ms: number;
  /** 1024px working image (what was sent). */
  original: string;
  /** raw provider output, same size as original (resized if needed) */
  edited: string;
  /** masked + color-matched composite at full strength */
  composite: string;
  width: number;
  height: number;
};

const cache = new Map<string, Promise<SimResult>>();

export function simKey(photoId: string, kind: SimKind, provider: SimProvider | "auto", useMask: boolean) {
  return `${photoId}:${kind}:${provider}:${useMask ? "m" : "n"}`;
}

/** Prepare the inputs once per photo+kind: working image, BW mask, alpha mask. */
export async function prepareInputs(photo: string, landmarks: Landmark[], kind: SimKind) {
  const small = await resizeDataUrl(photo, 1024, 0.92);
  const mask = buildMask(SIM_ZONES[kind], landmarks, small.width, small.height);
  return {
    image: small.dataUrl,
    width: small.width,
    height: small.height,
    maskBW: mask.toDataURL("image/png"),
    mask: maskToAlphaPng(mask),
    maskCanvas: mask,
  };
}

export function runSimulation(args: {
  photoId: string;
  photo: string;
  landmarks: Landmark[];
  kind: SimKind;
  provider?: SimProvider;
  useMask?: boolean;
  promptOverride?: string;
  force?: boolean;
  /** tester session + clinic for the scan_runs log */
  session?: string;
  clinicSlug?: string;
}): Promise<SimResult> {
  const useMask = args.useMask ?? false;
  const key = simKey(args.photoId, args.kind, args.provider ?? "auto", useMask) + (args.promptOverride ? ":custom" : "");
  if (!args.force && cache.has(key)) return cache.get(key)!;
  const p = (async () => {
    const inputs = await prepareInputs(args.photo, args.landmarks, args.kind);
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image: inputs.image,
        mask: useMask ? inputs.mask : null,
        maskBW: useMask ? inputs.maskBW : null,
        useMask,
        kind: args.kind,
        provider: args.provider,
        promptOverride: args.promptOverride,
        session: args.session,
        clinicSlug: args.clinicSlug,
      }),
    });
    const json = (await res.json()) as { image?: string; provider?: SimProvider; model?: string; ms?: number; error?: string };
    if (!res.ok || !json.image) throw new Error(json.error || `Simulation failed (${res.status})`);

    const [orig, edit] = await Promise.all([loadImage(inputs.image), loadImage(json.image)]);
    // Providers may return a slightly different size; draw the edit onto the original's size.
    let editedSameSize = edit;
    if (edit.naturalWidth !== orig.naturalWidth || edit.naturalHeight !== orig.naturalHeight) {
      const c = document.createElement("canvas");
      c.width = orig.naturalWidth;
      c.height = orig.naturalHeight;
      c.getContext("2d")!.drawImage(edit, 0, 0, c.width, c.height);
      editedSameSize = await loadImage(c.toDataURL("image/jpeg", 0.95));
    }
    const composite = compositeMasked(orig, editedSameSize, inputs.maskCanvas);
    return {
      key,
      kind: args.kind,
      provider: json.provider!,
      model: json.model ?? "",
      ms: json.ms ?? 0,
      original: inputs.image,
      edited: editedSameSize.src,
      composite: composite.toDataURL("image/jpeg", 0.95),
      width: inputs.width,
      height: inputs.height,
    } satisfies SimResult;
  })();
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}
