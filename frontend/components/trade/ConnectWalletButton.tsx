"use client";

import { Button } from "@/components/ui/Button";

interface ConnectWalletButtonProps {
  onConnect: () => void;
}

export function ConnectWalletButton({ onConnect }: ConnectWalletButtonProps) {
  return (
    <Button type="button" className="w-full" onClick={onConnect}>
      Connect with Passkey (ZeroDev)
    </Button>
  );
}
