"use client";

import { useEffect, useRef } from "react";
import { useWallets } from "@privy-io/react-auth";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";
import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

/**
 * One-time wallet treasury bootstrap (renders nothing).
 *
 * On first authenticated mount it asks the server whether this user still needs
 * the starting tCNHV grant. If so, it derives the user's canonical kernel
 * (index 0) wallet address in the browser — the same ZeroDev path the collab
 * client uses — and posts it back so the owner-keyed mint can deliver the
 * starting credits. Fully best-effort: any failure just retries on a later
 * mount, and it no-ops when credits aren't provisioned.
 */
export function WalletBootstrap() {
  const { wallets } = useWallets();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded) return;
    ran.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/wallet/bootstrap");
        if (!res.ok) return;
        const data = (await res.json()) as {
          needsGrant?: boolean;
          mintConfig?: SpawnMintConfig | null;
        };
        if (!data.needsGrant || !data.mintConfig) return;

        try {
          await embedded.switchChain(ARBITRUM_SEPOLIA_CHAIN_ID);
        } catch {
          /* kernel client pins the chain regardless */
        }

        const provider = await embedded.getEthereumProvider();
        const { createWalletClient, custom } = await import("viem");
        const { arbitrumSepolia } = await import("viem/chains");
        const signer = createWalletClient({
          account: embedded.address as `0x${string}`,
          chain: arbitrumSepolia,
          transport: custom(provider),
        });

        const svc = await import("canhav-agent-service");
        const cfg = svc.createConfig({
          zerodevRpc: data.mintConfig.zerodevRpc,
          rpcUrl: data.mintConfig.rpcUrl,
          identityRegistry: data.mintConfig.identityRegistry,
          securityRegistry: data.mintConfig.securityRegistry,
        });
        const kernel = await svc.createEcdsaKernelAccount(cfg, signer, 0n);

        await fetch("/api/wallet/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: kernel.address }),
        });
      } catch {
        /* best-effort — a later mount will retry */
      }
    })();
  }, [wallets]);

  return null;
}
