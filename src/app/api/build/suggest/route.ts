import { createLimiter } from "@/lib/admin/token";
import { suggestSpas } from "@/lib/funnel/suggest";

export const maxDuration = 20;

/** 120 lookups per 5 minutes per IP, per server instance (each one costs a model call). Venue wifi puts a whole room of judges behind one IP. */
const limiter = createLimiter(120, 5 * 60 * 1000);

/** GET ?q=medspa slo → { suggestions: SpaSuggestion[] }. Only spas whose website we just checked. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json({ suggestions: [] });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!limiter.allow(ip)) return Response.json({ suggestions: [], error: "Slow down a little and try again." }, { status: 429 });
  try {
    const suggestions = await suggestSpas(q);
    return Response.json({ suggestions }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
