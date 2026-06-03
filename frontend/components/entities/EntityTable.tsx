import Link from "next/link";
import { ArrowUpRight, Network } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/stablecoins/StatusPill";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import type { EntityProfile } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

interface EntityTableProps {
  profiles: EntityProfile[];
  showStatus?: boolean;
  emptyHint?: string;
}

export function EntityTable({ profiles, showStatus = false, emptyHint }: EntityTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-ink-300">
        {emptyHint ?? "No entities to display yet."}
      </div>
    );
  }

  return (
    <TableShell>
      <Table>
        <THead>
          <tr>
            <TH>Entity</TH>
            <TH>Coins</TH>
            <TH className="text-right">TVL</TH>
            {showStatus && <TH>Status</TH>}
            <TH className="text-right">Links</TH>
          </tr>
        </THead>
        <TBody>
          {profiles.map((p) => (
            <TR key={p.slug}>
              <TD>
                <div className="flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 shrink-0 text-neon-400" />
                  <Link
                    href={`/entities/${p.slug}`}
                    className="font-medium text-ink-50 transition-colors hover:text-electric-400"
                  >
                    {p.name}
                  </Link>
                </div>
                <p className="mt-0.5 line-clamp-1 max-w-[320px] text-xs text-ink-300">
                  {p.description}
                </p>
              </TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  {p.memberCoins.map((c) => (
                    <Badge key={c.slug} tone={c.category === "Token" ? "neon" : "electric"}>
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
                  {p.officialDocs && (
                    <a
                      href={p.officialDocs}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 transition-colors hover:text-ink-50"
                    >
                      docs
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
