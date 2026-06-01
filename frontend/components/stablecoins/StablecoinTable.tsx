import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/stablecoins/StatusPill";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { latestPegPrice, pegDeviationBps, pegHealth } from "@/lib/data";
import type { StablecoinProfile } from "@/lib/types";
import { cn, formatPeg, formatUsdCompact } from "@/lib/utils";

interface StablecoinTableProps {
  profiles: StablecoinProfile[];
  /** Staging view shows the approval status column. */
  showStatus?: boolean;
  emptyHint?: string;
}

const HEALTH_TONE = {
  tight: "positive",
  watch: "warning",
  loose: "danger",
} as const;

function PegCell({ profile }: { profile: StablecoinProfile }) {
  const latest = latestPegPrice(profile);
  const bps = pegDeviationBps(profile);
  const health = pegHealth(profile);
  const symbol = profile.pegTarget === "EUR" ? "€" : "$";
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-ink-50">
        {symbol}
        {formatPeg(latest)}
      </span>
      <Badge tone={HEALTH_TONE[health]} className="w-fit">
        {bps === null ? "—" : `${bps} bps`}
      </Badge>
    </div>
  );
}

export function StablecoinTable({ profiles, showStatus = false, emptyHint }: StablecoinTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-ink-300">
        {emptyHint ?? "No stablecoins to display yet."}
      </div>
    );
  }

  return (
    <TableShell>
      <Table>
        <THead>
          <tr>
            <TH>Protocol</TH>
            <TH>Symbol</TH>
            <TH>Peg</TH>
            <TH className="text-right">Circulating supply</TH>
            <TH>Deviation</TH>
            {showStatus && <TH>Status</TH>}
            <TH className="text-right">Links</TH>
          </tr>
        </THead>
        <TBody>
          {profiles.map((p) => {
            const supply = p.totalSupply.value;
            const supplyLabel =
              p.pegTarget === "EUR" && supply !== null
                ? `€${formatUsdCompact(supply).slice(1)}`
                : formatUsdCompact(supply);
            return (
              <TR key={p.slug}>
                <TD>
                  <div className="flex items-center gap-2">
                    {p.arbitrumPortalMetadata.isArbitrumNative && (
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-signal-400" />
                    )}
                    <Link
                      href={`/stablecoins/${p.slug}`}
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
                  <span className="font-mono text-xs text-ink-200">{p.symbol}</span>
                </TD>
                <TD>
                  <PegCell profile={p} />
                </TD>
                <TD className="text-right font-mono text-ink-50">{supplyLabel}</TD>
                <TD>
                  <Badge tone={p.pegTarget === "EUR" ? "neon" : "electric"}>{p.pegTarget}</Badge>
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
                        className={cn(
                          "inline-flex items-center gap-0.5 transition-colors hover:text-ink-50",
                        )}
                      >
                        portal
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
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
