"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { focusPageHeading } from "@/lib/focus";

/** Moves focus to the page heading after navigation (never on first load). */
export function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    focusPageHeading();
  }, [pathname]);
  return null;
}
