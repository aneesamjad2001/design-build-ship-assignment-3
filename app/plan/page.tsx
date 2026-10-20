import type { Metadata } from "next";
import { PlanView } from "@/components/PlanView";

export const metadata: Metadata = { title: "Your plan" };

export default function Page() {
  return <PlanView />;
}
