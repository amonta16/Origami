import type { Metadata } from "next";
import { Lab } from "@/components/lab/lab";

export const metadata: Metadata = { title: "Lab", robots: { index: false, follow: false } };

// Hidden bake-off page for the team: pick the simulation model and analysis option.
export default function LabPage() {
  return <Lab />;
}
