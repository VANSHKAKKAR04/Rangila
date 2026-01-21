/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Enable static exports if needed
  // output: 'standalone',
  
  // Optimize images
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;