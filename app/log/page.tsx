import type { Metadata } from "next";
import { LogView } from "@/components/LogView";

export const metadata: Metadata = { title: "Log a session" };

export default function Page() {
  return <LogView />;
}
