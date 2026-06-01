/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "portal-data.arbitrum.io",
      },
    ],
  },
};

export default nextConfig;
