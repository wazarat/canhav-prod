import Link from "next/link";
import { BookOpen, Globe } from "lucide-react";

import { NetworkAvatar } from "@/components/networks/NetworkEntityHeader";
import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatusPill } from "@/components/stablecoins/StatusPill";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { categoryBadgeTone } from "@/lib/categoryTone";
import {
  networkHeadlineMarketCapUsd,
  networkHeadlineTvlUsd,
  networkHeadlineVolume24hUsd,
} from "@/lib/networks/marketHeadlines";
import {
  getNetworkTaxonomyBadges,
  isNonEvmRwa,
  secondarySectorBadgeTone,
  sectorBadgeTone,
  subSectorBadgeTone,
} from "@/lib/networkTaxonomy";
import type { MemberCoinCategory, NetworkProfile } from "@/lib/types";
import { cn, formatUsdCompact } from "@/lib/utils";

interface NetworkTableProps {
  profiles: NetworkProfile[];
  showStatus?: boolean;
  emptyHint?: string;
  /** When set, dim coin badges that don't match the active category filter. */
  coinCategoryFilter?: MemberCoinCategory | "all";
  /** CAN-47: Credit-sector column set (Supplied / Borrowed / Util / TVL 7d). */
  creditColumns?: boolean;
  /** slug -> 8d TVL values + week-over-week change for the row sparkline. */
  creditSparklines?: Record<string, { values: number[]; wowPct: number | null }>;
}

/** Token Terminal style inline trend cell: sparkline + WoW direction (CAN-47). */
function TrendCell({
  slug,
  series,
}: {
  slug: string;
  series?: { values: number[]; wowPct: number | null };
}) {
  if (!series || series.values.length < 2) {
    return <span className="text-xs text-ink-500">—</span>;
  }
  const up = (series.wowPct ?? 0) >= 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <Sparkline
        id={`row-tvl-${slug}`}
        values={series.values}
        width={96}
        height={28}
        color={up ? "#34D399" : "#F87171"}
        className="h-7 w-24"
      />
      {series.wowPct != null && (
        <span
          className={cn("font-mono text-xs tabular-nums", up ? "text-emerald-400" : "text-red-400")}
        >
          {up ? "+" : ""}
          {series.wowPct.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function NetworkTable({
  profiles,
  showStatus = false,
  emptyHint,
  coinCategoryFilter = "all",
  creditColumns = false,
  creditSparklines,
}: NetworkTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-ink-300">
        {emptyHint ?? "No networks to display yet."}
      </div>
    );
  }

  return (
    <TableShell>
      <Table>
        <THead>
          <tr>
            <TH>Network</TH>
            <TH>Coins</TH>
            <TH className="text-right">TVL</TH>
            {creditColumns && (
              <>
                {/* Borrowed/Util columns hidden while yields.llama.fi/poolsBorrow
                    is behind the DeFi Llama paid plan (HTTP 402 since 2026-07).
                    The creditTagMetrics pipeline still carries the fields. */}
                <TH className="text-right">Supplied</TH>
                <TH className="text-right">TVL 7d</TH>
              </>
            )}
            <TH className="text-right">Mkt cap</TH>
            <TH className="text-right">Vol 24h</TH>
            {showStatus && <TH>Status</TH>}
            <TH className="text-right">Links</TH>
          </tr>
        </THead>
        <TBody>
          {profiles.map((p) => {
            const taxonomy = getNetworkTaxonomyBadges(p);
            const tvlUsd = networkHeadlineTvlUsd(p);
            const mcapUsd = networkHeadlineMarketCapUsd(p);
            const volume24hUsd = networkHeadlineVolume24hUsd(p);
            return (
              <TR
                key={p.slug}
                className="border-l-2 border-l-transparent hover:border-l-electric-500/60"
              >
                <TD>
                  <div className="flex items-center gap-2.5">
                    <NetworkAvatar profile={p} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/networks/${p.slug}`}
                        className="font-medium text-ink-50 transition-colors hover:text-electric-400"
                      >
                        {p.name}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 max-w-[280px] text-xs text-ink-300">
                        {p.description}
                      </p>
                    </div>
                  </div>
                  {taxonomy.primarySector && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Badge tone={sectorBadgeTone(taxonomy.primarySector)}>
                        {taxonomy.primarySector}
                      </Badge>
                      {taxonomy.secondarySectors.map((sector) => (
                        <Badge key={sector} tone={secondarySectorBadgeTone()}>
                          {sector}
                        </Badge>
                      ))}
                      {taxonomy.subSectorTags.map((tag) => (
                        <Badge key={tag} tone={subSectorBadgeTone()}>
                          {tag}
                        </Badge>
                      ))}
                      {isNonEvmRwa(p) && <Badge tone="warning">Non-EVM</Badge>}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-ink-400">
                    {p.memberCoins.length} coin{p.memberCoins.length !== 1 ? "s" : ""}
                  </p>
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {p.memberCoins.map((c) => (
                      <Badge
                        key={c.slug}
                        tone={categoryBadgeTone(c.category)}
                        className={
                          coinCategoryFilter !== "all" && c.category !== coinCategoryFilter
                            ? "opacity-35"
                            : undefined
                        }
                      >
                        {c.symbol}
                      </Badge>
                    ))}
                  </div>
                </TD>
                <TD className="text-right font-mono text-ink-50">
                  {formatUsdCompact(tvlUsd)}
                </TD>
                {creditColumns && (
                  <>
                    <TD className="text-right font-mono text-ink-200">
                      {formatUsdCompact(
                        p.creditTagMetrics?.lending?.totalSuppliedUsd?.value ?? null,
                      )}
                    </TD>
                    <TD className="text-right">
                      <TrendCell slug={p.slug} series={creditSparklines?.[p.slug]} />
                    </TD>
                  </>
                )}
                <TD className="text-right font-mono text-ink-200">
                  {formatUsdCompact(mcapUsd)}
                </TD>
                <TD className="text-right font-mono text-ink-200">
                  {formatUsdCompact(volume24hUsd)}
                </TD>
                {showStatus && (
                  <TD>
                    <StatusPill status={p.status} />
                  </TD>
                )}
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                        title="Website"
                        className="inline-flex items-center gap-1 rounded-lg border border-ink-700/60 bg-ink-900/40 px-2 py-1 text-xs text-ink-200 transition-colors hover:border-ink-600 hover:text-ink-50"
                      >
                        <Globe className="h-3 w-3" />
                        Website
                      </a>
                    )}
                    {p.officialDocs && (
                      <a
                        href={p.officialDocs}
                        target="_blank"
                        rel="noreferrer"
                        title="Official docs"
                        className="inline-flex items-center gap-1 rounded-lg border border-electric-500/30 bg-electric-500/10 px-2 py-1 text-xs text-electric-300 transition-colors hover:bg-electric-500/20"
                      >
                        <BookOpen className="h-3 w-3" />
                        Docs
                      </a>
                    )}
                    {!p.website && !p.officialDocs && (
                      <span className="text-xs text-ink-500">—</span>
                    )}
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableShell>
  );
}
