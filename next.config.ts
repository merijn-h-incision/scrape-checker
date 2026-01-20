import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Increase body size limit for Server Actions and Route Handlers
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
