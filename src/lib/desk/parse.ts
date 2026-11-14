import "server-only";
import { ValidationError, has, vBool, vInt, vText, vUrl } from "./access";

/**
 * Body → column values for each catalog table. Only keys present in the body are returned,
 * so the same parser serves create (with `create: true`, which requires the name) and partial updates.
 */
type Body = Record<string, unknown>;
type Row = Record<string, unknown>;

const CATEGORIES = ["injectables", "skin", "laser", "body", "wellness", "consult"];
const KINDS = ["package", "skincare", "gift_card"];
const MAX_CENTS = 10_000_000; // $100,000

function pick(body: Body, out: Row, key: string, fn: (v: unknown) => unknown) {
  if (has(body, key)) out[key] = fn(body[key]);
}

function name(body: Body, out: Row, create: boolean) {
  if (create || has(body, "name")) out.name = vText(body.name, "Name", { max: 120, required: true });
}

export function parseTreatment(body: Body, create = false): Row {
  const out: Row = {};
  name(body, out, create);
  pick(body, out, "description", (v) => vText(v, "Description", { max: 1000 }));
  pick(body, out, "category", (v) => {
    if (typeof v !== "string" || !CATEGORIES.includes(v)) throw new ValidationError("Pick a category.");
    return v;
  });
  pick(body, out, "duration_min", (v) => vInt(v, "Duration", { min: 1, max: 600 }));
  pick(body, out, "price_cents", (v) => vInt(v, "Price", { min: 0, max: MAX_CENTS }));
  pick(body, out, "member_price_cents", (v) => vInt(v, "Member price", { min: 0, max: MAX_CENTS }));
  pick(body, out, "result_days", (v) => vInt(v, "Due again after", { min: 1, max: 1095 }));
  pick(body, out, "popular", (v) => vBool(v, "Popular"));
  pick(body, out, "active", (v) => vBool(v, "Show in app"));
  return out;
}

export function parseProduct(body: Body, create = false): Row {
  const out: Row = {};
  name(body, out, create);
  if (create || has(body, "kind")) {
    if (typeof body.kind !== "string" || !KINDS.includes(body.kind)) throw new ValidationError("Pick package, skincare or gift card.");
    out.kind = body.kind;
  }
  pick(body, out, "description", (v) => vText(v, "Description", { max: 1000 }));
  pick(body, out, "price_cents", (v) => vInt(v, "Price", { min: 0, max: MAX_CENTS }));
  pick(body, out, "member_price_cents", (v) => vInt(v, "Member price", { min: 0, max: MAX_CENTS }));
  pick(body, out, "sessions", (v) => vInt(v, "Sessions", { min: 1, max: 100 }));
  pick(body, out, "image_url", (v) => vUrl(v, "Image URL"));
  pick(body, out, "active", (v) => vBool(v, "Show in app"));
  return out;
}

export function parsePlan(body: Body, create = false): Row {
  const out: Row = {};
  name(body, out, create);
  pick(body, out, "tagline", (v) => vText(v, "Tagline", { max: 200 }));
  if (create || has(body, "monthly_price_cents")) out.monthly_price_cents = vInt(body.monthly_price_cents, "Monthly price", { min: 0, max: MAX_CENTS, required: true });
  pick(body, out, "perks", (v) => {
    if (!Array.isArray(v)) throw new ValidationError("Perks must be a list.");
    const perks = v.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean);
    if (perks.length > 12) throw new ValidationError("Keep it to 12 perks or fewer.");
    if (perks.some((p) => p.length > 160)) throw new ValidationError("Each perk must be 160 characters or fewer.");
    return perks;
  });
  pick(body, out, "member_discount_pct", (v) => vInt(v, "Member discount", { min: 0, max: 100 }) ?? 0);
  pick(body, out, "monthly_points", (v) => vInt(v, "Monthly points", { min: 0, max: 100_000 }) ?? 0);
  pick(body, out, "active", (v) => vBool(v, "Show in app"));
  return out;
}

export function parseReward(body: Body, create = false): Row {
  const out: Row = {};
  name(body, out, create);
  if (create || has(body, "points_cost")) out.points_cost = vInt(body.points_cost, "Points", { min: 1, max: 1_000_000, required: true });
  pick(body, out, "description", (v) => vText(v, "Description", { max: 500 }));
  pick(body, out, "image_url", (v) => vUrl(v, "Image URL"));
  pick(body, out, "active", (v) => vBool(v, "Show in app"));
  return out;
}

export function parseClinic(body: Body): Row {
  const out: Row = {};
  if (has(body, "name")) out.name = vText(body.name, "Clinic name", { max: 80, required: true });
  pick(body, out, "brand_color", (v) => {
    const s = vText(v, "Brand color", { max: 7 });
    if (s && !/^#[0-9a-fA-F]{6}$/.test(s)) throw new ValidationError("Brand color must be a hex code like #92191c.");
    return s ? s.toLowerCase() : null;
  });
  pick(body, out, "logo_url", (v) => vUrl(v, "Logo URL"));
  pick(body, out, "hero_photo_url", (v) => vUrl(v, "Home photo URL"));
  pick(body, out, "phone", (v) => vText(v, "Phone", { max: 40 }));
  pick(body, out, "address", (v) => vText(v, "Address", { max: 200 }));
  pick(body, out, "website", (v) => vUrl(v, "Website"));
  pick(body, out, "booking_url", (v) => vUrl(v, "Booking link"));
  pick(body, out, "welcome_points", (v) => vInt(v, "Welcome points", { min: 0, max: 100_000, required: true }));
  pick(body, out, "visit_points", (v) => vInt(v, "Visit points", { min: 0, max: 100_000, required: true }));
  pick(body, out, "points_per_dollar", (v) => vInt(v, "Points per dollar", { min: 0, max: 1000, required: true }));
  return out;
}
