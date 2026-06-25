#!/usr/bin/env python3
"""
Liquidity-network specs (canhav-liquidity-implementation-spec §3/§4).

The pure-play Liquidity entities that join the Network -> Protocol -> Liquidity
taxonomy, each tagged with a Liquidity sub-sector (Pools / Vaults) and 0+
secondary tags. These mirror the staking_specs.py pattern: live Tier-1 metrics
(tvlUsd, tvlChangePct, token price/mcap, fees, derived marketSharePct) are
filled by the DeFiLlama + CoinGecko cron pass (app/api/cron/refresh +
lib/server/liquidity.ts). Tier-2 fields (poolCount, vaultCount, avgVaultApyPct,
underlyingProtocols, governance) stay curated/null until per-protocol indexers
are wired.

Resolver ids (llamaSlug / coingeckoId) live in frontend/data/liquidity-seed.ts
and the cron maps (LLAMA_PROTOCOL_SLUGS / NETWORK_COINGECKO_IDS). The five
in-platform DEX venues (Curve, Uniswap, Balancer, Aerodrome, PancakeSwap) are
handled as `extend-existing` in ingest_entities.py (primary DEX + secondary
Liquidity/Pools) and are intentionally NOT duplicated here.

Curated prose below is concise, factual protocol description; numeric / Tier-2
curated fields are left null pending research authoring.

Stdlib only.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def _empty_scale() -> Dict[str, Any]:
    return {
        "tvlUsd": None,
        "users": None,
        "aprPct": None,
        "targetAprPct": None,
        "marketCapUsd": None,
        "loanPipelineUsd": None,
        "partnerships": None,
    }


def _portal_defaults(chains: List[str]) -> Dict[str, Any]:
    return {
        "chains": chains,
        "subCategory": "Entity",
        "isLive": True,
        "isArbitrumNative": False,
        "isPubliclyAudited": True,
        "foundedDate": None,
        "logoUrl": None,
        "bannerUrl": None,
        "portalUrl": None,
    }


def _coin(
    slug: str,
    name: str,
    symbol: str,
    role: str,
    sub_category: str = "Governance Token",
    category: str = "Token",
) -> Dict[str, Any]:
    return {
        "slug": slug,
        "name": name,
        "symbol": symbol,
        "category": category,
        "role": role,
        "subCategory": sub_category,
    }


def _net(
    *,
    name: str,
    symbol: str,
    tagline: str,
    description: str,
    differentiator: str,
    liquidity_sub_sector: str,
    liquidity_secondary_tags: List[str],
    chains: List[str],
    member_coins: Optional[List[Dict[str, Any]]] = None,
    underlying_protocols: Optional[List[str]] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    github: Optional[str] = None,
    competitors: Optional[List[Dict[str, Any]]] = None,
    scale_labels: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Build a Liquidity-network spec with the editorial defaults
    `build_entity_item` expects. `liquidity` holds the curated Tier-2 block; the
    cron overlays Tier-1 live fields (tvlUsd, token price/mcap, fees, share)."""
    liquidity: Dict[str, Any] = {
        "deployment": {"chains": chains, "evmCompatible": "yes"},
    }
    if underlying_protocols:
        liquidity["underlyingProtocols"] = underlying_protocols

    return {
        "name": name,
        "symbol": symbol,
        "csv_slug": None,
        "tagline": tagline,
        "description": description,
        "differentiator": differentiator,
        "official_docs": official_docs,
        "website": website,
        "twitter": twitter,
        "discord": None,
        "github": github,
        "components": [],
        "faq": [],
        "org_structure": [],
        "tradfi_comparison": [],
        "risks": [],
        "events": [],
        "investment_rounds": [],
        "partnerships": [],
        "current_scale": _empty_scale(),
        "scale_labels": scale_labels or {"tvl": "Protocol TVL"},
        # Taxonomy hierarchy.
        "sub_category": "Protocol",
        "sector": "Liquidity",
        "sub_sector": liquidity_sub_sector,
        "liquidity_sub_sector": liquidity_sub_sector,
        "liquidity_secondary_tags": liquidity_secondary_tags,
        "liquidity": liquidity,
        # Liquidity entities carry no `Tags` (that vocabulary is Credit-only).
        "tags": [],
        "competitors": competitors or [],
        "member_coins": member_coins or [],
        "portal_defaults": _portal_defaults(chains),
    }


