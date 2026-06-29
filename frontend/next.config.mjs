/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The ERC-8004 spawn bridge (app/api/agent/spawn) imports the standalone
  // `agent-service` TypeScript package; Next must transpile its source.
  transpilePackages: ["canhav-agent-service"],
  // `/entities` was renamed to `/networks`. Preserve bookmarks / external links.
  async redirects() {
    return [
      { source: "/entities", destination: "/networks", permanent: true },
      { source: "/entities/:slug", destination: "/networks/:slug", permanent: true },
      // Receipt migration — individual tokens moved to family receipt profiles.
      { source: "/tokens/steth", destination: "/receipts/lido-steth", permanent: true },
      { source: "/tokens/ausdc", destination: "/receipts/aave-atokens", permanent: true },
      { source: "/tokens/ausdt", destination: "/receipts/aave-atokens", permanent: true },
      { source: "/tokens/aweth", destination: "/receipts/aave-atokens", permanent: true },
      { source: "/tokens/weeth", destination: "/receipts/ether-fi-weeth", permanent: true },
      { source: "/stablecoins/susde", destination: "/receipts/ethena-susde", permanent: true },
      { source: "/tokens/reth", destination: "/receipts/rocket-pool-reth", permanent: true },
    ];
  },
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

    // Privy's bundle references optional integrations we don't use (fiat onramp,
    // Farcaster mini-apps, React Native storage, pretty logging). They aren't
    // installed; alias them to `false` so webpack emits an empty module instead
    // of failing to resolve.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@stripe/crypto": false,
      "@farcaster/mini-app-solana": false,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
