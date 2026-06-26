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
and the cron maps (LLAMA_PROTOCOL_SLUGS / NETWORK_COINGECKO_IDS). Ethena
(Delta-Neutral) is extend-existing in ingest_entities.py (primary Stablecoin).
Perp venues migrated from dex_specs.py (GMX, Gains, dYdX, Hyperliquid, Drift).

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
    evm_compatible: str = "yes",
) -> Dict[str, Any]:
    """Build a Derivatives-network spec with the editorial defaults
    `build_entity_item` expects. `derivatives` holds the curated Tier-2 block;
    the cron overlays Tier-1 live fields (tvlUsd, OI, volume, token price/mcap,
    fees, share)."""
    derivatives: Dict[str, Any] = {
        "deployment": {"chains": chains, "evmCompatible": evm_compatible},
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


_UNISWAP_COMPETITOR = {
    "name": "Uniswap",
    "slug": "uniswap",
    "rank": 1,
    "positioning": "The largest spot DEX by volume.",
    "similarities": "Both let users swap tokens against on-chain liquidity without an intermediary.",
    "differences": (
        "Uniswap is the deepest multi-chain AMM with concentrated liquidity (V3) "
        "and customizable pools via hooks (V4)."
    ),
}

_HYPERLIQUID_COMPETITOR = {
    "name": "Hyperliquid",
    "slug": "hyperliquid",
    "rank": 1,
    "positioning": "Deepest on-chain perp liquidity (purpose-built L1 CLOB).",
    "similarities": "Both offer on-chain leveraged perpetual trading.",
    "differences": (
        "Hyperliquid runs a fully on-chain central limit order book on its own L1 "
        "with sub-second finality."
    ),
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
    "hyperliquid": _net(
        name="Hyperliquid",
        symbol="HYPE",
        tagline="Purpose-built L1 with a fully on-chain order book.",
        description=(
            "Hyperliquid is a purpose-built L1 with a fully on-chain CLOB — ~200k "
            "orders/sec throughput, sub-second finality, and the deepest on-chain "
            "perp liquidity in 2026 (typically >70% of on-chain perp volume). "
            "HyperEVM extends programmability."
        ),
        differentiator=(
            "Fully on-chain central limit order book on a bespoke L1; HyperEVM adds "
            "EVM execution without sacrificing CLOB performance."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Orderbook"],
        chains=["Hyperliquid L1", "Arbitrum"],
        pricing_model="orderbook",
        evm_compatible="mixed",
        official_docs="https://hyperliquid.gitbook.io",
        website="https://hyperliquid.xyz",
        twitter="https://x.com/HyperliquidX",
        competitors=[_UNISWAP_COMPETITOR],
        member_coins=[
            _coin("hype", "Hyperliquid", "HYPE", "Governance token"),
        ],
    ),
    "dydx": _net(
        name="dYdX",
        symbol="DYDX",
        tagline="The original decentralized perps pioneer.",
        description=(
            "dYdX is the original decentralized perps pioneer. V4 runs on its own "
            "Cosmos appchain with decentralized, validator-driven order matching and "
            "strong BTC/ETH perp liquidity targeted at professional traders."
        ),
        differentiator=(
            "Permissionless perpetual markets on a dedicated Cosmos appchain with "
            "off-chain orderbook and on-chain settlement; Megavault LP product."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Orderbook", "Multi-Chain"],
        chains=["dYdX Chain", "Ethereum"],
        pricing_model="orderbook",
        evm_compatible="no",
        official_docs="https://docs.dydx.exchange",
        website="https://dydx.exchange",
        twitter="https://x.com/dYdX",
        github="https://github.com/dydxprotocol",
        competitors=[_HYPERLIQUID_COMPETITOR],
        member_coins=[
            _coin("dydx-gov", "dYdX", "DYDX", "Governance + staking token"),
        ],
    ),
    "gmx": _net(
        name="GMX",
        symbol="GMX",
        tagline="Multi-asset pool-backed perpetuals with zero price impact.",
        description=(
            "GMX uses multi-asset liquidity pools (GLP V1, GM V2) where LPs are the "
            "counterparty to traders; oracle-based pricing means zero price-impact "
            "trades up to pool depth. V2 added isolated-market GM pools."
        ),
        differentiator=(
            "Oracle-priced, pool-backed perps with zero price impact within pool "
            "depth; GLP composability across DeFi."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Oracle-Based", "Multi-Chain"],
        chains=["Arbitrum", "Avalanche"],
        pricing_model="oracle",
        official_docs="https://docs.gmx.io",
        website="https://gmx.io",
        twitter="https://x.com/GMX_IO",
        github="https://github.com/gmx-io",
        competitors=[_HYPERLIQUID_COMPETITOR],
        member_coins=[
            _coin("gmx-gov", "GMX", "GMX", "Governance + fee-share token (esGMX vesting)"),
        ],
    ),
    "drift-protocol": _net(
        name="Drift Protocol",
        symbol="DRIFT",
        tagline="Leading Solana-native perps DEX.",
        description=(
            "Drift is the leading Solana-native perps DEX. It combines an on-chain "
            "orderbook (DLOB) with an AMM (vAMM) fallback so liquidity providers and "
            "just-in-time market makers can both serve fills."
        ),
        differentiator=(
            "DLOB + vAMM hybrid with JIT auctions; Drift Vaults offer passive "
            "strategies, with spot routed via Jupiter."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Orderbook"],
        chains=["Solana"],
        pricing_model="orderbook",
        evm_compatible="no",
        official_docs="https://docs.drift.trade",
        website="https://drift.trade",
        twitter="https://x.com/DriftProtocol",
        competitors=[_HYPERLIQUID_COMPETITOR],
        member_coins=[
            _coin("drift", "Drift", "DRIFT", "Governance token (sDRIFT staking)"),
        ],
    ),
    "gains-network": _net(
        name="Gains Network",
        symbol="GNS",
        tagline="Synthetic leveraged trading (gTrade).",
        description=(
            "Gains Network (gTrade) offers synthetic leveraged trading backed by "
            "gToken LP vaults; it supports very high leverage (up to 150x) across "
            "crypto, forex, and equities/indices, accessible to retail with low minimums."
        ),
        differentiator=(
            "Synthetic markets (no spot leg) collateralized by gToken vaults; "
            "up-to-150x leverage on majors plus forex and equities."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Oracle-Based", "Multi-Chain"],
        chains=["Arbitrum", "Polygon", "Base"],
        pricing_model="oracle",
        official_docs="https://docs.gains.trade",
        website="https://gains.trade",
        twitter="https://x.com/GainsNetwork_io",
        competitors=[_HYPERLIQUID_COMPETITOR],
        member_coins=[
            _coin("gns", "Gains Network", "GNS", "Governance token (gGNS vault collateral)"),
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
    "hyperliquid": {"expected": 1, "rationale": "HYPE governance"},
    "dydx": {"expected": 1, "rationale": "DYDX governance"},
    "gmx": {"expected": 1, "rationale": "GMX governance"},
    "drift-protocol": {"expected": 1, "rationale": "DRIFT governance"},
    "gains-network": {"expected": 1, "rationale": "GNS governance"},
    "ribbon-finance": {"expected": 1, "rationale": "RBN governance (legacy, merged into Aevo)"},
    "dopex": {"expected": 0, "rationale": "DPX has no clean CoinGecko markets entry (TVL via DeFi Llama)"},
    "derive": {"expected": 1, "rationale": "DRV governance (ex-LYRA)"},
    "jones-dao": {"expected": 1, "rationale": "JONES governance"},
    "rage-trade": {"expected": 0, "rationale": "Tokenless delta-neutral vaults (TVL via DeFi Llama)"},
    "neutra-finance": {"expected": 0, "rationale": "Tokenless delta-neutral vaults (TVL via DeFi Llama)"},
}
