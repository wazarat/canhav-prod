#!/usr/bin/env python3
"""
RWA-entity specs (PDF "DEX + RWA Sector Expansion" §1/§4).

The 8 RWA entities (6 net-new + Centrifuge & Franklin Templeton promoted from
bare CSV seeds to full Network umbrellas) under the
Network -> Protocol -> RWA taxonomy, each tagged with its RWA sub-sector
(spec §1) and 0+ secondary tags:

    Tokenization Infrastructure .. Securitize
    Private Credit ............... Centrifuge, Goldfinch, Clearpool
    Real Estate .................. RealT, Lofty.ai
    Carbon / ESG ................. Toucan Protocol
    Tokenized Treasuries ......... Franklin Templeton

These dicts are merged into ENTITY_SPECS by ingest_entities.py and flattened to
store items by `build_entity_item`. Live AUM/TVL is filled by the DeFi Llama /
rwa.xyz cron pass in Phase 2; the curated string/array fields below are static
research. AUM/TVL figures embedded here are DefiLlama / rwa.xyz / issuer-report
snapshots as of April-June 2026 (spec capture date 2026-06-18).

Per the "entities + governance only" scope, product tokens (BUIDL, ACRED, FIDU,
DROP/TIN, BCT/NCT, BENJI, ...) are described in entity copy + sub-sector metrics
rather than seeded as standalone RWA-category coin pages.

Stdlib only.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

_CAPTURED_AT = "2026-06-18"


def _sourced(value: Optional[float]) -> Dict[str, Any]:
    return {
        "value": value,
        "dataSource": "derived",
        "sourceLabel": f"DefiLlama / rwa.xyz / issuer reports ({_CAPTURED_AT})",
        "updatedAt": None,
    }


def _empty_scale(tvl_usd: Optional[float] = None) -> Dict[str, Any]:
    return {
        "tvlUsd": tvl_usd,
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
    regulatory_status: str,
    rwa: Dict[str, Any],
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
    """Build an RWA-entity spec, filling the editorial defaults that
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
        "current_scale": _empty_scale(tvl_usd=tvl_usd),
        "scale_labels": scale_labels or {"tvl": "Assets under management"},
        "offchain_facts": offchain_facts or None,
        # Taxonomy hierarchy.
        "sub_category": "Protocol",
        "sector": "RWA",
        "sub_sector": sub_sector,
        # `tags` is the lending-tag vocabulary on NetworkProfile; keep it empty
        # for RWA entities and use the dedicated rwa fields below.
        "tags": [],
        "rwa_sub_sector": sub_sector,
        "rwa_secondary_tags": secondary_tags,
        "competitors": competitors or [_ONDO_COMPETITOR],
        "rwa": rwa,
        "member_coins": member_coins,
        "portal_defaults": _portal_defaults(chains),
    }


# Reusable competitor entry pointing back at the reference RWA brand.
_ONDO_COMPETITOR = {
    "name": "Ondo Finance",
    "slug": "ondo-finance",
    "rank": 1,
    "positioning": "Leading tokenized-Treasury and tokenized-equity issuer.",
    "similarities": "Both bring real-world assets on-chain with compliant access.",
    "differences": (
        "Ondo runs OUSG (tokenized Treasuries) and Ondo Global Markets "
        "(tokenized US equities) with deep DeFi composability."
    ),
}


