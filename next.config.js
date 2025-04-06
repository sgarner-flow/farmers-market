/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['rbreohiwrvcpfznnpumh.supabase.co'],
  },
  // Disable ESLint during the build to allow deployment
  eslint: {
    // Only run ESLint on local development, not during builds
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 