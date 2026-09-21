import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We use server-side Node.js features (scraper, bot, cron)
  // This config ensures compatibility
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
