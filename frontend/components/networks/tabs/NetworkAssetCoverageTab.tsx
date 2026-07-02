import { LendingAssetCoveragePanel } from "@/components/networks/NetworkSections";
import { Badge } from "@/components/ui/Badge";
import { DataPanel } from "@/components/ui/DataPanel";
import { Card } from "@/components/ui/Card";
import type { NetworkProfile } from "@/lib/types";

function TagLendingCoveragePanel({
  metrics,
}: {
  metrics: NonNullable<NonNullable<NetworkProfile["creditTagMetrics"]>["lending"]>;
}) {
  return (
    <DataPanel title="Tag-specific lending coverage">
      <div className="divide-y divide-ink-800/60">
        {metrics.isolatedMarketCount != null && (
          <div className="py-3 first:pt-0 last:pb-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Isolated markets
            </p>
            <p className="mt-1 text-sm text-ink-300">{metrics.isolatedMarketCount}</p>
          </div>
        )}
        {metrics.collateralAssets?.length ? (
          <div className="py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Collateral assets
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {metrics.collateralAssets.map((c) => (
                <Badge key={c} tone="neutral">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        {metrics.oracles?.length ? (
          <div className="py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Oracles</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {metrics.oracles.map((o) => (
                <Badge key={o} tone="neutral">
                  {o}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </DataPanel>
  );
}

function MemberCoinsCoveragePanel({ coins }: { coins: NetworkProfile["memberCoins"] }) {
  return (
    <DataPanel title="Member coins & supported assets">
      <div className="divide-y divide-ink-800/60">
        {coins.map((c) => (
          <div key={`${c.category}:${c.slug}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-ink-100">
                {c.name}
                {c.symbol ? <span className="ml-1.5 text-ink-400">{c.symbol}</span> : null}
              </p>
              {c.role ? <p className="mt-0.5 text-xs text-ink-400">{c.role}</p> : null}
            </div>
            <Badge tone="neutral">{c.category}</Badge>
          </div>
        ))}
      </div>
    </DataPanel>
  );
}

export function NetworkAssetCoverageTab({ profile }: { profile: NetworkProfile }) {
  const tagLending = profile.creditTagMetrics?.lending;
  const hasLending = Boolean(profile.lending);
  const hasTagLending = Boolean(
    tagLending &&
      (tagLending.collateralAssets?.length ||
        tagLending.oracles?.length ||
        tagLending.isolatedMarketCount != null),
  );
  const hasMemberCoins = profile.memberCoins.length > 0;

  if (!hasLending && !hasTagLending && !hasMemberCoins) {
    return (
      <div className="pt-6">
        <Card className="text-sm text-ink-300">
          No asset coverage data is curated for this network yet.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          Asset coverage
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          Collateral, oracles, risk parameters, and deployment facts.
        </p>
      </div>
      {profile.lending && <LendingAssetCoveragePanel lending={profile.lending} />}
      {tagLending && hasTagLending && <TagLendingCoveragePanel metrics={tagLending} />}
      {hasMemberCoins && <MemberCoinsCoveragePanel coins={profile.memberCoins} />}
    </div>
  );
}
