import { createRoute } from "@/lib/desk/crud";
import { parseTreatment } from "@/lib/desk/parse";

export const POST = createRoute("treatments", parseTreatment);
