import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  distDir: process.env.TRYPEDIA_DIST_DIR || ".next",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
