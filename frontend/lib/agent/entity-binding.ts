import "server-only";

import { getApprovedNetworkBySlug } from "@/lib/data";
import type { AgentProductRef } from "@/lib/agent/memory";

/**
 * The research scope an agent is bound to: its project (Entity) plus the member
 * products (stablecoins / tokens / RWAs) it should default to. Consumed by the
 * tool layer (soft defaults) and the chat system prompt (orientation).
 */
export interface AgentScope {
  entitySlug: string | null;
  memberSlugs: {
    stablecoins: string[];
    tokens: string[];
    rwas: string[];
    receipts: string[];
  };
}

export interface EntityBinding {
  entitySlug: string;
  entityName: string;
  associatedProducts: AgentProductRef[];
  scope: AgentScope;
}

/** Resolve an Entity slug into the agent's product binding + research scope. */
export async function resolveEntityBinding(slug: string): Promise<EntityBinding | null> {
  const entity = await getApprovedNetworkBySlug(slug);
  if (!entity) return null;

  const associatedProducts: AgentProductRef[] = entity.memberCoins.map((c) => ({
    slug: c.slug,
    symbol: c.symbol,
    category: c.category,
  }));

  const memberSlugs = {
    stablecoins: entity.memberCoins
      .filter((c) => c.category === "Stablecoin")
      .map((c) => c.slug),
    tokens: entity.memberCoins.filter((c) => c.category === "Token").map((c) => c.slug),
    rwas: entity.memberCoins.filter((c) => c.category === "RWA").map((c) => c.slug),
    receipts: entity.memberCoins.filter((c) => c.category === "Receipt").map((c) => c.slug),
  };

  return {
    entitySlug: entity.slug,
    entityName: entity.name,
    associatedProducts,
    scope: { entitySlug: entity.slug, memberSlugs },
  };
}
