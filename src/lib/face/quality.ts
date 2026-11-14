import type { CaptureQuality, Landmark } from "@/lib/types";
import { IDX, faceMetrics, bbox } from "./landmarks";

export const GATES = {
  centerTolerance: 0.14, // of frame
  minFaceHeight: 0.3, // face height / frame height
  maxFaceHeight: 0.72,
  maxAngleDeg: 12,
  eyeBlinkMax: 0.5,
  minBrightness: 60,
  maxBrightness: 215,
  maxSideDiff: 55,
  stillPx: 3.0, // nose tip movement per frame, in px of the video frame
  holdMs: 900,
};

/** Approximate head pose in degrees from landmark geometry (no transform matrix needed). */
export function headPose(lm: Landmark[]) {
  const m = faceMetrics(lm);
  const nose = lm[IDX.noseTip];
  const l = lm[IDX.leftCheekSide], r = lm[IDX.rightCheekSide];
  const yawRatio = (nose.x - r.x) / (l.x - r.x || 1e-6); // 0.5 = frontal
  const eyesY = (m.leftEye.y + m.rightEye.y) / 2;
  const pitchRatio = (nose.y - eyesY) / (lm[IDX.chin].y - eyesY || 1e-6); // ~0.46 frontal
  return {
    yaw: (yawRatio - 0.5) * 120,
    pitch: (pitchRatio - 0.46) * 150,
    roll: (m.roll * 180) / Math.PI,
  };
}

export function blendshapeMap(categories: Array<{ categoryName: string; score: number }> | undefined) {
  const out: Record<string, number> = {};
  for (const c of categories ?? []) out[c.categoryName] = c.score;
  return out;
}

/** Mean luminance and left/right balance inside the face box, sampled from a small canvas. */
export function measureLight(video: HTMLVideoElement, lm: Landmark[], scratch: HTMLCanvasElement) {
  const b = bbox(lm);
  const w = 48, h = 48;
  scratch.width = w;
  scratch.height = h;
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(
    video,
    b.minX * video.videoWidth,
    b.minY * video.videoHeight,
    b.w * video.videoWidth,
    b.h * video.videoHeight,
    0,
    0,
    w,
    h,
  );
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0, left = 0, right = 0, n = 0, nl = 0, nr = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += lum;
      n++;
      if (x < w / 2) {
        left += lum;
        nl++;
      } else {
        right += lum;
        nr++;
      }
    }
  }
  return { brightness: sum / n, sideDiff: Math.abs(left / nl - right / nr) };
}

export function evaluate(
  lm: Landmark[],
  blend: Record<string, number>,
  light: { brightness: number; sideDiff: number },
  movementPx: number,
): CaptureQuality {
  const b = bbox(lm);
  const pose = headPose(lm);
  const faceHeightRatio = b.h; // normalized to frame height already
  return {
    centered: Math.abs(b.cx - 0.5) < GATES.centerTolerance && Math.abs(b.cy - 0.5) < GATES.centerTolerance + 0.04,
    sized: faceHeightRatio > GATES.minFaceHeight && faceHeightRatio < GATES.maxFaceHeight,
    angled: Math.abs(pose.yaw) < GATES.maxAngleDeg && Math.abs(pose.pitch) < GATES.maxAngleDeg && Math.abs(pose.roll) < GATES.maxAngleDeg,
    eyesOpen: (blend.eyeBlinkLeft ?? 0) < GATES.eyeBlinkMax && (blend.eyeBlinkRight ?? 0) < GATES.eyeBlinkMax,
    lit: light.brightness > GATES.minBrightness && light.brightness < GATES.maxBrightness && light.sideDiff < GATES.maxSideDiff,
    still: movementPx < GATES.stillPx,
    yaw: pose.yaw,
    pitch: pose.pitch,
    roll: pose.roll,
    brightness: light.brightness,
    faceHeightRatio,
  };
}

export function allGood(q: CaptureQuality) {
  return q.centered && q.sized && q.angled && q.eyesOpen && q.lit && q.still;
}

/** One friendly prompt at a time, most important first. */
export function promptFor(q: CaptureQuality | null, faceFound: boolean, mirrored = true): string {
  if (!faceFound) return "Center your face in the frame";
  if (!q) return "Hold on";
  if (!q.sized) return q.faceHeightRatio <= GATES.minFaceHeight ? "Come a little closer" : "Move back a little";
  if (!q.centered) return "Center your face";
  if (!q.lit) {
    if (q.brightness <= GATES.minBrightness) return "Find brighter light";
    if (q.brightness >= GATES.maxBrightness) return "Find softer light";
    return "Face the light so both sides are even";
  }
  if (!q.angled) {
    if (Math.abs(q.yaw) >= GATES.maxAngleDeg) {
      const left = q.yaw > 0;
      // On a mirrored preview, "turn left" means the subject's left.
      return (left !== mirrored) ? "Turn a little to your right" : "Turn a little to your left";
    }
    if (Math.abs(q.pitch) >= GATES.maxAngleDeg) return q.pitch > 0 ? "Lift your chin a touch" : "Lower your chin a touch";
    return "Level your head";
  }
  if (!q.eyesOpen) return "Eyes open, relaxed face";
  if (!q.still) return "Hold still";
  return "Perfect. Hold it";
}
