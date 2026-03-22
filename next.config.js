/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**': ['./data/index/**', './实验/**'],
  },
};

export default nextConfig;
