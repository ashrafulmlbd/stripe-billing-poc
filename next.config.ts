import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: keep it out of the bundle
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: path.resolve("."), // a stray package-lock.json in the home folder confuses root detection
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
