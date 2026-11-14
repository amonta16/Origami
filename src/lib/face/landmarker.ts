import type { FaceLandmarker as FaceLandmarkerType } from "@mediapipe/tasks-vision";

/**
 * Lazy singleton around MediaPipe Face Landmarker. Browser only.
 * WASM comes from jsDelivr (pinned to the installed version), the model from Google's
 * public model bucket. Both are credited in CREDITS.md.
 */
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type Mode = "VIDEO" | "IMAGE";

let instance: Promise<FaceLandmarkerType> | null = null;
let currentMode: Mode = "VIDEO";
let connections: { tesselation: Array<{ start: number; end: number }> } | null = null;

export async function getLandmarker(mode: Mode): Promise<FaceLandmarkerType> {
  if (!instance) {
    currentMode = mode;
    instance = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      const make = (delegate: "GPU" | "CPU") =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: mode,
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      let lm: FaceLandmarkerType;
      try {
        lm = await make("GPU");
      } catch {
        lm = await make("CPU");
      }
      connections = { tesselation: FaceLandmarker.FACE_LANDMARKS_TESSELATION };
      return lm;
    })();
  }
  const lm = await instance;
  if (currentMode !== mode) {
    await lm.setOptions({ runningMode: mode });
    currentMode = mode;
  }
  return lm;
}

export function tesselation() {
  return connections?.tesselation ?? [];
}

/** Warm the model in the background (call from the consent screen). */
export function preloadLandmarker() {
  if (typeof window === "undefined") return;
  void getLandmarker("VIDEO").catch(() => {
    instance = null;
  });
}
