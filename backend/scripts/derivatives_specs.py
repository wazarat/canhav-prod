#!/usr/bin/env python3
"""
Derivatives-network specs (canhav-derivatives-implementation-spec §3/§4/§5).

The pure-play Derivatives entities that join the Network -> Protocol ->
Derivatives taxonomy, each tagged with a Derivatives sub-sector (Perp DEX /
Option Vaults / Delta-Neutral) and 0+ secondary tags. These mirror the
liquidity_specs.py pattern: live Tier-1 metrics (tvlUsd, openInterestUsd,
volume24hUsd, token price/mcap, fees, derived marketSharePct) are filled by the
DeFiLlama + CoinGecko cron pass (app/api/cron/refresh + lib/server/derivatives.ts).
Tier-2 fields (maxLeverageX, supportedMarkets, vaultStrategies, hedgeVenue,
fundingRatePct, governance) stay curated/null until per-protocol indexers wired.

Resolver ids (llamaSlug / coingeckoId) live in frontend/data/derivatives-seed.ts
and the cron maps (LLAMA_PROTOCOL_SLUGS / NETWORK_COINGECKO_IDS). The
extend-existing perp venues (GMX, Gains, dYdX [excluded — Cosmos], Hyperliquid)
and Ethena (Delta-Neutral) are handled in ingest_entities.py and are
intentionally NOT duplicated here. Per the EVM-only decision, dYdX (Cosmos) and
Drift (Solana) are excluded entirely.

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
    derivatives_sub_sector: str,
    derivatives_secondary_tags: List[str],
    chains: List[str],
    member_coins: Optional[List[Dict[str, Any]]] = None,
    pricing_model: Optional[str] = None,
    hedge_venue: Optional[List[str]] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    github: Optional[str] = None,
    competitors: Optional[List[Dict[str, Any]]] = None,
    scale_labels: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Build a Derivatives-network spec with the editorial defaults
    `build_entity_item` expects. `derivatives` holds the curated Tier-2 block;
    the cron overlays Tier-1 live fields (tvlUsd, OI, volume, token price/mcap,
    fees, share)."""
    derivatives: Dict[str, Any] = {
        "deployment": {"chains": chains, "evmCompatible": "yes"},
    }
    if pricing_model is not None:
        derivatives["pricingModel"] = pricing_model
    if hedge_venue:
        derivatives["hedgeVenue"] = hedge_venue

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
        "sector": "Derivatives",
        "sub_sector": derivatives_sub_sector,
        "derivatives_sub_sector": derivatives_sub_sector,
        "derivatives_secondary_tags": derivatives_secondary_tags,
        "derivatives": derivatives,
        # Derivatives entities carry no `Tags` (that vocabulary is Credit-only).
        "tags": [],
        "competitors": competitors or [],
        "member_coins": member_coins or [],
        "portal_defaults": _portal_defaults(chains),
    }


