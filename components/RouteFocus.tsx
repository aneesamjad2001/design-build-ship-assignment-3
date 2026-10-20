"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { focusPageHeading } from "@/lib/focus";
import { getFlash, setFlash } from "@/lib/store";

/** After navigation: move focus to the page heading (never on first load), and
 *  retire the one-shot "saved" message once the person goes anywhere but Today. */
export function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    // a one-shot message belongs to the page it names; leaving that page retires it
    const flash = getFlash();
    if (flash && flash.path !== pathname) setFlash(null);
    if (first.current) {
      first.current = false;
      return;
    }
    focusPageHeading(false);
  }, [pathname]);
  return null;
}
