import { updateRoute } from "@/lib/desk/crud";
import { parseTreatment } from "@/lib/desk/parse";

export const PATCH = updateRoute("treatments", parseTreatment);