RWA_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ---- Tokenization Infrastructure ------------------------------------
    "securitize": _net(
        name="Securitize",
        symbol="SECZ",
        tagline="The leading SEC-registered tokenization transfer agent.",
        description=(
            "Securitize is the leading SEC-registered transfer agent for tokenized "
            "securities. It powers BlackRock BUIDL (the largest tokenized Treasury "
            "fund) plus Apollo, KKR, Hamilton Lane, and VanEck product launches. "
            "Product tokens include BUIDL, ACRED (Apollo private credit), sBUIDL, "
            "and VBILL (VanEck Treasuries)."
        ),
        differentiator=(
            "SEC-registered transfer agent + broker-dealer + ATS, powering the "
            "largest institutional tokenized funds; filed for an NYSE listing (SECZ)."
        ),
        sub_sector="Tokenization Infrastructure",
        secondary_tags=["Compliance-Heavy", "Institutional-Gated", "Permissioned", "Multi-Chain"],
        regulatory_status=(
            "SEC-registered transfer agent; broker-dealer (Securitize Markets); ATS "
            "operator; FINRA member."
        ),
        official_docs="https://securitize.io",
        website="https://securitize.io",
        twitter="https://x.com/Securitize",
        audit_firms="Big-4 attestations on underlying funds; contract audits by ChainSecurity, Halborn.",
        chains=["Ethereum", "Arbitrum", "Avalanche", "Polygon", "Optimism", "Aptos", "Solana", "Base", "ZKsync"],
        tvl_usd=4_000_000_000,
        rwa={
            "aumUsd": _sourced(4_000_000_000),
            "regulatoryStatus": "SEC transfer agent; broker-dealer; ATS; FINRA member.",
            "auditHistory": "Big-4 fund attestations; contract audits by ChainSecurity, Halborn.",
            "deployment": {
                "chains": ["Ethereum", "Arbitrum", "Avalanche", "Polygon", "+5 more"],
                "evmCompatible": "mixed",
                "notes": "BUIDL on Ethereum + 6 chains; Aptos / Solana non-EVM.",
            },
            "subSectorMetrics": {
                "kind": "tokenization-infra",
                "fundsHosted": _sourced(None),
                "totalAumUsd": _sourced(4_000_000_000),
                "registeredJurisdictions": ["United States (SEC/FINRA)"],
                "topClients": ["BlackRock", "Apollo", "KKR", "Hamilton Lane", "VanEck", "Franklin Templeton"],
            },
        },
        member_coins=[],
    ),
    # ---- Private Credit -------------------------------------------------
    "centrifuge": _net(
        name="Centrifuge",
        symbol="CFG",
        tagline="Tokenizing illiquid real-world business assets.",
        description=(
            "Centrifuge tokenizes illiquid real-world business assets (invoices, "
            "mortgages, trade finance) through bankruptcy-remote SPV structures. "
            "DROP/TIN senior-junior tranche tokens link legal collateral to on-chain "
            "investors; JAAA and JTRSY add tokenized CLO and Treasury exposure."
        ),
        differentiator=(
            "Per-pool bankruptcy-remote SPVs with DROP (senior) / TIN (junior) "
            "tranches connect legal collateral to on-chain lenders."
        ),
        sub_sector="Private Credit",
        secondary_tags=["Hybrid-Chain", "Multi-Chain", "Compliance-Heavy", "Institutional-Gated", "DAO-Governed"],
        regulatory_status=(
            "Per-pool SPV legal structures (Delaware, BVI, Cayman); KYC via Securitize ID."
        ),
        official_docs="https://docs.centrifuge.io",
        website="https://centrifuge.io",
        twitter="https://x.com/centrifuge",
        github="https://github.com/centrifuge",
        audit_firms="SRLabs, Trail of Bits.",
        chains=["Centrifuge Chain", "Ethereum", "Base", "Arbitrum", "Avalanche", "Celo"],
        tvl_usd=1_790_000_000,
        rwa={
            "aumUsd": _sourced(1_790_000_000),
            "regulatoryStatus": "Per-pool SPVs (Delaware/BVI/Cayman); KYC via Securitize ID.",
            "auditHistory": "SRLabs, Trail of Bits.",
            "deployment": {
                "chains": ["Centrifuge Chain", "Ethereum", "Base", "Arbitrum", "+2 more"],
                "evmCompatible": "mixed",
                "notes": "Polkadot parachain primary; Ethereum + L2 deployments for tranche tokens.",
            },
            "subSectorMetrics": {
                "kind": "private-credit",
                "activeBorrowers": _sourced(None),
                "cumulativeOriginationsUsd": _sourced(None),
                "defaultRatePct": _sourced(None),
                "averageMaturityDays": _sourced(None),
                "trancheStructure": "Per-pool DROP (senior) / TIN (junior); JAAA CLO + JTRSY Treasury funds.",
            },
        },
        member_coins=[
            _coin("cfg", "Centrifuge", "CFG", "Governance token"),
        ],
    ),
    "goldfinch": _net(
        name="Goldfinch",
        symbol="GFI",
        tagline="Uncollateralized crypto loans to real-world businesses.",
        description=(
            "Goldfinch provides uncollateralized crypto loans to real-world "
            "businesses in emerging markets via 'trust through consensus' — human "
            "backers assess borrower creditworthiness instead of crypto "
            "over-collateralization. It pivoted to institutional-grade 'Goldfinch "
            "Prime' private-credit funds in 2024. FIDU is the senior-pool LP token."
        ),
        differentiator=(
            "Uncollateralized lending underwritten by human backers; Goldfinch "
            "Prime brings institutional private-credit funds on-chain."
        ),
        sub_sector="Private Credit",
        secondary_tags=["Institutional-Gated", "Compliance-Heavy", "DAO-Governed"],
        regulatory_status="Reg D / Reg S exempt offerings; KYC required for backers.",
        official_docs="https://docs.goldfinch.finance",
        website="https://goldfinch.finance",
        twitter="https://x.com/goldfinch_fi",
        github="https://github.com/goldfinch-eng",
        audit_firms="Certik, Trail of Bits.",
        chains=["Ethereum"],
        tvl_usd=57_000_000,
        rwa={
            "aumUsd": _sourced(57_000_000),
            "regulatoryStatus": "Reg D / Reg S exempt; KYC required for backers.",
            "auditHistory": "Certik, Trail of Bits.",
            "deployment": {
                "chains": ["Ethereum"],
                "evmCompatible": "yes",
                "notes": "FIDU senior-pool LP token; per-borrower tranche tokens.",
            },
            "subSectorMetrics": {
                "kind": "private-credit",
                "activeBorrowers": _sourced(None),
                "cumulativeOriginationsUsd": _sourced(None),
                "defaultRatePct": _sourced(None),
                "averageMaturityDays": _sourced(None),
                "trancheStructure": "FIDU senior pool (price drifts up with interest) + borrower-pool tranche tokens.",
            },
        },
        member_coins=[
            _coin("gfi", "Goldfinch", "GFI", "Governance token"),
        ],
    ),
    "clearpool": _net(
        name="Clearpool",
        symbol="CPOOL",
        tagline="Institutional uncollateralized lending pools.",
        description=(
            "Clearpool runs institutional uncollateralized lending — whitelisted "
            "institutional borrowers access dynamic-rate pools where utilization "
            "sets interest. It introduced 'Credit Vaults' for permissioned "
            "single-borrower exposure; cpUSD is tied to Credit Vault yields."
        ),
        differentiator=(
            "Permissionless lender side over KYC'd institutional borrowers; "
            "utilization-driven rates and single-borrower Credit Vaults."
        ),
        sub_sector="Private Credit",
        secondary_tags=["Institutional-Gated", "Multi-Chain", "Permissioned"],
        regulatory_status="KYC-only borrowers; lender side permissionless (some Credit Vaults gated).",
        official_docs="https://docs.clearpool.finance",
        website="https://clearpool.finance",
        twitter="https://x.com/ClearpoolFin",
        audit_firms="Peckshield, ChainSecurity.",
        chains=["Ethereum", "Optimism", "Polygon", "Polygon zkEVM", "Mantle", "Avalanche", "Base", "Flare", "Arbitrum", "ZKsync"],
        tvl_usd=60_000_000,
        rwa={
            "aumUsd": _sourced(60_000_000),
            "regulatoryStatus": "KYC-only borrowers; permissionless lenders (gated Credit Vaults).",
            "auditHistory": "Peckshield, ChainSecurity.",
            "deployment": {
                "chains": ["Ethereum", "Optimism", "Polygon", "Arbitrum", "+6 more"],
                "evmCompatible": "yes",
                "notes": "cpToken per-pool LP receipts; cpUSD tied to Credit Vault yields.",
            },
            "subSectorMetrics": {
                "kind": "private-credit",
                "activeBorrowers": _sourced(None),
                "cumulativeOriginationsUsd": _sourced(924_000_000),
                "defaultRatePct": _sourced(None),
                "averageMaturityDays": _sourced(None),
                "trancheStructure": "Per-pool cpToken LP receipts; single-borrower Credit Vaults.",
            },
        },
        member_coins=[
            _coin("cpool", "Clearpool", "CPOOL", "Governance token"),
        ],
    ),
    # ---- Real Estate ----------------------------------------------------
    "realt": _net(
        name="RealT",
        symbol="REG",
        tagline="Fractional US real estate with daily rental yield.",
        description=(
            "RealT offers pure fractional real estate; tokens represent ownership "
            "slices of US residential/commercial properties via Delaware LLCs, with "
            "daily rental yields paid in stablecoins (xDai / USDC) directly to wallet. "
            "Hundreds of per-property RealTokens each trade as their own ERC-20."
        ),
        differentiator=(
            "Per-property Delaware-LLC RealTokens stream daily rental yield to the "
            "holder's wallet; hundreds of individual property tokens."
        ),
        sub_sector="Real Estate",
        secondary_tags=["Yield-Bearing", "Multi-Chain", "Real-World-Custody", "Compliance-Heavy"],
        regulatory_status="Reg D 506(c) per property; Delaware LLC per asset; KYC required.",
        official_docs="https://realt.co",
        website="https://realt.co",
        twitter="https://x.com/RealTPlatform",
        audit_firms="Property-level legal opinions; on-chain audits by Hexens.",
        chains=["Gnosis Chain", "Ethereum"],
        tvl_usd=156_900_000,
        rwa={
            "aumUsd": _sourced(156_900_000),
            "regulatoryStatus": "Reg D 506(c) per property; Delaware LLC per asset; KYC required.",
            "auditHistory": "Property-level legal opinions; on-chain audits by Hexens.",
            "deployment": {
                "chains": ["Gnosis Chain", "Ethereum"],
                "evmCompatible": "yes",
                "notes": "Gnosis (xDai) primary for low-fee daily rental distributions.",
            },
            "subSectorMetrics": {
                "kind": "real-estate",
                "propertiesCount": _sourced(None),
                "averagePropertyValueUsd": _sourced(None),
                "rentalYieldRangePct": "Daily rental yield paid in xDai / USDC",
                "geographicScope": "US residential & commercial (Detroit, Chicago, others)",
                "custodyStructure": "Delaware LLC per property; deeds custodied off-chain.",
            },
        },
        member_coins=[
            _coin("reg", "RealToken Ecosystem Governance", "REG", "Governance token"),
        ],
    ),
    "lofty-ai": _net(
        name="Lofty.ai",
        symbol="LOFTY",
        tagline="Fractional US real estate on Algorand.",
        description=(
            "Lofty.ai offers fractional US real estate on Algorand — sub-cent "
            "transactions, a $50 minimum, and per-property ASA (Algorand Standard "
            "Asset) governance. Daily rental yield is distributed in USDC."
        ),
        differentiator=(
            "Algorand-based fractional real estate with $50 minimums and "
            "per-property ASA governance; daily USDC rental yield."
        ),
        sub_sector="Real Estate",
        secondary_tags=["Yield-Bearing", "Non-EVM", "Real-World-Custody", "Compliance-Heavy"],
        regulatory_status="Each property is a Reg D 506(c) US LLC; Lofty Inc. as manager.",
        official_docs="https://www.lofty.ai",
        website="https://www.lofty.ai",
        twitter="https://x.com/lofty_ai",
        audit_firms="Algorand Foundation reviewed.",
        chains=["Algorand"],
        tvl_usd=99_600_000,
        rwa={
            "aumUsd": _sourced(99_600_000),
            "regulatoryStatus": "Reg D 506(c) US LLC per property; Lofty Inc. manager.",
            "auditHistory": "Algorand Foundation reviewed.",
            "deployment": {
                "chains": ["Algorand"],
                "evmCompatible": "no",
                "notes": "Per-property ASAs; daily USDC rental distributions.",
            },
            "subSectorMetrics": {
                "kind": "real-estate",
                "propertiesCount": _sourced(None),
                "averagePropertyValueUsd": _sourced(None),
                "rentalYieldRangePct": "Daily rental yield distributed in USDC",
                "geographicScope": "US residential",
                "custodyStructure": "Per-property US LLC; Lofty Inc. as manager.",
            },
        },
        member_coins=[],
    ),
    # ---- Carbon / ESG ---------------------------------------------------
    "toucan-protocol": _net(
        name="Toucan Protocol",
        symbol="BCT",
        tagline="Tokenized verified carbon credits.",
        description=(
            "Toucan Protocol tokenizes verified carbon credits (BCT / NCT pool "
            "tokens), bridging credits from registries like Verra onto chain for "
            "transparent on-chain offsetting and liquid carbon markets. BCT admin "
            "was transferred to KlimaDAO in 2024."
        ),
        differentiator=(
            "Bridges Verra-registry carbon credits on-chain into liquid BCT / NCT "
            "pool tokens for transparent retirement."
        ),
        sub_sector="Carbon / ESG",
        secondary_tags=["Yield-Bearing", "Multi-Chain", "DAO-Governed"],
        regulatory_status="Not a security; tied to Verra registry retirement.",
        official_docs="https://docs.toucan.earth",
        website="https://toucan.earth",
        twitter="https://x.com/toucanprotocol",
        audit_firms="Code4rena, Hexens.",
        chains=["Polygon", "Celo", "Regen Network"],
        tvl_usd=618_000,
        risks=[
            {
                "category": "Collateral",
                "description": (
                    "Carbon prices collapsed 80%+ from 2022 peaks; pool TVL is small "
                    "(~$618K, May 2025) and credit quality varies by vintage."
                ),
            }
        ],
        rwa={
            "aumUsd": _sourced(618_000),
            "regulatoryStatus": "Not a security; tied to Verra registry retirement.",
            "auditHistory": "Code4rena, Hexens.",
            "deployment": {
                "chains": ["Polygon", "Celo", "Regen Network"],
                "evmCompatible": "mixed",
                "notes": "Polygon primary; BCT (0x2F80...A7F), NCT (0xd838...6107).",
            },
            "subSectorMetrics": {
                "kind": "carbon",
                "creditsTokenizedTonnes": _sourced(None),
                "registryPartners": ["Verra"],
                "vintageRangeYears": "Mixed vintages bridged from Verra.",
            },
        },
        member_coins=[],
    ),
    # ---- Tokenized Treasuries -------------------------------------------
    "franklin-templeton": _net(
        name="Franklin Templeton",
        symbol="BENJI",
        tagline="The only '40 Act mutual fund tokenized on-chain.",
        description=(
            "Franklin Templeton runs the only '40 Act-registered mutual fund "
            "tokenized on-chain, accessible to retail at a $20 minimum via the Benji "
            "app. The BENJI token represents 1 share of FOBXX (Franklin OnChain US "
            "Government Money Fund), with yield from short-duration Treasuries + repo."
        ),
        differentiator=(
            "SEC-registered '40 Act mutual fund on-chain, retail-accessible at $20 "
            "via Benji; Franklin Templeton is its own transfer agent."
        ),
        sub_sector="Tokenized Treasuries",
        secondary_tags=["Institutional-Gated", "Multi-Chain", "Compliance-Heavy", "Yield-Bearing", "Real-World-Custody"],
        regulatory_status="SEC-registered '40 Act mutual fund; Franklin Templeton transfer agent.",
        official_docs="https://benjiinvestments.franklintempleton.com",
        website="https://www.franklintempleton.com",
        twitter="https://x.com/FTI_US",
        audit_firms="PwC (audited mutual fund).",
        chains=["Stellar", "Polygon", "Avalanche", "Arbitrum", "Aptos", "Base", "Solana", "Sui", "Ethereum"],
        tvl_usd=1_980_000_000,
        rwa={
            "aumUsd": _sourced(1_980_000_000),
            "regulatoryStatus": "SEC-registered '40 Act mutual fund; self transfer agent.",
            "auditHistory": "PwC (audited mutual fund).",
            "deployment": {
                "chains": ["Stellar", "Polygon", "Avalanche", "Arbitrum", "+5 more"],
                "evmCompatible": "mixed",
                "notes": "Stellar primary; Benji live on 9 chains (Solana / Sui / Aptos non-EVM).",
            },
            "subSectorMetrics": {
                "kind": "treasuries",
                "underlyingAssets": ["Short-duration US Treasuries", "Repo"],
                "duration": "Short-duration (money market)",
                "yieldDistribution": "exchange-rate",
                "fundStructure": "FOBXX ('40 Act US Government Money Fund); 1 BENJI = 1 share.",
                "navUsd": _sourced(None),
                "custodian": "Franklin Templeton (transfer agent + custodian).",
            },
        },
        member_coins=[],
    ),
}


