import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  // kaspa-wasm loads its .wasm from disk at require time, which the bundler
  // cannot trace. Leave it external so it is required at runtime instead.
  // It must stay server-only: it is how write requests are verified, and
  // verification that runs in the browser proves nothing.
  serverExternalPackages: ['kaspa-wasm'],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)", // Apply headers to all routes
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
