import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Nexus Mutual live-data client (Other sector / "Underwriting" tag, Tier-1).
 *
 * Keyless public REST API, base https://api.nexusmutual.io/v2. Two endpoints are
 * live and keyless (verified 2026-07-03):
 *   - GET /capacity  -> per-product available capacity + allocated NXM
 *   - GET /products  -> product catalogue (count / deprecated flags)
 *
 * Capital-pool size, MCR, MCR ratio and claims paid/count are NOT exposed by the
 * public v2 API (all 404); they live on-chain. Those UW fields are left null and
 * documented Tier-2 in docs/m2-sources/nexus.md. Capital-pool size is separately
 * covered by the DeFiLlama TVL path in lib/server/other.ts.
 *
 * UNITS: /capacity `availableCapacity[].amount` is an integer string scaled by the
 * asset's `decimals` (wei-style). The SAME capacity is denominated in every listed
 * asset, so the USDC/DAI figures are already ~USD (stablecoin ≈ $1). `allocatedNxm`
 * is NXM scaled by 1e18. USD conversion of NXM-denominated fields requires an NXM
 * spot price supplied by the caller (CoinGecko `wrapped-nxm`); absent that, NXM
 * values are surfaced natively and USD fields stay null.
 */

const NEXUS_API = "https://api.nexusmutual.io/v2";

/** Asset ids used to derive USD-denominated aggregates (stablecoins ≈ $1). */
const USDC_ASSET_ID = 6;
const DAI_ASSET_ID = 1;
const NXM_WEI = 1e18;

export interface NexusLiveMetrics {
  /** Total available cover capacity (USD) — from USDC/DAI-denominated capacity. */
  availableCapacityUsd: number | null;
  /** Total NXM allocated as active cover backing (native NXM units). */
  allocatedNxm: number | null;
  /** Active cover backing in USD — derived only when an NXM price is supplied. */
  activeCoverUsd: number | null;
  /** Number of listed products (incl. deprecated). */
  productCount: number | null;
  /** Number of non-deprecated (active) products. */
  activeProductCount: number | null;
}

interface NexusAssetRef {
  id?: number;
  symbol?: string;
  decimals?: number;
}

interface NexusCapacityEntry {
  assetId?: number;
  amount?: string | number | null;
  asset?: NexusAssetRef;
}

interface NexusCapacityRow {
  productId?: number;
  availableCapacity?: NexusCapacityEntry[];
  allocatedNxm?: string | number | null;
}

interface NexusProductRow {
  id?: number;
  isDeprecated?: boolean;
}

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Human-scale amount for one capacity entry, or null. */
function entryAmount(entry: NexusCapacityEntry): number | null {
  const raw = num(entry.amount);
  const dec = entry.asset?.decimals;
  if (raw == null || typeof dec !== "number" || !Number.isFinite(dec)) return null;
  return raw / 10 ** dec;
}

/**
 * Fetch and aggregate Nexus Mutual underwriting metrics from the public v2 API.
 *
 * @param revalidate Next data-cache window (seconds). Omit for no-store.
 * @param nxmPriceUsd Optional NXM spot price (CoinGecko `wrapped-nxm`) used to
 *   derive `activeCoverUsd` from `allocatedNxm`.
 */
export async function fetchNexusLiveMetrics(
  revalidate?: number,
  nxmPriceUsd?: number | null,
): Promise<NexusLiveMetrics | null> {
  const cap = await fetchJson(`${NEXUS_API}/capacity`, { revalidate });
  const prods = await fetchJson(`${NEXUS_API}/products`, { revalidate });

  const capOk = cap.status === 200 && Array.isArray(cap.data);
  const prodOk = prods.status === 200 && Array.isArray(prods.data);
  if (!capOk && !prodOk) return null;

  let availableCapacityUsd: number | null = null;
  let allocatedNxm: number | null = null;

  if (capOk) {
    const rows = cap.data as NexusCapacityRow[];
    let usdSum = 0;
    let usdSeen = false;
    let nxmSum = 0;
    let nxmSeen = false;

    for (const row of rows) {
      // Prefer USDC, fall back to DAI — both stablecoin-denominated (~USD).
      const entries = Array.isArray(row.availableCapacity) ? row.availableCapacity : [];
      const usdc = entries.find((e) => e.assetId === USDC_ASSET_ID);
      const dai = entries.find((e) => e.assetId === DAI_ASSET_ID);
      const usdAmt = (usdc ? entryAmount(usdc) : null) ?? (dai ? entryAmount(dai) : null);
      if (usdAmt != null) {
        usdSum += usdAmt;
        usdSeen = true;
      }
      const alloc = num(row.allocatedNxm);
      if (alloc != null) {
        nxmSum += alloc / NXM_WEI;
        nxmSeen = true;
      }
    }

    availableCapacityUsd = usdSeen ? usdSum : null;
    allocatedNxm = nxmSeen ? nxmSum : null;
  }

  const activeCoverUsd =
    allocatedNxm != null && nxmPriceUsd != null && Number.isFinite(nxmPriceUsd)
      ? allocatedNxm * nxmPriceUsd
      : null;

  let productCount: number | null = null;
  let activeProductCount: number | null = null;
  if (prodOk) {
    const products = prods.data as NexusProductRow[];
    productCount = products.length;
    activeProductCount = products.filter((p) => p.isDeprecated !== true).length;
  }

  return {
    availableCapacityUsd,
    allocatedNxm,
    activeCoverUsd,
    productCount,
    activeProductCount,
  };
}

/**
 * Map Nexus metrics onto the Other-sector `underwriting` tag block. Plain inferred
 * object; only non-null fields are spread in. `sourced()` marks live provenance.
 */
export function nexusMetricsToTagOverlay(metrics: NexusLiveMetrics) {
  const sourced = (value: number | null) => ({
    value,
    dataSource: "live" as const,
    sourceLabel: "Nexus Mutual API",
    updatedAt: nowIso(),
  });

  return {
    underwriting: {
      ...(metrics.activeCoverUsd != null
        ? { activeCoverUsd: sourced(metrics.activeCoverUsd) }
        : {}),
      ...(metrics.availableCapacityUsd != null
        ? { availableCapacityUsd: sourced(metrics.availableCapacityUsd) }
        : {}),
      ...(metrics.productCount != null
        ? { coveredProtocolCount: sourced(metrics.productCount) }
        : {}),
    },
  };
}
