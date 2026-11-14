import type { Landmark, ZoneId } from "@/lib/types";

/**
 * MediaPipe Face Landmarker topology helpers (478 points, normalized 0..1).
 * "left"/"right" are the subject's left/right, as MediaPipe reports them.
 */

// Canonical index rings (MediaPipe face mesh topology).
export const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
export const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
export const LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
export const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
export const LEFT_BROW = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];
export const RIGHT_BROW = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];
export const FOREHEAD = [10, 338, 297, 332, 284, 251, 301, 293, 334, 296, 336, 9, 107, 66, 105, 63, 71, 21, 54, 103, 67, 109];
export const GLABELLA = [107, 9, 336, 285, 417, 168, 193, 55];
export const NOSE = [6, 351, 412, 343, 437, 420, 279, 358, 327, 326, 2, 97, 98, 129, 49, 198, 217, 114, 188, 122];

// Anchor points
export const IDX = {
  foreheadTop: 10,
  chin: 152,
  noseTip: 1,
  nasion: 168,
  leftCheekSide: 454,
  rightCheekSide: 234,
  leftEyeOuter: 263,
  leftEyeInner: 362,
  rightEyeOuter: 33,
  rightEyeInner: 133,
  leftLowerLid: 374,
  rightLowerLid: 145,
  leftUpperLid: 386,
  rightUpperLid: 159,
  leftCheek: 280,
  rightCheek: 50,
  leftAla: 358,
  rightAla: 129,
  leftMouthCorner: 291,
  rightMouthCorner: 61,
  leftJaw: 288,
  rightJaw: 58,
} as const;

export type Pt = { x: number; y: number };

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function faceMetrics(lm: Landmark[]) {
  const width = dist(lm[IDX.rightCheekSide], lm[IDX.leftCheekSide]);
  const height = dist(lm[IDX.foreheadTop], lm[IDX.chin]);
  const leftEye = mid(lm[IDX.leftEyeInner], lm[IDX.leftEyeOuter]);
  const rightEye = mid(lm[IDX.rightEyeInner], lm[IDX.rightEyeOuter]);
  const leftEyeW = dist(lm[IDX.leftEyeInner], lm[IDX.leftEyeOuter]);
  const rightEyeW = dist(lm[IDX.rightEyeInner], lm[IDX.rightEyeOuter]);
  const roll = Math.atan2(leftEye.y - rightEye.y, leftEye.x - rightEye.x); // radians, 0 = level
  return { width, height, leftEye, rightEye, leftEyeW, rightEyeW, roll };
}

export function bbox(lm: Landmark[], indices?: number[]) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  const pts = indices ? indices.map((i) => lm[i]) : lm;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/** A zone is one or more shapes in normalized coordinates. */
export type ZoneShape =
  | { kind: "poly"; points: Pt[] }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rot: number }
  | { kind: "stroke"; points: Pt[]; width: number };

export type ZoneGeometry = { zone: ZoneId; shapes: ZoneShape[]; exclude?: ZoneShape[] };

function poly(lm: Landmark[], idx: number[]): ZoneShape {
  return { kind: "poly", points: idx.map((i) => ({ x: lm[i].x, y: lm[i].y })) };
}

function ring(lm: Landmark[], idx: number[], pad: number): ZoneShape {
  // polygon pushed outward from its centroid by `pad` (normalized units)
  const pts = idx.map((i) => lm[i]);
  const c = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });
  return {
    kind: "poly",
    points: pts.map((p) => {
      const d = dist(p, c) || 1e-6;
      return { x: p.x + ((p.x - c.x) / d) * pad, y: p.y + ((p.y - c.y) / d) * pad };
    }),
  };
}

