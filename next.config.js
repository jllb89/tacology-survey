// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      // Skip *all* ESLint checks during production builds
      ignoreDuringBuilds: true,
    },
  };
  
  module.exports = nextConfig;
  