/*
  Records the /roi calculator as a 1920x1080, 30 fps video, frame by frame.

  The page's clock (performance.now, Date.now, requestAnimationFrame) is replaced
  before any page script runs, and the recorder advances it exactly 1/30 s per
  frame, so the counter, the cash pallet and the camera sway come out smooth
  however slow the machine renders. A drawn cursor drags the two sliders and
  picks "In 6 months". Frames go to out/frames, then ffmpeg makes out/roi-calculator.mp4.

  Usage (dev server running on :3000; playwright-core installed anywhere):
    PW_DIR=<folder with node_modules/playwright-core> FFMPEG=<ffmpeg.exe> node video/roi-calculator/record.cjs [url]
*/
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const pwPath = require.resolve("playwright-core", { paths: [process.env.PW_DIR || process.cwd()] });
const { chromium } = require(pwPath);

const URL = process.argv[2] || "http://localhost:3000/roi";
const OUT = path.join(__dirname, "out");
const FRAMES = path.join(OUT, "frames");
const FPS = 30;
const W = 1536;
const H = 864;
const DSF = 1920 / W; // screenshots come out 1920x1080

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;

// Storyboard, in seconds.
const START = { price: 300, returns: 2 };
const END = { price: 750, returns: 10 };
const T = {
  scroll: [1.4, 2.9],
  toPrice: [3.2, 3.9],
  dragPrice: [4.0, 7.0],
  toReturns: [7.2, 7.9],
  dragReturns: [8.0, 11.2],
  toChip: [12.6, 13.4],
  click: 13.45,
  end: 18,
};

const initClock = () => {
  let now = 0;
  const epoch = Date.now();
  let queue = [];
  let id = 0;
  performance.now = () => now;
  Date.now = () => epoch + now;
  window.requestAnimationFrame = (cb) => {
    queue.push([++id, cb]);
    return id;
  };
  window.cancelAnimationFrame = (i) => {
    queue = queue.filter((q) => q[0] !== i);
  };
  window.__cap = {
    advance(ms) {
      now += ms;
      const run = queue;
      queue = [];
      for (const [, cb] of run) cb(now);
    },
  };
};

const setup = () => {
  const style = document.createElement("style");
  style.textContent = `
    nextjs-portal { display: none !important; }
    main > footer { visibility: hidden; }
    html { scroll-behavior: auto !important; }
    #cap-cursor { position: fixed; left: 0; top: 0; z-index: 99999; pointer-events: none; width: 30px; height: 30px; transform-origin: 4px 3px; filter: drop-shadow(0 3px 6px rgba(0,0,0,.28)); }
    #cap-note { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 99998; pointer-events: none;
      padding: 7px 16px; border-radius: 999px; background: rgba(255,255,255,.92); border: 1px solid #ececef;
      font: 500 14px/1.2 var(--font-roboto-flex), system-ui, sans-serif; color: #6f7380; white-space: nowrap; }`;
  document.head.appendChild(style);
  const c = document.createElement("div");
  c.id = "cap-cursor";
  c.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2.5l14.5 9.2-6.4 1.4 3.6 7.1-2.9 1.4-3.6-7.1-4.9 4.4z" fill="#111318" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  c.style.opacity = "0";
  document.body.appendChild(c);
  const n = document.createElement("div");
  n.id = "cap-note";
  n.textContent = "Estimate from the numbers entered, not a promise or forecast · Origami by Atlas Engine";
  document.body.appendChild(n);

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  window.__set = (id, v) => {
    const el = document.getElementById(id);
    if (Number(el.value) === v) return;
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  // Viewport position of a slider thumb at a given value.
  window.__thumb = (id, v) => {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    const k = (v - Number(el.min)) / (Number(el.max) - Number(el.min));
    return { x: r.left + 12 + k * (r.width - 24), y: r.top + r.height / 2 };
  };
  window.__chip = (label) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === label);
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  window.__calcTop = () => document.querySelector('[aria-label="Your numbers"]').getBoundingClientRect().top + window.scrollY;
  window.__cursor = (x, y, pressed, visible) => {
    c.style.opacity = visible ? "1" : "0";
    c.style.transform = `translate(${x - 4}px, ${y - 3}px) scale(${pressed ? 0.86 : 1})`;
  };
};