def _seed(
    *,
    slug: str,
    name: str,
    symbol: str,
    tagline: str,
    sub_sector: str,
    secondary_tags: List[str],
    website: str,
    description: str = "",
) -> Dict[str, Any]:
    """Minimal long-tail RWA entity card (ontology §6.4)."""
    return _net(
        name=name,
        symbol=symbol,
        tagline=tagline,
        description=description or tagline,
        differentiator=tagline,
        sub_sector=sub_sector,
        secondary_tags=secondary_tags,
        regulatory_status="",
        rwa={
            "aumUsd": _sourced(None),
            "regulatoryStatus": None,
            "auditHistory": None,
            "deployment": {"chains": [], "evmCompatible": "mixed", "notes": "Seed card — expand as data lands."},
            "subSectorMetrics": {"kind": sub_sector.lower().replace(" / ", "-").replace(" ", "-")},
        },
        member_coins=[],
        chains=[],
        website=website,
    )


# Long-tail RWA seeds (ontology §6.4) — promote to full cards as data lands.
RWA_ENTITY_SPECS.update({
    "arcton": _seed(
        slug="arcton",
        name="Arcton",
        symbol="ARCTON",
        tagline="Tokenized pre-IPO and private equity access.",
        sub_sector="Tokenized Equities",
        secondary_tags=["Institutional-Gated"],
        website="https://arcton.com",
    ),
    "aryze": _seed(
        slug="aryze",
        name="Aryze",
        symbol="ARYZE",
        tagline="Multi-currency RWA stablecoins and FX tokens.",
        sub_sector="Stablecoins & FX",
        secondary_tags=["Multi-Currency", "Compliance-Heavy"],
        website="https://aryze.io",
    ),
    "atmosphera": _seed(
        slug="atmosphera",
        name="Atmosphera",
        symbol="ATMOS",
        tagline="Event and weather-linked structured finance.",
        sub_sector="Event Finance",
        secondary_tags=[],
        website="https://atmosphera.com",
    ),
    "chateau-capital": _seed(
        slug="chateau-capital",
        name="Chateau Capital",
        symbol="CHATEAU",
        tagline="Structured RWA credit products.",
        sub_sector="Structured Products",
        secondary_tags=["Institutional-Gated"],
        website="https://chateau.capital",
    ),
    "dinari": _seed(
        slug="dinari",
        name="Dinari",
        symbol="DINARI",
        tagline="Tokenized US equities as dShares.",
        sub_sector="Tokenized Equities",
        secondary_tags=["Compliance-Heavy", "Multi-Chain"],
        website="https://dinari.com",
    ),
    "dualmint": _seed(
        slug="dualmint",
        name="DualMint",
        symbol="DUAL",
        tagline="Tokenization infrastructure for real-world assets.",
        sub_sector="Tokenization Infrastructure",
        secondary_tags=["Permissioned"],
        website="https://dualmint.com",
    ),
    "estate-protocol": _seed(
        slug="estate-protocol",
        name="Estate Protocol",
        symbol="ESTATE",
        tagline="Fractional commercial real estate on-chain.",
        sub_sector="Real Estate",
        secondary_tags=["Real-World-Custody", "Permissioned"],
        website="https://estateprotocol.com",
    ),
    "florence-finance": _seed(
        slug="florence-finance",
        name="Florence Finance",
        symbol="FF",
        tagline="SME invoice financing on-chain.",
        sub_sector="Private Credit",
        secondary_tags=["Permissioned"],
        website="https://florence.finance",
    ),
})

# Cross-tagged RWA entities with secondary Lending sector — MemberCoin audit entries.
RWA_LENDING_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    "centrifuge": {"expected": 1, "rationale": "CFG governance"},
    "clearpool": {"expected": 1, "rationale": "CPOOL governance"},
    "goldfinch": {"expected": 1, "rationale": "GFI governance"},
}
