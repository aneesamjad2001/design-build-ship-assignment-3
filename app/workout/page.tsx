import type { Metadata } from "next";
import { WorkoutView } from "@/components/WorkoutView";

export const metadata: Metadata = { title: "Workout" };

export default function Page() {
  return <WorkoutView />;
}
