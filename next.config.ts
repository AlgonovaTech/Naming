import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger request bodies for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
