import type {
  ExplorerCategory,
  ExplorerEdge,
  ExplorerNode,
  ExplorerToneId,
} from "@/lib/explorer/types";
import {
  COMPETITOR_EDGES,
  COMPETITOR_NODES,
  type CreditCompetitorTag,
} from "@/lib/networks/creditCompetitorModel";
import { resolveSlugLogoUrl } from "@/lib/networks/entityLogo";

/**
 * Second RelationshipExplorer consumer (the CAN-83 "two different data
 * shapes" DoD): the M8 competitor graph mapped into the generic contract.
 * The shipped M8 Competitors tab keeps its bespoke views — this adapter
 * proves the abstraction and powers the dev demo page. Tier B is excluded
 * (off-platform rows have no node identity by design).
 */

const TAG_TONES: Record<CreditCompetitorTag, ExplorerToneId> = {
  Lending: "electric",
  "Leveraged Yield": "signal",
  "Fixed Income": "neon",
};

const CURATOR_CATEGORY = "risk-curator";
const ADJACENT_CATEGORY = "adjacent";

/** Edge endpoints outside the 32-node model: the M8 adjacency set (sky,
 * centrifuge, clearpool, goldfinch) + the untagged Credit-primary four. */
const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function buildCompetitorExplorerProps(centerSlug: string): {
  centerId: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  categories: ExplorerCategory[];
} {
  if (!COMPETITOR_NODES[centerSlug]) {
    throw new Error(`unknown competitor slug: ${centerSlug}`);
  }

  const categories: ExplorerCategory[] = [
    ...(Object.keys(TAG_TONES) as CreditCompetitorTag[]).map((tag) => ({
      id: tag,
      label: tag,
      tone: TAG_TONES[tag],
    })),
    { id: CURATOR_CATEGORY, label: "Risk curator", tone: "amber" as const },
    { id: ADJACENT_CATEGORY, label: "Adjacent Credit", tone: "slate" as const },
  ];

  const adjacentSlugs = new Set<string>();
  for (const e of COMPETITOR_EDGES) {
    if (!COMPETITOR_NODES[e.a]) adjacentSlugs.add(e.a);
    if (!COMPETITOR_NODES[e.b]) adjacentSlugs.add(e.b);
  }

  const nodes: ExplorerNode[] = Object.values(COMPETITOR_NODES).map((node) => {
    const badges: string[] = [];
    if (node.tagFit === "partial") badges.push("Provisional tag fit");
    if (node.parentSlug) badges.push(`Built by ${node.parentSlug}`);
    return {
      id: node.slug,
      label: node.name,
      categoryId: node.entityType === "risk-curator" ? CURATOR_CATEGORY : node.tag,
      href: node.slug === centerSlug ? undefined : `/networks/${node.slug}`,
      iconUrl: resolveSlugLogoUrl(node.slug) ?? undefined,
      weight: node.nonSteadyState ? 0.3 : 0.6,
      statusChip: node.nonSteadyState ? { label: "Non-steady-state", tone: "warning" as const } : undefined,
      badges: badges.length > 0 ? badges : undefined,
      summary: `${node.tag} · ${node.entityType}${node.auditStatus === "unverified" ? " · audits unverified" : ""}`,
      detail: {
        title: node.name,
        subtitle: `${node.tag} cohort · ${node.entityType}`,
        href: `/networks/${node.slug}`,
        sections: [
          {
            rows: [
              { label: "Audit status", value: node.auditStatus },
              ...(node.parentSlug ? [{ label: "Parent", value: node.parentSlug }] : []),
            ],
            notes: node.dataQualityFlags,
          },
        ],
      },
    };
  });

  for (const slug of [...adjacentSlugs].sort()) {
    nodes.push({
      id: slug,
      label: titleCase(slug),
      categoryId: ADJACENT_CATEGORY,
      href: slug === centerSlug ? undefined : `/networks/${slug}`,
      iconUrl: resolveSlugLogoUrl(slug) ?? undefined,
      weight: 0.35,
      summary: "Adjacent Credit entity (outside the tagged cohorts)",
    });
  }

  const edges: ExplorerEdge[] = COMPETITOR_EDGES.map((e) => ({
    source: e.a,
    target: e.b,
    // Cross-tag edges take a's tag (arbitrary but stable); curator edges get
    // their own colour; edges touching the adjacency set read as adjacent.
    categoryId:
      COMPETITOR_NODES[e.a]?.entityType === "risk-curator" ||
      COMPETITOR_NODES[e.b]?.entityType === "risk-curator"
        ? CURATOR_CATEGORY
        : !COMPETITOR_NODES[e.a] || !COMPETITOR_NODES[e.b]
          ? ADJACENT_CATEGORY
          : COMPETITOR_NODES[e.a].tag,
    weight: e.sharedParent ? 1 : e.alsoPartner ? 0.7 : e.sharedTag ? 0.5 : 0.35,
    label: e.sharedParent ? "Same team and brand" : e.alsoPartner ? "Also a partner" : undefined,
  }));

  return { centerId: centerSlug, nodes, edges, categories };
}
