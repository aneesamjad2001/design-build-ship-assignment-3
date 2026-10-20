import type { Metadata } from "next";
import { Suspense } from "react";
import { LogView } from "@/components/LogView";
import { LoadingState } from "@/components/States";

export const metadata: Metadata = { title: "Log a session" };

export default function Page() {
  // LogView reads ?edit=<id>, which needs a Suspense boundary in a statically built page
  return (
    <Suspense fallback={<LoadingState />}>
      <LogView />
    </Suspense>
  );
}
