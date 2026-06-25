#!/usr/bin/env python3
"""
Staking-network specs (canhav-staking-implementation-spec §5/§6).

The pure-play Staking entities that join the Network -> Protocol -> Staking
taxonomy, each tagged with a staking sub-sector (Liquid Staking / Restaking /
Liquid Restaking) and 0+ secondary tags. These mirror the lending_specs.py
pattern: live Tier-1 metrics (totalStakedUsd, tvlChangePct, token price/mcap,
base-asset exchange rate, fees, derived marketSharePct) are filled by the
DeFiLlama + CoinGecko cron pass (app/api/cron/refresh + lib/server/staking.ts).
Tier-2 fields (validators, AVS exposure, slashing, governance) stay curated/null
until per-protocol indexers are wired.

Resolver ids (llamaSlug / coingeckoId) live in frontend/data/staking-seed.ts and
the cron maps (LLAMA_PROTOCOL_SLUGS / NETWORK_COINGECKO_IDS). Frax is handled as
`extend-existing` in ingest_entities.py (primary Stablecoin + secondary Staking)
and is intentionally NOT duplicated here.

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


def _net(
    *,
    name: str,
    symbol: str,
    tagline: str,
    description: str,
    differentiator: str,
    staking_sub_sector: str,
    staking_secondary_tags: List[str],
    chains: List[str],
    underlying_asset: str = "ETH",
    operator_model: Optional[str] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    github: Optional[str] = None,
    competitors: Optional[List[Dict[str, Any]]] = None,
    member_coins: Optional[List[Dict[str, Any]]] = None,
    scale_labels: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Build a Staking-network spec with the editorial defaults `build_entity_item`
    expects. `staking` holds the curated Tier-2 block; the cron overlays Tier-1
    live fields (totalStakedUsd, token price/mcap, exchange rate, fees, share)."""
    staking: Dict[str, Any] = {"underlyingAsset": underlying_asset}
    if operator_model is not None:
        staking["operatorModel"] = operator_model
    staking["deployment"] = {"chains": chains, "evmCompatible": "yes"}

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
        "scale_labels": scale_labels or {"tvl": "Total staked"},
        # Taxonomy hierarchy.
        "sub_category": "Protocol",
        "sector": "Staking",
        "sub_sector": staking_sub_sector,
        "staking_sub_sector": staking_sub_sector,
        "staking_secondary_tags": staking_secondary_tags,
        "staking": staking,
        # Staking entities carry no `Tags` (that vocabulary is Credit-only).
        "tags": [],
        "competitors": competitors or [],
        "member_coins": member_coins or [],
        "portal_defaults": _portal_defaults(chains),
    }


