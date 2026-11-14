import { redirect } from "next/navigation";

/** /desk on its own opens the open sample desk. Real clinics use /desk/<their slug>. */
export default function DeskIndex() {
  redirect("/desk/sample");
}
