import type { Metadata } from "next";
import Link from "next/link";

import { TradeTerminal } from "@/components/trade/TradeTerminal";

export const metadata: Metadata = {
  title: "Trade JLP — CanHav",
};

export default function JlpTradePage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <nav className="flex items-center gap-2 text-xs text-[#787B87]">
        <Link href="/tokens" className="hover:text-[#A0A3AD]">
          Markets
        </Link>
        <span>/</span>
        <Link href="/tokens/jlp" className="hover:text-[#A0A3AD]">
          JLP
        </Link>
        <span>/</span>
        <span className="text-[#EAECEF]">Trade</span>
      </nav>

      <TradeTerminal />
    </div>
  );
}
