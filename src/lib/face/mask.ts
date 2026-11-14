import type { Landmark, ZoneId } from "@/lib/types";
import { zoneGeometry, type ZoneShape } from "./landmarks";

/**
 * Canvas helpers for masks, heat maps and compositing. Browser only.
 * Masks are white-on-black alpha-free PNGs; "feather" is a gaussian blur in px.
 */

function pathShape(ctx: CanvasRenderingContext2D, s: ZoneShape, W: number, H: number) {
  if (s.kind === "poly") {
    ctx.beginPath();
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x * W, p.y * H) : ctx.moveTo(p.x * W, p.y * H)));
    ctx.closePath();
    ctx.fill();
  } else if (s.kind === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(s.cx * W, s.cy * H, s.rx * W, s.ry * W, s.rot, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s.width * W;
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.beginPath();
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x * W, p.y * H) : ctx.moveTo(p.x * W, p.y * H)));
    ctx.stroke();
    ctx.restore();
  }
}

/** Draw zones (white) minus excludes (black) onto ctx at W×H. */
export function drawZones(ctx: CanvasRenderingContext2D, zones: ZoneId[], lm: Landmark[], W: number, H: number, color = "#fff") {
  const geoms = zones.map((z) => zoneGeometry(z, lm));
  ctx.fillStyle = color;
  for (const g of geoms) for (const s of g.shapes) pathShape(ctx, s, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  for (const g of geoms) for (const s of g.exclude ?? []) pathShape(ctx, s, W, H);
  ctx.restore();
}

/** Feathered mask canvas (white = editable). */
export function buildMask(zones: ZoneId[], lm: Landmark[], W: number, H: number, featherPx = Math.round(W * 0.02)) {
  const shapes = document.createElement("canvas");
  shapes.width = W;
  shapes.height = H;
  const sctx = shapes.getContext("2d")!;
  drawZones(sctx, zones, lm, W, H);

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.filter = `blur(${featherPx}px)`;
  ctx.drawImage(shapes, 0, 0);
  ctx.filter = "none";
  return out;
}

/** OpenAI-style mask: transparent where editable, opaque elsewhere (PNG with alpha). */
export function maskToAlphaPng(mask: HTMLCanvasElement) {
  const W = mask.width, H = mask.height;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d")!;
  const src = mask.getContext("2d")!.getImageData(0, 0, W, H);
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < src.data.length; i += 4) {
    const v = src.data[i]; // 0..255 white = editable
    img.data[i] = 0;
    img.data[i + 1] = 0;
    img.data[i + 2] = 0;
    img.data[i + 3] = 255 - v; // editable → transparent
  }
  ctx.putImageData(img, 0, 0);
  return out.toDataURL("image/png");
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Composite `edited` over `original` only inside `mask`, after matching the edited
 * region's mean color to the original's. Returns the fully blended canvas
 * (strength 1). Use `blendDose` to mix original→composite live.
 */
export function compositeMasked(original: HTMLImageElement, edited: HTMLImageElement, mask: HTMLCanvasElement) {
  const W = original.naturalWidth, H = original.naturalHeight;
  const o = document.createElement("canvas");
  o.width = W;
  o.height = H;
  const octx = o.getContext("2d")!;
  octx.drawImage(original, 0, 0, W, H);
  const od = octx.getImageData(0, 0, W, H);

  const e = document.createElement("canvas");
  e.width = W;
  e.height = H;
  const ectx = e.getContext("2d")!;
  ectx.drawImage(edited, 0, 0, W, H);
  const ed = ectx.getImageData(0, 0, W, H);

  const mk = document.createElement("canvas");
  mk.width = W;
  mk.height = H;
  const mctx = mk.getContext("2d")!;
  mctx.drawImage(mask, 0, 0, W, H);
  const md = mctx.getImageData(0, 0, W, H).data;

  // color match: mean shift per channel inside the mask (weighted by mask)
  let wsum = 0;
  const so = [0, 0, 0], se = [0, 0, 0];
  for (let i = 0, p = 0; i < md.length; i += 4, p += 4) {
    const w = md[i] / 255;
    if (w < 0.2) continue;
    wsum += w;
    for (let c = 0; c < 3; c++) {
      so[c] += od.data[p + c] * w;
      se[c] += ed.data[p + c] * w;
    }
  }
  const shift = wsum > 0 ? so.map((v, c) => v / wsum - se[c] / wsum) : [0, 0, 0];

  const out = octx.createImageData(W, H);
  for (let i = 0, p = 0; i < md.length; i += 4, p += 4) {
    const w = md[i] / 255;
    for (let c = 0; c < 3; c++) {
      const ev = Math.max(0, Math.min(255, ed.data[p + c] + shift[c]));
      out.data[p + c] = od.data[p + c] * (1 - w) + ev * w;
    }
    out.data[p + 3] = 255;
  }
  const result = document.createElement("canvas");
  result.width = W;
  result.height = H;
  result.getContext("2d")!.putImageData(out, 0, 0);
  return result;
}

/** Draw original then composite with alpha = dose (0..1) onto target canvas. */
export function blendDose(target: HTMLCanvasElement, original: CanvasImageSource, composite: CanvasImageSource, dose: number) {
  const ctx = target.getContext("2d")!;
  ctx.globalAlpha = 1;
  ctx.drawImage(original, 0, 0, target.width, target.height);
  ctx.globalAlpha = Math.max(0, Math.min(1, dose));
  ctx.drawImage(composite, 0, 0, target.width, target.height);
  ctx.globalAlpha = 1;
}

/** Heat-map overlay: tint zones by severity color/alpha, softened. */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  items: Array<{ zones: ZoneId[]; color: string; alpha: number }>,
  lm: Landmark[],
  W: number,
  H: number,
) {
  const layer = document.createElement("canvas");
  layer.width = W;
  layer.height = H;
  const lctx = layer.getContext("2d")!;
  for (const it of items) {
    const tmp = document.createElement("canvas");
    tmp.width = W;
    tmp.height = H;
    const tctx = tmp.getContext("2d")!;
    drawZones(tctx, it.zones, lm, W, H, it.color);
    lctx.globalAlpha = it.alpha;
    lctx.filter = `blur(${Math.round(W * 0.012)}px)`;
    lctx.drawImage(tmp, 0, 0);
  }
  lctx.filter = "none";
  lctx.globalAlpha = 1;
  ctx.drawImage(layer, 0, 0, ctx.canvas.width, ctx.canvas.height);
}
