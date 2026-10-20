"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { focusPageHeading } from "@/lib/focus";
import { setFlash } from "@/lib/store";

/** After navigation: move focus to the page heading (never on first load), and
 *  retire the one-shot "saved" message once the person goes anywhere but Today. */
export function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (pathname !== "/") setFlash(null);
    if (first.current) {
      first.current = false;
      return;
    }
    focusPageHeading(false);
  }, [pathname]);
  return null;
}
