// next.config.ts
import type { NextConfig } from "next";

// const cspHeader = `
//     default-src 'self';
//     script-src 'self' 'unsafe-eval' 'unsafe-inline';
//     style-src 'self' 'unsafe-inline';
//     img-src 'self' blob: data:;
//     font-src 'self';
//     object-src 'none';
//     base-uri 'self';
//     form-action 'self';
//     frame-ancestors 'none';
//     upgrade-insecure-requests;
//     `;

const nextConfig: NextConfig = {
  output: 'export', // Enable static HTML export
  distDir: 'out',   // Directory GitHub Pages will serve from
  trailingSlash: true,
  images: {
    unoptimized: true, // ✅ This fixes the error
  },
};

export default nextConfig;