/** Build the geometry for a zone from landmarks. */
export function zoneGeometry(zone: ZoneId, lm: Landmark[]): ZoneGeometry {
  const m = faceMetrics(lm);
  const fw = m.width;
  const fh = m.height;

  const eyeZone = (side: "left" | "right", kind: "under" | "crow"): ZoneShape => {
    const inner = lm[side === "left" ? IDX.leftEyeInner : IDX.rightEyeInner];
    const outer = lm[side === "left" ? IDX.leftEyeOuter : IDX.rightEyeOuter];
    const lower = lm[side === "left" ? IDX.leftLowerLid : IDX.rightLowerLid];
    const ew = dist(inner, outer);
    const ang = Math.atan2(outer.y - inner.y, outer.x - inner.x);
    // unit vector pointing outward along the eye axis, and "down" perpendicular
    const ox = Math.cos(ang), oy = Math.sin(ang);
    if (kind === "under") {
      const c = mid(inner, outer);
      return {
        kind: "ellipse",
        cx: c.x,
        cy: lower.y + ew * 0.34,
        rx: ew * 0.72,
        ry: ew * 0.32,
        rot: ang,
      };
    }
    return {
      kind: "ellipse",
      cx: outer.x + ox * ew * 0.42,
      cy: outer.y + oy * ew * 0.42 + ew * 0.05,
      rx: ew * 0.42,
      ry: ew * 0.55,
      rot: ang,
    };
  };

  switch (zone) {
    case "forehead":
      return { zone, shapes: [poly(lm, FOREHEAD)] };
    case "glabella":
      return { zone, shapes: [ring(lm, GLABELLA, fw * 0.03)] };
    case "crows_feet_left":
      return { zone, shapes: [eyeZone("left", "crow")] };
    case "crows_feet_right":
      return { zone, shapes: [eyeZone("right", "crow")] };
    case "under_eye_left":
      return { zone, shapes: [eyeZone("left", "under")], exclude: [ring(lm, LEFT_EYE, fw * 0.012)] };
    case "under_eye_right":
      return { zone, shapes: [eyeZone("right", "under")], exclude: [ring(lm, RIGHT_EYE, fw * 0.012)] };
    case "cheek_left": {
      const c = lm[IDX.leftCheek];
      return { zone, shapes: [{ kind: "ellipse", cx: c.x, cy: c.y + fh * 0.02, rx: fw * 0.16, ry: fh * 0.11, rot: m.roll }] };
    }
    case "cheek_right": {
      const c = lm[IDX.rightCheek];
      return { zone, shapes: [{ kind: "ellipse", cx: c.x, cy: c.y + fh * 0.02, rx: fw * 0.16, ry: fh * 0.11, rot: m.roll }] };
    }
    case "nasolabial_left": {
      const a = lm[IDX.leftAla], b = lm[IDX.leftMouthCorner];
      const ext = { x: b.x + (b.x - a.x) * 0.25, y: b.y + (b.y - a.y) * 0.25 };
      return { zone, shapes: [{ kind: "stroke", points: [a, ext], width: fw * 0.1 }] };
    }
    case "nasolabial_right": {
      const a = lm[IDX.rightAla], b = lm[IDX.rightMouthCorner];
      const ext = { x: b.x + (b.x - a.x) * 0.25, y: b.y + (b.y - a.y) * 0.25 };
      return { zone, shapes: [{ kind: "stroke", points: [a, ext], width: fw * 0.1 }] };
    }
    case "nose":
      return { zone, shapes: [poly(lm, NOSE)] };
    case "lips":
      return { zone, shapes: [ring(lm, LIPS_OUTER, fw * 0.012)] };
    case "chin": {
      const c = lm[IDX.chin];
      return { zone, shapes: [{ kind: "ellipse", cx: c.x, cy: c.y - fh * 0.09, rx: fw * 0.17, ry: fh * 0.1, rot: m.roll }] };
    }
    case "jawline": {
      const start = FACE_OVAL.indexOf(IDX.leftJaw);
      const end = FACE_OVAL.indexOf(IDX.rightJaw);
      const idx = FACE_OVAL.slice(start, end + 1);
      const pts = idx.map((i) => {
        const p = lm[i];
        // nudge inward toward the nose tip so the band sits on the jaw, not the background
        const n = lm[IDX.noseTip];
        return { x: p.x + (n.x - p.x) * 0.12, y: p.y + (n.y - p.y) * 0.12 };
      });
      return { zone, shapes: [{ kind: "stroke", points: pts, width: fw * 0.14 }] };
    }
    case "full_face":
    default:
      return {
        zone: "full_face",
        shapes: [poly(lm, FACE_OVAL)],
        exclude: [
          ring(lm, LEFT_EYE, fw * 0.03),
          ring(lm, RIGHT_EYE, fw * 0.03),
          ring(lm, LEFT_BROW, fw * 0.02),
          ring(lm, RIGHT_BROW, fw * 0.02),
          ring(lm, LIPS_OUTER, fw * 0.01),
        ],
      };
  }
}

/** Normalized bounding box of a zone (for crops). */
export function zoneBounds(zone: ZoneId, lm: Landmark[]) {
  const g = zoneGeometry(zone, lm);
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  const add = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const s of g.shapes) {
    if (s.kind === "poly") s.points.forEach((p) => add(p.x, p.y));
    else if (s.kind === "ellipse") {
      const r = Math.max(s.rx, s.ry);
      add(s.cx - r, s.cy - r);
      add(s.cx + r, s.cy + r);
    } else {
      s.points.forEach((p) => {
        add(p.x - s.width / 2, p.y - s.width / 2);
        add(p.x + s.width / 2, p.y + s.width / 2);
      });
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** The order zones light up during capture, with on-screen labels. */
export const MAPPING_SEQUENCE: Array<{ zones: ZoneId[]; label: string }> = [
  { zones: ["forehead", "glabella"], label: "Mapping forehead" },
  { zones: ["under_eye_left", "under_eye_right", "crows_feet_left", "crows_feet_right"], label: "Mapping eyes" },
  { zones: ["cheek_left", "cheek_right", "nose"], label: "Mapping cheeks" },
  { zones: ["lips", "nasolabial_left", "nasolabial_right"], label: "Mapping lips" },
  { zones: ["jawline", "chin"], label: "Mapping jawline" },
];

/** Point-in-zone test used to light up mesh points per zone during capture. */
export function pointInGeometry(p: Pt, g: ZoneGeometry) {
  const inShape = (s: ZoneShape) => {
    if (s.kind === "poly") return pointInPoly(p, s.points);
    if (s.kind === "ellipse") {
      const c = Math.cos(-s.rot), sn = Math.sin(-s.rot);
      const dx = p.x - s.cx, dy = p.y - s.cy;
      const x = dx * c - dy * sn, y = dx * sn + dy * c;
      return (x * x) / (s.rx * s.rx) + (y * y) / (s.ry * s.ry) <= 1;
    }
    for (let i = 0; i < s.points.length - 1; i++) {
      if (distToSegment(p, s.points[i], s.points[i + 1]) <= s.width / 2) return true;
    }
    return false;
  };
  if (!g.shapes.some(inShape)) return false;
  if (g.exclude?.some(inShape)) return false;
  return true;
}

export function pointInPoly(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(p: Pt, a: Pt, b: Pt) {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}
