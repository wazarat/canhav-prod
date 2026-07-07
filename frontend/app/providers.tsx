"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { arbitrumSepolia } from "viem/chains";

import { ResearchChatProvider } from "@/components/agent/research-chat-context";
import { WalletBootstrapGate } from "@/components/agent/WalletBootstrapGate";

/**
 * Privy auth provider. Social login provisions an embedded wallet on Arbitrum
 * Sepolia; wallet login (MetaMask) uses the external signer directly.
 *
 * `NEXT_PUBLIC_PRIVY_APP_ID` is inlined at build time. When it is absent the app
 * still renders (research pages stay public); auth surfaces show a
 * "not configured" notice rather than calling Privy hooks without this provider.
 */
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Providers({ children }: { children: ReactNode }) {
  const shell = (
    <ResearchChatProvider>{children}</ResearchChatProvider>
  );

  if (!PRIVY_APP_ID) return shell;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "email", "wallet"],
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
        },
        defaultChain: arbitrumSepolia,
        supportedChains: [arbitrumSepolia],
        appearance: {
          theme: "dark",
          accentColor: "#5b8cff",
          landingHeader: "Sign in to CanHav",
          loginMessage: "Your self-custodial research wallet",
        },
      }}
    >
      <WalletBootstrapGate />
      {shell}
    </PrivyProvider>
  );
}
