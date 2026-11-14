"use client";

import * as React from "react";

/** Minimal typing for the browser BarcodeDetector API (not in TS's DOM lib yet). */
type Detected = { rawValue: string };
type Detector = { detect: (src: HTMLVideoElement) => Promise<Detected[]> };
type DetectorCtor = {
  new (opts?: { formats?: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

function detectorCtor(): DetectorCtor | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector ?? null) as DetectorCtor | null;
}

/**
 * Camera QR reader. Uses the built-in BarcodeDetector where the browser has it
 * (Chrome, Edge, Android). Elsewhere it says so and the desk types the code instead.
 * Nothing is recorded or uploaded; frames are read in the browser and dropped.
 */
export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [status, setStatus] = React.useState<"starting" | "scanning" | "unsupported" | "denied" | "error">("starting");
  const doneRef = React.useRef(false);
  const onResultRef = React.useRef(onResult);
  React.useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    (async () => {
      const Ctor = detectorCtor();
      if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
        await Promise.resolve();
        if (!cancelled) setStatus("unsupported");
        return;
      }
      try {
        if (Ctor.getSupportedFormats) {
          const formats = await Ctor.getSupportedFormats();
          if (!formats.includes("qr_code")) {
            if (!cancelled) setStatus("unsupported");
            return;
          }
        }
        const detector = new Ctor({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("scanning");
        const tick = async () => {
          if (cancelled || doneRef.current) return;
          try {
            if (video.readyState >= 2) {
              const found = await detector.detect(video);
              const hit = found.find((f) => f.rawValue);
              if (hit && !doneRef.current) {
                doneRef.current = true;
                onResultRef.current(hit.rawValue);
                return;
              }
            }
          } catch {
            /* a bad frame; keep going */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        if (cancelled) return;
        setStatus(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "error");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const message = {
    starting: "Starting the camera…",
    scanning: "Hold the patient's check-in QR inside the frame.",
    unsupported: "This browser can't read QR codes from the camera. Ask for the 6-digit code under their QR and type it in the search box.",
    denied: "Camera access was blocked. Allow the camera for this site, or type the 6-digit code instead.",
    error: "The camera didn't start. Type the 6-digit code under their QR instead.",
  }[status];

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
      {status === "starting" || status === "scanning" ? (
        <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-field bg-ink">
          <video ref={videoRef} muted playsInline className="size-full object-cover" />
          <span aria-hidden="true" className="absolute inset-[18%] rounded-[18px] border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
        </div>
      ) : null}
      <p className="mt-3 text-center text-[13px] text-ink-muted" role="status">
        {message}
      </p>
      <div className="mt-3 flex justify-center">
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-chip border border-line-strong px-4 text-[13px] font-medium hover:border-ink">
          Close camera
        </button>
      </div>
    </div>
  );
}
