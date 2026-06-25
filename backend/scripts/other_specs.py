#!/usr/bin/env python3
"""
Other-network specs (canhav-other-spec §3/§4).

The pure-play Other entities that join the Network -> Protocol -> Other taxonomy,
each tagged with an Other sub-sector (Underwriting / Governance) and 0+ secondary
tags. Convex Finance and Aura are extend-existing in ingest_entities.py (primary
Liquidity/Vaults + secondary Other/Governance) and are intentionally NOT duplicated
here.

Live Tier-1 metrics (tvlUsd, tvlChangePct, token price/mcap, fees, derived
marketSharePct) are filled by the DeFiLlama + CoinGecko cron pass
(app/api/cron/refresh + lib/server/other.ts). Tier-2 fields stay curated/null.

Resolver ids live in frontend/data/other-seed.ts and cron maps
(LLAMA_PROTOCOL_SLUGS / NETWORK_COINGECKO_IDS).

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
    other_sub_sector: str,
    other_secondary_tags: List[str],
    chains: List[str],
    member_coins: Optional[List[Dict[str, Any]]] = None,
    cover_model: Optional[str] = None,
    covered_protocols: Optional[List[str]] = None,
    target_protocols: Optional[List[str]] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    github: Optional[str] = None,
    scale_labels: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Build an Other-network spec with the editorial defaults
    `build_entity_item` expects. `other` holds the curated Tier-2 block; the
    cron overlays Tier-1 live fields."""
    other: Dict[str, Any] = {
        "deployment": {"chains": chains, "evmCompatible": "yes"},
    }
    if cover_model is not None:
        other["coverModel"] = cover_model
    if covered_protocols:
        other["coveredProtocols"] = covered_protocols
    if target_protocols:
        other["targetProtocols"] = target_protocols

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
        "sub_category": "Protocol",
        "sector": "Other",
        "sub_sector": other_sub_sector,
        "other_sub_sector": other_sub_sector,
        "other_secondary_tags": other_secondary_tags,
        "other": other,
        "tags": [],
        "competitors": [],
        "member_coins": member_coins or [],
        "portal_defaults": _portal_defaults(chains),
    }


