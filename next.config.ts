import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable static HTML export
  distDir: 'out',   // Directory GitHub Pages will serve from
  images: {
    unoptimized: true, // ✅ This fixes the error
  },
  basePath: '/rednose-site', // Replace with your repo name
  assetPrefix: '/rednose-site/', // Same as basePath
};

export default nextConfig;


