"use client";

import * as React from "react";
import { tesselation } from "@/lib/face/landmarker";
import type { Landmark } from "@/lib/types";

/** Small rotating 3D wireframe of the captured mesh (three.js, loaded on demand). */
export function MeshViewer({ landmarks, aspect, size = 160, className }: { landmarks: Landmark[]; aspect: number; size?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let dispose = () => {};
    let alive = true;

    (async () => {
      const THREE = await import("three");
      if (!alive) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(size, size);
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0, 3.2);

      // normalized → centered, y up. z from MediaPipe is roughly in x-units.
      const xs = landmarks.map((p) => (p.x - 0.5) * aspect);
      const ys = landmarks.map((p) => -(p.y - 0.5));
      const zs = landmarks.map((p) => -p.z * aspect);
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      const cz = zs.reduce((a, b) => a + b, 0) / zs.length;
      const extent = Math.max(...ys) - Math.min(...ys) || 1;
      const s = 1.6 / extent;

      const pos: number[] = [];
      for (const c of tesselation()) {
        pos.push((xs[c.start] - cx) * s, (ys[c.start] - cy) * s, (zs[c.start] - cz) * s);
        pos.push((xs[c.end] - cx) * s, (ys[c.end] - cy) * s, (zs[c.end] - cz) * s);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x1f5e4b, transparent: true, opacity: 0.55 });
      const lines = new THREE.LineSegments(geo, mat);
      scene.add(lines);

      const ptsGeo = new THREE.BufferGeometry();
      ptsGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(landmarks.flatMap((_, i) => [(xs[i] - cx) * s, (ys[i] - cy) * s, (zs[i] - cz) * s]), 3),
      );
      const pts = new THREE.Points(ptsGeo, new THREE.PointsMaterial({ color: 0x1f5e4b, size: 0.018, transparent: true, opacity: 0.9 }));
      scene.add(pts);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let t = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!reduce) t += 0.008;
        lines.rotation.y = Math.sin(t) * 0.55;
        pts.rotation.y = lines.rotation.y;
        renderer.render(scene, camera);
      };
      tick();
      dispose = () => {
        cancelAnimationFrame(raf);
        geo.dispose();
        ptsGeo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      alive = false;
      dispose();
    };
  }, [landmarks, aspect, size]);

  return <div ref={ref} className={className} style={{ width: size, height: size }} aria-label="3D mesh of your face" role="img" />;
}
