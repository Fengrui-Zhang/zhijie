/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**': ['./data/index/**'],
  },
};

export default nextConfig;
