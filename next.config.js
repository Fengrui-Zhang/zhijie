/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['taibu-core'],
  outputFileTracingIncludes: {
    '/api/**': ['./data/index/**', './实验/**'],
  },
};

export default nextConfig;
