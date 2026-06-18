#!/usr/bin/env python3
"""
DEX-entity specs (PDF "DEX + RWA Sector Expansion" §1/§3).

The 14 new DEX entities that join the existing Jupiter aggregator under the
Network -> Protocol -> DEX taxonomy, each tagged with its DEX sub-sector
(spec §1) and 0+ secondary tags:

    Concentrated Liquidity .. Uniswap, PancakeSwap, Trader Joe
    Stableswap .............. Curve Finance
    AMM ..................... Balancer, SushiSwap
    ve(3,3) ................. Aerodrome
    Hybrid AMM + Orderbook .. Raydium, Drift Protocol
    Cross-Chain Native ...... THORChain
    Orderbook ............... Hyperliquid, dYdX
    Perpetuals .............. GMX, Gains Network

These dicts are merged into ENTITY_SPECS by ingest_entities.py and flattened to
store items by `build_entity_item`. Live TVL / 30d volume is filled by the
DeFi Llama cron pass in Phase 2; the curated string/array fields below are
static research. TVL/volume figures embedded here are DefiLlama snapshots as of
the spec capture date (2026-06-18).

Stdlib only.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

_CAPTURED_AT = "2026-06-18"


def _sourced(value: Optional[float]) -> Dict[str, Any]:
    return {
        "value": value,
        "dataSource": "derived",
        "sourceLabel": f"DefiLlama / protocol docs ({_CAPTURED_AT})",
        "updatedAt": None,
    }


def _empty_scale(tvl_usd: Optional[float] = None, market_cap_usd: Optional[float] = None) -> Dict[str, Any]:
    return {
        "tvlUsd": tvl_usd,
        "users": None,
        "aprPct": None,
        "targetAprPct": None,
        "marketCapUsd": market_cap_usd,
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


def _audit_fact(value: str, source_label: str, source_url: str) -> Dict[str, Any]:
    return {
        "key": "auditFirms",
        "value": value,
        "freshness": "static",
        "source": {"label": source_label, "url": source_url},
        "capturedAt": _CAPTURED_AT,
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
    sub_sector: str,
    secondary_tags: List[str],
    dex: Dict[str, Any],
    member_coins: List[Dict[str, Any]],
    chains: List[str],
    audit_firms: Optional[str] = None,
    competitors: Optional[List[Dict[str, Any]]] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    discord: Optional[str] = None,
    github: Optional[str] = None,
    risks: Optional[List[Dict[str, str]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    tvl_usd: Optional[float] = None,
    scale_labels: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Build a DEX-entity spec, filling the editorial defaults that
    `build_entity_item` expects so each entry stays focused on real content."""
    offchain_facts: List[Dict[str, Any]] = []
    if audit_firms:
        offchain_facts.append(_audit_fact(audit_firms, name, official_docs or website or ""))
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
        "discord": discord,
        "github": github,
        "components": [],
        "faq": [],
        "org_structure": [],
        "tradfi_comparison": [],
        "risks": risks or [],
        "events": events or [],
        "investment_rounds": [],
        "partnerships": [],
        "current_scale": _empty_scale(tvl_usd=tvl_usd),
        "scale_labels": scale_labels or {"tvl": "Protocol TVL"},
        "offchain_facts": offchain_facts or None,
        # Taxonomy hierarchy.
        "sub_category": "Protocol",
        "sector": "DEX",
        "sub_sector": sub_sector,
        # `tags` is the lending-tag vocabulary on NetworkProfile; keep it empty
        # for DEX entities and use the dedicated dex fields below.
        "tags": [],
        "dex_sub_sector": sub_sector,
        "dex_secondary_tags": secondary_tags,
        "competitors": competitors or [_UNISWAP_COMPETITOR],
        "dex": dex,
        "member_coins": member_coins,
        "portal_defaults": _portal_defaults(chains),
    }


# Reusable competitor entry pointing back at the reference spot DEX.
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
    "differences": "Hyperliquid runs a fully on-chain central limit order book on its own L1 with sub-second finality.",
}


