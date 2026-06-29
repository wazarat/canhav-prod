#!/usr/bin/env python3
"""
DEX-entity specs (PDF "DEX + RWA Sector Expansion" §1/§3).

The 9 spot/cross-chain DEX entities that join the existing Jupiter aggregator
under the Network -> Protocol -> DEX taxonomy, each tagged with its DEX
sub-sector (spec §1) and 0+ secondary tags:

    Concentrated Liquidity .. Uniswap, PancakeSwap, Trader Joe
    Stableswap .............. Curve Finance
    AMM ..................... Balancer, SushiSwap
    ve(3,3) ................. Aerodrome
    Hybrid AMM + Orderbook .. Raydium
    Cross-Chain Native ...... THORChain

Perp venues (GMX, Gains, dYdX, Hyperliquid, Drift) live in derivatives_specs.py.

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

DEX_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ---- Spot / AMM / Aggregator (Curve, Uniswap, Balancer, Aerodrome,
    # PancakeSwap moved to liquidity_specs.py as exclusive Liquidity / Pools) --
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
}

# Per-network MemberCoin audit registry (expected count + rationale).
# Used by validate_taxonomy.py --report-member-coins; does not enforce caps at ingest.
DEX_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    "trader-joe": {"expected": 1, "rationale": "JOE governance"},
    "sushiswap": {"expected": 1, "rationale": "SUSHI governance"},
    "raydium": {"expected": 1, "rationale": "RAY governance"},
    "thorchain": {"expected": 1, "rationale": "RUNE settlement asset"},
    "jupiter": {
        "expected": "multi",
        "rationale": "JUP + JLP + JupUSD + JLP-USD + JupSOL",
        "action_hint": "review_multi_coin",
    },
}
