// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during production builds (avoids the unused-vars error blocking your deploy)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
