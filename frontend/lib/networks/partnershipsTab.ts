import { ENTITY_STATUS_OVERRIDES } from "@/components/networks/research/entityStatus";
import type {
  ExplorerBadgeStrip,
  ExplorerCategory,
  ExplorerDetail,
  ExplorerEdge,
  ExplorerNode,
  ExplorerToneId,
} from "@/lib/explorer/types";
import { COMPETITOR_EDGES } from "@/lib/networks/creditCompetitorModel";
import { PARTNERSHIP_COVERED_SLUGS } from "@/lib/networks/creditPartnershipCoverage";
import {
  CHAIN_DEPLOYMENTS,
  PARTNER_NODES,
  PARTNERSHIP_EDGES,
  PARTNERSHIP_SELF_ROWS,
  PARTNERSHIP_TAXONOMY,
  type PartnershipCategory,
  type PartnershipEdge,
} from "@/lib/networks/creditPartnershipModel";
import { resolveSlugLogoUrl } from "@/lib/networks/entityLogo";
import type { NetworkProfile } from "@/lib/types";

/**
 * View model for the M9 Partnerships tab (CAN-86 / CAN-81): pure mapping
 * from the committed partnership model into the generic RelationshipExplorer
 * contract. Whole-sector node set with the current entity as center (the
 * CAN-86 comment decision); chain deployments arrive as a badge strip;
 * cluster grouping uses each node's strongest edge TO THE CENTER, so groups
 * describe "this partner's relationship with this entity".
 */

const CATEGORY_TONES: Record<PartnershipCategory, ExplorerToneId> = {
  integration_technical: "electric",
  liquidity_provider: "signal",
  oracle: "neon",
  custody: "amber",
  chain_deployment: "slate",
  institutional_tradfi: "emerald",
  security_audit: "rose",
  governance_dao: "fuchsia",
  grant_investment: "orange",
  distribution_frontend: "lime",
};

const CATEGORY_LABELS = new Map(PARTNERSHIP_TAXONOMY.map((c) => [c.id, c.label]));
const MAX_DETAIL_SECTIONS = 6;

/** M8 pairs that are simultaneously competitor and partner. */
const ALSO_PARTNER_PAIRS = new Set(
  COMPETITOR_EDGES.filter((e) => e.alsoPartner).map((e) => `${e.a}|${e.b}`),
);

export interface PartnershipsTabModel {
  /** null -> the caller renders the legacy PartnershipsSection. */
  explorer: {
    centerId: string;
    nodes: ExplorerNode[];
    edges: ExplorerEdge[];
    categories: ExplorerCategory[];
    badgeStrips: ExplorerBadgeStrip[];
    nodeIds: Set<string>;
  } | null;
  coveredCount: number;
}

export function isPartnershipCovered(slug: string): boolean {
  return PARTNERSHIP_COVERED_SLUGS.includes(slug);
}

function strongestEdge(edges: PartnershipEdge[]): PartnershipEdge | null {
  return edges.reduce<PartnershipEdge | null>(
    (best, e) => (best === null || e.weight > best.weight ? e : best),
    null,
  );
}

function statusChip(
  nodeSlug: string | undefined,
  centerEdges: PartnershipEdge[],
): ExplorerNode["statusChip"] {
  if (nodeSlug && ENTITY_STATUS_OVERRIDES[nodeSlug]) {
    const override = ENTITY_STATUS_OVERRIDES[nodeSlug];
    return { label: override.label, tone: override.tone === "neutral" ? "neutral" : "warning" };
  }
  if (centerEdges.length === 0) return undefined;
  const statuses = new Set(centerEdges.map((e) => e.status));
  if (statuses.has("active")) return undefined; // active is the default; no chip noise
  if (statuses.has("announced")) return { label: "Announced", tone: "warning" };
  return { label: "Deprecated", tone: "neutral" };
}

function edgeDetailSection(edge: PartnershipEdge, nodeId: string) {
  const otherId = edge.a === nodeId ? edge.b : edge.a;
  const otherName = PARTNER_NODES[otherId]?.name ?? otherId;
  const rows = edge.rows.map((row) => ({
    label: `${row.status}${row.startDate ? ` · since ${row.startDate}` : ""}${row.qualifier ? ` · ${row.qualifier}` : ""}`,
    value: row.sourceLabel,
    href: row.sourceUrl,
  }));
  return {
    heading: `${CATEGORY_LABELS.get(edge.category) ?? edge.category} · with ${otherName}`,
    categoryId: edge.category,
    rows,
    notes: edge.rows.map((row) => row.description),
  };
}

