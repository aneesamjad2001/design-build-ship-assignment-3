"use client";

import { usePathname } from "next/navigation";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { setFlash, useFlash } from "@/lib/store";

/** The one-shot confirmation ("Upper body saved") shown on the page it names. */
export function FlashBanner() {
  const flash = useFlash();
  const pathname = usePathname();
  if (!flash || flash.path !== pathname) return null;
  return (
    <Banner
      tone="success"
      title={flash.title}
      action={
        <Button variant="ghost" onClick={() => setFlash(null)} aria-label="Dismiss message">
          Dismiss
        </Button>
      }
    >
      {flash.detail}
    </Banner>
  );
}
