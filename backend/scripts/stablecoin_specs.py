#!/usr/bin/env python3
"""
Stablecoin-issuer specs (PDF "STABLECOIN_SECTOR_EXPANSION").

The 18 new stablecoin issuers that join the existing cohort (Ethena, Sky,
Stably, TrueUSD, USD.AI, Monerium, Tether, Circle-as-coin, etc.) under the
Network -> Protocol -> Stablecoin taxonomy, each tagged with its stablecoin
sub-sector (PDF §1) and 0-2 secondary tags:

    Fiat-Backed Regulated ... Circle, Paxos, First Digital, M^0, Agora, Bitget
    E-Money Regulated ....... GMO Trust
    Decentralized CDP ....... Liquity, Curve (crvUSD), Lista DAO, Reserve
    Synthetic Yield-Bearing . Frax, Resolv, Falcon, Cap, Elixir (wound-down)
    RWA-Backed Stable ....... Anzen, Mountain Protocol (wound-down)

These dicts are merged into ENTITY_SPECS by ingest_entities.py and flattened to
store items by `build_entity_item`. Live supply (currentSupplyUsd / per-chain
breakdown) is filled by the DeFi Llama cron pass for issuers with a mapped Llama
stablecoin id; the curated string/array fields below are static research that
DeFi Llama does not expose. Supply figures embedded here are USD-equivalent
circulating as of the PDF capture date (2026-06-18).

Stdlib only.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

_CAPTURED_AT = "2026-06-18"


def _sourced(value: Optional[float]) -> Dict[str, Any]:
    return {
        "value": value,
        "dataSource": "derived",
        "sourceLabel": f"DeFi Llama / issuer docs ({_CAPTURED_AT})",
        "updatedAt": None,
    }


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


def _reg_fact(value: str, source_label: str, source_url: str) -> Dict[str, Any]:
    return {
        "key": "regulatoryStatus",
        "value": value,
        "freshness": "static",
        "source": {"label": source_label, "url": source_url},
        "capturedAt": _CAPTURED_AT,
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
    regulatory_status: str,
    stablecoin: Dict[str, Any],
    member_coins: List[Dict[str, Any]],
    chains: List[str],
    competitors: Optional[List[Dict[str, Any]]] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    discord: Optional[str] = None,
    github: Optional[str] = None,
    risks: Optional[List[Dict[str, str]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    scale_labels: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Build a stablecoin-issuer spec, filling the editorial defaults that
    `build_entity_item` expects so each entry stays focused on real content."""
    offchain_facts: List[Dict[str, Any]] = []
    if regulatory_status:
        offchain_facts.append(_reg_fact(regulatory_status, name, website or official_docs or ""))
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
        "scale_labels": scale_labels or {"tvl": "Circulating supply"},
        "offchain_facts": offchain_facts or None,
        # Taxonomy hierarchy.
        "sub_category": "Protocol",
        "sector": "Stablecoin",
        "sub_sector": sub_sector,
        # `tags` is the lending-tag vocabulary on NetworkProfile; keep it empty
        # for stablecoin issuers and use the dedicated stablecoin fields below.
        "tags": [],
        "stablecoin_sub_sector": sub_sector,
        "stablecoin_secondary_tags": secondary_tags,
        "competitors": competitors or [_USDC_COMPETITOR],
        "stablecoin": stablecoin,
        "member_coins": member_coins,
        "portal_defaults": _portal_defaults(chains),
    }


# Reusable competitor entry pointing back at Circle/USDC (the reference brand).
_USDC_COMPETITOR = {
    "name": "Circle (USDC)",
    "slug": "circle",
    "rank": 1,
    "positioning": "Largest regulated fiat-backed dollar.",
    "similarities": "Both issue a USD-pegged stablecoin redeemable against reserves.",
    "differences": (
        "USDC is the deepest, most widely integrated regulated fiat-backed dollar "
        "with monthly Deloitte attestations and a public-company issuer."
    ),
}

_USDT_COMPETITOR = {
    "name": "Tether (USDT)",
    "slug": "tether",
    "rank": 2,
    "positioning": "Largest stablecoin by supply.",
    "similarities": "Both target a 1:1 USD peg with fiat/T-bill reserves.",
    "differences": "USDT has the broadest exchange liquidity but lighter disclosure.",
}


def _coin(
    slug: str,
    name: str,
    symbol: str,
    role: str,
    sub_category: str = "Stablecoin",
) -> Dict[str, Any]:
    return {
        "slug": slug,
        "name": name,
        "symbol": symbol,
        "category": "Stablecoin",
        "role": role,
        "subCategory": sub_category,
    }


