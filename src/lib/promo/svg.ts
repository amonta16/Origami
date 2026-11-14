import "server-only";
import QRCode from "qrcode";

/**
 * Print and web files made from a clinic's own name, color and scan link. SVG so they stay sharp
 * at any size. Fonts are system fonts and there are no external images, because an SVG used as
 * an <img> (the website banner) can't load anything from outside itself.
 */

export type PromoClinic = { name: string; brand_color: string | null };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function palette(hex: string | null) {
  const brand = /^#[0-9a-f]{6}$/i.test(hex ?? "") ? hex!.toLowerCase() : "#2f3a45";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(brand.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const light = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.42;
  const deep = `#${[r, g, b].map((c) => Math.round(c * 255 * 0.62).toString(16).padStart(2, "0")).join("")}`;
  return { brand, deep, ink: light ? "#111318" : "#ffffff", inkSoft: light ? "rgba(17,19,24,.7)" : "rgba(255,255,255,.78)" };
}

function shortName(name: string) {
  const s = name.split(/\s+[|\-–—·]\s+/)[0].trim();
  return s.length > 34 ? `${s.slice(0, 33)}…` : s;
}

/** A dotted face oval (generic, not a real face) with an animated scan line. */
function faceDots(cx: number, cy: number, rx: number, ry: number, color: string, animated: boolean) {
  const dots: string[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const x = cx + rx * Math.cos(a) * (Math.sin(a) > 0 ? 0.92 : 1); // narrower chin
    const y = cy + ry * Math.sin(a);
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 3 ? 2.6 : 3.6}" fill="${color}" opacity="${i % 3 ? 0.6 : 0.95}"/>`);
  }
  // brows, eyes, lips
  const feat = [
    [-0.42, -0.22], [-0.3, -0.27], [-0.18, -0.24], [0.18, -0.24], [0.3, -0.27], [0.42, -0.22],
    [-0.3, -0.08], [0.3, -0.08], [0, 0.12], [-0.22, 0.42], [-0.1, 0.38], [0, 0.4], [0.1, 0.38], [0.22, 0.42], [-0.1, 0.48], [0.1, 0.48],
  ].map(([dx, dy]) => `<circle cx="${(cx + dx * rx).toFixed(1)}" cy="${(cy + dy * ry).toFixed(1)}" r="2.8" fill="${color}" opacity=".85"/>`);
  const scan = animated
    ? `<rect x="${cx - rx - 20}" y="${cy - ry}" width="${rx * 2 + 40}" height="${ry * 0.22}" fill="url(#scan)"><animate attributeName="y" values="${cy - ry - 20};${cy + ry - 10};${cy - ry - 20}" dur="3.2s" repeatCount="indefinite"/></rect>`
    : "";
  return `<path d="M${cx - rx} ${cy} A${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A${rx} ${ry} 0 1 1 ${cx - rx} ${cy}Z" fill="none" stroke="${color}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="6 8"/>${dots.join("")}${feat.join("")}${scan}`;
}

async function qrSvg(url: string, x: number, y: number, size: number) {
  const raw = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111318", light: "#ffffff" } });
  return raw.replace(/<\?xml[^>]*>/, "").replace(/<svg\b([^>]*)>/, (_, attrs: string) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} x="${x}" y="${y}" width="${size}" height="${size}">`);
}

/** 1200 × 400 website banner that links to the scan. Animated scan line (plays inside an <img>). */
export function webBannerSvg(c: PromoClinic) {
  const p = palette(c.brand_color);
  const name = esc(shortName(c.name));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400" role="img" aria-label="Free AI skin analysis at ${name}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.brand}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient>
  <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.ink}" stop-opacity="0"/><stop offset=".5" stop-color="${p.ink}" stop-opacity=".28"/><stop offset="1" stop-color="${p.ink}" stop-opacity="0"/></linearGradient>
</defs>
<rect width="1200" height="400" rx="28" fill="url(#bg)"/>
<circle cx="1010" cy="200" r="230" fill="${p.ink}" opacity=".06"/>
${faceDots(1010, 200, 118, 150, p.ink, true)}
<text x="72" y="96" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="3.5" fill="${p.inkSoft}">FREE AI SKIN ANALYSIS</text>
<text x="72" y="168" font-family="${FONT}" font-size="58" font-weight="700" letter-spacing="-1.2" fill="${p.ink}">See what your skin needs</text>
<text x="72" y="236" font-family="${FONT}" font-size="58" font-weight="700" letter-spacing="-1.2" fill="${p.ink}">in 60 seconds.</text>
<text x="72" y="284" font-family="${FONT}" font-size="24" fill="${p.inkSoft}">One selfie with ${name}. Free, private, nothing to download.</text>
<rect x="72" y="310" width="300" height="58" rx="29" fill="${p.ink}"/>
<text x="222" y="347" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="${p.ink === "#ffffff" ? p.deep : "#ffffff"}">Start my free scan →</text>
</svg>`;
}

/** 5 × 7 in counter card (1000 × 1400) with a QR code to the scan. Static, for print. */
export async function scanCardSvg(c: PromoClinic, scanUrl: string) {
  const p = palette(c.brand_color);
  const name = esc(shortName(c.name).toUpperCase());
  const qr = await qrSvg(scanUrl, 290, 600, 420);
  const steps = [
    ["1", "Open your", "phone camera"],
    ["2", "Take one", "selfie"],
    ["3", "See your", "results"],
  ]
    .map(([n, a, b], i) => {
      const x = 210 + i * 290;
      return `<circle cx="${x}" cy="1150" r="28" fill="${p.brand}"/><text x="${x}" y="1160" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="700" fill="${p.ink === "#ffffff" ? "#ffffff" : "#111318"}">${n}</text><text x="${x}" y="1218" text-anchor="middle" font-family="${FONT}" font-size="26" fill="#3a3d45">${a}</text><text x="${x}" y="1250" text-anchor="middle" font-family="${FONT}" font-size="26" fill="#3a3d45">${b}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400" width="1000" height="1400" role="img" aria-label="Scan for a free AI skin analysis at ${esc(shortName(c.name))}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.brand}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient><linearGradient id="scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.ink}" stop-opacity="0"/><stop offset="1" stop-color="${p.ink}" stop-opacity="0"/></linearGradient></defs>
<rect width="1000" height="1400" fill="#ffffff"/>
<rect width="1000" height="520" fill="url(#bg)"/>
${faceDots(820, 250, 90, 116, p.ink, false)}
<text x="80" y="120" font-family="${FONT}" font-size="26" font-weight="700" letter-spacing="4" fill="${p.inkSoft}">${name}</text>
<text x="80" y="236" font-family="${FONT}" font-size="66" font-weight="700" letter-spacing="-1.5" fill="${p.ink}">Curious what</text>
<text x="80" y="314" font-family="${FONT}" font-size="66" font-weight="700" letter-spacing="-1.5" fill="${p.ink}">your skin needs?</text>
<text x="80" y="400" font-family="${FONT}" font-size="32" fill="${p.inkSoft}">Scan for a free AI skin analysis.</text>
<rect x="260" y="570" width="480" height="480" rx="36" fill="#ffffff" stroke="#e4e5e9" stroke-width="4"/>
${qr}
${steps}
<text x="500" y="1340" text-anchor="middle" font-family="${FONT}" font-size="20" fill="#7a7d86">Cosmetic estimate, not a medical diagnosis. 18+. Photos auto-delete after 72 hours.</text>
</svg>`;
}
