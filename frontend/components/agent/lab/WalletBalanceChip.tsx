"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";

/**
 * Small tCNHV treasury balance pill for the Agent Lab default tab — the full
 * credits panel (mint / faucet / fund / send) lives on the Credits tab this
 * links to. Renders nothing while loading, on error, or when tCNHV isn't
 * configured.
 */
export function WalletBalanceChip() {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wallet/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.configured || typeof data.balance !== "string") return;
        setBalance(data.balance);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (balance == null) return null;

  return (
    <Link
      href="/agents?tab=credits"
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neon-500/40 bg-neon-500/10 px-3 py-1.5 text-xs font-medium text-neon-400 transition-colors hover:bg-neon-500/20"
      title="Open the Credits tab to mint, fund agents, or send tCNHV"
    >
      <Coins className="h-3 w-3" />
      {balance} tCNHV
    </Link>
  );
}
