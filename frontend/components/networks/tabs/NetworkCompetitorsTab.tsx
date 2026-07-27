import { CompetitorsSection } from "@/components/networks/NetworkSections";
import { EntityStateBanner } from "@/components/networks/tabs/assetCoverage/EntityStateBanner";
import { CompetitorsViews } from "@/components/networks/tabs/competitors/CompetitorsViews";
import { ComparisonPicker } from "@/components/networks/tabs/competitors/ComparisonPicker";
import { PercentileBars } from "@/components/networks/tabs/competitors/PercentileBars";
import { PositioningQuadrant } from "@/components/networks/tabs/competitors/PositioningQuadrant";
import { TierAList } from "@/components/networks/tabs/competitors/TierAList";
import { TierBList } from "@/components/networks/tabs/competitors/TierBList";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getApprovedNetworks } from "@/lib/data";
import {
  buildCompetitorsTabModel,
  resolveAxesParam,
  resolveCompetitorsView,
  resolvePeersParam,
  type CompetitorsViewId,
} from "@/lib/networks/competitorsTab";
import { TAG_COHORTS } from "@/lib/networks/creditCompetitorModel";
import { matchesSectorFilter } from "@/lib/networkTaxonomy";
import type { NetworkProfile } from "@/lib/types";

/**
 * M8 Competitors tab (CAN-84/87/89). Credit-affiliated entities get the
 * two-tier model: Tier A grouped and clickable with comparables, Tier B
 * visibly not clickable, percentile bars vs the committed tag cohort, the
 * capped comparison picker, and the optional positioning quadrant. Non-Credit
 * entities keep the pre-M8 CompetitorsSection byte-identical.
 */
export async function NetworkCompetitorsTab({
  profile,
  view,
  peers,
  axes,
}: {
  profile: NetworkProfile;
  view?: string;
  peers?: string;
  axes?: string;
}) {
  if (!matchesSectorFilter(profile, "Credit")) {
    return (
      <div className="pt-6">
        <CompetitorsSection competitors={profile.competitors} networkName={profile.name} />
      </div>
    );
  }

  const allNetworks = await getApprovedNetworks();
  const model = buildCompetitorsTabModel(profile, allNetworks);
  const cohort = model.tag ? TAG_COHORTS[model.tag] : [];
  const activeView = resolveCompetitorsView(view);
  const initialPeers = resolvePeersParam(peers, cohort, profile.slug);
  const initialAxes = resolveAxesParam(axes);
  const hasCompare = model.compareSelf != null && model.pickerCandidates.length > 0;
  const hasMap = (model.quadrants ?? []).length > 0;

  const listPanel = (
    <div className="space-y-4">
      <TierAList
        sameTag={model.tierA.sameTag}
        otherCredit={model.tierA.otherCredit}
        adjacent={model.tierA.adjacent}
        tagLabel={model.tag}
      />
      <TierBList rows={model.tierB} tagLabel={model.tag} />
    </div>
  );

  const panels: { id: CompetitorsViewId; node: React.ReactNode }[] = [
    { id: "list", node: listPanel },
  ];
  if (hasCompare) {
    panels.push({
      id: "compare",
      node: (
        <ComparisonPicker
          self={model.compareSelf!}
          candidates={model.pickerCandidates}
          columns={model.compareColumns}
          initialPeers={initialPeers}
        />
      ),
    });
  }
  if (hasMap) {
    panels.push({
      id: "map",
      node: <PositioningQuadrant quadrants={model.quadrants!} initialAxes={initialAxes} />,
    });
  }

  const resolvedView =
    (activeView === "compare" && !hasCompare) || (activeView === "map" && !hasMap)
      ? "list"
      : activeView;

  return (
    <div className="space-y-6 pt-6">
      <SectionHeading
        title="Competitors"
        subtitle={
          model.tag
            ? `Two-tier competitive set for a ${model.tag} entity: on-platform peers are clickable and comparable, off-platform names are context only.`
            : "On-platform Credit relationships for an entity outside the tagged cohorts."
        }
      />
      <EntityStateBanner slug={profile.slug} showParamsCaveat={false} />
      {(model.selfNode?.entityType === "risk-curator" ||
        model.selfNode?.tagFit === "partial" ||
        model.selfNode?.parentSlug ||
        profile.auditsNote) && (
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {model.selfNode?.entityType === "risk-curator" && (
              <Badge tone="electric">Risk curator</Badge>
            )}
            {model.selfNode?.tagFit === "partial" && (
              <Badge tone="warning">Provisional tag fit</Badge>
            )}
            {model.selfNode?.parentSlug && (
              <Badge tone="neon">
                {`Built by ${model.selfNode.parentSlug === "pendle" ? "Pendle Labs" : model.selfNode.parentSlug}`}
              </Badge>
            )}
          </div>
          {model.selfNode?.dataQualityFlags?.map((flag) => (
            <p key={flag} className="text-xs leading-relaxed text-amber-200/80">
              {flag}
            </p>
          ))}
          {profile.auditsNote && (
            <p className="text-xs leading-relaxed text-ink-300">{profile.auditsNote}</p>
          )}
        </Card>
      )}
      {model.percentiles && model.tag && (
        <PercentileBars
          rows={model.percentiles}
          tagLabel={model.tag}
          cohortSize={model.cohortSize}
          asOf={model.percentilesAsOf}
        />
      )}
      {panels.length > 1 ? (
        <CompetitorsViews initialView={resolvedView} hasMap={hasMap} panels={panels} />
      ) : (
        listPanel
      )}
    </div>
  );
}
