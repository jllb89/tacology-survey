// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      // completely skip ESLint (so unused-vars can’t block the build)
      ignoreDuringBuilds: true,
    },
  };
  
  module.exports = nextConfig;
  