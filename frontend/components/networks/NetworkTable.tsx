import Link from "next/link";
import { ArrowUpRight, BookOpen, Globe } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/stablecoins/StatusPill";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { categoryBadgeTone } from "@/lib/categoryTone";
import {
  getNetworkTaxonomyBadges,
  secondarySectorBadgeTone,
  sectorBadgeTone,
  subSectorBadgeTone,
} from "@/lib/networkTaxonomy";
import type { NetworkProfile, MemberCoinCategory } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

interface NetworkTableProps {
  profiles: NetworkProfile[];
  showStatus?: boolean;
  emptyHint?: string;
  /** When set, dim coin badges that don't match the active category filter. */
  coinCategoryFilter?: MemberCoinCategory | "all";
}

export function NetworkTable({
  profiles,
  showStatus = false,
  emptyHint,
  coinCategoryFilter = "all",
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
            {showStatus && <TH>Status</TH>}
            <TH className="text-right">Links</TH>
          </tr>
        </THead>
        <TBody>
          {profiles.map((p) => {
            const taxonomy = getNetworkTaxonomyBadges(p);
            return (
            <TR
              key={p.slug}
              className="border-l-2 border-l-transparent hover:border-l-electric-500/60"
            >
              <TD>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/networks/${p.slug}`}
                    className="font-medium text-ink-50 transition-colors hover:text-electric-400"
                  >
                    {p.name}
                  </Link>
                </div>
                <p className="mt-0.5 line-clamp-1 max-w-[320px] text-xs text-ink-300">
                  {p.description}
                </p>
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
                {formatUsdCompact(p.currentScale.tvlUsd)}
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
