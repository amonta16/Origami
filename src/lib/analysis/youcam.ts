import "server-only";

import { CONCERN_BY_ID, severityFromScore } from "@/lib/concerns";
import { inferTreatmentTags } from "@/lib/treatments/tags";
import type { ConcernResult, Recommendation, Treatment, ZoneId } from "@/lib/types";

/**
 * Skin analysis through Perfect Corp's YouCam AI Skin Analysis API (v2.1), the same engine behind
 * their in-clinic scanners. Three calls, all server-side with the bearer key:
 *   1. POST /s2s/v2.0/file            -> a file_id and a pre-signed PUT url
 *   2. PUT  <pre-signed url>          -> the photo bytes
 *   3. POST /s2s/v2.1/task/skin-analysis, then GET .../{task_id} until task_status leaves "running"
 * Docs read Nov 15, 2026: docs.perfectcorp.com/reference/ai_skin_analysis. YouCam scores run
 * 1..100 with higher = healthier, so a concern's "how pronounced" score is 100 - ui_score.
 * SD features need a short side of at least 480 px; the scan sends the 1024 px photo.
 */

export const YOUCAM_MODEL_ID = "youcam-skin-v2";
const BASE = (process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com").replace(/\/$/, "");

export function youcamConfigured() {
  return Boolean(process.env.YOUCAM_API_KEY?.trim());
}

/**
 * YouCam SD feature -> our concern vocabulary, with the sentence shown for a clear / mild / clear-to-see
 * reading. Features we have no concern for (oiliness, eyelids, skin type) are not requested.
 */
const FEATURES: Array<{ action: string; concern: string; zone: ZoneId; say: [clear: string, mild: string, strong: string] }> = [
  { action: "wrinkle", concern: "fine_lines", zone: "full_face", say: ["Hardly any lines show.", "A few fine lines are starting to show.", "Fine lines are easy to see across the face."] },
  { action: "firmness", concern: "sagging", zone: "jawline", say: ["Skin looks firm along the jaw and cheeks.", "Skin is a touch less firm along the jaw.", "Skin looks noticeably less firm along the jaw and cheeks."] },
  { action: "acne", concern: "acne", zone: "full_face", say: ["No active breakouts.", "A few small blemishes.", "Several active breakouts are visible."] },
  { action: "moisture", concern: "hydration", zone: "full_face", say: ["Skin looks well hydrated.", "Skin reads a little dry.", "Skin reads dehydrated, with a tight, crinkled look."] },
  { action: "eye_bag", concern: "under_eye_puffiness", zone: "under_eye_left", say: ["Little puffiness under the eyes.", "Slight puffiness under the eyes.", "Puffiness is clear under the eyes."] },
  { action: "dark_circle_v2", concern: "dark_circles", zone: "under_eye_left", say: ["The under-eyes look bright.", "Some shadow under the eyes.", "Dark circles are clear under the eyes."] },
  { action: "tear_trough", concern: "under_eye_hollows", zone: "under_eye_left", say: ["Tear troughs look full.", "Slight hollowing in the tear trough.", "Hollowing in the tear trough is easy to see."] },
  { action: "age_spot", concern: "pigmentation", zone: "full_face", say: ["Few spots or patches.", "Some sun spots and small pigment patches.", "Sun spots and pigment patches stand out."] },
  { action: "radiance", concern: "dullness", zone: "full_face", say: ["Skin looks radiant.", "Skin could glow a little more.", "Skin looks dull rather than glowing."] },
  { action: "redness", concern: "redness", zone: "cheek_left", say: ["Little redness.", "Some redness on the cheeks or nose.", "Redness is clear on the cheeks or nose."] },
  { action: "pore", concern: "pores", zone: "nose", say: ["Pores look refined.", "Pores are a little visible around the nose.", "Enlarged pores are easy to see around the nose and cheeks."] },
  { action: "texture", concern: "texture", zone: "full_face", say: ["Texture looks smooth.", "Texture is slightly uneven.", "Surface texture reads rough and uneven."] },
];

/** Plain-language versions of YouCam's photo errors, shown on the retry screen. */
const PHOTO_ERRORS: Record<string, string> = {
  error_src_face_too_small: "Your face needs to fill most of the frame. Move the phone closer and try again.",
  error_src_face_out_of_bound: "Part of your face was outside the photo. Center your face and try again.",
  error_lighting_dark: "The photo is too dark for the scanner. Face a window or a lamp and try again.",
  error_below_min_image_size: "The photo is too small for the scanner. Try again with the camera, not a screenshot.",
  error_exceed_max_image_size: "The photo is too large for the scanner. Try again with the camera.",
};

export type YoucamOverlay = { id: string; url: string };

export type YoucamAnalysis = {
  overall_score: number;
  potential_score: number;
  skin_age: number | null;
  insight: string;
  concerns: ConcernResult[];
  recommendations: Recommendation[];
  medical_flag: null;
  /** YouCam's per-concern mask images, aligned to the photo that was sent. Signed URLs, short-lived. */
  overlays: YoucamOverlay[];
  /** raw feature scores for the tester log */
  raw: Array<{ type: string; ui_score: number; raw_score: number }>;
  task_id: string;
};

type UploadInit = {
  status?: number;
  error?: string;
  error_code?: string;
  data?: { files?: Array<{ file_id: string; requests?: Array<{ method?: string; url: string; headers?: Record<string, string> }> }> };
};
type TaskCreate = { status?: number; error?: string; error_code?: string; data?: { task_id?: string } };
type TaskPoll = {
  status?: number;
  error?: string;
  error_code?: string;
  data?: {
    task_status?: string;
    error?: string;
    error_message?: string;
    results?: {
      output?: Array<{ type: string; ui_score?: number; raw_score?: number; mask_urls?: string[] | Record<string, string> | string }>;
      skin_age?: number;
      all?: { score?: number } | number;
    };
  };
};

class YoucamError extends Error {
  constructor(message: string, readonly code?: string, readonly retryable = false) {
    super(message);
  }
}

function headers(json = true): Record<string, string> {
  const key = process.env.YOUCAM_API_KEY?.trim();
  if (!key) throw new YoucamError("YOUCAM_API_KEY is not set");
  return { authorization: `Bearer ${key}`, ...(json ? { "content-type": "application/json" } : {}) };
}

function splitDataUrl(d: string) {
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(d);
  if (!m) throw new YoucamError("Expected a base64 image data URL");
  return { mime: m[1], bytes: Buffer.from(m[2], "base64") };
}

function apiError(json: { error?: string; error_code?: string }, status: number, step: string) {
  if (status === 401) return new YoucamError("YouCam rejected the API key on the server.", "Unauthorized");
  if (status === 429) return new YoucamError("YouCam is rate-limiting us right now. Try again in a moment.", "TooManyRequests", true);
  if (json.error_code === "CreditInsufficiency") return new YoucamError("The YouCam account is out of analysis credits.", json.error_code);
  return new YoucamError(`YouCam ${step} failed: ${json.error || `HTTP ${status}`}`, json.error_code, status >= 500);
}

async function uploadPhoto(photo: string, signal: AbortSignal) {
  const { mime, bytes } = splitDataUrl(photo);
  const init = await fetch(`${BASE}/s2s/v2.0/file`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ files: [{ content_type: mime, file_name: `scan.${mime.endsWith("png") ? "png" : "jpg"}`, file_size: bytes.length }] }),
    signal,
  });
  const json = (await init.json().catch(() => ({}))) as UploadInit;
  if (!init.ok) throw apiError(json, init.status, "upload");
  const file = json.data?.files?.[0];
  const req = file?.requests?.[0];
  if (!file?.file_id || !req?.url) throw new YoucamError("YouCam upload returned no upload URL.");

  // The URL is signed over content-length, content-type and host only. Send exactly those: an
  // extra or duplicated header makes S3 answer 403. fetch sets Content-Length from the body itself.
  const signed = Object.fromEntries(Object.entries(req.headers ?? {}).filter(([k]) => k.toLowerCase() !== "content-length"));
  if (!Object.keys(signed).some((k) => k.toLowerCase() === "content-type")) signed["Content-Type"] = mime;
  const put = await fetch(req.url, {
    method: req.method || "PUT",
    headers: signed,
    body: new Uint8Array(bytes),
    signal,
  });
  if (!put.ok) throw new YoucamError(`YouCam photo upload failed (HTTP ${put.status}).`, undefined, put.status >= 500);
  return file.file_id;
}

