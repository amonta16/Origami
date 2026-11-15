"use client";

import * as React from "react";
import * as THREE from "three";

/*
  A wooden pallet that fills with bundles of cash as the monthly figure grows.
  One bundle = $500. The last bundle grows in height for the remainder, so the
  stack rises smoothly while a slider is dragged. Beside the pallet sits a
  half-height bundle: Origami's $250 a month, at the same scale.
  Everything is drawn in code (canvas textures, boxes); no assets.
*/

const PER_BRICK = 500;
const COLS = 3;
const ROWS = 5;
const PER_LAYER = COLS * ROWS;
const MAX_BRICKS = PER_LAYER * 6;
const BW = 1.18; // bundle length (x)
const BD = 0.5; // bundle depth (z)
const BH = 0.34; // bundle height (y)
const GAP = 0.04;
const DECK_TOP = 0.43;

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const bricksSoFar = (v: number) => Math.min(MAX_BRICKS, Math.max(0, v) / PER_BRICK);

// Deterministic jitter so the stack looks hand-loaded but never flickers.
function rand(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function CashPallet({ monthly, fee, className }: { monthly: number; fee: number; className?: string }) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const stackLabelRef = React.useRef<HTMLDivElement>(null);
  const feeLabelRef = React.useRef<HTMLDivElement>(null);
  const target = React.useRef(monthly);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    target.current = monthly;
  }, [monthly]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    Object.assign(renderer.domElement.style, { display: "block", position: "absolute", inset: "0" });
    host.prepend(renderer.domElement);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    // Light
    scene.add(new THREE.HemisphereLight(0xffffff, 0xeadde5, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.3);
    sun.position.set(4.5, 9, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 });
    sun.shadow.bias = -0.0006;
    sun.shadow.radius = 5;
    scene.add(sun);

    const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(40, 40)), keep(new THREE.ShadowMaterial({ opacity: 0.13 })));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pallet
    const woodTex = keep(
      canvasTexture(256, 64, (g) => {
        g.fillStyle = "#d9b68c";
        g.fillRect(0, 0, 256, 64);
        for (let i = 0; i < 46; i++) {
          g.strokeStyle = `rgba(${120 + rand(i) * 40},${80 + rand(i + 9) * 30},${45},${0.12 + rand(i + 3) * 0.18})`;
          g.lineWidth = 0.6 + rand(i + 5) * 1.6;
          const y = rand(i + 1) * 64;
          g.beginPath();
          g.moveTo(0, y);
          g.bezierCurveTo(80, y + (rand(i + 2) - 0.5) * 8, 170, y + (rand(i + 4) - 0.5) * 8, 256, y + (rand(i + 6) - 0.5) * 4);
          g.stroke();
        }
      }),
    );
    const woodMats = [0xffffff, 0xf1e4d4, 0xe6d3bd].map((c) =>
      keep(new THREE.MeshStandardMaterial({ map: woodTex, color: c, roughness: 0.88, metalness: 0 })),
    );
    const pallet = new THREE.Group();
    const PX = COLS * (BW + GAP) + 0.2;
    const PZ = ROWS * (BD + GAP) + 0.2;
    const board = (sx: number, sy: number, sz: number, x: number, y: number, z: number, m: number) => {
      const mesh = new THREE.Mesh(keep(new THREE.BoxGeometry(sx, sy, sz)), woodMats[m % woodMats.length]);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pallet.add(mesh);
    };
    [-1, 0, 1].forEach((k, i) => board(PX, 0.06, 0.42, 0, 0.03, k * (PZ / 2 - 0.21), i));
    [-1, 0, 1].forEach((a, i) => [-1, 0, 1].forEach((b, j) => board(0.42, 0.24, 0.42, a * (PX / 2 - 0.21), 0.18, b * (PZ / 2 - 0.21), i + j)));
    [-1, 0, 1].forEach((a, i) => board(0.42, 0.06, PZ, a * (PX / 2 - 0.21), 0.33, 0, i + 1));
    const SLATS = 7;
    const slatW = (PZ - (SLATS - 1) * 0.07) / SLATS;
    for (let s = 0; s < SLATS; s++) board(PX, 0.07, slatW, 0, 0.395, -PZ / 2 + slatW / 2 + s * (slatW + 0.07), s);
    scene.add(pallet);

    // Cash bundles
    const billTex = keep(
      canvasTexture(512, 218, (g) => {
        g.fillStyle = "#d3e2c5";
        g.fillRect(0, 0, 512, 218);
        g.strokeStyle = "#5f8458";
        g.lineWidth = 7;
        g.strokeRect(12, 12, 488, 194);
        g.lineWidth = 1.5;
        g.strokeRect(24, 24, 464, 170);
        g.fillStyle = "rgba(95,132,88,0.16)";
        g.beginPath();
        g.ellipse(256, 109, 62, 72, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#4b6d46";
        g.font = "600 108px Georgia, serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("$", 256, 114);
        g.font = "600 34px Georgia, serif";
        g.fillText("100", 64, 52);
        g.fillText("100", 448, 52);
        g.fillText("100", 64, 168);
        g.fillText("100", 448, 168);
      }),
    );
    const edgeTex = keep(
      canvasTexture(64, 128, (g) => {
        for (let y = 0; y < 128; y += 2) {
          g.fillStyle = y % 4 === 0 ? "#eef3e8" : "#c9d8bd";
          g.fillRect(0, y, 64, 2);
        }
      }),
    );
    const billMat = keep(new THREE.MeshStandardMaterial({ map: billTex, roughness: 0.75 }));
    const edgeMat = keep(new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 }));
    const brickMats = [edgeMat, edgeMat, billMat, billMat, edgeMat, edgeMat];
    const brickGeo = keep(new THREE.BoxGeometry(BW, BH, BD));
    const bandGeo = keep(new THREE.BoxGeometry(0.2, BH + 0.012, BD + 0.012));
    const bandMat = keep(new THREE.MeshStandardMaterial({ color: 0xe6b94f, roughness: 0.55 }));
    const feeBandMat = keep(new THREE.MeshStandardMaterial({ color: 0xf272c0, roughness: 0.5 }));

    const makeBundle = (band: THREE.Material) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(brickGeo, brickMats);
      body.castShadow = true;
      body.receiveShadow = true;
      const strap = new THREE.Mesh(bandGeo, band);
      strap.castShadow = true;
      g.add(body, strap);
      return g;
    };

    const bricks = Array.from({ length: MAX_BRICKS }, (_, i) => {
      const g = makeBundle(bandMat);
      const layer = Math.floor(i / PER_LAYER);
      const k = i % PER_LAYER;
      const col = k % COLS;
      const row = Math.floor(k / COLS);
      const baseY = DECK_TOP + layer * (BH + 0.008);
      g.position.set((col - 1) * (BW + GAP) + (rand(i) - 0.5) * 0.04, baseY, (row - 2) * (BD + GAP) + (rand(i + 50) - 0.5) * 0.03);
      g.rotation.y = (rand(i + 99) - 0.5) * 0.05;
      g.visible = false;
      g.userData.baseY = baseY;
      scene.add(g);
      return g;
    });

    // Origami's fee, at the same scale, on the floor beside the pallet.
    const feeBundle = makeBundle(feeBandMat);
    const feeH = Math.max(0.02, Math.min(1, fee / PER_BRICK));
    feeBundle.scale.y = feeH;
    feeBundle.position.set(-0.6, (BH * feeH) / 2, PZ / 2 + 0.9);
    feeBundle.rotation.y = 0.25;
    scene.add(feeBundle);

    // Size + camera
    let w = 1;
    let h = 1;
    const resize = () => {
      w = Math.max(1, host.clientWidth);
      h = Math.max(1, host.clientHeight);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const v = new THREE.Vector3();
    const place = (el: HTMLDivElement | null, x: number, y: number, z: number) => {
      if (!el) return;
      v.set(x, y, z).project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      el.style.opacity = "1";
    };

    let value = target.current;
    let raf = 0;
    let last = performance.now();
    const t0 = last;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      value += (target.current - value) * (1 - Math.exp(-dt * 5));
      if (Math.abs(target.current - value) < 1) value = target.current;

      // bundles
      for (let i = 0; i < MAX_BRICKS; i++) {
        const f = Math.max(0, Math.min(1, (value - i * PER_BRICK) / PER_BRICK));
        const b = bricks[i];
        if (f <= 0.002) {
          b.visible = false;
          continue;
        }
        b.visible = true;
        b.scale.y = f;
        b.position.y = b.userData.baseY + (BH * f) / 2;
      }

      // camera: a slow sway around the pallet; pull back on narrow screens
      const t = (now - t0) / 1000;
      const sway = reduceMotion ? 0 : Math.sin(t * 0.32) * 0.32;
      const theta = 0.62 + sway;
      const narrow = Math.max(1, 1.2 / camera.aspect);
      const radius = 8.4 * Math.min(narrow, 1.7);
      camera.position.set(Math.sin(theta) * radius, 4.4 + Math.min(1.6, bricksSoFar(value) / PER_LAYER * 0.35), Math.cos(theta) * radius);
      camera.lookAt(0, 0.75, 0.45);

      // labels
      const bricksNow = Math.min(MAX_BRICKS, value / PER_BRICK);
      const layers = Math.max(1, Math.ceil(bricksNow / PER_LAYER - 1e-6));
      const topY = DECK_TOP + layers * (BH + 0.008) - (layers === 1 ? BH * (1 - Math.min(1, bricksNow)) : 0);
      place(stackLabelRef.current, 0, topY + 0.25, -0.2);
      place(feeLabelRef.current, feeBundle.position.x, BH * feeH + 0.2, feeBundle.position.z);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [fee]);

  return (
    <div ref={hostRef} className={`relative overflow-hidden ${className ?? ""}`}>
      {failed ? (
        <div className="grid h-full place-items-center px-6 text-center text-[13px] text-ink-muted">3D view isn&rsquo;t available in this browser. The numbers still update.</div>
      ) : (
        <>
          <div ref={stackLabelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white opacity-0 shadow-soft">
            Back in your book
          </div>
          <div ref={feeLabelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-line-strong bg-surface px-3 py-1 text-[12px] font-medium opacity-0 shadow-soft">
            Origami &middot; ${fee}
          </div>
        </>
      )}
    </div>
  );
}
