"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { arbitrumSepolia } from "viem/chains";

import { ResearchChatProvider } from "@/components/agent/research-chat-context";

/**
 * Privy social-login provider. Each user gets a self-custodial embedded wallet
 * (2-of-3 Shamir + TEE) from a social login; that wallet is the ECDSA root of
 * the user's ZeroDev Kernel smart account + every ERC-8004 agent they mint.
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
        loginMethods: ["google", "email"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
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
      {shell}
    </PrivyProvider>
  );
}
