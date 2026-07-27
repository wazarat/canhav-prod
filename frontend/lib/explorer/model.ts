import type {
  ExplorerCategory,
  ExplorerEdge,
  ExplorerNode,
  RelationshipExplorerProps,
} from "@/lib/explorer/types";

/** Pure helpers for the relationship-explorer shell. No React. */

export function neighborsOf(edges: ExplorerEdge[], id: string): Set<string> {
  const out = new Set<string>();
  for (const e of edges) {
    if (e.source === id) out.add(e.target);
    else if (e.target === id) out.add(e.source);
  }
  return out;
}

/** The center node's first-degree neighborhood (excluding the center). */
export function firstDegree(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  centerId: string,
): ExplorerNode[] {
  const ids = neighborsOf(edges, centerId);
  return nodes.filter((n) => ids.has(n.id));
}

/** Group nodes by their primary category, in taxonomy order; empty
 * categories are kept (rendered as honest empty states by the consumer's
 * choice), `renderAs: "badges"` categories are excluded. */
export function groupByCategory(
  nodes: ExplorerNode[],
  categories: ExplorerCategory[],
): { category: ExplorerCategory; nodes: ExplorerNode[] }[] {
  return categories
    .filter((c) => c.renderAs !== "badges")
    .map((category) => ({
      category,
      nodes: nodes.filter((n) => n.categoryId === category.id),
    }));
}

export function matchesSearch(node: ExplorerNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    node.label.toLowerCase().includes(q) ||
    (node.summary?.toLowerCase().includes(q) ?? false) ||
    (node.badges?.some((b) => b.toLowerCase().includes(q)) ?? false)
  );
}

/** Category filtering DIMS rather than removes (CAN-86): returns the set of
 * node ids that should render dimmed given the dimmed category ids. Edges
 * dim when their category is dimmed or either endpoint is dimmed. */
export function dimmedNodeIds(
  nodes: ExplorerNode[],
  dimmedCategoryIds: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  if (dimmedCategoryIds.size === 0) return out;
  for (const n of nodes) if (dimmedCategoryIds.has(n.categoryId)) out.add(n.id);
  return out;
}

export function isEdgeDimmed(
  edge: ExplorerEdge,
  dimmedCategoryIds: ReadonlySet<string>,
  dimmedNodes: ReadonlySet<string>,
): boolean {
  return (
    dimmedCategoryIds.has(edge.categoryId) ||
    dimmedNodes.has(edge.source) ||
    dimmedNodes.has(edge.target)
  );
}

/** Structural validation shared by consumers and tests: duplicate node ids,
 * dangling edge endpoints, unknown categories, missing center. */
export function validateExplorerProps(
  props: Pick<RelationshipExplorerProps, "centerId" | "nodes" | "edges" | "categories">,
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const categoryIds = new Set(props.categories.map((c) => c.id));
  for (const node of props.nodes) {
    if (seen.has(node.id)) problems.push(`duplicate node id: ${node.id}`);
    seen.add(node.id);
    if (!categoryIds.has(node.categoryId)) {
      problems.push(`node ${node.id}: unknown category ${node.categoryId}`);
    }
  }
  if (!seen.has(props.centerId)) problems.push(`centerId ${props.centerId} not in nodes`);
  for (const edge of props.edges) {
    if (!seen.has(edge.source)) problems.push(`edge ${edge.source}->${edge.target}: unknown source`);
    if (!seen.has(edge.target)) problems.push(`edge ${edge.source}->${edge.target}: unknown target`);
    if (!categoryIds.has(edge.categoryId)) {
      problems.push(`edge ${edge.source}->${edge.target}: unknown category ${edge.categoryId}`);
    }
    if (edge.source === edge.target) problems.push(`edge ${edge.source}: self loop`);
  }
  return problems;
}
