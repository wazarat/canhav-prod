"use client";

import type { ReactNode } from "react";

import { ResearchChatProvider } from "@/components/agent/research-chat-context";

/**
 * Root client providers for every page. Auth lives in `PrivyShell`, mounted
 * only by the /agents and /collab layouts, so public research pages don't ship
 * the Privy/wallet bundle.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <ResearchChatProvider>{children}</ResearchChatProvider>;
}
