// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable static HTML export
  distDir: 'out',   // Directory GitHub Pages will serve from
  trailingSlash: true,
  images: {
    unoptimized: true, // ✅ This fixes the error
  },
};

export default nextConfig;


