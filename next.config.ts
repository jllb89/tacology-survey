/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ignore all ESLint errors (including unused-vars) during builds
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
