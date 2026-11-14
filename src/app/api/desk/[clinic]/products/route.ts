import { createRoute } from "@/lib/desk/crud";
import { parseProduct } from "@/lib/desk/parse";

export const POST = createRoute("products", parseProduct);
