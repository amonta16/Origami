import { createRoute } from "@/lib/desk/crud";
import { parseReward } from "@/lib/desk/parse";

export const POST = createRoute("rewards", parseReward);
