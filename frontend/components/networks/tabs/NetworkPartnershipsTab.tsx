import { PartnershipsSection } from "@/components/networks/NetworkSections";
import { EntityStateBanner } from "@/components/networks/tabs/assetCoverage/EntityStateBanner";
import { RelationshipExplorer } from "@/components/explorer/RelationshipExplorer";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { resolveExplorerNodeParam, resolveExplorerView } from "@/lib/explorer/params";
import type { ExplorerViewId } from "@/lib/explorer/types";
import { buildPartnershipsTabModel } from "@/lib/networks/partnershipsTab";
import { matchesSectorFilter } from "@/lib/networkTaxonomy";
import type { NetworkProfile } from "@/lib/types";

/**
 * M9 Partnerships tab (CAN-83/86/81). Credit entities covered by the
 * partnership dataset get the RelationshipExplorer (whole-sector graph,
 * current entity emphasised, chain deployments as a badge strip). Everything
 * else — non-Credit sectors and the uncovered Credit entities — keeps the
 * pre-M9 PartnershipsSection byte-identical.
 */
export function NetworkPartnershipsTab({
  profile,
  view,
  node,
}: {
  profile: NetworkProfile;
  view?: string;
  node?: string;
}) {
  const model = matchesSectorFilter(profile, "Credit")
    ? buildPartnershipsTabModel(profile)
    : null;

  if (!model?.explorer) {
    return (
      <div className="pt-6">
        <PartnershipsSection partnerships={profile.partnerships} />
      </div>
    );
  }

  const views: ExplorerViewId[] = ["clusters", "graph"];
  const initialView = resolveExplorerView(view, views);
  const initialSelectedId = resolveExplorerNodeParam(node, model.explorer.nodeIds);
  const { nodeIds: _nodeIds, ...explorerProps } = model.explorer;

  return (
    <div className="space-y-6 pt-6">
      <SectionHeading
        title="Partnerships"
        subtitle={`Evidenced relationships across the Credit sector (every row carries a fetched source). ${profile.name} is emphasised; the graph shows the whole covered sector because the cross-entity structure is the signal.`}
      />
      <EntityStateBanner slug={profile.slug} showParamsCaveat={false} />
      <RelationshipExplorer
        {...explorerProps}
        views={views}
        initialView={initialView}
        initialSelectedId={initialSelectedId}
        ariaLabel="Partnerships"
        searchPlaceholder="Search partners"
        emptyMessage="No partnership evidence recorded for this entity yet."
      />
    </div>
  );
}
