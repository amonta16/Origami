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

/**
 * The face region to send to the image model, in pixels of the working image. A phone selfie shows
 * shoulders and background, so the face fills well under half the width; YouCam's simulators reject
 * anything under 60% ("face too small") and every model renders more detail with a tighter frame.
 * The rect makes the face about 75% of the width, with room above the forehead and below the chin.
 */
function faceCrop(landmarks: Landmark[], W: number, H: number) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const fw = (maxX - minX) * W, fh = (maxY - minY) * H;
  if (!(fw > 20 && fh > 20)) return { x: 0, y: 0, w: W, h: H };
  let w = Math.min(W, fw / 0.75);
  let h = Math.min(H, Math.max(fh * 1.55, w * 1.2));
  let x = (minX + maxX) / 2 * W - w / 2;
  let y = minY * H - fh * 0.3;
  x = Math.max(0, Math.min(W - w, x));
  y = Math.max(0, Math.min(H - h, y));
  w = Math.min(w, W - x);
  h = Math.min(h, H - y);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/** Cut a rect out of an image (data URL) and scale it so its long side is `side` px. */
async function cropToDataUrl(src: string, r: { x: number; y: number; w: number; h: number }, side: number, type: "image/jpeg" | "image/png") {
  const img = await loadImage(src);
  const s = side / Math.max(r.w, r.h);
  const c = document.createElement("canvas");
  c.width = Math.round(r.w * s);
  c.height = Math.round(r.h * s);
  c.getContext("2d")!.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  return c.toDataURL(type, 0.92);
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
  /** kind "scan": Skin Simulation strengths */
  sim?: Record<string, number>;
  force?: boolean;
  /** tester session + clinic for the scan_runs log */
  session?: string;
  clinicSlug?: string;
}): Promise<SimResult> {
  const useMask = args.useMask ?? false;
  const key = simKey(args.photoId, args.kind, args.provider ?? "auto", useMask) + (args.promptOverride ? ":custom" : "") + (args.sim ? `:${JSON.stringify(args.sim)}` : "");
  if (!args.force && cache.has(key)) return cache.get(key)!;
  const p = (async () => {
    const inputs = await prepareInputs(args.photo, args.landmarks, args.kind);
    // Send only the face region (see faceCrop); the result is pasted back into the full photo below.
    const rect = faceCrop(args.landmarks, inputs.width, inputs.height);
    const cropped = rect.w < inputs.width || rect.h < inputs.height;
    const sendImage = cropped ? await cropToDataUrl(inputs.image, rect, 1024, "image/jpeg") : inputs.image;
    const sendMask = useMask ? (cropped ? await cropToDataUrl(inputs.mask, rect, 1024, "image/png") : inputs.mask) : null;
    const sendMaskBW = useMask ? (cropped ? await cropToDataUrl(inputs.maskBW, rect, 1024, "image/png") : inputs.maskBW) : null;
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image: sendImage,
        mask: sendMask,
        maskBW: sendMaskBW,
        useMask,
        kind: args.kind,
        sim: args.sim,
        provider: args.provider,
        promptOverride: args.promptOverride,
        session: args.session,
        clinicSlug: args.clinicSlug,
      }),
    });
    const json = (await res.json()) as { image?: string; provider?: SimProvider; model?: string; ms?: number; error?: string };
    if (!res.ok || !json.image) throw new Error(json.error || `Simulation failed (${res.status})`);

    const [orig, edit] = await Promise.all([loadImage(inputs.image), loadImage(json.image)]);
    // Rebuild a full-size "edited" photo: the original everywhere, the model's result pasted into the face
    // rect (stretched to it, since providers may return a slightly different size). The zone mask then
    // decides which of those pixels survive, exactly as before.
    let editedSameSize = edit;
    if (cropped || edit.naturalWidth !== orig.naturalWidth || edit.naturalHeight !== orig.naturalHeight) {
      const c = document.createElement("canvas");
      c.width = orig.naturalWidth;
      c.height = orig.naturalHeight;
      const ctx = c.getContext("2d")!;
      if (cropped) {
        ctx.drawImage(orig, 0, 0);
        ctx.drawImage(edit, rect.x, rect.y, rect.w, rect.h);
      } else {
        ctx.drawImage(edit, 0, 0, c.width, c.height);
      }
      editedSameSize = await loadImage(c.toDataURL("image/jpeg", 0.95));
    }
    const composite = compositeMasked(orig, editedSameSize, inputs.maskCanvas);
    // Show the comparison framed on the face (the same rect the model saw): in a phone selfie the face
    // is a small part of the photo, and a full-frame before/after makes the change hard to see.
    const frame = (src: HTMLCanvasElement | HTMLImageElement) => {
      const c = document.createElement("canvas");
      c.width = rect.w;
      c.height = rect.h;
      c.getContext("2d")!.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      return c.toDataURL("image/jpeg", 0.95);
    };
    return {
      key,
      kind: args.kind,
      provider: json.provider!,
      model: json.model ?? "",
      ms: json.ms ?? 0,
      original: cropped ? frame(orig) : inputs.image,
      edited: editedSameSize.src,
      composite: cropped ? frame(composite) : composite.toDataURL("image/jpeg", 0.95),
      width: cropped ? rect.w : inputs.width,
      height: cropped ? rect.h : inputs.height,
    } satisfies SimResult;
  })();
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}
