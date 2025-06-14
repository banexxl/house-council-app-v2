/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'house-council.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'https://sorklznvftjmhkaejkej.supabase.co/storage/v1/object/public/',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50MB",
    },
  },
};

module.exports = config;