function buildDetail(nodeId: string, incident: PartnershipEdge[], centerId: string): ExplorerDetail {
  const node = PARTNER_NODES[nodeId];
  const sorted = [...incident].sort((x, y) => {
    const xCenter = x.a === centerId || x.b === centerId ? 0 : 1;
    const yCenter = y.a === centerId || y.b === centerId ? 0 : 1;
    return xCenter - yCenter || y.weight - x.weight;
  });
  const sections: ExplorerDetail["sections"] = sorted
    .slice(0, MAX_DETAIL_SECTIONS)
    .map((e) => edgeDetailSection(e, nodeId));
  if (sorted.length > MAX_DETAIL_SECTIONS) {
    sections.push({
      rows: [],
      notes: [
        `${sorted.length - MAX_DETAIL_SECTIONS} more evidenced relationship(s) across the Credit sector; open the partner's profile or the other entity's Partnerships tab for the rest.`,
      ],
    });
  }
  return {
    title: node?.name ?? nodeId,
    subtitle: node?.role === "risk_curator" ? "Risk curator (recurring across Credit)" : undefined,
    href: node?.slug ? `/networks/${node.slug}` : undefined,
    sections,
  };
}

export function buildPartnershipsTabModel(profile: NetworkProfile): PartnershipsTabModel {
  if (!isPartnershipCovered(profile.slug)) {
    return { explorer: null, coveredCount: PARTNERSHIP_COVERED_SLUGS.length };
  }

  const centerId = profile.slug;
  const incidentByNode = new Map<string, PartnershipEdge[]>();
  for (const edge of PARTNERSHIP_EDGES) {
    for (const end of [edge.a, edge.b]) {
      const list = incidentByNode.get(end) ?? [];
      list.push(edge);
      incidentByNode.set(end, list);
    }
  }

  const nodes: ExplorerNode[] = Object.values(PARTNER_NODES).map((node) => {
    const incident = incidentByNode.get(node.id) ?? [];
    const centerEdges = incident.filter((e) => e.a === centerId || e.b === centerId);
    const grouping = strongestEdge(centerEdges.length > 0 ? centerEdges : incident);
    const pairKey = node.slug ? [centerId, node.slug].sort().join("|") : null;
    const badges: string[] = [];
    if (node.role === "risk_curator") badges.push("Risk curator");
    if (pairKey && ALSO_PARTNER_PAIRS.has(pairKey)) badges.push("Also a competitor");
    const summarySource = strongestEdge(centerEdges) ?? strongestEdge(incident);
    return {
      id: node.id,
      label: node.name,
      categoryId: grouping?.category ?? "integration_technical",
      href: node.slug && node.slug !== centerId ? `/networks/${node.slug}` : undefined,
      iconUrl: node.slug ? (resolveSlugLogoUrl(node.slug) ?? undefined) : undefined,
      weight: node.weight,
      statusChip: node.id === centerId ? undefined : statusChip(node.slug, centerEdges),
      badges: badges.length > 0 ? badges : undefined,
      summary: summarySource?.rows[0]?.description,
      detail: buildDetail(node.id, incident, centerId),
    };
  });

  const edges: ExplorerEdge[] = PARTNERSHIP_EDGES.map((e) => ({
    source: e.a,
    target: e.b,
    categoryId: e.category,
    weight: e.weight,
    directed: e.direction !== "mutual",
    label: CATEGORY_LABELS.get(e.category),
  }));

  const categories: ExplorerCategory[] = PARTNERSHIP_TAXONOMY.map((c) => ({
    id: c.id,
    label: c.label,
    tone: CATEGORY_TONES[c.id],
    renderAs: c.id === "chain_deployment" ? ("badges" as const) : undefined,
  }));

  const badgeStrips: ExplorerBadgeStrip[] = [];
  const chains = CHAIN_DEPLOYMENTS[centerId] ?? [];
  if (chains.length > 0) {
    badgeStrips.push({
      heading: `Chain deployments (${chains.length})`,
      categoryId: "chain_deployment",
      items: chains.map((c) => ({
        label: c.chain,
        muted: c.status === "deprecated",
        title: `${c.status} · ${c.sourceLabel}`,
      })),
    });
  }
  const selfRows = PARTNERSHIP_SELF_ROWS.filter((r) => r.subject === centerId);
  if (selfRows.length > 0) {
    badgeStrips.push({
      heading: "Protocol infrastructure (own systems, not partnerships)",
      items: selfRows.map((r) => ({
        label: r.partnerName,
        muted: true,
        title: r.description,
      })),
    });
  }

  return {
    explorer: {
      centerId,
      nodes,
      edges,
      categories,
      badgeStrips,
      nodeIds: new Set(nodes.map((n) => n.id)),
    },
    coveredCount: PARTNERSHIP_COVERED_SLUGS.length,
  };
}
