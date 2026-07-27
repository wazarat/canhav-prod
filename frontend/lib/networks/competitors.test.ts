import { deriveCompetitors } from "@/lib/networks/competitors";
import type { NetworkProfile } from "@/lib/types";

/**
 * Regression tests for the M8 sharesSectorTag fix: a zero-tag PEER no longer
 * auto-matches a tagged profile (pre-M8 this put justlend/venus/kamino on
 * every tagged Credit page), while a zero-tag PROFILE keeps its own auto
 * peers and non-Credit sectors keep their behavior.
 */

const p = (slug: string, extra?: Partial<NetworkProfile>): NetworkProfile =>
  ({
    slug,
    name: slug,
    description: "",
    tagline: "",
    competitors: [],
    currentScale: { tvlUsd: null },
    ...extra,
  }) as NetworkProfile;

describe("deriveCompetitors zero-tag behavior", () => {
  const tagged = p("gearbox", { sector: "Credit", tags: ["Leveraged Yield"] });
  const taggedPeer = p("stella", { sector: "Credit", tags: ["Leveraged Yield"] });
  const untaggedPeer = p("venus", { sector: "Credit", tags: [] });

  it("does not add a zero-tag peer to a tagged profile", () => {
    const rows = deriveCompetitors(tagged, [tagged, taggedPeer, untaggedPeer]);
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain("stella");
    expect(slugs).not.toContain("venus");
  });

  it("still auto-matches sector peers for a zero-tag profile", () => {
    const rows = deriveCompetitors(untaggedPeer, [tagged, taggedPeer, untaggedPeer]);
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain("gearbox");
    expect(slugs).toContain("stella");
  });

  it("keeps non-Credit sectors with no tag taxonomy matching each other", () => {
    const lido = p("lido", { sector: "Staking" });
    const rocket = p("rocket-pool", { sector: "Staking" });
    const rows = deriveCompetitors(lido, [lido, rocket]);
    expect(rows.map((r) => r.slug)).toContain("rocket-pool");
  });

  it("preserves curated rows and ranks them first", () => {
    const curated = p("gearbox", {
      sector: "Credit",
      tags: ["Leveraged Yield"],
      competitors: [
        {
          rank: 1,
          name: "Stella",
          slug: "stella",
          positioning: "x",
          similarities: "y",
          differences: "z",
        },
      ],
    });
    const rows = deriveCompetitors(curated, [curated, taggedPeer]);
    expect(rows[0].slug).toBe("stella");
    expect(rows[0].similarities).toBe("y");
  });
});
