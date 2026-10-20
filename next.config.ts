import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The floating dev badge sits on top of the first mobile tab in development only.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
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
