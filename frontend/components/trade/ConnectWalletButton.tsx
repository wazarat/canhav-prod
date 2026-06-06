"use client";

import { Button } from "@/components/ui/Button";

interface ConnectWalletButtonProps {
  onConnect: () => void;
}

export function ConnectWalletButton({ onConnect }: ConnectWalletButtonProps) {
  return (
    <button
      type="button"
      onClick={onConnect}
      className="w-full rounded bg-electric-500 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      Connect Wallet
    </button>
  );
}
