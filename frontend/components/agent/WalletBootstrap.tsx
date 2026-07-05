"use client";

import { useEffect, useRef } from "react";
import { useWallets } from "@privy-io/react-auth";

import { resolveActiveWallet } from "@/lib/agent/privy-signer";

/**
 * One-time wallet treasury bootstrap (renders nothing).
 *
 * On first authenticated mount it asks the server whether this user still needs
 * the starting tCNHV grant. If so, it posts the user's Privy wallet address so
 * the owner-keyed mint can deliver the starting credits. Fully best-effort: any
 * failure just retries on a later mount, and it no-ops when credits aren't provisioned.
 */
export function WalletBootstrap() {
  const { wallets } = useWallets();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    const wallet = resolveActiveWallet(wallets);
    if (!wallet) return;
    ran.current = true;

    void (async () => {
      try {
        const treasuryAddress = wallet.address;

        const res = await fetch("/api/wallet/bootstrap");
        if (!res.ok) return;
        const data = (await res.json()) as { needsGrant?: boolean };

        if (!data.needsGrant) {
          await fetch("/api/wallet/bootstrap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: "", signerAddress: treasuryAddress }),
          });
          return;
        }

        await fetch("/api/wallet/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: treasuryAddress, signerAddress: treasuryAddress }),
        });
      } catch {
        /* best-effort — a later mount will retry */
      }
    })();
  }, [wallets]);

  return null;
}
