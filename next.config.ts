import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable static HTML export
  distDir: 'out',   // Directory GitHub Pages will serve from
  images: {
    unoptimized: true, // ✅ This fixes the error
  },
  basePath: '/kaspadomains', // Replace with your repo name
  assetPrefix: '/kaspadomains/', // Same as basePath
};

export default nextConfig;


