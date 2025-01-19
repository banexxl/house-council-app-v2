/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: false,
  images: {
    domains: ['firebasestorage.googleapis.com', 'house-council.s3.amazonaws.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4MB",
    },
  },
};

module.exports = config;
