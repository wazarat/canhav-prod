import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/**
 * Full-width illustration of the live human-in-the-loop pipeline:
 * research → verdict → proposal → your approval → your signature → GMX fill.
 * Mirrors the real Trade Desk (TradeDesk.tsx / ProposedTradeCard.tsx) — the
 * quoted chips ("size encrypted", "within caps · auto-approved") are the same
 * language those surfaces render. Decorative only: buttons are inert mocks.
 */

function StatusChip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9px]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Step({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-ink-700/60 bg-ink-900/70 px-3.5 py-3 md:flex-1",
        className,
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function Connector({ tone = "flow" }: { tone?: "flow" | "human" }) {
  const horizontal =
    tone === "human"
      ? "from-[#8B5CF6]/60 to-[#A78BFA]/60"
      : "from-[#5c92ff]/60 to-[#4FE3F5]/60";
  const vertical =
    tone === "human"
      ? "from-[#8B5CF6]/60 to-[#A78BFA]/60"
      : "from-[#5c92ff]/60 to-[#4FE3F5]/60";
  return (
    <div aria-hidden="true" className="flex items-center justify-center md:min-w-5 md:flex-none md:px-1">
      {/* mobile: short vertical rule; desktop: horizontal rule + arrow glyph */}
      <span className={cn("h-5 w-px bg-gradient-to-b md:hidden", vertical)} />
      <span className="hidden items-center gap-1 md:flex">
        <span className={cn("h-px w-4 bg-gradient-to-r", horizontal)} />
        <span className="font-mono text-[10px] text-ink-600">→</span>
      </span>
    </div>
  );
}

export function HitlFlowGraphic() {
  return (
    <div className="glass overflow-hidden rounded-2xl border border-ink-700/60">
      <div className="relative overflow-hidden bg-ink-950/40 bg-[radial-gradient(120%_90%_at_50%_8%,rgba(61,123,255,0.22),transparent_62%)]">
        {/* terminal chrome */}
        <div className="flex items-center gap-1.5 border-b border-ink-800/70 px-4 py-2.5">
          <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
          <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
          <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
          <span className="grow" />
          <span className="font-mono text-[9px] tracking-wide text-ink-500">
            hitl · trade desk · gmx · arbitrum
          </span>
        </div>

        {/* pipeline */}
        <div className="flex flex-col items-stretch p-5 md:flex-row md:items-stretch md:p-6">
          <Step label="01 · research">
            <span className="font-mono text-[11px] text-[#5c92ff]">
              agent digs the coin
            </span>
            <span className="text-[11px] leading-snug text-ink-400">
              Sourced research on the asset, refreshed continuously.
            </span>
          </Step>

          <Connector />

          <Step label="02 · verdict gate">
            <StatusChip className="self-start border-emerald-500/40 text-emerald-300">
              fresh · positive · gate open
            </StatusChip>
            <span className="text-[11px] leading-snug text-ink-400">
              No research, no trade.
            </span>
          </Step>

          <Connector />

          <Step label="03 · proposal">
            <span className="font-mono text-[11px] text-ink-100">long ETH · 3x</span>
            <StatusChip className="self-start border-neon-500/40 text-neon-400">
              size encrypted
            </StatusChip>
          </Step>

          <Connector tone="human" />

          <Step
            label="04 · your approval"
            className="border-neon-500/50 bg-neon-500/[0.07] shadow-[0_0_40px_-12px_rgba(139,92,246,0.5)] md:flex-[1.4]"
          >
            <Badge tone="neon" className="self-start text-[10px]">
              human in the loop
            </Badge>
            <span aria-hidden="true" className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="rounded-full border border-neon-500/40 bg-neon-500/10 px-2.5 py-1 text-[10px] font-medium text-neon-400">
                Approve &amp; trade
              </span>
              <span className="rounded-full border border-ink-700/70 bg-ink-900/70 px-2.5 py-1 text-[10px] font-medium text-ink-300">
                Reject
              </span>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-medium text-ink-400">
                Reveal size
              </span>
            </span>
            <StatusChip className="self-start border-[#22D3EE]/40 text-[#22D3EE]">
              within caps · auto-approved
            </StatusChip>
          </Step>

          <Connector tone="human" />

          <Step label="05 · your signature">
            <span className="font-mono text-[11px] text-ink-100">
              your wallet signs
            </span>
            <span className="text-[11px] leading-snug text-ink-400">
              No unattended signer exists.
            </span>
          </Step>

          <Connector />

          <Step label="06 · dex fill">
            <span className="font-mono text-[11px] text-[#4FE3F5]">
              GMX · Arbitrum
            </span>
            <StatusChip className="self-start border-[#22D3EE]/40 text-[#22D3EE]">
              filled
            </StatusChip>
          </Step>
        </div>
      </div>
    </div>
  );
}
