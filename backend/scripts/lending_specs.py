#!/usr/bin/env python3
"""
Lending-network specs (PDF "CanHav - Week (7+8) Q2_26").

The eight new lending networks that join Aave under the
Network -> Protocol -> Lending taxonomy, each tagged with its lending
sub-sector (PDF "Further sub categories within lending"):

    Money Markets ................ Aave*, Compound, JustLend, Venus
    Isolated / Curated Lending ... Morpho, Kamino
    Stablecoin-Native Credit ..... Spark
    Liquidity Hybrid ............. Fluid
    Institutional / Private Credit Maple

(* Aave already exists; it is reclassified in entity_specs_batch_2.py.)

These dicts are merged into ENTITY_SPECS by ingest_entities.py and flattened to
store items by `build_entity_item`. Live lending metrics (TVL, borrow/supply
APY, utilization, fees/revenue) are filled by the DeFiLlama cron pass; the
curated string/array fields below are the static research that DeFiLlama does
not expose.

Stdlib only.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

# Lending→Credit migration: collapse the legacy 5-value lending taxonomy into
# the new 3-value Credit tags (see canhav-credit-implementation-spec §5).
_CREDIT_TAG_MIGRATION: Dict[str, str] = {
    "Money Markets": "Lending",
    "Isolated / Curated Lending": "Lending",
    "Stablecoin-Native Credit Stack": "Lending",
    "Institutional / Private Credit": "Lending",
    "Liquidity Hybrid": "Leveraged Yield",
    # New tags pass through unchanged.
    "Lending": "Lending",
    "Leveraged Yield": "Leveraged Yield",
    "Fixed Income": "Fixed Income",
}


def _migrate_credit_tags(tags: List[str]) -> List[str]:
    """Map legacy lending tags to Credit tags, de-duplicating while preserving order."""
    out: List[str] = []
    for tag in tags:
        mapped = _CREDIT_TAG_MIGRATION.get(tag, tag)
        if mapped not in out:
            out.append(mapped)
    return out


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


def _portal_defaults(chains: List[str], logo_url: Optional[str] = None) -> Dict[str, Any]:
    return {
        "chains": chains,
        "subCategory": "Entity",
        "isLive": True,
        "isArbitrumNative": False,
        "isPubliclyAudited": True,
        "foundedDate": None,
        "logoUrl": logo_url,
        "bannerUrl": None,
        "portalUrl": None,
    }


def _net(
    *,
    name: str,
    symbol: str,
    csv_slug: Optional[str] = None,
    tagline: str,
    description: str,
    differentiator: str,
    sub_sector: str,
    chains: List[str],
    competitors: Optional[List[Dict[str, Any]]] = None,
    lending: Optional[Dict[str, Any]] = None,
    member_coins: Optional[List[Dict[str, Any]]] = None,
    tags: Optional[List[str]] = None,
    credit_tag_metrics: Optional[Dict[str, Any]] = None,
    lending_tag_metrics: Optional[Dict[str, Any]] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    discord: Optional[str] = None,
    github: Optional[str] = None,
    risks: Optional[List[Dict[str, str]]] = None,
    typed_risks: Optional[List[Dict[str, str]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    components: Optional[List[Dict[str, str]]] = None,
    faq: Optional[List[Dict[str, Any]]] = None,
    timeline: Optional[List[Dict[str, Any]]] = None,
    tokenomics: Optional[Dict[str, Any]] = None,
    offchain_facts: Optional[List[Dict[str, Any]]] = None,
    partnerships: Optional[List[Dict[str, Any]]] = None,
    org_structure: Optional[List[Dict[str, str]]] = None,
    tradfi_comparison: Optional[List[Dict[str, str]]] = None,
    investment_rounds: Optional[List[Dict[str, Any]]] = None,
    scale_labels: Optional[Dict[str, str]] = None,
    current_scale: Optional[Dict[str, Any]] = None,
    sources: Optional[List[Dict[str, Any]]] = None,
    audits: Optional[List[Dict[str, Any]]] = None,
    logo_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a lending-network spec, filling the editorial defaults that
    `build_entity_item` expects so each entry stays focused on real content.

    Lending→Credit migration: the legacy 5-value lending taxonomy is collapsed
    into the new 3-value Credit tags via `_CREDIT_TAG_MIGRATION`, and the sector
    string becomes "Credit". The legacy `lending_tag_metrics` blocks
    (isolatedCurated / stablecoinNative / liquidityHybrid / institutionalCredit /
    moneyMarkets) have no home in the new CreditTagMetrics shape and are dropped;
    re-authoring curated tag metrics for the new Credit tags is deferred.
    """
    if tags is not None:
        tag_list = _migrate_credit_tags(tags)
    else:
        tag_list = _migrate_credit_tags([sub_sector])
        if not tag_list:
            tag_list = ["Lending"]

    # Auto-derive curated `creditTagMetrics.lending` from the existing `lending`
    # block for Lending-tag entities when not explicitly supplied, so the
    # tag-specific panel shows curated collateral/oracles immediately (live
    # tvl/supply/borrow/util/APY are overlaid by the cron). Explicit
    # `credit_tag_metrics` always wins.
    ctm = credit_tag_metrics
    if ctm is None:
        ctm = {}
        if lending and "Lending" in tag_list:
            lb: Dict[str, Any] = {}
            if lending.get("collateralAssets"):
                lb["collateralAssets"] = lending["collateralAssets"]
            if lending.get("oracles"):
                lb["oracles"] = lending["oracles"]
            if lb:
                ctm["lending"] = lb

    return {
        "name": name,
        "symbol": symbol,
        "csv_slug": csv_slug,
        "tagline": tagline,
        "description": description,
        "differentiator": differentiator,
        "official_docs": official_docs,
        "website": website,
        "twitter": twitter,
        "discord": discord,
        "github": github,
        "components": components or [],
        "faq": faq or [],
        "org_structure": org_structure or [],
        "tradfi_comparison": tradfi_comparison or [],
        "risks": risks or [],
        "typed_risks": typed_risks,
        "events": events or [],
        "timeline": timeline,
        "tokenomics": tokenomics,
        "offchain_facts": offchain_facts,
        # Top-level provenance: SourceRef[] backing editorial claims, and audit
        # refs ({firm, date, url}) surfaced on the Risks tab. Both are consumed by
        # `build_entity_item` via spec.get("sources") / spec.get("audits").
        "sources": sources or [],
        "audits": audits,
        "investment_rounds": investment_rounds or [],
        "partnerships": partnerships or [],
        "current_scale": current_scale or _empty_scale(),
        "scale_labels": scale_labels or {"tvl": "Protocol TVL"},
        # Taxonomy hierarchy.
        "sub_category": "Protocol",
        "sector": "Credit",
        "sub_sector": tag_list[0] if tag_list else None,
        "tags": tag_list,
        "competitors": competitors or [],
        "lending": lending,
        # Per-tag curated metrics (Lending / Leveraged Yield / Fixed Income).
        # Live Tier-1 fields (tvl/supply/borrow/util/APY) are overlaid by the
        # cron Credit tag-metrics pass; these curated fields are authored here.
        "credit_tag_metrics": ctm or {},
        "member_coins": member_coins or [],
        "portal_defaults": _portal_defaults(chains, logo_url),
    }


# Reusable competitor entry pointing back at Aave (the reference brand).
_AAVE_COMPETITOR = {
    "name": "Aave",
    "slug": "aave",
    "rank": 1,
    "positioning": "Safest broad money-market brand.",
    "similarities": "Both let users supply and borrow crypto assets onchain.",
    "differences": (
        "Aave is the broadest general-purpose pooled money market — brand, liquidity "
        "depth, multi-chain reach and risk tooling."
    ),
}


def _lending_risks(*extra: Dict[str, str]) -> List[Dict[str, str]]:
    base = [
        {
            "category": "Smart Contract",
            "description": "Upgradeable or complex lending logic can fail under edge-case liquidations or parameter misconfiguration.",
        },
        {
            "category": "Oracle",
            "description": "Stale or manipulated price feeds impair collateral valuation and liquidations.",
        },
        {
            "category": "Collateral",
            "description": "Correlated collateral drawdowns or listing errors can create bad debt in money markets.",
        },
        {
            "category": "Liquidity",
            "description": "Thin borrow/supply depth impairs exits and liquidations during market stress.",
        },
        {
            "category": "Governance",
            "description": "Parameter changes, listings, and emissions are controlled by token holders or delegates.",
        },
    ]
    return base + list(extra)


_MORPHO_COMPONENTS = [
    {
        "name": "Morpho Blue",
        "description": "Minimal immutable lending primitive — each market fixes collateral, loan asset, oracle, and LLTV.",
    },
    {
        "name": "MetaMorpho vaults",
        "description": "Curated vaults that allocate supplier liquidity across Morpho Blue markets with supply caps.",
    },
    {
        "name": "MORPHO token",
        "description": "Governance token for the Morpho DAO and protocol fee routing.",
    },
]

_MORPHO_FAQ = [
    {
        "question": "How is Morpho different from Aave?",
        "answer": "Morpho uses isolated markets with fixed parameters per market; curators build vaults on top. Aave uses broader pooled markets with shared risk parameters.",
        "pinned": True,
    },
    {
        "question": "Who sets risk on Morpho vaults?",
        "answer": "Independent risk curators configure MetaMorpho vault allocations and supply caps; suppliers choose which curator vault to deposit into.",
        "pinned": True,
    },
    {
        "question": "Who builds and stewards Morpho?",
        "answer": "Morpho Labs builds the protocol and the nonprofit Morpho Association stewards governance. Morpho raised $175M in June 2026 led by a16z crypto, Paradigm and Ribbit Capital, valuing the network at up to $2B.",
        "pinned": False,
    },
    {
        "question": "How secure is Morpho Blue?",
        "answer": "Morpho Blue is an immutable, minimal core reviewed in 25+ security audits and formal verification (Certora Prover), with reviewers including Spearbit and OpenZeppelin.",
        "pinned": False,
    },
]

_COMPOUND_COMPONENTS = [
    {
        "name": "Compound III markets",
        "description": "Single base borrowable asset per market with separate collateral assets posted as collateral only.",
    },
    {
        "name": "COMP governance",
        "description": "Token holders propose and vote on new markets, collateral factors, and protocol upgrades.",
    },
]

_COMPOUND_FAQ = [
    {
        "question": "What changed in Compound III?",
        "answer": "Each market has one borrowable base asset (e.g. USDC); other assets are collateral-only, simplifying risk versus multi-asset pools.",
        "pinned": True,
    },
    {
        "question": "Is Compound custodial?",
        "answer": "No — users interact with non-custodial smart contracts; assets remain in protocol-controlled pools until withdrawn.",
        "pinned": True,
    },
    {
        "question": "Who controls Compound?",
        "answer": "COMP token holders via Compound DAO. Governance is fully on-chain: an address needs 1% of COMP delegated to it to submit a proposal, and passed proposals execute automatically after a timelock.",
        "pinned": False,
    },
    {
        "question": "Which chains does Compound III run on?",
        "answer": "Compound III launched on Ethereum in 2022 and has since been deployed multi-chain, including Base, Arbitrum, Optimism, Polygon and others via governance proposals.",
        "pinned": False,
    },
]

_SPARK_COMPONENTS = [
    {
        "name": "SparkLend",
        "description": "Lending market forked from Aave V3 architecture, optimized for Sky/Maker stablecoin liquidity.",
    },
    {
        "name": "Spark Savings",
        "description": "Yield product routing USDS/DAI liquidity from the Sky ecosystem at scale.",
    },
    {
        "name": "USDS / DAI liquidity",
        "description": "Primary stablecoin rails connecting Spark to the broader Sky/Maker credit stack.",
    },
]

_SPARK_FAQ = [
    {
        "question": "How is Spark related to Sky/Maker?",
        "answer": "Spark routes and lends stablecoin liquidity from the Sky (formerly Maker) ecosystem — USDS/DAI are the core rails. It is the first 'Star' (SubDAO) under Sky's Endgame plan.",
        "pinned": True,
    },
    {
        "question": "What is the Spark Liquidity Layer?",
        "answer": "The SLL is Spark's capital-routing system that mints, bridges and deploys stablecoin liquidity from Sky's $7B+ reserves across chains into DeFi and RWA. It had ~$3.6B allocated as of June 2025.",
        "pinned": False,
    },
    {
        "question": "What is the SPK token?",
        "answer": "SPK is Spark's governance and staking token, launched June 17 2025 with airdrop campaigns. It is staked for rewards and is planned to help secure Spark's token bridges.",
        "pinned": False,
    },
    {
        "question": "What are Spark Savings (sUSDS / sDAI)?",
        "answer": "Yield-bearing wrappers that pay a governance-set savings rate on stablecoins, with yield sourced from Sky ecosystem revenue. Users hold a receipt token that accrues value.",
        "pinned": False,
    },
]

_RADIANT_COMPONENTS = [
    {
        "name": "Radiant v2 markets",
        "description": "Cross-chain money markets with unified liquidity via LayerZero messaging.",
    },
    {
        "name": "RDNT emissions",
        "description": "Liquidity mining token incentivizing cross-chain supply and borrow.",
    },
]

_RADIANT_FAQ = [
    {
        "question": "What does omnichain mean for Radiant?",
        "answer": "Users can deposit on one chain and borrow on another; LayerZero bridges messaging between Radiant deployments.",
        "pinned": True,
    },
    {
        "question": "What happened in the 2024 hack?",
        "answer": "On October 16 2024 attackers drained ~$50M after compromising at least three core contributors' devices with malware and spoofing the Safe{Wallet} signing UI, so trusted signers unknowingly approved malicious multisig transactions. It was Radiant's second exploit of 2024 and was later attributed to the North Korean group UNC4736.",
        "pinned": True,
    },
    {
        "question": "Is Radiant still operating?",
        "answer": "In 2026 Radiant Capital announced it is winding down, unable to recover from the October 2024 exploit after ~18 months. Users should check official Radiant channels before interacting with any remaining contracts.",
        "pinned": False,
    },
]


