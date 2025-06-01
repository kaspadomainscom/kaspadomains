import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)", // Apply to all routes
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self';
              style-src 'self' 'unsafe-inline';
              img-src * blob: data:;
              font-src 'self' https:;
              connect-src *;
              frame-src 'none';
            `.replace(/\s{2,}/g, " ").trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