(async () => {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  await page.addInitScript(initClock);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(setup);
  await page.evaluate(([p, r]) => {
    window.__set("roi-price", p);
    window.__set("roi-returns", r);
  }, [START.price, START.returns]);
  // let the counter and the pallet settle on the starting numbers
  for (let i = 0; i < 120; i++) await page.evaluate(() => window.__cap.advance(1000 / 30));

  const scrollTo = await page.evaluate(() => Math.max(0, window.__calcTop() - 28));
  const total = Math.round(T.end * FPS);
  let cursor = { x: W * 0.62, y: H * 0.95 };

  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    const scrollY = lerp(0, scrollTo, ease(seg(t, ...T.scroll)));
    const kp = ease(seg(t, ...T.dragPrice));
    const kr = ease(seg(t, ...T.dragReturns));
    const price = Math.round(lerp(START.price, END.price, kp) / 25) * 25;
    const returns = Math.round(lerp(START.returns, END.returns, kr));

    await page.evaluate(
      ({ scrollY, price, returns }) => {
        window.scrollTo(0, scrollY);
        window.__set("roi-price", price);
        window.__set("roi-returns", returns);
      },
      { scrollY, price, returns },
    );

    // cursor path (positions read after the scroll so they track the page)
    const pos = await page.evaluate(
      ({ price, returns, sp, sr }) => ({
        p0: window.__thumb("roi-price", sp),
        p: window.__thumb("roi-price", price),
        r0: window.__thumb("roi-returns", sr),
        r: window.__thumb("roi-returns", returns),
        chip: window.__chip("In 6 months"),
      }),
      { price, returns, sp: START.price, sr: START.returns },
    );
    let pressed = false;
    let visible = t >= T.toPrice[0];
    if (t < T.toPrice[1]) {
      const k = ease(seg(t, ...T.toPrice));
      cursor = { x: lerp(W * 0.62, pos.p0.x, k), y: lerp(H * 0.95, pos.p0.y, k) };
    } else if (t < T.dragPrice[1] + 0.1) {
      cursor = pos.p;
      pressed = t >= T.dragPrice[0] - 0.05;
    } else if (t < T.toReturns[1]) {
      const k = ease(seg(t, ...T.toReturns));
      const p = window_lerp(pos.p, pos.r0, k);
      cursor = p;
    } else if (t < T.dragReturns[1] + 0.1) {
      cursor = pos.r;
      pressed = t >= T.dragReturns[0] - 0.05;
    } else if (t < T.toChip[0]) {
      cursor = pos.r;
    } else {
      const k = ease(seg(t, ...T.toChip));
      cursor = window_lerp(pos.r, pos.chip, k);
      pressed = t >= T.click - 0.08 && t < T.click + 0.14;
    }
    if (Math.abs(t - T.click) < 0.5 / FPS) {
      await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "In 6 months").click());
    }
    await page.evaluate(({ x, y, pressed, visible }) => window.__cursor(x, y, pressed, visible), { ...cursor, pressed, visible });
    await page.evaluate(() => window.__cap.advance(1000 / 30));
    await page.screenshot({ path: path.join(FRAMES, `${String(f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 94 });
    if (f % 60 === 0) console.log(`frame ${f}/${total}`);
  }
  await browser.close();

  const ffmpeg = process.env.FFMPEG || "ffmpeg";
  const mp4 = path.join(OUT, "roi-calculator.mp4");
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(FRAMES, "%05d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "inherit" });
  console.log("wrote", mp4);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

function window_lerp(a, b, k) {
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
}
