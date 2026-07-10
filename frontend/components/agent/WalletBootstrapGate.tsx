"use client";

import { WalletBootstrap } from "./WalletBootstrap";
import { collabEnabled } from "@/lib/collab-flag";

/**
 * Mounts the one-time treasury grant bootstrap anywhere inside PrivyProvider
 * so /collab and other routes trigger the 10k tCNHV grant on first login, not
 * only /agents. tCNHV only pays for marketplace exchanges, so no grant while
 * the marketplace is hidden (C2).
 */
export function WalletBootstrapGate() {
  if (!collabEnabled()) return null;
  return <WalletBootstrap />;
}
