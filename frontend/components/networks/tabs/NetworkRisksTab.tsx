import {
  ContagionHistorySection,
  DependenciesSection,
} from "@/components/networks/DependencySections";
import { RisksSection } from "@/components/networks/NetworkSections";
import { EntityStateBanner } from "@/components/networks/tabs/assetCoverage/EntityStateBanner";
import { hasRichIncidents, IncidentRail } from "@/components/networks/tabs/risks/IncidentRail";
import { RiskScorecard } from "@/components/networks/tabs/risks/RiskScorecard";
import { RisksViews } from "@/components/networks/tabs/risks/RisksViews";
import { InlineLinkText } from "@/components/shared/InlineLinkText";
import { TypedRiskList } from "@/components/shared/TypedRiskList";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buildRiskTabModel, resolveRiskView } from "@/lib/networks/riskTab";
import type { NetworkProfile } from "@/lib/types";

/**
 * M7 Risks tab (CAN-73/79/78). Rich path for entities whose TypedRisks carry
 * the dataset's likelihood/impact assessments (the 14 tagged Credit entities);
 * everyone else — the 8 M11-parked Credit entities, non-Credit networks —
 * keeps the pre-M7 composition verbatim. The gate is data-driven, never a
 * slug list.
 */
export function NetworkRisksTab({
  profile,
  view,
}: {
  profile: NetworkProfile;
  view?: string;
}) {
  const model = buildRiskTabModel(profile);

  if (!model) {
    return (
      <div className="space-y-6 pt-6">
        {profile.typedRisks ? (
          <TypedRiskList risks={profile.typedRisks} />
        ) : (
          <RisksSection risks={profile.risks} />
        )}
        <DependenciesSection dependencies={profile.dependencies} />
        <ContagionHistorySection incidents={profile.incidents} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <SectionHeading
        title="Risk profile"
        subtitle="Typed risks scored by severity, likelihood and impact, with the incident record behind them."
      />
      <EntityStateBanner slug={profile.slug} showParamsCaveat={false} />
      <RiskScorecard scorecard={model.scorecard} risks={model.risks} />
      {profile.riskPosture && (
        <Card>
          <p className="text-sm leading-relaxed text-ink-300">
            <InlineLinkText text={profile.riskPosture} glossary />
          </p>
        </Card>
      )}
      <RisksViews model={model} initialView={resolveRiskView(view)} />
      {hasRichIncidents(profile.incidents) ? (
        <IncidentRail incidents={profile.incidents!} />
      ) : (
        <ContagionHistorySection incidents={profile.incidents} />
      )}
      <DependenciesSection dependencies={profile.dependencies} />
    </div>
  );
}
