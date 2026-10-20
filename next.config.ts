import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOT cacheComponents / partialPrefetching (the scaffold enables them). They keep visited
  // pages alive in hidden form, so tapping "Log" after saving a workout brought back the
  // already-saved sets — and saving again duplicated the session. This app keeps its state
  // on the device and wants every visit to start from what is saved, not from a stale screen.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
