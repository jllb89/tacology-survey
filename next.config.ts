// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // completely ignore ESLint errors (unused vars, etc.) during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
