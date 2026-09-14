import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Hero photos request quality 60/70/80; Next 16 only serves listed values.
    qualities: [60, 70, 75, 80],
  },
};

export default nextConfig;