DERIVATIVES_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ------------------------------ PERP DEX --------------------------------
    "synthetix": _net(
        name="Synthetix",
        symbol="SNX",
        tagline="Synthetic-asset liquidity layer powering perps and synths.",
        description=(
            "Synthetix is a derivatives liquidity protocol where SNX stakers back a "
            "pooled debt that mints synthetic assets and powers perpetual-futures "
            "markets (Synthetix Perps / V3) across Optimism, Base, Ethereum and Arbitrum."
        ),
        differentiator=(
            "A shared, staker-backed liquidity layer (rather than per-market order "
            "books) that other front-ends (Kwenta, Polynomial) build perps on top of."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Synthetic-Assets", "Multi-Chain"],
        chains=["Optimism", "Base", "Ethereum", "Arbitrum One"],
        pricing_model="oracle",
        official_docs="https://docs.synthetix.io",
        website="https://synthetix.io",
        twitter="https://x.com/synthetix_io",
        github="https://github.com/Synthetixio",
        member_coins=[
            _coin("snx", "Synthetix Network Token", "SNX", "Governance + staking collateral (debt-pool backing)"),
        ],
    ),
    "aevo": _net(
        name="Aevo",
        symbol="AEVO",
        tagline="High-performance options + perps on a custom EVM rollup.",
        description=(
            "Aevo is a decentralized derivatives exchange offering options and "
            "perpetual futures via a high-throughput central limit order book on a "
            "custom EVM rollup. It evolved from Ribbon Finance's options stack."
        ),
        differentiator=(
            "Off-chain order-book matching with on-chain settlement on a dedicated "
            "rollup, combining CEX-like UX with self-custody."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Orderbook"],
        chains=["Ethereum"],
        pricing_model="orderbook",
        official_docs="https://docs.aevo.xyz",
        website="https://www.aevo.xyz",
        twitter="https://x.com/aevoxyz",
        member_coins=[
            _coin("aevo-gov", "Aevo", "AEVO", "Governance token"),
        ],
    ),
    # ---------------------------- OPTION VAULTS -----------------------------
    "ribbon-finance": _net(
        name="Ribbon Finance",
        symbol="RBN",
        tagline="The pioneer of DeFi Option Vaults (DOVs).",
        description=(
            "Ribbon Finance pioneered automated DeFi Option Vaults (DOVs) that run "
            "covered-call and put-selling strategies to generate yield. Ribbon has "
            "since merged into Aevo; RBN persists as a legacy / transitioning token."
        ),
        differentiator=(
            "First to productize automated, recurring options strategies as "
            "deposit-and-forget vaults — the template most later DOVs followed."
        ),
        derivatives_sub_sector="Option Vaults",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Ethereum"],
        official_docs="https://docs.ribbon.finance",
        website="https://www.ribbon.finance",
        twitter="https://x.com/ribbonfinance",
        github="https://github.com/ribbon-finance",
        member_coins=[
            _coin("rbn", "Ribbon Finance", "RBN", "Governance token (merged into Aevo)"),
        ],
    ),
    "dopex": _net(
        name="Dopex",
        symbol="DPX",
        tagline="Decentralized options exchange with single-staking vaults.",
        description=(
            "Dopex is an Arbitrum-native decentralized options protocol whose "
            "Single Staking Option Vaults (SSOVs) let users write and buy options "
            "with pooled liquidity, automating options yield strategies."
        ),
        differentiator=(
            "SSOV design concentrates option liquidity at chosen strikes, with "
            "rebate mechanics to offset writer losses."
        ),
        derivatives_sub_sector="Option Vaults",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Arbitrum One"],
        official_docs="https://docs.dopex.io",
        website="https://www.dopex.io",
        twitter="https://x.com/dopex_io",
        # DPX has no clean CoinGecko markets entry — TVL via DeFi Llama (path c),
        # so no token member coin is linked.
        scale_labels={"tvl": "Protocol TVL"},
    ),
    "derive": _net(
        name="Derive",
        symbol="DRV",
        tagline="On-chain options and structured products (formerly Lyra).",
        description=(
            "Derive (rebranded from Lyra) is an on-chain options and structured-"
            "products protocol with an options AMM and automated vaults, deployed on "
            "its own OP-stack chain alongside Optimism, Arbitrum and Base."
        ),
        differentiator=(
            "A purpose-built options AMM + settlement chain, offering composable "
            "options and yield vaults with cross-margin."
        ),
        derivatives_sub_sector="Option Vaults",
        derivatives_secondary_tags=["Auto-Strategy", "Multi-Chain"],
        chains=["Optimism", "Arbitrum One", "Base", "Ethereum"],
        official_docs="https://docs.derive.xyz",
        website="https://www.derive.xyz",
        twitter="https://x.com/derivexyz",
        github="https://github.com/derivexyz",
        member_coins=[
            _coin("drv", "Derive", "DRV", "Governance token (ex-LYRA)"),
        ],
    ),
    "jones-dao": _net(
        name="Jones DAO",
        symbol="JONES",
        tagline="Yield, liquidity and options strategy vaults on Arbitrum.",
        description=(
            "Jones DAO is an Arbitrum-native protocol offering automated yield and "
            "options strategy vaults that abstract complex derivatives positions "
            "into one-click, auto-managed deposits."
        ),
        differentiator=(
            "Strategy vaults that combine options, hedging and liquidity provisioning "
            "to deliver risk-adjusted yield with minimal user management."
        ),
        derivatives_sub_sector="Option Vaults",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Arbitrum One"],
        official_docs="https://docs.jonesdao.io",
        website="https://www.jonesdao.io",
        twitter="https://x.com/DAOJonesOptions",
        member_coins=[
            _coin("jones", "Jones DAO", "JONES", "Governance token"),
        ],
    ),
    # ---------------------------- DELTA-NEUTRAL -----------------------------
    "rage-trade": _net(
        name="Rage Trade",
        symbol="",
        tagline="Delta-neutral vaults and omnichain perps liquidity.",
        description=(
            "Rage Trade is an Arbitrum-native derivatives protocol offering "
            "delta-neutral vaults (e.g. recycling GLP yield while hedging its market "
            "exposure) and omnichain perpetual-futures liquidity."
        ),
        differentiator=(
            "Delta-neutral strategy vaults that hedge external LP positions (like "
            "GMX's GLP) to isolate yield from directional risk."
        ),
        derivatives_sub_sector="Delta-Neutral",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Arbitrum One"],
        hedge_venue=["GMX"],
        official_docs="https://docs.rage.trade",
        website="https://www.rage.trade",
        twitter="https://x.com/rage_trade",
        # No headline tradable token — network TVL sourced from DeFi Llama (path c).
        scale_labels={"tvl": "Protocol TVL"},
    ),
    "neutra-finance": _net(
        name="Neutra Finance",
        symbol="",
        tagline="Automated delta-neutral yield strategies.",
        description=(
            "Neutra Finance offers automated delta-neutral strategy vaults that pair "
            "yield-bearing positions with short hedges to target market-neutral "
            "returns on Arbitrum."
        ),
        differentiator=(
            "Packaged delta-neutral strategies (long yield asset + short perp hedge) "
            "as auto-managed vaults for passive market-neutral yield."
        ),
        derivatives_sub_sector="Delta-Neutral",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Arbitrum One"],
        hedge_venue=["GMX"],
        official_docs="https://docs.neutra.finance",
        website="https://neutra.finance",
        twitter="https://x.com/NeutraFinance",
        # No headline tradable token — network TVL sourced from DeFi Llama (path c).
        scale_labels={"tvl": "Protocol TVL"},
    ),
}


# Per-network MemberCoin audit registry (expected count + rationale).
# Used by validate_taxonomy.py --report-member-coins; does not enforce caps at ingest.
DERIVATIVES_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    "synthetix": {"expected": 1, "rationale": "SNX governance/staking"},
    "aevo": {"expected": 1, "rationale": "AEVO governance"},
    "ribbon-finance": {"expected": 1, "rationale": "RBN governance (legacy, merged into Aevo)"},
    "dopex": {"expected": 0, "rationale": "DPX has no clean CoinGecko markets entry (TVL via DeFi Llama)"},
    "derive": {"expected": 1, "rationale": "DRV governance (ex-LYRA)"},
    "jones-dao": {"expected": 1, "rationale": "JONES governance"},
    "rage-trade": {"expected": 0, "rationale": "Tokenless delta-neutral vaults (TVL via DeFi Llama)"},
    "neutra-finance": {"expected": 0, "rationale": "Tokenless delta-neutral vaults (TVL via DeFi Llama)"},
}
