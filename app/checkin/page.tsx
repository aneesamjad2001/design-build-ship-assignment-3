import type { Metadata } from "next";
import { CheckinView } from "@/components/CheckinView";

export const metadata: Metadata = { title: "Body check-in" };

export default function Page() {
  return <CheckinView />;
}
