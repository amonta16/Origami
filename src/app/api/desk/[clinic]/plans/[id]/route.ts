import { updateRoute } from "@/lib/desk/crud";
import { parsePlan } from "@/lib/desk/parse";

export const PATCH = updateRoute("membership_plans", parsePlan);
