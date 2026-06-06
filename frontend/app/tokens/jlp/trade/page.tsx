import type { Metadata } from "next";

import { TradeTerminal } from "@/components/trade/TradeTerminal";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Trade JLP — CanHav",
};

export default function JlpTradePage() {
  return (
    <div className="container space-y-8 py-12">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Tokens", href: "/tokens" },
          { label: "JLP", href: "/tokens/jlp" },
          { label: "Trade" },
        ]}
        title="JLP · Trade"
        description="Simulated GMX-style terminal for JLP exposure on Arbitrum Sepolia. Demo only — no real funds move."
      />
      <TradeTerminal />
    </div>
  );
}
