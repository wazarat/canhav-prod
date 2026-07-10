/**
 * FHE Phase-1 seam invariants. The critical one: an encrypted envelope must
 * survive the full-list fromJson→toJson rewrite that updateTradeProposalStatus
 * performs on every reject/execute — losing it would destroy the ciphertext
 * handle and orphan the proposal.
 */
import {
  microToUsd30,
  plainUsd,
  plainUsdOrNull,
  requirePlainUsd,
  tradeProposalFromJson,
  tradeProposalToJson,
  usd30ToMicro,
  type EncryptedUsdCipherJson,
  type TradeProposal,
  type TradeProposalJson,
} from "./types";

const baseProposal: Omit<TradeProposal, "sizeUsd"> = {
  asset: "ETH",
  side: "long",
  leverage: 2,
  collateralToken: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
  verdictRef: "combined:verdict:ETH@2026-07-10",
  createdAt: "2026-07-10T12:00:00.000Z",
  id: "tp_abc123",
  status: "proposed",
  gmxTarget: "0x0000000000000000000000000000000000000001",
};

const envelope: EncryptedUsdCipherJson = {
  v: 1,
  alg: "cofhe-euint64-micro",
  ctHash: "12866188120474136660628945834260843623056596666025190504829155168124883467429",
  securityZone: 0,
  utype: 5,
  signature: "0x007a5074c1d7969cdeadbeef",
  registerTxHash: `0x${"ab".repeat(32)}` as `0x${string}`,
};

describe("EncryptedUsd seam", () => {
  test("plaintext proposal round-trips unchanged", () => {
    const proposal: TradeProposal = { ...baseProposal, sizeUsd: plainUsd(10n * 10n ** 30n) };
    const json = tradeProposalToJson(proposal);
    expect(json.sizeUsd).toBe((10n * 10n ** 30n).toString());
    expect(json.sizeUsdEnc).toBeUndefined();
    expect(tradeProposalFromJson(json)).toEqual(proposal);
  });

  test("legacy stored JSON (no sizeUsdEnc field) parses as plain", () => {
    const legacy = {
      ...baseProposal,
      sizeUsd: "5000000000000000000000000000000",
    } as TradeProposalJson;
    const parsed = tradeProposalFromJson(legacy);
    expect(plainUsdOrNull(parsed.sizeUsd)).toBe(5n * 10n ** 30n);
  });

  test("encrypted proposal stores the 0 sentinel + envelope, never plaintext", () => {
    const proposal = tradeProposalFromJson({
      ...baseProposal,
      sizeUsd: "0",
      sizeUsdEnc: envelope,
    });
    expect(proposal.sizeUsd.kind).toBe("encrypted");
    const json = tradeProposalToJson(proposal);
    expect(json.sizeUsd).toBe("0");
    expect(json.sizeUsdEnc).toEqual(envelope);
  });

  test("envelope survives repeated status-update rewrites (memory.ts loop)", () => {
    let json: TradeProposalJson = { ...baseProposal, sizeUsd: "0", sizeUsdEnc: envelope };
    // updateTradeProposalStatus round-trips every list entry on each update.
    for (const status of ["proposed", "executed", "rejected"] as const) {
      const parsed = tradeProposalFromJson(json);
      json = tradeProposalToJson({ ...parsed, status });
    }
    expect(json.sizeUsdEnc).toEqual(envelope);
    expect(json.sizeUsd).toBe("0");
  });

  test("sentinel never reads as money: plainUsdOrNull null, requirePlainUsd throws", () => {
    const parsed = tradeProposalFromJson({ ...baseProposal, sizeUsd: "0", sizeUsdEnc: envelope });
    expect(plainUsdOrNull(parsed.sizeUsd)).toBeNull();
    expect(() => requirePlainUsd(parsed.sizeUsd)).toThrow(/encrypted/);
  });

  test("usd30 ↔ micro-USD is lossless for whole-dollar sizes and fails closed", () => {
    const fifty = 50n * 10n ** 30n;
    expect(usd30ToMicro(fifty)).toBe(50_000_000n);
    expect(microToUsd30(usd30ToMicro(fifty))).toBe(fifty);
    expect(() => usd30ToMicro(fifty + 1n)).toThrow(/precision/);
    expect(() => usd30ToMicro(-1n)).toThrow(/non-negative/);
  });
});
