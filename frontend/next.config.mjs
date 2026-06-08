/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The ERC-8004 spawn bridge (app/api/agent/spawn) imports the standalone
  // `agent-service` TypeScript package; Next must transpile its source.
  transpilePackages: ["canhav-agent-service"],
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
