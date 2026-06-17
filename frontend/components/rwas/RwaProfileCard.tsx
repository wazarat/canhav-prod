import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import type { RwaProfile } from "@/lib/types";

function LinkRow({ label, href }: { label: string; href: string | null }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-200 transition-colors hover:bg-ink-800/50 hover:text-ink-50"
    >
      <span>{label}</span>
      <ArrowUpRight className="h-3.5 w-3.5 text-ink-300" />
    </a>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-ink-300">{label}</span>
      <span className="text-right text-sm font-medium text-ink-100">{value}</span>
    </div>
  );
}

export function RwaProfileCard({ profile }: { profile: RwaProfile }) {
  const meta = profile.arbitrumPortalMetadata;
  return (
    <div className="space-y-4">
      <Card className="space-y-1 divide-y divide-ink-800/60">
        <CardTitle className="pb-3">Metadata</CardTitle>
        <div className="pt-1">
          <MetaRow label="Asset class" value={<Badge tone="neon">{profile.assetClass}</Badge>} />
          <MetaRow label="Sub-category" value={meta.subCategory ?? "—"} />
          {profile.entitySlug && (
            <MetaRow
              label="Issuer"
              value={
                <Link
                  href={`/networks/${profile.entitySlug}`}
                  className="text-electric-400 hover:underline"
                >
                  View network
                </Link>
              }
            />
          )}
          <MetaRow label="Chains" value={meta.chains.length ? meta.chains.join(", ") : "—"} />
          <MetaRow
            label="Arbitrum native"
            value={
              meta.isArbitrumNative ? (
                <Badge tone="signal">Native</Badge>
              ) : (
                <span className="text-ink-300">No</span>
              )
            }
          />
          <MetaRow
            label="Live"
            value={meta.isLive ? <Badge tone="positive">Live</Badge> : <span className="text-ink-300">No</span>}
          />
          <MetaRow label="Founded" value={meta.foundedDate ?? "—"} />
        </div>
      </Card>

      <Card className="space-y-1">
        <CardTitle className="pb-2">Links</CardTitle>
        <div className="-mx-1">
          <LinkRow label="Website" href={profile.website} />
          <LinkRow label="Twitter / X" href={profile.twitter} />
          <LinkRow label="Discord / Telegram" href={profile.discord} />
          <LinkRow label="GitHub" href={profile.github} />
          <LinkRow label="CoinGecko" href={profile.coingecko} />
          <LinkRow label="Audit report" href={profile.auditUrl} />
          <LinkRow label="Arbitrum Portal" href={meta.portalUrl} />
          <LinkRow
            label="Contract (Arbiscan)"
            href={profile.contractAddress ? `https://arbiscan.io/token/${profile.contractAddress}` : null}
          />
        </div>
      </Card>
    </div>
  );
}