LIQUIDITY_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ------------------------------- POOLS ----------------------------------
    "gamma": _net(
        name="Gamma",
        symbol="GAMMA",
        tagline="Active liquidity management for concentrated AMMs.",
        description=(
            "Gamma is an active liquidity-management protocol that automates "
            "concentrated-liquidity positions (Uniswap V3, and other CLMMs) via "
            "non-custodial 'Hypervisor' vaults, rebalancing ranges to maximize fees."
        ),
        differentiator=(
            "Automated, audited concentrated-liquidity strategies across many "
            "CLMM DEXes and chains — LPs deposit once and Gamma manages the range."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["LP-Strategy-Manager", "Concentrated-Liquidity", "Multi-Chain"],
        chains=["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "BNB Chain"],
        official_docs="https://docs.gamma.xyz",
        website="https://app.gamma.xyz",
        twitter="https://x.com/GammaStrategies",
        github="https://github.com/GammaStrategies",
        member_coins=[
            _coin("gamma-gov", "Gamma Strategies", "GAMMA", "Governance + fee-share token (xGAMMA staking)"),
        ],
    ),
    # ------------------------------- VAULTS ---------------------------------
    "yearn-finance": _net(
        name="Yearn Finance",
        symbol="YFI",
        tagline="The original DeFi yield-aggregating vaults.",
        description=(
            "Yearn pioneered the yield-vault model: users deposit assets and Yearn "
            "vaults (yVaults) route them into the best available strategies — "
            "including Curve LP + Convex farming — auto-harvesting and recompounding rewards."
        ),
        differentiator=(
            "The longest-running, most battle-tested vault aggregator; strategies "
            "are community-curated and composable across DeFi."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["Auto-Compounding", "Multi-Chain"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon"],
        underlying_protocols=["Curve", "Convex", "Aave", "Compound"],
        official_docs="https://docs.yearn.fi",
        website="https://yearn.fi",
        twitter="https://x.com/yearnfi",
        github="https://github.com/yearn",
        member_coins=[
            _coin("yfi", "yearn.finance", "YFI", "Governance token (veYFI vote-escrow)"),
        ],
    ),
    "convex-finance": _net(
        name="Convex Finance",
        symbol="CVX",
        tagline="Boosted Curve yield without locking CRV yourself.",
        description=(
            "Convex lets Curve LPs and CRV holders earn boosted rewards without "
            "locking CRV themselves. It aggregates veCRV voting power to maximize "
            "gauge boosts and auto-compounds CRV/CVX rewards for depositors."
        ),
        differentiator=(
            "Controls a dominant share of veCRV, making it the primary venue for "
            "boosted Curve yield and the heart of the Curve bribe economy."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["Auto-Compounding", "ve-Tokenomics"],
        chains=["Ethereum", "Arbitrum", "Polygon"],
        underlying_protocols=["Curve", "Frax", "Prisma"],
        official_docs="https://docs.convexfinance.com",
        website="https://www.convexfinance.com",
        twitter="https://x.com/ConvexFinance",
        github="https://github.com/convex-eth",
        member_coins=[
            _coin("cvx", "Convex Finance", "CVX", "Governance token (vlCVX vote-locked)"),
        ],
    ),
    "beefy": _net(
        name="Beefy",
        symbol="BIFI",
        tagline="Multi-chain auto-compounding yield optimizer.",
        description=(
            "Beefy is a decentralized, multi-chain yield optimizer. Its vaults "
            "automatically harvest farm rewards and recompound them back into the "
            "underlying LP position, maximizing compounded APY across dozens of chains."
        ),
        differentiator=(
            "One of the broadest multi-chain vault footprints in DeFi (20+ chains), "
            "with fully on-chain, community-audited auto-compounding strategies."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["Auto-Compounding", "Multi-Chain"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon", "BNB Chain", "Avalanche"],
        underlying_protocols=["Curve", "Aerodrome", "Balancer", "Uniswap"],
        official_docs="https://docs.beefy.finance",
        website="https://beefy.com",
        twitter="https://x.com/beefyfinance",
        github="https://github.com/beefyfinance",
        member_coins=[
            _coin("bifi", "Beefy", "BIFI", "Governance + revenue-share token"),
        ],
    ),
    "aura": _net(
        name="Aura",
        symbol="AURA",
        tagline="Boosted Balancer yield and veBAL aggregation.",
        description=(
            "Aura is to Balancer what Convex is to Curve: it aggregates veBAL voting "
            "power to maximize Balancer gauge boosts, letting BAL/BPT holders earn "
            "boosted, auto-compounded rewards without locking BAL themselves."
        ),
        differentiator=(
            "The dominant veBAL aggregator, steering Balancer emissions and "
            "underpinning the Balancer bribe market."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["Auto-Compounding", "ve-Tokenomics"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon", "Gnosis"],
        underlying_protocols=["Balancer"],
        official_docs="https://docs.aura.finance",
        website="https://aura.finance",
        twitter="https://x.com/aurafinance",
        github="https://github.com/aurafinance",
        member_coins=[
            _coin("aura-gov", "Aura Finance", "AURA", "Governance token (vlAURA vote-locked)"),
        ],
    ),
    "arrakis": _net(
        name="Arrakis Finance",
        symbol="",
        tagline="On-chain market making and LP infrastructure.",
        description=(
            "Arrakis provides trustless, automated market-making infrastructure for "
            "concentrated liquidity. Arrakis Modular lets protocols and DAOs deploy "
            "and manage on-chain LP strategies (e.g. Uniswap V3/V4) without a token."
        ),
        differentiator=(
            "Tokenless LP-management infrastructure used by protocols/DAOs to run "
            "professional, on-chain market-making vaults."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["LP-Strategy-Manager", "Concentrated-Liquidity"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon"],
        underlying_protocols=["Uniswap"],
        official_docs="https://docs.arrakis.fi",
        website="https://arrakis.finance",
        twitter="https://x.com/ArrakisFinance",
        github="https://github.com/ArrakisFinance",
        scale_labels={"tvl": "Managed liquidity"},
    ),
    "maverick": _net(
        name="Maverick Protocol",
        symbol="MAV",
        tagline="Dynamic-distribution AMM with automated liquidity modes.",
        description=(
            "Maverick is a capital-efficient AMM whose Dynamic Distribution engine "
            "auto-shifts concentrated liquidity as price moves (modes: Right/Left/"
            "Both/Static), reducing manual rebalancing for LPs."
        ),
        differentiator=(
            "Automated liquidity 'modes' move concentrated positions with price, "
            "blending CLMM efficiency with hands-off LPing."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["LP-Strategy-Manager", "Concentrated-Liquidity"],
        chains=["Ethereum", "Base", "BNB Chain", "Arbitrum", "ZKsync"],
        official_docs="https://docs.mav.xyz",
        website="https://www.mav.xyz",
        twitter="https://x.com/mavprotocol",
        github="https://github.com/maverickprotocol",
        member_coins=[
            _coin("mav", "Maverick Protocol", "MAV", "Governance token (veMAV vote-escrow)"),
        ],
    ),
}


# Per-network MemberCoin audit registry (expected count + rationale).
# Used by validate_taxonomy.py --report-member-coins; does not enforce caps at ingest.
LIQUIDITY_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    "gamma": {"expected": 1, "rationale": "GAMMA governance"},
    "yearn-finance": {"expected": 1, "rationale": "YFI governance"},
    "convex-finance": {"expected": 1, "rationale": "CVX governance"},
    "beefy": {"expected": 1, "rationale": "BIFI governance"},
    "aura": {"expected": 1, "rationale": "AURA governance"},
    "arrakis": {"expected": 0, "rationale": "Tokenless LP infrastructure (TVL via DeFi Llama)"},
    "maverick": {"expected": 1, "rationale": "MAV governance"},
}
