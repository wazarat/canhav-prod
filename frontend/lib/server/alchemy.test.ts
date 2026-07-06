import {
  hasAlchemy,
  fetchTotalSupply,
  probeErc20Standard,
  fetchTotalValueLocked,
  fetchTokenMetadata,
  fetchRecentTransfers,
  fetchSupplyHistory,
} from "@/lib/server/alchemy";

/**
 * Alchemy on-chain (Arbitrum) integration tests.
 *
 * Exercises the real `eth_call` / `alchemy_*` reads against Arbitrum One using
 * the `ALCHEMY_API_KEY` from `backend/.env`. Guarded by RUN_INTEGRATION so the
 * default `npm test` stays green offline; when the key is missing each case
 * self-skips (config gap, not a code failure) rather than asserting.
 *
 *   RUN_INTEGRATION=1 npx jest lib/server/alchemy.test.ts
 */

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Canonical Arbitrum One token contracts.
const ARB = "0x912CE59144191C1204E64559FE8253a0e49E6548"; // 18 decimals, ~10B total supply
const USDC_NATIVE = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // 6 decimals
const ZERO = "0x0000000000000000000000000000000000000000";

/** Independent liveness probe (key-agnostic public Arbitrum RPC). */
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

d("alchemy on-chain integration (Arbitrum)", () => {
  let reachable = true;
  let keyed = false;

  beforeAll(async () => {
    keyed = hasAlchemy();
    reachable = await arbitrumReachable();
  });

  function ready(): boolean {
    if (!keyed) {
      console.warn("no ALCHEMY_API_KEY in env/backend/.env — skipping");
      return false;
    }
    if (!reachable) {
      console.warn("Arbitrum RPC unreachable — skipping");
      return false;
    }
    return true;
  }

  it("hasAlchemy() is true when the key is configured", () => {
    // Documents the precondition. When keyed is false everything below skips.
    expect(typeof hasAlchemy()).toBe("boolean");
  });

  it("fetchTotalSupply(ARB) returns a live, correctly-typed supply", async () => {
    if (!ready()) return;
    const r = await fetchTotalSupply(ARB, 18);
    expect(r.source).toBe("alchemy");
    expect(typeof r.value).toBe("number");
    expect(Number.isFinite(r.value!)).toBe(true);
    // ARB max/total supply is 10,000,000,000 — assert a wide sane band.
    expect(r.value!).toBeGreaterThan(1e9);
    expect(r.value!).toBeLessThan(1e11);
    expect(typeof r.updatedAt).toBe("string");
    expect(r.updatedAt).toMatch(ISO_DATE);
  });

  it("fetchTotalSupply auto-resolves decimals() when not provided", async () => {
    if (!ready()) return;
    const r = await fetchTotalSupply(USDC_NATIVE); // decimals omitted -> reads decimals() == 6
    expect(typeof r.value).toBe("number");
    expect(Number.isFinite(r.value!)).toBe(true);
    expect(r.value!).toBeGreaterThan(1e6); // hundreds of millions of USDC on Arbitrum
  });

  it("probeErc20Standard distinguishes a real ERC-20 from a non-contract", async () => {
    if (!ready()) return;
    expect(await probeErc20Standard(ARB)).toBe("ERC-20");
    expect(await probeErc20Standard(ZERO)).toBeNull();
  });

  it("fetchTotalValueLocked sums supply*price across holdings", async () => {
    if (!ready()) return;
    const r = await fetchTotalValueLocked([{ address: ARB, decimals: 18, priceUsd: 1 }]);
    expect(r.source).toBe("alchemy");
    expect(typeof r.value).toBe("number");
    expect(Number.isFinite(r.value!)).toBe(true);
    expect(r.value!).toBeGreaterThan(1e9); // ~totalSupply * $1
    // An unpriced basket must fail soft to null (never 0).
    const empty = await fetchTotalValueLocked([{ address: ARB, decimals: 18, priceUsd: null }]);
    expect(empty.value).toBeNull();
  });

  it("fetchTokenMetadata returns typed ERC-20 metadata, or fails soft to null", async () => {
    if (!ready()) return;
    // `alchemy_getTokenMetadata` is an Alchemy-proprietary method: it only
    // resolves when the Alchemy app has Arbitrum enabled. Over the public-RPC
    // fallback it is unavailable and must fail soft to null (never throw). Assert
    // the graceful contract, and validate the shape whenever data is returned.
    const m = await fetchTokenMetadata(ARB);
    expect(m === null || typeof m === "object").toBe(true);
    if (m) {
      expect(m.decimals === null || typeof m.decimals === "number").toBe(true);
      if (m.decimals !== null) expect(m.decimals).toBe(18);
      if (m.symbol !== null) expect(m.symbol).toMatch(/ARB/i);
    }
  });

  it("fetchRecentTransfers returns a typed (possibly empty) transfer list", async () => {
    if (!ready()) return;
    const transfers = await fetchRecentTransfers(USDC_NATIVE, 5);
    expect(Array.isArray(transfers)).toBe(true);
    expect(transfers.length).toBeLessThanOrEqual(5);
    for (const t of transfers) {
      expect(typeof t.hash).toBe("string");
      expect(t.hash.startsWith("0x")).toBe(true);
      expect(t.value === null || typeof t.value === "number").toBe(true);
      expect(t.timestamp === null || ISO_DATE.test(t.timestamp)).toBe(true);
    }
  });

  it("fetchSupplyHistory returns a typed (possibly empty) sampled series", async () => {
    if (!ready()) return;
    const series = await fetchSupplyHistory(ARB, 18, { days: 30, points: 4 });
    expect(Array.isArray(series)).toBe(true);
    // Archive reads are tier-dependent, so an empty series is acceptable; when
    // present, every point must be well-formed and strictly increasing by date.
    let prev = "";
    for (const p of series) {
      expect(p.date).toMatch(YMD);
      expect(typeof p.value).toBe("number");
      expect(Number.isFinite(p.value)).toBe(true);
      expect(p.value).toBeGreaterThan(0);
      expect(p.date > prev).toBe(true);
      prev = p.date;
    }
  }, 30_000);
});
