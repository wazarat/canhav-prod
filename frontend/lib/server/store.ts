import { readFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import type { RwaProfile, StablecoinProfile } from "@/lib/types";

/**
 * Server-only LIVE reader for the backend store (`backend/data/store.json`).
 *
 * Public pages read the build-time generated JSON (static, fast). The restricted
 * `/staging` page instead reads the store directly at request time through this
 * module, so an approval flip via /api/approve is reflected immediately without
 * a rebuild. Same camelCase mapping as `backend/scripts/export_store.py`.
 */

interface StoreFile {
  items?: Record<string, Record<string, unknown>>;
}

function storePath(): string {
  return path.join(repoRoot(), "backend", "data", "store.json");
}

function readItems(): Record<string, unknown>[] {
  try {
    const raw = readFileSync(storePath(), "utf-8");
    const parsed = JSON.parse(raw) as StoreFile;
    return Object.values(parsed.items ?? {});
  } catch {
    return [];
  }
}

function common(item: Record<string, any>) {
  return {
    slug: String(item.Slug ?? ""),
    name: String(item.Name ?? ""),
    symbol: String(item.Symbol ?? ""),
    status: (item.Status ?? "PENDING_APPROVAL") as StablecoinProfile["status"],
    description: String(item.Description ?? ""),
    website: item.Website ?? null,
    twitter: item.Twitter ?? null,
    discord: item.Discord ?? null,
    github: item.GitHub ?? null,
    coingecko: item.CoinGecko ?? null,
    auditUrl: item.AuditURL ?? null,
    contractAddress: item.ContractAddress ?? null,
    arbitrumPortalMetadata: item.ArbitrumPortalMetadata ?? {
      portalUrl: null,
      logoUrl: null,
      bannerUrl: null,
      chains: [],
      subCategory: null,
      isLive: false,
      isArbitrumNative: false,
      isPubliclyAudited: false,
      foundedDate: null,
    },
    createdAt: String(item.CreatedAt ?? ""),
    updatedAt: String(item.UpdatedAt ?? ""),
  };
}

export interface LiveStore {
  stablecoins: StablecoinProfile[];
  rwas: RwaProfile[];
}

export function readLiveStore(): LiveStore {
  const stablecoins: StablecoinProfile[] = [];
  const rwas: RwaProfile[] = [];

  for (const raw of readItems()) {
    const item = raw as Record<string, any>;
    if (item.Category === "Stablecoin") {
      stablecoins.push({
        category: "Stablecoin",
        ...common(item),
        pegTarget: (item.PegTarget ?? "USD") as StablecoinProfile["pegTarget"],
        totalSupply: item.TotalSupply ?? { value: null, source: "alchemy", updatedAt: null },
        historicalPegData: item.HistoricalPegData ?? {
          points: [],
          source: "dune",
          updatedAt: null,
        },
      } as StablecoinProfile);
    } else if (item.Category === "RWA") {
      rwas.push({
        category: "RWA",
        ...common(item),
        assetClass: (item.AssetClass ?? "Multi-Asset") as RwaProfile["assetClass"],
        vaultAddresses: item.VaultAddresses ?? null,
        totalValueLocked: item.TotalValueLocked ?? {
          value: null,
          source: "alchemy",
          updatedAt: null,
        },
        historicalTvlData: item.HistoricalTvlData ?? {
          points: [],
          source: "dune",
          updatedAt: null,
        },
      } as RwaProfile);
    }
  }

  stablecoins.sort((a, b) => a.name.localeCompare(b.name));
  rwas.sort((a, b) => a.name.localeCompare(b.name));
  return { stablecoins, rwas };
}