async function startTask(fileId: string, signal: AbortSignal) {
  const res = await fetch(`${BASE}/s2s/v2.1/task/skin-analysis`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      src_file_id: fileId,
      dst_actions: FEATURES.map((f) => f.action),
      miniserver_args: { enable_mask_overlay: true },
      format: "json",
    }),
    signal,
  });
  const json = (await res.json().catch(() => ({}))) as TaskCreate;
  if (!res.ok) throw apiError(json, res.status, "task");
  const id = json.data?.task_id;
  if (!id) throw new YoucamError("YouCam did not return a task id.");
  return id;
}

async function pollTask(taskId: string, signal: AbortSignal, budgetMs: number) {
  const started = Date.now();
  let delay = 1200;
  for (;;) {
    const res = await fetch(`${BASE}/s2s/v2.1/task/skin-analysis/${encodeURIComponent(taskId)}`, { headers: headers(false), signal, cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as TaskPoll;
    if (!res.ok) throw apiError(json, res.status, "status");
    const st = (json.data?.task_status || "").toLowerCase();
    if (st === "success") return json.data!;
    if (st === "error" || st === "failed") {
      const code = json.data?.error || json.error_code;
      const friendly = code ? PHOTO_ERRORS[code] : undefined;
      throw new YoucamError(friendly || `YouCam could not analyze this photo${json.data?.error_message ? `: ${json.data.error_message}` : "."}`, code);
    }
    if (Date.now() - started > budgetMs) throw new YoucamError("YouCam took too long to answer. Please try again.", "Timeout", true);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 4000);
  }
}

function firstUrl(m: string[] | Record<string, string> | string | undefined) {
  if (!m) return null;
  if (typeof m === "string") return m;
  if (Array.isArray(m)) return m[0] ?? null;
  const v = Object.values(m);
  return v[0] ?? null;
}

/**
 * Pick 1–3 menu items whose concerns overlap her worst findings, worst first. Menus built from a
 * clinic's website carry no hand-tagged concerns, so those are inferred from the treatment's name
 * and description. If nothing overlaps, offer the clinic's most popular item as a starting point,
 * labeled as such.
 */
function recommend(concerns: ConcernResult[], treatments: Treatment[]): Recommendation[] {
  const tagged = treatments.map((t) => ({ t, concerns: t.concerns?.length ? t.concerns : inferTreatmentTags(t.name, t.description, t.category).concerns }));
  const out: Recommendation[] = [];
  const used = new Set<string>();
  for (const c of concerns) {
    if (c.score < 25 || out.length >= 3) break;
    const hit = tagged.find((x) => !used.has(x.t.id) && x.concerns.includes(c.id));
    if (!hit) continue;
    used.add(hit.t.id);
    const label = CONCERN_BY_ID[c.id]?.label.toLowerCase() ?? c.id;
    out.push({ treatment_id: hit.t.id, why: `Matched to your ${label}, which the scanner rated ${100 - c.score} out of 100 on your photo.` });
  }
  if (!out.length && treatments.length) {
    const t = treatments.find((t) => t.popular) ?? treatments[0];
    out.push({ treatment_id: t.id, why: `Nothing on this menu is tagged for your top findings yet. ${t.name} is a popular starting point here; a consultation can map it to your scan.` });
  }
  return out;
}

export async function youcamAnalyze(args: {
  photo: string;
  firstName: string | null;
  treatments: Treatment[];
  /** whole-call budget; the route has 120 s */
  budgetMs?: number;
}): Promise<YoucamAnalysis> {
  const budget = args.budgetMs ?? 75_000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), budget + 5_000);
  try {
    const t0 = Date.now();
    const fileId = await uploadPhoto(args.photo, ac.signal);
    const taskId = await startTask(fileId, ac.signal);
    const data = await pollTask(taskId, ac.signal, budget - (Date.now() - t0));

    const output = data.results?.output ?? [];
    const byType = new Map(output.map((o) => [o.type, o]));
    const concerns: ConcernResult[] = [];
    const overlays: YoucamOverlay[] = [];
    const raw: YoucamAnalysis["raw"] = [];
    for (const f of FEATURES) {
      const o = byType.get(f.action);
      if (!o || typeof o.ui_score !== "number") continue;
      const ui = Math.max(1, Math.min(100, Math.round(o.ui_score)));
      const score = 100 - ui;
      raw.push({ type: f.action, ui_score: ui, raw_score: typeof o.raw_score === "number" ? o.raw_score : ui });
      const sev = severityFromScore(score);
      const reason = `${sev === "none" ? f.say[0] : sev === "mild" ? f.say[1] : f.say[2]} Scanner score ${ui}/100.`;
      concerns.push({ id: f.concern, zone: f.zone, score, severity: sev, reason });
      const url = firstUrl(o.mask_urls);
      if (url) overlays.push({ id: f.concern, url });
    }
    if (!concerns.length) throw new YoucamError("YouCam returned no scores for this photo.");
    concerns.sort((a, b) => b.score - a.score);

    const all = data.results?.all;
    const allScore = typeof all === "number" ? all : all && typeof all.score === "number" ? all.score : null;
    const mean = raw.reduce((s, r) => s + r.ui_score, 0) / raw.length;
    const overall = Math.round(Math.min(100, Math.max(0, allScore ?? mean)));
    const worst = concerns.slice(0, 2).map((c) => CONCERN_BY_ID[c.id]?.label.toLowerCase() ?? c.id);
    const best = [...concerns].reverse().find((c) => c.severity === "none" || c.severity === "mild");
    const name = args.firstName ? `${args.firstName}, your` : "Your";
    const insight =
      `${name} skin scored ${overall} out of 100 on YouCam's skin analysis, measured across ${raw.length} signals. ` +
      (worst.length ? `The biggest opportunities are ${worst.join(" and ")}` : "Nothing stands out strongly") +
      (best ? `, while ${CONCERN_BY_ID[best.id]?.label.toLowerCase() ?? best.id} already looks good.` : ".");

    return {
      overall_score: overall,
      potential_score: Math.min(100, overall + 10),
      skin_age: typeof data.results?.skin_age === "number" && data.results.skin_age >= 16 ? Math.round(data.results.skin_age) : null,
      insight,
      concerns,
      recommendations: recommend(concerns, args.treatments),
      medical_flag: null,
      overlays,
      raw,
      task_id: taskId,
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new YoucamError("YouCam took too long to answer. Please try again.", "Timeout", true);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
