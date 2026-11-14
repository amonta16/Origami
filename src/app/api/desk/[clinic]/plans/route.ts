import { createRoute } from "@/lib/desk/crud";
import { parsePlan } from "@/lib/desk/parse";

export const POST = createRoute("membership_plans", parsePlan);
