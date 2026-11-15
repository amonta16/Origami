import type { Landmark, ZoneId } from "@/lib/types";
import { zoneBounds } from "./landmarks";
import { loadImage } from "./mask";

/** Downscale a data URL so the longest side is <= maxSide. Returns JPEG data URL. */
export async function resizeDataUrl(src: string, maxSide: number, quality = 0.9) {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1 && src.startsWith("data:image/jpeg")) return { dataUrl: src, width: img.naturalWidth, height: img.naturalHeight };
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return { dataUrl: c.toDataURL("image/jpeg", quality), width: c.width, height: c.height };
}

/**
 * The photo the skin scanner sees: a 3:4 portrait around the face with the face about 70% of the width
 * (YouCam rejects faces under 60%), centred a little above the face's middle so the chin has room.
 * HD analysis needs a short side of 1080 px, so HD is used only when the crop is naturally that big;
 * otherwise SD at 600–1200 px wide. Same crop for camera shots and uploads.
 */
export async function cropForScanner(photo: string, lm: Landmark[]) {
  const img = await loadImage(photo);
  const W = img.naturalWidth, H = img.naturalHeight;
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of lm) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const fx = minX * W, fy = minY * H, fw = (maxX - minX) * W, fh = (maxY - minY) * H;
  let w = fw / 0.7;
  let h = (w * 4) / 3;
  if (h > H) { h = H; w = (h * 3) / 4; }
  if (w > W) { w = W; h = (w * 4) / 3; }
  const cx = fx + fw / 2, cy = fy + fh * 0.45;
  const x = Math.max(0, Math.min(W - w, cx - w / 2));
  const y = Math.max(0, Math.min(H - h, cy - h / 2));
  const hd = w >= 1080;
  const outW = Math.round(Math.min(1200, Math.max(hd ? 1080 : 600, w)));
  const outH = Math.round((outW * 4) / 3);
  const c = document.createElement("canvas");
  c.width = outW;
  c.height = outH;
  c.getContext("2d")!.drawImage(img, x, y, w, h, 0, 0, outW, outH);
  return { dataUrl: c.toDataURL("image/jpeg", 0.92), width: outW, height: outH, hd };
}

/** Crop a zone (with padding) from the photo for the vision model. */
export async function cropZone(img: HTMLImageElement, lm: Landmark[], zones: ZoneId[], pad = 0.25, outWidth = 320) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const z of zones) {
    const b = zoneBounds(z, lm);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  const w = maxX - minX, h = maxY - minY;
  const px = w * pad, py = h * pad;
  const sx = Math.max(0, (minX - px) * img.naturalWidth);
  const sy = Math.max(0, (minY - py) * img.naturalHeight);
  const sw = Math.min(img.naturalWidth - sx, (w + 2 * px) * img.naturalWidth);
  const sh = Math.min(img.naturalHeight - sy, (h + 2 * py) * img.naturalHeight);
  const scale = outWidth / sw;
  const c = document.createElement("canvas");
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  c.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

/** The crops sent to the analysis model, in a fixed order. */
export const ANALYSIS_CROPS: Array<{ id: string; zones: ZoneId[] }> = [
  { id: "forehead", zones: ["forehead", "glabella"] },
  { id: "eyes", zones: ["under_eye_left", "under_eye_right", "crows_feet_left", "crows_feet_right"] },
  { id: "left_cheek", zones: ["cheek_left", "nasolabial_left", "crows_feet_left"] },
  { id: "right_cheek", zones: ["cheek_right", "nasolabial_right", "crows_feet_right"] },
  { id: "nose_lips", zones: ["nose", "lips"] },
  { id: "jaw", zones: ["jawline", "chin"] },
];

export async function buildAnalysisCrops(photo: string, lm: Landmark[]) {
  const img = await loadImage(photo);
  const out: Array<{ id: string; dataUrl: string }> = [];
  for (const c of ANALYSIS_CROPS) out.push({ id: c.id, dataUrl: await cropZone(img, lm, c.zones) });
  return out;
}

export function dataUrlBytes(dataUrl: string) {
  const i = dataUrl.indexOf(",");
  return Math.round(((dataUrl.length - i - 1) * 3) / 4);
}
