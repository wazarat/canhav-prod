import {
  hasAave,
  isAaveReserveSlug,
  aTokenAddressForSlug,
  fetchReserveRates,
  fetchReserveRatesForSlug,
} from "@/lib/server/aave";
import { hasAlchemy } from "@/lib/server/alchemy";
import type { Address } from "viem";

/**
 * Aave V3 (Arbitrum) lending-rate integration tests.
 *
 * Reads `AaveProtocolDataProvider.getReserveData(asset)` on-chain (via the
 * Alchemy key in `backend/.env`, or the public-RPC fallback) and asserts the
 * ray->APY conversion + utilization are live, finite, and sanely bounded.
 * Guarded by RUN_INTEGRATION so `npm test` stays green offline.
 *
 *   RUN_INTEGRATION=1 npx jest lib/server/aave.test.ts
 */

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;
// GHO underlying on Arbitrum (pinned in aave.ts RESERVE_BY_SLUG).
const GHO_UNDERLYING = "0x7dfF72693f6A4149b17e7C6314655f6A9F7c8B33" as Address;

async function arbitrumReachable(): Promise<boolean> {
  try {
    const res = await fetch("https://arbitrum-one.publicnode.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    });
    const data = await res.json();
    return typeof data?.result === "string" && data.result.startsWith("0x");
  } catch {
    return false;
  }
}

function assertLendingMarket(m: {
  supplyApyPct: number | null;
  variableBorrowApyPct: number | null;
  utilizationPct: number | null;
  underlyingSymbol?: string | null;
  source: string;
  updatedAt: string | null;
}) {
  expect(m.source).toBe("aave");
  expect(typeof m.updatedAt).toBe("string");
  expect(m.updatedAt).toMatch(ISO_DATE);

  for (const rate of [m.supplyApyPct, m.variableBorrowApyPct]) {
    expect(typeof rate).toBe("number");
    expect(Number.isFinite(rate!)).toBe(true);
    expect(rate!).toBeGreaterThanOrEqual(0);
    expect(rate!).toBeLessThan(100); // APYs realistically well under 100%
  }
  expect(typeof m.utilizationPct).toBe("number");
  expect(Number.isFinite(m.utilizationPct!)).toBe(true);
  expect(m.utilizationPct!).toBeGreaterThanOrEqual(0);
  expect(m.utilizationPct!).toBeLessThanOrEqual(100);
}

describe("aave reserve slug mapping (pure, no network)", () => {
  it("maps member-coin reserve slugs, not the protocol slug", () => {
    expect(isAaveReserveSlug("ausdc")).toBe(true);
    expect(isAaveReserveSlug("ausdt")).toBe(true);
    expect(isAaveReserveSlug("aweth")).toBe(true);
    expect(isAaveReserveSlug("gho")).toBe(true);
    // The protocol-level "aave" slug is an aggregate, NOT a single reserve —
    // this is why the Aave *protocol* page shows no per-reserve APY/utilization.
    expect(isAaveReserveSlug("aave")).toBe(false);
    expect(aTokenAddressForSlug("ausdc")).toBeTruthy();
    expect(aTokenAddressForSlug("aave")).toBeNull();
  });

  it("fetchReserveRatesForSlug returns null for a non-reserve slug without any RPC", async () => {
    expect(await fetchReserveRatesForSlug("aave")).toBeNull();
    expect(await fetchReserveRatesForSlug("not-a-slug")).toBeNull();
  });
});

d("aave live reserve rates (Arbitrum)", () => {
  let reachable = true;

  beforeAll(async () => {
    reachable = await arbitrumReachable();
  });

  function ready(): boolean {
    if (!reachable) {
      console.warn("Arbitrum RPC unreachable — skipping");
      return false;
    }
    return true;
  }

  it("hasAave() is always true (key or public-RPC fallback)", () => {
    expect(hasAave()).toBe(true);
  });

  it("reads live rates for the aUSDC reserve via slug", async () => {
    if (!ready()) return;
    const m = await fetchReserveRatesForSlug("ausdc");
    expect(m).not.toBeNull();
    assertLendingMarket(m!);
    expect(typeof m!.underlyingSymbol === "string" || m!.underlyingSymbol === null).toBe(true);
  });

  it("reads live rates for the GHO reserve via slug", async () => {
    if (!ready()) return;
    const m = await fetchReserveRatesForSlug("gho");
    expect(m).not.toBeNull();
    assertLendingMarket(m!);
  });

  it("reads live rates for the aWETH reserve via slug", async () => {
    if (!ready()) return;
    const m = await fetchReserveRatesForSlug("aweth");
    expect(m).not.toBeNull();
    assertLendingMarket(m!);
  });

  it("reads live rates directly from a reserve underlying address", async () => {
    if (!ready()) return;
    const m = await fetchReserveRates(GHO_UNDERLYING, "GHO");
    expect(m).not.toBeNull();
    assertLendingMarket(m!);
    expect(m!.underlyingSymbol).toBe("GHO");
  });

  it("notes RPC configuration (key presence does not imply Arbitrum access)", () => {
    // Not a correctness assertion — a diagnostic. An Alchemy key may be present
    // yet lack Arbitrum access on its app, in which case the fallback transport
    // transparently serves these reads from the public Arbitrum RPC.
    console.info(
      `ALCHEMY_API_KEY ${hasAlchemy() ? "configured" : "absent"}; reads fall back to public Arbitrum RPC when the keyed endpoint errors.`,
    );
  });
});
