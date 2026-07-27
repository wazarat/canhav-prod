/**
 * Network entity page tab registry.
 * Canonical UI spec: docs/NETWORK_PAGE_UI.md (read before editing network pages).
 */

import { PARTNERSHIP_COVERED_SLUGS } from "@/lib/networks/creditPartnershipCoverage";
import type { NetworkProfile } from "@/lib/types";

export const NETWORK_TAB_IDS = [
  "overview",
  "metrics",
  "research",
  "asset-coverage",
  "risks",
  "competitors",
  "partnerships",
  "agent-skills",
] as const;

export type NetworkTabId = (typeof NETWORK_TAB_IDS)[number];

export interface NetworkTabDefinition {
  id: NetworkTabId;
  label: string;
}

const TAB_LABELS: Record<NetworkTabId, string> = {
  overview: "Overview",
  metrics: "Metrics",
  research: "Research",
  "asset-coverage": "Asset coverage",
  risks: "Risks",
  competitors: "Competitors",
  partnerships: "Partnerships",
  "agent-skills": "AI agent skills",
};

function hasResearchContent(profile: NetworkProfile): boolean {
  return (
    profile.components.length > 0 ||
    (profile.offchainFacts?.length ?? 0) > 0 ||
    profile.faq.length > 0 ||
    (profile.timeline?.length ?? 0) > 0 ||
    profile.events.length > 0 ||
    Boolean(profile.tokenomics) ||
    profile.orgStructure.length > 0 ||
    profile.investmentRounds.length > 0 ||
    profile.tradFiComparison.length > 0 ||
    Boolean(profile.bullBearCase) ||
    (profile.researchPublications?.length ?? 0) > 0
  );
}

/** M9: the 14 dataset-covered Credit entities get the explorer tab from the
 * COMMITTED model — no store/push dependency (gearbox had no tab before).
 * Non-Credit and uncovered entities keep the store-driven gate above. */
function hasPartnershipModelContent(profile: NetworkProfile): boolean {
  return (
    (profile.sector === "Credit" || (profile.secondarySectors?.includes("Credit") ?? false)) &&
    PARTNERSHIP_COVERED_SLUGS.includes(profile.slug)
  );
}

function hasMetricsContent(profile: NetworkProfile): boolean {
  return Boolean(
    // Credit-affiliated entities always have the live Credit rollup (CAN-59).
    profile.sector === "Credit" ||
      profile.secondarySectors?.includes("Credit") ||
      profile.lending ||
      profile.stablecoin ||
      profile.dex ||
      profile.rwa ||
      profile.staking ||
      profile.liquidity ||
      profile.derivatives ||
      profile.other ||
      profile.optionsVolume ||
      profile.openInterest ||
      profile.creditTagMetrics ||
      profile.stakingTagMetrics ||
      profile.liquidityTagMetrics ||
      profile.derivativesTagMetrics ||
      profile.otherTagMetrics ||
      profile.rwaTagMetrics ||
      profile.market ||
      profile.universalMetrics?.identity.raises?.value.length ||
      profile.universalMetrics?.identity.governanceIds?.value.length ||
      profile.universalMetrics?.treasuryUsd?.value != null,
  );
}

function lendingHasAssetCoverage(lending: NonNullable<NetworkProfile["lending"]>): boolean {
  return Boolean(
    lending.collateralAssets?.length ||
      lending.loanAssets?.length ||
      lending.stablecoinExposure?.length ||
      lending.stablecoinExposurePct != null ||
      lending.oracles?.length ||
      lending.riskParameters ||
      lending.liquidations ||
      lending.liquidations30d ||
      lending.badDebt ||
      lending.governanceActivity ||
      lending.governanceDetail ||
      lending.auditHistory ||
      lending.deployment,
  );
}

function hasAssetCoverageContent(profile: NetworkProfile): boolean {
  // M6 (CAN-75): the typed AssetCoverage block is the tab's source of truth.
  // sense deliberately has none (sunset Oct 2023) so its tab stays hidden.
  if (profile.assetCoverage?.assets.length || profile.assetCoverage?.oracles.length) {
    return true;
  }
  const creditAffiliated =
    profile.sector === "Credit" || profile.secondarySectors?.includes("Credit");
  if (creditAffiliated) {
    // Credit entities need GENUINE coverage data: a member-coin list is not
    // asset coverage (CAN-75), and creditTagMetrics.lending was the duplicate
    // source retired with the M6 rebuild. Parked entities keep their curated
    // legacy lending panel.
    return Boolean(profile.lending && lendingHasAssetCoverage(profile.lending));
  }
  // Non-Credit networks surface their supported assets via member coins (the
  // network's own token(s) + supported assets/markets) — unchanged by M6.
  return profile.memberCoins.length > 0;
}

function hasRisksContent(profile: NetworkProfile): boolean {
  return (
    (profile.typedRisks?.length ?? 0) > 0 ||
    profile.risks.length > 0 ||
    (profile.dependencies?.length ?? 0) > 0 ||
    (profile.incidents?.length ?? 0) > 0
  );
}

/** Tabs visible for this network profile (always includes overview + agent-skills). */
export function buildNetworkTabs(profile: NetworkProfile): NetworkTabDefinition[] {
  const tabs: NetworkTabDefinition[] = [{ id: "overview", label: TAB_LABELS.overview }];

  if (hasMetricsContent(profile)) {
    tabs.push({ id: "metrics", label: TAB_LABELS.metrics });
  }
  if (hasResearchContent(profile)) {
    tabs.push({ id: "research", label: TAB_LABELS.research });
  }
  if (hasAssetCoverageContent(profile)) {
    tabs.push({ id: "asset-coverage", label: TAB_LABELS["asset-coverage"] });
  }
  if (hasRisksContent(profile)) {
    tabs.push({ id: "risks", label: TAB_LABELS.risks });
  }
  if ((profile.competitors?.length ?? 0) > 0) {
    tabs.push({ id: "competitors", label: TAB_LABELS.competitors });
  }
  if (profile.partnerships.length > 0 || hasPartnershipModelContent(profile)) {
    tabs.push({ id: "partnerships", label: TAB_LABELS.partnerships });
  }
  tabs.push({ id: "agent-skills", label: TAB_LABELS["agent-skills"] });

  return tabs;
}

export function isNetworkTabId(value: string | undefined): value is NetworkTabId {
  return NETWORK_TAB_IDS.includes(value as NetworkTabId);
}

/** Resolve URL tab param to a valid tab for this profile (fallback: overview). */
export function resolveNetworkTab(
  rawTab: string | undefined,
  profile: NetworkProfile,
): NetworkTabId {
  const available = buildNetworkTabs(profile);
  const ids = new Set(available.map((t) => t.id));
  if (rawTab && isNetworkTabId(rawTab) && ids.has(rawTab)) {
    return rawTab;
  }
  return "overview";
}