LENDING_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    "morpho": _net(
        name="Morpho",
        symbol="MORPHO",
        csv_slug="morpho",
        tagline="Customizable lending infrastructure: isolated markets + curated vaults.",
        description=(
            "Morpho is a lending protocol built around Morpho Blue, a minimal primitive "
            "for creating isolated markets, with MetaMorpho vaults that allocate deposits "
            "across those markets through risk curators."
        ),
        differentiator=(
            "Instead of one big pool, Morpho Blue markets each fix a collateral, loan "
            "asset, oracle and liquidation setting; curators build vaults on top — more "
            "modular and risk-specific than Aave."
        ),
        sub_sector="Isolated / Curated Lending",
        official_docs="https://docs.morpho.org",
        website="https://morpho.org",
        twitter="https://x.com/MorphoLabs",
        github="https://github.com/morpho-org",
        chains=["Ethereum", "Base"],
        components=_MORPHO_COMPONENTS,
        faq=_MORPHO_FAQ,
        timeline=[
            {
                "date": "2023-01",
                "title": "Morpho Optimizer era",
                "description": "Peer-to-peer matching layer on top of Aave/Compound before Morpho Blue.",
                "status": "executed",
            },
            {
                "date": "2024-01",
                "title": "Morpho Blue launch",
                "description": "Immutable isolated-market primitive with curator vaults (MetaMorpho).",
                "status": "executed",
            },
        ],
        events=[
            {
                "date": "2024-01",
                "title": "Morpho Blue mainnet",
                "description": "Isolated markets and MetaMorpho vaults go live on Ethereum.",
            },
        ],
        offchain_facts=[
            {
                "key": "curatorModel",
                "value": "Risk curators operate MetaMorpho vaults — suppliers pick curators rather than a single pooled risk committee.",
                "freshness": "static",
                "capturedAt": "2026-06-27",
                "source": {"label": "Morpho docs", "url": "https://docs.morpho.org"},
            },
            {
                "key": "funding",
                "value": "$175M raised June 2026, led by a16z crypto, Paradigm and Ribbit Capital; valuation up to $2B.",
                "freshness": "static",
                "capturedAt": "2026-07-02",
                "source": {"label": "Fortune", "url": "https://fortune.com/2026/06/09/morpho-fundraise-a16z-crypto-paradigm-ribbit-capital-175-million/"},
            },
            {
                "key": "securityReviews",
                "value": "Morpho Blue: 25+ audits plus formal verification (Certora Prover); reviewers include Spearbit and OpenZeppelin.",
                "freshness": "static",
                "capturedAt": "2026-07-02",
                "source": {"label": "Morpho Docs — Audits", "url": "https://docs.morpho.org/get-started/resources/audits/"},
            },
        ],
        org_structure=[
            {
                "name": "Morpho Labs",
                "role": "Founding development company",
                "description": "Founded in Paris (2021) by Paul Frambot with co-founders Merlin Egalite, Julien Thomas and Mathis Gontier Delaunay. Builds the Morpho Blue primitive and MetaMorpho vault stack.",
            },
            {
                "name": "Morpho Association",
                "role": "Nonprofit governance steward",
                "description": "French nonprofit that coordinates protocol governance and development and represents the DAO; announced the June 2026 funding round. MORPHO token holders govern the framework.",
            },
        ],
        tradfi_comparison=[
            {
                "product": "Securitization / tranched credit fund",
                "similarity": "MetaMorpho vaults allocate deposits across isolated credit markets with defined risk, and curators act like asset managers selecting exposures.",
                "differences": "Fully on-chain and permissionless: markets are immutable with fixed parameters, there is no legal SPV or fund administrator, and bad debt is contained per market.",
            },
            {
                "product": "Neutral lending marketplace / matching venue",
                "similarity": "Morpho Blue is minimal infrastructure that others build lending products on top of, rather than a single managed pool.",
                "differences": "An immutable smart-contract primitive with per-market fixed collateral, oracle and LLTV; risk is delegated to independent curators instead of a central risk desk.",
            },
        ],
        investment_rounds=[
            {
                "date": "2026-06-09",
                "round": "Strategic round",
                "amountUsd": 175_000_000,
                "amountLabel": "$175M",
                "investors": ["a16z crypto", "Paradigm", "Ribbit Capital", "Apollo Funds", "Circle Ventures", "VanEck", "Variant", "Wintermute Ventures"],
                "link": "https://www.theblock.co/post/404111/morpho-raises-175m-paradigm-a16z-crypto-ribbit-capital",
            },
        ],
        audits=[
            {"firm": "OpenZeppelin", "date": "2023", "url": "https://docs.morpho.org/get-started/resources/audits/"},
            {"firm": "Spearbit", "date": "2023", "url": "https://docs.morpho.org/get-started/resources/audits/"},
            {"firm": "Certora (formal verification)", "date": "2023", "url": "https://docs.morpho.org/learn/resources/formal-verification/"},
        ],
        sources=[
            {"label": "Morpho Docs", "url": "https://docs.morpho.org"},
            {"label": "Fortune — Morpho raises $175M (a16z, Paradigm, Ribbit)", "url": "https://fortune.com/2026/06/09/morpho-fundraise-a16z-crypto-paradigm-ribbit-capital-175-million/"},
            {"label": "The Block — Morpho $175M open credit network", "url": "https://www.theblock.co/post/404111/morpho-raises-175m-paradigm-a16z-crypto-ribbit-capital"},
            {"label": "Morpho Docs — Audits / Security Reviews", "url": "https://docs.morpho.org/get-started/resources/audits/"},
            {"label": "Morpho Blue Security Framework (blog)", "url": "https://morpho.org/blog/morpho-blue-security-framework-building-the-most-secure-lending-protocol/"},
        ],
        partnerships=[
            {
                "name": "Coinbase / Base",
                "date": "2024",
                "description": "Morpho Blue and vaults deployed on Base alongside Ethereum mainnet.",
            },
        ],
        risks=_lending_risks(
            {
                "category": "Curator",
                "description": "MetaMorpho curators choose market allocations; poor curator decisions isolate bad outcomes to vault depositors.",
            },
        ),
        competitors=[
            _AAVE_COMPETITOR,
            {
                "name": "Spark Protocol",
                "slug": "spark",
                "rank": 2,
                "positioning": "Stablecoin-native lending stack.",
                "similarities": "Both build curated/isolated lending on top of base liquidity.",
                "differences": "Spark is tied to the Sky/Maker USDS/DAI ecosystem; Morpho is asset-agnostic infrastructure.",
            },
            {
                "name": "Kamino",
                "slug": "kamino",
                "rank": 3,
                "positioning": "Solana isolated/curated lending.",
                "similarities": "Shares the isolated-market / curated-vault model.",
                "differences": "Kamino is Solana-native; Morpho is EVM (Ethereum/Base).",
            },
        ],
        lending={
            "collateralAssets": ["ETH", "wstETH", "weETH", "WBTC", "cbBTC", "USDC", "USDe"],
            "loanAssets": ["USDC", "USDT", "DAI", "ETH", "WBTC"],
            "stablecoinExposure": ["USDC", "USDT", "DAI", "USDe"],
            "oracles": ["Chainlink", "Per-market configurable (curator chooses)"],
            "riskParameters": (
                "Per-market and immutable: each Morpho Blue market fixes its LTV (LLTV), oracle "
                "and liquidation parameters; MetaMorpho vaults set supply caps and allocations."
            ),
            "liquidations": "Permissionless liquidations per market once LLTV is breached.",
            "badDebt": "Isolated by design — bad debt is contained to a single market/vault rather than socialized.",
            "governanceActivity": "MORPHO governs the framework; risk is delegated to independent vault curators.",
            "auditHistory": "Morpho Blue is audited and formally verified; minimal immutable core reduces attack surface.",
            "deployment": {
                "chains": ["Ethereum", "Base"],
                "evmCompatible": "yes",
                "notes": "EVM-optimized smart contracts (docs.morpho.org).",
            },
            "stablecoinExposurePct": 68,
            "liquidations30d": {
                "volumeUsd": None,
                "count": None,
                "notes": "Permissionless per-market liquidations; aggregated 30d stats require Morpho indexer.",
            },
            "governanceDetail": {
                "proposals": None,
                "voterTurnoutPct": None,
                "treasuryUsd": None,
                "notes": "MORPHO governs the framework; vault curators set per-market risk.",
            },
        },
        lending_tag_metrics={
            "isolatedCurated": {
                "isolatedMarketCount": 350,
                "vaultCount": 120,
                "curatorCount": 25,
                "topCurators": [
                    {"name": "Steakhouse Financial", "aumUsd": 800_000_000, "feeTakeRatePct": 10},
                    {"name": "Gauntlet", "aumUsd": 600_000_000, "feeTakeRatePct": 10},
                    {"name": "Re7 Labs", "aumUsd": 400_000_000, "feeTakeRatePct": 10},
                ],
                "lltvDistribution": "Markets span 77%–96.5% LLTV; stablecoin markets typically 86–91%.",
                "vaultTvlSharePct": 85,
                "curatorFeeTakeRatePct": 10,
                "notes": "Curated MetaMorpho vaults hold the majority of Morpho Blue TVL.",
            },
        },
        member_coins=[
            {
                "slug": "morpho",
                "name": "MORPHO",
                "symbol": "MORPHO",
                "category": "Token",
                "role": "DAO governance token",
                "subCategory": "Governance Token",
            },
        ],
    ),
    "spark": _net(
        name="Spark Protocol",
        symbol="SPK",
        csv_slug="spark",
        tagline="Stablecoin-native credit stack tied to the Sky/Maker ecosystem.",
        description=(
            "Spark is a lending system built mainly around stablecoin liquidity, borrowing "
            "and yield (SparkLend + Spark Savings), routing USDS/DAI liquidity from the "
            "Sky/Maker ecosystem at scale."
        ),
        differentiator=(
            "Not just general lending — its edge is the Sky/Maker connection (DAI/USDS): how "
            "it creates, routes, lends and manages stablecoin liquidity."
        ),
        sub_sector="Stablecoin-Native Credit Stack",
        tags=["Lending"],
        official_docs="https://docs.spark.fi",
        website="https://spark.fi",
        twitter="https://x.com/sparkdotfi",
        github="https://github.com/marsfoundation",
        chains=["Ethereum"],
        components=_SPARK_COMPONENTS,
        faq=_SPARK_FAQ,
        org_structure=[
            {
                "name": "Phoenix Labs",
                "role": "Development company",
                "description": "Founded Spark in May 2023 (led by Sam MacPherson); builds and maintains SparkLend, Spark Savings and the Spark Liquidity Layer.",
            },
            {
                "name": "Sky (formerly MakerDAO)",
                "role": "Parent ecosystem",
                "description": "Spark is the first 'Star' (SubDAO) launched under Sky's Endgame roadmap. The Spark Liquidity Layer routes liquidity from Sky's $7B+ stablecoin reserves (USDS/DAI).",
            },
            {
                "name": "Spark DAO / SPK governance",
                "role": "Governance & staking",
                "description": "SPK (launched June 2025) is Spark's governance and staking token, staked for rewards and, in future, to help secure Spark's bridges via Symbiotic restaking.",
            },
        ],
        tradfi_comparison=[
            {
                "product": "Treasury / liquidity-management desk",
                "similarity": "The Spark Liquidity Layer mints, bridges and allocates a large stablecoin reserve across markets to manage deployment and rates, like a treasury desk allocating a balance sheet.",
                "differences": "Rules-based and on-chain via governance, deploying fully-collateralized stablecoins (USDS/DAI) into DeFi and RWA rather than managing fiat reserves.",
            },
            {
                "product": "High-yield savings account",
                "similarity": "Spark Savings (sUSDS/sDAI) pays a governance-set yield on stablecoin deposits, comparable to a savings account passing through a policy rate.",
                "differences": "Non-custodial yield-bearing receipt tokens whose yield is sourced from Sky ecosystem collateral/RWA revenue, not a bank deposit.",
            },
        ],
        audits=[
            {"firm": "ChainSecurity", "date": "2023", "url": "https://www.chainsecurity.com/security-audit/makerdao-sparklend-advanced"},
            {"firm": "ChainSecurity (ALM Controller / Liquidity Layer)", "date": "2024", "url": "https://reports.chainsecurity.com/Spark/ChainSecurity_Spark_SparkALMController_Audit.pdf"},
        ],
        sources=[
            {"label": "Spark documentation", "url": "https://docs.spark.fi"},
            {"label": "Spark Docs — Security & Audits", "url": "https://docs.spark.fi/dev/security/security-and-audits"},
            {"label": "Messari — Understanding Spark", "url": "https://messari.io/report/understanding-spark-a-comprehensive-overview"},
            {"label": "Messari — Spark (Sky) project profile", "url": "https://messari.io/project/spark-sky-protocol"},
            {"label": "ChainSecurity — SparkLend audit", "url": "https://www.chainsecurity.com/security-audit/makerdao-sparklend-advanced"},
        ],
        timeline=[
            {
                "date": "2023-05",
                "title": "Spark Protocol launch",
                "description": "SparkLend goes live as the Sky/Maker lending front-end.",
                "status": "executed",
            },
        ],
        events=[
            {
                "date": "2025-03",
                "title": "Spark on Arbitrum",
                "description": "Spark expands USDS lending to Arbitrum One.",
            },
            {
                "date": "2025-06-17",
                "title": "SPK token launch",
                "description": "Spark's governance and staking token goes live with multiple airdrop campaigns.",
                "link": "https://messari.io/project/spark-sky-protocol",
            },
        ],
        offchain_facts=[
            {
                "key": "skyLink",
                "value": "Spark is the primary lending outlet for Sky/Maker stablecoin liquidity (USDS/DAI).",
                "freshness": "static",
                "capturedAt": "2026-06-27",
                "source": {"label": "Spark", "url": "https://spark.fi"},
            },
            {
                "key": "liquidityLayerScale",
                "value": "~$3.6B allocated via the Spark Liquidity Layer as of June 30 2025 (+175% YoY).",
                "freshness": "static",
                "capturedAt": "2026-07-02",
                "source": {"label": "Messari — Understanding Spark", "url": "https://messari.io/report/understanding-spark-a-comprehensive-overview"},
            },
            {
                "key": "founded",
                "value": "May 2023 by Phoenix Labs (Sam MacPherson) — first Star/SubDAO in the Sky Endgame.",
                "freshness": "static",
                "capturedAt": "2026-07-02",
                "source": {"label": "Messari — Understanding Spark", "url": "https://messari.io/report/understanding-spark-a-comprehensive-overview"},
            },
        ],
        partnerships=[
            {
                "name": "Sky (MakerDAO)",
                "date": "2023",
                "description": "Spark routes Sky ecosystem stablecoin liquidity through SparkLend and Spark Savings.",
            },
        ],
        risks=_lending_risks(
            {
                "category": "Stablecoin",
                "description": "Heavy reliance on USDS/DAI peg and Sky governance for core liquidity rails.",
            },
        ),
        competitors=[
            _AAVE_COMPETITOR,
            {
                "name": "Sky (Savings Rate)",
                "slug": "sky",
                "rank": 2,
                "positioning": "Parent stablecoin ecosystem (USDS/DAI).",
                "similarities": "Spark is the lending arm of the Sky/Maker stablecoin stack.",
                "differences": "Sky issues USDS/DAI; Spark lends and routes that liquidity.",
            },
            {
                "name": "Morpho",
                "slug": "morpho",
                "rank": 3,
                "positioning": "Customizable lending infrastructure.",
                "similarities": "Both offer curated stablecoin lending markets.",
                "differences": "Morpho is asset-agnostic infra; Spark is stablecoin-first and Sky-aligned.",
            },
        ],
        lending={
            "collateralAssets": ["ETH", "wstETH", "weETH", "WBTC", "cbBTC", "USDS", "DAI"],
            "loanAssets": ["USDS", "DAI", "USDC"],
            "stablecoinExposure": ["USDS", "DAI", "USDC"],
            "oracles": ["Chainlink"],
            "riskParameters": (
                "SparkLend started from Aave V3 architecture — per-asset LTV, liquidation "
                "threshold/penalty and caps, tuned for stablecoin liquidity."
            ),
            "liquidations": "Aave-V3-style health-factor liquidations by keepers.",
            "badDebt": "Backstopped by the Sky/Maker surplus buffer and risk parameters.",
            "governanceActivity": "Governed via Spark + Sky governance (USDS/DAI risk and savings rate).",
            "auditHistory": "Forked from audited Aave V3 code with additional Spark-specific audits.",
            "deployment": {
                "chains": ["Ethereum", "Ethereum-compatible networks"],
                "evmCompatible": "yes",
                "notes": "Part of the Sky/Maker ecosystem; EVM-oriented (IQ.wiki).",
            },
            "stablecoinExposurePct": 82,
            "liquidations30d": {
                "volumeUsd": None,
                "count": None,
                "notes": "Aave-V3-style keeper liquidations on SparkLend.",
            },
            "governanceDetail": {
                "proposals": None,
                "voterTurnoutPct": None,
                "treasuryUsd": None,
                "notes": "Spark + Sky governance coordinate USDS/DAI risk and savings rate.",
            },
        },
        lending_tag_metrics={
            "stablecoinNative": {
                "usdsMintedUsd": 5_200_000_000,
                "daiRoutedUsd": 1_800_000_000,
                "ssrPct": 4.5,
                "ssrBalanceUsd": 2_100_000_000,
                "sllVenues": ["Aave V3", "Morpho Blue", "Euler", "SparkLend"],
                "ssrLinkedTvlUsd": 2_100_000_000,
                "notes": "Spark Liquidity Layer routes Sky stablecoin liquidity across DeFi venues.",
            },
        },
        member_coins=[
            # SPK governance + cross-refs to Sky parent (sky-gov, USDS have EntitySlug=sky).
            {
                "slug": "spk",
                "name": "Spark Protocol",
                "symbol": "SPK",
                "category": "Token",
                "role": "Governance token",
                "subCategory": "Governance Token",
            },
            {
                "slug": "sky-gov",
                "name": "SKY",
                "symbol": "SKY",
                "category": "Token",
                "role": "Sky ecosystem governance (MKR successor)",
                "subCategory": "Governance Token",
            },
            {
                "slug": "sky",
                "name": "USDS",
                "symbol": "USDS",
                "category": "Stablecoin",
                "role": "Primary stablecoin liquidity (Sky)",
                "subCategory": "Stablecoin",
            },
        ],
    ),
    "compound": _net(
        name="Compound",
        symbol="COMP",
        csv_slug="compound",
        tagline="Simple, battle-tested money markets (Compound III).",
        description=(
            "Compound is one of the original DeFi lending protocols. Compound III simplifies "
            "each market to a single borrowable base asset with other assets posted purely "
            "as collateral."
        ),
        differentiator=(
            "Compound III is simpler than Aave — one base borrowable asset per market makes "
            "risk easier to understand, at the cost of multi-asset flexibility."
        ),
        sub_sector="Money Markets",
        official_docs="https://docs.compound.finance",
        website="https://compound.finance",
        twitter="https://x.com/compoundfinance",
        github="https://github.com/compound-finance",
        chains=["Ethereum", "Base", "Arbitrum One", "Optimism", "Polygon", "Mantle"],
        components=_COMPOUND_COMPONENTS,
        faq=_COMPOUND_FAQ,
        org_structure=[
            {
                "name": "Compound Labs",
                "role": "Founding development company",
                "description": "Founded in 2017 by Robert Leshner and Geoffrey Hayes; built the Compound protocol and Compound III (Comet). Leshner stepped down as CEO in 2023 to found Superstate; the protocol is now steward by the DAO.",
            },
            {
                "name": "Compound DAO",
                "role": "Governance",
                "description": "COMP token holders govern the protocol. Any address with at least 1% of COMP delegated to it can submit a proposal to add markets, change collateral factors, adjust interest-rate models, or upgrade contracts.",
            },
        ],
        tradfi_comparison=[
            {
                "product": "Money-market fund",
                "similarity": "Suppliers earn a variable yield on assets lent from a pooled book of borrowers, comparable to a fund passing through short-term rates.",
                "differences": "Loans are overcollateralized and enforced by smart contracts and automatic liquidations; non-custodial, permissionless, with rates set algorithmically by pool utilization rather than a fund manager.",
            },
            {
                "product": "Secured revolving credit line",
                "similarity": "In Compound III a borrower posts collateral and draws/repays a single base asset (e.g. USDC) at a floating rate, like a secured line of credit.",
                "differences": "Fully collateralized on-chain and liquidated automatically once the borrow position breaches its collateral factor; no lender underwriting or credit checks.",
            },
        ],
        investment_rounds=[
            {
                "date": "2019-11-15",
                "round": "Series A",
                "amountUsd": 25_000_000,
                "amountLabel": "$25M",
                "investors": ["Andreessen Horowitz (a16z)", "Polychain Capital", "Paradigm", "Bain Capital Ventures"],
                "link": "https://www.coindesk.com/tech/2019/11/14/defi-startup-compound-finance-raises-25-million-series-a-led-by-a16z",
            },
        ],
        audits=[
            {"firm": "OpenZeppelin", "date": "2022-08", "url": "https://www.openzeppelin.com/news/compound-iii-audit"},
            {"firm": "ChainSecurity", "date": "2022-05-30", "url": "https://reports.chainsecurity.com/Compound/ChainSecurity_Compound_Comet_Audit.pdf"},
        ],
        sources=[
            {"label": "Compound III documentation", "url": "https://docs.compound.finance/"},
            {"label": "CoinDesk — Compound $25M Series A led by a16z (Nov 2019)", "url": "https://www.coindesk.com/tech/2019/11/14/defi-startup-compound-finance-raises-25-million-series-a-led-by-a16z"},
            {"label": "Compound Governance is Live (Robert Leshner, Compound Labs)", "url": "https://medium.com/compound-finance/compound-governance-decentralized-b18659f811e0"},
            {"label": "OpenZeppelin — Compound III audit", "url": "https://www.openzeppelin.com/news/compound-iii-audit"},
            {"label": "ChainSecurity — Compound Comet audit (May 2022)", "url": "https://reports.chainsecurity.com/Compound/ChainSecurity_Compound_Comet_Audit.pdf"},
        ],
        timeline=[
            {
                "date": "2020-06",
                "title": "Compound v2 mainnet",
                "description": "Classic pooled money markets with COMP liquidity mining.",
                "status": "executed",
            },
            {
                "date": "2022-08",
                "title": "Compound III",
                "description": "Single base-asset markets simplify collateral and borrow logic.",
                "status": "executed",
            },
        ],
        events=[
            {
                "date": "2023-09",
                "title": "Compound III on Arbitrum",
                "description": "USDC base market live on Arbitrum One.",
            },
        ],
        tokenomics={
            "summary": "COMP governs the protocol; emissions directed by governance to markets and contributors.",
            "maxSupply": "10,000,000 COMP",
        },
        offchain_facts=[
            {
                "key": "compoundIII",
                "value": "Compound III uses one borrowable base asset per market — collateral assets do not earn supply yield.",
                "freshness": "static",
                "capturedAt": "2026-06-27",
                "source": {"label": "Compound docs", "url": "https://docs.compound.finance"},
            },
            {
                "key": "founded",
                "value": "2017 by Robert Leshner and Geoffrey Hayes (Compound Labs, San Francisco).",
                "freshness": "static",
                "capturedAt": "2026-07-02",
                "source": {"label": "CoinDesk", "url": "https://www.coindesk.com/tech/2019/11/14/defi-startup-compound-finance-raises-25-million-series-a-led-by-a16z"},
            },
            {
                "key": "seriesA",
                "value": "$25M Series A led by a16z (Nov 2019), valuing the protocol at ~$90M.",
                "freshness": "static",
                "capturedAt": "2026-07-02",
                "source": {"label": "CoinDesk", "url": "https://www.coindesk.com/tech/2019/11/14/defi-startup-compound-finance-raises-25-million-series-a-led-by-a16z"},
            },
        ],
        partnerships=[
            {
                "name": "Chainlink",
                "date": "ongoing",
                "description": "Price oracles for collateral and base assets across Compound III markets.",
            },
        ],
        risks=_lending_risks(
            {
                "category": "Market design",
                "description": "Single base-asset markets concentrate borrow demand on one asset per deployment.",
            },
        ),
        competitors=[
            _AAVE_COMPETITOR,
            {
                "name": "Morpho",
                "slug": "morpho",
                "rank": 2,
                "positioning": "Customizable lending infrastructure.",
                "similarities": "Both are trusted EVM lending venues.",
                "differences": "Morpho is modular/isolated; Compound III is intentionally simple.",
            },
        ],
        lending={
            "collateralAssets": ["ETH", "wstETH", "WBTC", "cbBTC", "COMP", "LINK"],
            "loanAssets": ["USDC", "USDT", "ETH"],
            "stablecoinExposure": ["USDC", "USDT"],
            "oracles": ["Chainlink"],
            "riskParameters": (
                "Per-market: one base borrowable asset, collateral factors and liquidation "
                "factors per collateral, supply caps."
            ),
            "liquidations": "Absorb/buy collateral liquidation mechanism in Compound III.",
            "badDebt": "Reserves buffer shortfalls; conservative collateral factors limit exposure.",
            "governanceActivity": "Active COMP governance — new markets and parameter proposals.",
            "auditHistory": "Long-running, heavily audited protocol with a strong track record.",
            "deployment": {
                "chains": ["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "Mantle", "Ronin", "Unichain"],
                "evmCompatible": "yes",
                "notes": "Compound III is built for EVM-compatible deployments (docs.compound.finance).",
            },
            "stablecoinExposurePct": 75,
            "liquidations30d": {
                "volumeUsd": None,
                "count": None,
                "notes": "Absorb/buy collateral liquidations in Compound III.",
            },
            "governanceDetail": {
                "proposals": None,
                "voterTurnoutPct": None,
                "treasuryUsd": None,
                "notes": "Active COMP governance for new markets and parameter updates.",
            },
        },
        lending_tag_metrics={
            "moneyMarkets": {
                "emissionsPerAsset": "COMP emissions vary by market; USDC/USDT markets typically receive the largest share.",
                "reserveFactorSummary": "Reserve factors 15–25% on major markets; absorbed into protocol reserves.",
                "eModeUsage": None,
                "notes": "Compound III uses single base-asset markets rather than e-mode tiers.",
            },
        },
        member_coins=[
            {
                "slug": "comp",
                "name": "Compound",
                "symbol": "COMP",
                "category": "Token",
                "role": "DAO governance token",
                "subCategory": "Governance Token",
            },
        ],
    ),
    "fluid": _net(
        name="Fluid",
        symbol="FLUID",
        tagline="Capital-efficient lending + DEX hybrid on a shared liquidity layer.",
        description=(
            "Fluid (formerly Instadapp) combines lending, vaults and DEX liquidity through a "
            "shared liquidity layer, so the same capital can support lending and trading."
        ),
        differentiator=(
            "Capital efficiency: a shared liquidity layer lets collateral, debt, lending "
            "liquidity and trading liquidity work together — more efficient but more complex."
        ),
        sub_sector="Liquidity Hybrid",
        official_docs="https://docs.fluid.io",
        website="https://fluid.io",
        twitter="https://x.com/0xfluid",
        components=[
            {
                'name': 'Liquidity Layer',
                'description': 'The core contract at the center of Fluid that custodies all protocol funds. It only interacts with the protocols built on top of it (not end users), consolidating liquidity from every module so newer protocols can automatically tap shared liquidity. It manages automated debt/supply limits, utilization rates, and pluggable interest-rate models.',
            },
            {
                'name': 'Vaults (Smart Collateral & Smart Debt)',
                'description': "Fluid's lending/borrowing protocol. Users supply collateral and borrow against it. The DEX integration introduces Smart Collateral (collateral doubles as AMM liquidity, earning lending interest plus trading fees) and Smart Debt (borrowed debt is deployed as trading liquidity, earning fees that offset borrow APR), pushing capital efficiency well beyond siloed lenders like Aave.",
            },
            {
                'name': 'Fluid DEX',
                'description': 'An AMM built directly on the Liquidity Layer, launched October 2024. It powers Smart Collateral and Smart Debt by turning lending/borrowing positions into productive trading liquidity. Within ~3 months it became the second-largest DEX on Ethereum by volume, and was the fastest DEX to surpass $10B cumulative volume on Ethereum (100 days).',
            },
            {
                'name': 'FLUID token',
                'description': "The protocol's ERC-20 governance token on Ethereum (max supply 100M). Formerly INST; rebranded to FLUID in December 2024 via a 1:1 conversion on the same contract with no holder action required. Holders govern fee structures, integration priorities, and risk parameters through the Fluid DAO.",
            },
        ],
        faq=[
            {
                'question': 'What is Fluid and how is it different from Aave or Compound?',
                'answer': 'Fluid is a DeFi protocol from the Instadapp team that unifies lending, borrowing, and a DEX on a single shared Liquidity Layer. Unlike Aave or Compound, where deposited collateral only earns lending interest, Fluid lets the same capital serve as collateral, be lent, and act as AMM trading liquidity simultaneously (Smart Collateral / Smart Debt), delivering much higher capital efficiency.',
                'pinned': True,
            },
            {
                'question': 'What are Smart Collateral and Smart Debt?',
                'answer': 'Smart Collateral lets your collateral simultaneously earn lending interest and DEX trading fees. Smart Debt turns your borrowed position into trading liquidity, so trading fees offset your borrow cost (APR). Both are enabled by the DEX being built on the same Liquidity Layer as the Vaults.',
                'pinned': False,
            },
            {
                'question': 'Which chains does Fluid run on?',
                'answer': 'Fluid is deployed across multiple EVM chains including Ethereum (its largest deployment), Arbitrum, Base, and Polygon, with additional deployments over time. FLUID is an ERC-20 on Ethereum.',
                'pinned': False,
            },
            {
                'question': 'Is FLUID the same as the old INST token?',
                'answer': "Yes. Instadapp's INST governance token was renamed to FLUID in December 2024. It was a 1:1 conversion on the same Ethereum contract address with a 100M max supply and required no action from holders.",
                'pinned': False,
            },
            {
                'question': 'Has Fluid been audited?',
                'answer': "Yes. Fluid's Liquidity Layer, Vault protocol, and DEX have been audited by multiple firms including MixBytes, PeckShield, StateMind, and Cantina, with reports published on the official docs. The team also ran an invite-only bug bounty / audit competition via Immunefi.",
                'pinned': False,
            },
            {
                'question': 'Who is behind Fluid?',
                'answer': 'Fluid is built by Instadapp Labs, the team behind Instadapp, one of the older DeFi protocols (launched 2018) that raised venture funding from Pantera Capital, Coinbase Ventures, Standard Crypto, and Naval Ravikant. Governance runs through the Fluid DAO.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Instadapp Labs',
                'role': 'Core development team',
                'description': 'The team that built and maintains Instadapp and Fluid. Founded by brothers Sowmay and Samyak Jain; over 4+ years building DeFi infrastructure managing several billion dollars in TVL.',
            },
            {
                'name': 'Fluid DAO',
                'role': 'Governance',
                'description': 'FLUID token holders govern the protocol - voting on fee structures, integration priorities, and risk parameters. Formerly the Instadapp DAO before the December 2024 rebrand.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Secured lending / margin loan combined with a market-maker desk',
                'similarity': "Like a broker's secured lending desk, Fluid lets you post collateral and borrow against it, with liquidation if collateral value falls below thresholds.",
                'differences': "Unlike a bank where posted collateral sits idle, Fluid's Smart Collateral and Smart Debt simultaneously deploy that same collateral and debt as market-making (AMM) liquidity, so a single pool of capital earns lending interest and trading fees at once - impossible in siloed TradFi products.",
            },
        ],
        events=[
            {
                'date': '2024-06-25',
                'title': 'MixBytes audit of Fluid Vault Protocol completed',
                'description': "MixBytes published its security audit of Fluid's Vault protocol, covering vault architecture, cross-vault interactions, big-number and tick math, and the liquidation algorithm.",
                'link': 'https://docs.fluid.instadapp.io/Mixbytes_Fluid_Vault_Protocol_Audit.pdf',
            },
            {
                'date': '2024-10-29',
                'title': 'Fluid DEX v1 launch',
                'description': 'Fluid DEX v1 launched on Ethereum, introducing Smart Collateral and Smart Debt. Within three months it became the fastest-growing and second-largest DEX on Ethereum by volume.',
                'link': 'https://blog.instadapp.io/fluid-dex/',
            },
            {
                'date': '2024-12-03',
                'title': 'Governance proposal to rebrand INST to FLUID',
                'description': 'A governance proposal was submitted to rename the INST token to FLUID via a 1:1 swap and restructure tokenomics and governance, completing the pivot from Instadapp middleware to the Fluid liquidity protocol.',
                'link': 'https://blog.instadapp.io/fluid/',
            },
            {
                'date': '2025-02-28',
                'title': 'Fluid DEX surpasses $20B cumulative volume on Ethereum',
                'description': "Fluid's DEX became the fastest DEX to break $20 billion in cumulative volume on Ethereum, doing so in 127 days (after hitting $5B in 72 days and $10B in 100 days).",
                'link': 'https://blog.instadapp.io/fluid-dex-v2/',
            },
        ],
        timeline=[
            {
                'date': '2021-06-17',
                'title': 'INST governance token launched',
                'description': 'Instadapp launched the INST governance token (100M genesis supply, 55% to the community) and introduced its DeFi Smart Layer with a liquidity mining program.',
                'link': 'https://blog.instadapp.io/inst/',
                'status': 'executed',
            },
            {
                'date': '2024-06-25',
                'title': 'Fluid Vault protocol audited (MixBytes)',
                'description': "Security audit of the Vault protocol completed ahead of Fluid's broader rollout.",
                'link': 'https://docs.fluid.instadapp.io/Mixbytes_Fluid_Vault_Protocol_Audit.pdf',
                'status': 'executed',
            },
            {
                'date': '2024-10-29',
                'title': 'Fluid DEX v1 goes live',
                'description': 'The DEX built on the Liquidity Layer launches, enabling Smart Collateral and Smart Debt.',
                'link': 'https://blog.instadapp.io/fluid-dex/',
                'status': 'executed',
            },
            {
                'date': '2024-12-01',
                'title': 'Rebrand to Fluid (INST to FLUID)',
                'description': 'Instadapp rebrands to Fluid; INST renamed to FLUID via 1:1 conversion on the same contract (date approximate - governance proposal submitted Dec 3, 2024).',
                'link': 'https://blog.instadapp.io/fluid/',
                'status': 'executed',
            },
            {
                'date': '2025-01-01',
                'title': 'Fluid DEX v2',
                'description': 'Fluid announced DEX v2, expanding the AMM and capital-efficiency design (date approximate; announcement post).',
                'link': 'https://blog.instadapp.io/fluid-dex-v2/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Chains supported',
                'value': 'Ethereum, Arbitrum, Base, Polygon (plus additional deployments); FLUID is an ERC-20 on Ethereum',
                'freshness': 'static',
                'source': {
                    'label': 'Fluid overview - Cube Exchange',
                    'url': 'https://www.cube.exchange/what-is/fluid',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Security audits',
                'value': 'Audited by MixBytes, PeckShield, StateMind, and Cantina across the Liquidity Layer, Vault, and DEX protocols',
                'freshness': 'static',
                'source': {
                    'label': 'Fluid Audits & Security docs',
                    'url': 'https://docs.fluid.instadapp.io/audits-and-security.html',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'DEX milestone',
                'value': 'Fluid DEX v1 surpassed $10B cumulative trading volume on Ethereum in 100 days - fastest of any DEX',
                'freshness': 'static',
                'source': {
                    'label': 'Introducing Fluid DEX v2',
                    'url': 'https://blog.instadapp.io/fluid-dex-v2/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Fluid concentrates all funds in a single shared Liquidity Layer contract, so a bug there would be systemic across lending, vaults, and DEX. Auditors (MixBytes) noted the code is optimized for maximum gas efficiency at the expense of clarity, which complicates review and raises the risk of subtle undiscovered bugs.',
            },
            {
                'category': 'Oracle',
                'description': 'Vault liquidations depend on price oracles to value collateral and debt. Manipulated or stale oracle prices could trigger unfair liquidations or allow under-collateralized borrowing, a risk amplified because Smart Collateral/Smart Debt positions are also live AMM liquidity.',
            },
            {
                'category': 'Systemic',
                'description': 'The unified design means DEX, lending, and borrowing share the same liquidity pool. A sharp DEX volume/price shock or a mass withdrawal can simultaneously stress collateral valuation, borrow availability, and liquidation capacity across all modules rather than being isolated to one product.',
            },
            {
                'category': 'Collateral',
                'description': 'Because collateral and debt double as trading liquidity, positions are exposed to impermanent-loss-style rebalancing and volatile-asset price swings on top of normal borrow risk, which can accelerate a position toward its liquidation threshold.',
            },
            {
                'category': 'Governance',
                'description': 'FLUID holders control fee structures, integration priorities, risk parameters, and treasury actions (e.g., the DAO transferred 12M FLUID to the Labs team wallet in Dec 2024). Concentrated voting power or a malicious/erroneous parameter change could adversely affect users.',
            },
        ],
        investment_rounds=[
            {
                'date': '2019-10-01',
                'round': 'Seed',
                'amountUsd': 2400000,
                'amountLabel': '$2.4M',
                'investors': [
                    'Pantera Capital',
                    'Coinbase Ventures',
                    'IDEO CoLab',
                    'Robot Ventures',
                    'Naval Ravikant',
                ],
                'link': 'https://blog.instadapp.io/seed-round/',
            },
            {
                'date': '2021-06-11',
                'round': 'Series A',
                'amountUsd': 10000000,
                'amountLabel': '$10M',
                'investors': [
                    'Standard Crypto',
                    'Coinbase Ventures',
                    'Pantera Capital',
                    'Andre Cronje',
                    'LongHash Ventures',
                    'Naval Ravikant',
                ],
                'link': 'https://cointelegraph.com/news/coinbase-pantera-capital-participate-in-24m-seed-round-of-defi-startup',
            },
        ],
        audits=[
            {
                'firm': 'PeckShield',
                'date': '2024-06-01',
                'url': 'https://docs.fluid.instadapp.io/Peckshield_Fluid_Audit.pdf',
            },
            {
                'firm': 'StateMind',
                'date': '2024-06-01',
                'url': 'https://docs.fluid.instadapp.io/Statemind_Fluid_Audit.pdf',
            },
            {
                'firm': 'MixBytes',
                'date': '2024-06-25',
                'url': 'https://docs.fluid.instadapp.io/Mixbytes_Fluid_Vault_Protocol_Audit.pdf',
            },
            {
                'firm': 'MixBytes',
                'date': '2024-10-01',
                'url': 'https://docs.fluid.instadapp.io/Mixbytes_Fluid_Dex_Audit.pdf',
            },
            {
                'firm': 'Cantina',
                'date': '2024-10-01',
                'url': 'https://docs.fluid.instadapp.io/cantina-audit-dex.pdf',
            },
            {
                'firm': 'MixBytes',
                'date': '2024-06-01',
                'url': 'https://docs.fluid.instadapp.io/MixBytes_Fluid_Liquidity_Audit.pdf',
            },
            {
                'firm': 'StateMind',
                'date': '2024-06-01',
                'url': 'https://docs.fluid.instadapp.io/Statemind_Fluid_Liquidity_Updates_Audit.pdf',
            },
        ],
        sources=[
            {
                'label': 'Fluid Technical Docs - Contracts Overview',
                'url': 'https://docs.fluid.instadapp.io/',
            },
            {
                'label': 'Fluid Audits & Security',
                'url': 'https://docs.fluid.instadapp.io/audits-and-security.html',
            },
            {
                'label': 'Introducing Fluid DEX! (Instadapp blog)',
                'url': 'https://blog.instadapp.io/fluid-dex/',
            },
            {
                'label': 'Introducing Fluid DEX v2 (Instadapp blog)',
                'url': 'https://blog.instadapp.io/fluid-dex-v2/',
            },
            {
                'label': 'Introducing INST (Instadapp blog)',
                'url': 'https://blog.instadapp.io/inst/',
            },
            {
                'label': 'Understanding Fluid - Messari',
                'url': 'https://messari.io/report/understanding-fluid-a-comprehensive-overview',
            },
            {
                'label': 'Fluid TVL & metrics - DeFiLlama',
                'url': 'https://defillama.com/protocol/fluid',
            },
        ],
        github="https://github.com/Instadapp",
        chains=["Ethereum", "Arbitrum One", "Base", "Polygon"],
        competitors=[
            _AAVE_COMPETITOR,
            {
                "name": "Morpho",
                "slug": "morpho",
                "rank": 2,
                "positioning": "Customizable lending infrastructure.",
                "similarities": "Both push capital efficiency beyond simple pools.",
                "differences": "Fluid fuses lending with DEX liquidity; Morpho isolates lending markets.",
            },
        ],
        lending={
            "collateralAssets": ["ETH", "wstETH", "weETH", "WBTC", "USDC", "USDT"],
            "loanAssets": ["USDC", "USDT", "ETH", "GHO"],
            "stablecoinExposure": ["USDC", "USDT", "GHO"],
            "oracles": ["Chainlink"],
            "riskParameters": (
                "Vault-based: per-vault LTV/liquidation thresholds with a smart-debt/smart-collateral "
                "design sharing liquidity with the DEX."
            ),
            "liquidations": "Efficient partial liquidations enabled by the shared liquidity layer.",
            "badDebt": "Minimized via tight liquidation bands and shared liquidity buffers.",
            "governanceActivity": "FLUID governs the liquidity layer and new vault/DEX markets.",
            "auditHistory": "Audited; newer architecture so complexity is the main analytical risk.",
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Base", "Polygon"],
                "evmCompatible": "yes",
                "notes": "Live across EVM chains (Support - Eco).",
            },
            "stablecoinExposurePct": 55,
            "liquidations30d": {
                "volumeUsd": None,
                "count": None,
                "notes": "Partial liquidations via shared liquidity layer.",
            },
            "governanceDetail": {
                "proposals": None,
                "voterTurnoutPct": None,
                "treasuryUsd": None,
                "notes": "FLUID governs the shared liquidity layer and vault/DEX markets.",
            },
        },
        lending_tag_metrics={
            "liquidityHybrid": {
                "capitalEfficiencyMultiplier": 3.2,
                "smartCollateralTvlUsd": 1_200_000_000,
                "smartDebtTvlUsd": 800_000_000,
                "dexVolumeTiedUsd": None,
                "sharedLiquidityUtilizationPct": 72,
                "notes": "Smart collateral/debt design shares liquidity between lending and DEX.",
            },
        },
        member_coins=[
            {
                "slug": "fluid",
                "name": "Fluid",
                "symbol": "FLUID",
                "category": "Token",
                "role": "Governance token (ex-INST)",
                "subCategory": "Governance Token",
            },
        ],
    ),
    "venus": _net(
        name="Venus",
        symbol="XVS",
        tagline="Leading money market on BNB Chain.",
        description=(
            "Venus is a major pooled money market, strongly associated with BNB Chain, that "
            "also issues the VAI stablecoin and supports cross-chain XVS."
        ),
        differentiator=(
            "Competes by ecosystem (BNB Chain) rather than directly on Ethereum; similar "
            "pooled model to JustLend but BNB-centric."
        ),
        sub_sector="Money Markets",
        tags=[],
        official_docs="https://docs.venus.io",
        website="https://venus.io",
        twitter="https://x.com/VenusProtocol",
        components=[
            {
                'name': 'Core Pool',
                'description': "Venus's original pooled money market on BNB Chain, where users supply assets to earn interest and borrow against collateral. Interest rates adjust algorithmically with supply and borrow utilization, and positions are overcollateralized with liquidation if health falls below threshold. This is the largest and oldest component of the protocol.",
            },
            {
                'name': 'Isolated Pools',
                'description': 'Introduced with the V4 upgrade in 2023, Isolated Pools segregate assets into independent lending compartments each with its own risk parameters (collateral factors, supply/borrow caps, oracle config). This lets Venus list higher-risk or long-tail assets without exposing the entire protocol to contagion if one pool incurs bad debt.',
            },
            {
                'name': 'VAI Stablecoin',
                'description': "Venus's native synthetic, overcollateralized stablecoin soft-pegged to $1 USD. VAI is minted against crypto collateral supplied to Venus (similar to MakerDAO's DAI). A Peg Stability Module (PSM) allows 1:1 swaps between VAI and USDT to defend the peg, and a stability fee mechanism helps keep VAI near $1.",
            },
            {
                'name': 'XVS Governance Token & Venus Prime',
                'description': 'XVS is the governance token used to create and vote on Venus Improvement Proposals (VIPs) via the XVS Vault. Venus Prime is a loyalty/rewards program: users who stake XVS in the vault (reaching a Prime tier) and actively supply or borrow in eligible markets earn boosted yields, tying governance participation to protocol usage. A share of protocol revenue funds XVS buybacks distributed to vault stakers.',
            },
        ],
        faq=[
            {
                'question': 'What is Venus Protocol?',
                'answer': 'Venus is a decentralized, algorithmic money market and synthetic-stablecoin protocol, primarily on BNB Chain. Users supply crypto to earn interest, borrow assets against overcollateralized positions, and can mint the VAI stablecoin. It is governed by the Venus DAO through the XVS token.',
                'pinned': True,
            },
            {
                'question': 'What is VAI and how does it stay pegged?',
                'answer': "VAI is Venus's overcollateralized synthetic stablecoin soft-pegged to $1. It is minted against collateral supplied to Venus. A Peg Stability Module lets users swap VAI for USDT (and vice versa) at roughly 1:1, and a stability fee is used to nudge VAI back toward peg when it drifts.",
                'pinned': False,
            },
            {
                'question': 'Which chains does Venus support?',
                'answer': 'Venus is BNB Chain-centric but multichain. It is deployed on BNB Chain, Ethereum, Arbitrum, ZKsync Era, and opBNB.',
                'pinned': False,
            },
            {
                'question': 'What are the main risks of using Venus?',
                'answer': 'Key risks include liquidation if collateral value falls, oracle/price-manipulation risk (Venus has suffered multiple oracle-manipulation and donation-attack incidents leaving bad debt), smart-contract risk, and governance/parameter risk. Isolated Pools were introduced specifically to contain the contagion risk that hurt the shared Core Pool historically.',
                'pinned': False,
            },
            {
                'question': 'How is Venus governed?',
                'answer': 'Venus is governed by the Venus DAO. XVS holders stake in the XVS Vault to gain voting power and submit or vote on Venus Improvement Proposals (VIPs), which come in Normal, Fast Track, and Critical tiers with different thresholds and timelocks. Day-to-day development is carried out by Venus Labs, which the DAO reimburses.',
                'pinned': False,
            },
            {
                'question': 'What is Venus Prime?',
                'answer': 'Venus Prime is a rewards program that gives boosted yields to users who stake XVS in the governance vault (reaching a Prime tier) while also supplying or borrowing in eligible markets, strengthening the link between governance participation and active protocol use.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Venus DAO',
                'role': 'Governance',
                'description': 'The decentralized autonomous organization that governs Venus. XVS holders stake and vote on Venus Improvement Proposals (VIPs) covering markets, risk parameters, treasury, and features. Proposing requires substantial voting power (e.g., ~300k XVS) and quorum thresholds for passage.',
            },
            {
                'name': 'Venus Labs',
                'role': 'Core development company',
                'description': 'The research-and-development entity that builds and maintains the Venus protocol and executes VIP-approved work; it is periodically reimbursed by the DAO (e.g., ~$1.49M for H1 2024 and ~$1.7M for H2 2024). Venus was originally created in 2020 by the Swipe team, founded by Joselito Lizarondo.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Money market fund / secured lending desk',
                'similarity': 'Like a money market fund, suppliers deposit assets into a pool and earn a variable yield; like a secured lending desk, borrowers take overcollateralized loans with automatic margin calls (liquidations) when collateral value drops.',
                'differences': 'Venus is non-custodial and permissionless, runs on public smart contracts with algorithmic (not manager-set) rates, has no KYC, and offers no deposit insurance. Losses from oracle manipulation or bad debt fall on the protocol/DAO rather than a regulated intermediary.',
            },
            {
                'product': 'Collateralized stablecoin issuer (VAI)',
                'similarity': 'VAI resembles a bank issuing a dollar-denominated liability backed by pledged collateral, comparable to MakerDAO/DAI-style crypto-collateralized stablecoins.',
                'differences': "VAI is minted trustlessly against on-chain crypto collateral, maintains peg via an on-chain PSM and stability fee rather than a central issuer's reserves, and carries depeg and collateral-volatility risk with no regulatory backstop.",
            },
        ],
        events=[
            {
                'date': '2020-09-29',
                'title': 'Venus launches via Binance Launchpool',
                'description': 'Venus, built by the Swipe team, launched with XVS farmable on Binance Launchpool by staking BNB, BUSD, and SXP, establishing an algorithmic money market on Binance Smart Chain.',
                'link': 'https://iq.wiki/wiki/venus-protocol',
            },
            {
                'date': '2021-05-18',
                'title': '$200M+ liquidation cascade from XVS oracle manipulation',
                'description': 'A sharp manipulation of the low-liquidity XVS price (roughly $80 to ~$145 and back within hours) triggered over $200M in liquidations and left Venus with roughly $100M in bad debt after large borrowers defaulted on BTC/ETH debt backed by XVS collateral.',
                'link': 'https://thedefiant.io/bscs-venus-protocol-left-with-bad-debt-after-liquidations',
            },
            {
                'date': '2023-07-01',
                'title': 'Isolated Pools (V4) introduced',
                'description': 'Venus announced Isolated Pools as the centerpiece of its V4 upgrade, adding risk-segregated markets and onboarding ~15 new assets to nearly double supported markets, enabling safer listing of long-tail assets. (Announced July 2023; day set to 1st.)',
                'link': 'https://docs-v4.venus.io/whats-new/isolated-pools',
            },
            {
                'date': '2023-08-21',
                'title': 'BNB Chain bridge exploiter position force-liquidated for ~$30M on Venus',
                'description': "Following a 2022 DAO-approved mechanism to manage the 2022 BNB cross-chain bridge exploiter's large collateralized position on Venus, the BNB Chain team force-liquidated ~6.89M vBNB (~$30M) as BNB fell near $209, recovering funds in a controlled manner.",
                'link': 'https://www.coindesk.com/tech/2023/08/21/bnb-chain-exploiter-liquidated-for-30m-on-venus-protocol',
            },
            {
                'date': '2025-09-02',
                'title': '$13.5M user phishing attack recovered',
                'description': "A user was socially engineered (fake Zoom link/malware, delegate-approval phishing linked to Lazarus tactics) into granting wallet control, and the attacker moved ~$13.5M of the user's Venus positions. Venus paused the protocol within ~20 minutes, the DAO voted to force-liquidate the attacker, and funds were recovered with the platform restored in about 13 hours.",
                'link': 'https://www.dlnews.com/articles/defi/venus-protocol-votes-to-liquidate-attacker-behind-13m-hack/',
            },
            {
                'date': '2026-03-15',
                'title': 'THE-token donation/oracle-manipulation attack leaves ~$2.15M bad debt',
                'description': 'An attacker accumulated ~84% of the vTHE (Thena) supply cap and donated ~36M THE to the vTHE contract to inflate the exchange rate, then looped borrowing to extract over $3.7M in assets, leaving ~$2.15M in bad debt in the THE market. Venus paused THE borrows/withdrawals and zeroed collateral factors on several risky assets; XVS fell ~9%.',
                'link': 'https://www.coindesk.com/markets/2026/03/19/venus-xvs-token-plunges-9-as-exploit-leaves-protocol-with-bad-debt',
            },
        ],
        timeline=[
            {
                'date': '2020-09-29',
                'title': 'Launch on Binance Launchpool',
                'description': 'Venus goes live as an algorithmic money market on Binance Smart Chain with the XVS governance token.',
                'link': 'https://iq.wiki/wiki/venus-protocol',
                'status': 'executed',
            },
            {
                'date': '2020-11-27',
                'title': 'XVS governance token live',
                'description': 'The XVS token launched per the Venus whitepaper, enabling DAO governance of the protocol.',
                'link': 'https://iq.wiki/wiki/venus-protocol',
                'status': 'executed',
            },
            {
                'date': '2023-07-01',
                'title': 'V4: Isolated Pools',
                'description': 'Risk-segregated Isolated Pools launched, letting Venus list new/long-tail assets with contained risk. (Announced July 2023; day set to 1st.)',
                'link': 'https://docs-v4.venus.io/whats-new/isolated-pools',
                'status': 'executed',
            },
            {
                'date': '2023-10-03',
                'title': 'Venus Prime rewards program',
                'description': 'Venus Prime, the boosted-rewards program tying XVS staking to active supplying/borrowing, was audited/rolled out (OpenZeppelin Prime audit dated 2023-10-03).',
                'link': 'https://github.com/VenusProtocol/venus-protocol/blob/e02832bb2716bc0a178d910f6698877bf1b191e1/audits/065_prime_openzeppelin_20231003.pdf',
                'status': 'executed',
            },
            {
                'date': '2024-01-19',
                'title': 'Multichain governance',
                'description': "Cross-chain governance (LayerZero-based) enabling VIP execution across chains was audited (OpenZeppelin, 2024-01-19), supporting Venus's expansion to Ethereum, Arbitrum, ZKsync, and opBNB.",
                'link': 'https://github.com/VenusProtocol/governance-contracts/blob/2915ea772d86d9cc63f88fb6e804eaae53193879/audits/084_multichainGovernance_openzeppelin_20240119.pdf',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Chains supported',
                'value': 'BNB Chain, Ethereum, Arbitrum, ZKsync Era, opBNB',
                'freshness': 'static',
                'source': {
                    'label': 'Venus Isolated Pools announcement (mirror.xyz)',
                    'url': 'https://mirror.xyz/0x883E2FaE2099313a6d31F3D3D6101c0E0dA8f66a/FvJSNG169fdEWo4wBQizBEbQ8znMBhWrS5sFlsVB_gU',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Audited by',
                'value': 'OpenZeppelin, Certik, Peckshield, Quantstamp, Hacken, Fairyproof (component-by-component, reports public)',
                'freshness': 'static',
                'source': {
                    'label': 'Venus Security & Audits docs',
                    'url': 'https://docs-v4.venus.io/links/security-and-audits',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Founded',
                'value': 'Launched 2020-09-29 via Binance Launchpool by the Swipe team (founder Joselito Lizarondo)',
                'freshness': 'static',
                'source': {
                    'label': 'IQ.wiki Venus Protocol',
                    'url': 'https://iq.wiki/wiki/venus-protocol',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Oracle',
                'description': 'Venus has repeatedly suffered oracle/price-manipulation losses on low-liquidity collateral: the May 2021 XVS price spike drove $200M+ in liquidations and ~$100M bad debt, and the March 2026 THE (Thena) attack used a donation to inflate the vTHE exchange rate, leaving ~$2.15M bad debt. Thinly-traded listed assets remain an oracle attack surface.',
            },
            {
                'category': 'Collateral',
                'description': 'Listing volatile or thinly-liquid long-tail assets as collateral (XVS in 2021, THE in 2026) has directly caused bad debt. Even with Isolated Pools segregating risk, aggressive collateral factors and supply caps on such assets can be gamed, socializing losses within a pool.',
            },
            {
                'category': 'Smart Contract',
                'description': 'The March 2026 donation attack reportedly stemmed from a dismissed audit finding, and the protocol has a complex multi-component surface (Core Pool, Isolated Pools, PSM, converters, bridges, multichain governance). Contract bugs or unsafe parameter interactions can be exploited despite extensive audits.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': "VAI is an overcollateralized synthetic stablecoin that has historically traded off its $1 peg, requiring interventions such as a stability fee and a USDT-backed Peg Stability Module. VAI's peg depends on collateral solvency and PSM liquidity, and can drift under stress.",
            },
            {
                'category': 'Governance',
                'description': 'Concentrated XVS voting power and delegate-based governance mean a small set of large holders/delegates can steer risk parameters and emergency actions (e.g., votes to force-liquidate attacker wallets). This introduces centralization and potential misuse risk in an otherwise permissionless system.',
            },
        ],
        audits=[
            {
                'firm': 'Hacken',
                'date': '2023-04-26',
                'url': 'https://github.com/VenusProtocol/isolated-pools/blob/c801e898e034e313e885c5d486ed27c15e7e2abf/audits/016_isolatedPools_hacken_20230426.pdf',
            },
            {
                'firm': 'OpenZeppelin',
                'date': '2023-06-06',
                'url': 'https://github.com/VenusProtocol/oracle/blob/6f7a3d8769c28881661953e7ee3299b1d5b31e17/audits/026_oracles_openzeppelin_20230606.pdf',
            },
            {
                'firm': 'Quantstamp',
                'date': '2023-08-07',
                'url': 'https://github.com/VenusProtocol/venus-protocol/blob/90dfde3af29470938032c88ad7f9b31b3a4c503b/audits/057_psm_quantstamp_20230807.pdf',
            },
            {
                'firm': 'OpenZeppelin',
                'date': '2023-10-03',
                'url': 'https://github.com/VenusProtocol/venus-protocol/blob/e02832bb2716bc0a178d910f6698877bf1b191e1/audits/065_prime_openzeppelin_20231003.pdf',
            },
            {
                'firm': 'OpenZeppelin',
                'date': '2024-01-19',
                'url': 'https://github.com/VenusProtocol/governance-contracts/blob/2915ea772d86d9cc63f88fb6e804eaae53193879/audits/084_multichainGovernance_openzeppelin_20240119.pdf',
            },
            {
                'firm': 'Certik',
                'date': '2025-09-19',
                'url': 'https://github.com/VenusProtocol/venus-protocol/blob/73fa9f21c321f9e1821a7b187aeca46033ca5484/audits/149_emode_certik_20250919.pdf',
            },
        ],
        sources=[
            {
                'label': 'Venus Protocol official docs (V4)',
                'url': 'https://docs-v4.venus.io/',
            },
            {
                'label': 'Venus Security & Audits',
                'url': 'https://docs-v4.venus.io/links/security-and-audits',
            },
            {
                'label': 'IQ.wiki — Venus Protocol (history/launch)',
                'url': 'https://iq.wiki/wiki/venus-protocol',
            },
            {
                'label': 'The Defiant — 2021 liquidation/bad-debt event',
                'url': 'https://thedefiant.io/bscs-venus-protocol-left-with-bad-debt-after-liquidations',
            },
            {
                'label': 'CoinDesk — 2023 BNB bridge exploiter $30M liquidation',
                'url': 'https://www.coindesk.com/tech/2023/08/21/bnb-chain-exploiter-liquidated-for-30m-on-venus-protocol',
            },
            {
                'label': 'DL News — Sept 2025 $13M phishing recovery / DAO liquidation vote',
                'url': 'https://www.dlnews.com/articles/defi/venus-protocol-votes-to-liquidate-attacker-behind-13m-hack/',
            },
            {
                'label': 'CoinDesk — March 2026 THE-token exploit / bad debt',
                'url': 'https://www.coindesk.com/markets/2026/03/19/venus-xvs-token-plunges-9-as-exploit-leaves-protocol-with-bad-debt',
            },
        ],
        github="https://github.com/VenusProtocol",
        chains=["BNB Chain", "Ethereum", "Arbitrum One", "Optimism", "zkSync"],
        competitors=[
            {
                "name": "JustLend",
                "slug": "justlend",
                "rank": 1,
                "positioning": "Chain-specific lending leader (Tron).",
                "similarities": "Both are ecosystem-leading pooled money markets off Ethereum.",
                "differences": "Venus leads BNB Chain; JustLend leads Tron.",
            },
            _AAVE_COMPETITOR,
        ],
        lending={
            "collateralAssets": ["BNB", "ETH", "BTCB", "USDC", "USDT"],
            "loanAssets": ["USDT", "USDC", "VAI", "BNB"],
            "stablecoinExposure": ["USDT", "USDC", "VAI"],
            "oracles": ["Chainlink", "Binance Oracle", "Pyth"],
            "riskParameters": "Pool + isolated-pool model with per-asset collateral factors and caps.",
            "liquidations": "Keeper liquidations on BNB Chain when shortfall occurs.",
            "badDebt": "Historically incurred and managed bad debt (e.g. legacy large-position events); reserves + risk fund.",
            "governanceActivity": "Active XVS governance — isolated pools, parameters, VAI module.",
            "auditHistory": "Audited; has navigated past risk incidents on BNB Chain.",
            "deployment": {
                "chains": ["BNB Chain", "Ethereum", "Arbitrum", "Base", "Optimism", "opBNB", "zkSync"],
                "evmCompatible": "yes",
                "notes": "Core lending is BNB-Chain-centric (EVM-compatible); XVS bridges cross-chain (github.com).",
            },
            "stablecoinExposurePct": 78,
            "liquidations30d": {
                "volumeUsd": None,
                "count": None,
                "notes": "Keeper liquidations on BNB Chain when shortfall occurs.",
            },
            "governanceDetail": {
                "proposals": None,
                "voterTurnoutPct": None,
                "treasuryUsd": None,
                "notes": "Active XVS governance for isolated pools, parameters, and VAI module.",
            },
        },
        lending_tag_metrics={
            "moneyMarkets": {
                "emissionsPerAsset": "XVS emissions allocated per market; BNB and stablecoin markets receive the largest share.",
                "reserveFactorSummary": "Reserve factors 15–40% depending on asset risk tier.",
                "eModeUsage": "e-Mode enabled for correlated assets (e.g. stablecoin clusters) on BNB Chain.",
                "notes": "Venus supports both core pools and isolated pools on BNB Chain.",
            },
        },
        # XVS governance only; VAI is a product stablecoin (mentioned in copy, not MemberCoin).
        member_coins=[
            {
                "slug": "xvs",
                "name": "Venus",
                "symbol": "XVS",
                "category": "Token",
                "role": "Governance token",
                "subCategory": "Governance Token",
            },
        ],
    ),
    "justlend": _net(
        name="JustLend",
        symbol="JST",
        tagline="The largest lending market on Tron.",
        description=(
            "JustLend DAO is the dominant pooled money market on Tron, especially for USDT "
            "lending, and part of the broader JUST ecosystem."
        ),
        differentiator=(
            "Big by lending TVL on Tron (notably USDT); not an Ethereum/L2 competitor — "
            "its data pipeline is Tron/TVM rather than EVM."
        ),
        sub_sector="Money Markets",
        tags=[],
        official_docs="https://docs.justlend.org",
        website="https://justlend.org",
        twitter="https://x.com/DeFi_JUST",
        components=[
            {
                'name': 'Supply & Borrow Market (money market)',
                'description': 'The core Compound V2-style money market. Users supply TRX or TRC-20 assets (USDT, USDD, etc.) to receive interest-bearing jTokens, then over-collateralize to borrow other assets at algorithmic floating rates. As of the June 2026 upgrade the market moved to SBM V2, an isolated-collateral design with a dual-layer Vaults/Markets structure and an Adaptive Curve interest-rate model so that liquidations in one market no longer cascade across the whole protocol.',
            },
            {
                'name': 'Staked TRX (sTRX) & Energy Rental',
                'description': "A one-click TRX liquid-staking feature launched April 2023 under TRON's Stake 2.0. Users stake TRX to receive the sTRX TRC-20 token; JustLend handles Super Representative voting and reward claiming and automatically rents out the resulting TRON Energy, letting stakers earn voting + energy-rental yield. The Energy Rental market lets counterparties rent Energy at roughly 50-80% below the cost of burning TRX for transaction fees.",
            },
            {
                'name': 'Price Oracle',
                'description': "The protocol relies on a price oracle to value collateral and trigger liquidations. CertiK's audit flagged oracle design and centralization of oracle/admin controls as the primary risk areas, an important consideration given assets are valued via feeds the protocol admins configure.",
            },
            {
                'name': 'JST governance (GovernorBravo + Timelock)',
                'description': 'JST, the TRC-20 governance token shared across the JUST/JustLend DAO ecosystem (max supply 9.9B), governs every protocol parameter. Holders propose, vote, and execute on-chain through GovernorBravo and a Timelock contract. A revenue-driven JST buyback-and-burn mechanism was activated in October 2025, converting protocol revenue (including USDD profits) into permanent JST burns.',
            },
        ],
        faq=[
            {
                'question': 'What is JustLend DAO and what chain is it on?',
                'answer': "JustLend DAO is the largest lending / money-market protocol on the TRON blockchain and was TRON's first official lending platform, launched December 7, 2020. It is built on the Compound V2 architecture and is part of the JUST ecosystem associated with TRON founder Justin Sun. Users lend and borrow TRON-based assets such as TRX, USDT and USDD.",
                'pinned': True,
            },
            {
                'question': 'How does lending and borrowing work?',
                'answer': 'You supply TRX or TRC-20 tokens into a market and receive jTokens, which accrue interest algorithmically based on pool supply and demand. To borrow, you must over-collateralize with supplied assets. If your collateral value falls below the required threshold relative to your debt, your position can be liquidated. Interest rates float automatically with utilization.',
                'pinned': False,
            },
            {
                'question': 'What is the JST token used for?',
                'answer': 'JST is the TRC-20 governance token of the JUST / JustLend DAO ecosystem, with a maximum supply of 9.9 billion. Holders vote on protocol parameters and proposals via GovernorBravo + Timelock. Since October 2025 the DAO runs a revenue-funded JST buyback-and-burn program, making JST deflationary; the first round burned 560 million JST (about 5.66% of supply).',
                'pinned': False,
            },
            {
                'question': 'What is Staked TRX (sTRX) and Energy Rental?',
                'answer': "sTRX is JustLend DAO's one-click TRX liquid-staking product launched in April 2023 under TRON Stake 2.0. You stake TRX, receive the sTRX token, and JustLend automatically handles Super Representative voting and rents out the resulting TRON Energy to earn yield. The Energy Rental market lets users rent Energy for transactions at roughly 50-80% below the cost of burning TRX.",
                'pinned': False,
            },
            {
                'question': 'What changed in the SBM V2 (isolated lending) upgrade?',
                'answer': 'In June 2026 JustLend DAO launched Supply and Borrow Market V2, moving from a single shared pool to an isolated-collateral model with a dual-layer structure of Vaults (where depositors supply) and Markets (where borrowers pledge collateral), plus an Adaptive Curve interest-rate model. Each market has its own loan-to-value settings so a price crash or liquidation in one market stays contained instead of threatening the whole protocol.',
                'pinned': False,
            },
            {
                'question': 'Has JustLend been audited?',
                'answer': 'Yes. CertiK published a security assessment dated April 8, 2022, and SlowMist audited the sTRX / Staked TRX contracts. JustLend DAO also runs a bug-bounty program on Immunefi with rewards up to $50,000 for critical smart-contract vulnerabilities. Audits reduce but do not eliminate smart-contract risk.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'JustLend DAO',
                'role': 'Decentralized governance / protocol operator',
                'description': 'The DAO that governs the protocol. JST holders propose, vote and execute changes on-chain through GovernorBravo and a Timelock contract; reserve and vote-operator permissions were transferred to governance-controlled contracts per the CertiK audit response.',
            },
            {
                'name': 'JUST ecosystem (JUST Foundation)',
                'role': 'Parent DeFi ecosystem on TRON',
                'description': "JustLend is one of the core products of the JUST ecosystem on TRON (alongside USDD and other JUST products), broadly associated with TRON founder Justin Sun. The JUST Foundation published JustLend's launch and ecosystem announcements.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Money-market fund / secured margin lending',
                'similarity': 'Like a money-market fund, suppliers pool assets and earn a floating yield driven by borrowing demand; like secured (margin) lending, borrowers post over-collateral and face forced liquidation if the collateral value falls.',
                'differences': 'Everything is non-custodial and executed by smart contracts with no intermediary, credit check or KYC. Rates reset every block algorithmically rather than being set by a desk, positions are liquidated automatically by on-chain keepers, and the whole book is transparent on-chain. There is no deposit insurance.',
            },
        ],
        events=[
            {
                'date': '2020-12-07',
                'title': 'JustLend goes live on TRON',
                'description': "JustLend launched as TRON's first official lending platform, a Compound V2-style money market within the JUST ecosystem.",
                'link': 'https://justfoundation.medium.com/justlend-now-live-trons-first-official-lending-platform-to-redefine-the-decentralized-lending-7ab1835444e8',
            },
            {
                'date': '2022-04-08',
                'title': 'CertiK security assessment published',
                'description': 'CertiK released its security assessment of the JustLend protocol, highlighting centralization and oracle-design considerations.',
                'link': 'https://justlend.org/docs/justlend_audit_en.pdf',
            },
            {
                'date': '2023-04-19',
                'title': 'Staked TRX (sTRX) and Energy Rental launched',
                'description': 'JustLend DAO unveiled one-click TRX liquid staking (sTRX) under Stake 2.0 and an automated TRON Energy rental market (features went live April 16, 2023).',
                'link': 'https://chainwire.org/2023/04/19/defi-platform-justlend-dao-unveils-staked-trx-and-energy-rental-features/',
            },
            {
                'date': '2025-10-26',
                'title': 'First JST buyback-and-burn (deflationary shift)',
                'description': 'JustLend DAO executed its inaugural revenue-funded JST buyback-and-burn, allocating 59M USDT of reserves and permanently burning 560M JST (~5.66% of supply) in the first round, transitioning JST to a deflationary model.',
                'link': 'https://cryptoslate.com/justlend-dao-completes-first-jst-buyback-and-burn-ushering-in-a-revenue-driven-deflation-cycle/',
            },
            {
                'date': '2026-06-17',
                'title': 'Supply and Borrow Market V2 (isolated lending) launch',
                'description': 'JustLend DAO rolled out SBM V2, replacing the shared-pool model with an isolated-collateral Vaults/Markets architecture and an Adaptive Curve interest-rate model to contain per-market risk.',
                'link': 'https://crypto.news/justlend-dao-launches-supply-and-borrow-market-v2-with-isolated-lending-architecture/',
            },
        ],
        timeline=[
            {
                'date': '2020-12-07',
                'title': 'Protocol launch (v1)',
                'description': "Compound V2-based money market goes live on TRON as TRON's first official lending platform.",
                'link': 'https://justfoundation.medium.com/justlend-now-live-trons-first-official-lending-platform-to-redefine-the-decentralized-lending-7ab1835444e8',
                'status': 'executed',
            },
            {
                'date': '2023-04-16',
                'title': 'sTRX liquid staking + Energy Rental',
                'description': 'Stake 2.0 liquid-staking (sTRX) and automated TRON Energy rental added as a major protocol feature.',
                'link': 'https://docs.justlend.org/getting_started/concepts/staked_trx/',
                'status': 'executed',
            },
            {
                'date': '2025-10-26',
                'title': 'JST deflation / buyback-and-burn mechanism',
                'description': 'Governance-approved revenue-driven buyback-and-burn program activated, making JST deflationary with quarterly phased burns.',
                'link': 'https://cryptoslate.com/justlend-dao-completes-first-jst-buyback-and-burn-ushering-in-a-revenue-driven-deflation-cycle/',
                'status': 'executed',
            },
            {
                'date': '2026-06-17',
                'title': 'SBM V2 — isolated collateral markets',
                'description': 'Money Market Protocol Version 2.0: isolated Vaults/Markets architecture with Adaptive Curve interest-rate model.',
                'link': 'https://justlend.org/docs/justlend_whitepaper_en.pdf',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Launch date',
                'value': "December 7, 2020 (TRON's first official lending platform)",
                'freshness': 'static',
                'source': {
                    'label': 'JUST Foundation launch announcement (Medium)',
                    'url': 'https://justfoundation.medium.com/justlend-now-live-trons-first-official-lending-platform-to-redefine-the-decentralized-lending-7ab1835444e8',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Security audit',
                'value': 'CertiK security assessment dated April 8, 2022; SlowMist audit of the sTRX contracts',
                'freshness': 'static',
                'source': {
                    'label': 'CertiK security assessment (JustLend PDF)',
                    'url': 'https://justlend.org/docs/justlend_audit_en.pdf',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'First JST buyback-and-burn',
                'value': 'Oct 26, 2025: 59M USDT reserves allocated; 560M JST (~5.66% of supply) burned in round one',
                'freshness': 'static',
                'source': {
                    'label': 'CryptoSlate: JustLend completes first JST buyback and burn',
                    'url': 'https://cryptoslate.com/justlend-dao-completes-first-jst-buyback-and-burn-ushering-in-a-revenue-driven-deflation-cycle/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Network',
                'description': "JustLend runs exclusively on TRON, a chain widely criticized for its high degree of centralization (a small, foundation-influenced set of Super Representatives). Chain-level halts, censorship or governance capture would directly impair the protocol, and the sTRX product is tightly coupled to TRON's Super Representative voting and Energy/Stake 2.0 mechanics.",
            },
            {
                'category': 'Regulatory',
                'description': 'The protocol sits inside the JUST ecosystem broadly associated with Justin Sun, who and whose entities (TRON, related token issuers) have faced SEC litigation and regulatory scrutiny. Adverse action against the founder/ecosystem, or against the USDD stablecoin heavily used as collateral/borrow asset, presents an outsized regulatory overhang versus jurisdiction-neutral peers.',
            },
            {
                'category': 'Oracle',
                'description': "CertiK's audit specifically flagged oracle design as a risk area. Collateral valuation and liquidation depend on price feeds configured by protocol admins; a manipulated, stale or misconfigured feed could cause bad-debt-inducing under-liquidation or unfair liquidations, especially on thinner TRON-native markets.",
            },
            {
                'category': 'Governance',
                'description': 'The CertiK audit and SlowMist review highlighted centralization of admin/reserve controls: admins can set fee parameters (minFee, feeRatio) without hard min/max bounds, and permissions had to be migrated to governance/Timelock contracts. Concentrated JST holdings within the JUST ecosystem mean on-chain governance could in practice be steered by a small group.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': "A large share of activity is in USDT and especially USDD, an ecosystem stablecoin. USDD has previously traded below its $1 peg; a USDD depeg would impair collateral values, strand borrowers, and could generate protocol bad debt given USDD's prominence as both a supplied and borrowed asset.",
            },
            {
                'category': 'Smart Contract',
                'description': 'The protocol is a large Compound V2 fork extended with custom sTRX, Energy-rental and, since June 2026, isolated-market (SBM V2) contracts. Despite CertiK/SlowMist audits and a $50k Immunefi bounty, forked and newly rewritten lending code carries residual exploit risk, and the SBM V2 rewrite is comparatively new and less battle-tested.',
            },
        ],
        audits=[
            {
                'firm': 'CertiK',
                'date': '2022-04-08',
                'url': 'https://justlend.org/docs/justlend_audit_en.pdf',
            },
            {
                'firm': 'SlowMist',
                'date': '2023-04-16',
                'url': 'https://justlend.org/docs/justlend_strx_audit_en.pdf',
            },
        ],
        sources=[
            {
                'label': 'JustLend DAO official documentation',
                'url': 'https://docs.justlend.org/',
            },
            {
                'label': 'JUST Foundation — JustLend launch announcement (Dec 2020)',
                'url': 'https://justfoundation.medium.com/justlend-now-live-trons-first-official-lending-platform-to-redefine-the-decentralized-lending-7ab1835444e8',
            },
            {
                'label': 'CertiK security assessment (Apr 8, 2022)',
                'url': 'https://justlend.org/docs/justlend_audit_en.pdf',
            },
            {
                'label': 'Chainwire — sTRX & Energy Rental launch (Apr 2023)',
                'url': 'https://chainwire.org/2023/04/19/defi-platform-justlend-dao-unveils-staked-trx-and-energy-rental-features/',
            },
            {
                'label': 'CryptoSlate — first JST buyback-and-burn (Oct 2025)',
                'url': 'https://cryptoslate.com/justlend-dao-completes-first-jst-buyback-and-burn-ushering-in-a-revenue-driven-deflation-cycle/',
            },
            {
                'label': 'crypto.news — SBM V2 isolated-lending launch (Jun 2026)',
                'url': 'https://crypto.news/justlend-dao-launches-supply-and-borrow-market-v2-with-isolated-lending-architecture/',
            },
            {
                'label': 'Immunefi — JustLend DAO bug bounty ($50k max)',
                'url': 'https://immunefi.com/bug-bounty/justlenddao/information/',
            },
        ],
        github='https://github.com/justlend',
        chains=["Tron"],
        competitors=[
            {
                "name": "Venus",
                "slug": "venus",
                "rank": 1,
                "positioning": "Chain-specific lending leader (BNB Chain).",
                "similarities": "Both are ecosystem-leading pooled money markets off Ethereum.",
                "differences": "JustLend leads Tron; Venus leads BNB Chain.",
            },
            _AAVE_COMPETITOR,
        ],
        lending={
            "collateralAssets": ["TRX", "BTC", "USDT", "USDD"],
            "loanAssets": ["USDT", "USDD", "TRX"],
            "stablecoinExposure": ["USDT", "USDD"],
            "oracles": ["WinkLink"],
            "riskParameters": "Pooled money market with per-asset collateral factors; large USDT market.",
            "liquidations": "Keeper liquidations on Tron.",
            "badDebt": "Managed via reserves; concentration in USDT is the key exposure.",
            "governanceActivity": "Governed by the JUST ecosystem / JST holders.",
            "auditHistory": "Audited; largest Tron lending venue by TVL.",
            "deployment": {
                "chains": ["Tron"],
                "evmCompatible": "no",
                "notes": (
                    "Tron/TVM ecosystem — live metrics require TronGrid/TronScan indexer, "
                    "not EVM event logs (docs.justlend.org)."
                ),
            },
            "stablecoinExposurePct": 88,
            "liquidations30d": {
                "volumeUsd": None,
                "count": None,
                "notes": "Tron keeper liquidations; 30d aggregates require TronGrid indexer.",
            },
            "governanceDetail": {
                "proposals": None,
                "voterTurnoutPct": None,
                "treasuryUsd": None,
                "notes": "Governed by the JUST ecosystem / JST holders.",
            },
        },
        lending_tag_metrics={
            "moneyMarkets": {
                "emissionsPerAsset": "JST emissions distributed across TRX, USDT, and USDD markets.",
                "reserveFactorSummary": "Reserve factors set per market by JST governance.",
                "eModeUsage": None,
                "notes": "Dominant USDT lending venue on Tron.",
            },
        },
        member_coins=[
            {
                "slug": "jst",
                "name": "JUST",
                "symbol": "JST",
                "category": "Token",
                "role": "Governance token",
                "subCategory": "Governance Token",
            },
        ],
    ),
    "kamino": _net(
        name="Kamino",
        symbol="KMNO",
        tagline="Solana-native lending with isolated/curated markets.",
        description=(
            "Kamino Finance is a major Solana lending and liquidity protocol where markets "
            "and vaults are separated by asset, risk profile and strategy."
        ),
        differentiator=(
            "Solana-native isolated/curated lending — a major cross-chain competitor, but "
            "metrics come from Solana programs/accounts rather than EVM contracts."
        ),
        sub_sector="Isolated / Curated Lending",
        tags=[],
        official_docs="https://docs.kamino.finance",
        website="https://kamino.finance",
        twitter="https://x.com/KaminoFinance",
        components=[
            {
                'name': 'Kamino Lend (K-Lend)',
                'description': "Kamino's core money market on Solana, letting users supply yield-bearing and blue-chip assets as collateral and borrow against them in non-custodial, over-collateralized markets. It is the largest lending protocol on Solana. The open-source klend smart contract underpins all borrow/lend activity, and V2 (launched May 2025) added modular market creation with customizable risk parameters, permissioned/KYC markets and fixed-rate borrowing.",
            },
            {
                'name': 'Automated Liquidity Vaults',
                'description': "Kamino's original product (launched August 2022), providing automated concentrated-liquidity management on Solana AMMs (e.g. Orca, Raydium). Vaults auto-rebalance LP positions and compound fees so users can earn liquidity-provider yield without actively managing ranges. Kamino Earn Vaults extend this to curated lending strategies with conservative/balanced/aggressive risk tiers managed by firms such as Steakhouse Financial and Re7 Labs.",
            },
            {
                'name': 'Leverage / Multiply',
                'description': 'Products built on top of K-Lend that let users take leveraged, looped positions in a single click. Multiply loops a collateral asset (e.g. staked SOL, or the ACRED tokenized credit fund) to amplify yield exposure, while Long/Short margin leverage offers spot leverage trading with liquidation protections and typically lower fees than perpetual futures.',
            },
            {
                'name': 'KMNO token',
                'description': "Kamino's native governance and rewards token on Solana, launched 30 April 2024 with a fixed maximum supply of 10 billion. KMNO governs the protocol (incentive programs, revenue disbursement, risk parameters) and is distributed to active lenders, borrowers and liquidity providers through seasonal reward campaigns and an initial Genesis airdrop.",
            },
        ],
        faq=[
            {
                'question': 'What is Kamino Finance?',
                'answer': 'Kamino is a Solana-native DeFi protocol that combines a lending/borrowing money market (Kamino Lend), automated concentrated-liquidity vaults, and one-click leverage/Multiply products. It grew out of Hubble Protocol, launched its liquidity product in August 2022 and its lend/borrow product in November 2023, and is the largest lending protocol on Solana.',
                'pinned': True,
            },
            {
                'question': 'How does borrowing on Kamino work?',
                'answer': "Users deposit supported assets (including yield-bearing tokens like staked SOL) as collateral and borrow other assets against them in an over-collateralized position. Interest rates are set algorithmically by utilization. If a position's loan-to-value exceeds the liquidation threshold, it can be liquidated. Kamino Lend V2 also supports isolated modular markets and fixed-rate borrowing.",
                'pinned': False,
            },
            {
                'question': 'What is the KMNO token used for?',
                'answer': "KMNO is Kamino's governance and rewards token, launched 30 April 2024 with a 10 billion max supply. Holders can govern protocol parameters, incentive programs and revenue, and KMNO is distributed via seasonal reward campaigns to active users.",
                'pinned': False,
            },
            {
                'question': 'Which chain does Kamino run on?',
                'answer': "Kamino is Solana-native. All of its smart contracts (klend, kfarms, scope oracle, vaults, LIMO limit orders) run on the Solana blockchain, so users benefit from Solana's low fees and fast finality but are also exposed to Solana network risk.",
                'pinned': False,
            },
            {
                'question': 'Is Kamino audited?',
                'answer': 'Yes. Kamino states it has completed roughly 20 external security reviews across its components, with audits from OtterSec, Sec3, Offside Labs, Certora, Ackee Blockchain and RX Security. All audit reports are public in the Kamino-Finance/audits GitHub repository, and the team reports zero critical vulnerabilities to date.',
                'pinned': False,
            },
            {
                'question': 'What are real-world assets (RWAs) on Kamino?',
                'answer': "In 2025 Kamino began integrating tokenized RWAs, starting with ACRED, a tokenized feeder into Apollo Global's private credit fund issued via Securitize. Through Kamino's Multiply product users can loop ACRED for yield and borrow against tokenized exposure to real-world credit.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Kamino Labs (Hubble Protocol team)',
                'role': 'Core development team',
                'description': 'The team that builds and maintains the Kamino protocol, evolved from Hubble Protocol (founded 2021). Marius Ciubotariu is co-founder of Hubble and project lead of Kamino. The team is associated with a London base / British Virgin Islands entity.',
            },
            {
                'name': 'Kamino Foundation',
                'role': 'Token issuer & DAO steward',
                'description': 'The Kamino Foundation issued the KMNO governance token (announced March 2024, launched 30 April 2024) and stewards decentralized governance. KMNO holders vote on incentive programs, revenue disbursement, risk parameters and protocol operations via the Kamino governance forum (gov.kamino.finance).',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Secured lending / money-market desk',
                'similarity': 'Like a collateralized lending desk, Kamino Lend lets depositors earn yield on supplied assets while borrowers post collateral and pay floating (or, in V2, fixed) interest on loans.',
                'differences': 'It is fully on-chain, non-custodial and permissionless (aside from optional KYC markets), with liquidations executed automatically by smart contracts and no central credit officer, balance sheet or deposit insurance.',
            },
            {
                'product': 'Private-credit fund access (Apollo ACRED)',
                'similarity': "Via the ACRED integration, Kamino gives users exposure to Apollo Global's private credit strategy, similar to buying into an institutional credit fund.",
                'differences': "Access is tokenized under Securitize's regulated sToken framework on Solana and can be leveraged/looped or used as collateral through Kamino Multiply, whereas a traditional fund is illiquid and gated to accredited/institutional investors.",
            },
        ],
        events=[
            {
                'date': '2022-08-01',
                'title': 'Kamino liquidity vaults launch',
                'description': 'Kamino launches its automated concentrated-liquidity management product on Solana, its first product (exact August 2022 launch; day approximated to the 1st).',
                'link': 'https://solanacompass.com/projects/Kamino_Finance',
            },
            {
                'date': '2023-11-01',
                'title': 'Kamino Lend (borrow/lend) launches',
                'description': 'Kamino expands into lending, launching its K-Lend money market to fill the gap left by failed Solana lenders after FTX (November 2023; day approximated to the 1st).',
                'link': 'https://solanacompass.com/projects/Kamino_Finance',
            },
            {
                'date': '2024-03-07',
                'title': 'KMNO token airdrop announced',
                'description': 'Kamino announces its KMNO governance token and a Genesis airdrop, setting a snapshot for eligible users and a launch for April.',
                'link': 'https://www.coindesk.com/business/2024/03/07/solana-defi-protocol-kamino-sets-kmno-token-airdrop-for-april',
            },
            {
                'date': '2024-04-30',
                'title': 'KMNO token goes live',
                'description': 'The KMNO governance token launches with a 10 billion max supply and an initial Genesis airdrop of roughly 7% of supply to historical users.',
                'link': 'https://solanafloor.com/news/kamino-foundation-unveils-kmno-token-tge-for-april-30th-reveals-comprehensive-tokenomics-and-utility',
            },
            {
                'date': '2025-05-20',
                'title': 'Kamino Lend V2 launch & ACRED RWA integration',
                'description': "Kamino launches Lend V2, a modular credit infrastructure adding curated Earn Vaults, margin leverage, fixed-rate borrowing and permissioned markets, alongside onboarding of Apollo's ACRED tokenized credit fund via Securitize.",
                'link': 'https://www.coindesk.com/business/2025/05/20/apollos-tokenized-credit-fund-set-for-solana-defi-debut-as-rwa-trend-expands',
            },
        ],
        timeline=[
            {
                'date': '2022-08-01',
                'title': 'Automated liquidity vaults',
                'description': 'First Kamino product: automated concentrated-liquidity management (August 2022; day approximated).',
                'link': 'https://solanacompass.com/projects/Kamino_Finance',
                'status': 'executed',
            },
            {
                'date': '2023-11-01',
                'title': 'Kamino Lend V1',
                'description': 'Launch of the K-Lend money market on Solana (November 2023; day approximated).',
                'link': 'https://solanacompass.com/projects/Kamino_Finance',
                'status': 'executed',
            },
            {
                'date': '2024-04-30',
                'title': 'KMNO governance token',
                'description': 'TGE of the KMNO token, introducing on-chain governance to the protocol.',
                'link': 'https://solanafloor.com/news/kamino-foundation-unveils-kmno-token-tge-for-april-30th-reveals-comprehensive-tokenomics-and-utility',
                'status': 'executed',
            },
            {
                'date': '2025-05-20',
                'title': 'Kamino Lend V2 (modular credit)',
                'description': 'Modular lending infrastructure: instant market creation with custom risk parameters, curated Earn Vaults, margin leverage, fixed-rate borrowing, KYC/permissioned markets and RWA collateral.',
                'link': 'https://www.rockawayx.com/insights/kamino-launches-v2-ushering-in-a-new-era-of-modular-credit-infrastructure-on-solana',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'KMNO max supply',
                'value': '10,000,000,000 KMNO (fixed), token launched 2024-04-30',
                'freshness': 'static',
                'source': {
                    'label': 'SolanaFloor — KMNO TGE & tokenomics',
                    'url': 'https://solanafloor.com/news/kamino-foundation-unveils-kmno-token-tge-for-april-30th-reveals-comprehensive-tokenomics-and-utility',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Security reviews',
                'value': '~20 external security reviews across all major components; auditors include OtterSec, Sec3, Offside Labs, Certora, Ackee Blockchain, RX Security; zero critical vulnerabilities reported to date',
                'freshness': 'static',
                'source': {
                    'label': 'Kamino Docs — Security Audits',
                    'url': 'https://kamino.com/docs/security/audits',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Chain',
                'value': 'Solana-native (klend, kfarms, scope oracle, vaults, LIMO all run on Solana)',
                'freshness': 'static',
                'source': {
                    'label': 'Kamino-Finance GitHub org',
                    'url': 'https://github.com/Kamino-Finance',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Network',
                'description': 'Kamino is entirely Solana-native. A Solana network outage, congestion or halt (Solana has experienced multiple downtime incidents) can prevent liquidations, oracle updates, deposits and withdrawals, potentially leaving positions unmanageable or under-collateralized during volatility.',
            },
            {
                'category': 'Oracle',
                'description': "K-Lend relies on Kamino's Scope oracle aggregation layer and underlying price feeds (e.g. Pyth/Switchboard). Stale, manipulated or mispriced feeds — especially for thinner Solana collateral or LP/liquid-staking tokens — could cause faulty liquidations or allow bad debt to accrue.",
            },
            {
                'category': 'Collateral',
                'description': 'Kamino accepts yield-bearing and less-liquid Solana collateral (liquid-staked SOL, LP tokens, and tokenized RWAs like ACRED). Depegs, liquidity crunches or redemption gating on such collateral can outpace liquidations and create protocol bad debt.',
            },
            {
                'category': 'Smart Contract',
                'description': "Despite ~20 audits and no critical findings to date, Kamino's klend, vault, farms, scope and LIMO programs are complex Solana smart contracts; a bug or exploit in any component, or in the automated leverage/Multiply logic, could lead to loss of user funds.",
            },
            {
                'category': 'Governance',
                'description': 'The KMNO token controls incentive programs, risk parameters and revenue disbursement. Concentrated token holdings or governance capture could push through risk-parameter or market-listing changes that favor insiders or introduce unsafe collateral.',
            },
        ],
        partnerships=[
            {
                'name': 'Apollo Global / Securitize (ACRED tokenized credit fund)',
                'date': '2025-05-20',
                'amountLabel': None,
                'description': "Kamino integrated ACRED, a tokenized feeder into Apollo Global's private credit fund issued under Securitize's regulated sToken standard, in collaboration with Steakhouse Financial. ACRED can be looped via Kamino Multiply and used as collateral, bringing real-world credit exposure to Solana DeFi.",
            },
        ],
        audits=[
            {
                'firm': 'OtterSec',
                'date': '2023-09-06',
                'url': 'https://github.com/Kamino-Finance/audits',
            },
            {
                'firm': 'RX Security',
                'date': '2023-07-03',
                'url': 'https://github.com/Kamino-Finance/audits',
            },
            {
                'firm': 'Sec3',
                'date': '2025-02-06',
                'url': 'https://github.com/Kamino-Finance/audits/blob/master/kamino_klend_sec3.pdf',
            },
            {
                'firm': 'Offside Labs',
                'date': '2025-04-12',
                'url': 'https://github.com/Kamino-Finance/audits/blob/master/kamino_scope-offside_labs.pdf',
            },
            {
                'firm': 'Certora',
                'date': '2024-12-16',
                'url': 'https://github.com/Kamino-Finance/audits/blob/master/kamino_lend_certora.pdf',
            },
        ],
        sources=[
            {
                'label': 'Solana Compass — Kamino Finance project review',
                'url': 'https://solanacompass.com/projects/Kamino_Finance',
            },
            {
                'label': 'Kamino Docs — Security Audits',
                'url': 'https://kamino.com/docs/security/audits',
            },
            {
                'label': 'Kamino-Finance/audits GitHub repo',
                'url': 'https://github.com/Kamino-Finance/audits',
            },
            {
                'label': 'CoinDesk — Kamino sets KMNO token airdrop (2024-03-07)',
                'url': 'https://www.coindesk.com/business/2024/03/07/solana-defi-protocol-kamino-sets-kmno-token-airdrop-for-april',
            },
            {
                'label': 'SolanaFloor — KMNO TGE & tokenomics (April 30, 2024)',
                'url': 'https://solanafloor.com/news/kamino-foundation-unveils-kmno-token-tge-for-april-30th-reveals-comprehensive-tokenomics-and-utility',
            },
            {
                'label': 'RockawayX — Kamino launches V2 modular credit infrastructure',
                'url': 'https://www.rockawayx.com/insights/kamino-launches-v2-ushering-in-a-new-era-of-modular-credit-infrastructure-on-solana',
            },
            {
                'label': 'CoinDesk — Apollo ACRED tokenized credit fund on Solana (2025-05-20)',
                'url': 'https://www.coindesk.com/business/2025/05/20/apollos-tokenized-credit-fund-set-for-solana-defi-debut-as-rwa-trend-expands',
            },
        ],
        github='https://github.com/Kamino-Finance',
        chains=["Solana"],
        competitors=[
            {
                "name": "Morpho",
                "slug": "morpho",
                "rank": 1,
                "positioning": "Customizable lending infrastructure.",
                "similarities": "Both use isolated markets and curated vaults.",
                "differences": "Kamino is Solana-native; Morpho is EVM.",
            },
            _AAVE_COMPETITOR,
        ],
        lending={
            "collateralAssets": ["SOL", "JitoSOL", "mSOL", "BTC", "ETH", "USDC"],
            "loanAssets": ["USDC", "USDT", "SOL"],
            "stablecoinExposure": ["USDC", "USDT", "PYUSD"],
            "oracles": ["Pyth", "Switchboard"],
            "riskParameters": "Isolated/curated markets with per-market risk configuration and caps.",
            "liquidations": "Permissionless liquidations within isolated markets.",
            "badDebt": "Isolated to individual markets; conservative caps on long-tail assets.",
            "governanceActivity": "KMNO governs markets and incentives.",
            "auditHistory": "Audited Solana programs; Solana outage risk is a distinct consideration.",
            "deployment": {
                "chains": ["Solana"],
                "evmCompatible": "no",
                "notes": (
                    "Solana-native; live metrics require Helius/Triton or Dune Solana tables "
                    "(program accounts, not EVM logs)."
                ),
            },
            "stablecoinExposurePct": 62,
            "liquidations30d": {
                "volumeUsd": None,
                "count": None,
                "notes": "Permissionless liquidations within isolated markets.",
            },
            "governanceDetail": {
                "proposals": None,
                "voterTurnoutPct": None,
                "treasuryUsd": None,
                "notes": "KMNO governs markets and incentives.",
            },
        },
        lending_tag_metrics={
            "isolatedCurated": {
                "isolatedMarketCount": 45,
                "vaultCount": 30,
                "curatorCount": None,
                "topCurators": [],
                "lltvDistribution": "Per-market LTV caps vary by asset; conservative on long-tail Solana assets.",
                "vaultTvlSharePct": 70,
                "curatorFeeTakeRatePct": None,
                "notes": "Kamino Lend uses isolated markets with strategy vaults on Solana.",
            },
        },
        credit_tag_metrics={
            "lending": {
                "collateralAssets": ["SOL", "JitoSOL", "mSOL", "BTC", "ETH", "USDC"],
                "oracles": ["Pyth", "Switchboard"],
                "isolatedMarketCount": 45,
            },
        },
        member_coins=[
            {
                "slug": "kmno",
                "name": "Kamino",
                "symbol": "KMNO",
                "category": "Token",
                "role": "Governance token",
                "subCategory": "Governance Token",
            },
        ],
    ),
    "maple": _net(
        name="Maple Finance",
        symbol="SYRUP",
        tagline="Onchain institutional / private credit.",
        description=(
            "Maple Finance runs onchain lending pools to vetted borrowers — institutions, "
            "funds and businesses — closer to a blockchain-based credit marketplace than "
            "open overcollateralized DeFi lending."
        ),
        differentiator=(
            "Institutional / private-credit model: borrower quality, repayment history, "
            "collateral ratios, defaults, pool managers and loan terms matter most."
        ),
        sub_sector="Institutional / Private Credit",
        tags=[],
        official_docs="https://docs.maple.finance",
        website="https://maple.finance",
        twitter="https://x.com/maplefinance",
        components=[
            {
                'name': 'Maple Institutional Lending Pools',
                'description': "Permissioned, KYC-gated lending pools where institutional capital allocators lend USDC/USDT to vetted crypto-native borrowers (prop trading firms, market makers, miners, yield funds). Since 2023 all loans are overcollateralized (typically 105-130%) with BTC, ETH or SOL held in Maple's custody contracts, running 30-180 day fixed-rate tenors. Underwriting is handled in-house by Maple Direct.",
            },
            {
                'name': 'syrupUSDC / syrupUSDT (Syrup module)',
                'description': "Permissionless, yield-bearing tokenized lending vaults launched alongside SYRUP in Nov 2024 that let non-institutional users deposit stablecoins. Deposits are routed into Maple's underlying institutional credit pools; the syrupUSDC token accrues value as borrowers repay interest, abstracting the KYC-gated pools behind a single composable ERC-20.",
            },
            {
                'name': 'Maple Direct',
                'description': "Maple's in-house credit and underwriting arm, launched June 2023. It sources and vets institutional borrowers and issues overcollateralized USDC/USDT loans backed by BTC, ETH and staked ETH held with a qualified custodian, bypassing banks. It is the credit engine behind the secured institutional lending book.",
            },
            {
                'name': 'SYRUP token & staking (stSYRUP)',
                'description': "The protocol's governance and value-accrual token, which replaced the legacy MPL token in Nov 2024 at a fixed 1 MPL : 100 SYRUP rate. Holders can stake to stSYRUP for rewards and govern the protocol. A portion of protocol revenue funds strategic SYRUP buybacks.",
            },
        ],
        faq=[
            {
                'question': 'How does Maple Finance generate yield?',
                'answer': 'Yield comes primarily from fixed-rate loans made to vetted crypto-native institutions (trading firms, market makers, miners, funds). Since 2023 these loans are overcollateralized with liquid assets like BTC, ETH or SOL held in Maple custody contracts. Borrowers pay interest on 30-180 day loans, and that interest flows back to lenders and syrupUSDC holders.',
                'pinned': True,
            },
            {
                'question': 'What is syrupUSDC and how is it different from the institutional pools?',
                'answer': "syrupUSDC is a permissionless, yield-bearing vault token (launched Nov 2024 with the Syrup module) that lets anyone deposit USDC without KYC. It routes deposits into Maple's underlying institutional credit pools. The institutional pools themselves are permissioned and require identity verification to lend or borrow directly.",
                'pinned': False,
            },
            {
                'question': 'What happened to the MPL token?',
                'answer': 'MPL was fully migrated to the new SYRUP token starting November 13, 2024, at a fixed rate of 1 MPL to 100 SYRUP. Holders convert at syrup.fi/convert, optionally directly into staked SYRUP (stSYRUP). SYRUP governs both the Maple and Syrup products.',
                'pinned': False,
            },
            {
                'question': 'Are Maple loans overcollateralized?',
                'answer': "Today, yes. After the 2022-2023 restructuring, Maple's book moved to overcollateralized lending underwritten by Maple Direct, typically 105-130% collateral in BTC, ETH or SOL held in Maple custody contracts. In its earliest (2021-2022) form Maple offered undercollateralized loans, which contributed to defaults during the 2022 crypto crisis.",
                'pinned': False,
            },
            {
                'question': 'Which chains does Maple support?',
                'answer': 'Maple operates primarily on Ethereum, where its core institutional pools and syrupUSDC live, and has expanded to Solana for products including USDC lending and access to US Treasury yield.',
                'pinned': False,
            },
            {
                'question': 'What are the main risks of lending on Maple?',
                'answer': 'The central risk is counterparty/borrower credit risk: borrowers are curated institutions, and a large borrower default (as happened with Orthogonal Trading in December 2022) can cause material lender losses. Other risks include smart-contract risk, collateral price/liquidation risk, and regulatory risk around KYC-gated institutional credit.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Maple (Maple Labs / Maple Finance)',
                'role': 'Core development and asset-management company',
                'description': 'The company behind the Maple protocol, founded in 2019 by Sidney Powell and Joe Flanagan. It builds the smart contracts, operates Maple Direct underwriting, and manages the Syrup products. Team members have backgrounds at J.P. Morgan, Bank of America, Deutsche Bank, BlackRock, Galaxy Digital and PIMCO.',
            },
            {
                'name': 'Sidney Powell',
                'role': 'Co-Founder & CEO',
                'description': 'Co-founded Maple in 2019 and leads the company as CEO; ex-institutional banking background.',
            },
            {
                'name': 'Joe Flanagan',
                'role': 'Co-Founder & Executive Chairman',
                'description': "Co-founded Maple in 2019; serves as Executive Chairman. Other named executives include CTO Matt Collum and COO Ryan O'Shea.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Private credit / direct-lending fund',
                'similarity': "Like a private credit fund, Maple pools lender capital and extends short-duration, negotiated loans to a curated set of institutional borrowers, earning a spread on interest. Underwriting is done by an in-house credit arm (Maple Direct), analogous to a fund's credit committee.",
                'differences': "Loans, collateral and repayments are on-chain and transparent in real time; lender positions are tokenized (syrupUSDC) and composable; settlement is near-instant versus a private fund's lockups and quarterly reporting.",
            },
            {
                'product': 'Prime brokerage secured lending desk',
                'similarity': 'Maple Direct extends collateralized stablecoin credit to trading firms and market makers to fund inventory and basis trades, much as a prime broker lends against posted collateral.',
                'differences': "Collateral (BTC/ETH/SOL) sits in on-chain custody contracts with programmatic terms rather than in a broker's balance sheet, and access is via a permissioned DeFi protocol rather than a bilateral prime relationship.",
            },
        ],
        events=[
            {
                'date': '2021-05-12',
                'title': 'Maple protocol goes live on Ethereum mainnet',
                'description': 'Maple launched its first version on Ethereum as a credit-market protocol offering institutional borrowers access to (initially undercollateralized) loans funded by lenders seeking yield. The MPL token had been distributed via a Balancer LBP fair launch on April 28, 2021.',
                'link': 'https://oakresearch.io/en/reports/protocols/maple-finance-complete-overview-hub-on-chain-institutional-lending',
            },
            {
                'date': '2022-12-05',
                'title': 'Orthogonal Trading defaults on $36M (FTX contagion)',
                'description': 'Orthogonal Trading was issued a default notice for roughly $36M across eight loans after its FTX exposure proved far larger than disclosed to credit delegate M11 Credit. The default affected about 30% of active loans; the M11 USDC pool faced an ~80% loss on remaining capital, and Maple severed ties with Orthogonal.',
                'link': 'https://www.coindesk.com/markets/2022/12/05/maple-finance-severs-ties-with-orthogonal-trading-alleging-it-misrepresented-financial-position',
            },
            {
                'date': '2023-06-28',
                'title': 'Maple Direct launched',
                'description': "Maple introduced Maple Direct, its in-house lending arm connecting Web3 borrowers with institutional capital. Its first product (July 2023) issued loans overcollateralized with BTC, ETH and staked ETH via a qualified custodian, marking Maple's shift to a secured lending model.",
                'link': 'https://maple.finance/insights/introducing-maple-direct/',
            },
            {
                'date': '2023-08-22',
                'title': '$5M strategic funding round closed',
                'description': 'Maple closed a $5M strategic round led by BlockTower Capital and Tioga Capital, funding expansion beyond DeFi into APAC/LATAM institutional lending and a restart on Solana.',
                'link': 'https://maple.finance/insights/maple-closes-strategic-funding-round/',
            },
            {
                'date': '2024-11-13',
                'title': 'SYRUP token launch and MPL migration',
                'description': 'Maple launched the SYRUP token and the Syrup module (syrupUSDC), letting non-institutional users deposit stablecoins. MPL holders migrate to SYRUP at a fixed 1:100 rate, with optional one-click staking to stSYRUP.',
                'link': 'https://maple.finance/insights/syrup-token-launch-staking-and-conversion-of-mpl-to-syrup',
            },
        ],
        timeline=[
            {
                'date': '2021-05-12',
                'title': 'Maple V1 mainnet launch (Ethereum)',
                'description': 'Initial credit-market protocol with delegate-managed lending pools and undercollateralized institutional loans.',
                'link': 'https://oakresearch.io/en/reports/protocols/maple-finance-complete-overview-hub-on-chain-institutional-lending',
                'status': 'executed',
            },
            {
                'date': '2022-12-01',
                'title': 'Maple V2 release',
                'description': 'V2 smart-contract overhaul audited by Trail of Bits, Spearbit and Three Sigma, introducing improved pool, loan and withdrawal-manager architecture.',
                'link': 'https://github.com/maple-labs/maple-v2-audits',
                'status': 'executed',
            },
            {
                'date': '2023-06-28',
                'title': 'Maple Direct and move to overcollateralized lending',
                'description': 'Launch of the in-house underwriting arm and secured lending product backed by BTC/ETH/stETH held with a qualified custodian.',
                'link': 'https://maple.finance/insights/introducing-maple-direct/',
                'status': 'executed',
            },
            {
                'date': '2024-11-13',
                'title': 'SYRUP token and Syrup module (syrupUSDC)',
                'description': 'Governance-token migration from MPL to SYRUP and launch of the permissionless syrupUSDC vault opening Maple credit to non-institutional depositors.',
                'link': 'https://maple.finance/insights/syrup-token-launch-staking-and-conversion-of-mpl-to-syrup',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Assets Under Management',
                'value': "~$4.61B (per Maple's official About page)",
                'freshness': 'static',
                'source': {
                    'label': 'Maple About page',
                    'url': 'https://maple.finance/about',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Cumulative amount borrowed',
                'value': "~$22.93B (per Maple's official About page)",
                'freshness': 'static',
                'source': {
                    'label': 'Maple About page',
                    'url': 'https://maple.finance/about',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding raised',
                'value': '$5M strategic round (Aug 2023), led by BlockTower Capital and Tioga Capital',
                'freshness': 'static',
                'source': {
                    'label': 'The Block',
                    'url': 'https://www.theblock.co/post/246867/blocktower-co-leads-5-million-strategic-funding-round-for-defi-lender-maple-finance',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': "Maple's core model is credit to a curated set of crypto-native institutions. Even with overcollateralization, borrower default is the central risk: in December 2022 Orthogonal Trading defaulted on ~$36M after misrepresenting its FTX exposure, causing an ~80% loss to lenders in the affected M11 USDC pool. Loan performance depends on the quality of Maple Direct's underwriting and borrower disclosure.",
            },
            {
                'category': 'Collateral',
                'description': 'Overcollateralized loans are backed by volatile crypto (BTC, ETH, SOL) at roughly 105-130% collateral ratios held in custody contracts. A sharp price drop can erode the collateral buffer, and liquidating large positions in stressed markets may not fully cover the loan, especially given short 30-180 day tenors.',
            },
            {
                'category': 'Smart Contract',
                'description': "Lender funds sit in Maple's pool, loan and withdrawal-manager contracts. Pre-mainnet audits found high-severity bugs (e.g. Three Sigma's V2 findings allowing bogus fee managers, arbitrary origination fees, or a malicious withdrawal-manager to drain pools), which were fixed; residual contract risk remains inherent to the protocol.",
            },
            {
                'category': 'Regulatory',
                'description': 'Maple operates a KYC-gated institutional credit business and, via Maple Direct, issues real secured loans to legal entities. This exposes lenders and the protocol to securities, lending-license and cross-border regulatory risk, particularly as it expands into APAC/LATAM and tokenized Treasury-style products.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'syrupUSDC yield ultimately depends on USDC/USDT lent to borrowers. A depeg or freeze of the underlying stablecoin, or of syrupUSDC relative to its net asset value during a rush of withdrawals, could impair redemptions since loans are locked for fixed tenors and cannot be recalled instantly.',
            },
        ],
        investment_rounds=[
            {
                'date': '2023-08-22',
                'round': 'Strategic',
                'amountUsd': 5000000,
                'amountLabel': '$5M',
                'investors': [
                    'BlockTower Capital',
                    'Tioga Capital',
                    'Room40 Ventures',
                    'Cherry Crypto',
                    'Spartan Capital',
                    'GSR Ventures',
                    'Veris Ventures',
                    'Maven 11',
                    'Framework Ventures',
                ],
                'link': 'https://maple.finance/insights/maple-closes-strategic-funding-round/',
            },
        ],
        audits=[
            {
                'firm': 'Trail of Bits',
                'date': '2022-08-24',
                'url': 'https://github.com/maple-labs/maple-v2-audits',
            },
            {
                'firm': 'Spearbit',
                'date': '2022-10-17',
                'url': 'https://github.com/maple-labs/maple-v2-audits',
            },
            {
                'firm': 'Three Sigma',
                'date': '2022-10-24',
                'url': 'https://github.com/maple-labs/maple-v2-audits',
            },
            {
                'firm': 'Spearbit (via Cantina)',
                'date': '2023-06-05',
                'url': 'https://github.com/maple-labs/maple-v2-audits',
            },
            {
                'firm': '0xMacro',
                'date': '2023-11-27',
                'url': 'https://github.com/maple-labs/maple-v2-audits',
            },
        ],
        sources=[
            {
                'label': 'Maple Finance official site',
                'url': 'https://maple.finance/',
            },
            {
                'label': 'Maple About page (team, AUM)',
                'url': 'https://maple.finance/about',
            },
            {
                'label': 'Maple V2 audit reports (GitHub)',
                'url': 'https://github.com/maple-labs/maple-v2-audits',
            },
            {
                'label': 'OAK Research: Maple Finance overview',
                'url': 'https://oakresearch.io/en/reports/protocols/maple-finance-complete-overview-hub-on-chain-institutional-lending',
            },
            {
                'label': 'CoinDesk: Orthogonal Trading $36M default',
                'url': 'https://www.coindesk.com/markets/2022/12/05/maple-finance-severs-ties-with-orthogonal-trading-alleging-it-misrepresented-financial-position',
            },
            {
                'label': 'Maple: SYRUP token launch and MPL conversion',
                'url': 'https://maple.finance/insights/syrup-token-launch-staking-and-conversion-of-mpl-to-syrup',
            },
            {
                'label': 'The Block: $5M strategic funding round',
                'url': 'https://www.theblock.co/post/246867/blocktower-co-leads-5-million-strategic-funding-round-for-defi-lender-maple-finance',
            },
        ],
        github="https://github.com/maple-labs",
        chains=["Ethereum", "Solana", "Base", "Arbitrum One"],
        competitors=[
            _AAVE_COMPETITOR,
            {
                "name": "Morpho",
                "slug": "morpho",
                "rank": 2,
                "positioning": "Customizable lending infrastructure.",
                "similarities": "Both can host curated/credit-style vaults.",
                "differences": "Maple is institutional private credit (offchain underwriting); Morpho is permissionless onchain markets.",
            },
        ],
        lending={
            "collateralAssets": ["BTC", "ETH", "Tokenized T-bills", "Undercollateralized (vetted)"],
            "loanAssets": ["USDC", "USDT"],
            "stablecoinExposure": ["USDC", "USDT"],
            "oracles": ["Off-chain underwriting + Chainlink for onchain collateral"],
            "riskParameters": (
                "Borrower quality, repayment history, collateral ratio, defaults, pool managers "
                "and loan terms — credit-market metrics, not pure overcollateralization."
            ),
            "liquidations": "Workout/recovery process on default rather than instant onchain liquidation.",
            "badDebt": "Most important metric here — tracked via defaults and loan-loss history per pool.",
            "governanceActivity": "SYRUP governance + Maple pool delegates / managers.",
            "auditHistory": "Audited; has experienced and worked out borrower defaults historically.",
            "deployment": {
                "chains": ["Ethereum", "Solana", "Base", "Arbitrum"],
                "evmCompatible": "mixed",
                "notes": "EVM deployments plus Solana exposure — treat as cross-ecosystem (Support - Eco).",
            },
            "stablecoinExposurePct": 95,
            "liquidations30d": {
                "volumeUsd": None,
                "count": None,
                "notes": "Workout/recovery on default rather than instant onchain liquidation.",
            },
            "governanceDetail": {
                "proposals": None,
                "voterTurnoutPct": None,
                "treasuryUsd": None,
                "notes": "SYRUP governance + Maple pool delegates / managers.",
            },
        },
        lending_tag_metrics={
            "institutionalCredit": {
                "activeBorrowerCount": 35,
                "defaultRateLifetimePct": 2.1,
                "defaultRate12mPct": 0.8,
                "weightedAvgMaturityDays": 90,
                "kycPoolTvlUsd": 1_500_000_000,
                "permissionlessPoolTvlUsd": 800_000_000,
                "overCollateralizedPct": 40,
                "underCollateralizedPct": 60,
                "poolDelegates": [
                    {"name": "BlockTower", "aumUsd": 400_000_000},
                    {"name": "Auros", "aumUsd": 250_000_000},
                ],
                "cumulativeOriginationsUsd": 5_000_000_000,
                "syrupUsdcPoolUsd": 600_000_000,
                "syrupUsdtPoolUsd": 200_000_000,
                "stSyrupStakedSupply": None,
                "notes": "Maple v2 syrupUSDC/syrupUSDT pools are permissionless; KYC pools serve institutional borrowers.",
            },
        },
        # Intentionally multi-coin: SYRUP ecosystem + pool tokens (see LENDING_MEMBER_COIN_AUDIT).
        member_coins=[
            {
                "slug": "syrup",
                "name": "Syrup",
                "symbol": "SYRUP",
                "category": "Token",
                "role": "Governance / staking token (ex-MPL)",
                "subCategory": "Governance Token",
            },
            {
                "slug": "syrup-oft",
                "name": "SYRUP (OFT)",
                "symbol": "SYRUP",
                "category": "Token",
                "role": "OFT bridge token on Base",
                "subCategory": "Governance Token",
            },
            {
                "slug": "stsyrup",
                "name": "stSYRUP",
                "symbol": "stSYRUP",
                "category": "Token",
                "role": "Staked SYRUP receipt",
                "subCategory": "Yield-generating Token",
            },
            {
                "slug": "syrup-usdc-pool",
                "name": "syrupUSDC pool",
                "symbol": "syrupUSDC",
                "category": "Token",
                "role": "USDC lending pool token",
                "subCategory": "Yield-generating Token",
            },
            {
                "slug": "syrup-usdt-pool",
                "name": "syrupUSDT pool",
                "symbol": "syrupUSDT",
                "category": "Token",
                "role": "USDT lending pool token",
                "subCategory": "Yield-generating Token",
            },
        ],
    ),
    "radiant": _net(
        name="Radiant Capital",
        symbol="RDNT",
        csv_slug="radiant-capital",
        tagline="Omnichain money market via LayerZero.",
        description=(
            "Radiant Capital is a cross-chain money market that lets users deposit on one "
            "chain and borrow on another, unifying fragmented liquidity through LayerZero."
        ),
        differentiator=(
            "Omnichain lending — deposits and borrows are bridged across chains via "
            "LayerZero rather than confined to a single network's liquidity."
        ),
        sub_sector="Lending",
        tags=["Lending"],
        chains=["Arbitrum", "Ethereum", "BSC", "Base"],
        official_docs="https://docs.radiant.capital",
        website="https://radiant.capital",
        twitter="https://x.com/RDNTCapital",
        components=_RADIANT_COMPONENTS,
        faq=_RADIANT_FAQ,
        org_structure=[
            {
                "name": "Radiant DAO",
                "role": "Governance",
                "description": "RDNT token (1.5B total supply) governs the protocol and incentivizes cross-chain liquidity. Day-to-day operations ran through a core-contributor multisig — the same signer set whose devices were compromised in the October 2024 exploit.",
            },
        ],
        tradfi_comparison=[
            {
                "product": "Cross-border secured lending / correspondent banking",
                "similarity": "Users post collateral on one chain and borrow on another via LayerZero messaging, similar to pledging collateral in one jurisdiction to draw credit in another.",
                "differences": "Permissionless and overcollateralized with automated liquidations; cross-chain messaging and multisig-signer risk replace correspondent-bank counterparty risk.",
            },
        ],
        competitors=[
            {
                "name": "Aave",
                "slug": "aave",
                "rank": 1,
                "positioning": "Broadest multichain money market.",
                "similarities": "Both are overcollateralized supply/borrow money markets deployed across multiple chains.",
                "differences": "Aave deploys the same protocol per chain with deep liquidity and brand trust; Radiant's differentiator was unified omnichain liquidity via LayerZero — now undermined by the 2024 exploit and wind-down.",
            },
            {
                "name": "Venus",
                "slug": "venus",
                "rank": 2,
                "positioning": "Chain-specific money-market leader (BNB Chain).",
                "similarities": "Pooled money market with incentive-driven growth.",
                "differences": "Venus is BNB-Chain-centric and operational; Radiant pursued cross-chain unified liquidity and is winding down.",
            },
            {
                "name": "Compound",
                "slug": "compound",
                "rank": 3,
                "positioning": "Battle-tested pooled lending.",
                "similarities": "Classic supply/borrow money-market model.",
                "differences": "Compound III uses single-base-asset markets on EVM chains; Radiant used LayerZero omnichain messaging.",
            },
        ],
        sources=[
            {"label": "Radiant Capital — Post-Mortem (Medium)", "url": "https://medium.com/@RadiantCapital/radiant-post-mortem-fecd6cd38081"},
            {"label": "CoinDesk — Radiant loses $50M to exploit (Oct 2024)", "url": "https://www.coindesk.com/tech/2024/10/16/radiant-capital-loses-50m-to-blockchain-exploit"},
            {"label": "The Block — Radiant winding down", "url": "https://www.theblock.co/post/403254/unable-to-recover-from-roughly-50-million-hack-radiant-capital-is-winding-down"},
            {"label": "Radiant Capital — Incident Update (Dec 2024)", "url": "https://medium.com/@RadiantCapital/radiant-capital-incident-update-e56d8c23829e"},
        ],
        timeline=[
            {
                "date": "2022-07",
                "title": "Radiant v1 on Arbitrum",
                "description": "Initial omnichain lending launch on Arbitrum.",
                "status": "executed",
            },
        ],
        events=[
            {
                "date": "2024-10-16",
                "title": "$50M omnichain exploit",
                "description": "Attackers compromised core contributors' devices and spoofed the Safe{Wallet} UI to sign malicious multisig transactions, draining ~$50M. Radiant's second exploit of 2024; later attributed to North Korean group UNC4736.",
                "link": "https://www.coindesk.com/tech/2024/10/16/radiant-capital-loses-50m-to-blockchain-exploit",
            },
            {
                "date": "2026-06",
                "title": "Radiant winds down",
                "description": "After ~18 months unable to recover from the October 2024 hack, Radiant Capital announced it is winding down the protocol.",
                "link": "https://www.theblock.co/post/403254/unable-to-recover-from-roughly-50-million-hack-radiant-capital-is-winding-down",
            },
        ],
        offchain_facts=[
            {
                "key": "omnichain",
                "value": "LayerZero messaging connects Radiant deployments — cross-chain borrow relies on bridge/oracle integrity.",
                "freshness": "static",
                "capturedAt": "2026-06-27",
                "source": {"label": "Radiant docs", "url": "https://docs.radiant.capital"},
            },
            {
                "key": "october2024Exploit",
                "value": "~$50M drained on Oct 16 2024 via compromised developer devices; attributed to North Korean group UNC4736.",
                "freshness": "static",
                "capturedAt": "2026-07-02",
                "source": {"label": "CoinDesk", "url": "https://www.coindesk.com/tech/2024/10/16/radiant-capital-loses-50m-to-blockchain-exploit"},
            },
            {
                "key": "status",
                "value": "Winding down (2026) — did not recover from the 2024 exploit.",
                "freshness": "static",
                "capturedAt": "2026-07-02",
                "source": {"label": "The Block", "url": "https://www.theblock.co/post/403254/unable-to-recover-from-roughly-50-million-hack-radiant-capital-is-winding-down"},
            },
        ],
        partnerships=[
            {
                "name": "LayerZero",
                "date": "2022",
                "description": "Cross-chain messaging layer enabling omnichain deposit/borrow.",
            },
        ],
        risks=[
            {
                "category": "Governance",
                "description": "Multisig signer compromise: in October 2024 attackers gained control of enough core-contributor signing devices to authorize malicious transactions/upgrades, draining ~$50M.",
            },
            {
                "category": "Smart Contract",
                "description": "Upgradeable contracts meant compromised signers could push a malicious implementation; the omnichain design widened the attack surface.",
            },
            {
                "category": "Counterparty",
                "description": "Omnichain operation depends on LayerZero messaging and bridge infrastructure across multiple deployments.",
            },
            {
                "category": "Systemic",
                "description": "The protocol is winding down (2026) after failing to recover from the exploit — elevated residual/withdrawal risk for any remaining positions.",
            },
        ],
        lending={
            "collateralAssets": ["ETH", "WBTC", "USDC", "USDT", "ARB"],
            "loanAssets": ["USDC", "USDT", "ETH", "WBTC"],
            "stablecoinExposure": ["USDC", "USDT"],
            "oracles": ["Chainlink"],
            "riskParameters": (
                "Aave-style LTV / liquidation thresholds per reserve, applied across the "
                "omnichain deployment."
            ),
            "auditHistory": "Audited; suffered a 2024 exploit — review post-incident hardening before relying.",
            "deployment": {
                "chains": ["Arbitrum", "Ethereum", "BSC", "Base"],
                "evmCompatible": "yes",
                "notes": "Omnichain via LayerZero.",
            },
        },
        credit_tag_metrics={
            "lending": {
                "collateralAssets": ["ETH", "WBTC", "USDC", "USDT", "ARB"],
                "oracles": ["Chainlink"],
            },
        },
    ),
    # ----------------------------- LEVERAGED YIELD -----------------------------
    "gearbox": _net(
        name="Gearbox",
        symbol="GEAR",
        tagline="Composable leverage via Credit Accounts.",
        logo_url="https://icons.llamao.fi/icons/protocols/gearbox",
        description=(
            "Gearbox is a generalized leverage protocol: users open Credit Accounts to "
            "borrow against collateral and deploy leveraged positions into integrated "
            "DeFi strategies (Curve, Convex, Lido, Yearn)."
        ),
        differentiator=(
            "Credit Accounts compose leverage across protocols rather than a single "
            "isolated farm — up to ~10x with a unified margin position."
        ),
        sub_sector="Leveraged Yield",
        tags=["Leveraged Yield"],
        chains=["Ethereum", "Arbitrum", "Optimism"],
        official_docs="https://docs.gearbox.fi",
        website="https://gearbox.fi",
        twitter="https://x.com/GearboxProtocol",
        components=[
            {
                'name': 'Credit Accounts',
                'description': "Isolated smart-contract accounts that hold a borrower's collateral and debt together and can interact with integrated DeFi protocols. Users effectively get a 'leveraged wallet' via account abstraction, borrowing pool liquidity to trade or farm with up to ~10x leverage while collateral and positions stay ring-fenced per account.",
            },
            {
                'name': 'Passive lending pools',
                'description': 'Single-asset liquidity pools where passive lenders deposit and earn APY funded by borrower interest and fees. Depositors receive Diesel Tokens (dTokens; ERC-4626 vault shares in V3) that accrue interest proportional to their share. V3 introduced quotas, collateral/exposure limits and risk-segmented pools.',
            },
            {
                'name': 'GEAR token',
                'description': 'Governance token of the Gearbox DAO with a 10 billion total supply. GEAR is used to vote on supported assets, integrations and parameters; V3 tokenomics add staking and gauge/quota voting that influences borrowing fees per asset and revenue distribution.',
            },
            {
                'name': 'Adapters & integrations',
                'description': "Whitelisted adapter contracts that let Credit Accounts route leveraged capital into external DeFi protocols (e.g. Uniswap, Curve, Convex, Balancer, Pendle, Lido/staking). Adapters are what make Gearbox leverage 'composable' — the same borrowed liquidity can be deployed across many integrated strategies.",
            },
        ],
        faq=[
            {
                'question': 'How does Gearbox work?',
                'answer': 'Gearbox has two sides. Passive lenders deposit a single asset into a lending pool and earn APY. Borrowers open a Credit Account — an isolated smart contract that combines their own collateral with borrowed pool liquidity — and use that leverage (up to ~10x) across integrated DeFi protocols like Curve, Convex or Pendle through whitelisted adapters.',
                'pinned': True,
            },
            {
                'question': 'What is a Credit Account?',
                'answer': "A Credit Account is an isolated smart contract that stores both a borrower's collateral and their debt. It can only interact with protocols and assets whitelisted by governance, and its health factor is monitored so it can be liquidated if the position becomes undercollateralized. In V3 it behaves like a personal leveraged wallet via account abstraction.",
                'pinned': False,
            },
            {
                'question': 'How do lenders earn yield and what are the risks?',
                'answer': 'Lenders supply one asset to a pool and receive Diesel Tokens (dTokens) that accrue interest paid by borrowers. Yield depends on pool utilization. Risks include smart-contract failure, bad debt if liquidations fail to cover borrower losses in volatile markets, and the composability risk of the external protocols borrowers deploy into.',
                'pinned': False,
            },
            {
                'question': 'What is the GEAR token used for?',
                'answer': 'GEAR is the governance token of the Gearbox DAO (10 billion total supply). Holders vote on which assets and protocols are supported and on protocol parameters. V3 added staking plus gauge/quota voting that influences per-asset borrowing fees and revenue distribution.',
                'pinned': False,
            },
            {
                'question': 'What chains does Gearbox run on?',
                'answer': 'Gearbox launched on Ethereum mainnet and has pursued multi-chain expansion, deploying on Ethereum L2s and emerging EVM chains (for example Lisk in July 2025 and permissionless markets on Monad). Ethereum remains the primary deployment.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Gearbox DAO',
                'role': 'Governance / protocol owner',
                'description': 'Community DAO that governs Gearbox via GEAR token voting and a treasury multisig; the DAO Treasury Multisig originally held ~51% of GEAR supply and controls supported-asset and parameter decisions.',
            },
            {
                'name': 'Gearbox core contributors',
                'role': 'Core development team',
                'description': 'The founding and core contributor team that builds the protocol (V1 through V3) and ships proposals for DAO ratification. Gearbox transitioned to a DAO at its December 2021 token generation event.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Prime brokerage / margin account',
                'similarity': 'Like a prime broker or margin account, Gearbox extends borrowed capital against posted collateral so a user can take leveraged positions far larger than their own equity, with the position monitored and force-liquidated if collateral falls below maintenance requirements.',
                'differences': "Gearbox is non-custodial and permissionless: leverage is enforced by isolated on-chain Credit Accounts and whitelisted adapters rather than a broker's balance sheet, credit checks or centralized risk desk. Borrowed funds can only be deployed into governance-approved protocols and cannot be freely withdrawn.",
            },
        ],
        events=[
            {
                'date': '2021-12-15',
                'title': 'GEAR token generation event and DAO formation',
                'description': "Gearbox's token generation event, marking the formation of the Gearbox DAO and the start of GEAR as the governance token.",
                'link': 'https://icodrops.com/gearbox-protocol/',
            },
            {
                'date': '2022-08-17',
                'title': 'DAO funding round (~$4.15M)',
                'description': 'Gearbox raised roughly $4.15M in a DAO round to support the move to V2, with investors including Placeholder, Zee Prime, LedgerPrime, Polymorphic and GCR.',
                'link': 'https://blockworks.co/news/gearbox-shifts-into-v2-with-4m-funding-boost',
            },
            {
                'date': '2023-04-24',
                'title': 'Immunefi bug bounty program launched',
                'description': 'Gearbox opened a public bug bounty program on Immunefi covering its smart contracts, with rewards paid in USDC on Ethereum.',
                'link': 'https://immunefi.com/bug-bounty/gearbox/',
            },
            {
                'date': '2023-10-31',
                'title': "Gearbox V3 announced: 'The Onchain Credit Layer'",
                'description': 'Gearbox announced V3, introducing collateral/exposure limits, risk-segmented pools, ERC-4626 Diesel Tokens, partial withdrawals, Gearbots automation and quotas/gauges, with alpha in mid-November 2023 and full launch in January 2024.',
                'link': 'https://blog.gearbox.finance/gearbox-protocol-v3-the-onchain-credit-layer/',
            },
            {
                'date': '2025-07-01',
                'title': 'Deployment on Lisk (L2 expansion)',
                'description': 'Gearbox deployed on Lisk, an Ethereum L2, as part of its cross-chain expansion toward regions with high stablecoin adoption. Exact day approximate; month sourced.',
                'link': 'https://coinmarketcap.com/cmc-ai/gearbox-protocol/latest-updates/',
            },
        ],
        timeline=[
            {
                'date': '2021-06-08',
                'title': 'Seed / SAFT round (~$2.3M)',
                'description': 'Gearbox raised ~$2.3M in a seed/SAFT round from investors including Variant, 1kx, eGirl Capital, Cobie and others.',
                'link': 'https://icodrops.com/gearbox-protocol/',
                'status': 'executed',
            },
            {
                'date': '2021-12-15',
                'title': 'V1 mainnet & DAO launch',
                'description': 'Gearbox V1 and the Gearbox DAO went live around the December 2021 token generation event, offering composable leverage on Ethereum.',
                'link': 'https://docs.gearbox.finance/',
                'status': 'executed',
            },
            {
                'date': '2022-08-17',
                'title': 'V2 released',
                'description': 'Gearbox moved to V2, expanding integrations and improving the Credit Account architecture, funded in part by the ~$4.15M DAO round.',
                'link': 'https://medium.com/gearbox-protocol/product-evolution-v2-gearbox-protocol-from-1-to-2-going-further-dcedf3b5d959',
                'status': 'executed',
            },
            {
                'date': '2024-01-01',
                'title': 'V3 full launch: Onchain Credit Layer',
                'description': 'Following the October 2023 announcement and mid-November alpha, Gearbox V3 fully launched in January 2024 with quotas, risk-segmented pools, ERC-4626 dTokens and Gearbots. Day approximate; month sourced.',
                'link': 'https://blog.gearbox.finance/gearbox-protocol-v3-the-onchain-credit-layer/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Total raised across 3 rounds',
                'value': '~$8.04M (seed ~$2.3M 2021, DAO round ~$4.15M + ~$1.585M 2022)',
                'freshness': 'static',
                'source': {
                    'label': 'ICO Drops — Gearbox Protocol',
                    'url': 'https://icodrops.com/gearbox-protocol/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'GEAR total supply',
                'value': '10,000,000,000 GEAR',
                'freshness': 'static',
                'source': {
                    'label': 'Gearbox docs — Supply Information',
                    'url': 'https://docs.gearbox.finance/gear-token/supply-information',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Security audits',
                'value': 'Multiple audits by ChainSecurity, Consensys Diligence, Sigma Prime, MixBytes, PeckShield, ABDK, Decurity and Nethermind (2021–2025); reports public on GitHub',
                'freshness': 'static',
                'source': {
                    'label': 'Gearbox security repo',
                    'url': 'https://github.com/Gearbox-protocol/security',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Collateral',
                'description': 'Borrowers run leveraged positions (up to ~10x) inside Credit Accounts. A sharp adverse move in collateral value can push a Credit Account below its liquidation threshold; if liquidations lag or fail in volatile/illiquid conditions, the lending pool can accrue bad debt that impairs passive lenders.',
            },
            {
                'category': 'Systemic',
                'description': 'Composability risk: Credit Accounts deploy borrowed liquidity into external protocols (Curve, Convex, Pendle, Lido, etc.) via adapters. A failure, exploit or depeg in any integrated protocol propagates into Gearbox positions and can cascade into the shared lending pools.',
            },
            {
                'category': 'Oracle',
                'description': 'Credit Account health factors and liquidations depend on price oracles for collateral and integrated assets. Oracle latency, manipulation or misconfiguration on medium/long-tail or L2 assets (which V3 explicitly supports) could allow undercollateralized borrowing or unfair liquidations.',
            },
            {
                'category': 'Smart Contract',
                'description': 'The protocol relies on complex Credit Manager, pool and adapter contracts across V1/V2/V3 and multiple chains. Despite extensive audits, undiscovered bugs in adapters or the account-abstraction layer could lead to loss of pool or user funds.',
            },
            {
                'category': 'Governance',
                'description': 'Which assets, protocols and risk parameters (collateral limits, quotas, borrow fees) are allowed is set by GEAR-based DAO governance and executed via a treasury multisig that originally held ~51% of supply. Concentrated voting power or a malicious/erroneous parameter change could raise systemic risk for lenders.',
            },
        ],
        competitors=[
            {
                'name': 'Aave',
                'slug': 'aave',
                'rank': 1,
                'positioning': 'Largest DeFi money market; the dominant overcollateralized lending venue Gearbox competes with for lender liquidity.',
                'similarities': 'Both let lenders deposit assets to earn yield and let borrowers draw against collateral, secured by liquidation.',
                'differences': "Aave issues plain overcollateralized loans to a user's own wallet; Gearbox routes borrowed capital into isolated Credit Accounts for composable leverage that can be deployed across integrated DeFi rather than freely withdrawn.",
            },
            {
                'name': 'Morpho',
                'slug': 'morpho',
                'rank': 2,
                'positioning': "Modular, permissionless lending stack with isolated markets; competes for the 'credit layer' narrative and lender deposits.",
                'similarities': 'Both are modular lending primitives emphasizing isolated risk markets and permissionless deployment of new markets/assets.',
                'differences': 'Morpho provides isolated lending markets and vaults; Gearbox specializes in leverage — combining collateral and debt in Credit Accounts that actively farm/trade across whitelisted protocols.',
            },
            {
                'name': 'Extra Finance',
                'slug': 'extra-finance',
                'rank': 3,
                'positioning': 'Leveraged yield-farming and lending protocol; a direct peer for composable leverage users.',
                'similarities': 'Both target users who want leveraged exposure to DeFi yield strategies backed by passive lender liquidity.',
                'differences': "Extra Finance focuses on leveraged farming of specific LP strategies; Gearbox's Credit Accounts are a more general leverage primitive spanning many integrated protocols and use cases.",
            },
            {
                'name': 'Fluid',
                'slug': 'fluid',
                'rank': 4,
                'positioning': 'Capital-efficient lending/borrowing protocol competing for lender liquidity and efficient leverage.',
                'similarities': 'Both aim for capital-efficient borrowing against collateral with strong liquidation mechanics.',
                'differences': 'Fluid emphasizes a unified, capital-efficient lending/vault layer; Gearbox emphasizes composable, adapter-driven leverage inside isolated Credit Accounts.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-06-08',
                'round': 'Seed / SAFT',
                'amountUsd': 2300000,
                'amountLabel': '~$2.3M',
                'investors': [
                    'Variant',
                    '1kx',
                    'eGirl Capital',
                    'Cobie',
                    'Focus Labs',
                ],
                'link': 'https://icodrops.com/gearbox-protocol/',
            },
            {
                'date': '2022-08-17',
                'round': 'DAO Round Part 1',
                'amountUsd': 4150000,
                'amountLabel': '~$4.15M',
                'investors': [
                    'Placeholder',
                    'Zee Prime',
                    'LedgerPrime',
                    'Polymorphic',
                    'GCR',
                    'Manifold Trading',
                ],
                'link': 'https://blockworks.co/news/gearbox-shifts-into-v2-with-4m-funding-boost',
            },
            {
                'date': '2022-09-22',
                'round': 'DAO Round Part 2',
                'amountUsd': 1585000,
                'amountLabel': '~$1.585M',
                'investors': [],
                'link': 'https://icodrops.com/gearbox-protocol/',
            },
        ],
        audits=[
            {
                'firm': 'ChainSecurity',
                'date': '2021-12-01',
                'url': 'https://github.com/Gearbox-protocol/security/blob/main/audits/2021%20Dec%20-%20ChainSecurity_Gearbox_audit.pdf',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2022-08-01',
                'url': 'https://github.com/Gearbox-protocol/security/blob/main/audits/2022%20Aug%20-%20SigmaPrime_Gearbox_Smart_Contract_Security_Assessment_Report_v2.pdf',
            },
            {
                'firm': 'ChainSecurity',
                'date': '2022-10-01',
                'url': 'https://github.com/Gearbox-protocol/security/blob/main/audits/2022%20Oct%20-%20ChainSecurity%20report.pdf',
            },
            {
                'firm': 'ChainSecurity (V3 migration)',
                'date': '2023-10-01',
                'url': 'https://github.com/Gearbox-protocol/security/tree/main/audits',
            },
            {
                'firm': 'ABDK (Core V3)',
                'date': '2023-12-01',
                'url': 'https://github.com/Gearbox-protocol/security/tree/main/audits',
            },
        ],
        sources=[
            {
                'label': 'Gearbox docs — How it works',
                'url': 'https://docs.gearbox.finance/',
            },
            {
                'label': 'Gearbox docs — GEAR supply information',
                'url': 'https://docs.gearbox.finance/gear-token/supply-information',
            },
            {
                'label': 'Gearbox blog — V3: The Onchain Credit Layer',
                'url': 'https://blog.gearbox.finance/gearbox-protocol-v3-the-onchain-credit-layer/',
            },
            {
                'label': 'Gearbox security repo (audits & bug bounty)',
                'url': 'https://github.com/Gearbox-protocol/security',
            },
            {
                'label': 'Blockworks — Gearbox shifts into V2 with $4M funding',
                'url': 'https://blockworks.co/news/gearbox-shifts-into-v2-with-4m-funding-boost',
            },
            {
                'label': 'ICO Drops — Gearbox Protocol funding rounds & tokenomics',
                'url': 'https://icodrops.com/gearbox-protocol/',
            },
            {
                'label': 'Immunefi — Gearbox bug bounty',
                'url': 'https://immunefi.com/bug-bounty/gearbox/',
            },
        ],
        github='https://github.com/Gearbox-protocol',
        credit_tag_metrics={
            "leveragedYield": {
                "maxLeverageX": 10,
                "borrowModel": "Credit Accounts (composable cross-protocol leverage)",
                "supportedStrategies": ["Curve", "Convex", "Lido", "Yearn", "Balancer"],
                "integratedProtocols": ["Curve", "Convex", "Lido", "Yearn"],
            },
        },
    ),
    "stella": _net(
        name="Stella",
        symbol="ALPHA",
        tagline="Pay-as-you-earn leveraged strategies (ex-Alpha Homora).",
        logo_url="https://icons.llamao.fi/icons/protocols/stella",
        description=(
            "Stella (formerly Alpha Homora) offers leveraged yield strategies with a "
            "pay-as-you-earn borrowing model: borrowers pay 0% interest and instead "
            "share a portion of realized profit with lenders."
        ),
        differentiator=(
            "0% borrow APR — lenders are compensated from strategy profit share rather "
            "than interest, aligning incentives between borrowers and lenders."
        ),
        sub_sector="Leveraged Yield",
        tags=["Leveraged Yield"],
        chains=["Arbitrum", "Optimism", "Manta"],
        official_docs="https://docs.stellaxyz.io",
        website="https://stellaxyz.io",
        twitter="https://x.com/Stella_xyz_",
        components=[
            {
                'name': 'Stella Strategy',
                'description': 'The leverage side of the protocol. Users ("leveragoors") open leveraged positions on supported DeFi strategies, initially Uniswap V3 concentrated-liquidity pools (e.g. ETH/USDC.e, ETH/USDT, ETH/ARB, WBTC/ETH), borrowing liquidity from Stella Lend at 0% borrowing interest to size up their positions and yields.',
            },
            {
                'name': 'Stella Lend',
                'description': "The lending side. Capital providers deposit assets into lending pools and earn 'real yield' generated by leveragoors' strategy activity rather than a fixed interest curve. Because returns derive from strategy profits, there is no traditional APY cap.",
            },
            {
                'name': 'Pay-As-You-Earn (PAYE) fee model',
                'description': "Stella's core mechanism replacing borrowing-interest accrual. Leveragoors pay 0% cost to borrow for the whole leverage duration; only when a position closes with positive net yield is a portion of that profit deducted as the fee to lenders ('no gain, no pay'), aligning incentives between borrowers and lenders.",
            },
        ],
        faq=[
            {
                'question': 'How does Stella let you borrow at 0% cost?',
                'answer': 'Stella replaces the usual accruing borrow-interest model with a Pay-As-You-Earn (PAYE) model. Leveragoors pay nothing to borrow while a position is open; a share of the net yield is only taken as a fee when the position is closed profitably. If there is no gain, there is no fee.',
                'pinned': True,
            },
            {
                'question': 'What can you actually do on Stella?',
                'answer': 'Two things: use Stella Strategy to open leveraged positions on supported DeFi strategies (initially Uniswap V3 liquidity pools) to amplify yield, or use Stella Lend to deposit assets and earn yield generated by those leveraged strategies.',
                'pinned': False,
            },
            {
                'question': 'Which chains is Stella on?',
                'answer': 'Stella first launched on Arbitrum in June 2023 and has been described across Ethereum, Arbitrum, Avalanche and BNB Chain. Its predecessor Alpha Homora operated on Ethereum and BNB Chain.',
                'pinned': False,
            },
            {
                'question': 'Is Stella related to Alpha Homora / Alpha Finance Lab?',
                'answer': 'Yes. Stella is built by the same core team, previously known as Alpha Finance Lab and then Alpha Venture DAO, which pioneered leveraged DeFi with Alpha Homora from 2020. The project rebranded to Stella in May 2023 while keeping the same ALPHA token.',
                'pinned': False,
            },
            {
                'question': 'What token does Stella use?',
                'answer': 'The protocol uses the ALPHA token, unchanged through the Alpha Finance Lab -> Alpha Venture DAO -> Stella rebrands. ALPHA was first sold via Binance Launchpad in October 2020.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Alpha Venture DAO (formerly Alpha Finance Lab)',
                'role': 'Core development team / builder',
                'description': 'The team behind Stella. Founded in 2020 as Alpha Finance Lab, later Alpha Venture DAO, it pioneered leveraged DeFi with Alpha Homora before rebranding its leverage product to Stella in 2023. Co-founded by Tascha Punyaneramitdee.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Prime brokerage / margin lending',
                'similarity': 'Stella intermediates between capital providers (Stella Lend) and traders who want leverage (Stella Strategy), much as a prime broker lends against and finances leveraged positions for clients.',
                'differences': "There is no fixed financing/borrow rate; instead of accruing margin interest, Stella charges nothing up front and takes a share of realized profit only (Pay-As-You-Earn). It is non-custodial, on-chain, and liquidations are automated by smart contracts rather than a broker's risk desk.",
            },
        ],
        events=[
            {
                'date': '2020-10-09',
                'title': 'ALPHA token sale on Binance Launchpad',
                'description': "Alpha Finance Lab sold 100M ALPHA (10% of supply) at $0.02 to raise about $2M via Binance's first-ever double Launchpad/Launchpool listing.",
                'link': 'https://icoanalytics.org/projects/alpha-venture-dao/',
            },
            {
                'date': '2021-02-13',
                'title': 'Alpha Homora / Iron Bank exploit (~$37M)',
                'description': "An attacker drained roughly $37M from Alpha Homora v2 by abusing Cream Finance's Iron Bank via a faked 'spell' contract and repeated flash-loan-driven lend/borrow cycles. The resulting ~$32M bad debt was later settled with Iron Bank using 20% of Alpha Homora protocol fees plus 50M ALPHA locked as collateral.",
                'link': 'https://cointelegraph.com/news/alpha-homora-loses-37-million-following-iron-bank-exploit',
            },
            {
                'date': '2023-05-24',
                'title': 'Rebrand from Alpha Venture DAO to Stella',
                'description': 'The team renamed its leveraged-strategies product to Stella, with a new name and logo but the same ALPHA token, doubling down on on-chain leveraged products.',
                'link': 'https://phemex.com/announcements/phemex-supports-alpha-venture-dao-rebranding-to-stella',
            },
            {
                'date': '2023-06-21',
                'title': 'Stella launches on Arbitrum',
                'description': 'Stella went live on Arbitrum offering leveraged Uniswap V3 liquidity strategies (ETH/USDC.e, ETH/USDT, ETH/ARB, ARB/USDC.e, WBTC/ETH and others) at 0% cost to borrow.',
                'link': 'https://medium.com/@stellaxyz_/stella-is-now-live-on-arbitrum-heres-everything-you-need-to-know-55bffa370fe2',
            },
        ],
        timeline=[
            {
                'date': '2020-10-09',
                'title': 'ALPHA token generation / Binance Launchpad',
                'description': 'Token launch as Alpha Finance Lab.',
                'link': 'https://icoanalytics.org/projects/alpha-venture-dao/',
                'status': 'executed',
            },
            {
                'date': '2023-05-24',
                'title': 'Rebrand to Stella',
                'description': 'Alpha Venture DAO renamed its leverage product to Stella, same ALPHA token.',
                'link': 'https://phemex.com/announcements/phemex-supports-alpha-venture-dao-rebranding-to-stella',
                'status': 'executed',
            },
            {
                'date': '2023-06-21',
                'title': 'Arbitrum mainnet launch (leveraged Uniswap V3)',
                'description': 'First Stella deployment, PAYE / 0%-cost-to-borrow leverage on Uniswap V3 pools.',
                'link': 'https://medium.com/@stellaxyz_/stella-is-now-live-on-arbitrum-heres-everything-you-need-to-know-55bffa370fe2',
                'status': 'executed',
            },
            {
                'date': '2023-07-01',
                'title': 'Ethereum expansion (roadmap)',
                'description': 'Planned Q3 2023 launch on Ethereum with additional strategy integrations (month approximated; exact date not given).',
                'link': 'https://medium.com/@stellaxyz_/stella-is-now-live-on-arbitrum-heres-everything-you-need-to-know-55bffa370fe2',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Audited by',
                'value': 'Trust Security (2023-05-29) and PeckShield (2023-06-03); reports public on GitHub',
                'freshness': 'static',
                'source': {
                    'label': 'Stella audits GitHub repo',
                    'url': 'https://github.com/stellaxyz/audits',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Binance Launchpad raise (Oct 2020)',
                'value': '~$2M for 100M ALPHA (10% of supply) at $0.02/ALPHA',
                'freshness': 'static',
                'source': {
                    'label': 'ICO Analytics - Alpha Venture DAO',
                    'url': 'https://icoanalytics.org/projects/alpha-venture-dao/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Alpha Homora / Iron Bank exploit',
                'value': '~$37M lost on 2021-02-13; ~$32M bad debt to Iron Bank',
                'freshness': 'static',
                'source': {
                    'label': 'Cointelegraph',
                    'url': 'https://cointelegraph.com/news/alpha-homora-loses-37-million-following-iron-bank-exploit',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Stella's leverage relies on 'spell'-style strategy contracts routing capital between Stella Lend and external protocols (e.g. Uniswap V3). The predecessor Alpha Homora suffered a ~$37M exploit in Feb 2021 where a faked spell contract was treated as legitimate, demonstrating the concrete danger of this composable-strategy design.",
            },
            {
                'category': 'Systemic',
                'description': "Leverage layered on top of external DeFi protocols creates protocol-to-protocol contagion. The 2021 Alpha Homora incident abused Cream Finance's Iron Bank and left ~$32M of cross-protocol bad debt, showing how a failure in one integrated protocol can cascade into Stella's positions and lenders.",
            },
            {
                'category': 'Collateral',
                'description': "Leveraged positions (initially Uniswap V3 LP positions) are volatile and subject to impermanent loss; adverse price moves can push a leveragoor's position below the required collateralization and trigger liquidation, with lenders exposed to shortfall if liquidation is not fast enough.",
            },
            {
                'category': 'Oracle',
                'description': 'Valuing leveraged LP positions and triggering liquidations depends on accurate on-chain price feeds. Manipulated or lagging oracle prices could misvalue collateral or delay liquidations, a recurring attack surface for leverage/LP protocols.',
            },
            {
                'category': 'Governance',
                'description': 'The protocol and ALPHA token are steered by the Alpha Venture DAO / Stella core team, which sets supported strategies and risk parameters. Concentrated control over which strategies are whitelisted and how the PAYE fee is set concentrates decision-making risk.',
            },
        ],
        competitors=[
            {
                'name': 'Gearbox Protocol',
                'slug': 'gearbox',
                'rank': 1,
                'positioning': "Composable leverage / undercollateralized 'credit account' leverage in DeFi",
                'similarities': 'Both let users take leverage on external DeFi strategies by borrowing from a pooled lender, separating a lending side from a leverage/strategy side.',
                'differences': 'Gearbox charges continuous borrow interest on its credit accounts across many integrations, whereas Stella charges 0% up front and only takes a cut of realized profit via Pay-As-You-Earn.',
            },
            {
                'name': 'Extra Finance',
                'slug': 'extra-finance',
                'rank': 2,
                'positioning': 'Leveraged yield-farming protocol (notably on Optimism/Base) for AMM LP strategies',
                'similarities': 'Directly comparable product: leveraged LP/yield-farming on concentrated-liquidity DEX pools funded by a lending pool.',
                'differences': "Extra Finance uses a conventional borrow-interest model on borrowed funds; Stella's differentiator is the 0%-cost PAYE fee structure.",
            },
            {
                'name': 'Alpaca Finance',
                'rank': 3,
                'positioning': 'Leveraged yield-farming lending protocol on BNB Chain',
                'similarities': 'Pool-funded leveraged yield farming with a lender/leverager split, targeting AMM LP strategies.',
                'differences': 'Alpaca applies traditional interest-rate borrowing; Stella replaces this with the no-gain-no-pay PAYE model.',
            },
        ],
        partnerships=[
            {
                'name': 'Strategic investors: Spartan Group, Multicoin Capital, DeFiance Capital',
                'date': '2020-10-06',
                'amountLabel': None,
                'description': 'Alpha Finance Lab announced The Spartan Group, Multicoin Capital and DeFiance Capital as strategic investors/advisors supporting its cross-chain DeFi ecosystem. Amounts were not disclosed in the announcement.',
            },
        ],
        investment_rounds=[
            {
                'date': '2020-10-09',
                'round': 'Binance Launchpad public sale (IEO)',
                'amountUsd': 2000000,
                'amountLabel': '~$2M',
                'investors': [
                    'Binance Launchpad (public)',
                ],
                'link': 'https://icoanalytics.org/projects/alpha-venture-dao/',
            },
        ],
        audits=[
            {
                'firm': 'Trust Security',
                'date': '2023-05-29',
                'url': 'https://github.com/stellaxyz/audits/blob/main/reports/20230529_Trust_Security.pdf',
            },
            {
                'firm': 'PeckShield',
                'date': '2023-06-03',
                'url': 'https://github.com/stellaxyz/audits/blob/main/reports/20230603_PeckShield.pdf',
            },
        ],
        sources=[
            {
                'label': 'Stella - The Leveraged Strategies Protocol With 0% Cost to Borrow (Medium)',
                'url': 'https://medium.com/@stellaxyz_/stella-the-leveraged-strategies-protocol-with-0-cost-to-borrow-bad4f89d5cd3',
            },
            {
                'label': 'Stella is Now LIVE on Arbitrum (Medium)',
                'url': 'https://medium.com/@stellaxyz_/stella-is-now-live-on-arbitrum-heres-everything-you-need-to-know-55bffa370fe2',
            },
            {
                'label': 'Stella audit reports (GitHub)',
                'url': 'https://github.com/stellaxyz/audits',
            },
            {
                'label': 'Cointelegraph - Alpha Homora loses $37M following Iron Bank exploit',
                'url': 'https://cointelegraph.com/news/alpha-homora-loses-37-million-following-iron-bank-exploit',
            },
            {
                'label': 'DL News - DeFi partners clash over $32m Iron Bank bad debt',
                'url': 'https://www.dlnews.com/articles/defi/defi-partners-clash-over-32m-bad-debt-iron-bank-alpha-homora/',
            },
            {
                'label': 'Announcing Alpha Finance Lab Investors (Alpha blog)',
                'url': 'https://blog.alphaventuredao.io/investors/',
            },
            {
                'label': 'ICO Analytics - Alpha Venture DAO token sale',
                'url': 'https://icoanalytics.org/projects/alpha-venture-dao/',
            },
        ],
        github='https://github.com/stellaxyz',
        credit_tag_metrics={
            "leveragedYield": {
                "maxLeverageX": 5,
                "borrowModel": "Pay-as-you-earn (0% borrow APR; lender profit share)",
                "supportedStrategies": ["Curve", "Velodrome", "Pendle Finance"],
                "integratedProtocols": ["Curve", "Velodrome"],
            },
        },
    ),
    "extra-finance": _net(
        name="Extra Finance",
        symbol="EXTRA",
        tagline="Lending + leveraged LP farming on the Superchain.",
        logo_url="https://icons.llamao.fi/icons/protocols/extra-finance-leverage-farming",
        description=(
            "Extra Finance combines a lending market with leveraged LP farming, letting "
            "users lever up liquidity positions on Optimism and Base DEXes."
        ),
        differentiator=(
            "Tightly integrated lend + leverage-farm design focused on the Optimism/Base "
            "(Superchain) DEX ecosystem, with up to ~7x LP leverage."
        ),
        sub_sector="Leveraged Yield",
        tags=["Leveraged Yield"],
        chains=["Optimism", "Base"],
        official_docs="https://docs.extrafi.io",
        website="https://extrafi.io",
        twitter="https://x.com/extrafi_io",
        components=[
            {
                'name': 'Lending Pools',
                'description': 'Single-asset lending markets where users deposit assets (e.g. USDC, ETH, and other supported tokens) to earn interest. Utilization-based rates are set by borrowing demand, and the deposited liquidity is what leveraged-farming borrowers draw on to open positions.',
            },
            {
                'name': 'Leveraged Yield Farming (LYF)',
                'description': 'The core product: users borrow from the lending pools to open amplified positions on DEX liquidity pools, running reinvesting, market-neutral, or directional strategies. Leverage is tiered up to 7x; higher leverage tiers require staking EXTRA. Positions carry liquidation risk if the underlying collateral value falls below the debt threshold.',
            },
            {
                'name': 'XLend',
                'description': 'A smart-lending product built on a redesigned codebase, adding smart accounts, sub-accounts (multi-account) for portfolio segregation, and composable lending/borrowing strategies. XLend Beta launched in January 2025 across Optimism and Base.',
            },
            {
                'name': 'EXTRA / veEXTRA Token',
                'description': 'EXTRA is the ERC-20 utility token (hard cap 1,000,000,000, mint authority destroyed) used for liquidity-provider emissions and unlocking higher leverage tiers. Staking EXTRA yields veEXTRA, the governance token, which confers voting rights, boosted farming rewards, protocol fee sharing, and reduced borrowing costs.',
            },
        ],
        faq=[
            {
                'question': 'What is Extra Finance and how does it work?',
                'answer': 'Extra Finance is a lending and leveraged-yield-farming protocol on Optimism and Base. Lenders deposit single assets into pools to earn interest; farmers borrow that liquidity to open leveraged positions on DEX pools, amplifying yield (and risk). It also operates XLend, a smart-account-based lending product.',
                'pinned': True,
            },
            {
                'question': 'How much leverage can I use?',
                'answer': 'Leveraged farming positions can go up to 7x. Access to the higher tiers is gated by staking EXTRA; users who stake enough EXTRA can unlock up to 7x, while others are limited to lower multiples.',
                'pinned': False,
            },
            {
                'question': 'Which chains does Extra Finance support?',
                'answer': 'Extra Finance operates on Optimism (mainnet since 9 May 2023) and Base. XLend runs on both networks.',
                'pinned': False,
            },
            {
                'question': 'What is the EXTRA token used for?',
                'answer': 'EXTRA is the utility token (fixed 1B supply) driving liquidity-provider emissions and unlocking higher leverage. Staking it produces veEXTRA, which grants governance voting, boosted rewards, fee sharing, and reduced borrowing costs.',
                'pinned': False,
            },
            {
                'question': 'What are the main risks?',
                'answer': 'Leveraged positions can be liquidated if collateral value drops relative to debt. Users are also exposed to impermanent loss on the farmed DEX pools, smart-contract risk, oracle/price-feed risk during liquidations, and interest-rate volatility on borrowed funds.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Extra Finance team (ExtraFi)',
                'role': 'Core protocol development',
                'description': 'The pseudonymous core team that builds and maintains the protocol; publishes smart contracts under the ExtraFi GitHub organization. No public founder identities are disclosed in official materials. A 10% team token allocation (100M EXTRA) vests over a 6-month cliff plus 30 months.',
            },
            {
                'name': 'veEXTRA governance / community',
                'role': 'On-chain governance',
                'description': 'veEXTRA holders vote on protocol proposals such as new pool listings and emission adjustments. Governance approved multiple pool-listing and emission proposals in the January 2025 review period.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Prime brokerage / margin lending',
                'similarity': 'Like a prime broker extending margin against collateral, Extra Finance lets users borrow to amplify a position (a leveraged LP stake) beyond their own capital, with the broker (lending pool) able to force-liquidate if collateral falls short.',
                'differences': "Everything is non-custodial and executed by smart contracts; there is no credit check or counterparty relationship, collateral is on-chain DEX LP positions rather than securities, and liquidations are automated by code and oracles rather than a broker's risk desk.",
            },
            {
                'product': 'Money-market fund (for the lending side)',
                'similarity': 'Depositors into a lending pool earn a variable yield on a single asset, analogous to parking cash in a money-market fund for interest.',
                'differences': 'Returns come from on-chain borrower demand and token emissions rather than short-term debt instruments; deposits are not insured and are exposed to smart-contract and borrower-default (bad-debt) risk.',
            },
        ],
        events=[
            {
                'date': '2023-03-23',
                'title': 'Testnet launch on Optimism',
                'description': 'Extra Finance opened its testnet on Optimism ahead of mainnet.',
                'link': 'https://nansen.ai/post/what-is-extra-finance',
            },
            {
                'date': '2023-05-09',
                'title': 'Mainnet beta launch on Optimism',
                'description': "Extra Finance's beta went live on Optimism mainnet; TVL surpassed $2M within a month of launch.",
                'link': 'https://medium.com/@ExtraFinance/extra-finance-monthly-review-may-2023-965fc608e23',
            },
            {
                'date': '2024-12-01',
                'title': 'Sherlock audit report finalized',
                'description': 'Sherlock published its final audit report for Extra Finance, complementing earlier PeckShield and BlockSec reviews.',
                'link': 'https://github.com/sherlock-protocol/sherlock-reports/blob/main/audits/2024.12.01%20-%20Final%20-%20Extra%20Finance%20Audit%20Report.pdf',
            },
            {
                'date': '2025-01-01',
                'title': 'XLend Beta launch',
                'description': 'Extra Finance released the XLend Beta (smart-account lending) in January 2025 across Optimism and Base. Month-end protocol TVL was reported at $116.57M ($15.64M Optimism, $100.93M Base). Date set to the 1st as only the month is known.',
                'link': 'https://medium.com/@ExtraFinance/extra-finance-monthly-review-january-2025-4338fc3079a0',
            },
        ],
        timeline=[
            {
                'date': '2023-03-23',
                'title': 'Optimism testnet',
                'description': 'Public testnet opens on Optimism.',
                'link': 'https://nansen.ai/post/what-is-extra-finance',
                'status': 'executed',
            },
            {
                'date': '2023-05-09',
                'title': 'Optimism mainnet (v1)',
                'description': 'Leveraged-yield-farming and lending v1 goes live on Optimism.',
                'link': 'https://medium.com/@ExtraFinance/extra-finance-monthly-review-may-2023-965fc608e23',
                'status': 'executed',
            },
            {
                'date': '2024-01-01',
                'title': 'V2 and Base expansion (roadmap)',
                'description': 'V2 with social/copy-farming features targeted for Q1 2024; protocol expanded to the Base network. Date set to the 1st as only the quarter/period is known.',
                'link': 'https://docs.extrafi.io/extra_finance/resources/roadmap',
                'status': 'executed',
            },
            {
                'date': '2025-01-01',
                'title': 'XLend Beta',
                'description': 'Smart-account lending product (XLend) released in beta on Optimism and Base. Date set to the 1st as only the month is known.',
                'link': 'https://docs.extrafi.io/extrafi-xlend',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Audited by',
                'value': 'PeckShield, BlockSec, and Sherlock (final report dated 2024-12-01)',
                'freshness': 'static',
                'source': {
                    'label': 'Extra Finance Audits & Security docs',
                    'url': 'https://docs.extrafi.io/extra_finance/audits-and-security',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'EXTRA total supply',
                'value': '1,000,000,000 (hard cap; mint authority destroyed) — 60% community, 26% ecosystem, 10% team, 3% airdrop, 1% initial liquidity',
                'freshness': 'static',
                'source': {
                    'label': 'Extra Finance Allocation & Emission docs',
                    'url': 'https://docs.extrafi.io/extra_finance/tokenomics/tokenomics-v1/allocation-and-emission',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Bug bounty',
                'value': 'Up to $100,000 (USDC on Optimism) via Immunefi, with Optimism Foundation contributing 52,500 OP in matching rewards',
                'freshness': 'static',
                'source': {
                    'label': 'Immunefi Extra Finance bug bounty',
                    'url': 'https://immunefi.com/bug-bounty/extrafinance/information/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Collateral',
                'description': 'Leveraged farming positions are collateralized by DEX LP tokens whose value can fall below the debt threshold. If collateral drops, positions are subject to forced liquidation to protect lenders, and higher leverage tiers (up to 7x) sharply narrow the liquidation buffer.',
            },
            {
                'category': 'Systemic',
                'description': 'Leveraged LP positions are exposed to impermanent loss on the underlying DEX pools; sharp divergence between paired assets can erode equity independent of price direction and, combined with borrowed leverage, trigger cascading liquidations across correlated positions.',
            },
            {
                'category': 'Oracle',
                'description': 'Liquidation and position-health calculations depend on on-chain price feeds. Manipulated or stale prices for thinly-traded farmed assets could mis-trigger or delay liquidations, potentially leaving the lending pools with bad debt.',
            },
            {
                'category': 'Smart Contract',
                'description': 'The protocol runs complex leverage, lending, and (in XLend) smart-account logic across Optimism and Base. Despite PeckShield, BlockSec, and Sherlock audits, undiscovered contract bugs remain a risk; auditors flagged that privileged admin access needed multisig/timelock hardening.',
            },
            {
                'category': 'Governance',
                'description': 'veEXTRA governance controls pool listings, emissions, and parameter changes, and admin keys retain privileged access. Concentrated voting power or compromised privileged roles could push risky pool listings or parameter changes that expose lenders.',
            },
        ],
        competitors=[
            {
                'name': 'Stella (formerly Alpha Homora)',
                'slug': 'stella',
                'rank': 1,
                'positioning': 'Most direct peer: a leveraged-yield-farming / leveraged-strategy protocol allowing users to borrow to amplify DeFi positions.',
                'similarities': 'Both let users take on leverage against a lending pool to farm DEX/strategy yields, with liquidation mechanics protecting lenders.',
                'differences': 'Extra Finance is focused on the Superchain (Optimism/Base) with a veEXTRA model and its own lending pools; Stella pioneered leveraged farming on other ecosystems and uses a different (interest-free-style) leverage model.',
            },
            {
                'name': 'Gearbox Protocol',
                'slug': 'gearbox',
                'rank': 2,
                'positioning': 'Composable leverage / credit-account protocol enabling leveraged DeFi strategies across integrated venues.',
                'similarities': 'Provides on-chain leverage backed by lending liquidity, with automated liquidation of undercollateralized leveraged positions.',
                'differences': "Gearbox centers on generalized 'credit accounts' composable across many protocols and chains; Extra Finance is a purpose-built LYF + lending stack scoped to Optimism/Base DEX pools.",
            },
            {
                'name': 'Francium',
                'rank': 3,
                'positioning': 'Leveraged-yield-farming protocol on Solana.',
                'similarities': 'Lending pools funding leveraged farming positions on DEX pools, with the same amplify-yield-and-risk model.',
                'differences': 'Different chain ecosystem (Solana vs. Superchain EVM) and no veEXTRA-style governance token gating leverage.',
            },
        ],
        partnerships=[
            {
                'name': 'PancakeSwap',
                'date': '2025-01-01',
                'amountLabel': None,
                'description': 'Official liquidity pool launched on Base with PancakeSwap, featuring up to ~300% APR incentives (reported in the January 2025 monthly review; date set to the 1st as only the month is known).',
            },
        ],
        audits=[
            {
                'firm': 'PeckShield',
                'date': '2023-05-01',
                'url': 'https://github.com/peckshield/publications/blob/master/audit_reports/PeckShield-Audit-Report-ExtraFi-v1.0.pdf',
            },
            {
                'firm': 'BlockSec',
                'date': '2023-05-01',
                'url': 'https://github.com/blocksecteam/audit-reports/blob/main/solidity/blocksec_extrafinance_v1.0-signed.pdf',
            },
            {
                'firm': 'Sherlock',
                'date': '2024-12-01',
                'url': 'https://github.com/sherlock-protocol/sherlock-reports/blob/main/audits/2024.12.01%20-%20Final%20-%20Extra%20Finance%20Audit%20Report.pdf',
            },
        ],
        sources=[
            {
                'label': 'Extra Finance official docs — Welcome',
                'url': 'https://docs.extrafi.io/extra_finance',
            },
            {
                'label': 'Extra Finance docs — Audits & Security',
                'url': 'https://docs.extrafi.io/extra_finance/audits-and-security',
            },
            {
                'label': 'Extra Finance docs — Allocation & Emission (tokenomics)',
                'url': 'https://docs.extrafi.io/extra_finance/tokenomics/tokenomics-v1/allocation-and-emission',
            },
            {
                'label': 'Immunefi — Extra Finance bug bounty',
                'url': 'https://immunefi.com/bug-bounty/extrafinance/information/',
            },
            {
                'label': 'Nansen — What Is Extra Finance?',
                'url': 'https://nansen.ai/post/what-is-extra-finance',
            },
            {
                'label': 'Extra Finance Monthly Review — January 2025 (XLend, TVL, PancakeSwap)',
                'url': 'https://medium.com/@ExtraFinance/extra-finance-monthly-review-january-2025-4338fc3079a0',
            },
            {
                'label': 'DefiLlama — Extra Finance',
                'url': 'https://defillama.com/protocol/extra-finance',
            },
        ],
        github='https://github.com/ExtraFi',
        credit_tag_metrics={
            "leveragedYield": {
                "maxLeverageX": 7,
                "borrowModel": "Lending pool + leveraged LP farming",
                "supportedStrategies": ["Velodrome", "Aerodrome"],
                "integratedProtocols": ["Velodrome", "Aerodrome"],
            },
        },
    ),
    # ------------------------------- FIXED INCOME ------------------------------
    "pendle": _net(
        name="Pendle Finance",
        symbol="PENDLE",
        tagline="Tokenized yield: split principal and yield (PT/YT).",
        logo_url="https://icons.llamao.fi/icons/protocols/pendle",
        description=(
            "Pendle tokenizes yield-bearing assets into Principal Tokens (PT) and Yield "
            "Tokens (YT), creating an on-chain market for fixed-rate yield and yield "
            "speculation/hedging. Pendle V2's specialized AMM and vote-escrowed vePENDLE "
            "coordinate liquidity across dozens of maturity-dated yield markets, and Boros "
            "extends the model to funding-rate trading."
        ),
        differentiator=(
            "The dominant yield-tokenization market: PT buyers lock a fixed rate, YT "
            "buyers go long yield — a true fixed-income primitive for DeFi, with the "
            "deepest liquidity and asset coverage in the category."
        ),
        sub_sector="Fixed Income",
        tags=["Fixed Income"],
        chains=["Ethereum", "Arbitrum", "Base", "Mantle", "BSC"],
        official_docs="https://docs.pendle.finance",
        website="https://www.pendle.finance",
        twitter="https://x.com/pendle_fi",
        github="https://github.com/pendle-finance",
        components=[
            {
                "name": "Yield Tokenization (SY / PT / YT)",
                "description": (
                    "A yield-bearing asset is wrapped into Standardized Yield (SY, ERC-5115) "
                    "then split into a Principal Token (PT) and a Yield Token (YT) that trade "
                    "and redeem independently until maturity."
                ),
            },
            {
                "name": "Pendle AMM",
                "description": (
                    "A specialized AMM that trades PT and YT from a single pool, with "
                    "time-decaying concentrated liquidity tuned to a market's maturity date."
                ),
            },
            {
                "name": "vePENDLE",
                "description": (
                    "Vote-escrowed PENDLE (lock up to 2 years) — directs incentive emissions "
                    "across pools, boosts LP rewards, and earns a share of protocol swap fees "
                    "and YT yield."
                ),
            },
            {
                "name": "Boros",
                "description": (
                    "Funding-rate yield trading with margin via Yield Units (YU); lets users "
                    "hedge or speculate on perpetual funding rates. Launched Aug 2025 on Arbitrum."
                ),
            },
        ],
        faq=[
            {
                "question": "What are PT and YT?",
                "answer": (
                    "PT (Principal Token) is redeemable 1:1 for the underlying at maturity — "
                    "buying it at a discount locks a fixed yield. YT (Yield Token) captures all "
                    "yield from the underlying until maturity, so buying YT is a leveraged long "
                    "on that yield."
                ),
                "pinned": True,
            },
            {
                "question": "How does Pendle create a fixed yield?",
                "answer": (
                    "Buying PT below par locks in a fixed APY to maturity regardless of how the "
                    "underlying's variable rate moves; at maturity PT redeems 1:1 for the asset."
                ),
                "pinned": True,
            },
            {
                "question": "What is vePENDLE?",
                "answer": (
                    "vePENDLE is vote-escrowed PENDLE. Locking PENDLE grants governance weight, "
                    "boosted pool rewards, the right to vote on which pools receive incentives, "
                    "and a share of swap fees and YT yield."
                ),
                "pinned": False,
            },
            {
                "question": "What happens to a position at maturity?",
                "answer": (
                    "PT becomes redeemable 1:1 for the underlying and YT stops accruing yield. "
                    "LPs can withdraw or roll liquidity into a new maturity."
                ),
                "pinned": False,
            },
        ],
        org_structure=[
            {
                "name": "Pendle core team",
                "role": "Development",
                "description": (
                    "Founded in 2021 (originally 'Benchmark'); co-founded by TN Lee. The core "
                    "team builds Pendle V2 and Boros."
                ),
            },
            {
                "name": "vePENDLE holders",
                "role": "Governance",
                "description": (
                    "Vote-escrowed PENDLE holders vote on pool gauges and incentive "
                    "distribution and steer protocol parameters."
                ),
            },
        ],
        tradfi_comparison=[
            {
                "product": "Zero-coupon bond / Treasury STRIPS",
                "similarity": (
                    "A PT bought at a discount and redeemed at par at maturity behaves like a "
                    "zero-coupon bond — a known fixed return over a fixed term."
                ),
                "differences": (
                    "Fully collateralized, permissionless on-chain markets with no issuer "
                    "credit; the 'coupon' comes from a DeFi yield source carrying smart-contract "
                    "and oracle risk rather than a sovereign/corporate issuer."
                ),
            },
            {
                "product": "Interest-rate swap (IRS) / floating-rate trading",
                "similarity": (
                    "YT and Boros let users take directional views on floating yield vs a fixed "
                    "rate, similar to paying/receiving fixed on an interest-rate swap."
                ),
                "differences": (
                    "Exchange-style, over-collateralized on-chain markets rather than bilateral "
                    "OTC swaps with counterparty credit exposure."
                ),
            },
        ],
        events=[
            {
                "date": "2021-06",
                "title": "Mainnet launch (Ethereum)",
                "description": (
                    "Pendle goes live on Ethereum; users mint YT/OT (now PT) for yield-bearing "
                    "assets such as aUSDC and cDAI."
                ),
                "link": "https://messari.io/project/pendle",
            },
            {
                "date": "2022-11-29",
                "title": "Pendle V2 + vePENDLE",
                "description": (
                    "V2 launches with the unified PT/YT AMM and vote-escrowed vePENDLE "
                    "(ve(3,3)-style incentive model)."
                ),
                "link": "https://medium.com/pendle/pendle-v2-launch-part-3-3-updated-tokenomics-b6c6501b8286",
            },
            {
                "date": "2023",
                "title": "Multichain expansion",
                "description": (
                    "Pendle V2 deploys to Arbitrum (Mar), BNB Chain (Jul) and Optimism (Aug)."
                ),
                "link": "https://messari.io/project/pendle",
            },
            {
                "date": "2024",
                "title": "Stablecoin-yield boom (Ethena)",
                "description": (
                    "USDe/sUSDe fixed-yield markets drive Pendle to multi-billion-dollar TVL; "
                    "Ethena collateral becomes the dominant category (~70% of TVL)."
                ),
                "link": "https://blog.redstone.finance/2024/05/03/pendle-the-golden-defi-protocol-of-2024-why-what-and-how-part-1/",
            },
            {
                "date": "2025-08-05",
                "title": "Boros launch (Arbitrum)",
                "description": (
                    "Funding-rate yield trading with margin launches on Arbitrum, starting with "
                    "BTC and ETH funding rates."
                ),
                "link": "https://medium.com/boros-fi/boros-by-pendle-yield-trading-with-margin-63d026dc7399",
            },
        ],
        timeline=[
            {
                "date": "2021-06",
                "title": "Mainnet launch (Ethereum)",
                "description": "Pendle V1 goes live on Ethereum with tokenized yield for aUSDC/cDAI.",
                "link": "https://messari.io/project/pendle",
                "status": "executed",
            },
            {
                "date": "2021-11",
                "title": "Avalanche deployment",
                "description": "Pendle V1 expands to the Avalanche C-Chain.",
                "link": "https://messari.io/project/pendle",
                "status": "executed",
            },
            {
                "date": "2022-11-29",
                "title": "Pendle V2 + vePENDLE",
                "description": "Unified PT/YT AMM and vote-escrowed vePENDLE launch on Ethereum.",
                "link": "https://medium.com/pendle/pendle-v2-launch-part-3-3-updated-tokenomics-b6c6501b8286",
                "status": "executed",
            },
            {
                "date": "2023",
                "title": "Multichain expansion",
                "description": "V2 deploys to Arbitrum, BNB Chain and Optimism.",
                "link": "https://messari.io/project/pendle",
                "status": "executed",
            },
            {
                "date": "2024",
                "title": "Stablecoin-yield boom (Ethena)",
                "description": "USDe/sUSDe markets push Pendle to multi-billion TVL; Ethena ~70% of TVL.",
                "link": "https://blog.redstone.finance/2024/05/03/pendle-the-golden-defi-protocol-of-2024-why-what-and-how-part-1/",
                "status": "executed",
            },
            {
                "date": "2025-08-05",
                "title": "Boros launch (Arbitrum)",
                "description": "Funding-rate yield trading with margin (Yield Units) launches on Arbitrum.",
                "link": "https://medium.com/boros-fi/boros-by-pendle-yield-trading-with-margin-63d026dc7399",
                "status": "executed",
            },
        ],
        offchain_facts=[
            {
                "key": "Founded",
                "value": "2021 — mainnet June 2021 (originally launched as 'Benchmark').",
                "freshness": "static",
                "source": {"label": "Messari — Pendle profile", "url": "https://messari.io/project/pendle"},
                "capturedAt": "2026-07-02",
            },
            {
                "key": "Audits",
                "value": (
                    "Smart contracts audited by ChainSecurity, Ackee Blockchain, Dedaub, "
                    "Dingbats and Code4rena wardens; reports published publicly."
                ),
                "freshness": "static",
                "source": {"label": "Pendle Security docs", "url": "https://docs.pendle.finance/Security"},
                "capturedAt": "2026-07-02",
            },
            {
                "key": "Seed round",
                "value": "$3.7M seed (Apr 2021) led by Mechanism Capital.",
                "freshness": "static",
                "source": {
                    "label": "Crunchbase — Pendle seed round",
                    "url": "https://www.crunchbase.com/funding_round/pendle-finance-seed--1fafcfe8",
                },
                "capturedAt": "2026-07-02",
            },
        ],
        risks=[
            {
                "category": "Smart Contract",
                "description": (
                    "SY wrappers, PT/YT tokenization, redemption/maturity logic and the Pendle "
                    "AMM are complex contracts; a bug could impair redemptions or LP funds."
                ),
            },
            {
                "category": "Counterparty",
                "description": (
                    "Every market inherits its underlying yield source — a depeg, exploit or "
                    "yield collapse of assets like Ethena sUSDe, Lido stETH or Ether.fi weETH "
                    "directly hits PT/YT holders."
                ),
            },
            {
                "category": "Oracle",
                "description": (
                    "PT/YT valuation and liquidations on integrating protocols rely on "
                    "oracles/TWAPs; stale or manipulated pricing near maturity can misvalue "
                    "positions."
                ),
            },
            {
                "category": "Systemic",
                "description": (
                    "TVL is highly concentrated in Ethena USDe/sUSDe markets (~70%); an "
                    "Ethena-specific shock would disproportionately impact Pendle. Markets are "
                    "also time-bound — liquidity thins and YT decays toward maturity."
                ),
            },
            {
                "category": "Governance",
                "description": (
                    "vePENDLE holders direct incentive emissions and key parameters; "
                    "concentration of locked PENDLE could steer rewards or governance outcomes."
                ),
            },
            {
                "category": "Regulatory",
                "description": (
                    "Fixed-yield and yield-trading products may face evolving regulatory "
                    "treatment; Pendle is not a regulated financial product."
                ),
            },
        ],
        audits=[
            {
                "firm": "ChainSecurity",
                "date": "2022",
                "url": "https://www.chainsecurity.com/security-audit/pendle-v2-core",
            },
            {
                "firm": "Ackee Blockchain",
                "date": "2022-05",
                "url": "https://ackee.xyz/blog/pendle-finance-pendle-v2-audit-summary/",
            },
            {
                "firm": "Dedaub",
                "date": "2023",
                "url": "https://dedaub.com/audits/pendle/",
            },
        ],
        competitors=[
            {
                "name": "Spectra",
                "slug": "spectra",
                "rank": 1,
                "positioning": "Permissionless yield tokenization (ex-APWine).",
                "similarities": (
                    "Both split yield-bearing assets into principal and yield tokens for "
                    "fixed/variable-rate trading."
                ),
                "differences": (
                    "Spectra emphasizes permissionless market creation; Pendle leads the "
                    "category on TVL, liquidity depth and integrations."
                ),
            },
            {
                "name": "Notional Finance",
                "slug": "notional",
                "rank": 2,
                "positioning": "Fixed-rate, fixed-term lending via fCash.",
                "similarities": "Both deliver on-chain fixed rates over a fixed term.",
                "differences": (
                    "Notional uses fCash lending markets rather than tokenized yield splitting, "
                    "and operates at smaller scale."
                ),
            },
            {
                "name": "Sense Finance",
                "slug": "sense",
                "rank": 3,
                "positioning": "Yield stripping / zero-coupon markets.",
                "similarities": "Both separate future yield from principal for an underlying asset.",
                "differences": (
                    "Sense is narrower and lower-activity; Pendle has far deeper liquidity and "
                    "broader asset coverage."
                ),
            },
        ],
        partnerships=[
            {
                "name": "Ethena",
                "date": "2024",
                "amountLabel": None,
                "description": (
                    "USDe and sUSDe fixed-yield markets became Pendle's largest, with Ethena "
                    "collateral growing to roughly 70% of Pendle TVL — making stablecoin yield "
                    "Pendle's flagship category."
                ),
            },
            {
                "name": "Ether.fi",
                "date": "2024",
                "amountLabel": None,
                "description": (
                    "weETH liquid-restaking markets on Pendle let users fix or leverage "
                    "restaking yield and points during the restaking wave."
                ),
            },
            {
                "name": "Aave",
                "date": "2025",
                "amountLabel": None,
                "description": (
                    "Integration with the Aave ecosystem extended Pendle PT tokens into "
                    "lending as collateral, broadening fixed-yield PT utility."
                ),
            },
        ],
        investment_rounds=[
            {
                "date": "2021-04",
                "round": "Seed",
                "amountUsd": 3_700_000,
                "amountLabel": "$3.7M",
                "investors": [
                    "Mechanism Capital",
                    "Crypto.com Capital",
                    "HashKey Capital",
                    "Spartan Group",
                    "CMS Holdings",
                    "Bitscale Capital",
                    "imToken Ventures",
                    "LedgerPrime",
                    "Lemniscap",
                    "Signum Capital",
                ],
                "link": "https://www.crunchbase.com/funding_round/pendle-finance-seed--1fafcfe8",
            },
        ],
        member_coins=[
            {
                "slug": "pendle-token",
                "name": "PENDLE",
                "symbol": "PENDLE",
                "category": "Token",
                "role": "Governance & utility token",
                "subCategory": "Governance Token",
            },
            {
                "slug": "pendle-ptyt",
                "name": "PT-stETH, PT-eETH, etc.",
                "symbol": "PT-stETH",
                "category": "Receipt",
                "role": "Fixed-yield principal",
            },
            {
                "slug": "pendle-ptyt-family",
                "name": "YT-stETH, YT-eETH, etc.",
                "symbol": "YT-stETH",
                "category": "Receipt",
                "role": "Tradable future yield",
            },
        ],
        scale_labels={"tvl": "Protocol TVL"},
        sources=[
            {"label": "Pendle Documentation", "url": "https://docs.pendle.finance"},
            {"label": "Pendle Security & audits", "url": "https://docs.pendle.finance/Security"},
            {"label": "Messari — Pendle profile", "url": "https://messari.io/project/pendle"},
            {
                "label": "Pendle V2 launch — tokenomics",
                "url": "https://medium.com/pendle/pendle-v2-launch-part-3-3-updated-tokenomics-b6c6501b8286",
            },
            {
                "label": "Boros by Pendle — announcement",
                "url": "https://medium.com/boros-fi/boros-by-pendle-yield-trading-with-margin-63d026dc7399",
            },
            {
                "label": "RedStone — Pendle & Ethena (golden protocol of 2024)",
                "url": "https://blog.redstone.finance/2024/05/03/pendle-the-golden-defi-protocol-of-2024-why-what-and-how-part-1/",
            },
            {
                "label": "Crunchbase — Pendle seed round",
                "url": "https://www.crunchbase.com/funding_round/pendle-finance-seed--1fafcfe8",
            },
        ],
        credit_tag_metrics={
            "fixedIncome": {
                "mechanism": "PT/YT yield split (tokenized yield markets)",
                "maturities": ["Varies per market (1–12 months)"],
            },
        },
    ),
    "notional": _net(
        name="Notional Finance",
        symbol="NOTE",
        tagline="Fixed-rate, fixed-term lending and borrowing.",
        logo_url="https://icons.llamao.fi/icons/protocols/notional-v3",
        description=(
            "Notional provides fixed-rate, fixed-term lending and borrowing via fCash — "
            "tokenized claims on a fixed amount of an asset at a future maturity, traded "
            "on an on-chain AMM."
        ),
        differentiator=(
            "True fixed-rate/fixed-term loans through fCash, rather than variable money-"
            "market rates — predictable cost of capital for borrowers and lenders."
        ),
        sub_sector="Fixed Income",
        tags=["Fixed Income"],
        chains=["Ethereum", "Arbitrum"],
        official_docs="https://docs.notional.finance",
        website="https://notional.finance",
        twitter="https://x.com/NotionalFinance",
        components=[
            {
                'name': 'fCash fixed-rate markets',
                'description': "Notional's core product. fCash is an ERC-1155 token representing a claim to a fixed amount of an underlying asset at a specific future maturity. Lenders buy positive fCash at a discount and redeem it 1:1 at maturity for a fixed return; borrowers mint negative fCash to receive cash today and repay a fixed amount later. fCash trades against Prime Cash in maturity-specific AMM liquidity pools where the ratio of Prime Cash to fCash sets the fixed interest rate. This is how Notional delivers fixed-rate, fixed-term lending and borrowing on-chain.",
            },
            {
                'name': 'Prime money market (variable-rate lending)',
                'description': 'Introduced in V3, the prime money market lets users lend and borrow at variable rates, integrating with the fixed-rate markets. Deposits are represented as Prime Cash. Fixed-rate debt automatically converts to variable-rate debt at maturity with no settlement penalty, and variable positions serve as the underlying liquidity that fixed-rate pools trade against.',
            },
            {
                'name': 'Leveraged vaults',
                'description': 'Whitelisted external smart contracts that execute pre-approved yield strategies (e.g. Curve, Balancer, Uniswap LP or staking strategies) funded by fixed- or variable-rate borrowing from Notional. A user deposits collateral, borrows against it, and the combined capital is deployed into the vault; vault assets are recognized as collateral against the debt, enabling leveraged (up to ~10x on some strategies) exposure while paying interest only on the borrowed portion. Positions are overcollateralized and subject to liquidation.',
            },
            {
                'name': 'NOTE governance token',
                'description': 'NOTE is the ERC-20 governance token of the Notional protocol. Holders propose, vote on, and implement changes to system parameters and smart contracts (one vote per NOTE) via Notional Improvement Proposals through on-chain governance. NOTE is also used to incentivize liquidity providers and, historically, could be staked (sNOTE) to backstop the protocol.',
            },
        ],
        faq=[
            {
                'question': 'How does Notional offer a fixed interest rate?',
                'answer': 'Lenders swap cash for fCash on a maturity-specific liquidity pool at a discount. Because fCash redeems 1:1 for the underlying asset at its maturity date, the discount at which you buy it locks in your fixed yield over the loan term. Borrowers do the reverse, minting negative fCash to lock in a fixed borrowing cost.',
                'pinned': True,
            },
            {
                'question': 'What happens to my fixed-rate position at maturity?',
                'answer': 'In V3 there is no hard settlement requirement. When a fixed-rate loan or debt matures, it automatically converts to a variable-rate position in the prime money market with no penalty, so you are never forced to close at maturity.',
                'pinned': False,
            },
            {
                'question': 'Which chains and assets does Notional support?',
                'answer': 'Notional V3 runs on Ethereum and Arbitrum. Users can lend and borrow assets such as USDC, DAI, USDT, FRAX, ETH, wstETH, rETH, cbETH, and wBTC at fixed or variable rates, with additional collateral types supported for leveraged vaults.',
                'pinned': False,
            },
            {
                'question': 'What are the main risks of using Notional?',
                'answer': 'Borrowing and leveraged-vault positions are overcollateralized and can be liquidated if collateral value falls below required thresholds. Users also face smart-contract risk, oracle risk on collateral pricing, and the risk of external strategy protocols used by leveraged vaults. Fixed-rate lending itself is non-custodial and secured by overcollateralized borrowers.',
                'pinned': False,
            },
            {
                'question': 'What is the NOTE token for?',
                'answer': 'NOTE is the governance token. Holders vote on protocol parameters and upgrades and NOTE is used to incentivize liquidity. It is not required to lend or borrow on the protocol.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Notional Labs',
                'role': 'Core developer / founding team',
                'description': 'The company that built and develops the Notional protocol, co-founded by Teddy Woodward (CEO) and Jeff Wu. The team launched Notional out of stealth in October 2020 and shipped V1 (Jan 2021), V2 (Nov 2021), and V3 (Nov 2023).',
            },
            {
                'name': 'Notional DAO (NOTE holders)',
                'role': 'Governance',
                'description': 'Governance of the protocol is held by NOTE token holders, who propose and vote on Notional Improvement Proposals and parameter changes via on-chain governance and the Notional governance forum, with the team progressively stepping back from control.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Fixed-income bond / zero-coupon note',
                'similarity': 'fCash behaves like a zero-coupon bond: it is bought at a discount today and redeems for a fixed face value at a known maturity date, delivering a predictable fixed yield over a defined term, just like a discount bond.',
                'differences': 'fCash is a fully on-chain, permissionless, tradable token collateralized by overcollateralized crypto borrowers rather than a corporate/sovereign issuer; there is no credit-rating or centralized custodian, and positions can be exited early by trading on an AMM rather than waiting for maturity or a secondary bond market.',
            },
            {
                'product': 'Term deposit / certificate of deposit (CD)',
                'similarity': 'Lending on Notional at a fixed rate for a fixed term mirrors a bank CD: you commit funds for a set period in exchange for a known, locked-in interest rate.',
                'differences': 'Notional is non-custodial and uninsured (no FDIC-style protection), rates are set by market supply/demand in an AMM rather than by a bank, and lenders are protected by on-chain overcollateralization instead of a bank balance sheet.',
            },
        ],
        events=[
            {
                'date': '2020-10-26',
                'title': 'Notional launches out of stealth with $1.3M seed round',
                'description': 'Notional launched in beta on Ethereum and announced a $1.3M seed round from eight investors including Coinbase Ventures, 1confirmation and Polychain.',
                'link': 'https://www.coindesk.com/business/2020/10/26/notional-launches-out-of-stealth-to-bring-fixed-rate-lending-to-defi',
            },
            {
                'date': '2021-04-29',
                'title': 'Notional raises $10M Series A led by Pantera Capital',
                'description': 'Notional closed a $10M Series A led by Pantera Capital with ParaFi Capital, 1Confirmation, Spartan Group, Nascent, Nima Capital and others, after reaching ~$17M TVL within three months of the V1 launch.',
                'link': 'https://www.coindesk.com/business/2021/04/29/notional-raises-10m-to-grow-defi-lending-protocol-with-real-world-potential',
            },
            {
                'date': '2021-11-01',
                'title': 'Notional V2 launches with NOTE governance token',
                'description': 'Notional relaunched as V2, expanding its fixed-rate lending markets and introducing the NOTE governance token and on-chain DAO governance.',
                'link': 'https://www.coindesk.com/business/2021/11/01/defi-startup-notional-expands-fixed-rate-lending-presence-with-v2-upgrade',
            },
            {
                'date': '2023-11-06',
                'title': 'Notional V3 goes live on Arbitrum',
                'description': 'Notional V3 launched on Arbitrum, adding a variable-rate prime money market, leveraged yield vaults, removal of hard settlement, and new collateral (cbETH, ARB, RDNT, GMX).',
                'link': 'https://blog.notional.finance/notional-v3-is-live-on-arbitrum/',
            },
        ],
        timeline=[
            {
                'date': '2021-01-01',
                'title': 'Notional V1 on Ethereum mainnet',
                'description': 'Notional deployed V1 to Ethereum mainnet in January 2021, becoming one of the first DeFi protocols to offer fixed-rate, fixed-term lending via fCash. Month-precise date set to the 1st.',
                'link': 'https://scapital.medium.com/an-introduction-to-notional-finance-a-fixed-rate-lending-protocol-be46b01788d6',
                'status': 'executed',
            },
            {
                'date': '2021-11-01',
                'title': 'Notional V2',
                'description': 'V2 upgrade introduced improved fixed-rate liquidity pools, the NOTE governance token, and DAO governance.',
                'link': 'https://blog.notional.finance/november/',
                'status': 'executed',
            },
            {
                'date': '2023-11-06',
                'title': 'Notional V3',
                'description': 'V3 added variable-rate prime money markets, leveraged vaults, no-penalty maturity roll-over, and expansion to Arbitrum alongside Ethereum.',
                'link': 'https://blog.notional.finance/notional-v3-is-live-on-arbitrum/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Total raised',
                'value': '$11.3M ($1.3M seed 2020 + $10M Series A 2021)',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk (Series A) & CoinDesk (seed)',
                    'url': 'https://www.coindesk.com/business/2021/04/29/notional-raises-10m-to-grow-defi-lending-protocol-with-real-world-potential',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Chains supported',
                'value': 'Ethereum and Arbitrum (Notional V3)',
                'freshness': 'static',
                'source': {
                    'label': 'Notional blog — V3 live on Arbitrum',
                    'url': 'https://blog.notional.finance/notional-v3-is-live-on-arbitrum/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Audits',
                'value': '17+ audits by OpenZeppelin, Certora, ABDK, Consensys Diligence, Code4rena and Sherlock (2020-2024)',
                'freshness': 'static',
                'source': {
                    'label': 'Notional V3 docs — Audits',
                    'url': 'https://docs.notional.finance/notional-v3/smart-contracts/audits.md',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Collateral',
                'description': 'All borrowing and leveraged-vault positions are overcollateralized in volatile crypto assets (ETH, wstETH, cbETH, wBTC, ARB, etc.). A sharp drop in collateral value can push a position below its required collateralization ratio and trigger liquidation, causing loss to the borrower.',
            },
            {
                'category': 'Smart Contract',
                'description': 'Notional relies on complex custom contracts (fCash ERC-1155 accounting, maturity-specific AMM pools, external leveraged vaults). Despite 17+ audits, bugs in these contracts or in the whitelisted vault strategy code could lead to loss of funds.',
            },
            {
                'category': 'Oracle',
                'description': 'Collateral valuation and liquidation for borrowers and leveraged vaults depend on price oracles. Manipulated, stale, or inaccurate oracle prices could cause faulty liquidations or allow undercollateralized borrowing.',
            },
            {
                'category': 'Counterparty',
                'description': 'Leveraged vaults deploy borrowed capital into external protocols (e.g. Curve, Balancer, Uniswap, liquid-staking tokens). A failure, exploit, or depeg in one of those external strategy protocols would directly impair vault positions and the loans backing them.',
            },
            {
                'category': 'Governance',
                'description': 'Protocol parameters, collateral listings, vault whitelisting and contract upgrades are controlled by NOTE-token governance. Concentrated NOTE holdings or a malicious/erroneous proposal could change risk parameters or upgrade contracts in ways that harm users.',
            },
        ],
        competitors=[
            {
                'name': 'Pendle',
                'slug': 'pendle',
                'rank': 1,
                'positioning': 'Largest fixed-yield / yield-tokenization protocol',
                'similarities': "Both let users lock in fixed yields on-chain and separate/trade future cash flows (Pendle's PT vs Notional's fCash) with maturity-based markets.",
                'differences': 'Pendle tokenizes and trades yield-bearing assets into Principal and Yield Tokens across many chains and focuses on yield trading; Notional is a full lending/borrowing protocol where fixed-rate positions double as collateral and it also offers variable lending and leveraged vaults.',
            },
            {
                'name': 'Spectra',
                'slug': 'spectra',
                'rank': 2,
                'positioning': 'Permissionless interest-rate derivatives / fixed-yield protocol',
                'similarities': 'Provides on-chain fixed rates and tokenized future cash flows with maturity-based markets, competing directly for fixed-income DeFi users.',
                'differences': 'Spectra is a permissionless yield-tokenization and interest-rate derivatives layer built on top of yield-bearing tokens; Notional is a self-contained fixed-rate lending/borrowing money market with its own liquidity pools and leveraged vaults.',
            },
            {
                'name': 'Sense Finance',
                'rank': 3,
                'positioning': 'Fixed-rate / yield-stripping protocol',
                'similarities': 'Also splits assets into fixed-yield and variable-yield components to offer fixed rates on-chain over defined terms.',
                'differences': 'Sense is a yield-stripping protocol layered on external yield sources rather than a native lending market; it does not operate its own fixed-rate borrowing money market or leveraged vaults like Notional.',
            },
            {
                'name': 'Aave',
                'slug': 'aave',
                'rank': 4,
                'positioning': 'Largest variable-rate lending money market',
                'similarities': "Directly competes with Notional's V3 prime money market for variable-rate lending and borrowing of the same major assets (USDC, DAI, ETH, wBTC, etc.).",
                'differences': "Aave offers only variable (and previously stable) rates with no native fixed-term product, whereas Notional's core differentiator is true fixed-rate, fixed-term lending via fCash plus leveraged vaults.",
            },
        ],
        investment_rounds=[
            {
                'date': '2020-10-26',
                'round': 'Seed',
                'amountUsd': 1300000,
                'amountLabel': '$1.3M',
                'investors': [
                    'Coinbase Ventures',
                    '1confirmation',
                    'Polychain',
                ],
                'link': 'https://www.coindesk.com/business/2020/10/26/notional-launches-out-of-stealth-to-bring-fixed-rate-lending-to-defi',
            },
            {
                'date': '2021-04-29',
                'round': 'Series A',
                'amountUsd': 10000000,
                'amountLabel': '$10M',
                'investors': [
                    'Pantera Capital',
                    'ParaFi Capital',
                    '1Confirmation',
                    'Spartan Group',
                    'Nascent',
                    'Nima Capital',
                ],
                'link': 'https://www.coindesk.com/business/2021/04/29/notional-raises-10m-to-grow-defi-lending-protocol-with-real-world-potential',
            },
        ],
        audits=[
            {
                'firm': 'OpenZeppelin',
                'date': '2020-12-01',
                'url': 'https://blog.openzeppelin.com/notional-audit/',
            },
            {
                'firm': 'Code4rena',
                'date': '2021-10-01',
                'url': 'https://code4rena.com/reports/2021-08-notional/',
            },
            {
                'firm': 'OpenZeppelin',
                'date': '2021-11-01',
                'url': 'https://blog.openzeppelin.com/notional-v2-audit-governance-contracts/',
            },
            {
                'firm': 'Code4rena',
                'date': '2022-03-01',
                'url': 'https://code4rena.com/reports/2022-01-notional/',
            },
            {
                'firm': 'Consensys Diligence',
                'date': '2022-03-01',
                'url': 'https://consensys.io/diligence/audits/2022/03/notional-protocol-v2.1/',
            },
            {
                'firm': 'Code4rena',
                'date': '2022-07-01',
                'url': 'https://code4rena.com/reports/2022-06-notional-coop/',
            },
            {
                'firm': 'Consensys Diligence',
                'date': '2022-07-01',
                'url': 'https://diligence.consensys.io/audits/2022/07/notional-finance/notional-finance-audit-2022-07.pdf',
            },
            {
                'firm': 'Sherlock',
                'date': '2023-11-01',
                'url': 'https://audits.sherlock.xyz/contests/119',
            },
            {
                'firm': 'Sherlock',
                'date': '2024-01-01',
                'url': 'https://audits.sherlock.xyz/contests/142',
            },
            {
                'firm': 'Sherlock',
                'date': '2024-06-01',
                'url': 'https://audits.sherlock.xyz/contests/446',
            },
        ],
        sources=[
            {
                'label': 'Notional V3 introduction blog',
                'url': 'https://blog.notional.finance/introducing-notional-v3/',
            },
            {
                'label': 'Notional V3 live on Arbitrum',
                'url': 'https://blog.notional.finance/notional-v3-is-live-on-arbitrum/',
            },
            {
                'label': 'Notional V3 docs — Using fCash',
                'url': 'https://docs.notional.finance/notional-v3/fcash/using-fcash',
            },
            {
                'label': 'Notional V3 docs — Audits',
                'url': 'https://docs.notional.finance/notional-v3/smart-contracts/audits.md',
            },
            {
                'label': 'CoinDesk — Series A $10M raise',
                'url': 'https://www.coindesk.com/business/2021/04/29/notional-raises-10m-to-grow-defi-lending-protocol-with-real-world-potential',
            },
            {
                'label': 'CoinDesk — launch out of stealth / seed round',
                'url': 'https://www.coindesk.com/business/2020/10/26/notional-launches-out-of-stealth-to-bring-fixed-rate-lending-to-defi',
            },
            {
                'label': 'CoinDesk — V2 upgrade',
                'url': 'https://www.coindesk.com/business/2021/11/01/defi-startup-notional-expands-fixed-rate-lending-presence-with-v2-upgrade',
            },
        ],
        github='https://github.com/notional-finance',
        credit_tag_metrics={
            "fixedIncome": {
                "mechanism": "fCash fixed-rate / fixed-term lending (AMM)",
                "maturities": ["3 months", "6 months", "1 year"],
            },
        },
    ),
    "spectra": _net(
        name="Spectra",
        symbol="SPECTRA",
        tagline="Permissionless yield tokenization (ex-APWine).",
        logo_url="https://icons.llamao.fi/icons/protocols/spectra-v2",
        description=(
            "Spectra (formerly APWine) is a permissionless interest-rate derivatives "
            "protocol: any yield-bearing asset can be split into principal and yield "
            "tokens to trade fixed and variable rates."
        ),
        differentiator=(
            "Permissionless market creation for yield tokenization — anyone can list a "
            "new PT/YT market for an interest-bearing asset."
        ),
        sub_sector="Fixed Income",
        tags=["Fixed Income"],
        chains=["Ethereum", "Base", "Arbitrum"],
        official_docs="https://docs.spectra.finance",
        website="https://www.spectra.finance",
        twitter="https://x.com/spectra_finance",
        components=[
            {
                'name': 'Principal & Yield Token (PT / YT) tokenization',
                'description': "Users deposit an ERC-4626 interest-bearing token (IBT) or its underlying asset and receive two tokens: a Principal Token (PT), redeemable 1:1 for the underlying at maturity, and a Yield Token (YT), which captures all future yield until maturity. This 'yield tokenization' splits a yield-bearing position into a fixed-rate component (PT) and a variable-yield component (YT), enabling fixed rates, yield speculation, and hedging.",
            },
            {
                'name': 'AMM pools (Curve-based)',
                'description': "PTs trade against their underlying IBT in dedicated automated market maker pools. The price of the PT relative to the underlying implies a fixed yield-to-maturity. Spectra's pools are built on a Curve cryptoswap AMM design, letting users buy PTs at a discount (locking in a fixed rate) or provide liquidity to earn swap fees and incentives.",
            },
            {
                'name': 'Permissionless pool creation',
                'description': 'Anyone can create a new yield-tokenization market for any ERC-4626 vault at will, without protocol-team approval. This permissionless design lets the protocol list new yield-bearing assets (from lending markets, liquid staking, and stablecoin issuers) faster than curated competitors.',
            },
            {
                'name': 'SPECTRA token & veSPECTRA governance',
                'description': 'SPECTRA is the ecosystem and governance token (migrated from APW). Holders can lock SPECTRA as vote-escrowed veSPECTRA to participate in weekly gauge votes directing incentive emissions, earn a share of protocol fees plus a rebase. Governance, gauge voting, and reward claims run on the Base network.',
            },
        ],
        faq=[
            {
                'question': 'What is Spectra and how does it work?',
                'answer': 'Spectra is a permissionless interest-rate derivatives protocol. You deposit a yield-bearing (ERC-4626) token and it is split into a Principal Token (PT), redeemable for the principal at maturity, and a Yield Token (YT), which collects the future yield. Buying a PT at a discount locks in a fixed rate; buying a YT is a leveraged bet on future yield.',
                'pinned': True,
            },
            {
                'question': 'Was Spectra formerly APWine?',
                'answer': 'Yes. APWine Finance rebranded to Spectra in July 2023; the team said the APWine name no longer reflected the products being built. The protocol was founded in August 2020.',
                'pinned': False,
            },
            {
                'question': 'What is the SPECTRA token and what happened to APW?',
                'answer': 'SPECTRA is the current ecosystem/governance token. Following governance proposal SIP-3, the SPECTRA token was introduced on 17 December 2024, replacing APW. Lockers get veSPECTRA, which earns protocol fees and a rebase and votes weekly on incentive gauges. Governance runs on Base.',
                'pinned': False,
            },
            {
                'question': 'How do I earn a fixed rate on Spectra?',
                'answer': 'Buy a Principal Token (PT) for a yield-bearing asset at a discount to its redemption value. At maturity the PT redeems 1:1 for the underlying, so the discount you captured is your guaranteed (fixed) return, independent of how the variable yield moves in between.',
                'pinned': False,
            },
            {
                'question': 'What are the fees?',
                'answer': 'Spectra collects a swap fee on its AMM pools plus a yield fee on the yield generated by YTs. Collected fees are distributed to veSPECTRA voters, liquidity providers, and (for Curve-based pools) the Curve DAO, per the fee-distribution governance parameters.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Perspective (perspectivefi)',
                'role': 'Core development team / labs',
                'description': 'The team building Spectra (formerly APWine Finance), founded August 2020 in the Paris / Île-de-France area by Antoine Mouran and Gaspard Peduzzi. Maintains the spectra-core and spectra-governance repositories under the perspectivefi GitHub org.',
            },
            {
                'name': 'Spectra DAO (veSPECTRA governance)',
                'role': 'Decentralized governance',
                'description': 'Community governance conducted via SPECTRA/veSPECTRA holders. Proposal voting (SIPs/SGPs), gauge voting, and reward claims take place on the Base network. veSPECTRA lockers direct incentive emissions and share in protocol fees.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Zero-coupon bond / STRIPS (Treasury interest-rate strips)',
                'similarity': 'A Spectra Principal Token behaves like a zero-coupon bond: it trades at a discount and redeems for full face value at a fixed maturity date, so the buyer locks in a fixed yield. This is the same mechanic as a stripped Treasury (STRIPS), where the principal and coupon cash flows are separated and sold individually.',
                'differences': 'Spectra PTs reference on-chain yield-bearing tokens (lending / staking receipts) rather than sovereign debt, have no credit guarantee, and carry smart-contract and depeg risk. The separately tradable Yield Token has no clean TradFi equivalent as a liquid retail instrument.',
            },
            {
                'product': 'Interest-rate swap / fixed-vs-floating rate market',
                'similarity': 'By choosing PT (fixed) versus YT (floating), a user effectively takes one side of a fixed-vs-floating interest-rate trade, letting them hedge or speculate on the direction of a yield rate — the core function of an interest-rate swap market.',
                'differences': 'Spectra is fully collateralized, non-custodial, and permissionless with no ISDA/dealer intermediary; positions are tokenized and exit is via an AMM rather than a bilateral swap contract.',
            },
        ],
        events=[
            {
                'date': '2021-03-24',
                'title': 'APWine closes $1M seed round',
                'description': 'APWine raised $1M in a seed round led by Delphi Ventures, selling 3M APW (6% of supply) at $0.3333 with 2-year linear vesting.',
                'link': 'https://medium.com/apwine/apwine-1m-seed-round-closed-5735e10b5cd7',
            },
            {
                'date': '2022-10-31',
                'title': 'APWine v2 launch',
                'description': 'Launch of APWine Finance 2.0, a modular redesign of the interest-derivatives architecture with Yield Tokens, an L2 P2P yield market, and ERC-4626 compatibility.',
                'link': 'https://iq.wiki/wiki/apwine-finance',
            },
            {
                'date': '2022-11-10',
                'title': 'APWine raises $2.6M seed extension',
                'description': 'APWine announced a $2.6M seed-extension round led by Greenfield Capital, bringing total funding to $3.6M.',
                'link': 'https://tech.eu/2022/11/10/apwine-raises-2-6-million-as-it-builds-a-modular-interest-market-in-defi/',
            },
            {
                'date': '2023-07-10',
                'title': 'Rebrand from APWine to Spectra',
                'description': 'APWine Finance officially rebranded to Spectra, positioning as an open interest-rate derivatives protocol; the team said the APWine name no longer reflected the products being built.',
                'link': 'https://mirror.xyz/spectraprotocol.eth/n168TYwI25kXjAOavf77zWROZvhT8SA3ab2DPu9MAwA',
            },
            {
                'date': '2024-12-17',
                'title': 'APW → SPECTRA token migration (SIP-3)',
                'description': 'Following governance proposal SIP-3, the SPECTRA token was introduced, replacing APW as the ecosystem token, with governance infrastructure deployed to the Base network.',
                'link': 'https://docs.spectra.finance/tokenomics/spectra',
            },
        ],
        timeline=[
            {
                'date': '2020-08-01',
                'title': 'APWine Finance founded',
                'description': "APWine Finance established during 'DeFi summer' by Antoine Mouran and Gaspard Peduzzi (Paris). Month-only date; day set to the 1st.",
                'link': 'https://iq.wiki/wiki/apwine-finance',
                'status': 'executed',
            },
            {
                'date': '2022-10-31',
                'title': 'APWine v2 (modular interest-derivatives architecture)',
                'description': 'Redesigned protocol with Yield Tokens, an L2 P2P yield market, and ERC-4626 compatibility.',
                'link': 'https://iq.wiki/wiki/apwine-finance',
                'status': 'executed',
            },
            {
                'date': '2023-07-10',
                'title': 'Spectra rebrand',
                'description': 'APWine becomes Spectra, an open/permissionless interest-rate derivatives protocol.',
                'link': 'https://mirror.xyz/spectraprotocol.eth/n168TYwI25kXjAOavf77zWROZvhT8SA3ab2DPu9MAwA',
                'status': 'executed',
            },
            {
                'date': '2024-02-23',
                'title': 'Code4rena audit contest of Spectra core',
                'description': 'Public audit competition (42 wardens) of the Spectra smart-contract system ran 23 Feb – 1 Mar 2024.',
                'link': 'https://code4rena.com/reports/2024-02-spectra',
                'status': 'executed',
            },
            {
                'date': '2024-12-17',
                'title': 'SPECTRA token migration & Base governance',
                'description': 'SIP-3 introduces SPECTRA replacing APW; veSPECTRA governance/gauge voting deployed on Base.',
                'link': 'https://docs.spectra.finance/tokenomics/spectra',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Total raised',
                'value': '$3.6M across two rounds ($1M seed 2021, $2.6M seed extension 2022)',
                'freshness': 'static',
                'source': {
                    'label': 'Tech.eu — APWine raises $2.6M',
                    'url': 'https://tech.eu/2022/11/10/apwine-raises-2-6-million-as-it-builds-a-modular-interest-market-in-defi/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Founded',
                'value': 'August 2020 as APWine Finance; rebranded to Spectra July 2023',
                'freshness': 'static',
                'source': {
                    'label': 'IQ.wiki — Spectra (prev. APWine Finance)',
                    'url': 'https://iq.wiki/wiki/apwine-finance',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Audited by',
                'value': 'Code4rena (Feb–Mar 2024, 0 high / 2 medium), Pashov Audit Group (Mar 2024), Sherlock (Sep 2025)',
                'freshness': 'static',
                'source': {
                    'label': 'Spectra docs — Audits',
                    'url': 'https://docs.spectra.finance/security/audits',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Spectra tokenizes yield-bearing positions through PT/YT contracts, AMM pools, and a router. Its Code4rena audit surfaced a medium-severity finding on potential yield drainage via flash-loan exploitation of a vault-deflation attack, and another on ERC-5095 compliance; permissionless pool creation enlarges the attack surface since anyone can list arbitrary ERC-4626 vaults.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': "A Principal Token's fixed-rate guarantee depends on the underlying ERC-4626 vault redeeming 1:1 at maturity. If the underlying yield-bearing asset (a lending receipt, LST, or stablecoin) depegs or loses value, PT redemption value falls and holders can be under-collateralized despite holding the 'principal' leg.",
            },
            {
                'category': 'Counterparty',
                'description': 'Spectra is a yield layer sitting on top of external protocols (Aave, Lido, stablecoin issuers, etc.). A failure, exploit, or insolvency in any integrated underlying protocol flows directly through to the PTs/YTs minted against it, so users inherit the counterparty risk of every underlying vault they hold exposure to.',
            },
            {
                'category': 'Governance',
                'description': 'Emissions, gauge weights, and fee distribution are controlled by veSPECTRA voters, and the AMM/tokenomics were forked from Velodrome/Curve designs. Concentrated veSPECTRA holdings could steer incentives or fee parameters (e.g. changes made via SIP/SGP proposals) in ways that disadvantage ordinary LPs or PT/YT holders.',
            },
            {
                'category': 'Network',
                'description': 'Governance, gauge voting, and reward claims were migrated to the Base network (an L2). Base sequencer downtime, reorgs, or bridge issues could disrupt voting and reward claiming, and multi-chain deployment exposes users to the liveness and security assumptions of each chain the protocol operates on.',
            },
        ],
        competitors=[
            {
                'name': 'Pendle',
                'slug': 'pendle',
                'rank': 1,
                'positioning': "The dominant yield-tokenization protocol and Spectra's primary competitor.",
                'similarities': 'Same core primitive: splits yield-bearing assets into principal (PT) and yield (YT) tokens with fixed maturities, and trades PTs on a purpose-built AMM to create fixed rates and yield speculation.',
                'differences': 'Pendle is far larger in TVL and market share, curates most of its markets, and has its own AMM design. Spectra differentiates on fully permissionless pool creation (anyone can list any ERC-4626 vault) and a Curve/Velodrome-derived AMM and ve-tokenomics.',
            },
            {
                'name': 'Notional Finance',
                'slug': 'notional',
                'rank': 2,
                'positioning': 'Fixed-rate lending/borrowing protocol competing for the fixed-income DeFi user.',
                'similarities': "Provides fixed rates on crypto assets with defined maturities, appealing to the same fixed-income-seeking users as Spectra's PTs.",
                'differences': 'Notional achieves fixed rates through a fixed-term lending market (fCash) rather than by tokenizing and separately trading the yield of external ERC-4626 vaults; it is not a general permissionless yield-splitting layer.',
            },
            {
                'name': 'Sense Finance',
                'slug': 'sense',
                'rank': 3,
                'positioning': 'Early permissionless yield-stripping protocol with a similar PT/YT model.',
                'similarities': "Also separates yield-bearing assets into principal and yield components ('Sense Space' AMM) and targets fixed rates and yield trading in a permissionless design very close to Spectra's.",
                'differences': 'Smaller scale and less active than Spectra/Pendle; different AMM implementation and integration set.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-03-24',
                'round': 'Seed',
                'amountUsd': 1000000,
                'amountLabel': '$1M',
                'investors': [
                    'Delphi Ventures',
                    'The Spartan Group',
                    'DeFi Alliance',
                    'Rarestone Capital',
                    'Spincrypto Capital',
                    'Ternary Capital',
                    'Marc Zeller (Aave)',
                    'Julien Bouteloup (StakeDAO)',
                ],
                'link': 'https://medium.com/apwine/apwine-1m-seed-round-closed-5735e10b5cd7',
            },
            {
                'date': '2022-11-10',
                'round': 'Seed extension',
                'amountUsd': 2600000,
                'amountLabel': '$2.6M',
                'investors': [
                    'Greenfield Capital',
                ],
                'link': 'https://tech.eu/2022/11/10/apwine-raises-2-6-million-as-it-builds-a-modular-interest-market-in-defi/',
            },
        ],
        audits=[
            {
                'firm': 'Code4rena',
                'date': '2024-02-23',
                'url': 'https://code4rena.com/reports/2024-02-spectra',
            },
            {
                'firm': 'Pashov Audit Group',
                'date': '2024-03-01',
                'url': 'https://github.com/pashov/audits/blob/master/team/pdf/Spectra-security-review.pdf',
            },
            {
                'firm': 'Sherlock',
                'date': '2025-09-01',
                'url': 'https://docs.spectra.finance/security/audits',
            },
        ],
        sources=[
            {
                'label': 'Spectra official docs — Overview',
                'url': 'https://docs.spectra.finance/',
            },
            {
                'label': 'Spectra docs — SPECTRA tokenomics / migration',
                'url': 'https://docs.spectra.finance/tokenomics/spectra',
            },
            {
                'label': 'Spectra docs — Audits',
                'url': 'https://docs.spectra.finance/security/audits',
            },
            {
                'label': 'Introducing Spectra (rebrand announcement, Mirror)',
                'url': 'https://mirror.xyz/spectraprotocol.eth/n168TYwI25kXjAOavf77zWROZvhT8SA3ab2DPu9MAwA',
            },
            {
                'label': 'IQ.wiki — Spectra (prev. APWine Finance) history',
                'url': 'https://iq.wiki/wiki/apwine-finance',
            },
            {
                'label': 'Tech.eu — APWine raises $2.6M (Greenfield)',
                'url': 'https://tech.eu/2022/11/10/apwine-raises-2-6-million-as-it-builds-a-modular-interest-market-in-defi/',
            },
            {
                'label': 'Code4rena — 2024-02 Spectra audit report',
                'url': 'https://code4rena.com/reports/2024-02-spectra',
            },
        ],
        github='https://github.com/perspectivefi',
        credit_tag_metrics={
            "fixedIncome": {
                "mechanism": "Permissionless yield tokenization (PT/YT)",
                "maturities": ["Varies per market (permissionless creation)"],
            },
        },
    ),
    "sense": _net(
        name="Sense Finance",
        symbol="SENSE",
        tagline="Yield stripping into zero-coupon and yield tokens.",
        logo_url="https://icons.llamao.fi/icons/protocols/sense",
        description=(
            "Sense Finance is a yield-stripping protocol that decomposes yield-bearing "
            "assets into zero-coupon Principal Tokens and Yield Tokens for fixed-rate "
            "and yield-trading use cases. Verify on-chain activity before relying on it."
        ),
        differentiator=(
            "Early yield-tokenization design (Sense Space AMM); confirm current activity "
            "levels before treating its markets as live."
        ),
        sub_sector="Fixed Income",
        tags=["Fixed Income"],
        chains=["Ethereum"],
        official_docs="https://docs.sense.finance",
        website="https://sense.finance",
        twitter="https://x.com/senseprotocol",
        components=[
            {
                'name': 'Sense Divider (yield stripping)',
                'description': "Core Sense v1 contract that takes any yield-bearing asset (a 'Target', e.g. stETH or cUSDC) via an adapter and splits it into two fixed-term ERC-20 tokens for a given maturity: a Principal Token (PT, 'sP' prefix) that redeems 1-for-1 for the underlying at maturity, and a Yield Token (YT, 'sY' prefix) that claims the yield accrued until maturity. Combining PT+YT reconstitutes the Target.",
            },
            {
                'name': 'Sense Space AMM',
                'description': 'A custom fixed-rate automated market maker (a YieldSpace implementation) where PTs and YTs trade. Its key innovation is that LPs deposit the yield-bearing Target itself as the quote asset rather than the underlying; accrued Target yield is excluded from the YieldSpace invariant and reserved for LPs, so LP capital keeps earning even when no trading occurs. Space is deployed on Balancer V2 vault infrastructure and includes a TWAP oracle.',
            },
            {
                'name': 'Adapters',
                'description': "Permissionless connector contracts that onboard a specific yield-bearing asset into Sense (e.g. Lido stETH, Compound cUSDC). Adapters define how a Target's scale/underlying is read, enabling anyone to add new fixed-income markets without core-team approval.",
            },
            {
                'name': 'Roller / Auto-Roller (RLV)',
                'description': 'A Roller Liquidity Vault that automatically rolls liquidity from an expiring PT/YT series into the next maturity, letting LPs maintain continuous fixed-income exposure without manually migrating at each rollover. Audited separately by Sherlock and Fixed Point Solutions in late 2022.',
            },
        ],
        faq=[
            {
                'question': 'Is Sense Finance still operational?',
                'answer': 'No. On October 26, 2023 the Sense Core team announced it was sunsetting the Sense Protocol after ~18 months of operation, citing that the DeFi market lacked the consistent demand for fixed rates needed to sustain the protocol. Users were told to withdraw funds via app.sense.finance by December 1, 2023, after which the team stopped hosting the interface and open-sourced the UI for community use. The immutable smart contracts remain on-chain but are unmaintained.',
                'pinned': True,
            },
            {
                'question': 'How did Sense create fixed rates?',
                'answer': "Sense used yield stripping: it split a variable-yield asset (the 'Target') into a Principal Token (PT) that redeems 1-for-1 for the underlying at maturity, and a Yield Token (YT) that captures the yield until maturity. Buying a discounted PT locks in a fixed APY (e.g. paying 100 today for 105 at maturity = ~5% fixed), while YTs let speculators long future yield.",
                'pinned': False,
            },
            {
                'question': 'What was Sense Space?',
                'answer': "Space was Sense's custom fixed-rate AMM (a YieldSpace variant on Balancer V2) where PTs and YTs traded. Uniquely, LPs supplied the yield-bearing Target as the quote asset, so their capital continued earning the underlying yield even when no swaps happened, improving capital efficiency versus a vanilla YieldSpace design.",
                'pinned': False,
            },
            {
                'question': 'Did Sense have a token?',
                'answer': "No. Sense Finance never launched a governance or utility token. Its own FAQ stated plainly, 'No, we do not have a token.'",
                'pinned': False,
            },
            {
                'question': 'Which chains did Sense run on?',
                'answer': 'Ethereum Mainnet only. Sense went live on Ethereum with a guarded launch in March 2022 and never deployed to other chains; a Goerli testnet was used for development.',
                'pinned': False,
            },
            {
                'question': 'Were the contracts audited?',
                'answer': 'Yes. Sense v1 and Space were audited by Fixed Point Solutions (Kurt Barry), ABDK, Spearbit and PeckShield between November 2021 and March 2022, and the later Auto-Roller (RLV) was audited by Sherlock and Fixed Point Solutions in late 2022. Sense also ran an Immunefi bug bounty of up to $50,000.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Sense Finance (Sense Core team)',
                'role': 'Founding/development team',
                'description': 'The core team that built and operated the Sense Protocol, co-founded and led by Kenton Prescott (Co-Founder & CEO). After sunsetting Sense in October 2023, the team stated it would cease contributions to the protocol and had begun building a new project in stealth.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Zero-coupon bond / STRIPS (Treasury interest-rate strips)',
                'similarity': "A Sense Principal Token is economically a zero-coupon bond on the underlying asset: it is bought at a discount and pays out a fixed amount (the principal) at a set maturity date, locking in a fixed yield. This mirrors how TradFi STRIPS separate a coupon bond's principal from its interest payments and trade the principal as a discount instrument.",
                'differences': 'PTs are permissionless, on-chain, and reference DeFi yield-bearing assets (stETH, cUSDC) rather than sovereign/corporate credit; they carry smart-contract and Target/depeg risk rather than issuer credit risk, and have no coupon at all (the yield stream is separated into the Yield Token).',
            },
            {
                'product': 'Interest-rate strip / coupon strip',
                'similarity': 'A Sense Yield Token is analogous to the coupon strip of a bond: it isolates and trades only the future interest (yield) payments of the underlying over a fixed term, letting holders take a directional view on rates.',
                'differences': 'YTs settle continuously against the actual on-chain yield of the Target and become worthless at maturity, versus fixed, contractually scheduled coupons on a TradFi bond; pricing is set by an AMM, not a dealer market.',
            },
        ],
        events=[
            {
                'date': '2021-08-03',
                'title': 'Sense Finance raises $5.2M seed round',
                'description': 'Sense Finance announced a $5.2M seed round led by Dragonfly Capital, with participation from Robot Ventures and Bain Capital (Bain Capital Ventures), to bring fixed rates and yield trading to DeFi.',
                'link': 'https://www.coindesk.com/markets/2021/08/03/sense-finance-raises-52m-to-bring-yield-trading-to-defi',
            },
            {
                'date': '2022-03-07',
                'title': 'Sense Protocol guarded launch on Ethereum Mainnet',
                'description': 'Sense announced its guarded mainnet launch, initially supporting stETH and cUSDC at 1-month and 3-month series with conservative issuance soft/hard caps (~$100K–$400K) and a whitelisted set of adapters.',
                'link': 'https://medium.com/sensefinance/sense-protocol-guarded-launch-a9628fdf29ec',
            },
            {
                'date': '2023-10-26',
                'title': 'Sunsetting Sense announced',
                'description': "The Sense Core team published 'Sunsetting Sense and Releasing it into the Ether,' announcing it was winding down the protocol after ~18 months, citing insufficient consistent DeFi demand for fixed rates, and would open-source the UI and cease contributions.",
                'link': 'https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad',
            },
            {
                'date': '2023-12-01',
                'title': 'Withdrawal deadline / UI deprecation',
                'description': 'Deadline for users to withdraw remaining funds via app.sense.finance. After this date Sense Finance stopped hosting the interface; the front-end code was open-sourced for community use while the on-chain contracts remained but unmaintained.',
                'link': 'https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad',
            },
        ],
        timeline=[
            {
                'date': '2021-08-03',
                'title': '$5.2M seed round',
                'description': 'Seed financing led by Dragonfly Capital closes; protocol not yet launched.',
                'link': 'https://www.coindesk.com/markets/2021/08/03/sense-finance-raises-52m-to-bring-yield-trading-to-defi',
                'status': 'executed',
            },
            {
                'date': '2022-03-07',
                'title': 'Guarded mainnet launch (Sense v1 + Space)',
                'description': 'Sense v1 and the Space AMM go live on Ethereum Mainnet with capped, whitelisted stETH and cUSDC series.',
                'link': 'https://medium.com/sensefinance/sense-protocol-guarded-launch-a9628fdf29ec',
                'status': 'executed',
            },
            {
                'date': '2022-12-06',
                'title': 'Auto-Roller (RLV) audited and shipped',
                'description': 'The Roller Liquidity Vault, which auto-rolls LP liquidity into new maturities, was audited by Sherlock (final report dated Dec 2022) and Fixed Point Solutions.',
                'link': 'https://github.com/sense-finance/auto-roller/blob/515288655cd0316552cfdee87057b78e84e0637f/audits/2022.12.6_-_Final_-_Sense_Audit_Report.pdf',
                'status': 'executed',
            },
            {
                'date': '2023-10-26',
                'title': 'Protocol sunset announced',
                'description': 'Team announces wind-down and open-sourcing of the UI; contributions to the protocol cease.',
                'link': 'https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad',
                'status': 'executed',
            },
            {
                'date': '2023-12-01',
                'title': 'Interface hosting ends',
                'description': 'Final withdrawal deadline; Sense stops hosting app.sense.finance.',
                'link': 'https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Operational status',
                'value': 'Deprecated — protocol sunset announced Oct 26, 2023; UI hosting ended Dec 1, 2023 (contracts remain on-chain, unmaintained)',
                'freshness': 'static',
                'source': {
                    'label': 'Sunsetting Sense (Medium, 2023)',
                    'url': 'https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total raised',
                'value': '$5.2M seed (Aug 2021), led by Dragonfly Capital',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk (Aug 2021)',
                    'url': 'https://www.coindesk.com/markets/2021/08/03/sense-finance-raises-52m-to-bring-yield-trading-to-defi',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Chains / token',
                'value': 'Ethereum Mainnet only; never launched a token',
                'freshness': 'static',
                'source': {
                    'label': 'Sense docs FAQ',
                    'url': 'https://docs.sense.finance/docs/faq',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Systemic',
                'description': 'The protocol is deprecated: the Sense Core team ceased all contributions in October 2023 and stopped hosting the front-end on December 1, 2023. Remaining PTs/YTs and Space LP positions rely on immutable, unmaintained contracts with no team support, no active UI, and effectively no liquidity — any residual value must be interacted with directly on-chain.',
            },
            {
                'category': 'Smart Contract',
                'description': 'Sense is a complex yield-stripping system (Divider, adapters, Space AMM built on Balancer V2, and the Auto-Roller vault). Despite multiple audits, unmaintained immutable contracts cannot be patched, so any latent bug in the Divider, adapters, or Space math is permanent and unmitigable now that the team has stepped away.',
            },
            {
                'category': 'Collateral',
                'description': "Each fixed-income market depended on the specific yield-bearing Target it wrapped (e.g. Lido stETH, Compound cUSDC). Adapters were permissionless, so a poorly-chosen or compromised Target could impair the PT/YT of that series; PT redemption value is only as sound as the underlying Target and its adapter's scale accounting.",
            },
            {
                'category': 'Oracle',
                'description': "Space integrated a TWAP oracle and adapters read a Target's 'scale' to value redemptions and yield accrual. Manipulation or mispricing of the Target scale or the Space TWAP could distort PT/YT valuations and enable mispriced trades or unfair redemptions.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': "Because Targets were assets like stETH, a depeg of the underlying yield-bearing asset (e.g. stETH trading below ETH) would directly reduce the redemption value of the corresponding Principal Tokens, transmitting the underlying's peg risk to Sense fixed-income holders.",
            },
        ],
        competitors=[
            {
                'name': 'Pendle',
                'slug': 'pendle',
                'rank': 1,
                'positioning': "The dominant yield-tokenization protocol and the closest analogue to Sense's model.",
                'similarities': 'Splits yield-bearing assets into principal and yield tokens (PT/YT) and provides a custom AMM for fixed-rate and yield trading — the same core mechanic Sense pioneered.',
                'differences': 'Pendle scaled to multiple chains and billions in TVL and remains highly active, whereas Sense stayed Ethereum-only, never launched a token, and wound down in 2023. Pendle has a live PENDLE token and vote-escrow governance; Sense had neither.',
            },
            {
                'name': 'Spectra (formerly APWine)',
                'slug': 'spectra',
                'rank': 2,
                'positioning': 'Permissionless yield-tokenization / fixed-rate protocol competing directly in the PT/YT space.',
                'similarities': "Also tokenizes future yield of yield-bearing assets into principal and yield components with an AMM for trading, mirroring Sense's design goals.",
                'differences': 'Spectra remains an active, multi-deployment protocol; Sense is deprecated. Different AMM design and governance/token model.',
            },
            {
                'name': 'Notional Finance',
                'slug': 'notional',
                'rank': 3,
                'positioning': 'Fixed-rate lending/borrowing protocol using fCash rather than yield stripping.',
                'similarities': 'Targets the same DeFi fixed-income market — letting users lock in fixed rates over defined maturities.',
                'differences': 'Notional uses fCash tokens and a liquidity-curve AMM for fixed-rate lending/borrowing rather than stripping an external Target into PT/YT; it remains active and has the NOTE governance token.',
            },
        ],
        partnerships=[
            {
                'name': 'Morpho',
                'date': '2023-10-26',
                'amountLabel': None,
                'description': "Sense participated in Morpho's early liquidity-mining program; Sense's sunset notice told users that $MORPHO rewards earned through Age 7 (Oct 4, 2023) would be claimable once made transferable by Morpho Governance.",
            },
        ],
        investment_rounds=[
            {
                'date': '2021-08-03',
                'round': 'Seed',
                'amountUsd': 5200000,
                'amountLabel': '$5.2M',
                'investors': [
                    'Dragonfly Capital',
                    'Robot Ventures',
                    'Bain Capital',
                ],
                'link': 'https://www.coindesk.com/markets/2021/08/03/sense-finance-raises-52m-to-bring-yield-trading-to-defi',
            },
        ],
        audits=[
            {
                'firm': 'PeckShield',
                'date': '2021-11-07',
                'url': 'https://github.com/sense-finance/sense-v1/blob/dc568046c481e4a15f8a6c7b2fc0f96a5b398e1c/audits/peckshield/2021-11-07.pdf',
            },
            {
                'firm': 'Spearbit',
                'date': '2022-01-21',
                'url': 'https://github.com/sense-finance/sense-v1/blob/dc568046c481e4a15f8a6c7b2fc0f96a5b398e1c/audits/spearbit/2022-01-21.pdf',
            },
            {
                'firm': 'Fixed Point Solutions (Kurt Barry)',
                'date': '2022-03-15',
                'url': 'https://github.com/sense-finance/sense-v1/blob/dc568046c481e4a15f8a6c7b2fc0f96a5b398e1c/audits/fps/2022-03-15.pdf',
            },
            {
                'firm': 'ABDK',
                'date': '2022-03-18',
                'url': 'https://github.com/sense-finance/sense-v1/blob/dc568046c481e4a15f8a6c7b2fc0f96a5b398e1c/audits/abdk/2022-03-18-part1.pdf',
            },
            {
                'firm': 'Sherlock',
                'date': '2022-12-06',
                'url': 'https://github.com/sense-finance/auto-roller/blob/515288655cd0316552cfdee87057b78e84e0637f/audits/2022.12.6_-_Final_-_Sense_Audit_Report.pdf',
            },
        ],
        sources=[
            {
                'label': 'Sense docs FAQ (wind-down notice + mechanics)',
                'url': 'https://docs.sense.finance/docs/faq',
            },
            {
                'label': 'Sense docs — Security & audits',
                'url': 'https://docs.sense.finance/developers/security/',
            },
            {
                'label': 'Sunsetting Sense (Medium, Oct 26 2023)',
                'url': 'https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad',
            },
            {
                'label': 'Sense Protocol Guarded Launch (Medium, Mar 2022)',
                'url': 'https://medium.com/sensefinance/sense-protocol-guarded-launch-a9628fdf29ec',
            },
            {
                'label': 'CoinDesk — Sense raises $5.2M (Aug 2021)',
                'url': 'https://www.coindesk.com/markets/2021/08/03/sense-finance-raises-52m-to-bring-yield-trading-to-defi',
            },
            {
                'label': 'Sense v1 smart contracts (GitHub)',
                'url': 'https://github.com/sense-finance/sense-v1',
            },
            {
                'label': 'Sense Space v1 (GitHub)',
                'url': 'https://github.com/sense-finance/space-v1',
            },
        ],
        github='https://github.com/sense-finance',
        credit_tag_metrics={
            "fixedIncome": {
                "mechanism": "Zero-coupon / yield stripping (PT/YT)",
                "maturities": ["Varies per Sense Space maturity"],
            },
        },
    ),
}

# Per-network MemberCoin audit registry (expected count + rationale).
# Used by validate_taxonomy.py --report-member-coins; does not enforce caps at ingest.
LENDING_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    "aave": {
        "expected": "multi",
        "rationale": "GHO/sGHO/stkGHO + AAVE/stkAAVE + aToken receipts",
    },
    "compound": {"expected": 1, "rationale": "COMP governance only"},
    "justlend": {"expected": 1, "rationale": "JST governance only"},
    "venus": {
        "expected": 1,
        "rationale": "XVS governance; VAI is product stablecoin (copy only, not MemberCoin)",
    },
    "morpho": {"expected": 1, "rationale": "MORPHO governance"},
    "kamino": {"expected": 1, "rationale": "KMNO governance"},
    "spark": {
        "expected": 3,
        "rationale": "SPK + cross-refs to Sky parent (sky-gov, USDS)",
        "notes": "sky-gov/USDS EntitySlug=sky, not spark — intentional parent link",
    },
    "fluid": {"expected": 1, "rationale": "FLUID governance"},
    "maple": {
        "expected": "multi",
        "rationale": "SYRUP/stSYRUP/OFT + syrupUSDC/syrupUSDT pool tokens",
        "action_hint": "review_multi_coin",
    },
}

from dex_specs import DEX_MEMBER_COIN_AUDIT  # noqa: E402
from rwa_specs import RWA_MEMBER_COIN_AUDIT  # noqa: E402
from stablecoin_specs import STABLECOIN_MEMBER_COIN_AUDIT  # noqa: E402

ALL_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    **LENDING_MEMBER_COIN_AUDIT,
    **STABLECOIN_MEMBER_COIN_AUDIT,
    **RWA_MEMBER_COIN_AUDIT,
    **DEX_MEMBER_COIN_AUDIT,
}

# Back-compat alias for scripts that imported the lending-only name.
ALL_LENDING_MEMBER_COIN_AUDIT = ALL_MEMBER_COIN_AUDIT
