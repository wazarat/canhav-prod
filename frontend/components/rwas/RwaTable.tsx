import Link from "next/link";
import { ArrowUpRight, ShieldCheck, TrendingDown, TrendingUp, Minus } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/stablecoins/StatusPill";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { latestTvl, tvlChangePct, tvlTrend, type TvlTrend } from "@/lib/data";
import type { RwaProfile } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

interface RwaTableProps {
  profiles: RwaProfile[];
  /** Staging view shows the approval status column. */
  showStatus?: boolean;
  emptyHint?: string;
}

const TREND_TONE = {
  growing: "positive",
  stable: "neutral",
  declining: "danger",
} as const;

const TREND_ICON: Record<TvlTrend, typeof TrendingUp> = {
  growing: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

function TvlCell({ profile }: { profile: RwaProfile }) {
  const trend = tvlTrend(profile);
  const pct = tvlChangePct(profile);
  const Icon = TREND_ICON[trend];
  const sign = pct !== null && pct > 0 ? "+" : "";
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="font-mono text-ink-50">{formatUsdCompact(latestTvl(profile))}</span>
      <Badge tone={TREND_TONE[trend]} className="w-fit">
        <Icon className="h-3 w-3" />
        {pct === null ? "—" : `${sign}${pct.toFixed(1)}%`}
      </Badge>
    </div>
  );
}

export function RwaTable({ profiles, showStatus = false, emptyHint }: RwaTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-ink-300">
        {emptyHint ?? "No RWA protocols to display yet."}
      </div>
    );
  }

  return (
    <TableShell>
      <Table>
        <THead>
          <tr>
            <TH>Protocol</TH>
            <TH>Asset class</TH>
            <TH className="text-right">TVL</TH>
            <TH>30d trend</TH>
            {showStatus && <TH>Status</TH>}
            <TH className="text-right">Links</TH>
          </tr>
        </THead>
        <TBody>
          {profiles.map((p) => (
            <TR key={p.slug}>
              <TD>
                <div className="flex items-center gap-2">
                  {p.arbitrumPortalMetadata.isArbitrumNative && (
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-signal-400" />
                  )}
                  <Link
                    href={`/rwas/${p.slug}`}
                    className="font-medium text-ink-50 transition-colors hover:text-electric-400"
                  >
                    {p.name}
                  </Link>
                </div>
                <p className="mt-0.5 line-clamp-1 max-w-[280px] text-xs text-ink-300">
                  {p.description}
                </p>
              </TD>
              <TD>
                <Badge tone="neon">{p.assetClass}</Badge>
              </TD>
              <TD className="text-right">
                <TvlCell profile={p} />
              </TD>
              <TD>
                <span className="font-mono text-xs text-ink-200">{tvlTrend(p)}</span>
              </TD>
              {showStatus && (
                <TD>
                  <StatusPill status={p.status} />
                </TD>
              )}
              <TD>
                <div className="flex items-center justify-end gap-2 text-xs text-ink-300">
                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 transition-colors hover:text-ink-50"
                    >
                      site
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                  {p.arbitrumPortalMetadata.portalUrl && (
                    <a
                      href={p.arbitrumPortalMetadata.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 transition-colors hover:text-ink-50"
                    >
                      portal
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableShell>
  );
}
