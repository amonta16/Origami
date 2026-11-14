import { deleteRoute, updateRoute } from "@/lib/desk/crud";
import { parseReward } from "@/lib/desk/parse";

export const PATCH = updateRoute("rewards", parseReward);
export const DELETE = deleteRoute("rewards");
