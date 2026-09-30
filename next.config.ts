import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // A HubSpot CLI install in the home folder has its own lockfile; pin the root so Next doesn't pick that up.
  turbopack: { root: path.resolve(__dirname) },
  // Lets the dev server answer through a temporary Cloudflare tunnel (Facebook/Instagram testing).
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    // Hero photos request quality 60/70/80; Next 16 only serves listed values.
    qualities: [60, 70, 75, 80],
  },
};

export default nextConfig;
