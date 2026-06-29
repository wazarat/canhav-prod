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
and the cron maps (LLAMA_PROTOCOL_SLUGS / NETWORK_COINGECKO_IDS). The five in-platform DEX venues (Curve, Uniswap, Balancer, Aerodrome, PancakeSwap)
are exclusive Liquidity / Pools entities in liquidity_specs.py (no DEX cross-tag).

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
    audit_history: Optional[str] = None,
    deployment_notes: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a Liquidity-network spec with the editorial defaults
    `build_entity_item` expects. `liquidity` holds the curated Tier-2 block; the
    cron overlays Tier-1 live fields (tvlUsd, token price/mcap, fees, share)."""
    liquidity: Dict[str, Any] = {
        "deployment": {
            "chains": chains,
            "evmCompatible": "yes",
            **({"notes": deployment_notes} if deployment_notes else {}),
        },
    }
    if audit_history:
        liquidity["auditHistory"] = audit_history
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
    # ---------------- POOLS (major AMM venues — exclusive Liquidity / Pools) ---
    "uniswap": _net(
        name="Uniswap",
        symbol="UNI",
        tagline="The AMM pioneer and largest spot DEX by volume.",
        description=(
            "Uniswap is the leading automated market maker. V3 introduced "
            "concentrated-liquidity ranges; V4 introduced 'hooks' that let pools "
            "embed custom logic (TWAMM, dynamic fees, on-chain limit orders) "
            "without forking the core contract."
        ),
        differentiator=(
            "Largest spot DEX by volume; V4 hooks make pools programmable, and "
            "UniswapX delivers intent-based, cross-chain routing. Runs its own L2 (Unichain)."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Concentrated-Liquidity", "Multi-Chain"],
        chains=[
            "Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "BNB Chain",
            "Avalanche", "Blast", "Celo", "ZKsync", "Worldchain", "Unichain",
        ],
        official_docs="https://docs.uniswap.org",
        website="https://uniswap.org",
        twitter="https://x.com/Uniswap",
        github="https://github.com/Uniswap",
        audit_history="Trail of Bits, ABDK Consulting, ChainSecurity (V3 + V4).",
        deployment_notes="Native on 12+ EVM chains; Unichain is Uniswap's own L2.",
        member_coins=[
            _coin("uni", "Uniswap", "UNI", "Governance token (UNI staking incoming)"),
        ],
    ),
    "curve-finance": _net(
        name="Curve Finance",
        symbol="CRV",
        tagline="Stableswap AMM optimized for like-pegged assets.",
        description=(
            "Curve's stableswap invariant is optimized for trades between "
            "like-pegged assets (stablecoins, LSTs). It pioneered vote-escrow "
            "tokenomics where governance power is bought with locked CRV (veCRV)."
        ),
        differentiator=(
            "Stableswap invariant gives minimal slippage on like-pegged trades; "
            "veCRV bribe markets (Convex/Votium) steer emissions."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Stable-Pools", "ve-Tokenomics", "Multi-Chain"],
        chains=[
            "Ethereum", "Arbitrum", "Optimism", "Polygon", "Base", "BNB Chain",
            "Avalanche", "Fantom", "Gnosis", "ZKsync", "Fraxtal", "Sonic",
        ],
        official_docs="https://docs.curve.fi",
        website="https://curve.fi",
        twitter="https://x.com/CurveFinance",
        github="https://github.com/curvefi",
        audit_history="Trail of Bits, MixBytes, ChainSecurity (multi-round).",
        deployment_notes="Multi-chain stableswap pools; crvUSD is a separate entity.",
        member_coins=[
            _coin("crv", "Curve DAO Token", "CRV", "Governance token (vote-escrow via veCRV)"),
        ],
    ),
    "balancer": _net(
        name="Balancer",
        symbol="BAL",
        tagline="Generalized weighted-pool AMM.",
        description=(
            "Balancer is a generalized AMM supporting up to 8 assets per pool with "
            "arbitrary weights (not just 50/50), used for index-style pools and "
            "structured liquidity. V3 (2024+) added hooks."
        ),
        differentiator=(
            "Arbitrary-weight, multi-asset pools enable index-style and boosted "
            "liquidity; Composable Stable Pools and V3 hooks extend programmability."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Stable-Pools", "ve-Tokenomics"],
        chains=["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "Avalanche", "Gnosis", "ZKsync"],
        official_docs="https://docs.balancer.fi",
        website="https://balancer.fi",
        twitter="https://x.com/Balancer",
        github="https://github.com/balancer",
        audit_history="Trail of Bits, OpenZeppelin, Certora.",
        deployment_notes="Weighted, Composable Stable, and Boosted pools; V3 with hooks.",
        member_coins=[
            _coin("bal", "Balancer", "BAL", "Governance token (veBAL: 80/20 BAL/WETH lock)"),
        ],
    ),
    "aerodrome": _net(
        name="Aerodrome Finance",
        symbol="AERO",
        tagline="The dominant ve(3,3) DEX on Base.",
        description=(
            "Aerodrome is a Solidly-fork ve(3,3) DEX on Base, the dominant venue on "
            "the Coinbase L2 by volume. It captures emissions-driven sticky "
            "liquidity and offers Slipstream concentrated liquidity."
        ),
        differentiator=(
            "Vote-escrow emissions + bribe markets direct liquidity; Slipstream "
            "adds a CLMM atop the ve(3,3) base. Dominant DEX on Base."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Concentrated-Liquidity", "ve-Tokenomics"],
        chains=["Base", "Optimism"],
        official_docs="https://docs.aerodrome.finance",
        website="https://aerodrome.finance",
        twitter="https://x.com/aerodromefi",
        audit_history="Spearbit, code4rena contests.",
        deployment_notes="Base-native; Optimism via Superchain merger with Velodrome.",
        member_coins=[
            _coin("aero", "Aerodrome", "AERO", "Governance token (veAERO lock NFT)"),
        ],
    ),
    "pancakeswap": _net(
        name="PancakeSwap",
        symbol="CAKE",
        tagline="The dominant DEX in the Binance ecosystem.",
        description=(
            "PancakeSwap is the dominant DEX in the BNB ecosystem — retail-focused "
            "with gamification (lotteries, predictions, NFTs) plus its Infinity CLMM."
        ),
        differentiator=(
            "Retail-first BNB DEX with v3 CLMM, Infinity (hook-like router), "
            "and an IFO launchpad."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Concentrated-Liquidity", "Multi-Chain"],
        chains=["BNB Chain", "Ethereum", "Arbitrum", "Base", "Polygon zkEVM", "Linea", "opBNB", "ZKsync", "Aptos"],
        official_docs="https://docs.pancakeswap.finance",
        website="https://pancakeswap.finance",
        twitter="https://x.com/PancakeSwap",
        github="https://github.com/pancakeswap",
        audit_history="Certik, PeckShield (multi-round).",
        deployment_notes="BNB-primary; v3 CLMM + Infinity router; Aptos (non-EVM).",
        member_coins=[
            _coin("cake", "PancakeSwap", "CAKE", "Governance + utility token"),
        ],
    ),
    # ---------------- POOLS (LP strategy managers) -----------------------------
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
