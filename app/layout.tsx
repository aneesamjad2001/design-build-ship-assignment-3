import type { Metadata, Viewport } from "next";
import { Barlow, Big_Shoulders } from "next/font/google";
import { RouteFocus } from "@/components/RouteFocus";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-big-shoulders", subsets: ["latin"] });
const body = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Ironlog — your gym coach, saved on this device", template: "%s · Ironlog" },
  description:
    "Pick a goal, get today's workout, log your lifts, and see what to train next. No sign-up: everything stays on your device.",
};

export const viewport: Viewport = { themeColor: "#0d0d0d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-dvh font-body">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <RouteFocus />
        <main id="main" className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6 md:pb-14">
          {children}
        </main>
      </body>
    </html>
  );
}
