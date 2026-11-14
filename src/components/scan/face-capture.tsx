"use client";

import * as React from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui";
import { detectInAppBrowser } from "@/lib/browser";
import { getLandmarker, tesselation } from "@/lib/face/landmarker";
import { bbox, IDX, MAPPING_SEQUENCE, pointInGeometry, zoneGeometry, type ZoneGeometry } from "@/lib/face/landmarks";
import { allGood, blendshapeMap, evaluate, GATES, measureLight, promptFor } from "@/lib/face/quality";
import type { Capture, CaptureQuality, Landmark } from "@/lib/types";

type Status = "init" | "in_app" | "no_camera" | "ready" | "captured";

const STAGE_MS = 650;

export function FaceCapture({
  onCapture,
  onEvent,
}: {
  onCapture: (c: Capture) => void;
  onEvent?: (name: string, props?: Record<string, unknown>) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const scratchRef = React.useRef<HTMLCanvasElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number>(0);
  const lmRef = React.useRef<FaceLandmarker | null>(null);

  // per-frame state kept in refs (no re-render)
  const last = React.useRef<{
    landmarks: Landmark[] | null;
    blend: Record<string, number>;
    quality: CaptureQuality | null;
    nose: { x: number; y: number } | null;
    movementPx: number;
    light: { brightness: number; sideDiff: number };
    frame: number;
    lockedAt: number | null;
    goodSince: number | null;
    lit: Set<number>;
    capturing: boolean;
  }>({
    landmarks: null,
    blend: {},
    quality: null,
    nose: null,
    movementPx: 99,
    light: { brightness: 120, sideDiff: 0 },
    frame: 0,
    lockedAt: null,
    goodSince: null,
    lit: new Set(),
    capturing: false,
  });

  const [status, setStatus] = React.useState<Status>("init");
  const [inApp, setInApp] = React.useState<string | null>(null);
  const [ui, setUi] = React.useState({
    prompt: "Starting camera",
    mapping: "",
    faceFound: false,
    quality: null as CaptureQuality | null,
    hold: 0,
    mapped: false,
  });
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const stop = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const doCapture = React.useCallback(() => {
    const v = videoRef.current;
    const s = last.current;
    if (!v || !s.landmarks || s.capturing) return;
    s.capturing = true;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const photo = c.toDataURL("image/jpeg", 0.92);
    const capture: Capture = {
      photo,
      width: c.width,
      height: c.height,
      landmarks: s.landmarks.map((p) => ({ x: +p.x.toFixed(5), y: +p.y.toFixed(5), z: +p.z.toFixed(5) })),
      blendshapes: s.blend,
      quality: s.quality,
      source: "camera",
    };
    onEvent?.("photo_captured", { width: c.width, height: c.height, auto: true });
    stop();
    setStatus("captured");
    onCapture(capture);
  }, [onCapture, onEvent, stop]);

  // Camera + model + loop
  React.useEffect(() => {
    const app = detectInAppBrowser();
    if (app) {
      queueMicrotask(() => {
        setInApp(app);
        setStatus("in_app");
      });
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        onEvent?.("camera_opened", { w: v.videoWidth, h: v.videoHeight });
        lmRef.current = await getLandmarker("VIDEO");
        if (cancelled) return;
        setStatus("ready");
        setUi((u) => ({ ...u, prompt: "Center your face in the frame" }));
        loop();
      } catch (e) {
        console.warn("camera failed", e);
        if (!cancelled) setStatus("no_camera");
      }
    })();

    let lastVideoTime = -1;
    let lastUiAt = 0;
    const scratch = document.createElement("canvas");
    scratchRef.current = scratch;

    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      const v = videoRef.current, cv = canvasRef.current, lm = lmRef.current;
      if (!v || !cv || !lm || v.readyState < 2) return;
      const now = performance.now();
      const s = last.current;

      if (v.currentTime !== lastVideoTime) {
        lastVideoTime = v.currentTime;
        const res = lm.detectForVideo(v, now);
        const face = res.faceLandmarks?.[0] ?? null;
        s.frame++;
        if (face) {
          s.landmarks = face;
          s.blend = blendshapeMap(res.faceBlendshapes?.[0]?.categories);
          const nose = face[IDX.noseTip];
          if (s.nose) {
            s.movementPx = Math.hypot((nose.x - s.nose.x) * v.videoWidth, (nose.y - s.nose.y) * v.videoHeight);
          }
          s.nose = { x: nose.x, y: nose.y };
          if (s.frame % 6 === 0) s.light = measureLight(v, face, scratch);
          s.quality = evaluate(face, s.blend, s.light, s.movementPx);
          if (!s.lockedAt && s.quality.sized && s.quality.centered) {
            s.lockedAt = now;
            onEvent?.("mesh_locked", {});
          }
          const mapped = s.lockedAt !== null && now - s.lockedAt > STAGE_MS * MAPPING_SEQUENCE.length;
          if (mapped && allGood(s.quality)) {
            if (s.goodSince === null) s.goodSince = now;
            if (now - s.goodSince >= GATES.holdMs) doCapture();
          } else {
            s.goodSince = null;
          }
        } else {
          s.landmarks = null;
          s.quality = null;
          s.nose = null;
          s.goodSince = null;
          s.lockedAt = null;
          s.lit.clear();
        }
      }

      draw(cv, v, s, now);

      if (now - lastUiAt > 120) {
        lastUiAt = now;
        const stage = s.lockedAt ? Math.floor((now - s.lockedAt) / STAGE_MS) : -1;
        const mapped = stage >= MAPPING_SEQUENCE.length;
        setUi({
          prompt: promptFor(s.quality, !!s.landmarks),
          mapping: s.landmarks && stage >= 0 && !mapped ? MAPPING_SEQUENCE[stage].label : "",
          faceFound: !!s.landmarks,
          quality: s.quality,
          hold: s.goodSince ? Math.min(1, (now - s.goodSince) / GATES.holdMs) : 0,
          mapped,
        });
      }
    }

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upload fallback
  const onFile = async (file: File) => {
    setUploadError(null);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
      });
      // normalize to JPEG, cap at 2048px
      const scale = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const lm = await getLandmarker("IMAGE");
      const res = lm.detect(c);
      const face = res.faceLandmarks?.[0];
      if (!face) {
        setUploadError("We couldn't find a face in that photo. Try a front-facing selfie in good light.");
        return;
      }
      stop();
      onEvent?.("photo_uploaded", { width: c.width, height: c.height });
      setStatus("captured");
      onCapture({
        photo: c.toDataURL("image/jpeg", 0.92),
        width: c.width,
        height: c.height,
        landmarks: face.map((p) => ({ x: +p.x.toFixed(5), y: +p.y.toFixed(5), z: +p.z.toFixed(5) })),
        blendshapes: blendshapeMap(res.faceBlendshapes?.[0]?.categories),
        quality: null,
        source: "upload",
      });
    } catch (e) {
      console.warn(e);
      setUploadError("That file didn't work. Try a JPEG or PNG selfie.");
    }
  };

  if (status === "in_app") {
    return (
      <Fallback title={`Open this in ${/iPhone|iPad/.test(navigator.userAgent) ? "Safari" : "Chrome"}`}>
        <p>
          {inApp}&rsquo;s built-in browser blocks the camera. Tap the menu (⋯) and choose
          &ldquo;Open in browser&rdquo;, or copy the link.
        </p>
        <Button
          variant="secondary"
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
        >
          Copy link
        </Button>
        <UploadLink fileRef={fileRef} />
      </Fallback>
    );
  }

  if (status === "no_camera") {
    return (
      <Fallback title="Camera not available">
        <p>
          Allow camera access in your browser settings and reload, or upload a
          front-facing selfie instead.
        </p>
        <UploadLink fileRef={fileRef} />
        {uploadError && <p className="text-sm text-danger">{uploadError}</p>}
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </Fallback>
    );
  }

  const q = ui.quality;
  const gates: Array<[string, boolean | null]> = [
    ["Centered", q?.centered ?? null],
    ["Distance", q?.sized ?? null],
    ["Angle", q?.angled ?? null],
    ["Eyes", q?.eyesOpen ?? null],
    ["Light", q?.lit ?? null],
    ["Still", q?.still ?? null],
  ];

  return (
    <div className="relative mx-auto h-dvh w-full max-w-phone overflow-hidden bg-black text-ivory">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" />

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,.55)_100%)]" />

      {/* top */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="rounded-chip bg-black/40 px-3 py-1.5 text-xs font-medium backdrop-blur">
          {status === "init" ? "Loading face model" : "Live 3D scan · on your phone"}
        </span>
        <span className="flex items-center gap-1.5 rounded-chip bg-black/40 px-3 py-1.5 text-xs backdrop-blur">
          <span className={`size-1.5 rounded-full ${ui.faceFound ? "bg-emerald-400" : "bg-ivory/40"}`} />
          {ui.faceFound ? "478 points locked" : "Looking for you"}
        </span>
      </div>

      {/* bottom */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {ui.mapping && (
          <span className="font-display text-xl text-ivory/90">{ui.mapping}…</span>
        )}
        <div className="relative w-full overflow-hidden rounded-chip bg-black/45 backdrop-blur">
          <div
            className="absolute inset-y-0 left-0 bg-accent/70 transition-[width] duration-100"
            style={{ width: `${ui.hold * 100}%` }}
          />
          <p className="relative px-4 py-3 text-center text-[15px] font-medium">{ui.prompt}</p>
        </div>
        <div className="flex w-full items-center justify-between gap-1">
          {gates.map(([label, ok]) => (
            <span key={label} className="flex items-center gap-1 text-[11px] text-ivory/80">
              <span className={`size-1.5 rounded-full ${ok === null ? "bg-ivory/30" : ok ? "bg-emerald-400" : "bg-amber-400"}`} />
              {label}
            </span>
          ))}
        </div>
        <div className="flex w-full items-center justify-between pt-1">
          <button
            type="button"
            className="text-sm text-ivory/80 underline-offset-4 hover:underline"
            onClick={() => fileRef.current?.click()}
          >
            Upload a photo instead
          </button>
          <button
            type="button"
            aria-label="Take photo now"
            disabled={!ui.faceFound}
            onClick={() => {
              onEvent?.("photo_captured", { auto: false });
              doCapture();
            }}
            className="grid size-16 place-items-center rounded-full border-4 border-ivory/80 disabled:opacity-30"
          >
            <span className="size-12 rounded-full bg-ivory" />
          </button>
          <span className="w-[120px]" />
        </div>
        {uploadError && <p className="text-center text-sm text-amber-300">{uploadError}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

/* ---------- drawing ---------- */

function draw(
  cv: HTMLCanvasElement,
  v: HTMLVideoElement,
  s: { landmarks: Landmark[] | null; lockedAt: number | null; lit: Set<number> },
  now: number,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = cv.clientWidth, ch = cv.clientHeight;
  if (cv.width !== cw * dpr || cv.height !== ch * dpr) {
    cv.width = cw * dpr;
    cv.height = ch * dpr;
  }
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  const lm = s.landmarks;
  if (!lm) return;

  // object-fit: cover mapping
  const va = v.videoWidth / v.videoHeight, ea = cw / ch;
  let sx: number, sy: number, ox = 0, oy = 0;
  if (va > ea) {
    sy = ch / v.videoHeight;
    sx = sy;
    ox = (cw - v.videoWidth * sx) / 2;
  } else {
    sx = cw / v.videoWidth;
    sy = sx;
    oy = (ch - v.videoHeight * sy) / 2;
  }
  const X = (p: { x: number }) => ox + p.x * v.videoWidth * sx;
  const Y = (p: { y: number }) => oy + p.y * v.videoHeight * sy;

  // mesh
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = "rgba(200, 240, 222, 0.28)";
  ctx.beginPath();
  for (const c of tesselation()) {
    const a = lm[c.start], b = lm[c.end];
    ctx.moveTo(X(a), Y(a));
    ctx.lineTo(X(b), Y(b));
  }
  ctx.stroke();

  // zone mapping
  const stage = s.lockedAt ? Math.floor((now - s.lockedAt) / STAGE_MS) : -1;
  let active: ZoneGeometry[] = [];
  if (stage >= 0 && stage < MAPPING_SEQUENCE.length) {
    active = MAPPING_SEQUENCE[stage].zones.map((z) => zoneGeometry(z, lm));
    for (let i = 0; i < lm.length; i++) {
      if (!s.lit.has(i) && active.some((g) => pointInGeometry(lm[i], g))) s.lit.add(i);
    }
  }
  const mapped = stage >= MAPPING_SEQUENCE.length;

  // sweep band
  const b = bbox(lm);
  const top = Y({ y: b.minY }) - 10, bottom = Y({ y: b.maxY }) + 10;
  const t = (now % 2400) / 2400;
  const sweepY = top + (bottom - top) * t;
  const grad = ctx.createLinearGradient(0, sweepY - 26, 0, sweepY + 26);
  grad.addColorStop(0, "rgba(124, 224, 184, 0)");
  grad.addColorStop(0.5, "rgba(124, 224, 184, 0.45)");
  grad.addColorStop(1, "rgba(124, 224, 184, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(X({ x: b.minX }) - 24, sweepY - 26, (b.w * v.videoWidth * sx) + 48, 52);

  // points
  for (let i = 0; i < lm.length; i++) {
    const px = X(lm[i]), py = Y(lm[i]);
    const nearSweep = Math.max(0, 1 - Math.abs(py - sweepY) / 30);
    const lit = s.lit.has(i) || mapped;
    const alpha = 0.25 + (lit ? 0.45 : 0) + nearSweep * 0.5;
    ctx.fillStyle = lit ? `rgba(160, 240, 205, ${alpha})` : `rgba(220, 245, 235, ${alpha})`;
    const r = lit ? 1.3 : 0.9;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }

  // glowing points of the active zone
  if (active.length) {
    ctx.save();
    ctx.shadowColor = "rgba(124, 224, 184, 0.9)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "rgba(190, 255, 225, 0.95)";
    for (let i = 0; i < lm.length; i++) {
      if (!s.lit.has(i)) continue;
      if (!active.some((g) => pointInGeometry(lm[i], g))) continue;
      ctx.beginPath();
      ctx.arc(X(lm[i]), Y(lm[i]), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // frame corners when mapped
  if (mapped) {
    ctx.strokeStyle = "rgba(124, 224, 184, 0.9)";
    ctx.lineWidth = 2;
    const x0 = X({ x: b.minX }) - 16, x1 = X({ x: b.maxX }) + 16, y0 = top - 6, y1 = bottom + 6, L = 18;
    const corner = (x: number, y: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * L, y);
      ctx.stroke();
    };
    corner(x0, y0, 1, 1);
    corner(x1, y0, -1, 1);
    corner(x0, y1, 1, -1);
    corner(x1, y1, -1, -1);
  }
}

/* ---------- small pieces ---------- */

function Fallback({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-phone flex-col gap-4 px-5 pt-16">
      <h2 className="font-display text-3xl">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-ink-muted">{children}</div>
    </div>
  );
}

function UploadLink({ fileRef }: { fileRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <Button variant="ghost" onClick={() => fileRef.current?.click()}>
      Upload a selfie instead
    </Button>
  );
}
