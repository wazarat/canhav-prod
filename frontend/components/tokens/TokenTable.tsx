import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/stablecoins/StatusPill";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import type { EntityProfile, TokenProfile } from "@/lib/types";

interface TokenTableProps {
  profiles: TokenProfile[];
  entities?: EntityProfile[];
  showStatus?: boolean;
  emptyHint?: string;
}

export function TokenTable({
  profiles,
  entities = [],
  showStatus = false,
  emptyHint,
}: TokenTableProps) {
  const entityName = (slug: string | null | undefined) =>
    entities.find((e) => e.slug === slug)?.name ?? slug ?? null;
  if (profiles.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-ink-300">
        {emptyHint ?? "No tokens to display yet."}
      </div>
    );
  }

  return (
    <TableShell>
      <Table>
        <THead>
          <tr>
            <TH>Token</TH>
            <TH>Type</TH>
            <TH>Issuer</TH>
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
                    href={`/tokens/${p.slug}`}
                    className="font-medium text-ink-50 transition-colors hover:text-electric-400"
                  >
                    {p.name}
                  </Link>
                  <span className="font-mono text-xs text-ink-400">{p.symbol}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 max-w-[320px] text-xs text-ink-300">
                  {p.description}
                </p>
              </TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  <Badge tone="neon">{p.tokenType}</Badge>
                  {p.subCategory && <Badge tone="neutral">{p.subCategory}</Badge>}
                </div>
              </TD>
              <TD>
                {p.entitySlug ? (
                  <Link
                    href={`/entities/${p.entitySlug}`}
                    className="text-xs text-electric-400 hover:underline"
                  >
                    {entityName(p.entitySlug)}
                  </Link>
                ) : (
                  <span className="text-ink-400">—</span>
                )}
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
                  {p.coingecko && (
                    <a
                      href={p.coingecko}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 transition-colors hover:text-ink-50"
                    >
                      cg
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
