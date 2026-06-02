import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import {
  fetchRecentTransfers,
  fetchSupplyHistory,
  fetchTokenMetadata,
  fetchTotalSupply,
  fetchTotalValueLocked,
  hasAlchemy,
} from "@/lib/server/alchemy";
import { resolveEntityToken } from "@/lib/server/resolve";
import type { RwaProfile, StablecoinProfile } from "@/lib/types";
import {
  arbiscanToken,
  arbiscanTx,
  formatNumberCompact,
  formatUsdCompact,
  timeAgo,
  truncateAddress,
} from "@/lib/utils";

const LIVE_REVALIDATE = 300;

/** Suspense fallback while the on-chain panel resolves. */
export function OnchainPanelSkeleton() {
  return (
    <Card className="space-y-4">
      <div className="h-5 w-40 animate-pulse rounded bg-ink-800/70" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 animate-pulse rounded-xl bg-ink-800/50" />
        <div className="h-16 animate-pulse rounded-xl bg-ink-800/50" />
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-ink-800/40" />
    </Card>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-ink-300">{label}</span>
      <span className="text-right text-sm font-medium text-ink-100">{value}</span>
    </div>
  );
}

/**
 * Live on-chain data for a stablecoin or RWA, sourced from Alchemy at render
 * time (cached for 5 min). Hidden entirely when no Arbitrum contract resolves.
 */
export async function OnchainPanel({
  profile,
}: {
  profile: StablecoinProfile | RwaProfile;
}) {
  const token = await resolveEntityToken(profile);
  if (!token.address) return null;

  const address = token.address;
  const isStablecoin = profile.category === "Stablecoin";

  // No key configured: still surface the resolved address + Arbiscan link.
  if (!hasAlchemy()) {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle>On-chain</CardTitle>
          <Badge tone="neutral">Alchemy key not set</Badge>
        </div>
        <MetaRow
          label="Arbitrum contract"
          value={
            <a
              href={arbiscanToken(address) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-electric-400 hover:underline"
            >
              {truncateAddress(address)}
            </a>
          }
        />
      </Card>
    );
  }

  const [metadata, transfers, metric, supplyHistory] = await Promise.all([
    fetchTokenMetadata(address),
    fetchRecentTransfers(address, 8),
    isStablecoin
      ? fetchTotalSupply(address, token.decimals, LIVE_REVALIDATE)
      : fetchTotalValueLocked(
          [{ address, decimals: token.decimals, priceUsd: token.priceUsd }],
          LIVE_REVALIDATE,
        ),
    isStablecoin
      ? fetchSupplyHistory(address, token.decimals, { days: 30, points: 6 })
      : Promise.resolve([]),
  ]);

  const metricLabel = isStablecoin ? "Live circulating supply" : "Live TVL (on-chain proxy)";
  const metricValue =
    metric.value === null
      ? "—"
      : isStablecoin
        ? formatNumberCompact(metric.value)
        : formatUsdCompact(metric.value);
  const decimals = metadata?.decimals ?? token.decimals;

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <CardTitle>On-chain</CardTitle>
        <Badge tone="signal">Alchemy · live</Badge>
      </div>

      <div className="space-y-1 divide-y divide-ink-800/60">
        <MetaRow
          label={metricLabel}
          value={
            <span className="font-mono">
              {metricValue}
              {isStablecoin && metadata?.symbol ? (
                <span className="ml-1 text-ink-300">{metadata.symbol}</span>
              ) : null}
            </span>
          }
        />
        <MetaRow label="Decimals" value={decimals ?? "—"} />
        <MetaRow
          label="Arbitrum contract"
          value={
            <a
              href={arbiscanToken(address) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-electric-400 hover:underline"
            >
              {truncateAddress(address)}
            </a>
          }
        />
        <MetaRow
          label="Last refreshed"
          value={metric.updatedAt ? timeAgo(metric.updatedAt) : "—"}
        />
      </div>

      {isStablecoin && supplyHistory.length >= 2 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-ink-300">
            Supply trend · ~30d
          </p>
          <Sparkline id={`${profile.slug}-supply`} values={supplyHistory.map((p) => p.value)} />
        </div>
      )}

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-ink-300">Recent transfers</p>
        {transfers.length === 0 ? (
          <p className="text-sm text-ink-300">No recent ERC-20 transfers found.</p>
        ) : (
          <TableShell>
            <Table className="min-w-[480px]">
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>From</TH>
                  <TH>To</TH>
                  <TH className="text-right">Amount</TH>
                </TR>
              </THead>
              <TBody>
                {transfers.map((t, i) => (
                  <TR key={`${t.hash}-${i}`}>
                    <TD className="whitespace-nowrap text-ink-300">
                      <a
                        href={arbiscanTx(t.hash) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-ink-50"
                      >
                        {timeAgo(t.timestamp)}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </TD>
                    <TD className="font-mono text-ink-300">{truncateAddress(t.from)}</TD>
                    <TD className="font-mono text-ink-300">{truncateAddress(t.to)}</TD>
                    <TD className="text-right font-mono">
                      {t.value === null ? "—" : formatNumberCompact(t.value)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableShell>
        )}
      </div>
    </Card>
  );
}
