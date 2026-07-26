import { LendingAssetCoveragePanel } from "@/components/networks/NetworkSections";
import { AssetCoverageSegments } from "@/components/networks/tabs/assetCoverage/AssetCoverageSegments";
import {
  AssetTableSegment,
  DeploymentSegment,
  GovernanceSegment,
  OracleSegment,
  RiskParamsSegment,
} from "@/components/networks/tabs/assetCoverage/CoverageSegments";
import { EntityStateBanner } from "@/components/networks/tabs/assetCoverage/EntityStateBanner";
import { InlineLinkText } from "@/components/shared/InlineLinkText";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataPanel } from "@/components/ui/DataPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  buildAssetRiskTableModel,
  buildCollateralComposition,
  buildCoverageSegments,
  resolveCoverageSegment,
  type CoverageSegmentId,
} from "@/lib/networks/assetRisk";
import type { NetworkProfile } from "@/lib/types";

function MemberCoinsCoveragePanel({ coins }: { coins: NetworkProfile["memberCoins"] }) {
  return (
    <DataPanel title="Member coins & supported assets">
      <div className="divide-y divide-ink-800/60">
        {coins.map((c) => (
          <div
            key={`${c.category}:${c.slug}`}
            className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
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

/**
 * Asset coverage tab, rebuilt for M6 (CAN-75/72/77). Exactly ONE source of
 * truth renders: the typed AssetCoverage block (six-segment UI + asset-risk
 * table) when present; else the legacy curated lending panel (parked Credit
 * entities); else, for non-Credit networks only, the member-coins list. The
 * duplicate-panel stacking and the memberCoins-as-coverage claim are gone.
 */
export function NetworkAssetCoverageTab({
  profile,
  seg,
}: {
  profile: NetworkProfile;
  seg?: string;
}) {
  const coverage = profile.assetCoverage;
  const creditAffiliated =
    profile.sector === "Credit" || profile.secondarySectors?.includes("Credit");

  if (coverage && (coverage.assets.length || coverage.oracles.length)) {
    const model = buildAssetRiskTableModel(coverage, profile.typedRisks, profile.slug);
    const segments = buildCoverageSegments(coverage, profile.lending);
    const activeSegment = resolveCoverageSegment(seg, segments);
    const composition = buildCollateralComposition(coverage);

    const firstAssetSegment = segments.find(
      (s) => s.id === "collateral" || s.id === "instruments",
    )?.id;

    const panels: Partial<Record<CoverageSegmentId, React.ReactNode>> = {};
    for (const segment of segments) {
      switch (segment.id) {
        case "collateral":
          panels.collateral = (
            <AssetTableSegment
              model={model}
              roleFilter="collateral"
              composition={firstAssetSegment === "collateral" ? composition : null}
              ariaLabel="Collateral assets with risk scores"
            />
          );
          break;
        case "loan":
          panels.loan = (
            <AssetTableSegment
              model={model}
              roleFilter="loan"
              ariaLabel="Loan assets with risk scores"
            />
          );
          break;
        case "instruments":
          panels.instruments = (
            <AssetTableSegment
              model={model}
              roleFilter="instruments"
              composition={firstAssetSegment === "instruments" ? composition : null}
              ariaLabel="Instruments with risk scores"
            />
          );
          break;
        case "oracles":
          panels.oracles = <OracleSegment coverage={coverage} entitySlug={profile.slug} />;
          break;
        case "risk-parameters":
          panels["risk-parameters"] = <RiskParamsSegment coverage={coverage} />;
          break;
        case "governance":
          panels.governance = profile.lending ? (
            <GovernanceSegment lending={profile.lending} />
          ) : null;
          break;
        case "deployment":
          panels.deployment = profile.lending ? (
            <DeploymentSegment lending={profile.lending} />
          ) : null;
          break;
      }
    }

    return (
      <div className="space-y-5 pt-6">
        <SectionHeading
          title="Asset coverage"
          subtitle="Curated asset listings joined to their typed risks, with oracles and parameters."
        />
        <EntityStateBanner slug={profile.slug} />
        {coverage.assetStrategy && (
          <Card>
            <p className="text-sm leading-relaxed text-ink-300">
              <InlineLinkText text={coverage.assetStrategy} glossary />
            </p>
          </Card>
        )}
        {activeSegment && (
          <AssetCoverageSegments
            segments={segments}
            initialSegment={activeSegment}
            panels={panels}
          />
        )}
        <p className="text-[11px] leading-relaxed text-ink-500">
          {coverage.curatedNote}
          {coverage.asOf ? ` Data as of ${coverage.asOf}.` : null}
        </p>
      </div>
    );
  }

  if (profile.lending) {
    return (
      <div className="space-y-6 pt-6">
        <SectionHeading
          title="Asset coverage"
          subtitle="Collateral, oracles, risk parameters, and deployment facts."
        />
        <LendingAssetCoveragePanel lending={profile.lending} />
      </div>
    );
  }

  if (!creditAffiliated && profile.memberCoins.length > 0) {
    return (
      <div className="space-y-6 pt-6">
        <SectionHeading
          title="Asset coverage"
          subtitle="Member coins and supported assets tracked for this network."
        />
        <MemberCoinsCoveragePanel coins={profile.memberCoins} />
      </div>
    );
  }

  return (
    <div className="pt-6">
      <Card className="text-sm text-ink-300">
        No asset coverage data is curated for this network yet.
      </Card>
    </div>
  );
}
