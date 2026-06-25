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


def _net(
    *,
    name: str,
    symbol: str,
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
    events: Optional[List[Dict[str, Any]]] = None,
    scale_labels: Optional[Dict[str, str]] = None,
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
        "current_scale": _empty_scale(),
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
        "portal_defaults": _portal_defaults(chains),
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


LENDING_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    "morpho": _net(
        name="Morpho",
        symbol="MORPHO",
        tagline="Customizable lending infrastructure — isolated markets + curated vaults.",
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
        tagline="Omnichain money market via LayerZero.",
        description=(
            "Radiant Capital is a cross-chain money market that lets users deposit on one "
            "chain and borrow on another, unifying fragmented liquidity through LayerZero."
        ),
        differentiator=(
            "Omnichain lending — deposits and borrows are bridged across chains via "
            "LayerZero rather than confined to a single network's liquidity."
        ),
        sub_sector="Money Markets",
        tags=[],
        chains=["Arbitrum", "Ethereum", "BSC", "Base"],
        official_docs="https://docs.radiant.capital",
        website="https://radiant.capital",
        twitter="https://x.com/RDNTCapital",
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
        tagline="Tokenized yield — split principal and yield (PT/YT).",
        description=(
            "Pendle tokenizes yield-bearing assets into Principal Tokens (PT) and Yield "
            "Tokens (YT), creating an on-chain market for fixed-rate yield and yield "
            "speculation/hedging."
        ),
        differentiator=(
            "The dominant yield-tokenization market: PT buyers lock a fixed rate, YT "
            "buyers go long yield — a true fixed-income primitive for DeFi."
        ),
        sub_sector="Fixed Income",
        tags=["Fixed Income"],
        chains=["Ethereum", "Arbitrum", "Base", "Mantle", "BSC"],
        official_docs="https://docs.pendle.finance",
        website="https://www.pendle.finance",
        twitter="https://x.com/pendle_fi",
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
        credit_tag_metrics={
            "fixedIncome": {
                "mechanism": "Permissionless yield tokenization (PT/YT)",
            },
        },
    ),
    "sense": _net(
        name="Sense Finance",
        symbol="SENSE",
        tagline="Yield stripping into zero-coupon and yield tokens.",
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
        credit_tag_metrics={
            "fixedIncome": {
                "mechanism": "Zero-coupon / yield stripping (PT/YT)",
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
