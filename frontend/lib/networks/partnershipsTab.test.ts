import { validateExplorerProps } from "@/lib/explorer/model";
import { PARTNERSHIP_COVERED_SLUGS } from "@/lib/networks/creditPartnershipCoverage";
import {
  PARTNER_NODES,
  PARTNERSHIP_EDGES,
  PARTNERSHIP_ROW_TOTAL,
} from "@/lib/networks/creditPartnershipModel";
import { buildPartnershipsTabModel, isPartnershipCovered } from "@/lib/networks/partnershipsTab";
import type { NetworkProfile } from "@/lib/types";

const profileFor = (slug: string): NetworkProfile =>
  ({ slug, name: slug, sector: "Credit", secondarySectors: [], partnerships: [] }) as unknown as NetworkProfile;

describe("buildPartnershipsTabModel", () => {
  it("covers exactly the 14 dataset subjects", () => {
    expect(PARTNERSHIP_COVERED_SLUGS).toHaveLength(14);
    expect(isPartnershipCovered("gearbox")).toBe(true);
    expect(isPartnershipCovered("kamino")).toBe(false);
    expect(PARTNERSHIP_ROW_TOTAL).toBe(687);
  });

  it("returns null explorer for uncovered slugs (legacy branch)", () => {
    expect(buildPartnershipsTabModel(profileFor("kamino")).explorer).toBeNull();
    expect(buildPartnershipsTabModel(profileFor("usd-ai")).explorer).toBeNull();
  });

  it("builds a structurally valid whole-sector explorer for gearbox", () => {
    const model = buildPartnershipsTabModel(profileFor("gearbox"));
    expect(model.explorer).not.toBeNull();
    const explorer = model.explorer!;
    expect(explorer.centerId).toBe("gearbox");
    // Whole sector, not first degree only (the CAN-86 comment decision).
    expect(explorer.nodes.length).toBe(Object.keys(PARTNER_NODES).length);
    expect(explorer.edges.length).toBe(PARTNERSHIP_EDGES.length);
    expect(
      validateExplorerProps({
        centerId: explorer.centerId,
        nodes: explorer.nodes,
        edges: explorer.edges,
        categories: explorer.categories,
      }),
    ).toEqual([]);
  });

  it("cross-links on-platform partners and never links the center to itself", () => {
    const explorer = buildPartnershipsTabModel(profileFor("gearbox")).explorer!;
    const byId = new Map(explorer.nodes.map((n) => [n.id, n]));
    expect(byId.get("aave")?.href).toBe("/networks/aave");
    expect(byId.get("gearbox")?.href).toBeUndefined();
    expect(byId.get("chainlink")?.href).toBeUndefined(); // off-platform: no page
  });

  it("chain deployments arrive as a badge strip, never as nodes", () => {
    const explorer = buildPartnershipsTabModel(profileFor("gearbox")).explorer!;
    const strip = explorer.badgeStrips.find((s) => s.categoryId === "chain_deployment");
    expect(strip).toBeDefined();
    expect(strip!.items.length).toBe(11);
    expect(explorer.nodes.some((n) => n.label === "Ethereum")).toBe(false);
    const chainCat = explorer.categories.find((c) => c.id === "chain_deployment");
    expect(chainCat?.renderAs).toBe("badges");
  });

  it("marks curators, also-a-competitor pairs, and non-steady-state entities", () => {
    const explorer = buildPartnershipsTabModel(profileFor("morpho")).explorer!;
    const byId = new Map(explorer.nodes.map((n) => [n.id, n]));
    expect(byId.get("gauntlet")?.badges).toContain("Risk curator");
    expect(byId.get("steakhouse-financial")?.badges).toContain("Risk curator");
    // morpho|maple is an M8 alsoPartner pair.
    expect(byId.get("maple")?.badges).toContain("Also a competitor");
    // radiant carries its wind-down chip from ENTITY_STATUS_OVERRIDES.
    expect(byId.get("radiant")?.statusChip?.label).toBe("Winding down");
  });

  it("caps detail sections and keeps every row sourced", () => {
    const explorer = buildPartnershipsTabModel(profileFor("aave")).explorer!;
    const chainlink = explorer.nodes.find((n) => n.id === "chainlink")!;
    expect(chainlink.detail!.sections.length).toBeLessThanOrEqual(7); // 6 + overflow note
    for (const section of chainlink.detail!.sections) {
      for (const row of section.rows) {
        expect(row.href).toMatch(/^https?:\/\//);
      }
    }
  });
});
