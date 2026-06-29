import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { ReceiptTable } from "@/components/receipts/ReceiptTable";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedNetworks, getApprovedReceipts } from "@/lib/data";

export const metadata = {
  title: "Receipt Tokens",
};

export const revalidate = 300;

export default async function ReceiptsPage() {
  const [profiles, entities] = await Promise.all([
    getApprovedReceipts(),
    getApprovedNetworks(),
  ]);

  const types = new Set(profiles.map((p) => p.receiptType));

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Receipt Tokens</span>
      </nav>

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          Receipt Tokens
        </h1>
        <p className="max-w-2xl text-sm text-ink-300">
          LSTs, lending receipts, yield vault shares, and staked wrappers — separate from primary
          governance and stablecoin listings.{" "}
          <span className="font-medium text-ink-100">{profiles.length}</span> families tracked.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tracked" value={`${profiles.length}`} hint="Receipt families" />
        <StatCard label="Receipt types" value={`${types.size}`} hint="Distinct types" />
        <StatCard
          label="LST / LRT"
          value={`${profiles.filter((p) => p.receiptType === "LiquidStaking" || p.receiptType === "LiquidRestaking").length}`}
          hint="Staking receipts"
        />
        <StatCard
          label="Lending"
          value={`${profiles.filter((p) => p.receiptType === "LendingReceipt").length}`}
          hint="Money-market receipts"
        />
      </section>

      <ReceiptTable
        profiles={profiles}
        entities={entities}
        emptyHint="No receipt tokens in the store yet."
      />

      <ResearchChatScope />
    </div>
  );
}
