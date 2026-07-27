import {
  dimmedNodeIds,
  firstDegree,
  groupByCategory,
  isEdgeDimmed,
  matchesSearch,
  neighborsOf,
  validateExplorerProps,
} from "@/lib/explorer/model";
import type { ExplorerCategory, ExplorerEdge, ExplorerNode } from "@/lib/explorer/types";

const categories: ExplorerCategory[] = [
  { id: "alpha", label: "Alpha", tone: "electric" },
  { id: "beta", label: "Beta", tone: "emerald" },
  { id: "strip", label: "Strip", tone: "slate", renderAs: "badges" },
];

const nodes: ExplorerNode[] = [
  { id: "center", label: "Center", categoryId: "alpha" },
  { id: "n1", label: "Node One", categoryId: "alpha", summary: "does lending" },
  { id: "n2", label: "Node Two", categoryId: "beta", badges: ["Risk curator"] },
  { id: "n3", label: "Distant", categoryId: "beta" },
];

const edges: ExplorerEdge[] = [
  { source: "center", target: "n1", categoryId: "alpha" },
  { source: "n2", target: "center", categoryId: "beta" },
  { source: "n2", target: "n3", categoryId: "beta" },
];

describe("explorer model helpers", () => {
  it("computes neighbors in both edge directions", () => {
    expect([...neighborsOf(edges, "center")].sort()).toEqual(["n1", "n2"]);
  });

  it("firstDegree excludes the center and non-neighbors", () => {
    const ids = firstDegree(nodes, edges, "center").map((n) => n.id);
    expect(ids.sort()).toEqual(["n1", "n2"]);
  });

  it("groups by category in taxonomy order and drops badge categories", () => {
    const groups = groupByCategory(nodes, categories);
    expect(groups.map((g) => g.category.id)).toEqual(["alpha", "beta"]);
    expect(groups[0].nodes.map((n) => n.id)).toEqual(["center", "n1"]);
  });

  it("matchesSearch hits label, summary, and badges; empty query matches all", () => {
    expect(matchesSearch(nodes[1], "one")).toBe(true);
    expect(matchesSearch(nodes[1], "lending")).toBe(true);
    expect(matchesSearch(nodes[2], "curator")).toBe(true);
    expect(matchesSearch(nodes[2], "zzz")).toBe(false);
    expect(matchesSearch(nodes[2], "  ")).toBe(true);
  });

  it("dims nodes by category and edges by category or endpoint", () => {
    const dimmedCats = new Set(["beta"]);
    const dimmed = dimmedNodeIds(nodes, dimmedCats);
    expect([...dimmed].sort()).toEqual(["n2", "n3"]);
    expect(isEdgeDimmed(edges[0], dimmedCats, dimmed)).toBe(false);
    expect(isEdgeDimmed(edges[1], dimmedCats, dimmed)).toBe(true);
    expect(isEdgeDimmed({ source: "center", target: "n1", categoryId: "beta" }, dimmedCats, dimmed)).toBe(true);
  });

  it("validateExplorerProps catches structural problems", () => {
    expect(validateExplorerProps({ centerId: "center", nodes, edges, categories })).toEqual([]);
    const problems = validateExplorerProps({
      centerId: "ghost",
      nodes: [...nodes, nodes[0]],
      edges: [
        ...edges,
        { source: "n1", target: "missing", categoryId: "alpha" },
        { source: "n1", target: "n1", categoryId: "nope" },
      ],
      categories,
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining("duplicate node id"),
        expect.stringContaining("centerId ghost"),
        expect.stringContaining("unknown target"),
        expect.stringContaining("unknown category nope"),
        expect.stringContaining("self loop"),
      ]),
    );
  });
});
