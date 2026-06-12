import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import type { IssuanceMeta } from "@/lib/types";

interface IssuanceMetaCardProps {
  meta: IssuanceMeta | null | undefined;
}

const MECHANISM_LABEL: Record<string, string> = {
  "fiat-backed": "Fiat-backed",
  "crypto-backed": "Crypto-backed",
  algorithmic: "Algorithmic",
};

/**
 * Issuance metadata from DeFi Llama's stablecoin index: how the peg is backed,
 * how units are minted/redeemed, and the issuer's published audits. Written to
 * the store by the daily cron; self-hides when nothing has been written.
 */
export function IssuanceMetaCard({ meta }: IssuanceMetaCardProps) {
  if (!meta) return null;
  const hasContent = meta.pegMechanism || meta.mintRedeemDescription || meta.auditLinks.length > 0;
  if (!hasContent) return null;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Issuance</CardTitle>
          <CardDescription className="mt-1">
            Backing &amp; mint/redeem mechanics per the issuer.
          </CardDescription>
        </div>
        <Badge tone="signal">DeFi Llama</Badge>
      </div>

      {meta.pegMechanism && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-300">Peg mechanism</span>
          <Badge tone="electric">{MECHANISM_LABEL[meta.pegMechanism] ?? meta.pegMechanism}</Badge>
        </div>
      )}

      {meta.mintRedeemDescription && (
        <p className="text-sm leading-relaxed text-ink-200">{meta.mintRedeemDescription}</p>
      )}

      {meta.auditLinks.length > 0 && (
        <div className="space-y-1 border-t border-ink-800/60 pt-3">
          <p className="text-xs uppercase tracking-wider text-ink-400">Published audits</p>
          {meta.auditLinks.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 truncate text-sm text-electric-400 hover:underline"
            >
              <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