STABLECOIN_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ---- Fiat-Backed Regulated ------------------------------------------
    "circle": _net(
        name="Circle",
        symbol="USDC",
        tagline="The largest regulated dollar stablecoin issuer.",
        description=(
            "Circle Internet Financial issues USDC and EURC, fully reserved fiat "
            "stablecoins backed by cash and short-term U.S. Treasuries held with "
            "regulated custodians, with monthly third-party attestations."
        ),
        differentiator=(
            "Only public-company major issuer (NYSE: CRCL); dual USDC + EURC "
            "products under NYDFS, EU MiCA EMI, and Singapore MAS regimes."
        ),
        sub_sector="Fiat-Backed Regulated",
        secondary_tags=["Multi-Currency"],
        regulatory_status=(
            "NYDFS BitLicense; EU MiCA EMI (Circle Internet Financial Europe SAS, "
            "ACPR France); Singapore MAS license; NYSE: CRCL (public June 2025)."
        ),
        official_docs="https://www.circle.com/transparency",
        website="https://www.circle.com",
        twitter="https://x.com/circle",
        github="https://github.com/circlefin",
        chains=["Ethereum", "Solana", "Base", "Arbitrum", "Polygon"],
        competitors=[_USDT_COMPETITOR],
        stablecoin={
            "reserves": "Cash + short-term U.S. Treasuries at the BlackRock USDC Reserve Fund and BNY Mellon.",
            "pegMechanism": "Fiat reserve, 1:1 mint/redeem.",
            "auditHistory": "Deloitte monthly attestations.",
            "attestationUrl": "https://www.circle.com/transparency",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(75_400_000_000),
            "riskEvents": [
                {
                    "date": "2023-03",
                    "type": "Depeg",
                    "impact": "USDC briefly fell to ~$0.88 after $3.3B of reserves were stuck at the failed Silicon Valley Bank; restored within days.",
                    "link": "https://www.circle.com",
                }
            ],
            "deployment": {
                "chains": ["Ethereum", "Solana", "Base", "Arbitrum", "Polygon", "+11 more"],
                "evmCompatible": "mixed",
                "notes": "USDC native on 16+ chains; EURC on 8+.",
            },
            "subSectorMetrics": {
                "kind": "fiat-backed",
                "reserveCustodian": "BlackRock USDC Reserve Fund + BNY Mellon",
                "reserveBreakdown": [
                    {"asset": "Short-term U.S. Treasuries", "pct": 80},
                    {"asset": "Cash at regulated banks", "pct": 20},
                ],
                "attestationCadence": "monthly",
                "attestor": "Deloitte",
                "realtimeReserveOracle": None,
            },
        },
        member_coins=[
            _coin("usdc", "USD Coin", "USDC", "Primary regulated dollar"),
            _coin("eurc", "Euro Coin", "EURC", "Regulated euro stablecoin"),
        ],
    ),
    "paxos": _net(
        name="Paxos",
        symbol="USDP",
        tagline="Regulated white-label stablecoin issuer.",
        description=(
            "Paxos Trust Company issues USDP and white-labels regulated dollars for "
            "partners — PayPal USD (PYUSD) and the Global Dollar (USDG) — under its "
            "NYDFS trust charter."
        ),
        differentiator=(
            "Only major white-label issuer with both NYDFS + MAS licenses, letting "
            "partners (PayPal, Global Dollar Network) launch under its regulatory wrapper."
        ),
        sub_sector="Fiat-Backed Regulated",
        secondary_tags=["Institutional-Gated"],
        regulatory_status=(
            "NYDFS trust charter; MAS Singapore (Paxos Digital Singapore); DFSA Dubai "
            "(Paxos International MENA)."
        ),
        official_docs="https://paxos.com/transparency",
        website="https://paxos.com",
        twitter="https://x.com/paxos",
        github="https://github.com/paxosglobal",
        chains=["Ethereum", "Solana", "Arbitrum", "BSC"],
        stablecoin={
            "reserves": "Cash and U.S. Treasury bills held in bankruptcy-remote accounts.",
            "pegMechanism": "Fiat reserve, 1:1 mint/redeem.",
            "auditHistory": "WithumSmith+Brown monthly attestations.",
            "attestationUrl": "https://paxos.com/transparency",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(5_500_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Solana", "Arbitrum", "BSC", "Gnosis", "Ink", "X Layer", "Hyperliquid"],
                "evmCompatible": "mixed",
                "notes": "USDG primary on Solana; PYUSD on Ethereum/Solana/Arbitrum.",
            },
            "subSectorMetrics": {
                "kind": "fiat-backed",
                "reserveCustodian": "Paxos Trust (bankruptcy-remote)",
                "reserveBreakdown": [
                    {"asset": "U.S. Treasury bills", "pct": 90},
                    {"asset": "Cash", "pct": 10},
                ],
                "attestationCadence": "monthly",
                "attestor": "WithumSmith+Brown",
                "realtimeReserveOracle": None,
            },
        },
        member_coins=[
            _coin("usdp", "Pax Dollar", "USDP", "Paxos-native regulated dollar"),
            _coin("pyusd", "PayPal USD", "PYUSD", "PayPal-branded dollar issued by Paxos"),
            _coin("usdg", "Global Dollar", "USDG", "Global Dollar Network stablecoin"),
            _coin("usdl", "Lift Dollar", "USDL", "Wound-down yield-bearing dollar (2025)"),
        ],
    ),
    "first-digital": _net(
        name="First Digital",
        symbol="FDUSD",
        tagline="Hong Kong trust-custody dollar stablecoin.",
        description=(
            "First Digital Labs issues FDUSD, a fiat-backed dollar with reserves held "
            "in a Hong Kong registered trust; positioned as the Binance-ecosystem "
            "successor to BUSD."
        ),
        differentiator="Major HK-trust-custody stablecoin with deep BSC liquidity.",
        sub_sector="Fiat-Backed Regulated",
        secondary_tags=["Recently-Exploited"],
        regulatory_status=(
            "First Digital Trust Limited (Hong Kong registered trust); pending HK VASP "
            "under the new stablecoin regime."
        ),
        official_docs="https://firstdigitallabs.com",
        website="https://firstdigitallabs.com",
        twitter="https://x.com/FDLabsHQ",
        chains=["BSC", "Ethereum", "Arbitrum", "Solana", "Sui", "TON"],
        stablecoin={
            "reserves": "Cash and short-term Treasuries held in a Hong Kong trust.",
            "pegMechanism": "Fiat reserve, 1:1 mint/redeem.",
            "auditHistory": "Prescient Assurance monthly attestations.",
            "attestationUrl": "https://firstdigitallabs.com",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(352_000_000),
            "riskEvents": [
                {
                    "date": "2025-04",
                    "type": "Depeg",
                    "impact": "FDUSD briefly depegged amid solvency allegations; recovered but supply fell from a ~$3B 2024 peak.",
                    "link": "https://firstdigitallabs.com",
                }
            ],
            "deployment": {
                "chains": ["BSC", "Ethereum", "Arbitrum", "Solana", "Sui", "TON"],
                "evmCompatible": "mixed",
                "notes": "BSC-primary, multi-chain.",
            },
            "subSectorMetrics": {
                "kind": "fiat-backed",
                "reserveCustodian": "First Digital Trust (Hong Kong)",
                "reserveBreakdown": [{"asset": "Cash & short-term Treasuries", "pct": 100}],
                "attestationCadence": "monthly",
                "attestor": "Prescient Assurance",
                "realtimeReserveOracle": None,
            },
        },
        member_coins=[
            _coin("fdusd", "First Digital USD", "FDUSD", "HK trust-custody dollar"),
        ],
    ),
    "m-zero": _net(
        name="M^0 Foundation",
        symbol="M",
        tagline="Money middleware for institutional stablecoins.",
        description=(
            "M^0 issues M, a modular institutional dollar designed to be the "
            "underlying asset other stablecoin products (e.g. Cap, USDai) build on "
            "top of, via a permissioned minter network."
        ),
        differentiator=(
            "Modular 'money middleware' — M is the institutional underlying asset "
            "other issuers compose on, not a retail consumer dollar."
        ),
        sub_sector="Fiat-Backed Regulated",
        secondary_tags=["Institutional-Gated", "Multi-Currency"],
        regulatory_status="Decentralized; permissioned minter network; M^0 Foundation (non-profit).",
        official_docs="https://docs.m0.org",
        website="https://m0.org",
        twitter="https://x.com/m0foundation",
        chains=["Ethereum", "Arbitrum", "Optimism", "Solana", "Noble"],
        stablecoin={
            "reserves": "Short-term U.S. Treasuries held by permissioned minters.",
            "pegMechanism": "T-bill reserve via permissioned minter network.",
            "auditHistory": None,
            "attestationUrl": "https://m0.org",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(337_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Optimism", "Solana", "Noble", "Hyperliquid L1", "Monad", "Plume"],
                "evmCompatible": "mixed",
                "notes": "Designed as cross-chain institutional underlying asset.",
            },
            "subSectorMetrics": {
                "kind": "fiat-backed",
                "reserveCustodian": "Permissioned minter network",
                "reserveBreakdown": [{"asset": "Short-term U.S. Treasuries", "pct": 100}],
                "attestationCadence": None,
                "attestor": None,
                "realtimeReserveOracle": None,
            },
        },
        member_coins=[
            _coin("m0", "M by M^0", "M", "Institutional underlying dollar"),
        ],
    ),
    "agora": _net(
        name="Agora",
        symbol="AUSD",
        tagline="Revenue-sharing institutional dollar.",
        description=(
            "Agora issues AUSD, a fiat-backed dollar whose reserve yield is shared "
            "with distribution partners rather than end users, with reserves managed "
            "by VanEck and custodied at State Street."
        ),
        differentiator=(
            "Revenue-sharing model passes reserve yield to distribution partners, "
            "creating institutional alignment."
        ),
        sub_sector="Fiat-Backed Regulated",
        secondary_tags=["Institutional-Gated"],
        regulatory_status=(
            "NY-based; BitLicense application pending; reserves managed via VanEck "
            "under US investment-adviser regs; targeting US money-transmitter licensing."
        ),
        official_docs="https://www.agora.finance",
        website="https://www.agora.finance",
        twitter="https://x.com/withAUSD",
        chains=["Ethereum", "Avalanche", "BSC", "Polygon", "Sui"],
        stablecoin={
            "reserves": "Cash and Treasuries managed by VanEck, custodied at State Street.",
            "pegMechanism": "Fiat reserve, 1:1 mint/redeem.",
            "auditHistory": None,
            "attestationUrl": "https://www.agora.finance",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(149_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Avalanche", "BSC", "Mantle", "Polygon", "Immutable", "Sui", "Plasma", "Plume", "Monad"],
                "evmCompatible": "mixed",
                "notes": "Multi-chain; reserves via VanEck / State Street.",
            },
            "subSectorMetrics": {
                "kind": "fiat-backed",
                "reserveCustodian": "State Street (managed by VanEck)",
                "reserveBreakdown": [
                    {"asset": "U.S. Treasuries", "pct": 85},
                    {"asset": "Cash", "pct": 15},
                ],
                "attestationCadence": "monthly",
                "attestor": None,
                "realtimeReserveOracle": None,
            },
        },
        member_coins=[
            _coin("ausd", "Agora Dollar", "AUSD", "Revenue-sharing institutional dollar"),
        ],
    ),
    "bitget": _net(
        name="Bitget",
        symbol="BGUSD",
        tagline="Exchange-native yield-bearing dollar.",
        description=(
            "Bitget issues BGUSD, a custodial exchange-native dollar that passes "
            "short-term Treasury yield to its 45M+ users without leaving the platform."
        ),
        differentiator=(
            "Exchange-native yield product — Bitget's 45M+ users earn T-bill yields "
            "inside the exchange."
        ),
        sub_sector="Fiat-Backed Regulated",
        secondary_tags=["Exchange-Native", "RWA-Backed", "Yield-Bearing"],
        regulatory_status=(
            "Bitget exchange regulated in multiple jurisdictions (EU MiCA for exchange "
            "services); BGUSD is a custodial product subject to exchange compliance."
        ),
        official_docs="https://www.bitget.com",
        website="https://www.bitget.com",
        twitter="https://x.com/bitgetglobal",
        chains=["Bitget (centralized)"],
        stablecoin={
            "reserves": "Short-term U.S. Treasuries held by the exchange custodian.",
            "pegMechanism": "Custodial fiat/T-bill reserve.",
            "auditHistory": None,
            "attestationUrl": "https://www.bitget.com",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(None),
            "riskEvents": [],
            "deployment": {
                "chains": ["Bitget exchange (centralized)"],
                "evmCompatible": "no",
                "notes": "Custodial exchange product launched May 2025; supply not publicly reported.",
            },
            "subSectorMetrics": {
                "kind": "fiat-backed",
                "reserveCustodian": "Bitget exchange custodian",
                "reserveBreakdown": [{"asset": "Short-term U.S. Treasuries", "pct": 100}],
                "attestationCadence": None,
                "attestor": None,
                "realtimeReserveOracle": None,
            },
        },
        member_coins=[
            _coin("bgusd", "Bitget USD", "BGUSD", "Exchange-native yield dollar"),
        ],
    ),
    # ---- E-Money Regulated ----------------------------------------------
    "gmo-trust": _net(
        name="GMO-Z.com Trust Company",
        symbol="ZUSD",
        tagline="NYDFS-regulated multi-currency e-money.",
        description=(
            "GMO Trust issues ZUSD and GYEN, the first NYDFS-regulated Japanese yen "
            "stablecoin, under New York trust law."
        ),
        differentiator=(
            "First and only NYDFS-regulated JPY stablecoin (GYEN); pioneer of "
            "multi-currency issuance under NY trust law."
        ),
        sub_sector="E-Money Regulated",
        secondary_tags=["Multi-Currency", "Wound-Down"],
        regulatory_status="NYDFS NY trust company; NYDFS BitLicense; GMO Internet Group (Tokyo).",
        official_docs="https://stablecoin.z.com",
        website="https://stablecoin.z.com",
        twitter="https://x.com/gmotrust",
        chains=["Ethereum", "Optimism", "Stellar", "Solana", "Arbitrum"],
        stablecoin={
            "reserves": "Fiat reserves held under NY trust law.",
            "pegMechanism": "Fiat reserve e-money.",
            "auditHistory": None,
            "attestationUrl": "https://stablecoin.z.com",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(700_000),
            "riskEvents": [
                {
                    "date": "2025",
                    "type": "Wind-down",
                    "impact": "GYEN supply near zero; product line winding down.",
                    "link": "https://stablecoin.z.com",
                }
            ],
            "deployment": {
                "chains": ["Ethereum", "Optimism", "Stellar", "Solana", "Arbitrum"],
                "evmCompatible": "mixed",
                "notes": "Multi-currency (USD + JPY); wind-down in progress.",
            },
            "subSectorMetrics": {
                "kind": "e-money",
                "emiLicense": "NYDFS NY trust company",
                "fiatRails": ["FedWire", "Zengin (JPY)"],
                "ibanSupport": False,
                "redemptionCadence": "T+1",
            },
        },
        member_coins=[
            _coin("zusd", "ZUSD", "ZUSD", "NY-trust regulated dollar"),
            _coin("gyen", "GYEN", "GYEN", "NYDFS-regulated yen stablecoin (winding down)"),
        ],
    ),
    # ---- Decentralized CDP ----------------------------------------------
    "liquity": _net(
        name="Liquity",
        symbol="LQTY",
        tagline="Immutable, governance-minimized CDP dollar.",
        description=(
            "Liquity issues LUSD (V1, zero-interest) and BOLD (V2, user-set rates and "
            "multi-collateral), fully decentralized overcollateralized dollars."
        ),
        differentiator=(
            "Fully immutable, governance-minimized CDP — LUSD V1 has zero ongoing "
            "interest; BOLD V2 adds user-set rates and wstETH/rETH collateral."
        ),
        sub_sector="Decentralized CDP",
        secondary_tags=[],
        regulatory_status="Fully decentralized; no legal entity controls the protocol.",
        official_docs="https://docs.liquity.org",
        website="https://www.liquity.org",
        twitter="https://x.com/LiquityProtocol",
        github="https://github.com/liquity",
        chains=["Ethereum", "Arbitrum", "Optimism", "Base"],
        stablecoin={
            "reserves": "Overcollateralized by ETH (LUSD) and wstETH/rETH (BOLD).",
            "pegMechanism": "Overcollateralized CDP with redemption arbitrage.",
            "auditHistory": "Trail of Bits, ChainSecurity, Coinspect (multiple rounds).",
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(28_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Optimism", "Polygon", "BSC", "Avalanche", "ZKsync", "Scroll", "Polygon zkEVM"],
                "evmCompatible": "yes",
                "notes": "LUSD multi-chain; BOLD on Ethereum + L2s.",
            },
            "subSectorMetrics": {
                "kind": "decentralized-cdp",
                "collateralAssets": ["ETH", "wstETH", "rETH"],
                "minCollateralRatioPct": _sourced(110),
                "stabilityFeePct": _sourced(0),
                "savingsRatePct": _sourced(None),
                "liquidationMechanism": "Stability Pool absorption + redistribution (hard liquidation)",
                "governanceToken": "LQTY",
            },
        },
        member_coins=[
            _coin("lusd", "Liquity USD", "LUSD", "Zero-interest CDP dollar (V1)"),
            _coin("bold", "BOLD", "BOLD", "User-set-rate multi-collateral dollar (V2)"),
        ],
    ),
    "curve-stablecoin": _net(
        name="Curve (crvUSD)",
        symbol="crvUSD",
        tagline="Soft-liquidation CDP dollar.",
        description=(
            "Curve Finance issues crvUSD and savings crvUSD (scrvUSD), an "
            "overcollateralized dollar using the LLAMMA soft-liquidation AMM."
        ),
        differentiator=(
            "LLAMMA soft-liquidation continuously converts collateral to crvUSD as "
            "price drops, eliminating hard liquidation cascades."
        ),
        sub_sector="Decentralized CDP",
        secondary_tags=["Yield-Bearing"],
        regulatory_status="Decentralized DAO; Curve DAO LLC (Marshall Islands).",
        official_docs="https://docs.curve.fi",
        website="https://crvusd.curve.fi",
        twitter="https://x.com/CurveFinance",
        github="https://github.com/curvefi",
        chains=["Ethereum", "Arbitrum", "Base", "Optimism"],
        stablecoin={
            "reserves": "Overcollateralized by ETH/LSTs, WBTC and other approved assets.",
            "pegMechanism": "Overcollateralized CDP with LLAMMA soft liquidation.",
            "auditHistory": "ChainSecurity, MixBytes.",
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(222_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Base", "Optimism", "BSC", "Arbitrum", "Polygon", "Gnosis", "ZKsync", "Sonic", "Fraxtal"],
                "evmCompatible": "yes",
                "notes": "crvUSD multi-chain; scrvUSD savings on Ethereum.",
            },
            "subSectorMetrics": {
                "kind": "decentralized-cdp",
                "collateralAssets": ["ETH", "wstETH", "WBTC", "sfrxETH"],
                "minCollateralRatioPct": _sourced(None),
                "stabilityFeePct": _sourced(None),
                "savingsRatePct": _sourced(None),
                "liquidationMechanism": "soft (LLAMMA continuous AMM)",
                "governanceToken": "CRV",
            },
        },
        member_coins=[
            _coin("crvusd", "crvUSD", "crvUSD", "LLAMMA soft-liquidation dollar"),
            _coin("scrvusd", "Savings crvUSD", "scrvUSD", "Yield-bearing crvUSD", "Staked Stablecoin"),
        ],
    ),
    "lista-dao": _net(
        name="Lista DAO",
        symbol="LISTA",
        tagline="BNB Chain-native CDP with liquid staking.",
        description=(
            "Lista DAO issues lisUSD, a BNB Chain-native overcollateralized dollar "
            "that lets users earn staking yield on BNB/slisBNB collateral."
        ),
        differentiator=(
            "BNB-native CDP integrating liquid staking — collateral earns staking "
            "yield while securing lisUSD debt."
        ),
        sub_sector="Decentralized CDP",
        secondary_tags=["Yield-Bearing"],
        regulatory_status="Lista DAO Foundation (BVI); decentralized DAO.",
        official_docs="https://lista.org",
        website="https://lista.org",
        twitter="https://x.com/lista_dao",
        chains=["BSC"],
        stablecoin={
            "reserves": "Overcollateralized by BNB, slisBNB and approved assets.",
            "pegMechanism": "Overcollateralized CDP.",
            "auditHistory": "Multiple third-party audits (per Lista docs).",
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(75_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["BSC"],
                "evmCompatible": "yes",
                "notes": "BNB Chain-native.",
            },
            "subSectorMetrics": {
                "kind": "decentralized-cdp",
                "collateralAssets": ["BNB", "slisBNB", "BTCB"],
                "minCollateralRatioPct": _sourced(None),
                "stabilityFeePct": _sourced(None),
                "savingsRatePct": _sourced(None),
                "liquidationMechanism": "hard liquidation (auction)",
                "governanceToken": "LISTA",
            },
        },
        member_coins=[
            _coin("lisusd", "Lista USD", "lisUSD", "BNB-native CDP dollar"),
        ],
    ),
    "reserve": _net(
        name="Reserve Protocol",
        symbol="RSR",
        tagline="Open platform for asset-backed RTokens.",
        description=(
            "Reserve Protocol lets anyone deploy RTokens — asset-backed stablecoins "
            "with arbitrary collateral baskets — including RSV, eUSD and rgUSD."
        ),
        differentiator=(
            "Open RToken platform: anyone can deploy fully customized asset-backed "
            "stablecoins with arbitrary collateral baskets and yield distribution."
        ),
        sub_sector="Decentralized CDP",
        secondary_tags=["Multi-Currency"],
        regulatory_status="Decentralized DAO governed by RSR stakers; Reserve Rights Foundation (Delaware) for dev only.",
        official_docs="https://reserve.org",
        website="https://reserve.org",
        twitter="https://x.com/reserveprotocol",
        github="https://github.com/reserve-protocol",
        chains=["Ethereum", "Base", "Arbitrum"],
        stablecoin={
            "reserves": "Per-RToken collateral baskets (stablecoins, yield tokens, RWAs).",
            "pegMechanism": "Collateral-basket backed RTokens with RSR overcollateralization.",
            "auditHistory": "Multiple audits (per Reserve docs).",
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(300_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Base", "Arbitrum", "Gnosis"],
                "evmCompatible": "yes",
                "notes": "RToken platform; supply small relative to peak.",
            },
            "subSectorMetrics": {
                "kind": "decentralized-cdp",
                "collateralAssets": ["USDC", "DAI", "yield-bearing baskets"],
                "minCollateralRatioPct": _sourced(None),
                "stabilityFeePct": _sourced(None),
                "savingsRatePct": _sourced(None),
                "liquidationMechanism": "RSR staker overcollateralization + basket recollateralization",
                "governanceToken": "RSR",
            },
        },
        member_coins=[
            _coin("rsv", "Reserve", "RSV", "Original Reserve stablecoin"),
            _coin("eusd", "Electronic Dollar", "eUSD", "Flagship RToken dollar"),
            _coin("rgusd", "Revenue Generating USD", "rgUSD", "Yield-distributing RToken"),
        ],
    ),
    # ---- Synthetic Yield-Bearing ----------------------------------------
    "frax": _net(
        name="Frax Finance",
        symbol="FXS",
        tagline="Hybrid stablecoin pivoting to RWA backing.",
        description=(
            "Frax issues FRAX, the RWA-backed frxUSD (via BlackRock BUIDL), and the "
            "yield-bearing sFRAX, bridging algorithmic origins to institutional RWA backing."
        ),
        differentiator=(
            "First-mover hybrid algo-collateral stablecoin, now pivoted to RWA-backed "
            "frxUSD with BUIDL — an institutional bridge to DeFi."
        ),
        sub_sector="Synthetic Yield-Bearing",
        secondary_tags=["RWA-Backed", "Yield-Bearing"],
        regulatory_status="Decentralized DAO via FXS holders; frxUSD reserves in bankruptcy-remote Reg D structures (Securitize/BUIDL).",
        official_docs="https://docs.frax.finance",
        website="https://frax.finance",
        twitter="https://x.com/fraxfinance",
        github="https://github.com/FraxFinance",
        chains=["Ethereum", "Arbitrum", "Optimism", "Avalanche", "BSC"],
        stablecoin={
            "reserves": "frxUSD backed by BlackRock BUIDL / Reg D fund structures via Securitize.",
            "pegMechanism": "Hybrid collateral transitioning to RWA-backed frxUSD.",
            "auditHistory": "Trail of Bits, Certik, ChainSecurity.",
            "attestationUrl": "https://frax.finance",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(310_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Optimism", "Avalanche", "BSC", "Blast", "Linea", "Movement", "X Layer"],
                "evmCompatible": "yes",
                "notes": "FRAX declining; frxUSD growing.",
            },
            "subSectorMetrics": {
                "kind": "synthetic",
                "hedgeVenues": [],
                "fundingRateExposure": "Minimal — frxUSD is RWA/T-bill backed rather than perp-hedged.",
                "insuranceFundUsd": _sourced(None),
                "yieldSources": ["T-bill (BUIDL)", "AMO strategies"],
            },
        },
        member_coins=[
            _coin("frax", "Frax", "FRAX", "Original hybrid Frax dollar"),
            _coin("frxusd", "Frax USD", "frxUSD", "RWA-backed (BUIDL) dollar"),
            _coin("sfrax", "Staked FRAX", "sFRAX", "Yield-bearing FRAX", "Staked Stablecoin"),
        ],
    ),
    "resolv": _net(
        name="Resolv Labs",
        symbol="RESOLV",
        tagline="Two-tranche delta-neutral dollar.",
        description=(
            "Resolv issues USR (stable yield) and stUSR, backstopped by the RLP "
            "leveraged risk/reward pool token, using a delta-neutral hedging model."
        ),
        differentiator=(
            "Two-tranche risk architecture — USR (stable yield) and RLP (leveraged "
            "risk) provide transparent risk separation."
        ),
        sub_sector="Synthetic Yield-Bearing",
        secondary_tags=["Recently-Exploited"],
        regulatory_status="BVI-incorporated; decentralized; no license.",
        official_docs="https://docs.resolv.xyz",
        website="https://resolv.xyz",
        twitter="https://x.com/ResolvLabs",
        chains=["Ethereum", "Base", "BSC"],
        stablecoin={
            "reserves": "Crypto collateral hedged delta-neutral; RLP absorbs first-loss risk.",
            "pegMechanism": "Delta-neutral hedge with RLP insurance tranche.",
            "auditHistory": "Pashov Audit Group, MixBytes, Pessimistic; post-exploit re-audit underway.",
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(1_300_000),
            "riskEvents": [
                {
                    "date": "2026-03",
                    "type": "Exploit",
                    "impact": "$23M drained via a compromised private key; USR collapsed from a ~$700M peak.",
                    "link": "https://resolv.xyz",
                }
            ],
            "deployment": {
                "chains": ["Ethereum", "Base", "BSC", "Berachain", "Hyperliquid", "Soneium"],
                "evmCompatible": "yes",
                "notes": "Recovering post March-2026 exploit.",
            },
            "subSectorMetrics": {
                "kind": "synthetic",
                "hedgeVenues": ["Binance", "Bybit", "OKX"],
                "fundingRateExposure": "Earns perp funding when positive; RLP absorbs negative-funding drawdowns.",
                "insuranceFundUsd": _sourced(None),
                "yieldSources": ["perp funding", "staked ETH"],
            },
        },
        member_coins=[
            _coin("usr", "Resolv USD", "USR", "Delta-neutral synthetic dollar"),
            _coin("stusr", "Staked Resolv USD", "stUSR", "Yield-bearing USR", "Staked Stablecoin"),
            _coin("rlp", "Resolv Liquidity Pool Token", "RLP", "Leveraged risk/insurance tranche", "Staked Stablecoin"),
        ],
    ),
    "falcon": _net(
        name="Falcon Finance",
        symbol="FF",
        tagline="Universal-collateral synthetic dollar.",
        description=(
            "Falcon issues USDf and the yield-bearing sUSDf, a synthetic dollar that "
            "accepts the broadest basket of crypto collateral."
        ),
        differentiator=(
            "Universal collateral model — accepts BTC, ETH, SOL, BNB, altcoins and "
            "yield-bearing tokens as collateral for synthetic USDf."
        ),
        sub_sector="Synthetic Yield-Bearing",
        secondary_tags=["Yield-Bearing"],
        regulatory_status="Cayman Islands; decentralized; no license.",
        official_docs="https://falcon.finance",
        website="https://falcon.finance",
        twitter="https://x.com/FalconStable",
        chains=["Ethereum", "BSC"],
        stablecoin={
            "reserves": "Broad crypto-collateral basket hedged for delta neutrality.",
            "pegMechanism": "Overcollateralized synthetic dollar with delta-neutral hedging.",
            "auditHistory": "Pashov Audit Group.",
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(1_300_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "BSC"],
                "evmCompatible": "yes",
                "notes": "Top-10 stablecoin by supply.",
            },
            "subSectorMetrics": {
                "kind": "synthetic",
                "hedgeVenues": ["Binance", "Bybit", "OKX"],
                "fundingRateExposure": "Funding-rate carry on the broad collateral basket.",
                "insuranceFundUsd": _sourced(None),
                "yieldSources": ["perp funding", "collateral staking yield"],
            },
        },
        member_coins=[
            _coin("usdf", "Falcon USD", "USDf", "Universal-collateral synthetic dollar"),
            _coin("susdf", "Staked Falcon USD", "sUSDf", "Yield-bearing USDf", "Staked Stablecoin"),
        ],
    ),
    "cap": _net(
        name="Cap",
        symbol="CAP",
        tagline="Non-custodial outsourced-yield dollar.",
        description=(
            "Cap issues cUSD, a synthetic dollar where users keep custody via smart "
            "contracts while institutional 'agents' generate yield through "
            "EigenLayer-secured restaking."
        ),
        differentiator=(
            "Non-custodial yield outsourcing — institutional agents (Franklin "
            "Templeton, others) generate yield backed by EigenLayer-secured restaking."
        ),
        sub_sector="Synthetic Yield-Bearing",
        secondary_tags=["Institutional-Gated", "RWA-Backed"],
        regulatory_status="GENIUS Act-compliant design; decentralized smart contracts; no direct license.",
        official_docs="https://cap.app",
        website="https://cap.app",
        twitter="https://x.com/capmoney_",
        chains=["Ethereum"],
        stablecoin={
            "reserves": "Yield generated by whitelisted institutional agents, backstopped by restaked collateral.",
            "pegMechanism": "Agent-generated yield with EigenLayer-secured slashing backstop.",
            "auditHistory": "Per Cap docs (pre/post-mainnet).",
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(500_000_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum"],
                "evmCompatible": "yes",
                "notes": "~$500M TVL (March 2026); cUSD contract post-mainnet.",
            },
            "subSectorMetrics": {
                "kind": "synthetic",
                "hedgeVenues": [],
                "fundingRateExposure": "Yield from delegated agent strategies, not direct perp funding.",
                "insuranceFundUsd": _sourced(None),
                "yieldSources": ["restaking", "agent strategies"],
            },
        },
        member_coins=[
            _coin("cusd", "Cap USD", "cUSD", "Outsourced-yield synthetic dollar"),
        ],
    ),
    "elixir": _net(
        name="Elixir",
        symbol="ELX",
        tagline="Wound-down synthetic dollar (deUSD).",
        description=(
            "Elixir issued deUSD and sdeUSD, a synthetic dollar fully shut down in "
            "Q1 2026 following the Stream Finance loss."
        ),
        differentiator="Wound-down: deUSD redemptions halted after the Stream Finance loss.",
        sub_sector="Synthetic Yield-Bearing",
        secondary_tags=["Wound-Down"],
        regulatory_status="Decentralized; protocol fully shut down Q1 2026.",
        official_docs="https://www.elixir.xyz",
        website="https://www.elixir.xyz",
        twitter="https://x.com/elixir",
        chains=["Ethereum"],
        stablecoin={
            "reserves": "N/A — protocol wound down.",
            "pegMechanism": "Synthetic dollar (discontinued).",
            "auditHistory": None,
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(None),
            "riskEvents": [
                {
                    "date": "2026-Q1",
                    "type": "Wind-down",
                    "impact": "Fully shut down after a $68-93M Stream Finance loss.",
                    "link": "https://www.elixir.xyz",
                }
            ],
            "deployment": {
                "chains": ["Ethereum"],
                "evmCompatible": "yes",
                "notes": "Discontinued Q1 2026.",
            },
            "subSectorMetrics": {
                "kind": "synthetic",
                "hedgeVenues": [],
                "fundingRateExposure": None,
                "insuranceFundUsd": _sourced(None),
                "yieldSources": [],
            },
        },
        member_coins=[
            _coin("deusd", "deUSD", "deUSD", "Wound-down synthetic dollar"),
            _coin("sdeusd", "Staked deUSD", "sdeUSD", "Wound-down staked deUSD", "Staked Stablecoin"),
        ],
    ),
    # ---- RWA-Backed Stable ----------------------------------------------
    "anzen": _net(
        name="Anzen Finance",
        symbol="ANZ",
        tagline="Private-credit-backed yield dollar.",
        description=(
            "Anzen issues USDz and the yield-bearing sUSDz, backed by institutional "
            "private credit assets rather than just T-bills."
        ),
        differentiator=(
            "Private credit RWA backing (not just T-bills) targeting 8-12% APY by "
            "exposing holders to institutional credit risk."
        ),
        sub_sector="RWA-Backed Stable",
        secondary_tags=["Yield-Bearing", "Institutional-Gated"],
        regulatory_status="Delaware-incorporated; RWA assets managed by regulated institutional credit managers.",
        official_docs="https://www.anzen.finance",
        website="https://www.anzen.finance",
        twitter="https://x.com/AnzenFinance",
        chains=["Ethereum", "Base"],
        stablecoin={
            "reserves": "Diversified institutional private-credit portfolio (RWA).",
            "pegMechanism": "RWA collateral with sUSDz yield distribution.",
            "auditHistory": "Per Anzen docs.",
            "attestationUrl": "https://www.anzen.finance",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(7_900_000),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Base", "Blast", "Manta"],
                "evmCompatible": "yes",
                "notes": "Private-credit-backed; institutional gating on mint/redeem.",
            },
            "subSectorMetrics": {
                "kind": "rwa-backed",
                "underlyingAssets": ["Institutional private credit"],
                "custodian": "Regulated credit managers",
                "yieldDistribution": "exchange-rate",
                "nav": _sourced(None),
            },
        },
        member_coins=[
            _coin("usdz", "Anzen USDz", "USDz", "Private-credit-backed dollar"),
            _coin("susdz", "Staked Anzen USDz", "sUSDz", "Yield-bearing USDz", "Staked Stablecoin"),
        ],
    ),
    "mountain-protocol": _net(
        name="Mountain Protocol",
        symbol="USDM",
        tagline="Regulated yield-bearing T-bill dollar (wound down).",
        description=(
            "Mountain Protocol issued USDM, a daily-rebasing T-bill-yield dollar under "
            "Bermuda Monetary Authority oversight; acquired by Anchorage in April 2025 "
            "and winding down."
        ),
        differentiator=(
            "One of the first yield-bearing stablecoins with formal regulatory "
            "oversight and daily-rebase T-bill yield."
        ),
        sub_sector="RWA-Backed Stable",
        secondary_tags=["Yield-Bearing", "Wound-Down"],
        regulatory_status="Bermuda Monetary Authority Digital Asset Business license #202302512.",
        official_docs="https://mountainprotocol.com",
        website="https://mountainprotocol.com",
        twitter="https://x.com/MountainUSDM",
        chains=["Ethereum", "Arbitrum", "Base", "Optimism", "Polygon"],
        stablecoin={
            "reserves": "Short-term U.S. Treasuries (daily-rebase yield).",
            "pegMechanism": "T-bill reserve with daily rebase.",
            "auditHistory": "Per Mountain docs.",
            "attestationUrl": "https://mountainprotocol.com",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(1_400_000),
            "riskEvents": [
                {
                    "date": "2025-04",
                    "type": "Acquisition / Wind-down",
                    "impact": "Acquired by Anchorage Digital; supply collapsed from a ~$150M peak.",
                    "link": "https://mountainprotocol.com",
                }
            ],
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Base", "Optimism", "Polygon", "ZKsync"],
                "evmCompatible": "yes",
                "notes": "Winding down post-Anchorage acquisition.",
            },
            "subSectorMetrics": {
                "kind": "rwa-backed",
                "underlyingAssets": ["Short-term U.S. Treasuries"],
                "custodian": "Anchorage Digital",
                "yieldDistribution": "rebase",
                "nav": _sourced(None),
            },
        },
        member_coins=[
            _coin("usdm", "Mountain Protocol USD", "USDM", "Daily-rebase T-bill dollar (winding down)"),
        ],
    ),
    # ---- Fiat-Backed Regulated (pre-existing coins, net-new entity rows) ---
    "tether": _net(
        name="Tether",
        symbol="USDT",
        tagline="The largest stablecoin by circulating supply.",
        description=(
            "Tether issues USDT, a fiat-backed dollar stablecoin redeemable 1:1 against "
            "reserves held in cash, cash equivalents, and short-term U.S. Treasuries."
        ),
        differentiator=(
            "Deepest exchange liquidity and broadest chain deployment of any "
            "stablecoin; reserve attestations published by BDO / Moore Cayman."
        ),
        sub_sector="Fiat-Backed Regulated",
        secondary_tags=["Multi-Chain", "Hybrid-Chain"],
        regulatory_status="Registered MSB (FinCEN); BVI FSC oversight for Tether Ltd.",
        official_docs="https://tether.to/en/transparency",
        website="https://tether.to",
        twitter="https://x.com/Tether_to",
        chains=["Ethereum", "Tron", "Solana", "Arbitrum", "Polygon", "BNB Chain"],
        competitors=[_USDC_COMPETITOR],
        stablecoin={
            "reserves": "Cash, cash equivalents, and short-term U.S. Treasuries.",
            "pegMechanism": "Fiat reserve, 1:1 mint/redeem.",
            "auditHistory": "Quarterly attestations (BDO / Moore Cayman).",
            "attestationUrl": "https://tether.to/en/transparency",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(None),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Tron", "Solana", "Arbitrum", "Polygon", "+10 more"],
                "evmCompatible": "mixed",
                "notes": "USDT native on Tron and many EVM chains; largest stablecoin by supply.",
            },
            "subSectorMetrics": {
                "kind": "fiat-backed",
                "reserveCustodian": "Multiple regulated custodians",
                "reserveBreakdown": [],
                "attestationCadence": "quarterly",
                "attestor": "BDO / Moore Cayman",
                "realtimeReserveOracle": None,
            },
        },
        member_coins=[
            _coin("tether", "Tether USD", "USDT", "Primary fiat-backed dollar"),
        ],
    ),
    "usdt0": _net(
        name="USDT0",
        symbol="USDT0",
        tagline="Omnichain USDT via LayerZero.",
        description=(
            "USDT0 is the omnichain extension of Tether's USDT, deployed via LayerZero "
            "OFT to move native USDT liquidity across supported chains."
        ),
        differentiator=(
            "Native omnichain USDT rail using LayerZero OFT — not a wrapped bridge token."
        ),
        sub_sector="Cross-Chain / Omnichain",
        secondary_tags=["Multi-Chain"],
        regulatory_status="Issued under Tether Ltd. reserve framework.",
        official_docs="https://tether.to",
        website="https://tether.to",
        twitter="https://x.com/Tether_to",
        chains=["Ethereum", "Arbitrum", "Optimism", "Polygon"],
        competitors=[_USDT_COMPETITOR],
        stablecoin={
            "reserves": "Backed by Tether USDT reserves (omnichain representation).",
            "pegMechanism": "Fiat reserve via parent USDT.",
            "auditHistory": "Inherits Tether quarterly attestations.",
            "attestationUrl": "https://tether.to/en/transparency",
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(None),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Optimism", "Polygon"],
                "evmCompatible": "yes",
                "notes": "LayerZero OFT omnichain USDT.",
            },
            "subSectorMetrics": {
                "kind": "fiat-backed",
                "reserveCustodian": "Tether Ltd.",
                "attestationCadence": "quarterly",
                "attestor": "BDO / Moore Cayman",
            },
        },
        member_coins=[
            _coin("usdt0", "USDT0", "USDT0", "Omnichain USDT (LayerZero)"),
        ],
    ),
    # ---- Decentralized CDP (Inverse Finance) -----------------------------
    "inverse-finance": _net(
        name="Inverse Finance",
        symbol="INV",
        tagline="Decentralized CDP issuer of DOLA.",
        description=(
            "Inverse Finance issues DOLA, an overcollateralized decentralized stablecoin, "
            "alongside INV governance and FiRM fixed-rate lending markets."
        ),
        differentiator=(
            "DOLA CDP stack plus FiRM fixed-rate borrowing — distinct from Aave-style "
            "variable-rate money markets."
        ),
        sub_sector="Decentralized CDP",
        secondary_tags=["DAO-Governed"],
        regulatory_status="Decentralized on-chain protocol; no issuer license.",
        official_docs="https://docs.inverse.finance",
        website="https://inverse.finance",
        twitter="https://x.com/InverseFinance",
        github="https://github.com/InverseFinance",
        chains=["Ethereum"],
        stablecoin={
            "reserves": "Overcollateralized crypto collateral (DOLA CDP).",
            "pegMechanism": "Overcollateralized mint against crypto.",
            "auditHistory": "Per Inverse docs.",
            "attestationUrl": None,
            "proofOfReservesUrl": None,
            "currentSupplyUsd": _sourced(None),
            "riskEvents": [],
            "deployment": {
                "chains": ["Ethereum"],
                "evmCompatible": "yes",
                "notes": "DOLA + FiRM on Ethereum mainnet.",
            },
            "subSectorMetrics": {
                "kind": "decentralized-cdp",
                "collateralAssets": ["ETH", "wBTC", "yVault tokens"],
                "governanceToken": "INV",
            },
        },
        member_coins=[
            _coin("inverse-finance", "Inverse Finance DOLA", "DOLA", "Overcollateralized stablecoin"),
        ],
    ),
}
