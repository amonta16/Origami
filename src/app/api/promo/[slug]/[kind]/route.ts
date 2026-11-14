import { getClinicBySlug } from "@/lib/data/clinics";
import { scanCardSvg, webBannerSvg } from "@/lib/promo/svg";

/**
 * GET /api/promo/{slug}/banner     → 1200 × 400 animated website banner (SVG)
 * GET /api/promo/{slug}/scan-card  → 5 × 7 in counter card with a QR to the scan (SVG)
 * Add ?download=1 to save it as a file. Built only from the clinic's name and color.
 */
export async function GET(req: Request, { params }: RouteContext<"/api/promo/[slug]/[kind]">) {
  const { slug, kind } = await params;
  if (kind !== "banner" && kind !== "scan-card") return new Response("Not found", { status: 404 });
  const clinic = await getClinicBySlug(slug);
  if (!clinic) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const scanUrl = `${url.origin}/s/${clinic.slug}/scan`;
  const svg = kind === "banner" ? webBannerSvg(clinic) : await scanCardSvg(clinic, scanUrl);
  const headers: Record<string, string> = {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "public, max-age=300",
    // the file is our own markup with escaped text; still forbid scripts if opened directly
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
    "x-content-type-options": "nosniff",
  };
  if (url.searchParams.get("download")) headers["content-disposition"] = `attachment; filename="${clinic.slug}-${kind}.svg"`;
  return new Response(svg, { headers });
}
