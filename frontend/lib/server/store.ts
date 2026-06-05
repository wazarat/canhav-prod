import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { hasUpstash, readAllItemsFromRedis } from "@/lib/server/redis";
import type {
  EntityProfile,
  EntityRisk,
  RiskCategory,
  RwaProfile,
  StablecoinProfile,
  TokenProfile,
} from "@/lib/types";

/**
 * Server-only unified reader for the backend store.
 *
 * Primary source is Upstash Redis (hash `canhav:store`), read at request/build
 * time so every page reflects the live store and an approval flip via
 * When Upstash env vars are absent
 * (pure offline dev with the Python LocalAdapter), it falls back to reading
 * `backend/data/store.json` from disk. Items map PascalCase -> camelCase here.
 */

interface StoreFile {
  items?: Record<string, Record<string, unknown>>;
}

function storePath(): string {
  return path.join(repoRoot(), "backend", "data", "store.json");
}

function readItemsFromDisk(): Record<string, unknown>[] {
  try {
    const raw = readFileSync(storePath(), "utf-8");
    const parsed = JSON.parse(raw) as StoreFile;
    return Object.values(parsed.items ?? {});
  } catch {
    return [];
  }
}

async function readItems(): Promise<Record<string, unknown>[]> {
  if (hasUpstash()) {
    return readAllItemsFromRedis();
  }
  return readItemsFromDisk();
}

/**
 * Offline-dev fallback writer: flip a protocol's status directly in
 * `backend/data/store.json` (mirrors the Python LocalAdapter). Only used when
 * Upstash env vars are absent; production always goes through Redis. Returns the
 * updated item, or `null` if the protocol was not found.
 */
export function setStatusLocal(
  category: string,
  slug: string,
  status: "APPROVED" | "PENDING_APPROVAL",
): Record<string, any> | null {
  const file = storePath();
  let parsed: StoreFile & Record<string, unknown>;
  try {
    parsed = JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
  const items = (parsed.items ?? {}) as Record<string, Record<string, any>>;
  const field = `CATEGORY#${category}|PROTOCOL#${slug}`;
  const item = items[field];
  if (!item) return null;
  item.Status = status;
  item.UpdatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  return item;
}

function parseRisks(raw: unknown): EntityRisk[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      return { category: "Systemic" as RiskCategory, description: item };
    }
    const r = item as Record<string, string>;
    return {
      category: (r.category ?? "Systemic") as RiskCategory,
      description: r.description ?? "",
    };
  });
}

function common(item: Record<string, any>) {
  return {
    slug: String(item.Slug ?? ""),
    name: String(item.Name ?? ""),
    symbol: String(item.Symbol ?? ""),
    status: (item.Status ?? "APPROVED") as StablecoinProfile["status"],
    description: String(item.Description ?? ""),
    website: item.Website ?? null,
    twitter: item.Twitter ?? null,
    discord: item.Discord ?? null,
    github: item.GitHub ?? null,
    coingecko: item.CoinGecko ?? null,
    auditUrl: item.AuditURL ?? null,
    contractAddress: item.ContractAddress ?? null,
    entitySlug: item.EntitySlug ?? null,
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
  tokens: TokenProfile[];
  entities: EntityProfile[];
}

export async function readLiveStore(): Promise<LiveStore> {
  const stablecoins: StablecoinProfile[] = [];
  const rwas: RwaProfile[] = [];
  const tokens: TokenProfile[] = [];
  const entities: EntityProfile[] = [];

  for (const raw of await readItems()) {
    const item = raw as Record<string, any>;
    if (item.Category === "Stablecoin") {
      stablecoins.push({
        category: "Stablecoin",
        ...common(item),
        pegTarget: (item.PegTarget ?? "USD") as StablecoinProfile["pegTarget"],
        subCategory: item.SubCategory ?? null,
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
    } else if (item.Category === "Token") {
      tokens.push({
        category: "Token",
        ...common(item),
        tokenType: (item.TokenType ?? "Governance") as TokenProfile["tokenType"],
        subCategory: item.SubCategory ?? null,
        totalSupply: item.TotalSupply ?? { value: null, source: "alchemy", updatedAt: null },
      } as TokenProfile);
    } else if (item.Category === "Entity") {
      entities.push({
        category: "Entity",
        slug: String(item.Slug ?? ""),
        name: String(item.Name ?? ""),
        symbol: String(item.Symbol ?? ""),
        status: (item.Status ?? "APPROVED") as EntityProfile["status"],
        tagline: String(item.Tagline ?? ""),
        description: String(item.Description ?? ""),
        differentiator: String(item.Differentiator ?? ""),
        officialDocs: item.OfficialDocs ?? null,
        website: item.Website ?? null,
        twitter: item.Twitter ?? null,
        discord: item.Discord ?? null,
        github: item.GitHub ?? null,
        components: item.Components ?? [],
        faq: item.Faq ?? [],
        orgStructure: item.OrgStructure ?? [],
        tradFiComparison: item.TradFiComparison ?? [],
        risks: parseRisks(item.Risks),
        events: item.Events ?? [],
        investmentRounds: item.InvestmentRounds ?? [],
        partnerships: item.Partnerships ?? [],
        scaleLabels: item.ScaleLabels ?? undefined,
        currentScale: item.CurrentScale ?? {
          tvlUsd: null,
          users: null,
          aprPct: null,
          targetAprPct: null,
          loanPipelineUsd: null,
          partnerships: null,
        },
        memberCoins: item.MemberCoins ?? [],
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
      } as EntityProfile);
    }
  }

  stablecoins.sort((a, b) => a.name.localeCompare(b.name));
  rwas.sort((a, b) => a.name.localeCompare(b.name));
  tokens.sort((a, b) => a.name.localeCompare(b.name));
  entities.sort((a, b) => a.name.localeCompare(b.name));
  return { stablecoins, rwas, tokens, entities };
}
