import { validateExplorerProps } from "@/lib/explorer/model";
import { buildCompetitorExplorerProps } from "@/lib/networks/competitorExplorerAdapter";
import { COMPETITOR_EDGES, COMPETITOR_NODES } from "@/lib/networks/creditCompetitorModel";

describe("buildCompetitorExplorerProps (second explorer data shape)", () => {
  it("maps the full M8 graph into a structurally valid explorer shape", () => {
    const props = buildCompetitorExplorerProps("aave");
    expect(props.nodes.length).toBe(Object.keys(COMPETITOR_NODES).length + 8); // +8 adjacency endpoints
    expect(props.edges.length).toBe(COMPETITOR_EDGES.length);
    expect(validateExplorerProps(props)).toEqual([]);
  });

  it("keeps M8 semantics: parent pair labelled, curators categorised, non-steady-state chipped", () => {
    const props = buildCompetitorExplorerProps("pendle");
    const boros = props.nodes.find((n) => n.id === "boros")!;
    expect(boros.badges).toContain("Built by pendle");
    const parentEdge = props.edges.find(
      (e) => [e.source, e.target].sort().join("|") === "boros|pendle",
    )!;
    expect(parentEdge.label).toBe("Same team and brand");
    const steakhouse = props.nodes.find((n) => n.id === "steakhouse-financial")!;
    expect(steakhouse.categoryId).toBe("risk-curator");
    const radiant = props.nodes.find((n) => n.id === "radiant")!;
    expect(radiant.statusChip?.label).toBe("Non-steady-state");
  });

  it("throws for slugs outside the competitor model", () => {
    expect(() => buildCompetitorExplorerProps("not-a-slug")).toThrow(/unknown competitor slug/);
  });
});