DEX_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ---- Spot / AMM / Aggregator ----------------------------------------
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
        sub_sector="Concentrated Liquidity",
        secondary_tags=["Spot", "Multi-Chain", "L2-Native", "Hooks", "CLMM", "veTokenomics"],
        official_docs="https://docs.uniswap.org",
        website="https://uniswap.org",
        twitter="https://x.com/Uniswap",
        github="https://github.com/Uniswap",
        audit_firms="Trail of Bits, ABDK Consulting, ChainSecurity (V3 + V4).",
        chains=[
            "Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "BNB Chain",
            "Avalanche", "Blast", "Celo", "ZKsync", "Worldchain", "Unichain",
        ],
        tvl_usd=3_120_000_000,
        dex={
            "tvlUsd": _sourced(3_120_000_000),
            "volume30dUsd": _sourced(42_600_000_000),
            "governanceToken": "UNI",
            "auditHistory": "Trail of Bits, ABDK Consulting, ChainSecurity (V3 + V4).",
            "deployment": {
                "chains": ["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "+7 more"],
                "evmCompatible": "yes",
                "notes": "Native on 12+ EVM chains; Unichain is Uniswap's own L2.",
            },
            "subSectorMetrics": {
                "kind": "amm",
                "pools": _sourced(None),
                "feeTierStructure": "0.01% / 0.05% / 0.30% / 1.00% (V3) + dynamic via hooks (V4)",
            },
        },
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
            "tokenomics where governance power is bought with locked CRV (veCRV) "
            "and runs its own crvUSD CDP stablecoin."
        ),
        differentiator=(
            "Stableswap invariant gives minimal slippage on like-pegged trades; "
            "veCRV bribe markets (Convex/Votium) steer emissions."
        ),
        sub_sector="Stableswap",
        secondary_tags=["Spot", "Multi-Chain", "veTokenomics"],
        official_docs="https://docs.curve.fi",
        website="https://curve.fi",
        twitter="https://x.com/CurveFinance",
        github="https://github.com/curvefi",
        audit_firms="Trail of Bits, MixBytes, ChainSecurity (multi-round).",
        chains=[
            "Ethereum", "Arbitrum", "Optimism", "Polygon", "Base", "BNB Chain",
            "Avalanche", "Fantom", "Gnosis", "ZKsync", "Fraxtal", "Sonic",
        ],
        tvl_usd=1_440_000_000,
        competitors=[_UNISWAP_COMPETITOR],
        dex={
            "tvlUsd": _sourced(1_440_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "CRV",
            "auditHistory": "Trail of Bits, MixBytes, ChainSecurity (multi-round).",
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Optimism", "Polygon", "Base", "+7 more"],
                "evmCompatible": "yes",
                "notes": "crvUSD multi-chain; LLAMMA soft-liquidation CDP.",
            },
            "subSectorMetrics": {
                "kind": "amm",
                "pools": _sourced(None),
                "feeTierStructure": "0.04% (stableswap) to 0.40% (crypto pools)",
            },
        },
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
        sub_sector="AMM",
        secondary_tags=["Spot", "Multi-Chain", "veTokenomics"],
        official_docs="https://docs.balancer.fi",
        website="https://balancer.fi",
        twitter="https://x.com/Balancer",
        github="https://github.com/balancer",
        audit_firms="Trail of Bits, OpenZeppelin, Certora.",
        chains=["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "Avalanche", "Gnosis", "ZKsync"],
        tvl_usd=136_000_000,
        dex={
            "tvlUsd": _sourced(136_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "BAL",
            "auditHistory": "Trail of Bits, OpenZeppelin, Certora.",
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "+3 more"],
                "evmCompatible": "yes",
                "notes": "Weighted, Composable Stable, and Boosted pools; V3 with hooks.",
            },
            "subSectorMetrics": {
                "kind": "amm",
                "pools": _sourced(None),
                "feeTierStructure": "0.01% to 10% (pool-creator set)",
            },
        },
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
        sub_sector="ve(3,3)",
        secondary_tags=["Spot", "L2-Native", "veTokenomics"],
        official_docs="https://docs.aerodrome.finance",
        website="https://aerodrome.finance",
        twitter="https://x.com/aerodromefi",
        audit_firms="Spearbit, code4rena contests.",
        chains=["Base", "Optimism"],
        tvl_usd=310_000_000,
        dex={
            "tvlUsd": _sourced(310_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "AERO",
            "auditHistory": "Spearbit, code4rena contests.",
            "deployment": {
                "chains": ["Base", "Optimism"],
                "evmCompatible": "yes",
                "notes": "Base-native; Optimism via Superchain merger with Velodrome.",
            },
            "subSectorMetrics": {
                "kind": "amm",
                "pools": _sourced(None),
                "feeTierStructure": "0.02% to 0.05% (variable per pool)",
            },
        },
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
            "with gamification (lotteries, predictions, NFTs) plus its Infinity CLMM "
            "and a perps DEX."
        ),
        differentiator=(
            "Retail-first BNB DEX with v3 CLMM, Infinity (hook-like router), perps, "
            "and an IFO launchpad."
        ),
        sub_sector="Concentrated Liquidity",
        secondary_tags=["Spot", "Perps", "Multi-Chain", "CLMM", "veTokenomics"],
        official_docs="https://docs.pancakeswap.finance",
        website="https://pancakeswap.finance",
        twitter="https://x.com/PancakeSwap",
        github="https://github.com/pancakeswap",
        audit_firms="Certik, PeckShield (multi-round).",
        chains=["BNB Chain", "Ethereum", "Arbitrum", "Base", "Polygon zkEVM", "Linea", "opBNB", "ZKsync", "Aptos"],
        tvl_usd=2_130_000_000,
        dex={
            "tvlUsd": _sourced(2_130_000_000),
            "volume30dUsd": _sourced(25_100_000_000),
            "governanceToken": "CAKE",
            "auditHistory": "Certik, PeckShield (multi-round).",
            "deployment": {
                "chains": ["BNB Chain", "Ethereum", "Arbitrum", "Base", "+5 more"],
                "evmCompatible": "mixed",
                "notes": "BNB-primary; v3 CLMM + Infinity router; Aptos (non-EVM).",
            },
            "subSectorMetrics": {
                "kind": "amm",
                "pools": _sourced(None),
                "feeTierStructure": "0.01% / 0.05% / 0.25% / 1.00%",
            },
        },
        member_coins=[
            _coin("cake", "PancakeSwap", "CAKE", "Governance + utility token"),
        ],
    ),
    "trader-joe": _net(
        name="Trader Joe / LFJ",
        symbol="JOE",
        tagline="Liquidity Book DEX with discrete price bins.",
        description=(
            "Trader Joe (LFJ) uses a 'Liquidity Book' architecture of discrete price "
            "bins — zero slippage within a bin plus dynamic fees that adjust to "
            "volatility to protect LPs from impermanent loss."
        ),
        differentiator=(
            "Liquidity Book bins give zero in-bin slippage and volatility-aware "
            "dynamic fees; AutoPool automates LP management."
        ),
        sub_sector="Concentrated Liquidity",
        secondary_tags=["Spot", "Multi-Chain", "veTokenomics"],
        official_docs="https://docs.lfj.gg",
        website="https://lfj.gg",
        twitter="https://x.com/LFJ_gg",
        audit_firms="PaladinSec, Hexens.",
        chains=["Avalanche", "Arbitrum", "BNB Chain"],
        tvl_usd=23_000_000,
        dex={
            "tvlUsd": _sourced(23_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "JOE",
            "auditHistory": "PaladinSec, Hexens.",
            "deployment": {
                "chains": ["Avalanche", "Arbitrum", "BNB Chain"],
                "evmCompatible": "yes",
                "notes": "Avalanche-primary; Liquidity Book bins + Banker Joe lending.",
            },
            "subSectorMetrics": {
                "kind": "amm",
                "pools": _sourced(None),
                "feeTierStructure": "Dynamic (base 0.20%-1.00% + volatility surcharge)",
            },
        },
        member_coins=[
            _coin("joe", "JOE", "JOE", "Governance token (sJOE / veJOE staking)"),
        ],
    ),
    "sushiswap": _net(
        name="SushiSwap",
        symbol="SUSHI",
        tagline="Aggressively multi-chain AMM with cross-chain swaps.",
        description=(
            "SushiSwap maintains an aggressive multi-chain presence (40+ chains). "
            "SushiXSwap enables cross-chain swaps between assets on entirely "
            "different chains in one transaction."
        ),
        differentiator=(
            "40+ chain coverage and SushiXSwap (Stargate + Squid routed) cross-chain "
            "swaps; classic AMM + Trident + V3 CLMM."
        ),
        sub_sector="AMM",
        secondary_tags=["Spot", "Multi-Chain", "Hooks"],
        official_docs="https://docs.sushi.com",
        website="https://www.sushi.com",
        twitter="https://x.com/SushiSwap",
        github="https://github.com/sushiswap",
        audit_firms="PeckShield, OpenZeppelin.",
        chains=["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "BNB Chain", "Avalanche", "Gnosis", "Linea", "Scroll", "Sonic", "Blast"],
        tvl_usd=82_000_000,
        dex={
            "tvlUsd": _sourced(82_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "SUSHI",
            "auditHistory": "PeckShield, OpenZeppelin.",
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "+35 more"],
                "evmCompatible": "yes",
                "notes": "40+ chains; SushiXSwap cross-chain; Kashi lending.",
            },
            "subSectorMetrics": {
                "kind": "amm",
                "pools": _sourced(None),
                "feeTierStructure": "0.05% / 0.30% / 1.00% (V3)",
            },
        },
        member_coins=[
            _coin("sushi", "Sushi", "SUSHI", "Governance token (xSUSHI fee-share staking)"),
        ],
    ),
    "raydium": _net(
        name="Raydium",
        symbol="RAY",
        tagline="Solana's major hybrid AMM + orderbook DEX.",
        description=(
            "Raydium is Solana's major AMM with a hybrid model — it shares liquidity "
            "with the OpenBook central limit order book, so AMM and orderbook flow "
            "benefit each other. It is the dominant venue for Solana meme-coin liquidity."
        ),
        differentiator=(
            "Hybrid AMM shares liquidity with the OpenBook CLOB; handles 55%+ of "
            "Jupiter-routed Solana trades."
        ),
        sub_sector="Hybrid AMM + Orderbook",
        secondary_tags=["Spot", "Solana-Native", "Non-EVM"],
        official_docs="https://docs.raydium.io",
        website="https://raydium.io",
        twitter="https://x.com/RaydiumProtocol",
        audit_firms="Kudelski Security, OtterSec.",
        chains=["Solana"],
        tvl_usd=841_000_000,
        dex={
            "tvlUsd": _sourced(841_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "RAY",
            "auditHistory": "Kudelski Security, OtterSec.",
            "deployment": {
                "chains": ["Solana"],
                "evmCompatible": "no",
                "notes": "Standard AMM + CLMM + Fusion Pools; AcceleRaytor launchpad.",
            },
            "subSectorMetrics": {
                "kind": "amm",
                "pools": _sourced(None),
                "feeTierStructure": "0.25% (default), 0.05% (stable pairs)",
            },
        },
        member_coins=[
            _coin("ray", "Raydium", "RAY", "Governance + utility token"),
        ],
    ),
    "thorchain": _net(
        name="THORChain",
        symbol="RUNE",
        tagline="Native cross-chain swaps with no wrapping.",
        description=(
            "THORChain is an independent Cosmos-SDK L1 enabling native cross-chain "
            "swaps (native BTC <-> native ETH <-> native BNB, etc.) with no wrapping, "
            "using threshold-signature (TSS) vaults per supported chain."
        ),
        differentiator=(
            "Native asset settlement (no wrapped tokens) across BTC/ETH/BNB and more "
            "via per-chain TSS vaults; RUNE is the settlement asset."
        ),
        sub_sector="Cross-Chain Native",
        secondary_tags=["Spot", "Non-EVM", "Appchain", "Recently-Exploited"],
        official_docs="https://docs.thorchain.org",
        website="https://thorchain.org",
        twitter="https://x.com/THORChain",
        audit_firms="Trail of Bits, Halborn (multiple rounds).",
        chains=["THORChain L1", "Bitcoin", "Ethereum", "BNB Chain", "Avalanche", "Cosmos", "Bitcoin Cash", "Litecoin", "Dogecoin", "Base"],
        tvl_usd=54_000_000,
        risks=[
            {
                "category": "Smart Contract",
                "description": (
                    "Recovered only partially after the Jan 2025 solvency event; "
                    "THORFi lending and savers products were removed post-incident."
                ),
            }
        ],
        dex={
            "tvlUsd": _sourced(54_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "RUNE",
            "auditHistory": "Trail of Bits, Halborn (multiple rounds).",
            "deployment": {
                "chains": ["THORChain L1", "Bitcoin", "Ethereum", "BNB Chain", "+6 more"],
                "evmCompatible": "no",
                "notes": "Cosmos-SDK L1 settling native assets across integrated chains.",
            },
            "subSectorMetrics": {
                "kind": "cross-chain",
                "integratedChains": _sourced(10),
                "nativeAssetsSupported": ["BTC", "ETH", "BNB", "AVAX", "ATOM", "BCH", "LTC", "DOGE"],
                "bridgeArchitecture": "Threshold-signature (TSS) vaults per chain; slip-based dynamic fees.",
            },
        },
        member_coins=[
            _coin("rune", "THORChain", "RUNE", "Settlement + governance asset"),
        ],
    ),
    # ---- Perpetuals / Derivatives ---------------------------------------
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
        sub_sector="Orderbook",
        secondary_tags=["Perps", "Spot", "Derivatives", "Appchain"],
        official_docs="https://hyperliquid.gitbook.io",
        website="https://hyperliquid.xyz",
        twitter="https://x.com/HyperliquidX",
        audit_firms="Zellic, multiple independent rounds.",
        chains=["Hyperliquid L1", "Arbitrum"],
        tvl_usd=6_030_000_000,
        competitors=[_UNISWAP_COMPETITOR],
        dex={
            "tvlUsd": _sourced(6_030_000_000),
            "volume30dUsd": _sourced(245_000_000_000),
            "governanceToken": "HYPE",
            "auditHistory": "Zellic, multiple independent rounds.",
            "deployment": {
                "chains": ["Hyperliquid L1", "Arbitrum"],
                "evmCompatible": "mixed",
                "notes": "Native L1 CLOB; Arbitrum for bridge deposits; HyperEVM execution layer.",
            },
            "subSectorMetrics": {
                "kind": "orderbook",
                "markets": _sourced(None),
                "makerRebatePct": _sourced(None),
                "takerFeePct": _sourced(0.025),
                "openInterestUsd": _sourced(None),
            },
        },
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
        sub_sector="Orderbook",
        secondary_tags=["Perps", "Derivatives", "Appchain", "Non-EVM"],
        official_docs="https://docs.dydx.exchange",
        website="https://dydx.exchange",
        twitter="https://x.com/dYdX",
        github="https://github.com/dydxprotocol",
        audit_firms="Informal Systems, Sigma Prime, Trail of Bits.",
        chains=["dYdX Chain", "Ethereum"],
        tvl_usd=135_000_000,
        competitors=[_HYPERLIQUID_COMPETITOR],
        dex={
            "tvlUsd": _sourced(135_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "DYDX",
            "auditHistory": "Informal Systems, Sigma Prime, Trail of Bits.",
            "deployment": {
                "chains": ["dYdX Chain", "Ethereum"],
                "evmCompatible": "no",
                "notes": "Cosmos appchain (V4) primary; Ethereum V3 legacy still operational.",
            },
            "subSectorMetrics": {
                "kind": "orderbook",
                "markets": _sourced(None),
                "makerRebatePct": _sourced(0.02),
                "takerFeePct": _sourced(0.05),
                "openInterestUsd": _sourced(None),
            },
        },
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
        sub_sector="Perpetuals",
        secondary_tags=["Perps", "Spot", "Multi-Chain", "L2-Native"],
        official_docs="https://docs.gmx.io",
        website="https://gmx.io",
        twitter="https://x.com/GMX_IO",
        github="https://github.com/gmx-io",
        audit_firms="ABDK Consulting, Quantstamp.",
        chains=["Arbitrum", "Avalanche"],
        tvl_usd=177_000_000,
        competitors=[_HYPERLIQUID_COMPETITOR],
        dex={
            "tvlUsd": _sourced(177_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "GMX",
            "auditHistory": "ABDK Consulting, Quantstamp.",
            "deployment": {
                "chains": ["Arbitrum", "Avalanche"],
                "evmCompatible": "yes",
                "notes": "Arbitrum-primary; V2 isolated GM markets per asset.",
            },
            "subSectorMetrics": {
                "kind": "perps",
                "markets": _sourced(None),
                "openInterestUsd": _sourced(None),
                "fundingRateModel": "Borrow fees per market; oracle-priced fills.",
                "maxLeverage": _sourced(None),
                "liquidationsVolume30dUsd": _sourced(None),
            },
        },
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
        sub_sector="Hybrid AMM + Orderbook",
        secondary_tags=["Perps", "Spot", "Solana-Native", "Non-EVM"],
        official_docs="https://docs.drift.trade",
        website="https://drift.trade",
        twitter="https://x.com/DriftProtocol",
        audit_firms="OtterSec, Zellic.",
        chains=["Solana"],
        tvl_usd=205_000_000,
        competitors=[_HYPERLIQUID_COMPETITOR],
        dex={
            "tvlUsd": _sourced(205_000_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "DRIFT",
            "auditHistory": "OtterSec, Zellic.",
            "deployment": {
                "chains": ["Solana"],
                "evmCompatible": "no",
                "notes": "DLOB + vAMM hybrid; Drift Vaults passive strategies.",
            },
            "subSectorMetrics": {
                "kind": "perps",
                "markets": _sourced(None),
                "openInterestUsd": _sourced(None),
                "fundingRateModel": "Hourly funding on DLOB/vAMM hybrid.",
                "maxLeverage": _sourced(None),
                "liquidationsVolume30dUsd": _sourced(None),
            },
        },
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
        sub_sector="Perpetuals",
        secondary_tags=["Perps", "Multi-Chain", "L2-Native"],
        official_docs="https://docs.gains.trade",
        website="https://gains.trade",
        twitter="https://x.com/GainsNetwork_io",
        audit_firms="Halborn, Code4rena contests.",
        chains=["Arbitrum", "Polygon", "Base"],
        tvl_usd=13_300_000,
        competitors=[_HYPERLIQUID_COMPETITOR],
        dex={
            "tvlUsd": _sourced(13_300_000),
            "volume30dUsd": _sourced(None),
            "governanceToken": "GNS",
            "auditHistory": "Halborn, Code4rena contests.",
            "deployment": {
                "chains": ["Arbitrum", "Polygon", "Base"],
                "evmCompatible": "yes",
                "notes": "Arbitrum-primary; gToken LP model (gUSDC, gGNS).",
            },
            "subSectorMetrics": {
                "kind": "perps",
                "markets": _sourced(None),
                "openInterestUsd": _sourced(None),
                "fundingRateModel": "Open/close 0.04-0.08% per side + rollover funding.",
                "maxLeverage": _sourced(150),
                "liquidationsVolume30dUsd": _sourced(None),
            },
        },
        member_coins=[
            _coin("gns", "Gains Network", "GNS", "Governance token (gGNS vault collateral)"),
        ],
    ),
}
