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
  webpack: (config) => {
    // `canhav-agent-service` is linked via `file:../agent-service`. With symlink
    // resolution on (webpack default), webpack resolves the package to its real
    // path and looks for its bare imports (viem, @zerodev/*) under agent-service/
    // — which is never `npm install`ed on Vercel (root dir is frontend/). Turning
    // symlink resolution off makes those imports resolve against frontend/node_modules.
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
