import { updateRoute } from "@/lib/desk/crud";
import { parseProduct } from "@/lib/desk/parse";

export const PATCH = updateRoute("products", parseProduct);