STAKING_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ---------------------------- LIQUID STAKING ----------------------------
    "lido": _net(
        name="Lido",
        symbol="stETH",
        tagline="The largest Ethereum liquid staking protocol.",
        description=(
            "Lido lets users stake ETH and receive stETH, a rebasing liquid staking "
            "token that accrues daily staking rewards while staying usable across DeFi."
        ),
        differentiator=(
            "Deepest liquidity and broadest DeFi integration of any LST; staking is "
            "delegated across a DAO-curated set of professional node operators."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["Non-Custodial"],
        chains=["Ethereum"],
        operator_model="DAO-curated professional node operator set; moving toward DVT (SimpleDVT).",
        official_docs="https://docs.lido.fi",
        website="https://lido.fi",
        twitter="https://x.com/LidoFinance",
        github="https://github.com/lidofinance",
    ),
    "rocket-pool": _net(
        name="Rocket Pool",
        symbol="rETH",
        tagline="Decentralized, permissionless ETH liquid staking.",
        description=(
            "Rocket Pool issues rETH, a non-rebasing liquid staking token whose "
            "exchange rate appreciates versus ETH as rewards accrue, backed by a "
            "permissionless network of node operators."
        ),
        differentiator=(
            "Anyone can run a node by posting reduced ETH collateral plus RPL bond — "
            "the most decentralized operator set among major LSTs."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["Non-Custodial", "Permissionless-Operators"],
        chains=["Ethereum"],
        operator_model="Permissionless node operators (8/16 ETH minipools + RPL bond).",
        official_docs="https://docs.rocketpool.net",
        website="https://rocketpool.net",
        twitter="https://x.com/Rocket_Pool",
        github="https://github.com/rocket-pool",
    ),
    "binance-wbeth": _net(
        name="Binance",
        symbol="wBETH",
        tagline="Exchange-native wrapped beacon ETH.",
        description=(
            "Binance's wBETH is a wrapped, reward-bearing ETH staking token (1 wBETH = "
            "1 BETH plus accrued staking rewards) issued by the exchange's staking service."
        ),
        differentiator=(
            "Exchange-native distribution and liquidity; wBETH is usable on-chain and "
            "across the Binance ecosystem."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["Exchange-Native"],
        chains=["Ethereum", "Binance"],
        operator_model="Centralized exchange-operated validators (custodial issuance).",
        official_docs="https://www.binance.com/en/wbeth",
        website="https://www.binance.com/en/wbeth",
        twitter="https://x.com/binance",
    ),
    "coinbase-cbeth": _net(
        name="Coinbase",
        symbol="cbETH",
        tagline="Exchange-native ETH liquid staking.",
        description=(
            "Coinbase Wrapped Staked ETH (cbETH) is a non-rebasing liquid staking token "
            "representing ETH staked through Coinbase, redeemable for the underlying plus rewards."
        ),
        differentiator=(
            "Backed by a regulated US exchange; cbETH provides liquid access to "
            "Coinbase-operated staking."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["Exchange-Native"],
        chains=["Ethereum", "Base"],
        operator_model="Centralized exchange-operated validators (custodial issuance).",
        official_docs="https://www.coinbase.com/cbeth",
        website="https://www.coinbase.com/cbeth",
        twitter="https://x.com/coinbase",
    ),
    "mantle-meth": _net(
        name="Mantle",
        symbol="mETH",
        tagline="L2-ecosystem ETH liquid staking.",
        description=(
            "Mantle Staked Ether (mETH) is a non-rebasing liquid staking token that is "
            "the staking backbone of the Mantle ecosystem, accruing ETH staking rewards."
        ),
        differentiator=(
            "Backed by the Mantle treasury and tightly integrated with the Mantle L2 "
            "ecosystem and its DeFi venues."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["L2-Ecosystem", "Non-Custodial"],
        chains=["Ethereum", "Mantle"],
        operator_model="Curated node operators under the mETH Protocol governance.",
        official_docs="https://docs.mantle.xyz/meth",
        website="https://www.mantle.xyz/meth",
        twitter="https://x.com/0xMantle",
    ),
    "swell": _net(
        name="Swell",
        symbol="swETH",
        tagline="Non-custodial liquid staking and restaking.",
        description=(
            "Swell issues swETH, a non-rebasing liquid staking token, alongside a "
            "restaking product line, letting users earn staking yield plus ecosystem rewards."
        ),
        differentiator=(
            "LST plus a native restaking roadmap (rswETH / Swellchain) under one "
            "non-custodial protocol."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["Non-Custodial"],
        chains=["Ethereum"],
        operator_model="Curated/permissioned operator set with DVT integrations.",
        official_docs="https://docs.swellnetwork.io",
        website="https://www.swellnetwork.io",
        twitter="https://x.com/swellnetworkio",
    ),
    "stader": _net(
        name="Stader Labs",
        symbol="ETHx",
        tagline="Multi-chain liquid staking infrastructure.",
        description=(
            "Stader's ETHx is a non-rebasing Ethereum liquid staking token built on a "
            "multi-pool architecture (permissioned + permissionless operators), part of "
            "Stader's multi-chain staking stack."
        ),
        differentiator=(
            "Multi-chain staking platform with a dual operator-pool design that lowers "
            "the bond to run a node."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["Non-Custodial", "Multi-Chain"],
        chains=["Ethereum"],
        operator_model="Hybrid permissioned + permissionless operator pools.",
        official_docs="https://docs.staderlabs.com",
        website="https://www.staderlabs.com",
        twitter="https://x.com/staderlabs",
    ),
    "stakewise": _net(
        name="StakeWise",
        symbol="osETH",
        tagline="Permissionless, overcollateralized ETH staking.",
        description=(
            "StakeWise V3 lets users stake into solo or curated vaults and mint osETH, "
            "an overcollateralized liquid staking token, keeping rewards within the vault."
        ),
        differentiator=(
            "Vault-based architecture where anyone can launch a staking vault; osETH is "
            "overcollateralized and protocol-insured."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["Non-Custodial"],
        chains=["Ethereum"],
        operator_model="Permissionless vaults (solo + curated operators).",
        official_docs="https://docs.stakewise.io",
        website="https://www.stakewise.io",
        twitter="https://x.com/stakewise_io",
    ),
    "ankr": _net(
        name="Ankr",
        symbol="ankrETH",
        tagline="Multi-chain liquid staking and node infrastructure.",
        description=(
            "Ankr's ankrETH is a reward-bearing liquid staking token for Ethereum, part "
            "of Ankr's broader multi-chain staking and RPC node infrastructure."
        ),
        differentiator=(
            "Liquid staking across many chains backed by Ankr's global node "
            "infrastructure business."
        ),
        staking_sub_sector="Liquid Staking",
        staking_secondary_tags=["Multi-Chain", "Non-Custodial"],
        chains=["Ethereum"],
        operator_model="Ankr-operated validators across multiple chains.",
        official_docs="https://www.ankr.com/docs",
        website="https://www.ankr.com",
        twitter="https://x.com/ankr",
    ),
    # ------------------------------ RESTAKING -------------------------------
    "eigenlayer": _net(
        name="EigenLayer",
        symbol="EIGEN",
        tagline="Restaking — reuse staked ETH to secure new services.",
        description=(
            "EigenLayer (EigenCloud) is the pioneering restaking protocol: ETH stakers "
            "and LST holders restake to extend cryptoeconomic security to Actively "
            "Validated Services (AVSs) in exchange for additional rewards."
        ),
        differentiator=(
            "Created the restaking primitive; the largest pool of restaked security and "
            "the base layer most LRTs build on."
        ),
        staking_sub_sector="Restaking",
        staking_secondary_tags=["Multi-Asset", "Non-Custodial"],
        chains=["Ethereum"],
        operator_model="Permissionless operators register to run AVSs; stakers delegate to operators.",
        official_docs="https://docs.eigencloud.xyz",
        website="https://www.eigencloud.xyz",
        twitter="https://x.com/eigenlayer",
        github="https://github.com/Layr-Labs",
    ),
    "symbiotic": _net(
        name="Symbiotic",
        symbol="SYMB",
        tagline="Permissionless, multi-asset shared security.",
        description=(
            "Symbiotic is a permissionless restaking protocol where any ERC-20 (not just "
            "ETH) can be used as collateral to secure networks, with modular vaults and "
            "operator delegation."
        ),
        differentiator=(
            "Asset-agnostic and modular — networks choose collateral assets, operators, "
            "and slashing logic, unlike ETH-centric restaking."
        ),
        staking_sub_sector="Restaking",
        staking_secondary_tags=["Multi-Asset", "Non-Custodial"],
        chains=["Ethereum"],
        operator_model="Permissionless vaults + operators; networks set their own rules.",
        official_docs="https://docs.symbiotic.fi",
        website="https://symbiotic.fi",
        twitter="https://x.com/symbioticfi",
    ),
    "karak": _net(
        name="Karak",
        symbol="KARAK",
        tagline="Multi-asset, multi-chain restaking.",
        description=(
            "Karak is a restaking layer that accepts a broad range of assets across "
            "multiple chains to secure Distributed Secure Services (DSS). DeFiLlama has "
            "no live adapter as of 2026-06-25, so metrics are curated until resolved."
        ),
        differentiator=(
            "Broad multi-asset, multi-chain collateral support with its own DSS "
            "framework and the K2 testnet sandbox."
        ),
        staking_sub_sector="Restaking",
        staking_secondary_tags=["Multi-Asset", "Multi-Chain"],
        chains=["Ethereum", "Arbitrum"],
        operator_model="Operators secure DSS; multi-chain collateral deposits.",
        official_docs="https://docs.karak.network",
        website="https://karak.network",
        twitter="https://x.com/Karak_Network",
    ),
    # -------------------------- LIQUID RESTAKING ----------------------------
    "ether-fi": _net(
        name="Ether.fi",
        symbol="weETH",
        tagline="Leading non-custodial liquid restaking.",
        description=(
            "Ether.fi is a decentralized, non-custodial liquid restaking protocol; users "
            "stake ETH for eETH (wrapped as weETH) which restakes via EigenLayer to earn "
            "staking plus restaking rewards."
        ),
        differentiator=(
            "Largest liquid restaking protocol; users keep control of their validator "
            "keys, plus a Cash/DeFi product suite on top of weETH."
        ),
        staking_sub_sector="Liquid Restaking",
        staking_secondary_tags=["Non-Custodial"],
        chains=["Ethereum"],
        operator_model="Non-custodial — stakers retain key control; restakes via EigenLayer.",
        official_docs="https://docs.ether.fi",
        website="https://www.ether.fi",
        twitter="https://x.com/ether_fi",
    ),
    "renzo": _net(
        name="Renzo",
        symbol="ezETH",
        tagline="EigenLayer strategy manager and LRT issuer.",
        description=(
            "Renzo issues ezETH, a liquid restaking token that abstracts EigenLayer "
            "operator and AVS selection so users get diversified restaking exposure from "
            "a single deposit."
        ),
        differentiator=(
            "Acts as a strategy manager on top of EigenLayer — handling operator/AVS "
            "selection and reward optimization for ezETH holders."
        ),
        staking_sub_sector="Liquid Restaking",
        staking_secondary_tags=["EigenLayer-Strategy-Manager"],
        chains=["Ethereum"],
        operator_model="Curated EigenLayer operator set selected by Renzo strategy management.",
        official_docs="https://docs.renzoprotocol.com",
        website="https://www.renzoprotocol.com",
        twitter="https://x.com/RenzoProtocol",
    ),
    "kelp-dao": _net(
        name="Kelp DAO",
        symbol="rsETH",
        tagline="LST-backed liquid restaking basket.",
        description=(
            "Kelp DAO's rsETH is a liquid restaking token backed by a basket of accepted "
            "LSTs (e.g. stETH, ETHx), giving diversified restaking exposure with liquidity."
        ),
        differentiator=(
            "Accepts multiple LSTs as deposits into a single rsETH basket, diversifying "
            "underlying staking exposure."
        ),
        staking_sub_sector="Liquid Restaking",
        staking_secondary_tags=["LST-Backed-Basket"],
        chains=["Ethereum"],
        operator_model="Restakes deposited LSTs via EigenLayer through curated operators.",
        official_docs="https://docs.kelpdao.xyz",
        website="https://www.kelpdao.xyz",
        twitter="https://x.com/KelpDAO",
    ),
    "puffer": _net(
        name="Puffer Finance",
        symbol="pufETH",
        tagline="Native liquid restaking with anti-slashing.",
        description=(
            "Puffer is a native liquid restaking protocol issuing pufETH; its Secure-"
            "Signer / RAVe anti-slashing technology lets node operators run with reduced "
            "bond while restaking on EigenLayer."
        ),
        differentiator=(
            "Native restaking with hardware-enforced anti-slashing, lowering the capital "
            "and risk to operate a restaked validator."
        ),
        staking_sub_sector="Liquid Restaking",
        staking_secondary_tags=["Native-Restaking", "Non-Custodial"],
        chains=["Ethereum"],
        operator_model="Permissionless operators with Secure-Signer anti-slashing; native restaking.",
        official_docs="https://docs.puffer.fi",
        website="https://www.puffer.fi",
        twitter="https://x.com/puffer_finance",
    ),
    "bedrock": _net(
        name="Bedrock",
        symbol="uniETH",
        tagline="Multi-asset liquid restaking (uniETH / uniBTC).",
        description=(
            "Bedrock is a multi-asset liquid restaking protocol; uniETH is its ETH "
            "liquid restaking token, backed by staked/restaked ETH and designed with "
            "institutional-grade standards."
        ),
        differentiator=(
            "Multi-asset LRT suite (ETH and BTC) with an institutional design "
            "partnership (RockX)."
        ),
        staking_sub_sector="Liquid Restaking",
        staking_secondary_tags=["LST-Backed-Basket"],
        chains=["Ethereum"],
        operator_model="Restakes via EigenLayer through curated operators.",
        official_docs="https://docs.bedrock.technology",
        website="https://www.bedrock.technology",
        twitter="https://x.com/Bedrock_DeFi",
    ),
    "yieldnest": _net(
        name="YieldNest",
        symbol="ynETH",
        tagline="Curated liquid restaking baskets (MAX LRTs).",
        description=(
            "YieldNest issues ynETH and other 'MAX' liquid restaking tokens that bundle "
            "curated AVS and strategy exposure into risk-managed baskets."
        ),
        differentiator=(
            "Opinionated, curated LRT baskets ('MAX' tokens) that package AVS selection "
            "and risk management for users."
        ),
        staking_sub_sector="Liquid Restaking",
        staking_secondary_tags=["LST-Backed-Basket"],
        chains=["Ethereum"],
        operator_model="Curated AVS/operator baskets managed by YieldNest.",
        official_docs="https://docs.yieldnest.finance",
        website="https://www.yieldnest.finance",
        twitter="https://x.com/YieldNestFi",
    ),
}