OTHER_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # --------------------------- UNDERWRITING ---------------------------------
    "nexus-mutual": _net(
        name="Nexus Mutual",
        symbol="wNXM",
        tagline="Member-owned decentralized cover for smart-contract risk.",
        description=(
            "Nexus Mutual is a mutual where members pool capital to underwrite smart-"
            "contract and protocol risks. Claims are assessed by member vote; NXM "
            "(wrapped as wNXM for trading) governs the mutual and backs the capital pool."
        ),
        differentiator=(
            "The longest-running on-chain mutual model with claims-assessed cover "
            "rather than parametric triggers — members vote on whether a loss event qualifies."
        ),
        other_sub_sector="Underwriting",
        other_secondary_tags=["Claims-Assessed"],
        chains=["Ethereum"],
        cover_model="claims-assessed",
        covered_protocols=["Aave", "Compound", "Curve", "Balancer"],
        official_docs="https://docs.nexusmutual.io",
        website="https://nexusmutual.io",
        twitter="https://x.com/NexusMutual",
        github="https://github.com/NexusMutual",
        member_coins=[
            _coin("wnxm", "Wrapped NXM", "wNXM", "Mutual membership + governance (wrapped NXM)"),
        ],
    ),
    "sherlock": _net(
        name="Sherlock",
        symbol="",
        tagline="Audit-backed protocol coverage with a first-loss capital pool.",
        description=(
            "Sherlock provides smart-contract audit coverage for DeFi protocols. "
            "Security researchers and stakers back a first-loss capital pool that pays "
            "out when covered protocols suffer exploits matching policy terms."
        ),
        differentiator=(
            "Ties underwriting directly to audit coverage — protocols pay premiums and "
            "stakers backstop exploit losses on audited codebases."
        ),
        other_sub_sector="Underwriting",
        other_secondary_tags=["Audit-Coverage"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Polygon"],
        cover_model="claims-assessed",
        official_docs="https://docs.sherlock.xyz",
        website="https://sherlock.xyz",
        twitter="https://x.com/sherlockdefi",
        github="https://github.com/sherlock-protocol",
    ),
    "insurace": _net(
        name="InsurAce",
        symbol="INSUR",
        tagline="Multi-chain portfolio insurance with a capital pool backstop.",
        description=(
            "InsurAce offers portfolio-level cover across many EVM chains. Policyholders "
            "pay premiums into a pooled capital model; INSUR governs parameters and "
            "participates in the protocol's risk-sharing design."
        ),
        differentiator=(
            "Broad multi-chain underwriting footprint with packaged portfolio cover "
            "rather than single-protocol mutual membership."
        ),
        other_sub_sector="Underwriting",
        other_secondary_tags=["Multi-Chain"],
        chains=["Ethereum", "BSC", "Polygon", "Arbitrum", "Optimism", "Avalanche"],
        cover_model="claims-assessed",
        official_docs="https://docs.insurace.io",
        website="https://www.insurace.io",
        twitter="https://x.com/InsurAce_io",
        github="https://github.com/InsurAce-Protocol",
        member_coins=[
            _coin("insur", "InsurAce", "INSUR", "Governance + staking token"),
        ],
    ),
    "neptune-mutual": _net(
        name="Neptune Mutual",
        symbol="NPM",
        tagline="Parametric cover pools for on-chain loss events.",
        description=(
            "Neptune Mutual runs parametric cover pools where payouts trigger when "
            "predefined on-chain conditions are met (e.g. protocol TVL drops beyond a "
            "threshold). NPM governs pool parameters and risk frameworks."
        ),
        differentiator=(
            "Parametric, on-chain-trigger payouts — no member claims vote — enabling "
            "faster settlement when cover conditions are objectively met."
        ),
        other_sub_sector="Underwriting",
        other_secondary_tags=["Parametric-Cover"],
        chains=["Ethereum", "Arbitrum", "BSC"],
        cover_model="parametric",
        official_docs="https://docs.neptune-mutual.com",
        website="https://neptune-mutual.com",
        twitter="https://x.com/neptune_mutual",
        github="https://github.com/neptune-mutual",
        member_coins=[
            _coin("npm", "Neptune Mutual", "NPM", "Governance token"),
        ],
    ),
    "cozy-finance": _net(
        name="Cozy Finance",
        symbol="",
        tagline="Parametric protection markets for DeFi protocols.",
        description=(
            "Cozy Finance (Cozy Protocol) lets users buy and sell parametric protection "
            "against protocol-specific triggers. Protection markets settle automatically "
            "when on-chain conditions fire — no token governs the core markets today."
        ),
        differentiator=(
            "Composable parametric protection markets with automatic settlement — "
            "coverage is expressed as tradable positions rather than mutual membership."
        ),
        other_sub_sector="Underwriting",
        other_secondary_tags=["Parametric-Cover"],
        chains=["Ethereum", "Optimism"],
        cover_model="parametric",
        official_docs="https://docs.cozy.finance",
        website="https://cozy.finance",
        twitter="https://x.com/CozyFinance",
        github="https://github.com/Cozy-Finance",
    ),
    "ease-org": _net(
        name="Ease.org",
        symbol="EASE",
        tagline="Coverage vaults and reciprocal protection for DeFi portfolios.",
        description=(
            "Ease.org (formerly Armor) provides coverage vaults where users deposit "
            "assets into reciprocal protection pools. EASE governs vault parameters and "
            "the protocol's coverage allocation across integrated DeFi venues."
        ),
        differentiator=(
            "Reciprocal coverage vaults that spread risk across multiple protocols in "
            "one deposit — a portfolio-style underwriting wrapper."
        ),
        other_sub_sector="Underwriting",
        other_secondary_tags=["Multi-Chain"],
        chains=["Ethereum"],
        cover_model="reciprocal",
        official_docs="https://docs.ease.org",
        website="https://ease.org",
        twitter="https://x.com/EaseDeFi",
        github="https://github.com/EaseDeFi",
        member_coins=[
            _coin("ease", "Ease.org", "EASE", "Governance token"),
        ],
    ),
    # ---------------------------- GOVERNANCE ----------------------------------
    "votium": _net(
        name="Votium",
        symbol="",
        tagline="Curve veCRV bribe marketplace for liquidity incentives.",
        description=(
            "Votium is a bribe marketplace where protocols pay to influence Convex "
            "voters' veCRV allocations toward specific Curve gauges. It routes bribes "
            "to vlCVX holders who vote on emissions — no standalone governance token."
        ),
        differentiator=(
            "The primary off-chain coordination layer for Curve bribes via Convex "
            "voters — rent liquidity by paying vlCVX holders directly."
        ),
        other_sub_sector="Governance",
        other_secondary_tags=["Bribe-Marketplace"],
        chains=["Ethereum"],
        target_protocols=["Curve", "Convex"],
        official_docs="https://docs.votium.app",
        website="https://votium.app",
        twitter="https://x.com/Votium",
        github=None,
    ),
    "hidden-hand": _net(
        name="Redacted (Hidden Hand)",
        symbol="BTRFLY",
        tagline="Governance incentives marketplace for vote-escrow protocols.",
        description=(
            "Hidden Hand (Redacted Cartel) operates bribe marketplaces where protocols "
            "pay to steer vote-escrow emissions on Curve, Balancer, Frax and related "
            "venues. BTRFLY governs the Redacted ecosystem treasury and incentive routing."
        ),
        differentiator=(
            "Multi-protocol bribe marketplace spanning Curve/Frax/Balancer vote-escrow "
            "systems — the Hidden Hand brand is the canonical bribe venue."
        ),
        other_sub_sector="Governance",
        other_secondary_tags=["Bribe-Marketplace"],
        chains=["Ethereum"],
        target_protocols=["Curve", "Balancer", "Frax"],
        official_docs="https://docs.redacted.finance",
        website="https://redacted.finance",
        twitter="https://x.com/redactedcartel",
        github="https://github.com/redacted-cartel",
        member_coins=[
            _coin("btrfly", "Redacted", "BTRFLY", "Governance token (Redacted Cartel)"),
        ],
    ),
    "paladin": _net(
        name="Paladin",
        symbol="PAL",
        tagline="Vote-marketplace and liquid lockers for governance tokens.",
        description=(
            "Paladin runs Paladin Vote — a bribe marketplace for liquidity gauge "
            "incentives — and liquid locker products that wrap vote-escrow positions "
            "while retaining voting rights. PAL governs the protocol."
        ),
        differentiator=(
            "Combines bribe marketplaces with liquid locker infrastructure so "
            "depositors keep voting power on locked governance positions."
        ),
        other_sub_sector="Governance",
        other_secondary_tags=["Bribe-Marketplace"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Polygon"],
        target_protocols=["Curve", "Balancer", "Frax"],
        official_docs="https://docs.paladin.vote",
        website="https://paladin.vote",
        twitter="https://x.com/PaladinVote",
        github="https://github.com/PaladinFinance",
        member_coins=[
            _coin("pal", "Paladin", "PAL", "Governance token"),
        ],
    ),
    "stake-dao": _net(
        name="Stake DAO",
        symbol="SDT",
        tagline="Liquid lockers and vote aggregation across DeFi governance.",
        description=(
            "Stake DAO aggregates vote-escrow positions (Curve, Balancer, Frax) via "
            "liquid lockers and strategies. SDT governs the protocol; lockers retain "
            "voting rights for depositors while enabling liquid exposure."
        ),
        differentiator=(
            "Liquid locker + vote-aggregator spanning multiple vote-escrow ecosystems "
            "with on-chain strategies over locked governance positions."
        ),
        other_sub_sector="Governance",
        other_secondary_tags=["Vote-Aggregator", "Liquid-Locker"],
        chains=["Ethereum", "Arbitrum", "Polygon", "Optimism"],
        target_protocols=["Curve", "Balancer", "Frax"],
        official_docs="https://docs.stakedao.org",
        website="https://stakedao.org",
        twitter="https://x.com/StakeDAOHQ",
        github="https://github.com/StakeDAO",
        member_coins=[
            _coin("sdt", "Stake DAO", "SDT", "Governance token"),
        ],
    ),
}
