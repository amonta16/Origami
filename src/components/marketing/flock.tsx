"use client";

import * as React from "react";

/**
 * A flock of folded-paper birds drifting behind the landing hero. Written for Facet: a small
 * 2D boids simulation (separation, alignment, cohesion) drawn on one canvas. Each bird is three
 * paper triangles (body + two wings) whose wings flap with light and dark faces, and depth
 * scales size and opacity. Birds swerve away from the pointer. No libraries.
 * Pauses when off screen or hidden; under prefers-reduced-motion it draws one still frame.
 */

type Bird = { x: number; y: number; z: number; vx: number; vy: number; phase: number; flap: number; hue: number };

const PALETTE = [
  // [wing light, wing dark, body]
  ["#f9c6d8", "#ee8fb3", "#e5739f"],
  ["#f6b3cc", "#e6779f", "#d95f8c"],
  ["#fbd3e1", "#f1a1c0", "#e88cb0"],
  ["#f2a3c2", "#dd6a95", "#cc4f7f"],
];

export function FlockBackground({ className }: { className?: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let birds: Bird[] = [];
    const pointer = { x: -9999, y: -9999 };
    let raf = 0;
    let visible = true;
    let last = performance.now();

    const spawn = (n: number): Bird[] =>
      Array.from({ length: n }, () => {
        const a = Math.random() * Math.PI * 2;
        const z = 0.35 + Math.random() * 0.65;
        return { x: Math.random() * w, y: Math.random() * h, z, vx: Math.cos(a) * 40, vy: Math.sin(a) * 20, phase: Math.random() * 6.28, flap: 7 + Math.random() * 5, hue: Math.floor(Math.random() * PALETTE.length) };
      });

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(150, Math.max(36, (w * h) / 11000)));
      if (birds.length < target) birds = birds.concat(spawn(target - birds.length));
      else birds.length = target;
    };

    const step = (dt: number) => {
      const R = 70; // neighbor radius
      for (const b of birds) {
        let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, n = 0;
        for (const o of birds) {
          if (o === b) continue;
          const dx = o.x - b.x, dy = o.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > R * R || Math.abs(o.z - b.z) > 0.35) continue;
          n++;
          ax += o.vx; ay += o.vy;
          cx += o.x; cy += o.y;
          if (d2 < 22 * 22) {
            const d = Math.sqrt(d2) || 1;
            sx -= dx / d; sy -= dy / d;
          }
        }
        let fx = 0, fy = 0;
        if (n) {
          fx += (ax / n - b.vx) * 0.7 + (cx / n - b.x) * 0.1 + sx * 80;
          fy += (ay / n - b.vy) * 0.7 + (cy / n - b.y) * 0.1 + sy * 80;
        }
        // drift right and slightly up, like a flock crossing the sky
        fx += (55 - b.vx) * 0.25;
        fy += (-8 - b.vy) * 0.08 + Math.sin(b.phase * 0.13 + b.x * 0.004) * 12;
        // swerve away from the pointer
        const px = b.x - pointer.x, py = b.y - pointer.y;
        const p2 = px * px + py * py;
        if (p2 < 140 * 140) {
          const d = Math.sqrt(p2) || 1;
          const k = (1 - d / 140) * 900;
          fx += (px / d) * k;
          fy += (py / d) * k;
        }
        b.vx += fx * dt;
        b.vy += fy * dt;
        const sp = Math.hypot(b.vx, b.vy);
        const max = 70 + b.z * 60, min = 25;
        if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
        else if (sp < min) { b.vx *= min / (sp || 1); b.vy *= min / (sp || 1); }
        b.x += b.vx * dt * (0.5 + b.z * 0.7);
        b.y += b.vy * dt * (0.5 + b.z * 0.7);
        b.phase += dt * b.flap;
        const m = 30;
        if (b.x > w + m) b.x = -m;
        if (b.x < -m) b.x = w + m;
        if (b.y > h + m) b.y = -m;
        if (b.y < -m) b.y = h + m;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // far birds first so near ones overlap them
      const order = [...birds].sort((a, b) => a.z - b.z);
      for (const b of order) {
        const s = 5 + b.z * 11; // size
        const ang = Math.atan2(b.vy, b.vx);
        const flap = Math.sin(b.phase); // -1 … 1
        const [light, dark, body] = PALETTE[b.hue];
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.globalAlpha = 0.28 + b.z * 0.55;
        // body: a long folded dart, nose forward
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(s * 1.3, 0);
        ctx.lineTo(-s * 1.0, -s * 0.38);
        ctx.lineTo(-s * 0.55, 0);
        ctx.lineTo(-s * 1.0, s * 0.38);
        ctx.closePath();
        ctx.fill();
        // wings: broad paper triangles whose tips swing across the body as they flap;
        // the face turns light or dark depending on which side faces us
        const span = s * 1.5 * flap;
        ctx.fillStyle = flap > 0 ? light : dark;
        ctx.beginPath();
        ctx.moveTo(s * 0.95, 0);
        ctx.lineTo(-s * 0.55, -span);
        ctx.lineTo(-s * 0.8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = flap > 0 ? dark : light;
        ctx.globalAlpha *= 0.85;
        ctx.beginPath();
        ctx.moveTo(s * 0.8, 0);
        ctx.lineTo(-s * 0.3, span * 0.75);
        ctx.lineTo(-s * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (visible) {
        step(dt);
        draw();
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (still) {
      for (let i = 0; i < 40; i++) step(0.03);
      draw();
    } else {
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (still) draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      last = performance.now();
    });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className ?? "pointer-events-none absolute inset-0 h-full w-full"} />;
}
