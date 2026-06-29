import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ReceiptTypeBadge } from "@/components/shared/ReceiptTypeBadge";
import { Badge } from "@/components/ui/Badge";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import type { NetworkProfile, ReceiptProfile } from "@/lib/types";
import { formatPct, formatUsdCompact } from "@/lib/utils";

interface ReceiptTableProps {
  profiles: ReceiptProfile[];
  entities?: NetworkProfile[];
  emptyHint?: string;
}

export function ReceiptTable({
  profiles,
  entities = [],
  emptyHint,
}: ReceiptTableProps) {
  const entityName = (slug: string | null | undefined) =>
    entities.find((e) => e.slug === slug)?.name ?? slug ?? null;

  if (profiles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-700/60 px-6 py-10 text-center text-sm text-ink-400">
        {emptyHint ?? "No receipt tokens in the store yet."}
      </p>
    );
  }

  return (
    <TableShell>
      <Table>
        <THead>
          <TR>
            <TH>Receipt</TH>
            <TH>Type</TH>
            <TH>Network</TH>
            <TH className="text-right">Underlying TVL</TH>
            <TH className="text-right">APR</TH>
            <TH className="w-8" />
          </TR>
        </THead>
        <TBody>
          {profiles.map((p) => (
            <TR key={p.slug}>
              <TD>
                <div className="font-medium text-ink-50">{p.symbol}</div>
                <div className="text-xs text-ink-400 line-clamp-1">{p.name}</div>
              </TD>
              <TD>
                <ReceiptTypeBadge receiptType={p.receiptType} />
              </TD>
              <TD className="text-ink-300">{entityName(p.entitySlug) ?? "—"}</TD>
              <TD className="text-right font-mono text-ink-50">
                {formatUsdCompact(p.underlyingTvlUsd ?? p.aumUsd ?? null)}
              </TD>
              <TD className="text-right font-mono text-ink-50">
                {p.apr != null ? formatPct(p.apr) : "—"}
              </TD>
              <TD>
                <Link
                  href={`/receipts/${p.slug}`}
                  className="inline-flex text-ink-400 transition-colors hover:text-electric-400"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableShell>
  );
}
