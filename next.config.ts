import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true, // You can remove this if you want to use Vercel's Image Optimization
  },
};

export default nextConfig;