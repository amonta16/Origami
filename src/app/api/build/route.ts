import { buildPreview, type BuildEvent } from "@/lib/funnel/build";
import { ownerCookieValue } from "@/lib/owner/session";

export const maxDuration = 120;

/**
 * POST { query, website? } → NDJSON stream of BuildEvent lines.
 * The final "done" line carries an owner token the client exchanges at /api/build/claim
 * for the owner cookie (cookies can't be set once a stream has started).
 */
export async function POST(req: Request) {
  let body: { query?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const query = (body.query ?? "").trim().replace(/\s+/g, " ").slice(0, 140);
  const website = (body.website ?? "").trim().slice(0, 300) || null;
  if (query.length < 3 && !website) return Response.json({ error: "Type your med spa's name and city." }, { status: 400 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: BuildEvent | (BuildEvent & { ownerToken: string })) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        await buildPreview({ query: query || website!, website }, (e) => {
          if (e.type === "done") send({ ...e, ownerToken: ownerCookieValue(e.clinicId) });
          else send(e);
        });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Something went wrong." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
