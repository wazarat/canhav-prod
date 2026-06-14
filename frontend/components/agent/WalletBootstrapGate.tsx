"use client";

import { WalletBootstrap } from "./WalletBootstrap";

/**
 * Mounts the one-time treasury grant bootstrap anywhere inside PrivyProvider
 * so /collab and other routes trigger the 10k tCNHV grant on first login, not
 * only /agents.
 */
export function WalletBootstrapGate() {
  return <WalletBootstrap />;
}
