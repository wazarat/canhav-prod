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


def _rwa_coin(
    slug: str,
    name: str,
    symbol: str,
    role: str,
    sub_category: str = "Treasuries & Funds",
) -> Dict[str, Any]:
    """Member-coin ref to a CATEGORY#RWA partition row (ingest_rwas.py)."""
    return _coin(slug, name, symbol, role, sub_category=sub_category, category="RWA")


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
    # --- editorial content backing the six General Data tabs (M1) ---
    components: Optional[List[Dict[str, Any]]] = None,
    faq: Optional[List[Dict[str, Any]]] = None,
    org_structure: Optional[List[Dict[str, Any]]] = None,
    tradfi_comparison: Optional[List[Dict[str, Any]]] = None,
    timeline: Optional[List[Dict[str, Any]]] = None,
    offchain_facts: Optional[List[Dict[str, Any]]] = None,
    partnerships: Optional[List[Dict[str, Any]]] = None,
    investment_rounds: Optional[List[Dict[str, Any]]] = None,
    audits: Optional[List[Dict[str, Any]]] = None,
    sources: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Build an RWA-entity spec, filling the editorial defaults that
    `build_entity_item` expects so each entry stays focused on real content."""
    # The auto-generated regulatory-status fact is prepended to any authored
    # off-chain facts so both survive (M1 research supplies the rest).
    _facts: List[Dict[str, Any]] = []
    if regulatory_status:
        _facts.append(_reg_fact(regulatory_status, name, website or official_docs or ""))
    if offchain_facts:
        _facts.extend(offchain_facts)
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
        "components": components or [],
        "faq": faq or [],
        "org_structure": org_structure or [],
        "tradfi_comparison": tradfi_comparison or [],
        "timeline": timeline or None,
        "risks": risks or [],
        "events": events or [],
        "investment_rounds": investment_rounds or [],
        "partnerships": partnerships or [],
        "audits": audits or None,
        "sources": sources or None,
        "current_scale": _empty_scale(tvl_usd=tvl_usd),
        "scale_labels": scale_labels or {"tvl": "Assets under management"},
        "offchain_facts": _facts or None,
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
        components=[
            {
                'name': 'Securitize Platform (DS Protocol / DSToken)',
                'description': 'Compliance-first tokenization stack built on the Digital Securities (DS) Protocol. Its DSToken is an ERC-20-compatible security token whose transfers route through modular Registry, Compliance and Trust services that enforce whitelisting, lockups and jurisdictional investor limits on-chain.',
            },
            {
                'name': 'Securitize Markets, LLC',
                'description': "SEC-registered broker-dealer and FINRA/SIPC member operating an alternative trading system (ATS). It is the exclusive channel through which qualifying investors subscribe to tokenized offerings such as Apollo's ACRED, and provides a secondary marketplace for digital asset securities.",
            },
            {
                'name': 'Transfer Agent & Fund Administration',
                'description': "SEC-registered transfer agent services that maintain the official register of token holders, process dividends/distributions and act as fund administrator. Securitize is the transfer agent for BlackRock's BUIDL and Apollo's ACRED.",
            },
            {
                'name': 'Cross-chain Interoperability (Wormhole)',
                'description': 'Via its official interoperability partner Wormhole, Securitize moves tokenized fund shares across multiple blockchains, enabling products like BUIDL and ACRED to exist on Ethereum, Aptos, Avalanche, Polygon, Solana and other networks.',
            },
        ],
        faq=[
            {
                'question': 'What is Securitize?',
                'answer': "Securitize is an SEC-registered tokenization firm founded in 2017 that provides regulated infrastructure to bring real-world assets on-chain. It operates as a registered transfer agent and, through Securitize Markets, a broker-dealer/ATS. It is the tokenization platform behind BlackRock's BUIDL and Apollo's ACRED, with more than $4 billion in tokenized assets under management.",
                'pinned': True,
            },
            {
                'question': 'Is Securitize regulated?',
                'answer': 'Yes. Securitize, LLC is an SEC-registered transfer agent; Securitize Markets, LLC is a registered broker-dealer and FINRA/SIPC member operating an alternative trading system; and Securitize Capital, LLC is an exempt reporting adviser. It gained its broker-dealer and ATS registrations through the 2020 acquisition of Distributed Technology Markets.',
                'pinned': False,
            },
            {
                'question': 'What is BUIDL and how is Securitize involved?',
                'answer': "BUIDL is the BlackRock USD Institutional Digital Liquidity Fund, BlackRock's first tokenized fund on a public blockchain, launched March 2024 on Ethereum. Securitize is the tokenization platform, transfer agent and fund administrator. BUIDL surpassed $1 billion in AUM in March 2025 and has expanded across multiple chains.",
                'pinned': False,
            },
            {
                'question': 'How do investors access Securitize-tokenized funds?',
                'answer': 'Qualifying (typically qualified/accredited or institutional) investors subscribe through Securitize Markets, LLC, the broker-dealer subsidiary. On-chain, holdings are represented as compliance-gated security tokens whose transfers are restricted to verified, whitelisted wallets.',
                'pinned': False,
            },
            {
                'question': "Who are Securitize's main clients?",
                'answer': "Securitize provides tokenization infrastructure to major asset managers including BlackRock, Apollo, Hamilton Lane, KKR, VanEck and BNY. Its most prominent products are BlackRock's BUIDL and Apollo's ACRED credit fund.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Securitize, Inc.',
                'role': 'Parent / tokenization platform',
                'description': 'Delaware-incorporated parent founded in November 2017 by Carlos Domingo (CEO), Jamie Finn, Tim Reynders and Shay Finkelstein. Operates the DS Protocol tokenization platform and SEC-registered transfer agent business. Went public on the NYSE (ticker SECZ) via a SPAC merger with Cantor Equity Partners II.',
            },
            {
                'name': 'Securitize Markets, LLC',
                'role': 'Broker-dealer / ATS',
                'description': 'Registered broker-dealer, FINRA/SIPC member, and operator of an alternative trading system. Distributes tokenized securities to qualifying investors and runs a marketplace for secondary trading of digital asset securities.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'SEC-registered transfer agent (e.g., Computershare, DTC)',
                'similarity': 'Maintains the authoritative register of securities holders, processes distributions/dividends and handles record-keeping for regulated securities.',
                'differences': 'Securitize maintains the register on public blockchains as programmable security tokens, enabling near-instant 24/7 peer-to-peer transfer among whitelisted wallets and atomic on-chain compliance rather than T+1/T+2 batch settlement through legacy intermediaries.',
            },
            {
                'product': 'Securities issuance & private-placement platform / broker-dealer',
                'similarity': 'Facilitates primary issuance of securities to qualified/accredited investors and operates a regulated marketplace (ATS) for trading them, like a traditional placement agent plus alternative trading venue.',
                'differences': 'Ownership is represented as tokens governed by embedded compliance code (lockups, jurisdiction limits, whitelists) that execute automatically, reducing manual intermediation and enabling fractionalization and multi-chain distribution.',
            },
        ],
        events=[
            {
                'date': '2024-03-20',
                'title': 'BlackRock launches BUIDL, tokenized by Securitize',
                'description': "BlackRock's first tokenized fund, the USD Institutional Digital Liquidity Fund (BUIDL), launches on Ethereum with Securitize as tokenization platform, transfer agent and fund administrator.",
                'link': 'https://www.businesswire.com/news/home/20240320771318/en/BlackRock-Launches-Its-First-Tokenized-Fund-BUIDL-on-the-Ethereum-Network',
            },
            {
                'date': '2024-05-01',
                'title': '$47M strategic round led by BlackRock',
                'description': "Securitize closes a $47 million strategic funding round led by BlackRock, with Hamilton Lane, ParaFi Capital, Tradeweb Markets, Aptos Labs, Circle and Paxos participating. BlackRock's Joseph Chalom joins the board.",
                'link': 'https://www.prnewswire.com/news-releases/securitize-announces-47-million-strategic-funding-round-led-by-blackrock-302133075.html',
            },
            {
                'date': '2025-01-30',
                'title': 'Apollo & Securitize launch ACRED tokenized credit fund',
                'description': 'Securitize partners with Apollo to launch the Apollo Diversified Credit Securitize Fund (ACRED), a tokenized feeder fund available on multiple chains, distributed via Securitize Markets with Securitize as transfer agent and fund administrator.',
                'link': 'https://securitize.io/learn/press/apollo-and-securitize-announce-partnership-and-launch-tokenized-access-to-credit-fund',
            },
            {
                'date': '2025-03-13',
                'title': 'BUIDL surpasses $1 billion in AUM',
                'description': 'The BlackRock USD Institutional Digital Liquidity Fund, tokenized by Securitize, crosses $1 billion in assets under management, a milestone for the tokenized fund market.',
                'link': 'https://www.prnewswire.com/news-releases/blackrock-usd-institutional-digital-liquidity-fund-buidl-tokenized-by-securitize-surpasses-1b-in-aum-302401480.html',
            },
            {
                'date': '2025-10-28',
                'title': 'Securitize to go public via SPAC merger',
                'description': 'Securitize agrees to merge with Cantor Equity Partners II at a pre-money equity valuation of ~$1.25 billion, expected to raise roughly $400 million gross including a $225 million PIPE, to list on the NYSE.',
                'link': 'https://www.cnbc.com/2025/10/28/-blackrock-linked-tokenization-firm-securitize-to-go-public-via-spac-deal.html',
            },
        ],
        timeline=[
            {
                'date': '2017-11-01',
                'title': 'Securitize founded',
                'description': "Company founded by Carlos Domingo, Jamie Finn, Tim Reynders and Shay Finkelstein, growing out of the DS Protocol built for SPiCE VC's tokenized fund.",
                'link': 'https://en.wikipedia.org/wiki/Securitize,_Inc.',
                'status': 'executed',
            },
            {
                'date': '2020-11-01',
                'title': 'Acquires broker-dealer & ATS (Distributed Technology Markets)',
                'description': 'Securitize acquires Distributed Technology Markets, obtaining a broker-dealer license and ATS registration that become Securitize Markets.',
                'link': 'https://en.wikipedia.org/wiki/Securitize,_Inc.',
                'status': 'executed',
            },
            {
                'date': '2021-06-01',
                'title': '$48M Series B',
                'description': 'Securitize raises a $48 million Series B led by Morgan Stanley and Blockchain Capital.',
                'link': 'https://en.wikipedia.org/wiki/Securitize,_Inc.',
                'status': 'executed',
            },
            {
                'date': '2024-03-20',
                'title': 'BUIDL launched on Ethereum',
                'description': "BlackRock's first tokenized fund goes live, tokenized by Securitize.",
                'link': 'https://www.businesswire.com/news/home/20240320771318/en/BlackRock-Launches-Its-First-Tokenized-Fund-BUIDL-on-the-Ethereum-Network',
                'status': 'executed',
            },
            {
                'date': '2026-07-02',
                'title': 'NYSE listing under ticker SECZ',
                'description': 'Following the Cantor Equity Partners II SPAC merger, Securitize begins trading on the NYSE under the ticker SECZ, entering public markets with more than $4 billion in tokenized AUM.',
                'link': 'https://www.techtimes.com/articles/319267/20260629/securitize-heads-nyse-400m-blackrock-backed-tokenization-platform-set-july-2-debut.htm',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Tokenized assets under management',
                'value': 'More than $4 billion in tokenized assets under management, making Securitize the largest RWA tokenization platform (~20% market share).',
                'freshness': 'static',
                'source': {
                    'label': 'CNBC — Securitize to go public via SPAC',
                    'url': 'https://www.cnbc.com/2025/10/28/-blackrock-linked-tokenization-firm-securitize-to-go-public-via-spac-deal.html',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding raised',
                'value': 'Approximately $132M raised across multiple rounds from 57+ investors, including a $47M BlackRock-led strategic round (May 2024) and a $48M Series B (June 2021).',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — BlackRock leads $47M round',
                    'url': 'https://www.theblock.co/post/291966/blackrock-leads-47-million-strategic-funding-round-in-tokenization-firm-securitize',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'SPAC merger valuation',
                'value': 'Merged with Cantor Equity Partners II at a ~$1.25B pre-money equity valuation, raising ~$400M gross (incl. $225M PIPE); listed on NYSE as SECZ.',
                'freshness': 'static',
                'source': {
                    'label': 'Yahoo Finance — Securitize NYSE debut',
                    'url': 'https://finance.yahoo.com/markets/stocks/articles/blackrock-linked-securitize-eyes-nyse-145357921.html',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Regulatory',
                'description': "Securitize's entire model depends on maintaining SEC transfer-agent, broker-dealer/ATS and exempt-reporting-adviser registrations across multiple jurisdictions. Changes in securities law, enforcement posture or the classification of tokenized funds could restrict issuance, distribution or secondary trading.",
            },
            {
                'category': 'Counterparty',
                'description': 'Value in tokenized products depends on off-chain counterparties — asset managers (BlackRock, Apollo), fund administrators, custodians and banks that hold the underlying assets. Investors rely on Securitize and these partners honoring redemption and administration obligations; a partner default or operational failure would impair token value.',
            },
            {
                'category': 'Smart Contract',
                'description': 'The DS Protocol / DSToken contracts enforce compliance, minting, burning and transfers on-chain. Bugs such as the totalIssued burn-logic cap-lock flagged in the September 2025 Halborn audit could freeze issuance or break transfers; upgradeable proxy patterns also introduce admin-key and upgrade risk.',
            },
            {
                'category': 'Collateral',
                'description': 'Tokenized funds like BUIDL (money-market/Treasury backed) and ACRED (private credit) are only as sound as their underlying collateral. Private credit exposure in ACRED carries default, illiquidity and valuation risk, and interval-fund redemption limits can restrict investor exits regardless of on-chain liquidity.',
            },
            {
                'category': 'Network',
                'description': 'Products span many chains (Ethereum, Aptos, Avalanche, Polygon, Solana, BNB Chain and others) with cross-chain movement relying on Wormhole. Chain outages, reorgs or a bridge exploit could disrupt transfers or compromise assets bridged between networks.',
            },
        ],
        competitors=[
            {
                'name': 'Ondo Finance',
                'slug': 'ondo-finance',
                'rank': 1,
                'positioning': 'Leading issuer of tokenized U.S. Treasuries and yield products (OUSG, USDY) and a scaled RWA platform.',
                'similarities': 'Both bring regulated, yield-bearing real-world assets on-chain for institutional and qualified investors and are top players in RWA tokenization.',
                'differences': 'Ondo is primarily a product issuer of its own tokenized funds and infrastructure, whereas Securitize is the regulated transfer-agent/broker-dealer infrastructure layer that tokenizes on behalf of third-party managers like BlackRock and Apollo.',
            },
            {
                'name': 'Franklin Templeton (Benji)',
                'slug': 'franklin-templeton',
                'rank': 2,
                'positioning': 'Traditional asset manager running its own on-chain money-market fund (FOBXX) via its Benji tokenization platform.',
                'similarities': 'Both operate regulated tokenized funds and act as their own transfer agent for on-chain shareholder records.',
                'differences': 'Franklin Templeton tokenizes only its own funds on a proprietary platform; Securitize is a multi-manager, multi-chain infrastructure provider serving many issuers.',
            },
            {
                'name': 'Centrifuge',
                'slug': 'centrifuge',
                'rank': 3,
                'positioning': 'On-chain platform for tokenizing real-world credit and structured assets into DeFi liquidity pools.',
                'similarities': 'Both tokenize real-world assets (notably credit) and provide the on-chain rails for institutional participation.',
                'differences': 'Centrifuge is a decentralized, DeFi-native protocol focused on collateralized credit pools, while Securitize is a fully SEC-registered, permissioned securities-infrastructure firm.',
            },
            {
                'name': 'Dinari',
                'slug': 'dinari',
                'rank': 4,
                'positioning': 'Issuer of tokenized U.S. equities (dShares) via registered broker-dealer infrastructure.',
                'similarities': 'Both use registered broker-dealer status to issue compliant tokenized securities to investors on-chain.',
                'differences': 'Dinari focuses on tokenized public equities for retail-style access, whereas Securitize centers on institutional tokenized funds (money-market, credit, private markets) for major asset managers.',
            },
        ],
        partnerships=[
            {
                'name': 'BlackRock (BUIDL)',
                'date': '2024-03-20',
                'amountLabel': None,
                'description': "Securitize is the tokenization platform, SEC-registered transfer agent and fund administrator for BlackRock's BUIDL, BlackRock's first tokenized fund on a public blockchain. BlackRock also led Securitize's $47M strategic round and holds a board seat.",
            },
            {
                'name': 'Apollo (ACRED)',
                'date': '2025-01-30',
                'amountLabel': None,
                'description': "Partnership to tokenize Apollo's diversified credit strategy as the ACRED feeder fund across multiple chains, with Securitize as broker-dealer distributor, transfer agent and fund administrator.",
            },
            {
                'name': 'Wormhole (interoperability)',
                'date': '2024-11-01',
                'amountLabel': None,
                'description': 'Official cross-chain interoperability partner enabling Securitize-tokenized funds (BUIDL, ACRED) to move across Ethereum, Aptos, Avalanche, Polygon, Solana, BNB Chain and other networks.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-06-01',
                'round': 'Series B',
                'amountUsd': 48000000,
                'amountLabel': '$48M',
                'investors': [
                    'Morgan Stanley',
                    'Blockchain Capital',
                ],
                'link': 'https://en.wikipedia.org/wiki/Securitize,_Inc.',
            },
            {
                'date': '2024-05-01',
                'round': 'Strategic',
                'amountUsd': 47000000,
                'amountLabel': '$47M',
                'investors': [
                    'BlackRock',
                    'Hamilton Lane',
                    'ParaFi Capital',
                    'Tradeweb Markets',
                    'Aptos Labs',
                    'Circle',
                    'Paxos',
                ],
                'link': 'https://www.prnewswire.com/news-releases/securitize-announces-47-million-strategic-funding-round-led-by-blackrock-302133075.html',
            },
        ],
        audits=[
            {
                'firm': 'Halborn',
                'date': '2025-10-08',
                'url': 'https://www.halborn.com/audits/securitize/dstoken-e07b34',
            },
        ],
        sources=[
            {
                'label': 'PR Newswire — $47M strategic round led by BlackRock (May 1, 2024)',
                'url': 'https://www.prnewswire.com/news-releases/securitize-announces-47-million-strategic-funding-round-led-by-blackrock-302133075.html',
            },
            {
                'label': 'BusinessWire — BlackRock launches BUIDL on Ethereum (Mar 20, 2024)',
                'url': 'https://www.businesswire.com/news/home/20240320771318/en/BlackRock-Launches-Its-First-Tokenized-Fund-BUIDL-on-the-Ethereum-Network',
            },
            {
                'label': 'Securitize press — Apollo & Securitize launch ACRED',
                'url': 'https://securitize.io/learn/press/apollo-and-securitize-announce-partnership-and-launch-tokenized-access-to-credit-fund',
            },
            {
                'label': 'PR Newswire — BUIDL surpasses $1B AUM',
                'url': 'https://www.prnewswire.com/news-releases/blackrock-usd-institutional-digital-liquidity-fund-buidl-tokenized-by-securitize-surpasses-1b-in-aum-302401480.html',
            },
            {
                'label': 'CNBC — Securitize to go public via SPAC',
                'url': 'https://www.cnbc.com/2025/10/28/-blackrock-linked-tokenization-firm-securitize-to-go-public-via-spac-deal.html',
            },
            {
                'label': 'Wikipedia — Securitize, Inc.',
                'url': 'https://en.wikipedia.org/wiki/Securitize,_Inc.',
            },
            {
                'label': 'Halborn — DSToken security audit',
                'url': 'https://www.halborn.com/audits/securitize/dstoken-e07b34',
            },
        ],
        github='https://github.com/securitize-io',
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
        secondary_tags=["Institutional-Gated", "Multi-Chain"],
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
        components=[
            {
                'name': 'Centrifuge V3',
                'description': 'EVM-based protocol for onchain asset management, launched 2025 after migrating off the legacy Polkadot-based Centrifuge Chain. Provides chain abstraction and a unified interface for issuing and administering tokenized funds across 10+ Ethereum-compatible networks including Ethereum, Base and Arbitrum.',
            },
            {
                'name': 'Tinlake',
                'description': "Centrifuge's original (2018/2020-era) open marketplace and investment dApp for financing tokenized real-world assets. Introduced the two-tranche DROP (senior) / TIN (junior) securitization model that gives investors differentiated risk-reward exposure to asset pools.",
            },
            {
                'name': 'Pools & Tranches (DROP / TIN)',
                'description': 'Asset originators (Issuers) create pools of tokenized RWAs; investors fund senior (DROP) and junior (TIN) tranches. TIN absorbs first losses and earns higher yield, DROP has payout priority — mirroring traditional structured-credit waterfalls.',
            },
            {
                'name': 'RWA tokenization / NFTs',
                'description': 'Real-world assets such as invoices, mortgages, trade-finance receivables and treasury holdings are represented onchain (originally minted as NFTs) and used as collateral to originate financing pools.',
            },
            {
                'name': 'CFG token',
                'description': 'Native ERC-20 utility and governance token. On 20 March 2025, governance proposal CP149 consolidated legacy token versions into a single Ethereum-native CFG used for voting on protocol development, treasury and risk frameworks.',
            },
        ],
        faq=[
            {
                'question': 'What is Centrifuge?',
                'answer': 'Centrifuge is a decentralized asset-financing protocol and real-world-asset (RWA) tokenization platform. It lets asset originators bring off-chain assets — private credit, trade-finance receivables, mortgages and tokenized treasury funds — onchain and finance them from DeFi liquidity.',
                'pinned': True,
            },
            {
                'question': 'What is the difference between Tinlake and Centrifuge V3?',
                'answer': 'Tinlake was the original pool-based dApp on the legacy Centrifuge Chain that pioneered the DROP/TIN tranche model. Centrifuge V3, launched in 2025, is a re-architected EVM-native protocol that operates across 10+ Ethereum-compatible chains and offers a unified interface for onchain fund administration.',
                'pinned': False,
            },
            {
                'question': 'What are DROP and TIN tokens?',
                'answer': 'Each Centrifuge pool is split into two tranches. DROP is the senior tranche with priority on repayments and a lower, more stable yield; TIN is the junior tranche that absorbs first losses and earns a higher variable return — analogous to senior/equity tranches in traditional securitization.',
                'pinned': False,
            },
            {
                'question': "What was Centrifuge's role with MakerDAO?",
                'answer': 'Centrifuge pools were among the first RWA collateral used to back DAI. In 2021 New Silver — a fix-and-flip real-estate loan pool on Centrifuge Tinlake — became the first real-world asset financed via MakerDAO, tapping a Maker vault credit line to mint DAI against real-estate-backed collateral.',
                'pinned': False,
            },
            {
                'question': 'What is the Anemoy Liquid Treasury Fund?',
                'answer': "Anemoy's Liquid Treasury Fund (LTF), launched on Centrifuge in October 2023, is a fully onchain tokenized fund giving investors direct exposure to short-term US Treasury bills. In September 2024 Janus Henderson joined as sub-advisor to manage the fund.",
                'pinned': False,
            },
            {
                'question': 'What is the CFG token used for?',
                'answer': 'CFG is the native ERC-20 utility and governance token. Holders vote through the Centrifuge DAO on protocol development, treasury spending and risk frameworks. A March 2025 proposal (CP149) unified prior token versions into a single Ethereum-native CFG.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Centrifuge Network Foundation (CNF)',
                'role': 'Foundation / governance oversight',
                'description': 'Funds research, development and maintenance of the Centrifuge protocol and ecosystem and provides governance and oversight of execution. Per proposal CP171 (Nov 2025), the CNF Board oversees strategy while operations move into Centrifuge Labs, its wholly-owned subsidiary.',
            },
            {
                'name': 'k/factory (k/f) & Centrifuge Labs',
                'role': 'Core development studio',
                'description': 'k/factory is a software studio founded by original protocol contributors who build Centrifuge per community direction. Under the 2025 restructuring, Centrifuge Labs (a wholly-owned CNF subsidiary) leads product, marketing, partnerships, distribution and revenue growth.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Securitization / structured credit (ABS)',
                'similarity': 'Centrifuge pools bundle income-producing assets (invoices, mortgages, receivables) and issue tranched claims (DROP senior / TIN junior) with a payment waterfall — the same senior/subordinated structure used in asset-backed securities.',
                'differences': 'Issuance, subscriptions, redemptions and the cap table are handled onchain via smart contracts and stablecoins rather than through banks, custodians and clearing houses, enabling smaller ticket sizes, near-real-time settlement and transparent onchain accounting.',
            },
            {
                'product': 'Money-market / tokenized Treasury funds',
                'similarity': 'Products like the Anemoy Liquid Treasury Fund give investors T-bill exposure much like a traditional government money-market fund.',
                'differences': 'The fund is issued as a transferable onchain token that settles 24/7, can be used as DeFi collateral, and is administered across multiple public blockchains instead of via a traditional transfer agent.',
            },
        ],
        events=[
            {
                'date': '2021-04-20',
                'title': 'First real-world asset financed via MakerDAO',
                'description': 'New Silver, a fix-and-flip real-estate loan pool on Centrifuge Tinlake, became the first RWA to back DAI, tapping a MakerDAO vault credit line — a landmark for onchain private credit.',
                'link': 'https://medium.com/centrifuge/defi-2-0-first-real-world-loan-is-financed-on-maker-fbe24675428f',
            },
            {
                'date': '2023-10-03',
                'title': 'Anemoy Liquid Treasury Fund launches',
                'description': 'Centrifuge launched the Anemoy Liquid Treasury Fund, a fully onchain tokenized fund providing direct exposure to short-term US Treasury bills.',
                'link': 'https://gov.centrifuge.io/t/pop-anemoy-liquid-treasury-fund-1/5651',
            },
            {
                'date': '2024-09-13',
                'title': 'Janus Henderson partners on tokenized Treasury fund',
                'description': 'Janus Henderson announced a partnership with Anemoy and Centrifuge to sub-advise the Liquid Treasury Fund — its first tokenized fund — managing the portfolio via subsidiary Tabula.',
                'link': 'https://www.janushenderson.com/corporate/press-releases/janus-henderson-to-partner-with-anemoy-and-centrifuge-on-its-first-tokenized-fund/',
            },
            {
                'date': '2025-03-20',
                'title': 'CFG V3 token consolidation (CP149) and migration to Ethereum',
                'description': 'Governance proposal CP149 passed, consolidating legacy token versions into a single Ethereum-native ERC-20 CFG as Centrifuge migrated from its Polkadot-based chain to an EVM architecture.',
                'link': 'https://docs.centrifuge.io/getting-started/token-summary/',
            },
            {
                'date': '2026-06-30',
                'title': 'New York Life Investment Management tokenizes high-yield bond strategy',
                'description': "Centrifuge and New York Life Investment Management announced a partnership to tokenize a US high-yield corporate bond strategy — NYLIM's first tokenization move.",
                'link': 'https://www.businesswire.com/news/home/20260630051099/en/Centrifuge-and-New-York-Life-Investment-Management-Partner-to-Tokenize-U.S.-High-Yield-Corporate-Bond-Strategy',
            },
        ],
        timeline=[
            {
                'date': '2025-03-20',
                'title': 'Centrifuge V3 launch & Ethereum migration',
                'description': 'Migration from the legacy Polkadot-based Centrifuge Chain to an EVM-native V3 protocol spanning 10+ Ethereum-compatible networks, with a unified CFG token.',
                'link': 'https://docs.centrifuge.io/getting-started/token-summary/',
                'status': 'executed',
            },
            {
                'date': '2025-11-01',
                'title': 'Governance restructuring (CP171)',
                'description': 'Proposal CP171 moved operational strategy and execution into Centrifuge Labs (a wholly-owned CNF subsidiary) under Centrifuge Network Foundation oversight, aligning execution, transparency and CFG value accrual.',
                'link': 'https://gov.centrifuge.io/t/cp171-aligning-for-execution-transparency-and-cfg-value-accrual-through-centrifuge-network-foundation/7132/1',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'V3 multi-chain deployment',
                'value': 'After migrating off its Polkadot-based chain in March 2025, Centrifuge V3 operates across 10+ Ethereum-compatible networks including Ethereum, Base and Arbitrum, with a unified fund-administration interface.',
                'freshness': 'static',
                'source': {
                    'label': 'Centrifuge — Onchain Asset Management',
                    'url': 'https://centrifuge.io/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Institutional distribution partners',
                'value': "Centrifuge's platform powers onchain strategies for Apollo, Janus Henderson and S&P Dow Jones Indices, with tokens live across DeFi protocols including Sky, Aave and Morpho.",
                'freshness': 'dynamic',
                'source': {
                    'label': 'Janus Henderson press release',
                    'url': 'https://www.janushenderson.com/corporate/press-releases/janus-henderson-to-partner-with-anemoy-and-centrifuge-on-its-first-tokenized-fund/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'CFG token consolidation date',
                'value': 'On 20 March 2025 governance proposal CP149 passed, consolidating legacy token versions into a single Ethereum-native ERC-20 CFG governance token.',
                'freshness': 'static',
                'source': {
                    'label': 'The CFG Token — Centrifuge Docs',
                    'url': 'https://docs.centrifuge.io/getting-started/token-summary/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': 'Pools finance off-chain private credit and receivables; if underlying borrowers or asset originators default or fail to remit repayments, investors — especially junior (TIN) tranche holders — can lose principal. Repayment depends on off-chain legal enforcement of loan agreements and SPV structures.',
            },
            {
                'category': 'Collateral',
                'description': 'Collateral (invoices, mortgages, fix-and-flip loans, corporate bonds) is illiquid and valued off-chain. Valuation errors, collateral deterioration, or delayed liquidation can leave pools under-collateralized versus the tokens issued against them.',
            },
            {
                'category': 'Regulatory',
                'description': 'Tokenizing securities and Treasury funds implicates securities, KYC/AML and cross-border regulations. Access is often permissioned/whitelisted, and evolving rules across jurisdictions (SPVs, transfer agents, fund licensing) could restrict issuance or investor eligibility.',
            },
            {
                'category': 'Smart Contract',
                'description': 'The V3 protocol runs across 10+ chains with complex tranching, cross-chain messaging and fund-administration logic. Bugs or exploits in the contracts could cause loss of funds despite multiple third-party audits and fuzzing coverage.',
            },
            {
                'category': 'Governance',
                'description': 'Protocol direction, treasury and risk parameters are controlled by CFG-token-weighted DAO voting. Low voter participation or concentration of CFG could enable governance capture; the 2025 shift of execution to Centrifuge Labs concentrates operational control under foundation oversight.',
            },
        ],
        competitors=[
            {
                'name': 'Goldfinch',
                'slug': 'goldfinch',
                'rank': 1,
                'positioning': 'Onchain private-credit protocol focused on emerging-market and off-chain business lending via decentralized underwriting.',
                'similarities': 'Both tokenize off-chain private credit and channel DeFi liquidity to real-world borrowers backed by legal loan agreements.',
                'differences': "Goldfinch emphasizes decentralized 'backer' underwriting and emerging-market loans, whereas Centrifuge focuses on structured/tranched pools, trade finance and institutional tokenized funds (Treasuries, corporate credit).",
            },
            {
                'name': 'Clearpool',
                'slug': 'clearpool',
                'rank': 2,
                'positioning': 'Permissioned onchain marketplace for institutional borrower pools, historically offering largely uncollateralized credit based on borrower creditworthiness.',
                'similarities': 'Both connect institutional borrowers to onchain lenders and operate in the RWA/private-credit sector.',
                'differences': "Clearpool's crypto-native, largely uncollateralized borrower pools correlate with crypto-market stress; Centrifuge finances tranched, collateralized real-world asset pools with off-chain SPV structures.",
            },
            {
                'name': 'Maple Finance',
                'slug': None,
                'rank': 3,
                'positioning': 'Institutional onchain lending and credit marketplace with managed lending pools.',
                'similarities': 'Direct peer in tokenized private credit connecting institutional borrowers to onchain capital.',
                'differences': 'Maple centers on crypto-native institutional lending pools, while Centrifuge specializes in tranched RWA securitization and tokenized traditional funds.',
            },
            {
                'name': 'Ondo Finance',
                'slug': 'ondo-finance',
                'rank': 4,
                'positioning': 'RWA platform focused on tokenized US Treasuries and yield-bearing cash-equivalent products for onchain investors.',
                'similarities': 'Both tokenize traditional fixed-income assets (notably Treasury exposure) and distribute them as onchain tokens usable in DeFi.',
                'differences': 'Ondo concentrates on tokenized Treasury/money-market products, whereas Centrifuge is broader — a full asset-financing and securitization protocol spanning private credit, receivables and funds.',
            },
        ],
        partnerships=[
            {
                'name': 'MakerDAO — New Silver RWA pool',
                'date': '2021-04-20',
                'amountLabel': None,
                'description': "New Silver's fix-and-flip real-estate loan pool on Centrifuge Tinlake became the first RWA to back DAI via a MakerDAO vault credit line, pioneering onchain RWA collateral.",
            },
            {
                'name': 'Janus Henderson & Anemoy — Liquid Treasury Fund',
                'date': '2024-09-13',
                'amountLabel': None,
                'description': 'Janus Henderson partnered with Anemoy and Centrifuge to sub-advise the fully onchain Liquid Treasury Fund (short-term US Treasury exposure), managing the portfolio via subsidiary Tabula.',
            },
            {
                'name': 'New York Life Investment Management — tokenized high-yield bond strategy',
                'date': '2026-06-30',
                'amountLabel': None,
                'description': "Centrifuge and New York Life Investment Management announced a partnership to tokenize a US high-yield corporate bond strategy, marking NYLIM's tokenization debut.",
            },
        ],
        investment_rounds=[
            {
                'date': '2021-02-23',
                'round': 'Series A',
                'amountUsd': 0,
                'amountLabel': 'undisclosed',
                'investors': [
                    'Galaxy Digital',
                    'IOSG Ventures',
                    'Rockaway Blockchain Fund',
                    'Fintech Collective',
                ],
                'link': 'https://www.crunchbase.com/organization/centrifuge',
            },
            {
                'date': '2022-11-02',
                'round': 'Strategic',
                'amountUsd': 4000000,
                'amountLabel': '$4M',
                'investors': [
                    'BlockTower Capital',
                ],
                'link': 'https://www.crunchbase.com/organization/centrifuge',
            },
        ],
        audits=[
            {
                'firm': 'Cantina',
                'date': '2025-02-01',
                'url': 'https://github.com/centrifuge/protocol/blob/main/docs/audits/2025-02-Cantina.pdf',
            },
            {
                'firm': '0xMacro',
                'date': '2025-06-23',
                'url': 'https://0xmacro.com/library/audits/centrifuge-1.html',
            },
            {
                'firm': 'Cantina (Morpho Market)',
                'date': '2023-06-01',
                'url': 'https://github.com/centrifuge/morpho-market/blob/main/audits/2023-06-cantina.pdf',
            },
        ],
        sources=[
            {
                'label': 'Centrifuge — official site',
                'url': 'https://centrifuge.io/',
            },
            {
                'label': 'Centrifuge Docs — DAO summary',
                'url': 'https://docs.centrifuge.io/getting-started/dao-summary/',
            },
            {
                'label': 'Centrifuge Docs — The CFG Token',
                'url': 'https://docs.centrifuge.io/getting-started/token-summary/',
            },
            {
                'label': 'Centrifuge blog — DeFi 2.0: First Real-World Loan Financed on Maker',
                'url': 'https://medium.com/centrifuge/defi-2-0-first-real-world-loan-is-financed-on-maker-fbe24675428f',
            },
            {
                'label': 'Janus Henderson press release — Anemoy/Centrifuge partnership',
                'url': 'https://www.janushenderson.com/corporate/press-releases/janus-henderson-to-partner-with-anemoy-and-centrifuge-on-its-first-tokenized-fund/',
            },
            {
                'label': 'Businesswire — Centrifuge & New York Life Investment Management',
                'url': 'https://www.businesswire.com/news/home/20260630051099/en/Centrifuge-and-New-York-Life-Investment-Management-Partner-to-Tokenize-U.S.-High-Yield-Corporate-Bond-Strategy',
            },
            {
                'label': 'Centrifuge Governance Forum — CP171 restructuring',
                'url': 'https://gov.centrifuge.io/t/cp171-aligning-for-execution-transparency-and-cfg-value-accrual-through-centrifuge-network-foundation/7132/1',
            },
        ],
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
        secondary_tags=["DAO-Governed", "Institutional-Gated", "Yield-Bearing"],
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
        components=[
            {
                'name': 'Borrower Pools',
                'description': 'On-chain smart-contract pools through which real-world borrowers (originally emerging-market lenders/fintechs) raise USDC debt. Each pool splits capital into a junior (first-loss) and senior tranche.',
            },
            {
                'name': 'Backers (Junior Tranche)',
                'description': 'Investors who underwrite individual Borrower Pools by supplying first-loss junior-tranche capital after performing off-chain credit due diligence on the borrower.',
            },
            {
                'name': 'Senior Pool',
                'description': "A single diversified pool where passive Liquidity Providers deposit USDC; capital is automatically allocated across the senior tranches of Borrower Pools via the protocol's Leverage Model, earning lower but diversified yield.",
            },
            {
                'name': 'GFI Token',
                'description': "Goldfinch's native token used for protocol governance, staking/incentive alignment, and historically the Auditor role that voted on borrower legitimacy.",
            },
            {
                'name': 'Goldfinch Prime / GPRIME',
                'description': 'The 2025 institutional product: a continuously-offered pool giving non-U.S. investors onchain exposure to loans from major private-credit managers (Apollo, Ares, Golub). Users deposit USDC and receive GPRIME tokens; managed by Heron Finance.',
            },
        ],
        faq=[
            {
                'question': 'What is Goldfinch?',
                'answer': 'Goldfinch is a decentralized credit protocol launched in January 2021 that brings real-world private-credit lending onchain. Its original model provided uncollateralized USDC loans to emerging-market lenders through Borrower Pools, with credit risk assessed off-chain by Backers rather than secured by crypto collateral.',
                'pinned': True,
            },
            {
                'question': 'How did Goldfinch make loans without crypto collateral?',
                'answer': 'Instead of on-chain collateral, Goldfinch relied on off-chain credit underwriting by Backers, real-world legal recourse against borrowers, and a tranched structure where junior (Backer) capital absorbs first losses before the diversified Senior Pool.',
                'pinned': False,
            },
            {
                'question': 'What is Goldfinch Prime?',
                'answer': 'Goldfinch Prime, launched February 2025, is a pivot toward institutional-grade private credit. It gives non-U.S. investors onchain exposure to funds from managers such as Apollo, Ares and Golub that collectively manage over $1 trillion, targeting 9-12% net returns via GPRIME pool tokens.',
                'pinned': False,
            },
            {
                'question': 'Has Goldfinch had loan defaults?',
                'answer': 'Yes. The protocol suffered three notable defaults totaling roughly $18 million: a ~$5M loan to Kenyan motorbike financier Tugende, a ~$7M writedown on a $20M Stratos facility, and a Lend East default in April 2024 where only ~$4.25M of a ~$10.2M loan was repaid.',
                'pinned': False,
            },
            {
                'question': 'Who built Goldfinch and what is Warbler Labs?',
                'answer': 'Goldfinch was founded in 2020-2021 by former Coinbase engineers Mike Sall and Blake West. Warbler Labs, spun out in 2022 with Sall as CEO and West as CTO, is the core development company supporting the protocol; the Goldfinch Foundation supports the DAO/governance.',
                'pinned': False,
            },
            {
                'question': 'What token does Goldfinch use?',
                'answer': "The native token is GFI, used for governance and incentives. Figures on price and market cap should be checked against a live source, as GFI declined sharply following the protocol's defaults.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Warbler Labs',
                'role': 'Core development company',
                'description': 'Spun out of Goldfinch in 2022 to build and maintain the protocol. Led by co-founder/CEO Mike Sall and co-founder/CTO Blake West, both former Coinbase engineers. Also backstopped losses on the Stratos default and incubated Heron Finance, which manages Goldfinch Prime.',
            },
            {
                'name': 'Goldfinch Foundation / DAO',
                'role': 'Governance & ecosystem support',
                'description': 'Supports the decentralized Goldfinch community and GFI-based governance, publishes protocol updates, and coordinates ecosystem grants and communications.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Emerging-market private credit / debt fund',
                'similarity': "Goldfinch's original model funded loans to emerging-market lenders and fintechs, functioning like an EM private-credit debt fund that lends to originators who on-lend to end borrowers.",
                'differences': 'Capital was pooled on-chain in USDC from permissionless global LPs, tranched via smart contracts, and lacked the regulatory wrappers, custodian structures and recovery infrastructure of a traditional fund, contributing to writedowns on defaults.',
            },
            {
                'product': 'Institutional private-credit feeder fund (Goldfinch Prime)',
                'similarity': 'Goldfinch Prime resembles a feeder fund into senior-secured direct-lending strategies from managers like Apollo, Ares and Golub, offering diversified exposure to their loan portfolios.',
                'differences': 'Access is tokenized (GPRIME on Ethereum), continuously offered with no minimum investment, USDC-denominated, and restricted to non-U.S. persons rather than accredited-investor gated feeder vehicles.',
            },
        ],
        events=[
            {
                'date': '2021-01-01',
                'title': 'Goldfinch protocol launches on mainnet',
                'description': 'Goldfinch launched in January 2021 as a decentralized credit protocol focused on uncollateralized lending to emerging-market borrowers, with Senior Pool and Backer roles.',
                'link': 'https://docs.goldfinch.finance/goldfinch/goldfinch-v1/goldfinch-overview',
            },
            {
                'date': '2021-06-16',
                'title': '$11M Series A led by a16z',
                'description': 'Goldfinch raised $11 million in a Series A funding round led by Andreessen Horowitz.',
                'link': 'https://www.coindesk.com/markets/2021/06/16/decentralized-credit-protocol-goldfinch-raises-11m-in-series-a-funding',
            },
            {
                'date': '2022-01-06',
                'title': '$25M raise led by a16z crypto',
                'description': 'Goldfinch announced a $25 million round led by a16z crypto, with participants including Bill Ackman, BlockTower, Kingsway Capital, Helicap and MSA Capital.',
                'link': 'https://medium.com/goldfinch-fi/goldfinch-raises-25m-led-by-andreessen-horowitz-to-double-down-on-154x-growth-in-2021-6017760f887e',
            },
            {
                'date': '2024-04-01',
                'title': 'Third default: Lend East',
                'description': "Singapore-based borrower Lend East repaid only ~$4.25M of a ~$10.2M loan, defaulting on ~$5.9M (about 7.7% of active loans), the protocol's third default.",
                'link': 'https://www.dlnews.com/articles/defi/goldfinch-borrower-lend-east-defaults-says-warbler-labs/',
            },
            {
                'date': '2025-02-04',
                'title': 'Goldfinch Prime launches',
                'description': 'Goldfinch launched Prime, a continuous pool giving non-U.S. investors onchain exposure to private-credit funds (Apollo, Ares, Golub) managing over $1T, targeting 9-12% net returns.',
                'link': 'https://www.theblock.co/post/338843/defi-protocol-goldfinch-prime-pool-apollo',
            },
            {
                'date': '2025-03-20',
                'title': 'Plume partnership for Prime distribution',
                'description': "Plume and Goldfinch partnered to list Goldfinch Prime private-credit assets on Plume's Nest RWA staking platform, expanding access to Apollo/Ares/Golub/KKR-linked exposure.",
                'link': 'https://plume.org/blog/goldfinch',
            },
        ],
        timeline=[
            {
                'date': '2021-01-01',
                'title': 'Mainnet launch',
                'description': 'Goldfinch protocol goes live enabling uncollateralized real-world lending.',
                'link': 'https://docs.goldfinch.finance/goldfinch/goldfinch-v1/goldfinch-overview',
                'status': 'executed',
            },
            {
                'date': '2022-01-06',
                'title': 'Warbler Labs spin-out and scale-up',
                'description': 'Warbler Labs spun out in 2022 as core dev company while the protocol scaled emerging-market lending following the a16z rounds.',
                'link': 'https://blockworks.com/news/onchain-private-credit-investing',
                'status': 'executed',
            },
            {
                'date': '2025-02-04',
                'title': 'Pivot to institutional private credit (Prime)',
                'description': 'Goldfinch Prime launches, repositioning the protocol from EM direct lending toward tokenized access to established private-credit managers.',
                'link': 'https://www.theblock.co/post/338843/defi-protocol-goldfinch-prime-pool-apollo',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Total loan defaults',
                'value': 'Approximately $18M across three defaults (Tugende ~$5M, Stratos ~$7M writedown, Lend East ~$5.9M)',
                'freshness': 'static',
                'source': {
                    'label': 'DL News - Goldfinch third default (Lend East)',
                    'url': 'https://www.dlnews.com/articles/defi/goldfinch-borrower-lend-east-defaults-says-warbler-labs/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Goldfinch Prime target return',
                'value': '9-12% net of fees, exposure to private-credit funds managing over $1 trillion (Apollo, Ares, Golub)',
                'freshness': 'static',
                'source': {
                    'label': 'The Block - Goldfinch Prime launch',
                    'url': 'https://www.theblock.co/post/338843/defi-protocol-goldfinch-prime-pool-apollo',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total venture funding from a16z',
                'value': '$36M across two 2021 rounds ($11M Series A + $25M follow-on led by a16z crypto)',
                'freshness': 'static',
                'source': {
                    'label': 'TechCrunch - Goldfinch raises $25M from a16z',
                    'url': 'https://techcrunch.com/2022/01/06/goldfinch-raises-25m-from-a16z-to-power-its-defi-lending-protocol-for-borrowers-in-developing-countries/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': "Off-chain borrower default risk is the protocol's dominant realized risk. Goldfinch suffered ~$18M in defaults: Tugende (~$5M, funds diverted to a struggling parent in breach of terms), a $20M Stratos facility (~$7M written down to $0, backstopped by Warbler Labs), and Lend East (April 2024, only ~$4.25M of ~$10.2M repaid).",
            },
            {
                'category': 'Collateral',
                'description': 'The original model was uncollateralized/undercollateralized: loans relied on off-chain credit assessment and legal recourse rather than on-chain collateral, so recovery on default depends on slow, uncertain legal processes across foreign jurisdictions.',
            },
            {
                'category': 'Regulatory',
                'description': 'Real-world private-credit lending and tokenized fund exposure face securities and cross-border regulatory scrutiny; Goldfinch Prime is explicitly restricted to non-U.S. persons, and the model depends on off-chain legal enforceability that varies by jurisdiction.',
            },
            {
                'category': 'Governance',
                'description': 'Credit underwriting and recovery decisions are concentrated in Backers and Warbler Labs rather than fully decentralized; Goldfinch also cut ties with a third-party risk adviser, raising questions about independence of risk oversight.',
            },
            {
                'category': 'Smart Contract',
                'description': 'As an Ethereum protocol handling pooled USDC across tranched Borrower Pools, Goldfinch carries smart-contract risk, mitigated by multiple Certik and Trail of Bits audits but not eliminated.',
            },
        ],
        competitors=[
            {
                'name': 'Centrifuge',
                'slug': 'centrifuge',
                'rank': 1,
                'positioning': 'Onchain RWA private-credit and asset tokenization protocol',
                'similarities': 'Both are DeFi-native protocols bringing real-world private credit onchain with tranched pools and off-chain originators.',
                'differences': 'Centrifuge focuses on asset-backed tokenization across many asset classes with its own infrastructure, whereas Goldfinch centered on uncollateralized EM lending and later pivoted to feeder exposure into large private-credit funds.',
            },
            {
                'name': 'Clearpool',
                'slug': 'clearpool',
                'rank': 2,
                'positioning': 'Permissionless onchain institutional credit marketplace',
                'similarities': 'Both provide uncollateralized/undercollateralized onchain credit to institutional borrowers via pooled lender capital.',
                'differences': 'Clearpool runs single-borrower permissionless pools with dynamic rates and a broader institutional borrower base, while Goldfinch used a Backer/Senior-Pool tranche structure and emphasized emerging markets.',
            },
            {
                'name': 'Florence Finance',
                'slug': 'florence-finance',
                'rank': 3,
                'positioning': 'Onchain private-credit lending to real-world SME/mid-market borrowers',
                'similarities': 'Both connect onchain USDC liquidity to off-chain real-world private-credit borrowers.',
                'differences': 'Florence Finance targets European mid-market lending, while Goldfinch spanned emerging markets and, via Prime, large global private-credit managers.',
            },
            {
                'name': 'Maple Finance',
                'slug': None,
                'rank': 4,
                'positioning': 'Institutional onchain lending and yield marketplace',
                'similarities': 'Both are leading onchain private-credit protocols channeling lender capital to vetted institutional borrowers.',
                'differences': 'Maple uses delegate-managed pools and pivoted toward overcollateralized and cash-management products; it is not on the on-platform competitor list.',
            },
        ],
        partnerships=[
            {
                'name': 'Plume Network',
                'date': '2025-03-20',
                'amountLabel': None,
                'description': "Partnership to list Goldfinch Prime private-credit assets on Plume's Nest RWA staking platform, expanding onchain access to funds from Apollo, Ares, Golub, KKR and others.",
            },
            {
                'name': 'Heron Finance',
                'date': '2023-12-05',
                'amountLabel': None,
                'description': 'Warbler Labs incubated Heron Finance, an SEC-registered onchain investment adviser/robo-advisor that builds on Goldfinch and manages the Goldfinch Prime pool.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-06-16',
                'round': 'Series A',
                'amountUsd': 11000000,
                'amountLabel': '$11M',
                'investors': [
                    'Andreessen Horowitz (a16z)',
                ],
                'link': 'https://www.coindesk.com/markets/2021/06/16/decentralized-credit-protocol-goldfinch-raises-11m-in-series-a-funding',
            },
            {
                'date': '2022-01-06',
                'round': 'Follow-on (a16z crypto-led)',
                'amountUsd': 25000000,
                'amountLabel': '$25M',
                'investors': [
                    'a16z crypto',
                    'Bill Ackman',
                    'BlockTower',
                    'Kingsway Capital',
                    'Helicap',
                    'MSA Capital',
                    'Kindred Ventures',
                    'Stratos Technologies',
                ],
                'link': 'https://techcrunch.com/2022/01/06/goldfinch-raises-25m-from-a16z-to-power-its-defi-lending-protocol-for-borrowers-in-developing-countries/',
            },
        ],
        audits=[
            {
                'firm': 'Certik',
                'date': '2020-12-06',
                'url': 'https://github.com/goldfinch-eng/goldfinch-contracts/blob/main/v1.0/Certik-Goldfinch-Audit-Report-2020-12-06.pdf',
            },
            {
                'firm': 'Certik',
                'date': '2021-03-23',
                'url': 'https://github.com/goldfinch-eng/goldfinch-contracts/blob/main/v1.1/Certik-Goldfinch-Audit-Report-2021-03-23.pdf',
            },
            {
                'firm': 'Certik',
                'date': '2021-08-26',
                'url': 'https://github.com/goldfinch-eng/goldfinch-contracts/blob/main/v2.0/Certik-Goldfinch-Audit-Report-2021-8-26.pdf',
            },
            {
                'firm': 'Trail of Bits',
                'date': '2021-09-07',
                'url': 'https://github.com/goldfinch-eng/goldfinch-contracts/blob/main/v2.0/Trail%20of%20Bits%20Audit%20-%202021-09-07.pdf',
            },
            {
                'firm': 'Trail of Bits',
                'date': '2021-12-08',
                'url': 'https://github.com/goldfinch-eng/goldfinch-contracts/blob/main/V2.2/Trail%20of%20Bits%20Audit%20-%202021-12-08.pdf',
            },
        ],
        sources=[
            {
                'label': 'Goldfinch official site (Prime)',
                'url': 'https://www.goldfinch.finance/',
            },
            {
                'label': 'Goldfinch Docs - protocol overview',
                'url': 'https://docs.goldfinch.finance/goldfinch/goldfinch-v1/goldfinch-overview',
            },
            {
                'label': 'Goldfinch Developer Docs - audit reports',
                'url': 'https://dev.goldfinch.finance/docs/security/audit-reports/',
            },
            {
                'label': 'The Block - Goldfinch Prime launch (Apollo)',
                'url': 'https://www.theblock.co/post/338843/defi-protocol-goldfinch-prime-pool-apollo',
            },
            {
                'label': 'DL News - Goldfinch third default (Lend East)',
                'url': 'https://www.dlnews.com/articles/defi/goldfinch-borrower-lend-east-defaults-says-warbler-labs/',
            },
            {
                'label': 'TechCrunch - Goldfinch raises $25M from a16z',
                'url': 'https://techcrunch.com/2022/01/06/goldfinch-raises-25m-from-a16z-to-power-its-defi-lending-protocol-for-borrowers-in-developing-countries/',
            },
            {
                'label': 'Plume blog - Goldfinch partnership',
                'url': 'https://plume.org/blog/goldfinch',
            },
        ],
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
        secondary_tags=["DAO-Governed", "Institutional-Gated", "Yield-Bearing"],
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
        components=[
            {
                'name': 'Clearpool Dynamic',
                'description': "Permissionless lending platform where anyone can supply USDC/stablecoin liquidity to whitelisted institutional borrowers' single-borrower pools and earn risk-adjusted, uncollateralized yield with no lock-up. Interest rates float with each pool's utilization ratio.",
            },
            {
                'name': 'Clearpool Prime',
                'description': 'Institutional-grade, KYC/AML-compliant credit marketplace (live on Optimism from Dec 2023) where whitelisted borrowers and lenders transact short-term unsecured credit through non-custodial smart contracts. Compliance/whitelisting handled via SecuritizeID; supports customizable terms, rolling loans, callback provisions and fixed negotiated rates.',
            },
            {
                'name': 'Credit Vaults',
                'description': 'Borrower-managed on-chain credit facilities that let institutions set their own parameters (interest rate, maturity, repayment schedule). Portofino Technologies launched the inaugural Credit Vault when Clearpool went live on Base in July 2024.',
            },
            {
                'name': 'cpTokens',
                'description': 'ERC-20 receipt tokens (similar to LP tokens) minted 1:1 to lenders when they deposit into a borrower-specific pool. cpTokens represent the deposited principal plus interest that accrues every block and are redeemed to withdraw.',
            },
            {
                'name': 'CPOOL token',
                'description': 'Native utility and governance token with a fixed 1 billion supply. Used for protocol governance (voting on parameters such as interest-rate models), staking, borrower whitelisting mechanics, and incentives; also governs the Ozean ecosystem.',
            },
            {
                'name': 'Ozean',
                'description': 'Real-World-Asset (RWA) yield Layer-2 chain built on the Optimism OP Stack (via Caldera Rollup-as-a-Service), announced Aug 2024. Uses USDX (a T-bill-backed stablecoin issued with Hex Trust) as the native gas token and auto-distributes native yield on stablecoin balances.',
            },
        ],
        faq=[
            {
                'question': 'What is Clearpool?',
                'answer': 'Clearpool is a decentralized institutional credit marketplace that lets vetted, whitelisted institutional borrowers raise uncollateralized (unsecured) on-chain liquidity from lenders. It pioneered permissionless single-borrower liquidity pools and has since expanded into compliant institutional lending (Prime), Credit Vaults, PayFi vaults and the Ozean RWA-yield L2.',
                'pinned': True,
            },
            {
                'question': 'How is Clearpool different from typical DeFi lending like Aave?',
                'answer': 'Most DeFi lending is overcollateralized. Clearpool provides uncollateralized credit to whitelisted institutions, so loans rely on borrower creditworthiness and off-chain legal agreements rather than posted crypto collateral. This eliminates liquidation mechanics but introduces borrower default (counterparty) risk.',
                'pinned': False,
            },
            {
                'question': 'What is the CPOOL token used for?',
                'answer': "CPOOL is Clearpool's utility and governance token with a fixed supply of 1 billion. It is used for governance voting (e.g. interest-rate model parameters), staking, borrower whitelisting, ecosystem incentives, and it governs the Ozean chain where stakers can earn sequencer fees and treasury yield.",
                'pinned': False,
            },
            {
                'question': 'Which institutions borrow on Clearpool?',
                'answer': 'Borrowers have included leading market makers and trading firms such as Wintermute, Amber Group, Folkvang, Fasanara Digital and Portofino Technologies, with lending activity involving major institutions. The protocol has originated well over $500 million in loans since its 2022 launch.',
                'pinned': False,
            },
            {
                'question': 'What is Ozean?',
                'answer': "Ozean is Clearpool's Real-World-Asset yield Layer-2, built on the Optimism OP Stack and announced in August 2024. It uses USDX (a Treasury-bill-backed stablecoin issued with Hex Trust) as its native gas token and is designed to distribute native RWA yield to stablecoin holders automatically.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Robert Alcorn',
                'role': 'Co-Founder & CEO',
                'description': "CFA charterholder and co-founder of Clearpool; previously worked in institutional banking/capital markets. Led the protocol's launch to Ethereum mainnet in March 2022.",
            },
            {
                'name': 'Jakob Kronbichler',
                'role': 'Co-Founder & Chief Commercial Officer',
                'description': 'Co-founder who joined Robert Alcorn in June 2021; leads commercial and business-development efforts for the institutional credit marketplace.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Unsecured corporate / interbank lending',
                'similarity': "Both extend credit to vetted institutional borrowers without collateral, pricing the loan on the borrower's creditworthiness and reputation rather than posted assets.",
                'differences': 'Clearpool executes through non-custodial smart contracts with on-chain transparency and dynamic utilization-based rates, and (in Dynamic pools) lets retail lenders participate permissionlessly, whereas traditional unsecured lending is bank-intermediated, opaque, and restricted to institutional counterparties.',
            },
            {
                'product': 'Commercial paper',
                'similarity': 'Both provide short-term, unsecured funding to institutions with interest determined by market demand and issuer credit quality.',
                'differences': 'Clearpool loans are tokenized (cpTokens), settle continuously on-chain, and interest accrues every block, versus standardized fixed-maturity paper cleared through traditional financial infrastructure and rating agencies.',
            },
        ],
        events=[
            {
                'date': '2022-03-23',
                'title': 'Clearpool protocol deploys to Ethereum mainnet',
                'description': 'Clearpool launched on Ethereum mainnet with genesis single-borrower pools from Amber Group, Wintermute and Folkvang, which immediately attracted institutional and retail liquidity.',
                'link': 'https://clearpool.medium.com/review-of-the-month-march-2022-bfff8fa16ab',
            },
            {
                'date': '2023-12-12',
                'title': 'Clearpool Prime goes live on Optimism',
                'description': "Launched Clearpool Prime, a KYC/AML-compliant institutional credit marketplace on Optimism's OP Mainnet enabling whitelisted borrowers and lenders to transact non-custodially in a fully compliant environment.",
                'link': 'https://medium.com/clearpool-finance/clearpool-launches-clearpool-prime-transforming-private-credit-for-institutions-live-on-optimism-c2f1b2fa9b9a',
            },
            {
                'date': '2024-07-02',
                'title': 'Clearpool launches on Base with Credit Vaults',
                'description': "Deployed Credit Vaults on Coinbase's Base L2; Portofino Technologies launched the inaugural Credit Vault. At the time the protocol had originated over $530M in loans.",
                'link': 'https://medium.com/clearpool-finance/clearpool-launches-on-base-enabling-institutional-access-to-onchain-credit-2ec15d098742',
            },
            {
                'date': '2024-08-19',
                'title': 'Clearpool introduces Ozean RWA-yield L2',
                'description': 'Announced Ozean, an RWA yield Layer-2 on the Optimism OP Stack (Caldera RaaS) using Hex Trust-issued, T-bill-backed USDX as the native gas token, to distribute native yield to stablecoin holders.',
                'link': 'https://clearpool.medium.com/clearpool-introduces-ozean-the-blockchain-for-real-world-asset-rwa-yield-8669a70f8ef4',
            },
        ],
        timeline=[
            {
                'date': '2022-03-23',
                'title': 'Ethereum mainnet launch',
                'description': 'Permissionless single-borrower pools go live with Amber Group, Wintermute and Folkvang genesis pools.',
                'link': 'https://clearpool.medium.com/review-of-the-month-march-2022-bfff8fa16ab',
                'status': 'executed',
            },
            {
                'date': '2023-12-12',
                'title': 'Clearpool Prime launch (Optimism)',
                'description': 'Compliant institutional credit marketplace launched on Optimism.',
                'link': 'https://medium.com/clearpool-finance/clearpool-launches-clearpool-prime-transforming-private-credit-for-institutions-live-on-optimism-c2f1b2fa9b9a',
                'status': 'executed',
            },
            {
                'date': '2024-07-02',
                'title': 'Credit Vaults on Base',
                'description': 'Borrower-managed Credit Vaults launched on Base with Portofino Technologies as first borrower.',
                'link': 'https://medium.com/clearpool-finance/clearpool-launches-on-base-enabling-institutional-access-to-onchain-credit-2ec15d098742',
                'status': 'executed',
            },
            {
                'date': '2024-08-19',
                'title': 'Ozean RWA-yield L2 announced',
                'description': 'Roadmap milestone: purpose-built RWA yield L2 with USDX gas token and native yield distribution.',
                'link': 'https://clearpool.medium.com/clearpool-introduces-ozean-the-blockchain-for-real-world-asset-rwa-yield-8669a70f8ef4',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Seed funding raised',
                'value': '$3M seed round (Sept 2021) led by investors including Arrington Capital, HashKey Capital, Hex Trust, Sequoia Capital India, Wintermute and GBV Capital',
                'freshness': 'static',
                'source': {
                    'label': 'crypto-fundraising.info — Clearpool',
                    'url': 'https://crypto-fundraising.info/projects/clearpool/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Loans originated',
                'value': 'Over $530M in loans originated as of the July 2024 Base launch (originations have grown further since)',
                'freshness': 'static',
                'source': {
                    'label': 'Clearpool blog — Launches on Base',
                    'url': 'https://medium.com/clearpool-finance/clearpool-launches-on-base-enabling-institutional-access-to-onchain-credit-2ec15d098742',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'CPOOL token supply',
                'value': 'Fixed maximum supply of 1,000,000,000 (1 billion) CPOOL tokens',
                'freshness': 'static',
                'source': {
                    'label': 'CoinMarketCap — Clearpool',
                    'url': 'https://coinmarketcap.com/currencies/clearpool/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': 'Loans are uncollateralized. If a whitelisted institutional borrower defaults or becomes insolvent, lenders can lose principal; recovery depends on off-chain legal agreements rather than on-chain collateral, and there is no liquidation backstop.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'Pools and the Ozean ecosystem depend on stablecoins (USDC, and Hex Trust-issued T-bill-backed USDX). A depeg or reserve shortfall in the underlying stablecoin would directly impair lender balances and yield.',
            },
            {
                'category': 'Smart Contract',
                'description': 'Funds flow through audited but complex non-custodial smart contracts (pools, cpTokens, Credit Vaults, PayFi vaults). A contract bug or exploit could lead to loss of deposited funds despite multiple audits.',
            },
            {
                'category': 'Regulatory',
                'description': 'Uncollateralized institutional lending and KYC/AML-gated products (Prime) operate in an evolving regulatory environment; changes to securities, lending or stablecoin regulation could restrict access, borrowers or the tokenized-credit model.',
            },
            {
                'category': 'Systemic',
                'description': 'Borrowers are concentrated among crypto market makers and trading firms whose solvency is correlated with crypto-market conditions; a broad market shock could trigger simultaneous stress or defaults across multiple pools.',
            },
        ],
        competitors=[
            {
                'name': 'Goldfinch',
                'slug': 'goldfinch',
                'rank': 1,
                'positioning': 'Decentralized credit protocol providing uncollateralized loans, historically to real-world lending businesses in emerging markets.',
                'similarities': 'Both pioneered uncollateralized on-chain credit and rely on off-chain borrower vetting and legal enforceability rather than crypto collateral.',
                'differences': 'Goldfinch focuses on real-world business/fintech lending via a backer/auditor model, whereas Clearpool centers on single-borrower institutional pools (market makers, trading firms) with dynamic utilization-based rates.',
            },
            {
                'name': 'Centrifuge',
                'slug': 'centrifuge',
                'rank': 2,
                'positioning': 'On-chain platform for tokenizing real-world assets (invoices, real estate, credit) and financing them through structured pools.',
                'similarities': 'Both bring institutional/real-world private credit on-chain and tokenize the resulting exposure for lenders.',
                'differences': "Centrifuge emphasizes asset-backed, collateralized RWA financing with tranching; Clearpool's core Dynamic product is unsecured single-borrower lending without asset collateral.",
            },
            {
                'name': 'Florence Finance',
                'slug': 'florence-finance',
                'rank': 3,
                'positioning': 'On-chain private-credit protocol connecting DeFi liquidity to regulated real-world (European SME) lending.',
                'similarities': 'Both channel on-chain stablecoin liquidity into off-chain institutional/private credit exposure.',
                'differences': 'Florence Finance targets regulated real-economy SME lending in specific jurisdictions, while Clearpool serves crypto-native and TradFi trading institutions with permissionless and compliant marketplaces.',
            },
            {
                'name': 'Maple Finance',
                'slug': None,
                'rank': 4,
                'positioning': 'Institutional capital marketplace offering under- and uncollateralized lending pools managed by credit delegates.',
                'similarities': 'Direct peer in uncollateralized institutional lending to crypto trading firms and market makers.',
                'differences': "Maple uses delegate-managed multi-borrower pools with credit underwriting, whereas Clearpool's Dynamic model uses permissionless single-borrower pools with utilization-driven rates.",
            },
        ],
        partnerships=[
            {
                'name': 'Hex Trust',
                'date': '2024-08-19',
                'amountLabel': None,
                'description': "Licensed digital-asset custodian partnering on the Ozean RWA-yield L2 and issuing USDX, the T-bill-backed stablecoin that serves as Ozean's native gas token. Hex Trust was also an early Clearpool seed investor.",
            },
            {
                'name': 'Optimism',
                'date': '2024-08-19',
                'amountLabel': None,
                'description': "Ozean is built on the Optimism OP Stack; Optimism backs and supports the RWA-yield chain. Clearpool Prime also launched on Optimism's OP Mainnet in Dec 2023.",
            },
            {
                'name': 'Caldera',
                'date': '2024-08-19',
                'amountLabel': None,
                'description': 'Rollup-as-a-Service provider powering the Ozean L2 rollup infrastructure.',
            },
            {
                'name': 'SecuritizeID (Securitize)',
                'date': '2023-12-12',
                'amountLabel': None,
                'description': "Provides KYC/KYB and AML verification/whitelisting for Clearpool Prime's compliant institutional marketplace.",
            },
        ],
        investment_rounds=[
            {
                'date': '2021-09-28',
                'round': 'Seed',
                'amountUsd': 3000000,
                'amountLabel': '$3M',
                'investors': [
                    'Arrington Capital',
                    'HashKey Capital',
                    'Hex Trust',
                    'Sequoia Capital India',
                    'Wintermute Ventures',
                    'GBV Capital',
                    'Ryze Labs (Sino Global)',
                    'AscendEX',
                    'FBG Capital',
                    'HTX Ventures',
                    'Kenetic',
                ],
                'link': 'https://crypto-fundraising.info/projects/clearpool/',
            },
            {
                'date': '2021-10-01',
                'round': 'Public Sale',
                'amountUsd': 170000,
                'amountLabel': '$170K (at ~$40M valuation)',
                'investors': [
                    'Public / individual investors',
                ],
                'link': 'https://crypto-fundraising.info/projects/clearpool/',
            },
        ],
        audits=[
            {
                'firm': 'CertiK',
                'date': '2022-03-18',
                'url': 'https://skynet.certik.com/projects/clearpool',
            },
            {
                'firm': 'Pessimistic',
                'date': '2022-03-21',
                'url': 'https://smartliquidity.info/2022/03/27/clearpool-successfully-completes-audits-with-certik-and-pessimistic/',
            },
            {
                'firm': 'Hacken',
                'date': '2025-01-01',
                'url': 'https://hacken.io/audits/clearpool-finance/sca-clearpool-prime-protocol-jan2025/',
            },
        ],
        sources=[
            {
                'label': 'Clearpool docs — What Is Clearpool (products)',
                'url': 'https://docs.clearpool.finance/clearpool',
            },
            {
                'label': 'Clearpool docs — Prime',
                'url': 'https://docs.clearpool.finance/clearpool/products/lending/prime',
            },
            {
                'label': 'crypto-fundraising.info — Clearpool funding',
                'url': 'https://crypto-fundraising.info/projects/clearpool/',
            },
            {
                'label': 'Clearpool blog — Introduces Ozean',
                'url': 'https://clearpool.medium.com/clearpool-introduces-ozean-the-blockchain-for-real-world-asset-rwa-yield-8669a70f8ef4',
            },
            {
                'label': 'Clearpool blog — Launches on Base',
                'url': 'https://medium.com/clearpool-finance/clearpool-launches-on-base-enabling-institutional-access-to-onchain-credit-2ec15d098742',
            },
            {
                'label': 'Smart Liquidity — CertiK & Pessimistic audits',
                'url': 'https://smartliquidity.info/2022/03/27/clearpool-successfully-completes-audits-with-certik-and-pessimistic/',
            },
            {
                'label': 'CoinMarketCap — Clearpool (CPOOL)',
                'url': 'https://coinmarketcap.com/currencies/clearpool/',
            },
        ],
        github='https://github.com/clearpool-finance',
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
        secondary_tags=["Institutional-Gated", "Multi-Chain", "Yield-Bearing"],
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
        components=[
            {
                'name': 'RealTokens (ERC-20 property tokens)',
                'description': 'Each property is held by a dedicated LLC (originally a Delaware series LLC / Inc. structure) whose ownership interests are fractionalized into ERC-20 RealTokens issued on Ethereum and Gnosis Chain. Tokens carry transfer restrictions (whitelisting) to comply with U.S. securities law and entitle holders to a pro-rata share of net rental income.',
            },
            {
                'name': 'RealT platform (realt.co)',
                'description': 'The primary-issuance marketplace where investors register, complete KYC/AML and (for U.S. persons) accredited-investor verification, purchase RealTokens from ~$50, sign the electronic subscription/purchase contract, and receive tokens within roughly 24 hours.',
            },
            {
                'name': 'Weekly rent distribution',
                'description': 'Rental income collected from tenants is distributed to token holders weekly in USDC, primarily via Gnosis Chain to minimize gas costs, proportional to the RealTokens held.',
            },
            {
                'name': 'YAM (You And Me) secondary market',
                'description': 'A permissioned peer-to-peer exchange (smart contracts on Gnosis Chain) where whitelisted holders create buy/sell offers for RealTokens at custom prices. Whitelisting per property is required for any secondary trade.',
            },
            {
                'name': 'RMM (RealToken Money Market)',
                'description': 'An Aave-style non-custodial lending market (forked from Aave protocol v2/v3) where users deposit RealTokens as collateral and borrow stablecoins such as USDC, or lend assets to earn interest, adding liquidity to otherwise illiquid property tokens.',
            },
        ],
        faq=[
            {
                'question': 'What is a RealToken and what do I actually own?',
                'answer': "A RealToken is an ERC-20 token representing a fractional membership interest in a limited-liability company (LLC) that holds title to a specific U.S. rental property, chiefly single-family homes in the Detroit metro area. Owning tokens entitles you to a pro-rata share of that property's net rental income rather than direct legal title to the house.",
                'pinned': True,
            },
            {
                'question': 'How is rental income paid out?',
                'answer': 'Net rent is distributed to token holders weekly in USDC, primarily over Gnosis Chain to keep transaction (gas) costs near zero. Your payout is proportional to the number of RealTokens you hold for that property.',
                'pinned': False,
            },
            {
                'question': 'Can U.S. investors participate, and what are the requirements?',
                'answer': "RealT's U.S. offering is conducted under Rule 506(c) of Regulation D, so U.S. persons must be verified accredited investors and provide documentary proof of that status. Non-U.S. investors are offered tokens offshore under Regulation S. All investors complete KYC/AML checks.",
                'pinned': False,
            },
            {
                'question': 'How can I sell my RealTokens?',
                'answer': 'Liquidity options include the YAM (You And Me) peer-to-peer marketplace where you set your own price, DEXs such as Levinswap (Gnosis Chain) or Uniswap (Ethereum) at market prices, or a direct buyback from RealT at fair market value. Secondary trades require the counterparty to be whitelisted for that specific property.',
                'pinned': False,
            },
            {
                'question': 'Which blockchains does RealT use?',
                'answer': 'RealTokens are deployed on Ethereum and Gnosis Chain (an Ethereum sidechain). Gnosis Chain is used for low-cost income distributions and most secondary-market activity, while Ethereum hosts the original token issuance for some properties.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'RealToken Inc.',
                'role': 'Issuer / operating company',
                'description': 'Florida-based (Boca Raton) company founded in 2019 that operates the realt.co platform. It states it is not a registered broker-dealer or investment advisor. Individual properties are held through a web of affiliated LLCs, many using variations of the RealToken name.',
            },
            {
                'name': 'Rémy Jacobson & Jean-Marc Jacobson',
                'role': 'Co-Founders and Co-CEOs',
                'description': "French-American brothers who founded RealT in 2019, combining real estate development and blockchain backgrounds. Jean-Marc previously co-founded a Bitcoin Embassy; both are named personally in the City of Detroit's 2025 nuisance-abatement lawsuit.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Direct single-family rental property ownership',
                'similarity': 'Investors gain exposure to income-producing U.S. rental homes and receive rental cash flow, and the underlying asset is an actual deeded property held in an LLC.',
                'differences': 'RealT fractionalizes each home into ERC-20 tokens with a ~$50 minimum and blockchain-based, weekly stablecoin distributions, versus buying a whole property with a mortgage, direct title, and hands-on landlording. Token holders hold LLC interests, not the deed, and have limited control over property management.',
            },
            {
                'product': 'Publicly traded residential REIT',
                'similarity': 'Both pool investor capital to hold portfolios of rental real estate and pass through rental income to holders as a form of yield.',
                'differences': 'A REIT is a regulated, exchange-listed entity offering a diversified, professionally managed pool with daily liquidity. RealT sells property-specific, unregistered securities (Reg D/Reg S) with per-property concentration risk, whitelisting-gated illiquid secondary markets, and no exchange listing.',
            },
        ],
        events=[
            {
                'date': '2025-07-02',
                'title': 'City of Detroit sues RealT/RealToken over blighted properties',
                'description': "Detroit filed what it called its largest-ever nuisance-abatement lawsuit in Wayne County Circuit Court against RealToken and 165+ affiliated entities over hundreds of code-violating rental homes, seeking to hold co-founders Rémy and Jean-Marc Jacobson personally liable. The suit lists 53 'priority one' properties deemed harmful to public health and safety.",
                'link': 'https://www.michiganpublic.org/criminal-justice-legal-system/2025-07-03/detroit-sues-crypto-based-real-estate-company-over-blight-violations',
            },
            {
                'date': '2025-07-25',
                'title': 'Report: RealT collected millions for Detroit homes it does not own',
                'description': 'Michigan Public / Outlier Media reported RealT collected more than $2.72 million from investors (July 2023-March 2024) for 39 homes on Lillibridge and Fairview streets whose deeds still listed the prior owner, Brewer Park Homes LDHA LP, more than a year later because the purchase never closed.',
                'link': 'https://www.michiganpublic.org/economy/2025-07-25/crypto-real-estate-company-realt-collected-millions-from-investors-for-detroit-properties-it-doesnt-own',
            },
        ],
        timeline=[
            {
                'date': '2019-01-01',
                'title': 'RealT founded',
                'description': 'Brothers Rémy and Jean-Marc Jacobson founded RealT (RealToken Inc.) to tokenize U.S. rental real estate, beginning with low-cost single-family homes in Detroit.',
                'link': 'https://realt.co/team/',
                'status': 'executed',
            },
            {
                'date': '2019-09-01',
                'title': 'First tokenized property offering',
                'description': 'RealT filed a private placement memorandum (Regulation D) for its first Series LLC property token (9943 Marlowe, Detroit), launching fractional ERC-20 real estate ownership.',
                'link': 'https://realt.co/wp-content/uploads/2019/09/REALTOKEN-LLC-SERIES-1-9943-MARLOWE-1.pdf',
                'status': 'executed',
            },
            {
                'date': '2020-01-01',
                'title': 'Gnosis Chain migration for low-cost distributions',
                'description': 'RealT expanded onto Gnosis Chain (an Ethereum sidechain) to deliver near-zero-gas weekly rental distributions and secondary trading, overseen by its blockchain/operations leadership.',
                'link': 'https://realt.co/',
                'status': 'executed',
            },
            {
                'date': '2022-01-01',
                'title': 'RMM RealToken Money Market launched',
                'description': 'RealT launched the RMM, an Aave-fork lending market letting holders use RealTokens as collateral to borrow USDC, adding liquidity to property tokens; later upgraded to RMM v3 on Aave v3.',
                'link': 'https://rmm.realtoken.network/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'detroit_portfolio_and_capital_raised',
                'value': "RealT raised close to $93 million and amassed a Detroit portfolio of more than 600 properties, per the City of Detroit's July 2025 lawsuit reporting.",
                'freshness': 'static',
                'source': {
                    'label': 'Michigan Public - Detroit sues crypto-based real estate company',
                    'url': 'https://www.michiganpublic.org/criminal-justice-legal-system/2025-07-03/detroit-sues-crypto-based-real-estate-company-over-blight-violations',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'minimum_investment',
                'value': 'Minimum investment per RealToken is typically around $50, with advertised yields historically ranging roughly 7-20% (some over 10%).',
                'freshness': 'static',
                'source': {
                    'label': 'Cointribune - RealT tokenized real estate',
                    'url': 'https://www.cointribune.com/en/realt-revolutionizes-real-estate-investment-with-blockchain/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'detroit_units_acquired_since_2019',
                'value': 'Since 2019 RealT purchased roughly 1,200 housing units across about 800 Detroit properties.',
                'freshness': 'static',
                'source': {
                    'label': 'Outlier Media - crypto real estate RealT Detroit',
                    'url': 'https://outliermedia.org/crypto-real-estate-realt-cryptocurrency-detroit/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': "Each property's title is held by a RealT-affiliated LLC (or Inc.), not by token holders directly; holders own LLC membership interests and rely entirely on RealT's custody, management, and honest recordkeeping. Reporting found some homes were sold as tokens while the deeds still listed the prior owner because the purchase never closed, meaning token holders may not own what they paid for.",
            },
            {
                'category': 'Regulatory',
                'description': 'RealTokens are unregistered securities sold under Reg D Rule 506(c) (U.S. accredited investors only) and Reg S (offshore). RealToken Inc. is not a registered broker-dealer or investment advisor, exposing investors to Howey/securities-law enforcement risk and, as seen in Detroit, municipal nuisance-abatement litigation and personal-liability claims against founders.',
            },
            {
                'category': 'Collateral',
                'description': 'The underlying assets are concentrated, low-cost single-family homes subject to vacancy, deterioration, unpaid property taxes, blight tickets, and code violations. Portfolio-wide vacancy and mismanagement have caused rental income to collapse and left some tokens effectively worthless.',
            },
            {
                'category': 'Systemic',
                'description': 'RealTokens are highly illiquid: secondary sales are gated by per-property whitelisting on the YAM P2P market and thin DEX liquidity, so holders may be unable to exit at or near fair value, especially during stress or reputational crises.',
            },
            {
                'category': 'Smart Contract',
                'description': 'Custom ERC-20 transfer-restriction logic, the YAM peer-to-peer exchange, and the RMM (an Aave fork) carry smart-contract risk. Public repositories indicate reliance on in-house development and static analysis (Slither) rather than a clearly published, named third-party audit for the token/YAM contracts.',
            },
        ],
        competitors=[
            {
                'name': 'Lofty AI',
                'slug': 'lofty-ai',
                'rank': 1,
                'positioning': 'Closest direct peer: tokenized U.S. single-family rental homes with fractional, low-minimum ownership and daily rental payouts.',
                'similarities': 'Both fractionalize individual U.S. rental properties into blockchain tokens with small minimums (~$50), pass through rent to token holders, and offer a secondary marketplace for trading shares.',
                'differences': 'Lofty AI is built on Algorand with an emphasis on instant, algorithmic liquidity and a broader geographic spread, whereas RealT is concentrated in Detroit on Ethereum/Gnosis Chain and has faced significant municipal litigation over property conditions.',
            },
            {
                'name': 'Estate Protocol',
                'slug': 'estate-protocol',
                'rank': 2,
                'positioning': 'On-chain fractional real estate investment platform tokenizing income-producing property for global investors.',
                'similarities': 'Both tokenize real estate into fractional, tradable tokens giving holders exposure to rental yield with compliance/KYC gating.',
                'differences': 'Estate Protocol focuses on curated, often higher-grade and international commercial/residential assets, while RealT specializes in high volume, low-cost U.S. single-family rentals.',
            },
            {
                'name': 'RealtyMogul / Fundrise-style crowdfunding',
                'slug': None,
                'rank': 3,
                'positioning': 'Traditional (non-crypto) real estate crowdfunding platforms offering fractional access to rental and commercial property.',
                'similarities': 'Fractional, low-minimum access to income-producing real estate with rental distributions and Reg D/Reg A style offerings.',
                'differences': "These are off-chain, custodial platforms with pooled funds and no tokenized secondary market, versus RealT's per-property tokens, on-chain distributions, and DeFi integrations (YAM, RMM).",
            },
        ],
        sources=[
            {
                'label': 'RealT official site',
                'url': 'https://realt.co/',
            },
            {
                'label': 'RealT team page',
                'url': 'https://realt.co/team/',
            },
            {
                'label': 'RealT FAQ - Secondary market / YAM',
                'url': 'https://faq.realt.co/en/article/secondary-market-what-is-the-yam-how-does-the-whitelisting-work-mp71wo/',
            },
            {
                'label': 'RealT RMM lending protocol',
                'url': 'https://rmm.realtoken.network/',
            },
            {
                'label': 'RealT Series 1 Private Placement Memorandum (Reg D)',
                'url': 'https://realt.co/wp-content/uploads/2019/09/REALTOKEN-LLC-SERIES-1-9943-MARLOWE-1.pdf',
            },
            {
                'label': 'Michigan Public - Detroit sues RealT over blight (2025-07-03)',
                'url': 'https://www.michiganpublic.org/criminal-justice-legal-system/2025-07-03/detroit-sues-crypto-based-real-estate-company-over-blight-violations',
            },
            {
                'label': "Michigan Public - RealT collected millions for homes it doesn't own (2025-07-25)",
                'url': 'https://www.michiganpublic.org/economy/2025-07-25/crypto-real-estate-company-realt-collected-millions-from-investors-for-detroit-properties-it-doesnt-own',
            },
        ],
        github='https://github.com/real-token',
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
        secondary_tags=["Yield-Bearing", "Real-World-Custody", "Multi-Chain"],
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
        components=[
            {
                'name': 'Property DAO LLC',
                'description': 'Each property is held by a dedicated US limited liability company (structured as a DAO LLC) that takes title to the home; token holders are the members and collectively own and govern the property.',
            },
            {
                'name': 'Algorand Standard Asset (ASA) tokens',
                'description': "Ownership units are minted as Algorand Standard Assets, priced at $50 each at launch. Each token represents a fractional membership interest in the property's LLC.",
            },
            {
                'name': 'Primary marketplace',
                'description': "Lofty's storefront where newly listed, AI- and locally-vetted rental properties are offered to investors, who buy tokens from as little as $50 with no accreditation requirement.",
            },
            {
                'name': 'Secondary marketplace / PMM & liquidity pools',
                'description': "An on-platform exchange (marketed as the 'NASDAQ for real estate') with a Proactive Market Maker and liquidity pools that let holders buy and sell property tokens with near-instant liquidity and no lockup.",
            },
            {
                'name': 'Daily rent distribution',
                'description': 'Net rental income is streamed to token holders daily (deposited nightly, proportional to ownership), payable to the Lofty account, bank/PayPal, or as Algorand-based assets such as USDCa.',
            },
            {
                'name': 'Managed Algorand wallets',
                'description': 'The app auto-creates and custodies an Algorand wallet for each user so non-crypto investors can transact without handling keys or learning blockchain mechanics.',
            },
            {
                'name': 'Governance voting',
                'description': 'Token holders vote on property-level decisions such as repairs, appliance replacement, rent changes, tenant issues, and whether to sell the property.',
            },
        ],
        faq=[
            {
                'question': 'What does an investor actually own on Lofty?',
                'answer': 'Each property is placed in a dedicated US LLC (a DAO LLC) that holds title to the home. Investors buy Algorand Standard Asset tokens that represent membership interests in that LLC, so they own a fractional share of the property collectively rather than the deed directly.',
                'pinned': True,
            },
            {
                'question': 'How is rental income paid out?',
                'answer': "Net rent is distributed daily, proportional to the tokens held. Payouts accrue nightly to the user's Lofty balance and can be withdrawn (e.g. bank/PayPal) or received as Algorand assets like USDCa, or reinvested.",
                'pinned': False,
            },
            {
                'question': 'What is the minimum investment?',
                'answer': '$50 - the price of a single property token at launch. There is no accredited-investor requirement, so both accredited and non-accredited US investors can participate after KYC.',
                'pinned': False,
            },
            {
                'question': 'Can I sell before the property is sold?',
                'answer': 'Yes. Lofty runs a secondary marketplace with a Proactive Market Maker and liquidity pools, so tokens can be traded with near-instant liquidity and no mandatory lockup, unlike traditional real-estate funds.',
                'pinned': False,
            },
            {
                'question': 'Which blockchain does Lofty use and why?',
                'answer': 'Algorand. Lofty chose it for near-instant (3-4 second) finality and very low fees (around 0.001 ALGO per transfer), which makes daily on-chain rent payments and micro-sized token trades economical.',
                'pinned': False,
            },
            {
                'question': 'Are Lofty tokens securities?',
                'answer': 'This is contested. Lofty structures tokens as LLC membership interests and has publicly taken the position that they are not securities, but many legal commentators note that under the Howey test tokenized real estate offerings promising passive rental income can be treated as investment contracts subject to SEC jurisdiction.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Lofty AI, Inc.',
                'role': 'Operating company / platform',
                'description': 'Delaware-incorporated proptech company (HQ variously reported in Miami, FL and Los Angeles/San Francisco, CA) that operates the marketplace, mints tokens, vets properties and administers the property LLCs. Founded 2018; Y Combinator Summer 2019 batch.',
            },
            {
                'name': 'Property DAO LLCs',
                'role': 'Asset-holding SPVs',
                'description': 'Per-property US limited liability companies that hold legal title to each home. Token holders are the members; Lofty acts as the initial manager/administrator until governance is handed to holders.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Single rental property (direct landlord ownership)',
                'similarity': 'Investors gain direct fractional exposure to a specific, identifiable US rental house and receive its rental cash flow plus any appreciation, just like owning a rental outright.',
                'differences': 'Entry is $50 instead of a full down payment; ownership is fractional via LLC tokens; rent is paid daily and automatically; property management is handled for holders; and stakes can be sold in minutes on the secondary market rather than via a months-long sale.',
            },
            {
                'product': 'REIT (Real Estate Investment Trust)',
                'similarity': 'Pools many investors into professionally managed income-producing real estate and distributes rental income; accessible to non-accredited investors.',
                'differences': "Lofty lets investors pick individual properties (not a blind pooled portfolio), pays rent daily rather than quarterly dividends, is settled on-chain on Algorand, and gives holders direct governance votes on each property; it is not an SEC-registered '40 Act fund and offers property-level rather than diversified exposure.",
            },
        ],
        events=[
            {
                'date': '2021-08-19',
                'title': 'Lofty launches tokenized liquid real-estate marketplace on Algorand',
                'description': 'Y Combinator-backed Lofty AI publicly launched its tokenized, AI-vetted, liquid real-estate marketplace on Algorand, offering fractional property ownership from $50 per token. The company reported over $5M in total funding from Y Combinator, Rebel Fund, Jason Calacanis and Hustle Fund.',
                'link': 'https://www.prnewswire.com/news-releases/y-combinator-backed-lofty-ai-launches-tokenized-liquid-marketplace-for-ai-vetted-real-estate-on-algorand-301359154.html',
            },
            {
                'date': '2023-09-01',
                'title': 'Algorand case study reports 148 properties and $2M cumulative rent',
                'description': "Algorand's Lofty case study reported roughly 148 tokenized properties across 11 US states, about 7,000 monthly active users, an average of ~231 buyers per property, and $2M in cumulative rental income paid to holders.",
                'link': 'https://algorand.co/case-studies/lofty-transform-real-estate-industry',
            },
        ],
        timeline=[
            {
                'date': '2018-01-01',
                'title': 'Lofty founded',
                'description': 'Lofty founded (originally an AI tool to help investors find optimal neighborhoods) by Jerry Chu and Max Ball, later pivoting to fractional tokenized real-estate ownership.',
                'link': 'https://www.ycombinator.com/companies/lofty',
                'status': 'executed',
            },
            {
                'date': '2019-08-19',
                'title': 'Y Combinator (S19) and seed funding',
                'description': "Lofty participated in Y Combinator's Summer 2019 batch and raised seed capital, later totaling over $5M from YC, Rebel Fund, Jason Calacanis and Hustle Fund.",
                'link': 'https://www.ycombinator.com/companies/lofty',
                'status': 'executed',
            },
            {
                'date': '2021-08-19',
                'title': 'Marketplace launch on Algorand',
                'description': 'Launched the tokenized liquid real-estate marketplace on Algorand with $50 minimum tokens and daily rent.',
                'link': 'https://www.prnewswire.com/news-releases/y-combinator-backed-lofty-ai-launches-tokenized-liquid-marketplace-for-ai-vetted-real-estate-on-algorand-301359154.html',
                'status': 'executed',
            },
            {
                'date': '2024-10-25',
                'title': 'Secondary trading via PMM and liquidity pools',
                'description': "Lofty operates a secondary marketplace with a Proactive Market Maker (PMM) and liquidity pools enabling near-instant token trading for real estate, extending its 'liquidity pool / AMM for real estate' roadmap.",
                'link': 'https://learn.lofty.ai/en/articles/8724946-how-does-lofty-s-pmm-proactive-market-maker-and-liquidity-pools-work',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Properties and cumulative rent (Sep 2023)',
                'value': '~148 tokenized properties across 11 US states, ~7,000 monthly active users, ~231 buyers per property on average, and $2M cumulative rental income paid.',
                'freshness': 'static',
                'source': {
                    'label': 'Algorand case study - Lofty',
                    'url': 'https://algorand.co/case-studies/lofty-transform-real-estate-industry',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding and investors',
                'value': 'Over $5M raised; backers include Y Combinator (S19), Rebel Fund, Jason Calacanis and Hustle Fund.',
                'freshness': 'static',
                'source': {
                    'label': 'PRNewswire - Lofty launch',
                    'url': 'https://www.prnewswire.com/news-releases/y-combinator-backed-lofty-ai-launches-tokenized-liquid-marketplace-for-ai-vetted-real-estate-on-algorand-301359154.html',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Minimum investment and token price',
                'value': '$50 minimum; each property token priced at $50 at launch, sold to accredited and non-accredited US investors after KYC.',
                'freshness': 'static',
                'source': {
                    'label': 'Y Combinator - Lofty company profile',
                    'url': 'https://www.ycombinator.com/companies/lofty',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Regulatory',
                'description': "Tokens are structured as LLC membership interests and Lofty asserts they are not securities, but under the SEC's Howey test tokenized real estate promising passive rental income can be deemed investment contracts. An adverse SEC determination could force registration, restrict trading, or halt the marketplace.",
            },
            {
                'category': 'Counterparty',
                'description': "Each property is held in a per-property DAO LLC administered by Lofty. Investors depend on Lofty AI, Inc. and its property managers for title custody, rent collection, maintenance and record-keeping; company insolvency, mismanagement, fraud, or a title/deed defect at the LLC level could impair the underlying asset and holders' claims.",
            },
            {
                'category': 'Systemic',
                'description': 'Secondary-market liquidity is thin and platform-dependent. Despite the PMM and liquidity pools, tokens for a given property can be hard to exit at fair value; in a downturn or platform stress holders may face wide spreads, no buyers, or effective illiquidity.',
            },
            {
                'category': 'Smart Contract',
                'description': "Ownership, transfers and rent distribution rely on Algorand Standard Assets and Lofty's on-chain logic and custodial wallets. Bugs, mispriced AMM/PMM pools, or a compromise of the managed-wallet infrastructure could cause loss of tokens or funds.",
            },
            {
                'category': 'Collateral',
                'description': 'Returns depend entirely on single, concentrated US residential properties. Vacancy, non-paying tenants, unexpected repairs, local market declines, or property damage directly cut rental yield and token value, with no diversification within a single property token.',
            },
        ],
        competitors=[
            {
                'name': 'RealT',
                'slug': 'realt',
                'rank': 1,
                'positioning': 'Closest direct peer: tokenized fractional US rental real estate paying (near-)daily/weekly rent, originally on Ethereum/Gnosis Chain.',
                'similarities': 'Fractionalizes individual US rental homes into low-cost tokens via per-property LLCs and streams rental income to holders.',
                'differences': 'RealT is built on Ethereum/Gnosis Chain rather than Algorand and historically leaned toward international/crypto-native buyers; Lofty emphasizes an AI-vetted pipeline, managed Algorand wallets for non-crypto users, and an on-platform PMM/liquidity-pool secondary market.',
            },
            {
                'name': 'Estate Protocol',
                'slug': 'estate-protocol',
                'rank': 2,
                'positioning': 'On-platform tokenized real-estate peer offering fractional property ownership with rental yield.',
                'similarities': 'Tokenizes real estate into fractional shares and distributes rental income to token holders.',
                'differences': 'Different chain/jurisdiction focus and asset mix; Lofty is specifically US single-family rentals on Algorand with daily rent and a native secondary exchange.',
            },
            {
                'name': 'Ondo Finance',
                'slug': 'ondo-finance',
                'rank': 3,
                'positioning': 'Large RWA tokenization platform, but focused on tokenized treasuries/funds rather than physical property.',
                'similarities': 'Brings real-world-asset yield on-chain to a broad investor base.',
                'differences': 'Ondo tokenizes financial instruments (US Treasuries, funds) for yield, not fractional physical rental homes; no property-level governance or landlord-style rent.',
            },
        ],
        partnerships=[
            {
                'name': 'Algorand / Algorand Foundation',
                'date': '2021-08-19',
                'amountLabel': None,
                'description': 'Lofty issues its property tokens as Algorand Standard Assets and settles daily rent and secondary trades on Algorand; the Algorand Foundation has featured Lofty as a flagship RWA case study.',
            },
        ],
        investment_rounds=[
            {
                'date': '2019-08-19',
                'round': 'Seed / Y Combinator (S19)',
                'amountUsd': 0,
                'amountLabel': 'Undisclosed (part of $5M+ total)',
                'investors': [
                    'Y Combinator',
                    'Rebel Fund',
                    'Jason Calacanis',
                    'Hustle Fund',
                ],
                'link': 'https://www.prnewswire.com/news-releases/y-combinator-backed-lofty-ai-launches-tokenized-liquid-marketplace-for-ai-vetted-real-estate-on-algorand-301359154.html',
            },
        ],
        sources=[
            {
                'label': 'Algorand case study - How Algorand helped Lofty transform real estate',
                'url': 'https://algorand.co/case-studies/lofty-transform-real-estate-industry',
            },
            {
                'label': 'PRNewswire - YC-backed Lofty AI launches tokenized liquid marketplace on Algorand',
                'url': 'https://www.prnewswire.com/news-releases/y-combinator-backed-lofty-ai-launches-tokenized-liquid-marketplace-for-ai-vetted-real-estate-on-algorand-301359154.html',
            },
            {
                'label': 'Y Combinator - Lofty company profile (S19)',
                'url': 'https://www.ycombinator.com/companies/lofty',
            },
            {
                'label': 'Lofty Help Center - Which blockchain Lofty uses',
                'url': 'https://www.lofty.ai/help/articles/6145729-which-blockchain-is-lofty-ai-using-to-tokenize-properties',
            },
            {
                'label': 'Lofty Help Center - How PMM and liquidity pools work',
                'url': 'https://learn.lofty.ai/en/articles/8724946-how-does-lofty-s-pmm-proactive-market-maker-and-liquidity-pools-work',
            },
            {
                'label': 'Lofty blog - Tokenized Real Estate: Benefits and Risks',
                'url': 'https://www.lofty.ai/learn/tokenized-real-estate-benefits-and-risks',
            },
        ],
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
        secondary_tags=["Yield-Bearing", "Real-World-Custody"],
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
        components=[
            {
                'name': 'Carbon Bridge',
                'description': "Toucan's original on-chain infrastructure for tokenizing verified carbon credits. A credit issued by a conventional registry (e.g. Verra) was retired off-chain and a matching TCO2 token minted on Polygon, one token per tonne of CO2. This retirement-based bridging was the mechanism Verra prohibited in May 2022; Toucan has since shifted toward registry-native and 'immobilized'/bi-directional bridging (e.g. its Puro.earth bridge).",
            },
            {
                'name': 'TCO2 (Toucan CO2)',
                'description': "A tokenized carbon credit. Each TCO2 is 1:1 linked to a specific real-world credit and carries that credit's attributes (project, vintage, methodology). Only TCO2s can be retired to claim the underlying climate benefit; carbon pool reference tokens must first be redeemed for TCO2s before retirement.",
            },
            {
                'name': 'Base Carbon Tonne (BCT) pool',
                'description': "Toucan's first carbon reference token and pool, launched October 2021 alongside KlimaDAO. The BCT pool accepts a broad range of tokenized credits (fungible carbon commodity). BCT became the liquidity backbone for on-chain carbon, seeing multi-billion-dollar trading volume in its first weeks.",
            },
            {
                'name': 'Nature Carbon Tonne (NCT) pool',
                'description': 'A more restrictive reference token/pool that accepts only nature-based credits (e.g. reforestation, conservation) using nature-based methodologies from 2012 onward. Designed to give higher-integrity, nature-focused exposure versus the broad BCT pool.',
            },
            {
                'name': 'Carbon pools',
                'description': "Smart-contract pools that bundle eligible TCO2s into fungible reference tokens (BCT, NCT) subject to on-chain 'pool acceptance criteria' (methodology, vintage, region). Pools provide deep liquidity and price discovery for otherwise heterogeneous carbon credits.",
            },
            {
                'name': 'Puro.earth automated bridge / engineered removals',
                'description': "An automated bridge launched October 2023 connecting Toucan to Puro.earth's carbon standard, enabling instant settlement of engineered carbon-removal credits. This forms the basis of newer removal-focused products such as CHAR (biochar credits, launched March 2024).",
            },
        ],
        faq=[
            {
                'question': 'What does Toucan Protocol do?',
                'answer': 'Toucan builds public blockchain infrastructure for carbon markets. It tokenizes verified carbon credits so they can be traded, pooled and retired on-chain with transparency and composability, aiming to increase liquidity and integrity in the voluntary carbon market (VCM).',
                'pinned': True,
            },
            {
                'question': 'What are BCT, NCT and TCO2?',
                'answer': "TCO2 is a tokenized carbon credit (one tonne, 1:1 with a real registry credit and its attributes). BCT (Base Carbon Tonne) and NCT (Nature Carbon Tonne) are fungible 'reference' tokens backed by pools of TCO2s: BCT accepts a broad range of credits, NCT accepts only nature-based credits. Reference tokens can be redeemed for TCO2s, and only TCO2s can be retired.",
                'pinned': False,
            },
            {
                'question': 'Why did Verra ban Toucan-style tokenization?',
                'answer': "In May 2022 Verra prohibited creating tokens from already-retired credits, arguing that retirement means the environmental benefit has been consumed, so a token on top could enable double claims. Toucan had bridged roughly 22 million Verra credits (~4% of issued credits) using retirement-based bridging. Verra then opened a public consultation on a safer 'immobilized' credit model.",
                'pinned': False,
            },
            {
                'question': "How did Toucan respond to Verra's ban?",
                'answer': "Toucan publicly welcomed the decision, said its retirement-based bridge had always been a compromise, asked bridgers to pause tokenization, and committed to participate in Verra's consultation and to keep the 'Web3 ethos alive' while moving toward bi-directional/immobilized bridging.",
                'pinned': False,
            },
            {
                'question': 'Which blockchains does Toucan run on?',
                'answer': "Toucan's carbon infrastructure originated on Polygon and has expanded to Celo and Base, targeting low-cost, proof-of-stake networks suited to high-volume, low-value carbon transactions.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Toucan (Toucan Protocol)',
                'role': 'Carbon market infrastructure developer',
                'description': 'Switzerland-based (Zug) team of technologists and carbon-market experts, co-founded by Raphaël Haupt (CEO), building open infrastructure for tokenized carbon. Operates as a small remote team backed by venture and climate funds; has stated intentions to progressively open-source the protocol.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Voluntary carbon market (VCM) / carbon offset brokers',
                'similarity': 'Both let buyers acquire and retire carbon credits to offset emissions, sourced from registries like Verra using project, vintage and methodology attributes.',
                'differences': 'The traditional VCM is opaque, bilaterally brokered and slow to settle. Toucan puts credits on public blockchains as tradable tokens with transparent, composable settlement and pooled liquidity, but adds smart-contract, bridging and registry-recognition risks the off-chain market does not have.',
            },
            {
                'product': 'Commodity registry / warehouse receipt system',
                'similarity': 'Like a commodity registry, Toucan maintains a ledger of standardized, fungible units (reference tokens like BCT/NCT) backed by underlying specific assets (TCO2s), enabling price discovery and exchange.',
                'differences': "A commodity registry is centrally operated and legally authoritative; Toucan's ledger is on-chain and permissionless, and its authority depends on recognition by the source registry (e.g. Verra), which Toucan lacked when its retirement-based bridge was banned.",
            },
        ],
        events=[
            {
                'date': '2021-10-01',
                'title': 'Toucan launches BCT pool with KlimaDAO',
                'description': 'Toucan launched its carbon infrastructure and the Base Carbon Tonne (BCT) reference token alongside KlimaDAO. Within roughly a month, over 12 million carbon credits were bridged and on-chain carbon trading volume surpassed USD 2 billion.',
                'link': 'https://blog.toucan.earth/toucan-history/',
            },
            {
                'date': '2022-02-24',
                'title': 'byterocket audit of NCT contracts completed',
                'description': "Security firm byterocket completed a smart-contract audit of Toucan's Nature Carbon Tonne (NCT) contracts (started 21 Jan, finished 24 Feb 2022), reporting findings that were subsequently fixed.",
                'link': 'https://byterocket.com/audit/toucan-nct',
            },
            {
                'date': '2022-05-25',
                'title': 'Verra bans tokenization of retired credits',
                'description': "Verra prohibited creating instruments or tokens from retired credits, directly affecting Toucan's bridge (~22M Verra credits, ~4% of issued, had been bridged). Verra proposed exploring an 'immobilized' credit model and launched a public consultation.",
                'link': 'https://blog.toucan.earth/response-to-verras-announcement/',
            },
            {
                'date': '2023-01-18',
                'title': 'Verra publishes tokenization consultation results',
                'description': "Verra released a ~170-page summary of its public consultation (70+ organizations), affirming blockchain's potential for VCM integrity and supporting KYC, double-counting prevention and bi-directional bridges. Toucan urged swift authorization of on-chain VCU tokenization.",
                'link': 'https://blog.toucan.earth/verra-consultation-summary/',
            },
            {
                'date': '2023-10-01',
                'title': 'Puro.earth automated bridge launched',
                'description': "Toucan launched an automated bridge to Puro.earth's carbon standard, enabling instant settlement of engineered carbon-removal credits and moving Toucan toward registry-native, removal-focused bridging.",
                'link': 'https://toucan.earth/about-toucan/',
            },
            {
                'date': '2024-03-01',
                'title': 'CHAR biochar marketplace launched',
                'description': 'Toucan launched CHAR, a liquid on-chain marketplace aggregating screened biochar carbon-removal credits with automated buying and selling.',
                'link': 'https://toucan.earth/about-toucan/',
            },
        ],
        timeline=[
            {
                'date': '2020-02-01',
                'title': 'CO2ken prototype (ETHLondon)',
                'description': 'Raphaël Haupt and James Farrell built CO2ken, an early prototype carbon-offsetting app on Ethereum with a single carbon token and a DAO, at ETHLondon.',
                'link': 'https://blog.toucan.earth/toucan-history/',
                'status': 'executed',
            },
            {
                'date': '2021-10-01',
                'title': 'Protocol + BCT launch',
                'description': 'Toucan Protocol and the Base Carbon Tonne pool went live on Polygon alongside KlimaDAO.',
                'link': 'https://blog.toucan.earth/toucan-history/',
                'status': 'executed',
            },
            {
                'date': '2022-05-25',
                'title': 'Pivot away from retirement-based bridging',
                'description': "Following Verra's ban, Toucan paused retirement-based bridging and committed to bi-directional / immobilized-credit bridging in cooperation with registries.",
                'link': 'https://blog.toucan.earth/response-to-verras-announcement/',
                'status': 'executed',
            },
            {
                'date': '2023-10-01',
                'title': 'Registry-native removal bridging (Puro.earth)',
                'description': 'Toucan shipped an automated Puro.earth bridge for engineered removals, executing its post-Verra strategy of registry-cooperative bridging.',
                'link': 'https://toucan.earth/about-toucan/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Verra credits bridged before ban',
                'value': '~22 million Verra-issued carbon credits (≈4% of all issued credits) had been bridged on-chain via Toucan by May 2022.',
                'freshness': 'static',
                'source': {
                    'label': 'S&P Global — Verra halts tokenization (May 2022)',
                    'url': 'https://www.spglobal.com/energy/en/news-research/latest-news/energy-transition/052522-as-verra-halts-tokenization-of-carbon-credits-toucan-vows-to-keep-web3-ethos-alive',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Launch-month traction',
                'value': 'In roughly the first month after October 2021 launch, 12M+ carbon credits were bridged and on-chain carbon trading volume surpassed USD 2 billion.',
                'freshness': 'static',
                'source': {
                    'label': 'Toucan blog — history',
                    'url': 'https://blog.toucan.earth/toucan-history/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Cumulative carbon brought on-chain',
                'value': 'Toucan states it has brought roughly USD 100 million in carbon credits on-chain since its 2021 launch.',
                'freshness': 'static',
                'source': {
                    'label': 'Toucan Protocol contracts repo (GitHub README)',
                    'url': 'https://github.com/ToucanProtocol/contracts',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Regulatory',
                'description': "Registry recognition risk. In May 2022 Verra banned Toucan-style tokenization of retired credits, invalidating the core bridging mechanism and stranding tokenized supply. Toucan's on-chain credits depend on continued acceptance by off-chain registries (Verra, Puro.earth); adverse registry or regulatory decisions can impair the product's legitimacy overnight.",
            },
            {
                'category': 'Collateral',
                'description': "Low-quality / stale credit backing. Much of the early bridged supply consisted of old (often 10+ years) low-quality credits that would not qualify in today's market, and researchers (e.g. CarbonPlan) labeled some on-chain credits 'zombies.' This undermines the real-world integrity of reference tokens like BCT.",
            },
            {
                'category': 'Smart Contract',
                'description': 'Smart-contract and bridge risk. Toucan relies on upgradeable (UUPS proxy) Solidity contracts across the bridge, TCO2 and pool logic on Polygon/Celo/Base. Audits (byterocket) found and fixed multiple issues, but bugs, upgrade-key compromise or bridge exploits could cause loss or mis-issuance of tokens.',
            },
            {
                'category': 'Systemic',
                'description': "Concentration and demand-collapse risk. On-chain carbon demand was heavily tied to KlimaDAO's treasury mechanics; when that demand and token incentives cooled, BCT/NCT liquidity and prices fell sharply, exposing the ecosystem to reflexive, correlated deleveraging.",
            },
            {
                'category': 'Governance',
                'description': 'Centralization / evolving governance risk. Toucan is a small team-run project (not yet fully open-source at the time of the Verra events) with control over pool acceptance criteria and contract upgrades, concentrating decisions that materially affect token holders.',
            },
        ],
        competitors=[
            {
                'name': 'KlimaDAO',
                'slug': None,
                'rank': 1,
                'positioning': "Off-chain-registry-linked carbon DAO that built demand for Toucan's tokenized carbon (used BCT/NCT as treasury assets).",
                'similarities': 'Also operates in on-chain voluntary carbon markets and pools tokenized credits for liquidity.',
                'differences': 'KlimaDAO is a demand-side/treasury protocol and marketplace rather than the tokenization bridge/infrastructure layer that Toucan provides.',
            },
            {
                'name': 'Flowcarbon',
                'slug': None,
                'rank': 2,
                'positioning': 'a16z-backed carbon tokenization venture (raised $70M in 2022) issuing carbon-backed tokens.',
                'similarities': "Tokenizes voluntary carbon credits for on-chain trading, competing for the same 'carbon on blockchain' infrastructure niche.",
                'differences': "More centralized/company-led token issuance vs Toucan's protocol-and-pool model; different registry relationships and token design.",
            },
            {
                'name': 'Moss.Earth (MCO2)',
                'slug': None,
                'rank': 3,
                'positioning': 'Carbon tokenization platform issuing the MCO2 token backed by Verra REDD+ credits.',
                'similarities': 'Brings verified carbon credits on-chain as tradable tokens.',
                'differences': "Single-token, more curated issuance focused on rainforest projects, versus Toucan's open bridge and multi-pool reference-token architecture.",
            },
            {
                'name': 'C3 (Coorest / C3 protocol)',
                'slug': None,
                'rank': 4,
                'positioning': 'Alternative on-chain carbon bridging/pooling protocol that emerged in the same Polygon carbon ecosystem.',
                'similarities': 'Bridges and pools tokenized carbon credits with fungible reference tokens.',
                'differences': 'Smaller ecosystem and different pool/methodology governance; competed with Toucan for bridged supply and liquidity.',
            },
        ],
        partnerships=[
            {
                'name': 'KlimaDAO',
                'date': '2021-10-01',
                'amountLabel': None,
                'description': "Launch partner: KlimaDAO went live alongside Toucan's BCT pool and drove early on-chain demand for tokenized carbon.",
            },
            {
                'name': 'Puro.earth',
                'date': '2023-10-01',
                'amountLabel': None,
                'description': 'Registry partnership enabling an automated bridge for engineered carbon-removal credits with instant settlement.',
            },
            {
                'name': 'Celo Foundation / Climate Collective',
                'date': '2022-01-01',
                'amountLabel': None,
                'description': "Collaboration to expand Toucan's carbon ecosystem onto the Celo network and bring ReFi/climate action to mobile users.",
            },
            {
                'name': 'Coinbase Giving',
                'date': '2022-01-01',
                'amountLabel': '$500k grant',
                'description': "Coinbase Giving committed $500k in grants to seed Toucan's ecosystem/Builder Hub, with funds directed to builders on the protocol.",
            },
        ],
        investment_rounds=[
            {
                'date': '2022-06-01',
                'round': 'Seed',
                'amountUsd': 0,
                'amountLabel': 'Seed (amount undisclosed in sourced material)',
                'investors': [
                    'Shine Capital',
                    'Union Square Ventures',
                    'IDEO Ventures',
                    'Hypersphere Ventures',
                    'Obvious Ventures',
                    'MCJ Collective',
                    'Elemental Excelerator',
                ],
                'link': 'https://toucan.earth/about-toucan/',
            },
        ],
        audits=[
            {
                'firm': 'byterocket',
                'date': '2022-02-24',
                'url': 'https://byterocket.com/audit/toucan-nct',
            },
        ],
        sources=[
            {
                'label': 'Toucan — About / products & investors',
                'url': 'https://toucan.earth/about-toucan/',
            },
            {
                'label': 'Toucan blog — history (CO2ken, BCT launch)',
                'url': 'https://blog.toucan.earth/toucan-history/',
            },
            {
                'label': "Toucan blog — response to Verra's May 2022 announcement",
                'url': 'https://blog.toucan.earth/response-to-verras-announcement/',
            },
            {
                'label': 'Toucan blog — Verra consultation summary',
                'url': 'https://blog.toucan.earth/verra-consultation-summary/',
            },
            {
                'label': 'S&P Global — Verra halts tokenization; Toucan responds',
                'url': 'https://www.spglobal.com/energy/en/news-research/latest-news/energy-transition/052522-as-verra-halts-tokenization-of-carbon-credits-toucan-vows-to-keep-web3-ethos-alive',
            },
            {
                'label': 'byterocket — Toucan NCT smart-contract audit',
                'url': 'https://byterocket.com/audit/toucan-nct',
            },
            {
                'label': 'Toucan Protocol contracts (GitHub)',
                'url': 'https://github.com/ToucanProtocol/contracts',
            },
        ],
        github='https://github.com/ToucanProtocol',
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
        components=[
            {
                'name': 'Franklin OnChain U.S. Government Money Fund (FOBXX)',
                'description': 'A U.S.-registered money market mutual fund managed by Franklin Templeton, registered under the Investment Company Act of 1940 and overseen by the SEC. It invests substantially all assets in U.S. government securities, cash and repurchase agreements, targeting a stable $1.00 net asset value per share under Rule 2a-7. It was the first U.S.-registered mutual fund to use a public blockchain as its official system of record for share ownership.',
            },
            {
                'name': 'BENJI token',
                'description': "The on-chain representation of a share of FOBXX, where one BENJI token equals one fund share. Yield is distributed daily by rebasing (minting new tokens into holders' wallets each business day) rather than by price appreciation, keeping the token near a $1.00 target value.",
            },
            {
                'name': 'Benji Technology Platform',
                'description': "Franklin Templeton's proprietary, institutional-grade tokenization platform that processes transactions, records share ownership on-chain, and administers token-based investments. It underpins FOBXX and the firm's broader tokenized fund offerings and reconciles on-chain balances with the official shareholder register daily.",
            },
            {
                'name': 'Benji Investments app / transfer agent',
                'description': "Retail investors access the fund through the Benji Investments app (available in select U.S. states) after completing KYC/AML onboarding; institutions use authorized channels. Only allowlisted, KYC-approved wallets can hold BENJI. Franklin Templeton's transfer agent maintains the authoritative shareholder record, with the firm's books serving as the primary source of truth over the on-chain register.",
            },
        ],
        faq=[
            {
                'question': 'What is BENJI and how does it relate to FOBXX?',
                'answer': 'BENJI is the on-chain token representing a share of the Franklin OnChain U.S. Government Money Fund (FOBXX). One BENJI token equals one fund share. FOBXX is a U.S.-registered money market mutual fund investing in U.S. government securities, cash and repos, targeting a stable $1.00 NAV.',
                'pinned': True,
            },
            {
                'question': 'Which blockchains does BENJI run on?',
                'answer': "BENJI originally launched on Stellar in 2021 and has since expanded to multiple public chains including Polygon, Avalanche, Base, Arbitrum, Aptos, Solana, Ethereum and BNB Chain. Stellar remains the fund's primary network. Each chain hosts a separate BENJI contract, with the transfer agent acting as the authoritative record across deployments.",
                'pinned': False,
            },
            {
                'question': 'How is yield paid to BENJI holders?',
                'answer': "Yield is distributed daily through share-count rebasing: new BENJI tokens are minted directly into holder wallets each business day rather than the token price rising. Distributions for weekends and holidays accrue and post on the next business day. Franklin Templeton publishes a daily 7-day effective yield on the fund's product page.",
                'pinned': False,
            },
            {
                'question': 'Who can buy BENJI and what are the requirements?',
                'answer': "Investors must complete Franklin Templeton's KYC and AML onboarding, after which their wallet is allowlisted to receive BENJI; non-approved wallets cannot hold the token. Retail access is available through the Benji Investments app in select U.S. states, and institutions access via authorized channels, subject to the same suitability standards as traditional U.S. money market funds.",
                'pinned': False,
            },
            {
                'question': 'How are redemptions handled?',
                'answer': 'Redemptions are processed off-chain through the Benji Investments app or institutional channels and settled in U.S. dollars. The transfer agent reconciles on-chain balances daily with the official shareholder register.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Franklin Resources, Inc. (Franklin Templeton)',
                'role': 'Parent asset manager / fund sponsor',
                'description': 'A publicly traded global investment manager (NYSE: BEN) overseeing roughly $1.6 trillion in assets under management (as of mid-2024). It sponsors and manages the FOBXX fund and operates the Benji tokenization platform.',
            },
            {
                'name': 'Franklin Templeton Digital Assets',
                'role': 'Digital assets division',
                'description': "The team responsible for the firm's blockchain and tokenization strategy, including the Benji platform. Roger Bayston serves as EVP and Head of Digital Assets and Sandy Kaul as EVP and Head of Innovation.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Government money market fund (e.g., a traditional 2a-7 U.S. government MMF)',
                'similarity': "FOBXX is itself a U.S.-registered '40 Act money market fund investing in U.S. government securities, cash and repos, targeting a stable $1.00 NAV and distributing daily yield, subject to the same SEC regulation and suitability standards as any traditional government MMF.",
                'differences': 'Unlike a conventional MMF, FOBXX uses a public blockchain as its official system of record, issues shares as transferable BENJI tokens, supports peer-to-peer transfers between allowlisted wallets, and distributes yield via on-chain token rebasing across multiple blockchains.',
            },
        ],
        events=[
            {
                'date': '2021-04-06',
                'title': 'FOBXX / BENJI launches on Stellar',
                'description': 'Franklin Templeton launches the Franklin OnChain U.S. Government Money Fund (FOBXX), the first U.S.-registered mutual fund to use a public blockchain (Stellar) as its official system of record for share ownership. Share class inception date 04/06/2021.',
                'link': 'https://stellar.org/press/franklin-templeton-stellar-development-foundation-mark-five-years-of-benji-the-first-u-s-registered-tokenized-money-market-fund',
            },
            {
                'date': '2024-08-21',
                'title': 'BENJI launches on Avalanche',
                'description': 'Franklin Templeton launches the tokenized money market fund BENJI on the Avalanche network, enabling holders to convert USDC to purchase shares and transfer them peer-to-peer on Avalanche. Fund AUM cited around $420 million at the time.',
                'link': 'https://www.avax.network/about/blog/franklin-templeton-launches-tokenized-money-market-fund-benji-avalanche',
            },
            {
                'date': '2025-09-24',
                'title': 'Benji platform expands to BNB Chain',
                'description': 'Franklin Templeton brings its Benji tokenization platform to BNB Chain, adding it to a deployment set including Ethereum, Solana, Base, Stellar, Polygon, Arbitrum, Avalanche and Aptos. BENJI total value cited around $732 million, with nearly $480 million on Stellar.',
                'link': 'https://www.theblock.co/post/372036/franklin-templeton-bnb-chain-benji-tokenization',
            },
        ],
        timeline=[
            {
                'date': '2021-04-06',
                'title': 'First U.S.-registered tokenized money market fund goes live',
                'description': 'FOBXX launches on Stellar, establishing the first U.S.-registered mutual fund to use a public blockchain as its official system of record.',
                'link': 'https://stellar.org/press/franklin-templeton-stellar-development-foundation-mark-five-years-of-benji-the-first-u-s-registered-tokenized-money-market-fund',
                'status': 'executed',
            },
            {
                'date': '2024-08-21',
                'title': 'Multi-chain expansion',
                'description': 'Following expansions to Polygon, Base, Arbitrum and Aptos, BENJI adds Avalanche, broadening distribution across public blockchains.',
                'link': 'https://www.avax.network/about/blog/franklin-templeton-launches-tokenized-money-market-fund-benji-avalanche',
                'status': 'executed',
            },
            {
                'date': '2025-09-24',
                'title': 'Continued chain and product expansion',
                'description': 'Benji platform reaches BNB Chain as Franklin Templeton continues expanding tokenized-fund distribution and features such as USDC on/off-ramps and peer-to-peer transfers.',
                'link': 'https://www.theblock.co/post/372036/franklin-templeton-bnb-chain-benji-tokenization',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Fund inception (Stellar launch)',
                'value': 'FOBXX / BENJI launched April 2021 (share class inception 04/06/2021) on Stellar, the first U.S.-registered mutual fund to use a public blockchain as its official system of record.',
                'freshness': 'static',
                'source': {
                    'label': 'Stellar press release (5 years of BENJI)',
                    'url': 'https://stellar.org/press/franklin-templeton-stellar-development-foundation-mark-five-years-of-benji-the-first-u-s-registered-tokenized-money-market-fund',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Chains supported',
                'value': 'As of Q1 2026, BENJI is deployed across eight-plus public blockchains: Stellar (primary), Polygon, Arbitrum, Aptos, Avalanche, Base, Solana, Ethereum, with BNB Chain added September 2025.',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — Benji on BNB Chain',
                    'url': 'https://www.theblock.co/post/372036/franklin-templeton-bnb-chain-benji-tokenization',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'BENJI value on Stellar',
                'value': 'As of the September 2025 BNB Chain expansion, BENJI carried a total value around $732 million, with nearly $480 million on Stellar; Franklin Templeton oversees roughly $1.6 trillion in total AUM.',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — Benji on BNB Chain',
                    'url': 'https://www.theblock.co/post/372036/franklin-templeton-bnb-chain-benji-tokenization',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': "FOBXX invests in repurchase agreements and holds cash with financial institutions; investors are exposed to the creditworthiness of repo counterparties and the fund's service providers, and ultimately to Franklin Templeton as manager and transfer agent maintaining the authoritative record.",
            },
            {
                'category': 'Regulatory',
                'description': "As a U.S.-registered '40 Act money market fund subject to SEC oversight and Rule 2a-7, changes to money market fund regulation, securities law treatment of tokenized shares, or KYC/AML requirements could affect the product's structure, availability or on-chain transferability.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'The fund targets a stable $1.00 NAV but is not guaranteed; under stress (e.g., rate shocks or a run on repos/government securities) the share value could deviate from $1.00, as with any money market fund, potentially causing BENJI to trade away from par.',
            },
            {
                'category': 'Smart Contract',
                'description': 'BENJI is issued as tokens via smart contracts deployed on multiple chains; bugs, vulnerabilities or errors in these contracts or the Benji platform could impair token minting, rebasing distributions, transfers or reconciliation with the official register.',
            },
            {
                'category': 'Network',
                'description': 'The fund relies on public blockchains (Stellar and others) as its system of record; outages, congestion, chain reorganizations or consensus failures on any supported network could disrupt on-chain transactions and settlement, requiring reliance on off-chain records.',
            },
            {
                'category': 'Governance',
                'description': "Franklin Templeton retains centralized control over the allowlist, wallet authorization, cross-chain movement and the primary shareholder register; holders depend on the firm's operational decisions and continued support of each deployment rather than decentralized governance.",
            },
        ],
        competitors=[
            {
                'name': 'Securitize (BUIDL transfer agent)',
                'slug': 'securitize',
                'rank': 1,
                'positioning': "Tokenization platform and SEC-registered transfer agent behind BlackRock's BUIDL tokenized treasury fund, a leading institutional tokenized cash-management product.",
                'similarities': 'Both provide regulated, on-chain tokenized exposure to short-term U.S. Treasuries/government cash instruments with allowlisted, KYC-gated access on public blockchains.',
                'differences': "Securitize is primarily a tokenization/transfer-agent infrastructure provider serving third-party issuers (notably BlackRock BUIDL) and is largely institutional/private-placement, whereas Franklin Templeton is the fund manager itself running a U.S.-registered '40 Act mutual fund on its proprietary Benji platform with retail access.",
            },
            {
                'name': 'Ondo Finance (OUSG)',
                'slug': 'ondo-finance',
                'rank': 2,
                'positioning': 'Crypto-native issuer of tokenized U.S. Treasury products (OUSG, USDY) targeting on-chain and DeFi users.',
                'similarities': 'Directly competes for tokenized short-term U.S. Treasury / government yield demand with permissioned, KYC-gated tokens on public blockchains.',
                'differences': 'Ondo is a crypto-native fintech wrapping underlying funds/ETFs and emphasizing DeFi composability and stablecoin-style access, while Franklin Templeton is a $1.6T traditional asset manager offering a directly SEC-registered mutual fund it manages end-to-end.',
            },
            {
                'name': 'Dinari',
                'slug': 'dinari',
                'rank': 3,
                'positioning': 'On-platform issuer of tokenized U.S. securities providing blockchain-based access to regulated instruments.',
                'similarities': 'Focuses on bringing regulated U.S. financial instruments on-chain with compliance controls.',
                'differences': "Dinari centers on tokenized equities/securities via a brokerage-style model rather than operating a manager-run money market mutual fund, and lacks Franklin Templeton's scale and '40 Act fund structure.",
            },
        ],
        partnerships=[
            {
                'name': 'Stellar Development Foundation',
                'date': '2021-04-06',
                'amountLabel': None,
                'description': "Stellar is BENJI's original and primary blockchain, hosting the first U.S.-registered mutual fund to use a public blockchain as its official system of record. The two organizations jointly marked five years of BENJI in 2026, citing over 140% investor growth (April 2024–March 2026) and over $211 million in cumulative peer-to-peer transfer volume as of March 31, 2026.",
            },
            {
                'name': 'Avalanche (Ava Labs)',
                'date': '2024-08-21',
                'amountLabel': None,
                'description': 'Franklin Templeton launched BENJI on the Avalanche network, enabling USDC-funded subscriptions and peer-to-peer transfers on Avalanche.',
            },
            {
                'name': 'BNB Chain',
                'date': '2025-09-24',
                'amountLabel': None,
                'description': 'Franklin Templeton brought the Benji tokenization platform to BNB Chain, citing its low-cost, compliance-focused infrastructure to reach more investors.',
            },
        ],
        sources=[
            {
                'label': 'Stellar press release — Five Years of BENJI',
                'url': 'https://stellar.org/press/franklin-templeton-stellar-development-foundation-mark-five-years-of-benji-the-first-u-s-registered-tokenized-money-market-fund',
            },
            {
                'label': 'The Block — Franklin Templeton brings Benji to BNB Chain',
                'url': 'https://www.theblock.co/post/372036/franklin-templeton-bnb-chain-benji-tokenization',
            },
            {
                'label': 'Avalanche blog — BENJI launches on Avalanche',
                'url': 'https://www.avax.network/about/blog/franklin-templeton-launches-tokenized-money-market-fund-benji-avalanche',
            },
            {
                'label': 'Invest with Benji — official product site',
                'url': 'https://digitalassets.franklintempleton.com/benji/',
            },
            {
                'label': 'Franklin Templeton — FOBXX fund product page',
                'url': 'https://www.franklintempleton.com/investments/options/money-market-funds/products/29386/SINGLCLASS/franklin-on-chain-u-s-government-money-fund/FOBXX',
            },
            {
                'label': 'Eco — BENJI Deep Dive 2026 (fund mechanics)',
                'url': 'https://eco.com/support/en/articles/15254016-benji-deep-dive-2026-franklin-templeton-s-tokenized-money-market',
            },
            {
                'label': 'Fortune — Franklin Templeton digital assets leadership (Bayston, Kaul)',
                'url': 'https://fortune.com/crypto/2023/05/02/future-of-finance-franklin-templeton-bayston-kaul-blockchain-digital-nation-states/',
            },
        ],
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
        secondary_tags=["Institutional-Gated", "Yield-Bearing", "Real-World-Custody", "Multi-Chain"],
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
        member_coins=[
            _rwa_coin(
                "benji",
                "BENJI",
                "BENJI",
                "On-chain share of FOBXX ('40 Act US Government Money Fund)",
                sub_category="Treasuries & Funds",
            ),
        ],
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
    **editorial: Any,
) -> Dict[str, Any]:
    """Minimal long-tail RWA entity card (ontology §6.4).

    `**editorial` forwards the six-tab research kwargs (components, faq,
    org_structure, tradfi_comparison, timeline, events, offchain_facts, risks,
    competitors, partnerships, investment_rounds, audits, sources, github,
    twitter, discord, official_docs) straight to `_net` so a long-tail seed can
    be promoted to a full card in place as M1 research lands."""
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
        **editorial,
    )


# Long-tail RWA seeds (ontology §6.4) — promote to full cards as data lands.
RWA_ENTITY_SPECS.update({
    "arcton": _seed(
        components=[
            {
                'name': 'Startup IPO / share tokenization',
                'description': "Arcton legally tokenizes the shares of an existing Swiss company under the Swiss DLT Act and offers them to the public in an on-platform 'IPO'. Investors buy tokenized shares with USDC or fiat (CHF/EUR) and become registered shareholders with the same rights (dividends, sale proceeds) as holders of the paper version.",
            },
            {
                'name': 'Swiss legal / registry layer',
                'description': 'New tokenized shares are authorized by existing shareholders with notarial approval, entered into the Swiss Commercial Register (verifiable via zefix.ch), and issued as share tokens under the DLT Bill (effective 2021), so the token is legally equivalent to a paper share certificate.',
            },
            {
                'name': 'Secondary market on Camelot (Arbitrum)',
                'description': 'After the IPO and registry entry, a 50/50 liquidity pool is created on Camelot, the Arbitrum-native DEX, letting shares trade permissionlessly 24/7 without lock-ups. Roughly 12.5% of funds raised are seeded into the pool alongside an equivalent value of shares.',
            },
            {
                'name': 'spNFT staking + Nitro pools',
                'description': 'Liquidity providers stake their Camelot LP tokens to mint a staked-position NFT (spNFT), which can be deposited into a Nitro pool for boosted rewards. A minimum ~30-day lock applies, and longer locks earn more; rewards accrue in the form of shares.',
            },
        ],
        faq=[
            {
                'question': 'What does Arcton actually let me invest in?',
                'answer': 'Tokenized equity of early-stage Swiss startups (seed / Series A). When you buy in an Arcton IPO you receive share tokens that make you a legal shareholder of that Swiss company, with rights to dividends and sale proceeds under Swiss law.',
                'pinned': True,
            },
            {
                'question': 'Which blockchain and exchange does Arcton use?',
                'answer': 'Arcton issues its digital shares on Arbitrum and partners with Camelot, the Arbitrum-native DEX, so tokenized shares can be traded 24/7 on a permissionless secondary market.',
                'pinned': False,
            },
            {
                'question': 'How is this legal / compliant?',
                'answer': "Shares are tokenized under Switzerland's DLT Act (in force since 2021). Each offering requires notarial approval and entry into the Swiss Commercial Register, and investors pass KYC. The Arcton team never takes custody of investor funds; it curates and lists the companies.",
                'pinned': False,
            },
            {
                'question': 'How do I earn extra rewards as a liquidity provider?',
                'answer': 'You provide liquidity to a share/USDC pool on Camelot, stake the LP token to mint an spNFT, and deposit it into a Nitro pool. There is a minimum lock (~30 days) and longer locks earn more; rewards are paid in shares.',
                'pinned': False,
            },
            {
                'question': 'Is there an Arcton governance token?',
                'answer': 'No. Arcton has no native utility or governance token. The only tokens are the tokenized shares of the individual startups listed on the platform.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Arcton (MetaOne AG / Arcton, Zurich)',
                'role': 'Operating company',
                'description': 'Zurich-based Swiss fintech founded in 2022 that builds and operates the platform, runs due diligence and curates startups for listing. Emerged from the University of Zurich (UZH) entrepreneurship ecosystem and was associated with the Tenity incubator.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Equity crowdfunding + a stock exchange IPO',
                'similarity': 'Like an equity crowdfunding platform, retail investors buy real ownership shares of a private company; like a public listing, those shares then trade on a liquid secondary market.',
                'differences': 'Shares are issued as blockchain tokens under the Swiss DLT Act rather than as registry book-entries at a traditional broker; the secondary market is a permissionless DEX (Camelot on Arbitrum) trading 24/7 with no lock-up, instead of a regulated stock exchange with settlement windows and brokers.',
            },
        ],
        events=[
            {
                'date': '2023-09-15',
                'title': 'Arcton closes CHF 350k pre-seed round',
                'description': 'Zurich fintech Arcton announced a CHF 350,000 pre-seed round from Swiss angel investors, including Francesco Illy (former co-owner of Gruppo Illy) and Prof. Aleks Berentsen (University of Basel, DLT expert), plus an investor strategically affiliated with Camelot.',
                'link': 'https://www.startupticker.ch/en/news/arcton-secures-chf-350-000-in-pre-seed-round-with-notable-investors',
            },
            {
                'date': '2023-10-01',
                'title': 'Money Masters set as first Arcton IPO',
                'description': 'Money Masters, a Swiss financial-literacy / EdTech startup, was announced as the first company to run an IPO on Arcton, launching in October 2023 with a soft cap of CHF 600k, a hard cap of CHF 1.2M and a CHF 5M pre-money valuation. (Day set to 1st; only the month is sourced.)',
                'link': 'https://medium.com/@arcton/money-masters-ipo-on-arcton-details-463644934150',
            },
        ],
        timeline=[
            {
                'date': '2022-01-01',
                'title': 'Arcton founded in Zurich',
                'description': 'Arcton founded in 2022 as a Zurich-based Swiss fintech out of the University of Zurich entrepreneurship ecosystem. (Day set to Jan 1; only the year is sourced.)',
                'link': 'https://www.innovation.uzh.ch/en/stories/news/2023_2022/15-09-2023_Arcton-pre-seed.html',
                'status': 'executed',
            },
            {
                'date': '2023-09-15',
                'title': 'Pre-seed raise, nearing platform launch',
                'description': 'CHF 350k pre-seed closed as the platform approached launch, with the first startup IPO planned for October 2023.',
                'link': 'https://www.innovation.uzh.ch/en/stories/news/2023_2022/15-09-2023_Arcton-pre-seed.html',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Founded',
                'value': '2022, Zurich, Switzerland',
                'freshness': 'static',
                'source': {
                    'label': 'UZH Innovation Hub',
                    'url': 'https://www.innovation.uzh.ch/en/stories/news/2023_2022/15-09-2023_Arcton-pre-seed.html',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Legal / regulatory basis',
                'value': 'Tokenized shares issued under the Swiss DLT Act (in force since 2021), entered into the Swiss Commercial Register',
                'freshness': 'static',
                'source': {
                    'label': 'Arcton docs - Share token',
                    'url': 'https://arcton.gitbook.io/documentation/tokenomics/share-token',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Chain & DEX',
                'value': 'Issues digital shares on Arbitrum; secondary trading via Camelot DEX',
                'freshness': 'static',
                'source': {
                    'label': 'Aleare/Revelo research on Arcton',
                    'url': 'https://alearesearch.substack.com/p/what-you-need-to-know-about-arcton',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Regulatory',
                'description': "Arcton's entire model depends on the Swiss DLT Act and on each offering clearing notarial approval and Swiss Commercial Register entry. Expansion beyond Switzerland into greater Europe faces differing securities regimes, and any adverse change to the DLT/securities framework would directly undercut the ability to issue or trade the share tokens.",
            },
            {
                'category': 'Counterparty',
                'description': 'Investors take direct exposure to individual early-stage startups selected by the Arcton team. Company failure, fraud, dilution via approved new share issuance, or non-payment of dividends can wipe out the value of a given share token; the curated due-diligence process is a human judgment, not a guarantee.',
            },
            {
                'category': 'Collateral',
                'description': "Each share token is only as valuable as the underlying private company's equity, which is illiquid and hard to price. Thin, startup-specific Camelot pools (seeded with roughly 12.5% of funds raised) mean the 'liquid' secondary market can gap sharply on modest sell pressure, so quoted prices may not reflect achievable exit value.",
            },
            {
                'category': 'Smart Contract',
                'description': 'Share issuance, LP staking (spNFT) and Nitro-pool reward logic run in on-chain contracts on Arbitrum. No public third-party audit report was found, so undiscovered contract bugs or mispriced reward mechanics are an unmitigated technical risk.',
            },
            {
                'category': 'Systemic',
                'description': 'The public-facing arcton.com since appears to operate as a B2B outbound-sales / cold-email agency, and the founders described pivoting toward an outbound-sales and VC-fund model. This raises material continuity/abandonment risk for the original tokenized-equity protocol and its listed IPOs.',
            },
        ],
        competitors=[
            {
                'name': 'Dinari',
                'slug': 'dinari',
                'rank': 1,
                'positioning': 'Tokenized real-world equity issuer',
                'similarities': 'Both bring real company equity on-chain as tradable tokens under a regulated wrapper, giving retail crypto users access to shares.',
                'differences': 'Dinari tokenizes shares of large listed US public companies (dShares) under US frameworks; Arcton tokenizes primary equity of private early-stage Swiss startups under the Swiss DLT Act.',
            },
            {
                'name': 'Securitize',
                'slug': 'securitize',
                'rank': 2,
                'positioning': 'Regulated tokenization / digital-securities platform',
                'similarities': 'Both are compliance-first platforms issuing tokenized securities (equity/funds) with legal registry and transfer-agent-style processes.',
                'differences': 'Securitize is a large US-regulated institutional issuer/transfer agent powering funds like BlackRock BUIDL; Arcton is a small Swiss retail startup-equity crowdfunding platform on Arbitrum/Camelot.',
            },
            {
                'name': 'Aktionariat',
                'slug': None,
                'rank': 3,
                'positioning': 'Swiss tokenized-shares platform',
                'similarities': 'Direct peer - also tokenizes shares of Swiss companies under the same Swiss DLT Act and provides an on-chain market maker for trading them.',
                'differences': 'Aktionariat focuses on giving individual SMEs their own tokenized share market; Arcton aggregates curated startup IPOs into a single crowdinvesting marketplace with Camelot LP incentives.',
            },
        ],
        partnerships=[
            {
                'name': 'Camelot (DEX, Arbitrum)',
                'date': '2023-09-01',
                'amountLabel': None,
                'description': "Camelot is Arcton's partner DEX: tokenized shares list and trade on Camelot's Arbitrum-native AMM, with Arcton's LP incentives built on Camelot's spNFT / Nitro-pool mechanics. One pre-seed investor was described as strategically affiliated with Camelot. (Date set to Sept 2023, when the collaboration was public around the raise; day approximate.)",
            },
        ],
        investment_rounds=[
            {
                'date': '2023-09-15',
                'round': 'Pre-seed',
                'amountUsd': 0,
                'amountLabel': 'CHF 350,000',
                'investors': [
                    'Francesco Illy (former co-owner, Gruppo Illy)',
                    'Prof. Aleks Berentsen (University of Basel)',
                    'Undisclosed investor affiliated with Camelot',
                ],
                'link': 'https://www.startupticker.ch/en/news/arcton-secures-chf-350-000-in-pre-seed-round-with-notable-investors',
            },
        ],
        sources=[
            {
                'label': 'Arcton official documentation (GitBook)',
                'url': 'https://arcton.gitbook.io/documentation/',
            },
            {
                'label': 'Arcton docs - Share token',
                'url': 'https://arcton.gitbook.io/documentation/tokenomics/share-token',
            },
            {
                'label': 'UZH Innovation Hub - Arcton pre-seed',
                'url': 'https://www.innovation.uzh.ch/en/stories/news/2023_2022/15-09-2023_Arcton-pre-seed.html',
            },
            {
                'label': 'Startupticker - Arcton CHF 350k pre-seed',
                'url': 'https://www.startupticker.ch/en/news/arcton-secures-chf-350-000-in-pre-seed-round-with-notable-investors',
            },
            {
                'label': 'blocmates - Arcton protocol focus',
                'url': 'https://blocmates.com/protocol-focus/arcton-democratizing-startup-investments',
            },
            {
                'label': 'Aleare/Revelo Intel research - Arcton',
                'url': 'https://alearesearch.substack.com/p/what-you-need-to-know-about-arcton',
            },
            {
                'label': 'Swiss Startup Association - Francesco Biviano (Arcton co-founder/COO)',
                'url': 'https://swissstartupassociation.ch/2024/07/18/meet-francesco-biviano-co-founder-coo-of-arcton/',
            },
        ],
        slug="arcton",
        name="Arcton",
        symbol="ARCTON",
        tagline="Tokenized pre-IPO and private equity access.",
        sub_sector="Tokenized Equities",
        secondary_tags=["Institutional-Gated"],
        website="https://arcton.com",
    ),
    "aryze": _seed(
        components=[
            {
                'name': 'Digital Cash (eEUR / eUSD / eGBP)',
                'description': "ARYZE's core product: a series of full-reserve fiat stablecoins ('Digital Cash') pegged 1:1 to the euro, US dollar and British pound, issued as ERC-20 tokens. Reserves are held in short-term government bonds/assets under a full-reserve banking model.",
            },
            {
                'name': 'reForge API / E-Assets smart contracts',
                'description': "ARYZE's smart-contract framework and reForge API providing built-in cross-chain transfer support for its E-Assets, intended to move tokens across chains without third-party bridging or wrapping services.",
            },
            {
                'name': 'Stablecoin-as-a-Service infrastructure',
                'description': 'A unified stack that combines stablecoin/tokenised-RWA issuance with bank-to-bank fiat on- and off-ramp (fiat rails) for licensed issuers, aiming to replace multiple fragmented vendor integrations.',
            },
            {
                'name': 'Pay by Bank',
                'description': 'An account-to-account payments product built on Open Banking (operated via ARYZE ApS in the UK), letting merchants accept bank-rail payments alongside the stablecoin stack.',
            },
        ],
        faq=[
            {
                'question': 'What is ARYZE Digital Cash?',
                'answer': "Digital Cash is ARYZE's family of full-reserve stablecoins (eEUR, eUSD, eGBP) pegged 1:1 to fiat currencies and issued as ERC-20 tokens, backed one-to-one by government-issued assets such as short-term government bonds.",
                'pinned': True,
            },
            {
                'question': "How are ARYZE's stablecoins backed?",
                'answer': 'ARYZE states it uses a full-reserve banking model, always holding enough assets to back 100% of the Digital Cash issued, with reserves held in short-term government bonds.',
                'pinned': False,
            },
            {
                'question': 'Who issues the eEUR / eUSD / eGBP tokens?',
                'answer': 'The Digital Cash stablecoins are issued by ARYZE BVI, a subsidiary of ARYZE ApS (Copenhagen, Denmark, CVR 38895052).',
                'pinned': False,
            },
            {
                'question': 'Which blockchains are ARYZE tokens on?',
                'answer': 'The tokens are deployed as ERC-20 assets on Ethereum, and ARYZE tokens have also been listed/deployed on additional chains such as Polygon and BNB Chain (BSC).',
                'pinned': False,
            },
            {
                'question': 'Is ARYZE just a stablecoin issuer?',
                'answer': 'No. ARYZE positions itself as infrastructure for licensed stablecoin and tokenised-RWA issuers, bundling issuance with bank-to-bank fiat on/off-ramp rails on a single platform (Stablecoin-as-a-Service).',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'ARYZE ApS',
                'role': 'Parent operating company (Denmark)',
                'description': 'Copenhagen-based Danish entity, CVR 38895052 / VAT DK38895052, founded 2017. Operates the platform and UK Pay-by-Bank / Open Banking product.',
            },
            {
                'name': 'ARYZE BVI',
                'role': 'Token issuer',
                'description': 'British Virgin Islands subsidiary of ARYZE ApS that issues the Digital Cash stablecoins (eEUR, eUSD, eGBP) under a full-reserve model.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Regulated e-money / prepaid balances (e.g. bank-issued e-money)',
                'similarity': 'Both represent fiat value redeemable 1:1 and aim to be a cash-like store of value backed by safe reserves.',
                'differences': 'ARYZE Digital Cash is a bearer ERC-20 token that moves on public blockchains 24/7 and can swap between currency pairs on-chain; traditional e-money is account-based, closed-loop and settles through bank rails.',
            },
            {
                'product': 'Money market funds / short-term government bond holdings',
                'similarity': 'Reserves for ARYZE stablecoins are held in short-term government bonds, similar to the assets underpinning a government MMF.',
                'differences': 'Holders of ARYZE Digital Cash receive a transferable payment token pegged 1:1 rather than fund shares, and (as marketed) do not receive fund yield distributions.',
            },
        ],
        events=[
            {
                'date': '2023-12-22',
                'title': 'Mercado Bitcoin lists eEUR',
                'description': "Mercado Bitcoin, Latin America's largest digital-asset platform, listed ARYZE's euro-pegged eEUR (ticker EEUR).",
                'link': 'https://www.globenewswire.com/news-release/2023/12/22/2800753/0/fr/Mercado-Bitcoin-int%C3%A8gre-la-monnaie-num%C3%A9rique-eEUR-de-ARYZE.html',
            },
            {
                'date': '2024-04-03',
                'title': 'Mercado Bitcoin lists eUSD and eGBP',
                'description': 'Mercado Bitcoin expanded its ARYZE Digital Cash listings with eUSD and eGBP (deployed on Polygon), enabling on-platform swaps between currency pairs.',
                'link': 'https://www.globenewswire.com/news-release/2024/04/03/2856646/0/en/Mercado-Bitcoin-Lists-eUSD-eGBP-Digital-Cash-stablecoins-by-ARYZE.html',
            },
            {
                'date': '2025-01-08',
                'title': 'Solum Global strategic partnership',
                'description': 'ARYZE and Solum Global Inc. announced a partnership to launch sgUSD (USD-backed) and sgGOLD (gold-backed) digital currencies across Ethereum, BNB Chain and Base, with ARYZE providing the issuance stack and custodial banking relationships.',
                'link': 'https://www.globenewswire.com/news-release/2025/01/08/3006375/0/en/Solum-Global-Inc-and-ARYZE-Announce-Strategic-Partnership-Launching-Stablecoin-and-Gold-Backed-Digital-Currency.html',
            },
            {
                'date': '2026-05-19',
                'title': '€3m Pre-Series A close',
                'description': 'ARYZE closed a €3m Pre-Series A to scale its integrated stablecoin-issuance + fiat-rails infrastructure for licensed stablecoin and tokenised-RWA issuers.',
                'link': 'https://fintech.global/2026/05/19/aryze-closes-e3m-pre-series-a-to-scale-stablecoin-infrastructure/',
            },
        ],
        timeline=[
            {
                'date': '2017-01-01',
                'title': 'ARYZE founded in Copenhagen',
                'description': 'ARYZE ApS founded in Copenhagen, Denmark to bridge crypto and fiat via blockchain payment infrastructure.',
                'link': 'https://tracxn.com/d/companies/aryze/__y8cxCN7Hd7VqPPBm5WQRZ5lkJjUxB9sqloh8VxbfWuY',
                'status': 'executed',
            },
            {
                'date': '2023-12-22',
                'title': 'First exchange listing (eEUR)',
                'description': "eEUR listed on Mercado Bitcoin, ARYZE's first major LatAm exchange distribution.",
                'link': 'https://www.globenewswire.com/news-release/2023/12/22/2800753/0/fr/Mercado-Bitcoin-int%C3%A8gre-la-monnaie-num%C3%A9rique-eEUR-de-ARYZE.html',
                'status': 'executed',
            },
            {
                'date': '2026-05-19',
                'title': 'Scale integrated issuance + fiat-rails stack',
                'description': 'Post-raise plan to build out the unified Stablecoin-as-a-Service platform combining issuance with bank-to-bank on/off-ramps for licensed issuers.',
                'link': 'https://fintech.global/2026/05/19/aryze-closes-e3m-pre-series-a-to-scale-stablecoin-infrastructure/',
                'status': 'stated',
            },
        ],
        offchain_facts=[
            {
                'key': 'Pre-Series A raise',
                'value': '€3,000,000 (approx. $3.4M), closed May 2026',
                'freshness': 'static',
                'source': {
                    'label': 'FinTech Global',
                    'url': 'https://fintech.global/2026/05/19/aryze-closes-e3m-pre-series-a-to-scale-stablecoin-infrastructure/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'eEUR token holders (Ethereum)',
                'value': '26 holder addresses; ~272 eEUR total supply on the ERC-20 contract 0x735fa792e731a2e8f83f32eb539841b7b72e6d8f',
                'freshness': 'live',
                'source': {
                    'label': 'Etherscan',
                    'url': 'https://etherscan.io/token/0x735fa792e731a2e8f83f32eb539841b7b72e6d8f',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Legal / entity identifier',
                'value': 'ARYZE ApS, Denmark, CVR 38895052 / VAT DK38895052; Digital Cash tokens issued by ARYZE BVI',
                'freshness': 'static',
                'source': {
                    'label': 'aryze.io',
                    'url': 'https://aryze.io/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Reserve / Depeg',
                'description': "Digital Cash is only as sound as ARYZE's full-reserve claim; there is no public, recurring third-party reserve attestation or audit report found, so backing quality (short-term government bonds) is self-reported and depeg risk is unverified.",
            },
            {
                'category': 'Counterparty',
                'description': 'Tokens are issued by ARYZE BVI (British Virgin Islands) rather than a regulated EU bank; holders rely on that entity and its custodial banking relationships to honor 1:1 redemption.',
            },
            {
                'category': 'Regulatory',
                'description': "As an EU/Danish fiat-referenced stablecoin issuer, ARYZE is exposed to MiCA e-money-token requirements and EMI licensing; the company markets to 'licensed issuers' but no completed EMI/MiCA authorization was found in public sources, creating regulatory execution risk.",
            },
            {
                'category': 'Smart Contract',
                'description': "eEUR/eUSD/eGBP are upgradeable proxy contracts (ERC1967Proxy) whose implementation can be changed by the admin, and the cross-chain reForge/E-Assets transfer mechanism concentrates trust in ARYZE's own contracts and admin keys.",
            },
            {
                'category': 'Systemic',
                'description': 'Very low on-chain adoption (tens of holders, ~272 eEUR supply on Ethereum) means the tokens are early-stage and illiquid, amplifying the impact of any single redemption, issuer or banking-partner failure.',
            },
        ],
        competitors=[
            {
                'name': 'Dinari',
                'slug': 'dinari',
                'rank': 1,
                'positioning': 'Regulated tokenized-asset / dollar-token issuer providing compliant on-chain financial instruments',
                'similarities': 'Both are compliance-first issuers of fiat/RWA-backed on-chain assets targeting regulated distribution.',
                'differences': 'Dinari centers on tokenized US securities (dShares) for US-regulated access; ARYZE centers on multi-currency full-reserve fiat stablecoins plus fiat rails from the EU.',
            },
            {
                'name': 'Securitize',
                'slug': 'securitize',
                'rank': 2,
                'positioning': 'Institutional tokenization platform and transfer agent for RWAs and funds',
                'similarities': 'Both offer issuance infrastructure for licensed institutions bringing real-world value on-chain.',
                'differences': 'Securitize focuses on tokenized funds/securities and cap-table/transfer-agent services; ARYZE focuses on payment-grade fiat stablecoins and bank on/off-ramps.',
            },
            {
                'name': 'Ondo Finance',
                'slug': 'ondo-finance',
                'rank': 3,
                'positioning': 'Tokenized US Treasuries and yield-bearing cash-equivalent products',
                'similarities': 'Both hold short-term government debt as backing and issue on-chain tokens redeemable to fiat value.',
                'differences': 'Ondo emphasizes yield-bearing treasury tokens (USDY/OUSG); ARYZE emphasizes non-yield 1:1 payment stablecoins across EUR/USD/GBP.',
            },
            {
                'name': 'Centrifuge',
                'slug': 'centrifuge',
                'rank': 4,
                'positioning': 'On-chain RWA credit / asset-financing protocol',
                'similarities': 'Both bring real-world assets on-chain within a compliance framework.',
                'differences': 'Centrifuge tokenizes private-credit collateral pools; ARYZE issues cash-like fiat stablecoins, not credit exposure.',
            },
        ],
        partnerships=[
            {
                'name': 'Mercado Bitcoin',
                'date': '2023-12-22',
                'amountLabel': None,
                'description': "Latin America's largest digital-asset exchange listed ARYZE's eEUR (Dec 2023), then added eUSD and eGBP (Apr 2024) for on-platform trading and currency-pair swaps.",
            },
            {
                'name': 'Solum Global Inc.',
                'date': '2025-01-08',
                'amountLabel': None,
                'description': 'Strategic partnership to launch sgUSD (USD-backed) and sgGOLD (gold-backed) digital currencies on Ethereum, BNB Chain and Base, with ARYZE supplying issuance technology and custodial banking relationships.',
            },
        ],
        investment_rounds=[
            {
                'date': '2026-05-19',
                'round': 'Pre-Series A',
                'amountUsd': 0,
                'amountLabel': '€3m (approx. $3.4M)',
                'investors': [],
                'link': 'https://fintech.global/2026/05/19/aryze-closes-e3m-pre-series-a-to-scale-stablecoin-infrastructure/',
            },
        ],
        sources=[
            {
                'label': 'FinTech Global - €3m Pre-Series A',
                'url': 'https://fintech.global/2026/05/19/aryze-closes-e3m-pre-series-a-to-scale-stablecoin-infrastructure/',
            },
            {
                'label': 'GlobeNewswire - Mercado Bitcoin lists eUSD & eGBP',
                'url': 'https://www.globenewswire.com/news-release/2024/04/03/2856646/0/en/Mercado-Bitcoin-Lists-eUSD-eGBP-Digital-Cash-stablecoins-by-ARYZE.html',
            },
            {
                'label': 'GlobeNewswire - Solum Global x ARYZE partnership',
                'url': 'https://www.globenewswire.com/news-release/2025/01/08/3006375/0/en/Solum-Global-Inc-and-ARYZE-Announce-Strategic-Partnership-Launching-Stablecoin-and-Gold-Backed-Digital-Currency.html',
            },
            {
                'label': 'Etherscan - ARYZE eEUR ERC-20',
                'url': 'https://etherscan.io/token/0x735fa792e731a2e8f83f32eb539841b7b72e6d8f',
            },
            {
                'label': 'ARYZE official site',
                'url': 'https://aryze.io/',
            },
            {
                'label': 'ARYZE Docs',
                'url': 'https://docs.aryze.io/en/documentation/contracts-list',
            },
            {
                'label': 'Dealroom - ARYZE profile',
                'url': 'https://app.dealroom.co/companies/aryze_io',
            },
        ],
        slug="aryze",
        name="Aryze",
        symbol="ARYZE",
        tagline="Multi-currency RWA stablecoins and FX tokens.",
        sub_sector="Stablecoins & FX",
        secondary_tags=["Institutional-Gated"],
        website="https://aryze.io",
    ),
    "atmosphera": _seed(
        components=[
            {
                'name': 'Event Investment Campaigns',
                'description': 'Curated fundraising campaigns for live events (festivals, concerts, theater). Investors browse campaigns, review terms, and commit from a $500 USD minimum. Structured either as revenue-sharing (a slice of ticket sales, no equity) or as debt (principal plus fixed interest repaid roughly one week post-event).',
            },
            {
                'name': 'Escrow & On-Chain Distribution',
                'description': "Investor funds are held in escrow until a campaign's funding target is reached, with automatic refunds if the goal is not met. Returns are drawn from ticket revenue held in escrow and distributed on-chain.",
            },
            {
                'name': 'Stobox STV3 Tokenization Layer',
                'description': "Atmosphera's tokenization runs on Stobox's STV3 Protocol via the Stobox 4 platform. STV3 is an ERC-20 implementation using the Diamond Standard (EIP-2535), deployed on Arbitrum One, that embeds compliance logic, investor rights, and financial data directly on-chain.",
            },
            {
                'name': 'Payments (Fiat & Crypto)',
                'description': 'Investors can fund campaigns with USDC on the Arbitrum network or via traditional bank wire, letting the platform onboard both crypto-native and fiat participants.',
            },
            {
                'name': 'Evedo Ecosystem Integration',
                'description': "Atmosphera is built on the Evedo Ecosystem's event infrastructure and positions itself as the financial layer alongside Evedo's existing ticketing, artist booking, payments, and event-operations tools.",
            },
        ],
        faq=[
            {
                'question': 'What is Atmosphera?',
                'answer': 'Atmosphera is an RWA platform that lets individuals invest in and earn returns from live events such as festivals and concerts. It is described as one of the first platforms in the world to tokenize revenue from live events, part of the Evedo Ecosystem.',
                'pinned': True,
            },
            {
                'question': 'How do investors earn returns?',
                'answer': 'Campaigns are structured as either revenue-sharing (investors receive a share of ticket sales, with no equity or shares) or debt (investors recover their principal plus fixed interest roughly one week after the event). Returns depend on event performance and are not guaranteed.',
                'pinned': False,
            },
            {
                'question': 'What is the minimum investment and how do I pay?',
                'answer': 'The minimum entry is $500 USD per campaign. Investors can pay with USDC on Arbitrum or via traditional bank wire.',
                'pinned': False,
            },
            {
                'question': 'How are my funds protected?',
                'answer': 'Funds are held in escrow until a campaign reaches its funding target; if the target is not met, investors are automatically refunded. Returns are later distributed on-chain from ticket revenue held in escrow.',
                'pinned': False,
            },
            {
                'question': 'Who provides the tokenization technology?',
                'answer': "Atmosphera uses Stobox's STV3 Protocol on the Stobox 4 platform. STV3 is an ERC-20 token built on the Diamond Standard (EIP-2535) and deployed on Arbitrum One, embedding compliance and investor rights on-chain.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Stoyan Angelov',
                'role': 'Founder & CEO (Evedo / Atmosphera)',
                'description': "Serial entrepreneur in the events and technology sectors, recognized in Forbes '30 Under 30'. Founder and CEO of the Evedo Ecosystem, under which Atmosphera operates. Named as Atmosphera co-founder and primary contact in the SUNWAVES partnership announcement.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Event / film revenue-participation financing (e.g., slate financing, revenue-share notes)',
                'similarity': "Investors provide upfront capital to fund a production or event and receive a share of the resulting box-office or ticket revenue rather than equity, mirroring Atmosphera's revenue-sharing campaigns.",
                'differences': 'Atmosphera fractionalizes participation to a $500 minimum for a global retail audience, settles via USDC on Arbitrum, holds funds in on-chain escrow, and distributes returns on-chain — versus traditional deals limited to accredited sponsors and settled off-chain.',
            },
            {
                'product': 'Reward/equity crowdfunding platforms (e.g., Kickstarter, Seedrs)',
                'similarity': 'Both pool capital from many small backers toward a specific project with all-or-nothing funding targets and refunds if targets are missed.',
                'differences': 'Atmosphera offers financial revenue-share or debt returns from ticket sales (its founder explicitly distinguishes it from crowdfunding), tokenizes the position on-chain with embedded compliance, and enforces KYC/identity verification per regulation.',
            },
        ],
        events=[
            {
                'date': '2026-02-02',
                'title': 'Stobox welcomes Atmosphera to bring event investments on-chain',
                'description': 'Stobox announced onboarding Atmosphera (an Evedo-ecosystem platform) onto Stobox 4 to tokenize revenue from live events via the STV3 Protocol, calling it one of the first platforms in the world to tokenize live-event revenue. Article authored by Stobox Founder & CEO Gene Deyev.',
                'link': 'https://stobox.io/blog/stobox-welcomes-atmosphera-bringing-event-investments-on-chain',
            },
            {
                'date': '2026-03-03',
                'title': 'Atmosphera partners with SUNWAVES Festival',
                'description': "SUNWAVES Festival (SW38 edition, 3-7 September 2026, Spain) became the first major festival to integrate Atmosphera's tokenized participation framework, accepting USDC on Arbitrum and bank payments with participant verification and on-chain record-keeping.",
                'link': 'https://www.wingerdaily.com/2026/03/03/atmosphera-partners-with-sunwaves-festival-for-on-chain-event-participation-platform/',
            },
            {
                'date': '2026-06-04',
                'title': 'Atmosphera opens live events to community investors',
                'description': "Coverage of Atmosphera's public launch as a revenue-sharing investment layer for events, with campaigns for Sunwaves SW38 (funded), CODRU 6 and The Bikers in Romania 2026, minimum $500 investment, funds in escrow and distributed on-chain.",
                'link': 'https://eventtechlive.com/atmosphera-opens-live-events-to-community-investors-through-blockchain-platform/',
            },
        ],
        timeline=[
            {
                'date': '2026-02-02',
                'title': 'Stobox integration announced',
                'description': 'Atmosphera onboarded onto Stobox 4 / STV3 Protocol to tokenize live-event revenue.',
                'link': 'https://stobox.io/blog/stobox-welcomes-atmosphera-bringing-event-investments-on-chain',
                'status': 'executed',
            },
            {
                'date': '2026-03-03',
                'title': 'First major festival integration (SUNWAVES SW38)',
                'description': "SUNWAVES became the first major festival to adopt Atmosphera's tokenized participation framework.",
                'link': 'https://www.wingerdaily.com/2026/03/03/atmosphera-partners-with-sunwaves-festival-for-on-chain-event-participation-platform/',
                'status': 'executed',
            },
            {
                'date': '2026-06-04',
                'title': 'Public investor launch with multi-campaign rollout',
                'description': 'Live campaigns opened to community investors (Sunwaves SW38 funded; CODRU 6 and The Bikers in Romania 2026 live).',
                'link': 'https://eventtechlive.com/atmosphera-opens-live-events-to-community-investors-through-blockchain-platform/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Minimum investment per campaign',
                'value': '$500 USD',
                'freshness': 'static',
                'source': {
                    'label': 'Stobox blog - Stobox Welcomes Atmosphera',
                    'url': 'https://stobox.io/blog/stobox-welcomes-atmosphera-bringing-event-investments-on-chain',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Ecosystem scale (Evedo)',
                'value': '3,500+ events and 750+ organizer partners (company-supplied figures)',
                'freshness': 'dynamic',
                'source': {
                    'label': 'Atmosphera / SUNWAVES announcement (Winger Daily)',
                    'url': 'https://www.wingerdaily.com/2026/03/03/atmosphera-partners-with-sunwaves-festival-for-on-chain-event-participation-platform/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Stobox tokenization track record',
                'value': 'Over $500 million in assets tokenized across real estate, energy, aviation and entertainment; 100+ clients in 20+ jurisdictions',
                'freshness': 'dynamic',
                'source': {
                    'label': 'Stobox blog - Stobox Welcomes Atmosphera',
                    'url': 'https://stobox.io/blog/stobox-welcomes-atmosphera-bringing-event-investments-on-chain',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': 'Returns depend entirely on event organizers delivering a successful event and remitting ticket revenue. Organizer default, cancellation, or underperformance directly reduces or eliminates investor returns; returns are explicitly not guaranteed.',
            },
            {
                'category': 'Collateral',
                'description': 'The underlying asset is future ticket-sales revenue, which is uncertain and unsecured. If an event sells poorly or is cancelled, there is limited or no recoverable collateral backing the tokenized position.',
            },
            {
                'category': 'Regulatory',
                'description': 'Tokenizing revenue-share and debt positions in live events sits in an evolving securities/RWA regulatory area across many jurisdictions; the platform requires KYC/identity verification per applicable regulation, and regulatory changes could restrict participation or the offering itself.',
            },
            {
                'category': 'Smart Contract',
                'description': "Positions are issued via Stobox's STV3 Protocol, an upgradeable ERC-20 built on the Diamond Standard (EIP-2535) on Arbitrum. Upgradeable/diamond-facet contracts and the escrow-and-distribution logic carry smart-contract and upgrade-key risk; no public audit report for Atmosphera's deployment is available.",
            },
            {
                'category': 'Network',
                'description': "Transactions and USDC settlement occur on Arbitrum One; investors are exposed to that L2's liveness, sequencer availability, and bridging risks.",
            },
        ],
        competitors=[
            {
                'name': 'Toucan Protocol',
                'slug': 'toucan-protocol',
                'rank': 1,
                'positioning': "On-chain tokenization of a non-traditional real-world revenue/asset class (carbon credits) with embedded compliance, comparable to Atmosphera's tokenization of an unconventional RWA (live-event revenue).",
                'similarities': 'Both bring a niche off-chain real-world value stream on-chain as tokenized, tradable/fractional instruments in the RWA sector.',
                'differences': 'Toucan tokenizes voluntary carbon credits for ESG markets; Atmosphera tokenizes live-event ticket revenue as investment campaigns with revenue-share/debt returns.',
            },
            {
                'name': 'Centrifuge',
                'slug': 'centrifuge',
                'rank': 2,
                'positioning': "Established RWA protocol financing real-world cash-flow-generating assets on-chain, a more mature analog to Atmosphera's event-revenue financing.",
                'similarities': 'Both structure real-world cash flows (revenue/receivables) into on-chain investable positions and connect off-chain originators with on-chain capital.',
                'differences': 'Centrifuge focuses on institutional-scale private-credit and receivables pools; Atmosphera targets retail investors funding individual live events from $500.',
            },
            {
                'name': 'Goldfinch',
                'slug': 'goldfinch',
                'rank': 3,
                'positioning': "On-chain financing of real-world businesses via debt, comparable to Atmosphera's debt-structured event campaigns.",
                'similarities': 'Both offer on-chain credit/debt exposure to real-world borrowers with returns paid from real-world cash flows.',
                'differences': 'Goldfinch finances private-credit borrowers (largely emerging-market lending); Atmosphera finances individual events with revenue-share or short-term event-linked debt.',
            },
        ],
        partnerships=[
            {
                'name': 'Stobox',
                'date': '2026-02-02',
                'amountLabel': None,
                'description': "Tokenization-infrastructure partnership: Atmosphera issues tokenized event-revenue positions via Stobox's STV3 Protocol on the Stobox 4 platform (Arbitrum One), embedding compliance and investor rights on-chain.",
            },
            {
                'name': 'SUNWAVES Festival',
                'date': '2026-03-03',
                'amountLabel': None,
                'description': "SUNWAVES (SW38 edition, September 2026, Spain) became the first major festival to integrate Atmosphera's tokenized participation framework.",
            },
            {
                'name': 'Evedo Ecosystem',
                'date': '2026-06-04',
                'amountLabel': None,
                'description': "Atmosphera is built on Evedo's event infrastructure (ticketing, artist booking, payments, operations) and operates as its financial layer; both are led by founder Stoyan Angelov.",
            },
        ],
        sources=[
            {
                'label': 'Atmosphera official website',
                'url': 'https://atmosphera.live/',
            },
            {
                'label': 'Stobox - Stobox Welcomes Atmosphera (partnership announcement)',
                'url': 'https://stobox.io/blog/stobox-welcomes-atmosphera-bringing-event-investments-on-chain',
            },
            {
                'label': 'Winger Daily - Atmosphera partners with SUNWAVES Festival',
                'url': 'https://www.wingerdaily.com/2026/03/03/atmosphera-partners-with-sunwaves-festival-for-on-chain-event-participation-platform/',
            },
            {
                'label': 'Event Tech Live - Atmosphera opens live events to community investors',
                'url': 'https://eventtechlive.com/atmosphera-opens-live-events-to-community-investors-through-blockchain-platform/',
            },
            {
                'label': 'Stobox Technology - Stobox 4, STV3 Protocol & DID',
                'url': 'https://www.stobox.io/technology',
            },
            {
                'label': 'GitHub - Stobox STV3 Protocol (tokenization infrastructure)',
                'url': 'https://github.com/StoboxTechnologies/Stobox_STV3_Protocol',
            },
            {
                'label': 'Stoyan Angelov (founder profile)',
                'url': 'https://stoyanangelov.com/',
            },
        ],
        slug="atmosphera",
        name="Atmosphera",
        symbol="ATMOS",
        tagline="Event and weather-linked structured finance.",
        sub_sector="Event Finance",
        secondary_tags=[],
        website="https://atmosphera.com",
    ),
    "chateau-capital": _seed(
        components=[
            {
                'name': 'chUSD (synthetic dollar)',
                'description': 'An overcollateralized, yield-ready synthetic dollar minted when users deposit stablecoins (USDC/USDT). It maintains a soft peg to the U.S. dollar, backed by real-world-asset collateral, with on-chain mint/redeem and arbitrage mechanisms.',
            },
            {
                'name': 'schUSD (staked chUSD)',
                'description': "A yield-accruing ERC-4626 vault token received when users stake chUSD. Yield is generated from Wall Street private credit strategies executed by Covenant VC, Chateau's hedge fund partner.",
            },
            {
                'name': 'ch.asset tokenized RWAs',
                'description': 'Tokenized private-market assets (equities, SPVs, closed-ended funds, over 1,000 pre-IPO private equities such as OpenAI, SpaceX, Anthropic, ByteDance). Each ch.asset is legally structured as a contractual debt instrument and/or participation interest in an SPV, and can be traded, staked, and used as DeFi collateral.',
            },
            {
                'name': 'Covenant VC private credit strategy',
                'description': 'A Manhattan-based hedge fund partner that supplies the private-credit portfolio powering schUSD yield, targeting mispriced risk in U.S. SME / revenue-based lending across a hyperdiversified book of 100+ positions.',
            },
            {
                'name': 'Compliance layer (Reg S / KYC-AML)',
                'description': 'Protocol-embedded compliance restricting access to verified, eligible non-U.S. investors under Regulation S. Only KYC/AML-verified users may participate in primary issuances or redemptions.',
            },
        ],
        faq=[
            {
                'question': 'What is Chateau Capital?',
                'answer': 'Chateau is a DeFi/RWA protocol that tokenizes private-market assets (private credit funds, pre-IPO equities, SPVs, closed-ended funds) so they can be traded, staked, and used as collateral on-chain, giving eligible non-U.S. investors access to institutional-grade opportunities.',
                'pinned': True,
            },
            {
                'question': 'How does chUSD generate yield?',
                'answer': 'Users deposit USDC/USDT to mint chUSD, then stake it for schUSD, an ERC-4626 vault whose yield comes from Wall Street private-credit strategies deployed by Covenant VC, a Manhattan-based hedge fund partner.',
                'pinned': False,
            },
            {
                'question': 'Who can use Chateau?',
                'answer': 'Access is limited to verified, eligible non-U.S. investors under Regulation S, subject to KYC and AML procedures. Chateau does not offer securities to U.S. persons or to residents of jurisdictions requiring additional licensing.',
                'pinned': False,
            },
            {
                'question': 'What blockchain does Chateau run on?',
                'answer': 'Chateau initially deployed on Arbitrum and, via its December 2024 partnership, integrated with Plume Network, a modular L1 focused on real-world-asset finance, to unlock over $500M in private-market investments.',
                'pinned': False,
            },
            {
                'question': 'What is the minimum investment?',
                'answer': 'Through the Plume integration, tokenized private-market exposure is available starting at $1 USDC, lowering the barrier to assets traditionally reserved for institutions.',
                'pinned': False,
            },
            {
                'question': 'Has Chateau been audited?',
                'answer': "Yes. Zellic audited Chateau's RWA token contracts in February 2024; the initial audit surfaced 3 critical, 1 medium and 2 informational findings, all of which Chateau acknowledged and fixed.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Hao Jun Tan',
                'role': 'Founder & CEO',
                'description': 'New York City-based trader, developer and entrepreneur; NYU Stern graduate who began building Chateau in late 2022 after working with traditional, alternative and crypto asset managers over a decade in crypto/digital assets.',
            },
            {
                'name': 'Keith Simons',
                'role': 'Team member / trader',
                'description': 'Began his career as a floor trader on NYMEX and has been an active futures and equities trader for roughly 30 years.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Private credit interval / closed-end fund (e.g., BDC or evergreen credit fund)',
                'similarity': 'Both give investors exposure to a diversified private-credit portfolio managed by a professional Wall Street team, aiming for consistent income.',
                'differences': 'Chateau wraps the exposure in on-chain tokens (schUSD) that settle instantly, allow on-chain secondary exit and use as DeFi collateral, versus TradFi funds with high minimums, lock-ups and multi-month redemption windows.',
            },
            {
                'product': 'Pre-IPO secondary marketplace (e.g., Forge/EquityZen)',
                'similarity': 'Both offer access to late-stage private equity in companies like SpaceX, OpenAI and Anthropic before IPO.',
                'differences': 'Chateau tokenizes the exposure as ERC-20 tokens tradable 24/7 with $1 minimums and DeFi composability, rather than high-minimum, illiquid private placements settled off-chain.',
            },
        ],
        events=[
            {
                'date': '2024-02-11',
                'title': 'Zellic completes audit of Chateau RWA token contracts',
                'description': "Zellic conducted a security assessment (Feb 9-11, 2024) of Chateau's RWA token contracts, finding 3 critical, 1 medium and 2 informational issues, all subsequently fixed.",
                'link': 'https://www.chateau.capital/blog/chateau-completes-zellic-audit',
            },
            {
                'date': '2024-08-01',
                'title': 'Chateau closes pre-seed round led by Hack VC',
                'description': 'Chateau announced a pre-seed financing round led by Hack VC to bring composable private equities and funds on-chain.',
                'link': 'https://blog.hack.vc/investing-in-chateau-bringing-composable-private-equities-and-funds-on-chain/',
            },
            {
                'date': '2024-12-11',
                'title': 'Plume and Chateau Capital partnership',
                'description': 'Chateau partnered with Plume Network to tokenize illiquid private-market assets into ERC-20 tokens, unlocking $500M+ in investments accessible from $1 USDC.',
                'link': 'https://www.prnewswire.com/news-releases/plume-and-chateau-capital-unlock-500m-private-market-investments-for-global-investors-302329124.html',
            },
        ],
        timeline=[
            {
                'date': '2024-08-01',
                'title': 'Pre-seed funding closed',
                'description': 'Pre-seed round led by Hack VC announced.',
                'link': 'https://hackernoon.com/announcing-chateaus-pre-seed-financing-round-led-by-hack-vc',
                'status': 'executed',
            },
            {
                'date': '2024-12-11',
                'title': 'Plume Network integration',
                'description': 'Launch of $500M+ private-market access via Plume, starting at $1 USDC.',
                'link': 'https://www.prnewswire.com/news-releases/plume-and-chateau-capital-unlock-500m-private-market-investments-for-global-investors-302329124.html',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Pre-seed lead investor',
                'value': 'Hack VC (round announced Aug 2024; amount undisclosed)',
                'freshness': 'static',
                'source': {
                    'label': 'Hack VC blog',
                    'url': 'https://blog.hack.vc/investing-in-chateau-bringing-composable-private-equities-and-funds-on-chain/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Private-market value unlocked via Plume',
                'value': '$500M+ in private-market investments, minimum $1 USDC',
                'freshness': 'static',
                'source': {
                    'label': 'PR Newswire',
                    'url': 'https://www.prnewswire.com/news-releases/plume-and-chateau-capital-unlock-500m-private-market-investments-for-global-investors-302329124.html',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Zellic audit findings (Feb 2024)',
                'value': '3 critical, 1 medium, 2 informational; all fixed',
                'freshness': 'static',
                'source': {
                    'label': 'Chateau blog',
                    'url': 'https://www.chateau.capital/blog/chateau-completes-zellic-audit',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': 'schUSD yield depends entirely on Covenant VC, a single external hedge-fund manager, and on the performance of its private-credit book; manager default, fraud or underperformance directly impairs holders.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'chUSD is a synthetic dollar soft-pegged to USD and backed by RWA collateral; if underlying private-credit assets fall in value or become illiquid, the peg and redemptions can break.',
            },
            {
                'category': 'Collateral',
                'description': 'Underlying collateral is illiquid private-market assets (private credit, pre-IPO equities, SPVs) with uncertain, infrequently marked NAVs, making on-chain valuation and liquidation difficult under stress.',
            },
            {
                'category': 'Regulatory',
                'description': 'Offerings rely on Regulation S and exclusion of U.S. persons; the issuer (Chateau Capital Corp) is incorporated in Panama with SPVs in Panama/BVI, exposing users to enforcement, jurisdictional and securities-law risk if the structure is challenged.',
            },
            {
                'category': 'Smart Contract',
                'description': 'The Feb 2024 Zellic audit found 3 critical vulnerabilities in the RWA token contracts; while remediated, tokenized-RWA and ERC-4626 vault contracts remain exposed to exploit and upgrade risk.',
            },
        ],
        competitors=[
            {
                'name': 'Ondo Finance',
                'slug': 'ondo-finance',
                'rank': 1,
                'positioning': 'Leading tokenized-RWA issuer with its own fund family (OUSG, USDY) and lending venue.',
                'similarities': 'Offers tokenized, yield-bearing dollar instruments and RWA exposure for non-U.S. investors with DeFi composability.',
                'differences': 'Ondo focuses on tokenized U.S. Treasuries/short-term funds at multi-billion scale, whereas Chateau centers on private credit and pre-IPO private equity.',
            },
            {
                'name': 'Centrifuge',
                'slug': 'centrifuge',
                'rank': 2,
                'positioning': 'Longest-running tokenized private-credit marketplace with on-chain credit pools.',
                'similarities': 'Both tokenize private credit as on-chain, composable assets usable in DeFi.',
                'differences': 'Centrifuge operates open credit-pool infrastructure; Chateau packages a single managed private-credit strategy (Covenant VC) into a synthetic-dollar vault plus pre-IPO equities.',
            },
            {
                'name': 'Securitize',
                'slug': 'securitize',
                'rank': 3,
                'positioning': 'Regulated transfer agent and issuance platform behind BlackRock BUIDL and Apollo/Hamilton Lane funds.',
                'similarities': 'Both provide compliant issuance and secondary trading of tokenized private-market and fund exposures.',
                'differences': 'Securitize is a regulated, institution-facing issuance/transfer-agent platform; Chateau is a permissionless-style DeFi protocol for eligible non-U.S. investors with lower ($1) minimums.',
            },
            {
                'name': 'Dinari',
                'slug': 'dinari',
                'rank': 4,
                'positioning': 'Issuer of tokenized equities (dShares) for non-U.S. investors.',
                'similarities': 'Both tokenize equity exposure for global non-U.S. investors on-chain.',
                'differences': 'Dinari focuses on public-equity dShares; Chateau targets private/pre-IPO equities plus private-credit yield.',
            },
        ],
        partnerships=[
            {
                'name': 'Plume Network',
                'date': '2024-12-11',
                'amountLabel': '$500M+ private-market investments unlocked',
                'description': 'Integration with Plume, a modular L1 for RWA finance, to tokenize illiquid private-market assets (pre-IPO shares, hedge-fund strategies, private credit/equity) into ERC-20 tokens accessible from $1 USDC.',
            },
            {
                'name': 'Covenant VC (Covenant Venture Capital)',
                'date': None,
                'amountLabel': None,
                'description': 'Manhattan-based hedge-fund partner supplying the private-credit strategy that powers schUSD yield, targeting U.S. SME / revenue-based lending across 100+ positions.',
            },
        ],
        investment_rounds=[
            {
                'date': '2024-08-01',
                'round': 'Pre-seed',
                'amountUsd': 0,
                'amountLabel': 'Undisclosed',
                'investors': [
                    'Hack VC',
                ],
                'link': 'https://blog.hack.vc/investing-in-chateau-bringing-composable-private-equities-and-funds-on-chain/',
            },
        ],
        audits=[
            {
                'firm': 'Zellic',
                'date': '2024-02-11',
                'url': 'https://www.chateau.capital/blog/chateau-completes-zellic-audit',
            },
        ],
        sources=[
            {
                'label': 'Chateau documentation - Overview',
                'url': 'https://docs.chateau.capital/chateau/',
            },
            {
                'label': 'Chateau blog - Zellic audit completed',
                'url': 'https://www.chateau.capital/blog/chateau-completes-zellic-audit',
            },
            {
                'label': 'Hack VC - Investing in Chateau',
                'url': 'https://blog.hack.vc/investing-in-chateau-bringing-composable-private-equities-and-funds-on-chain/',
            },
            {
                'label': 'PR Newswire - Plume x Chateau $500M unlock',
                'url': 'https://www.prnewswire.com/news-releases/plume-and-chateau-capital-unlock-500m-private-market-investments-for-global-investors-302329124.html',
            },
            {
                'label': 'crypto.news - Plume and Chateau partnership',
                'url': 'https://crypto.news/plume-and-chateau-capital-join-forces-to-unlock-500m-private-market-investments/',
            },
            {
                'label': 'Chateau documentation - Legal',
                'url': 'https://docs.chateau.capital/chateau/legal',
            },
            {
                'label': 'The Org - Hao Jun Tan, CEO',
                'url': 'https://theorg.com/org/chateau-capital/org-chart/hao-jun-tan',
            },
        ],
        slug="chateau-capital",
        name="Chateau Capital",
        symbol="CHATEAU",
        tagline="Structured RWA credit products.",
        sub_sector="Structured Products",
        secondary_tags=["Institutional-Gated"],
        website="https://chateau.capital",
    ),
    "dinari": _seed(
        components=[
            {
                'name': 'dShares',
                'description': 'Dinari Securities Backed Tokens: ERC-20 tokens representing individual US stocks and ETFs (e.g. AAPL, TSLA, NVDA, SPY), backed 1:1 by the underlying securities held in custody by a registered US broker-dealer. Over 150 tokenized equities are available.',
            },
            {
                'name': 'Dinari Financial Network',
                'description': 'A Layer 1 blockchain launched August 2025, built on Avalanche/AvaCloud, functioning as an omni-chain orderbook to unify liquidity and settlement for tokenized securities across chains (Arbitrum, Base, Plume, Solana and others). Validated by a consortium including Gemini, BitGo and VanEck.',
            },
            {
                'name': 'USD+',
                'description': "Dinari's yield-bearing stablecoin, US-dollar pegged with 1:1 redemptions and yield sourced from fixed-income assets (~4.8% APY as of April 2024). Supports cross-chain transfers via Chainlink CCIP.",
            },
            {
                'name': 'B2B API and smart contracts',
                'description': 'REST API and open-source smart contracts (sbt-contracts) that let fintechs and developers embed tokenized US stocks and ETFs into their own products, plus managed-account services.',
            },
            {
                'name': 'Transfer restriction / compliance layer',
                'description': 'On-chain transfer logic (whitelist/blacklist via TransferRestrictor contracts) requiring KYC/KYB verification before wallets can hold or trade dShares, enforcing AML and geographic restrictions so tokens cannot trade freely on open DEXs.',
            },
        ],
        faq=[
            {
                'question': 'What are dShares?',
                'answer': 'dShares are tokenized US stocks and ETFs issued by Dinari as ERC-20 tokens, each backed 1:1 by the corresponding real share held in custody by a registered US broker-dealer. They give holders price exposure to equities like Apple, Tesla and the S&P 500 on-chain.',
                'pinned': True,
            },
            {
                'question': 'Is Dinari regulated?',
                'answer': 'Yes. Dinari Inc. is an SEC-registered transfer agent, and its subsidiary Dinari Securities LLC is an SEC-registered broker-dealer and a member of FINRA and SIPC (SEC file number 8-71215), registered on June 20, 2025 - the first tokenized-equity platform to obtain US broker-dealer registration.',
                'pinned': True,
            },
            {
                'question': 'Are dShares backed by real stocks?',
                'answer': 'Yes. Each dShare is backed 1:1 by the underlying security. Underlying shares are held in custody (via broker-dealer custodial arrangements such as Alpaca Securities), and Dinari states the backing is verified through regular independent audits.',
                'pinned': False,
            },
            {
                'question': 'Can US investors trade dShares?',
                'answer': "dShares were initially launched outside the US for non-US investors. Dinari's June 2025 broker-dealer registration is intended to enable a compliant path to offer tokenized NMS securities to US investors; as of December 31, 2025 the broker-dealer subsidiary had not yet opened customer accounts.",
                'pinned': False,
            },
            {
                'question': 'Which blockchains do dShares run on?',
                'answer': 'dShares first launched on Arbitrum, then Ethereum mainnet (March 2024), and have expanded multichain including Base and Solana. The Dinari Financial Network and a LayerZero integration (November 2025) allow dShares to move and settle across multiple chains.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Dinari Inc.',
                'role': 'Parent company / SEC-registered transfer agent',
                'description': 'US company founded in 2021 (San Francisco / New York), issuer of dShares and operator of the Dinari platform. Registered as a transfer agent with the SEC under Section 17A(c). Co-founded and led by CEO Gabriel (Gabe) Otte.',
            },
            {
                'name': 'Dinari Securities LLC',
                'role': 'Broker-dealer subsidiary',
                'description': 'Wholly-owned subsidiary registered with the SEC as a broker-dealer (SEC file no. 8-71215, registered June 20, 2025) and a member of FINRA and SIPC, approved to tokenize NMS securities. First tokenized-equity platform to secure US broker-dealer registration.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Traditional brokerage account (e.g. buying US stocks via a broker)',
                'similarity': 'Provides economic exposure to the same underlying US equities and ETFs, with shares held in custody in a street-name style arrangement.',
                'differences': 'dShares are blockchain tokens tradable 24/7 and composable in DeFi, accessible to non-US retail across 85+ countries; a traditional brokerage settles on T+1 through the DTCC, offers direct voting/ownership rights, and is limited by market hours and geography.',
            },
            {
                'product': 'American Depositary Receipts (ADRs)',
                'similarity': 'Both are wrapper instruments that give investors indirect access to an underlying equity they might not otherwise be able to hold directly, backed by shares held by a custodian.',
                'differences': 'ADRs are issued by depositary banks and give foreign investors access to US-listed equities through traditional markets; dShares are on-chain tokens with programmable transfer restrictions, KYC-gated wallets and blockchain settlement rather than bank-intermediated clearing.',
            },
        ],
        events=[
            {
                'date': '2023-08-15',
                'title': 'Dinari raises $7.5M seed and launches dShare platform ex-US',
                'description': 'Dinari announced a $7.5M seed round and the launch of its dShare platform for non-US investors.',
                'link': 'https://www.theblock.co/post/244839/web3-equity-trading-firm-dinari-raises-7-5-million-in-seed-funding',
            },
            {
                'date': '2024-03-13',
                'title': 'dShares go live on Ethereum mainnet',
                'description': "Dinari brought its dShares ERC-20 tokens to Ethereum mainnet (previously on Arbitrum), coinciding with Ethereum's Dencun/EIP-4844 upgrade.",
                'link': 'https://dinari.com/blog/dinari-dshares-ethereum-mainnet',
            },
            {
                'date': '2024-04-12',
                'title': 'Chainlink CCIP integration for USD+',
                'description': 'Dinari integrated Chainlink CCIP to enable cross-chain transfers of its yield-bearing stablecoin USD+ between Arbitrum One and Ethereum.',
                'link': 'https://dinari.com/blog/chainlink-ccip-arbitrum-ethereum-usdplus',
            },
            {
                'date': '2025-05-01',
                'title': '$12.7M Series A',
                'description': 'Dinari raised a $12.7M Series A led by Hack VC and Blockchange Ventures, with VanEck Ventures, F-Prime and the Avalanche Fund participating, bringing total funding to $22.65M.',
                'link': 'https://www.coindesk.com/tech/2025/05/01/dinari-raises-usd12-7m-to-expand-tokenized-stock-access-for-non-u-s-investors',
            },
            {
                'date': '2025-06-26',
                'title': 'First tokenized-equity broker-dealer registration',
                'description': 'Dinari announced that subsidiary Dinari Securities LLC received US broker-dealer registration (SEC-registered June 20, 2025; FINRA/SIPC member), the first tokenized-equity platform to obtain such approval.',
                'link': 'https://www.marketsmedia.com/dinari-securities-receives-broker-dealer-registration/',
            },
            {
                'date': '2025-08-14',
                'title': 'Dinari Financial Network launch on Avalanche',
                'description': 'Dinari launched the Dinari Financial Network, a Layer 1 omni-chain orderbook built on Avalanche/AvaCloud with Gemini, BitGo and VanEck as initial validators.',
                'link': 'https://www.avax.network/about/blog/dinari-launches-the-dinari-financial-network/',
            },
            {
                'date': '2025-11-12',
                'title': 'Partnership with 1exchange (MAS-licensed)',
                'description': 'Dinari partnered with 1exchange, a MAS-licensed RWA securities exchange in Singapore, to bring nearly 200 tokenized US stocks and ETFs to 1X investors.',
                'link': 'https://www.prnewswire.com/apac/news-releases/1exchange-and-dinari-partner-to-empower-cross-border-access-to-tokenized-us-securities-302612003.html',
            },
            {
                'date': '2025-11-20',
                'title': 'LayerZero integration',
                'description': 'Dinari integrated LayerZero to let dShares move and settle across chains, initially four ecosystems with plans to expand to 150+ blockchains.',
                'link': 'https://layerzero.network/blog/dinari-layerzero-tokenized-us-equities-global',
            },
        ],
        timeline=[
            {
                'date': '2025-06-20',
                'title': 'US broker-dealer registration',
                'description': 'Dinari Securities LLC registered with the SEC as a broker-dealer (FINRA/SIPC member), establishing a compliant path to offer tokenized US securities.',
                'link': 'https://www.sec.gov/Archives/edgar/data/2012557/000201255726000004/Dinari_2025_Public.pdf',
                'status': 'executed',
            },
            {
                'date': '2025-08-14',
                'title': 'Launch Dinari Financial Network L1',
                'description': "Roll out an Avalanche-based Layer 1 omni-chain orderbook to serve as settlement infrastructure ('DTCC of tokenized stocks') for a partner network.",
                'link': 'https://www.coindesk.com/business/2025/08/14/tokenization-firm-dinari-to-launch-l1-blockchain-aims-to-be-the-dtcc-of-tokenized-stocks',
                'status': 'executed',
            },
            {
                'date': '2025-11-20',
                'title': 'Cross-chain expansion via LayerZero',
                'description': "Extend dShares across LayerZero's ecosystem, targeting expansion from four initial chains toward 150+ supported blockchains.",
                'link': 'https://layerzero.network/blog/dinari-layerzero-tokenized-us-equities-global',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Total funding raised',
                'value': '$22.65M across seed and Series A (Series A of $12.7M closed May 1, 2025)',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk - Dinari Series A',
                    'url': 'https://www.coindesk.com/tech/2025/05/01/dinari-raises-usd12-7m-to-expand-tokenized-stock-access-for-non-u-s-investors',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Tokenized assets available',
                'value': '150+ US stocks and ETFs offered as dShares (nearly 200 cited in later partner announcements)',
                'freshness': 'dynamic',
                'source': {
                    'label': 'Dinari dShares page',
                    'url': 'https://dinari.com/dshares',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Broker-dealer registration date',
                'value': 'Dinari Securities LLC SEC-registered as broker-dealer on June 20, 2025 (SEC file no. 8-71215; FINRA/SIPC member)',
                'freshness': 'static',
                'source': {
                    'label': 'SEC EDGAR - Dinari Securities Form X-17A-5',
                    'url': 'https://www.sec.gov/Archives/edgar/data/2012557/000201255726000004/Dinari_2025_Public.pdf',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': 'dShares are only as sound as the custody of the underlying equities. Holders rely on Dinari Securities and third-party broker-dealer/custodians (e.g. Alpaca Securities) to actually hold the backing 1:1; custodian insolvency, mismanagement, or failure to maintain full backing would impair token value.',
            },
            {
                'category': 'Regulatory',
                'description': 'Tokenized US securities sit in an evolving legal area. dShares were initially unavailable to US investors, and the broker-dealer subsidiary had not opened customer accounts as of December 2025. Changes in SEC/FINRA rules or foreign securities regimes across the 85+ countries served could restrict issuance, trading, or redemption.',
            },
            {
                'category': 'Smart Contract',
                'description': 'dShares and USD+ are governed by smart contracts (sbt-contracts, TransferRestrictor, dividend contracts). Despite Hacken audits, undiscovered bugs, upgradeability/admin-key risk, or exploits in the token or transfer-restriction logic could lead to loss of funds or frozen assets.',
            },
            {
                'category': 'Collateral',
                'description': 'Backing depends on shares actually held against each token. Corporate actions (splits, delistings, halts), gaps between on-chain supply and off-chain share inventory, or a failure of the 1:1 reserve verification process could cause a dShare to diverge from its underlying stock.',
            },
            {
                'category': 'Systemic',
                'description': "Dinari's model bridges TradFi settlement (broker-dealer, T+1, DTCC-style rails) with 24/7 on-chain markets. Because underlying US equities only trade during market hours while dShares trade continuously across chains, price gaps, liquidity crunches, and settlement mismatches can arise during market closures or stress.",
            },
        ],
        competitors=[
            {
                'name': 'Ondo Finance',
                'slug': 'ondo-finance',
                'rank': 1,
                'positioning': 'Large RWA tokenization platform running Ondo Global Markets for tokenized US equities and ETFs, plus tokenized treasuries (OUSG/USDY).',
                'similarities': 'Both tokenize US equities/ETFs 1:1 and target global, largely non-US access to US public markets on-chain.',
                'differences': 'Ondo is a broader RWA/treasury platform with its own chain ambitions and large treasury products; Dinari is equity-focused and uniquely holds a US SEC/FINRA broker-dealer registration and transfer-agent status.',
            },
            {
                'name': 'Securitize',
                'slug': 'securitize',
                'rank': 2,
                'positioning': 'SEC-registered transfer agent and broker-dealer powering institutional tokenization (e.g. BlackRock BUIDL).',
                'similarities': 'Both operate as regulated transfer agents bridging securities law and on-chain issuance of tokenized real-world securities.',
                'differences': 'Securitize focuses on institutional fund/private-asset tokenization and primary issuance infrastructure; Dinari is retail-facing with a catalog of tokenized public stocks (dShares).',
            },
            {
                'name': 'Backed Finance (xStocks)',
                'slug': None,
                'rank': 3,
                'positioning': 'Swiss issuer of tokenized stocks (xStocks) distributed via exchanges like Kraken and Bybit on Solana.',
                'similarities': 'Both issue 1:1-backed tokenized US equities aimed at non-US investors.',
                'differences': 'Backed issues under EU/Swiss frameworks as tracker certificates; Dinari operates under US securities registration with a US broker-dealer and transfer-agent structure.',
            },
            {
                'name': 'Robinhood (tokenized stocks)',
                'slug': None,
                'rank': 4,
                'positioning': 'Consumer brokerage offering tokenized US stocks to EU users on an Arbitrum-based / in-house chain.',
                'similarities': 'Both bring tokenized US equities to non-US retail investors.',
                'differences': 'Robinhood is a large regulated brokerage distributing to EU retail through its own app; Dinari is an infrastructure/B2B issuer providing dShares and APIs to partners plus direct access.',
            },
        ],
        partnerships=[
            {
                'name': 'Avalanche / Ava Labs (AvaCloud)',
                'date': '2025-08-14',
                'amountLabel': None,
                'description': 'Dinari Financial Network, a Layer 1 omni-chain orderbook for tokenized securities, is built on Avalanche using AvaCloud, with Ava Labs support.',
            },
            {
                'name': 'Gemini, BitGo, VanEck (Financial Network validators)',
                'date': '2025-08-14',
                'amountLabel': None,
                'description': 'Gemini, BitGo and VanEck serve as initial validators / custody-and-settlement participants of the Dinari Financial Network consortium.',
            },
            {
                'name': 'LayerZero',
                'date': '2025-11-20',
                'amountLabel': None,
                'description': 'Interoperability integration letting dShares move and settle across chains, initially four ecosystems with a roadmap to 150+ blockchains.',
            },
            {
                'name': 'Chainlink (CCIP)',
                'date': '2024-04-12',
                'amountLabel': None,
                'description': "Chainlink CCIP integration enabling cross-chain transfers of Dinari's yield-bearing stablecoin USD+ between Arbitrum One and Ethereum.",
            },
            {
                'name': '1exchange (1X)',
                'date': '2025-11-12',
                'amountLabel': None,
                'description': 'Partnership with 1exchange, a MAS-licensed RWA securities exchange in Singapore, to offer nearly 200 tokenized US stocks and ETFs to its investors.',
            },
        ],
        investment_rounds=[
            {
                'date': '2023-08-15',
                'round': 'Seed',
                'amountUsd': 7500000,
                'amountLabel': '$7.5M',
                'investors': [
                    'Third Kind Venture Capital',
                    '500 Global',
                    'Balaji Srinivasan',
                    'Sancus Ventures',
                    'Version One Ventures',
                    'SPEILLLP (Susquehanna International Group)',
                ],
                'link': 'https://www.theblock.co/post/244839/web3-equity-trading-firm-dinari-raises-7-5-million-in-seed-funding',
            },
            {
                'date': '2025-05-01',
                'round': 'Series A',
                'amountUsd': 12700000,
                'amountLabel': '$12.7M',
                'investors': [
                    'Hack VC',
                    'Blockchange Ventures',
                    'VanEck Ventures',
                    'F-Prime',
                    'Avalanche Fund',
                ],
                'link': 'https://www.coindesk.com/tech/2025/05/01/dinari-raises-usd12-7m-to-expand-tokenized-stock-access-for-non-u-s-investors',
            },
        ],
        audits=[
            {
                'firm': 'Hacken',
                'date': '2024-12-30',
                'url': 'https://assets.dinari.com/audits/Audit_Hacken_241230.pdf',
            },
            {
                'firm': 'Hacken',
                'date': '2023-12-12',
                'url': 'https://assets.dinari.com/audits/Audit_Hacken_231212.pdf',
            },
        ],
        sources=[
            {
                'label': 'Dinari dShares (official)',
                'url': 'https://dinari.com/dshares',
            },
            {
                'label': 'SEC EDGAR - Dinari Securities Form X-17A-5 (FY2025)',
                'url': 'https://www.sec.gov/Archives/edgar/data/2012557/000201255726000004/Dinari_2025_Public.pdf',
            },
            {
                'label': 'CoinDesk - Dinari raises $12.7M Series A',
                'url': 'https://www.coindesk.com/tech/2025/05/01/dinari-raises-usd12-7m-to-expand-tokenized-stock-access-for-non-u-s-investors',
            },
            {
                'label': 'The Block - Dinari $7.5M seed',
                'url': 'https://www.theblock.co/post/244839/web3-equity-trading-firm-dinari-raises-7-5-million-in-seed-funding',
            },
            {
                'label': 'Avalanche - Dinari Financial Network launch',
                'url': 'https://www.avax.network/about/blog/dinari-launches-the-dinari-financial-network/',
            },
            {
                'label': 'LayerZero - Dinari integration',
                'url': 'https://layerzero.network/blog/dinari-layerzero-tokenized-us-equities-global',
            },
            {
                'label': 'Hacken - Dinari SBT audit (Dec 2024)',
                'url': 'https://assets.dinari.com/audits/Audit_Hacken_241230.pdf',
            },
        ],
        github='https://github.com/dinaricrypto',
        slug="dinari",
        name="Dinari",
        symbol="DINARI",
        tagline="Tokenized US equities as dShares.",
        sub_sector="Tokenized Equities",
        secondary_tags=["Institutional-Gated", "Multi-Chain"],
        website="https://dinari.com",
    ),
    "dualmint": _seed(
        components=[
            {
                'name': 'Boring Index Vault',
                'description': 'A diversified, tokenized yield vault (ERC-4626 / ERC-7540 async standard) that pools operating cash flow across multiple everyday-asset categories into a single position and streams returns to depositors in USDC. Minimum investment referenced at $500.',
            },
            {
                'name': 'Marketplace (explore.dualmint.com)',
                'description': 'A live marketplace where investors can view and back individual tokenized single-asset offerings (e.g. arcade claw machines, HVAC units, vending machines) rather than the pooled index, each with a target yield and an internal asset-quality score.',
            },
            {
                'name': 'Onchain Equipment Lessor Model',
                'description': 'DualMint acquires physical revenue-generating machines and distributes their operating cash flow to depositors as monthly stablecoin yield, positioning itself as an onchain equipment lessor rather than a token-emissions yield source.',
            },
            {
                'name': 'IoT Revenue Verification',
                'description': 'IoT sensors capture each operating cycle of the machines, and telemetry is cross-referenced against operator bank deposits (reconciled monthly, reviewed quarterly) to verify that reported revenue matches real-world cash flow.',
            },
        ],
        faq=[
            {
                'question': 'What is DualMint?',
                'answer': 'DualMint is an onchain yield platform / equipment lessor that tokenizes revenue-generating small and medium enterprise (SME) assets such as laundromats, vending machines, HVAC units, arcade machines and vertical farms, and distributes their operating cash flow to depositors as monthly USDC yield.',
                'pinned': True,
            },
            {
                'question': 'How does DualMint generate yield?',
                'answer': 'Yield comes from the operating revenue of physical machines (real cash flow from customer transactions) rather than token emissions. IoT sensors track each operating cycle and revenue is reconciled against operator bank deposits, with net proceeds distributed in USDC after fees and liquidity buffers.',
                'pinned': False,
            },
            {
                'question': 'What is the Boring Index Vault?',
                'answer': "It is DualMint's flagship diversified yield vault built on the ERC-4626 tokenized-vault standard (with async ERC-7540 mechanics referenced), which pools cash flow across asset categories into one position and streams returns in USDC.",
                'pinned': False,
            },
            {
                'question': 'Which blockchains and stablecoins does DualMint support?',
                'answer': 'Per its Circle Alliance profile, DualMint uses USDC as its primary stablecoin and supports Arbitrum, Avalanche, Base, Ethereum and Polygon PoS. It has also referenced M0 stablecoin infrastructure and PayPal PYUSD.',
                'pinned': False,
            },
            {
                'question': 'Does DualMint have a native token?',
                'answer': 'No native protocol token is disclosed on its site; yields are paid to depositors in USDC stablecoin.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Bill Lee',
                'role': 'Co-Founder & CEO',
                'description': "Named as co-founder of DualMint in the September 2025 Chainlink Build announcement (also rendered 'Bill Lees' on the DualMint site).",
            },
            {
                'name': 'Ed Steward',
                'role': 'COO',
                'description': 'Listed as Chief Operating Officer on the DualMint website.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Equipment leasing / equipment finance fund',
                'similarity': "Like a traditional equipment-leasing company, DualMint acquires physical income-producing machines and distributes the operating cash flow to capital providers; it explicitly describes itself as an 'onchain equipment lessor.'",
                'differences': 'Ownership is fractionalized and tokenized onchain (low entry points, e.g. $1 for single assets or $500 for the vault), yield is paid in USDC stablecoin, and revenue is verified via IoT telemetry rather than periodic lessee reporting.',
            },
            {
                'product': 'Small-business / private-credit income fund',
                'similarity': 'Offers investors exposure to cash flows from operating small businesses, similar to a private income or SME-credit fund.',
                'differences': 'Positions are transferable ERC-4626/7540 vault tokens on public blockchains, accessible globally at retail ticket sizes without a fund administrator or minimum accreditation described on-site.',
            },
        ],
        events=[
            {
                'date': '2025-09-19',
                'title': 'DualMint joins Chainlink Build',
                'description': 'DualMint joined the Chainlink Build program to integrate Chainlink Data Feeds and Proof of Reserve, aiming to secure markets around its SME vault yields and verify SME repayment. Announcement cited over $50M in assets under administration across 15 countries.',
                'link': 'https://chainlinktoday.com/dualmint-joins-chainlink-build-to-bridge-everyday-businesses-and-blockchain/',
            },
            {
                'date': '2026-05-14',
                'title': 'DualMint, peaq and CoinList Passage tokenize autonomous machines',
                'description': "CoinList announced its Passage platform, with DualMint named as the first platform to leverage Passage infrastructure (from compliance to funding to asset distribution) alongside peaq to distribute tokenized yield from autonomous machines, including KanyaAI's AI-optimized vertical farm at an estimated ~20% yield.",
                'link': 'https://blog.coinlist.co/introducing-passage-by-coinlist-the-access-layer-for-onchain-capital-markets/',
            },
        ],
        timeline=[
            {
                'date': '2025-05-01',
                'title': 'First yield distributions begin',
                'description': 'DualMint reports beginning monthly USDC yield distributions to depositors, with zero interruptions and zero operator defaults reported since.',
                'link': 'https://www.dualmint.com/',
                'status': 'executed',
            },
            {
                'date': '2025-09-19',
                'title': 'Chainlink Build integration',
                'description': 'Joined Chainlink Build to integrate Data Feeds and Proof of Reserve.',
                'link': 'https://chainlinktoday.com/dualmint-joins-chainlink-build-to-bridge-everyday-businesses-and-blockchain/',
                'status': 'executed',
            },
            {
                'date': '2026-05-14',
                'title': 'Boring Index Vault launch via CoinList Passage',
                'description': "DualMint set to be the first platform on CoinList's Passage infrastructure, distributing tokenized machine yield with peaq; the diversified Boring Index Vault was still pre-launch at the time of DualMint's site content.",
                'link': 'https://blog.coinlist.co/introducing-passage-by-coinlist-the-access-layer-for-onchain-capital-markets/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Assets under administration',
                'value': 'Over $50 million across 15 countries (as stated in the September 2025 Chainlink Build announcement)',
                'freshness': 'static',
                'source': {
                    'label': 'Chainlink Today - DualMint joins Chainlink Build',
                    'url': 'https://chainlinktoday.com/dualmint-joins-chainlink-build-to-bridge-everyday-businesses-and-blockchain/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'RWAs originated',
                'value': '1,250+ tokenized machines sold onchain; $50M operator pipeline ready for vault deployment',
                'freshness': 'static',
                'source': {
                    'label': 'DualMint official website',
                    'url': 'https://www.dualmint.com/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Supported networks and stablecoin',
                'value': 'USDC across Arbitrum, Avalanche, Base, Ethereum and Polygon PoS',
                'freshness': 'static',
                'source': {
                    'label': 'Circle Alliance Directory - DualMint',
                    'url': 'https://partners.circle.com/partner/dualmint',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': 'Yield depends on the operators running the physical machines (laundromats, HVAC units, arcades, vending, vertical farms) remitting real revenue; operator underperformance, fraud or default would directly reduce or halt distributions. DualMint markets a 0% default record but this is a short, self-reported track record since May 2025.',
            },
            {
                'category': 'Collateral',
                'description': 'The tokens are backed by depreciating physical equipment concentrated in specific locations (e.g. Shenzhen, Hong Kong) and asset types; equipment breakdown, theft, obsolescence or local demand collapse could impair the underlying cash flows and asset value.',
            },
            {
                'category': 'Oracle',
                'description': 'Revenue and reserve verification rely on IoT telemetry and Chainlink Data Feeds / Proof of Reserve; compromised, spoofed or faulty sensor data or oracle feeds could misstate real machine revenue and reserve backing.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'Distributions and vault accounting are denominated in USDC (and reference PYUSD / M0 stablecoins); a stablecoin depeg or freeze would affect the value and redeemability of investor yield and principal.',
            },
            {
                'category': 'Regulatory',
                'description': 'DualMint offers tokenized income-generating instruments to retail participants across many jurisdictions using a BVI special-purpose vehicle; these products may be treated as securities in various countries, creating enforcement, registration and cross-border compliance risk.',
            },
            {
                'category': 'Smart Contract',
                'description': 'Funds are held in ERC-4626 / ERC-7540 vault contracts; no completed third-party audit report is published on the site, so standard vault vulnerabilities (inflation attacks, rounding, access-control bugs) remain a live risk.',
            },
        ],
        competitors=[
            {
                'name': 'Centrifuge',
                'slug': 'centrifuge',
                'rank': 1,
                'positioning': 'Established onchain infrastructure for tokenizing real-world cash-flow assets and structuring them into onchain pools.',
                'similarities': 'Both tokenize revenue-generating real-world assets and stream yield onchain to investors.',
                'differences': "Centrifuge focuses on institutional-scale private credit and structured pools, whereas DualMint targets small, 'boring' street-level SME equipment (laundromats, vending, arcades) with retail-sized tickets.",
            },
            {
                'name': 'Goldfinch',
                'slug': 'goldfinch',
                'rank': 2,
                'positioning': 'Onchain private-credit protocol financing real-world business borrowers, historically in emerging markets.',
                'similarities': 'Both provide onchain exposure to yield from real-world business operations rather than crypto-native emissions.',
                'differences': 'Goldfinch underwrites credit to businesses via debt; DualMint owns and leases the physical equipment directly and distributes operating cash flow.',
            },
            {
                'name': 'Franklin Templeton',
                'slug': 'franklin-templeton',
                'rank': 3,
                'positioning': 'Institutional asset manager offering tokenized yield products (e.g. tokenized money-market fund).',
                'similarities': 'Both distribute real-world yield to investors via onchain tokens.',
                'differences': "Franklin Templeton's yield is from regulated Treasury/money-market instruments; DualMint's is from private, higher-risk SME equipment cash flows.",
            },
            {
                'name': 'Lofty AI',
                'slug': 'lofty-ai',
                'rank': 4,
                'positioning': 'Platform for fractional, tokenized ownership of income-producing real-world assets (real estate) with daily rent distributions.',
                'similarities': 'Both fractionalize physical income-producing assets and pay frequent yield to retail token holders.',
                'differences': 'Lofty focuses on residential real estate rental income; DualMint focuses on operating equipment/machine cash flows.',
            },
        ],
        partnerships=[
            {
                'name': 'Chainlink (Build program)',
                'date': '2025-09-19',
                'amountLabel': None,
                'description': 'Joined Chainlink Build to integrate Chainlink Data Feeds and Proof of Reserve for securing markets around SME vault yields and verifying SME repayment.',
            },
            {
                'name': 'Circle (USDC / Circle Alliance)',
                'date': '2025-09-26',
                'amountLabel': None,
                'description': 'Listed in the Circle Alliance Directory using USDC as its primary stablecoin across Arbitrum, Avalanche, Base, Ethereum and Polygon PoS, with on/off-ramp functionality.',
            },
            {
                'name': 'peaq & CoinList (Passage)',
                'date': '2026-05-14',
                'amountLabel': None,
                'description': "Named as the first platform to leverage CoinList's Passage infrastructure, working with peaq to tokenize and distribute yield from autonomous machines such as KanyaAI's Hong Kong vertical farm.",
            },
        ],
        sources=[
            {
                'label': 'DualMint official website',
                'url': 'https://www.dualmint.com/',
            },
            {
                'label': 'Chainlink Today - DualMint joins Chainlink Build (2025-09-19)',
                'url': 'https://chainlinktoday.com/dualmint-joins-chainlink-build-to-bridge-everyday-businesses-and-blockchain/',
            },
            {
                'label': 'Circle Alliance Directory - DualMint',
                'url': 'https://partners.circle.com/partner/dualmint',
            },
            {
                'label': 'CoinList blog - Introducing Passage (DualMint + peaq)',
                'url': 'https://blog.coinlist.co/introducing-passage-by-coinlist-the-access-layer-for-onchain-capital-markets/',
            },
            {
                'label': 'peaq blog - Machine RWA Framework (DualMint vertical farm)',
                'url': 'https://www.peaq.xyz/blog/introducing-the-peaq-machine-rwa-framework-tokenize-your-robots',
            },
            {
                'label': 'DualMint Medium - Real Yield vs Fantasy APY (2025-04-11)',
                'url': 'https://dualmintrwa.medium.com/real-yield-vs-fantasy-apy-dualmints-data-driven-case-for-boring-infrastructure-06d77e82382a',
            },
        ],
        slug="dualmint",
        name="DualMint",
        symbol="DUAL",
        tagline="Tokenization infrastructure for real-world assets.",
        sub_sector="Tokenization Infrastructure",
        secondary_tags=["Institutional-Gated"],
        website="https://dualmint.com",
    ),
    "estate-protocol": _seed(
        components=[
            {
                'name': 'Fractional Property Tokens (ST-20 / ERC-20)',
                'description': 'Each property is represented by security tokens built on a Polymath ST-20 implementation, fully ERC-20 compatible with added transfer-restriction logic (whitelist-based GeneralTransferManager). Tokens represent proportional ownership and entitle holders to rent and appreciation.',
            },
            {
                'name': 'Legal Trust Wrapper',
                'description': "When a property's funding goal is reached, the legal team creates a trust that holds title to the real asset. All participating wallets are listed as beneficiaries with ownership proportions set by their contributions; ownership is defined by control of the wallet's private keys.",
            },
            {
                'name': 'Stablecoin Investment & Rent Rails',
                'description': 'Investors fund listings with stablecoins (USDC). Monthly rental income is distributed on-chain to token holders in USDC automatically, described as dividend-like passive income with no manual tenant management.',
            },
            {
                'name': 'Web3 dApp + Backend Platform',
                'description': 'Five-subsystem architecture: a Web3 frontend dApp, an administrative frontend, the smart-contract layer, a backend API service, and a database. Web3Auth is used for wallet generation to onboard non-crypto-native users.',
            },
            {
                'name': 'Secondary Trading Marketplace (in development)',
                'description': "A planned on-chain marketplace where holders can list tokens for sale to other whitelisted users, intended to provide compliant liquidity. Documentation marks this feature as 'Coming Soon'.",
            },
            {
                'name': 'Rewards NFT Distribution',
                'description': 'An on-chain hybrid distribution contract (EP-rewards-nft) supporting batched airdrops and ERC-20-based public minting, used for user rewards (total supply 555).',
            },
        ],
        faq=[
            {
                'question': 'What is Estate Protocol?',
                'answer': 'Estate Protocol is a blockchain platform that tokenizes real estate into fractional tokens, letting anyone globally invest in income-generating properties using stablecoins. It launched its first tokenized property in Dubai and operates on the Arbitrum network.',
                'pinned': True,
            },
            {
                'question': 'How do investors earn money?',
                'answer': 'Token holders earn a proportional share of monthly rental income distributed on-chain in USDC, plus potential appreciation of the underlying property. Payouts are automatic and recorded on-chain.',
                'pinned': False,
            },
            {
                'question': 'What is the minimum investment?',
                'answer': "Entry is fractional and low. Estate Protocol's materials have cited minimums such as $50 per token, with earlier communications referencing $100-$250 (250 USDC) per investment.",
                'pinned': False,
            },
            {
                'question': 'How is my ownership legally protected?',
                'answer': 'Each property is held by a legally compliant trust. Every investing wallet is listed as a beneficiary of the trust with ownership proportional to its investment, so token holders receive the economic rights of traditional real-estate investors.',
                'pinned': False,
            },
            {
                'question': 'Which blockchain does it use?',
                'answer': 'Estate Protocol is built on Arbitrum, an Ethereum Layer-2. Its security tokens follow a Polymath ST-20 design that is ERC-20 compatible and uses whitelist-based transfer controls for compliance.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Parv Prabhakar',
                'role': 'Co-Founder & CEO',
                'description': 'Leads Estate Protocol; publicly frames tokenization as a way to unlock trillions in real-estate liquidity.',
            },
            {
                'name': 'Ryan Smith',
                'role': 'Co-Founder & Head of Real Estate',
                'description': 'Co-founder responsible for real estate sourcing and operations.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'REIT (Real Estate Investment Trust)',
                'similarity': 'Both pool investor capital into income-producing property and distribute rental income proportionally, giving small investors exposure to real estate.',
                'differences': 'A REIT is a regulated fund holding many properties with shares traded on exchanges; Estate Protocol tokenizes individual properties into a per-asset trust, settles in stablecoins on-chain, and offers 24/7 fractional entry from very low amounts rather than pooled diversified equity.',
            },
            {
                'product': 'Direct property purchase / buy-to-let',
                'similarity': 'Investors gain ownership of a specific property and collect the rent it generates plus any appreciation.',
                'differences': 'Direct ownership requires large capital, is illiquid (weeks/months to sell), and involves paperwork and tenant management; Estate Protocol fractionalizes the same property into tradeable tokens with automated on-chain USDC rent and no landlord duties.',
            },
        ],
        events=[
            {
                'date': '2024-03-07',
                'title': 'Estate Protocol launches tokenized real estate marketplace with first Dubai property',
                'description': 'Estate Protocol announced the launch of its tokenized real-estate marketplace, tokenizing an apartment in Iris Blue, Dubai Marina on Arbitrum. The first property reportedly sold out in six days.',
                'link': 'https://www.einpresswire.com/article/693863558/estate-protocol-launches-its-tokenized-real-estate-marketplace-with-first-property-in-dubai',
            },
            {
                'date': '2024-08-19',
                'title': 'Partnership with SmartCrowd to launch fractional Dubai investments',
                'description': "Estate Protocol partnered with SmartCrowd, described as MENA's first regulated real-estate crowdfunding platform, to offer Dubai property investments; investments are made in AED, with any USDC converted to USD and transferred to SmartCrowd.",
                'link': 'https://www.einpresswire.com/article/736535033/estate-protocol-launches-real-estate-in-dubai-in-partnership-with-smartcrowd',
            },
        ],
        timeline=[
            {
                'date': '2024-03-07',
                'title': 'First tokenized property live (Iris Blue, Dubai Marina)',
                'description': 'Marketplace launch on Arbitrum with the first fractional property offering.',
                'link': 'https://www.einpresswire.com/article/693863558/estate-protocol-launches-its-tokenized-real-estate-marketplace-with-first-property-in-dubai',
                'status': 'executed',
            },
            {
                'date': '2024-08-19',
                'title': 'SmartCrowd partnership',
                'description': 'Regulated distribution partnership for Dubai real estate.',
                'link': 'https://www.einpresswire.com/article/736535033/estate-protocol-launches-real-estate-in-dubai-in-partnership-with-smartcrowd',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Properties tokenized / portfolio value',
                'value': '31 properties tokenized, valued at more than $12 million (per CEO, 2025)',
                'freshness': 'point-in-time',
                'source': {
                    'label': 'TheStreet - Estate Protocol CEO on tokenization',
                    'url': 'https://www.thestreet.com/crypto/markets/estate-protocol-ceo-tokenization-7-trillion-real-estate-liquidity',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'First property sell-out',
                'value': 'First tokenized property (Iris Blue, Dubai Marina) sold out in 6 days',
                'freshness': 'static',
                'source': {
                    'label': 'TheStreet - Estate Protocol CEO on tokenization',
                    'url': 'https://www.thestreet.com/crypto/markets/estate-protocol-ceo-tokenization-7-trillion-real-estate-liquidity',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Company / funding status',
                'value': 'Founded 2021; co-founders Parv Prabhakar & Ryan Smith; ~7 employees; no disclosed venture funding rounds (unfunded per Tracxn)',
                'freshness': 'point-in-time',
                'source': {
                    'label': 'Tracxn - Estate Protocol company profile',
                    'url': 'https://tracxn.com/d/companies/estate-protocol/__PAv651lMk5oECBT-iN40k_NdZ-1X5ckss1C0JsX-OF4',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Regulatory',
                'description': 'Tokenized real estate straddles securities and property law. Estate Protocol uses security-token (ST-20) structures and jurisdiction-specific trusts; regulatory treatment of fractional property tokens and Golden-Visa/eligibility claims varies by jurisdiction and is evolving, creating enforcement and marketing-compliance risk.',
            },
            {
                'category': 'Counterparty',
                'description': "Ownership depends on off-chain legal trusts that hold property title on behalf of token holders, plus reliance on partners (e.g., SmartCrowd) and the legal team that forms and administers each trust. If a trustee or partner fails to honor obligations, token holders' economic rights could be impaired despite on-chain records.",
            },
            {
                'category': 'Collateral',
                'description': 'The tokens are backed by individual physical properties. Property-level risks (vacancy, tenant default, valuation decline, title/custody defects, local market downturns in Dubai/UAE) directly affect rent distributions and token value, and there is little diversification within a single-property offering.',
            },
            {
                'category': 'Smart Contract',
                'description': 'The platform relies on custom ST-20/Polymath-derived and rewards contracts on Arbitrum. No public third-party security audit was found, so undiscovered smart-contract or transfer-manager vulnerabilities could expose funds or ownership records.',
            },
            {
                'category': 'Systemic',
                'description': "The promised secondary marketplace is still 'coming soon'; until compliant on-chain trading is live, tokens may be effectively illiquid, undermining the core liquidity value proposition and leaving holders unable to exit quickly.",
            },
        ],
        competitors=[
            {
                'name': 'RealT',
                'slug': 'realt',
                'rank': 1,
                'positioning': 'Established tokenized fractional rental-property platform (primarily US properties) distributing rent in stablecoins on-chain.',
                'similarities': 'Fractionalizes individual income-generating properties into tokens and pays rent to holders in stablecoins, low minimums.',
                'differences': 'RealT focuses on US single-family rentals via LLC structures and has a longer track record and larger portfolio; Estate Protocol focuses on Dubai/UAE properties using trust structures on Arbitrum.',
            },
            {
                'name': 'Lofty AI',
                'slug': 'lofty-ai',
                'rank': 2,
                'positioning': 'US-focused fractional real-estate marketplace on Algorithm/Algorand enabling low-minimum property investing with daily rent.',
                'similarities': 'Direct-to-retail fractional property ownership with on-chain rent distribution and low entry points.',
                'differences': 'Lofty targets US residential rentals on Algorand; Estate Protocol targets Dubai/global property on Arbitrum with a security-token (ST-20) trust model.',
            },
            {
                'name': 'SmartCrowd',
                'slug': None,
                'rank': 3,
                'positioning': "MENA's first regulated real-estate crowdfunding platform in Dubai; also an Estate Protocol distribution partner.",
                'similarities': 'Fractional Dubai real-estate investment for retail investors.',
                'differences': 'Regulated AED-denominated crowdfunding (not blockchain-native tokens for end users); serves as both a peer and a partner.',
            },
            {
                'name': 'Prypco Mint',
                'slug': None,
                'rank': 4,
                'positioning': "Dubai Land Department-backed, government-endorsed tokenized real-estate marketplace (MENA's first government-backed offering).",
                'similarities': 'Tokenized fractional Dubai property with on-chain records and secondary trading.',
                'differences': 'Government-backed via DLD with official registry integration and AED-based access; Estate Protocol is an independent private platform on Arbitrum.',
            },
        ],
        partnerships=[
            {
                'name': 'SmartCrowd',
                'date': '2024-08-19',
                'amountLabel': None,
                'description': "Partnership to launch fractional Dubai real-estate investments via SmartCrowd, MENA's first regulated real-estate crowdfunding platform. Investments made in AED; USDC converted to USD and transferred to SmartCrowd.",
            },
        ],
        sources=[
            {
                'label': 'Estate Protocol - official site (Tokenized Real Estate on Arbitrum)',
                'url': 'https://www.estateprotocol.com/',
            },
            {
                'label': 'Estate Protocol Whitepaper - Technology',
                'url': 'https://docs.estateprotocol.com/whitepaper/protocol/technology',
            },
            {
                'label': 'Estate Protocol Whitepaper - Process',
                'url': 'https://docs.estateprotocol.com/whitepaper/protocol/process',
            },
            {
                'label': 'Estate Protocol Whitepaper - Tokenized Real Estate',
                'url': 'https://docs.estateprotocol.com/whitepaper/estate-protocol-features/tokenized-real-estate',
            },
            {
                'label': 'einpresswire - Launch of first Dubai property (2024-03-07)',
                'url': 'https://www.einpresswire.com/article/693863558/estate-protocol-launches-its-tokenized-real-estate-marketplace-with-first-property-in-dubai',
            },
            {
                'label': 'einpresswire - SmartCrowd partnership (2024-08-19)',
                'url': 'https://www.einpresswire.com/article/736535033/estate-protocol-launches-real-estate-in-dubai-in-partnership-with-smartcrowd',
            },
            {
                'label': 'TheStreet - Estate Protocol CEO on $7T liquidity, 31 properties',
                'url': 'https://www.thestreet.com/crypto/markets/estate-protocol-ceo-tokenization-7-trillion-real-estate-liquidity',
            },
            {
                'label': 'Tracxn - Estate Protocol company profile',
                'url': 'https://tracxn.com/d/companies/estate-protocol/__PAv651lMk5oECBT-iN40k_NdZ-1X5ckss1C0JsX-OF4',
            },
            {
                'label': 'Estate Protocol GitHub organization',
                'url': 'https://github.com/Estate-Protocol-Home',
            },
        ],
        github='https://github.com/Estate-Protocol-Home',
        slug="estate-protocol",
        name="Estate Protocol",
        symbol="ESTATE",
        tagline="Fractional commercial real estate on-chain.",
        sub_sector="Real Estate",
        secondary_tags=["Real-World-Custody", "Institutional-Gated"],
        website="https://estateprotocol.com",
    ),
    "florence-finance": _seed(
        components=[
            {
                'name': 'Loan Vaults',
                'description': 'On-chain vaults that hold portfolios of real-world SME loans grouped by a common denominator (originator, geography, or risk/reward). Depositors fund vaults with flrEUR and receive vault tokens representing a claim on the underlying loan portfolio and its interest. Live vaults include Caple (Arbitrum), Junior/SwishFund (Arbitrum) and Avellinia (Base).',
            },
            {
                'name': 'flrEUR (Florin / FLR) token',
                'description': 'Euro-denominated stablecoin-like instrument minted when a new loan is funded and burned when a loan matures and is repaid. It is intended to be 1:1 redeemable for EUR via the protocol Treasury, and is used to deposit into loan vaults. Secondary liquidity is provided via DEX pools (e.g. Camelot/Uniswap).',
            },
            {
                'name': 'FFM (Florence Finance Medici) token',
                'description': "The protocol's native governance and utility token (ERC-20). A portion of real-world interest from loan vaults is used to buy back and burn FFM from the open market. Governance holders are intended to approve collateral and lending terms as the protocol decentralizes.",
            },
            {
                'name': 'Treasury',
                'description': 'Contract that holds loan repayments and enables 1:1 flrEUR-to-EUR redemption. If the Treasury is empty, participants rely on secondary-market DEX liquidity to exit positions.',
            },
            {
                'name': 'SME lending partners / originators',
                'description': 'External, vetted credit providers (e.g. Caple, SwishFund, Avellinia) that source and manage SME/private-credit exposure. Florence acts as a wholesale funder / re-distributor of their diversified credit rather than originating loans itself, and does not use leverage or fractional reserves.',
            },
        ],
        faq=[
            {
                'question': 'What is Florence Finance?',
                'answer': 'Florence Finance is a Euro-denominated RWA (real-world asset) lending protocol that bridges on-chain crypto liquidity to real-world European SME / private-credit lending. Users deposit stablecoins to fund loans made by established SME lending partners and earn a share of the real-world interest on-chain, without the protocol relying on leverage or fractional reserves.',
                'pinned': True,
            },
            {
                'question': 'Which blockchains does Florence Finance run on?',
                'answer': 'The protocol operates on Arbitrum and Base. The FFM governance token is deployed on Ethereum, Arbitrum and Base. Loan vaults are split between Arbitrum (Caple, Junior) and Base (Avellinia), and FFM can be traded on Uniswap; flrEUR liquidity is available via DEX pools such as Camelot.',
                'pinned': False,
            },
            {
                'question': 'How do the FLR (flrEUR) and FFM tokens differ?',
                'answer': 'flrEUR (Florin / FLR) is the euro-denominated funding instrument: it is minted when a loan is funded, burned on repayment, and intended to be 1:1 redeemable for EUR through the Treasury. FFM (Florence Finance Medici) is the separate governance and utility token, whose supply is reduced over time via buyback-and-burn funded by loan interest.',
                'pinned': False,
            },
            {
                'question': 'How do users earn yield?',
                'answer': 'Users convert stablecoins (e.g. USDC/EURA) into flrEUR and deposit it into a loan vault, receiving vault tokens. They earn a portion of the real-world interest paid by the underlying SME loans, distributed on-chain. Positions can generally be exited via the Treasury (1:1 redemption) or secondary DEX liquidity.',
                'pinned': False,
            },
            {
                'question': 'What are the main risks?',
                'answer': 'The primary risk is credit risk from borrower/SME defaults; Florence currently performs the underlying due diligence and plans a default reserve to absorb minor losses. Liquidity risk also applies: if the Treasury is empty, exiting depends on secondary-market liquidity. The current rollout vaults intentionally focus on the riskier junior/subordinated end of the credit spectrum.',
                'pinned': False,
            },
            {
                'question': 'Have the smart contracts been audited?',
                'answer': "Florence states its smart contracts have undergone audits and have run live for over three years with no reported smart-contract losses or credit losses. The protocol is non-custodial: it does not hold users' digital assets but converts stablecoins into credit exposure via lending partners.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Chiel Ruiter',
                'role': 'Founder',
                'description': 'Founder of Florence Finance; former investment banker described as an ex-Managing Director at Goldman Sachs and UBS in the Netherlands before moving into crypto.',
            },
            {
                'name': 'Leo Greve',
                'role': 'Co-founder / Senior advisor',
                'description': 'Co-founder / senior advisor with a career advising and financing financial institutions, with a capital-markets focus.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Private-credit / direct-lending fund',
                'similarity': 'Both pool investor capital to provide non-bank financing to SMEs and earn the credit spread, taking on borrower default risk in exchange for real-world yield uncorrelated to public markets.',
                'differences': 'Florence tokenizes the exposure (flrEUR + vault tokens) so it is transferable and composable in DeFi, is euro-denominated and permissionlessly accessible, and offers on-chain transparency and secondary liquidity rather than multi-year lock-ups and high minimums of a traditional fund.',
            },
            {
                'product': 'Invoice factoring / working-capital finance',
                'similarity': 'Like factoring, several vaults (e.g. Caple) fund short-term working-capital SME loans, providing an alternative funding source to specialist lenders.',
                'differences': 'Florence is a wholesale funder that re-distributes exposure from existing originators on-chain with no leverage or fractional reserves, versus a factoring company that directly buys receivables and warehouses them on its own balance sheet.',
            },
        ],
        events=[
            {
                'date': '2024-11-11',
                'title': 'Florence Finance partners with Ozean (Clearpool) for on-chain European private credit',
                'description': "Florence Finance partnered with Ozean, Clearpool's blockchain for RWA yield, to bring European private-credit opportunities on-chain. At announcement Florence had originated over EUR 10 million in loans and distributed more than EUR 500,000 in interest to its community.",
                'link': 'https://clearpool.medium.com/florence-finance-brings-european-private-credit-on-chain-to-ozean-b9802ca3a7e3',
            },
        ],
        timeline=[
            {
                'date': '2021-02-01',
                'title': '$3M seed round',
                'description': 'Closed a ~$3 million seed round with Big Brain Holdings, Bixin Ventures, New Form Capital, Focus Labs and Nothing Research.',
                'link': 'https://www.crunchbase.com/organization/florence-finance',
                'status': 'executed',
            },
            {
                'date': '2022-01-01',
                'title': 'MVP / Protocol V2 launch',
                'description': 'Launched the MVP and subsequently the redesigned Florence V2 loan vaults; first loans underwritten and platform infrastructure established.',
                'link': 'https://medium.com/florencefinance/florence-roadmap-46a9e648b3d1',
                'status': 'executed',
            },
            {
                'date': '2024-11-11',
                'title': 'Ozean / Clearpool partnership',
                'description': 'Integration to bring European SME private credit on-chain to the Ozean ecosystem.',
                'link': 'https://clearpool.medium.com/florence-finance-brings-european-private-credit-on-chain-to-ozean-b9802ca3a7e3',
                'status': 'executed',
            },
            {
                'date': '2025-01-01',
                'title': 'Florence V3 and CEX listing (planned)',
                'description': 'Roadmap items include a next-generation V3 platform with improved UX, centralized-exchange listing of FFM, and progression toward a decentralized co-operative lending governance model.',
                'link': 'https://medium.com/florencefinance/florence-roadmap-46a9e648b3d1',
                'status': 'planned',
            },
        ],
        offchain_facts=[
            {
                'key': 'Cumulative loans originated',
                'value': 'Over EUR 10 million in loans originated (as of Nov 2024)',
                'freshness': 'point-in-time',
                'source': {
                    'label': 'Clearpool / Ozean partnership announcement',
                    'url': 'https://clearpool.medium.com/florence-finance-brings-european-private-credit-on-chain-to-ozean-b9802ca3a7e3',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Interest distributed to community',
                'value': 'More than EUR 500,000 in interest distributed (as of Nov 2024)',
                'freshness': 'point-in-time',
                'source': {
                    'label': 'Clearpool / Ozean partnership announcement',
                    'url': 'https://clearpool.medium.com/florence-finance-brings-european-private-credit-on-chain-to-ozean-b9802ca3a7e3',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Seed funding raised',
                'value': '~$3 million seed round (Feb 2021)',
                'freshness': 'static',
                'source': {
                    'label': 'Crunchbase - Florence Finance',
                    'url': 'https://www.crunchbase.com/organization/florence-finance',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': 'Credit / borrower-default risk is the primary risk: repayment depends on European SMEs and the lending partners (Caple, SwishFund, Avellinia) that originate and manage the loans. Current rollout vaults intentionally target the riskier junior/subordinated/2nd-lien end of the credit spectrum.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'flrEUR is intended to redeem 1:1 for EUR via the Treasury, but if the Treasury is empty redemption depends on secondary-market DEX liquidity, which can cause the flrEUR market price to deviate from its EUR peg.',
            },
            {
                'category': 'Governance',
                'description': 'Due diligence, collateral approval and lending-term decisions are currently centralized with the Florence team, with decentralization to FFM governance stated only as a future goal, creating key-person and centralization risk.',
            },
            {
                'category': 'Smart Contract',
                'description': 'Vaults, tokens and Treasury are governed by smart contracts; despite audits and a multi-year live track record, contract bugs or exploits could impair funds. The protocol depends on cross-chain deployments across Arbitrum, Base and Ethereum.',
            },
            {
                'category': 'Regulatory',
                'description': 'Providing euro-denominated private credit to European SMEs and issuing a EUR-pegged instrument exposes the protocol to evolving EU financial-services, lending, securities and MiCA-style regulation across multiple jurisdictions.',
            },
        ],
        competitors=[
            {
                'name': 'Goldfinch',
                'slug': 'goldfinch',
                'rank': 1,
                'positioning': 'Decentralized private-credit protocol funding real-world lending to businesses in emerging markets.',
                'similarities': 'Both are on-chain private-credit protocols that channel crypto liquidity to real-world business/SME borrowers via vetted lenders and tokenized exposure.',
                'differences': "Goldfinch is USD-denominated and focused largely on emerging markets, whereas Florence is euro-denominated and focused on European SME credit; Goldfinch uses a backer/auditor model versus Florence's wholesale-funder model.",
            },
            {
                'name': 'Centrifuge',
                'slug': 'centrifuge',
                'rank': 2,
                'positioning': 'RWA tokenization protocol pooling securitized real-world assets (invoices, loans) for on-chain financing.',
                'similarities': 'Both tokenize real-world credit assets and make them composable in DeFi, connecting asset originators to on-chain liquidity.',
                'differences': 'Centrifuge is a broad multi-asset securitization/Tinlake pool infrastructure across asset classes, while Florence is a narrower euro-denominated SME/private-credit lender.',
            },
            {
                'name': 'Clearpool',
                'slug': 'clearpool',
                'rank': 3,
                'positioning': 'Institutional uncollateralized/permissioned lending marketplace and RWA yield infrastructure (Ozean).',
                'similarities': "Both bring institutional private-credit exposure on-chain; Clearpool's Ozean is a direct integration partner for Florence.",
                'differences': 'Clearpool centers on institutional borrower credit pools and its own RWA chain (Ozean), whereas Florence is a euro-focused SME lender that plugs into ecosystems like Ozean as an originator.',
            },
        ],
        partnerships=[
            {
                'name': 'Ozean (Clearpool)',
                'date': '2024-11-11',
                'amountLabel': None,
                'description': 'Partnership to bring European SME private credit on-chain to the Ozean RWA-yield ecosystem being built by Clearpool, using compliance-first infrastructure and euro stablecoins.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-02-01',
                'round': 'Seed',
                'amountUsd': 3000000,
                'amountLabel': '~$3M',
                'investors': [
                    'Big Brain Holdings',
                    'Bixin Ventures',
                    'New Form Capital',
                    'Focus Labs',
                    'Nothing Research',
                ],
                'link': 'https://www.crunchbase.com/organization/florence-finance',
            },
        ],
        sources=[
            {
                'label': 'Florence Finance docs - Welcome / overview',
                'url': 'https://docs.florence.finance/docs',
            },
            {
                'label': 'Florence Finance docs - How it works / Introduction',
                'url': 'https://docs.florence.finance/docs/protocol-overview/how-it-works/introduction',
            },
            {
                'label': 'Florence Finance docs - FAQ',
                'url': 'https://docs.florence.finance/docs/support/faq',
            },
            {
                'label': 'Florence Finance docs - Smart contracts (addresses)',
                'url': 'https://docs.florence.finance/docs/support/smart-contracts',
            },
            {
                'label': 'Florence Roadmap (Medium)',
                'url': 'https://medium.com/florencefinance/florence-roadmap-46a9e648b3d1',
            },
            {
                'label': 'Clearpool - Florence Finance x Ozean partnership',
                'url': 'https://clearpool.medium.com/florence-finance-brings-european-private-credit-on-chain-to-ozean-b9802ca3a7e3',
            },
            {
                'label': 'Crunchbase - Florence Finance',
                'url': 'https://www.crunchbase.com/organization/florence-finance',
            },
        ],
        github='https://github.com/florence-finance',
        slug="florence-finance",
        name="Florence Finance",
        symbol="FF",
        tagline="SME invoice financing on-chain.",
        sub_sector="Private Credit",
        secondary_tags=["Institutional-Gated"],
        website="https://florence.finance",
    ),
})

# Cross-tagged RWA entities with secondary Lending sector — kept for import compat.
RWA_LENDING_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    "centrifuge": {"expected": 1, "rationale": "CFG governance (product RWAs not MemberCoins)"},
    "clearpool": {"expected": 1, "rationale": "CPOOL governance"},
    "goldfinch": {"expected": 1, "rationale": "GFI governance"},
}

# RWA-sector MemberCoin audit registry (includes cross-tagged lending+RWA entities).
RWA_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    **RWA_LENDING_MEMBER_COIN_AUDIT,
    "ondo-finance": {
        "expected": "multi",
        "rationale": "USDY/rUSDY/OUSG/ONDO-GOV/ONDO-GM",
        "action_hint": "review_multi_coin",
    },
    "pleasing-market": {
        "expected": "multi",
        "rationale": "PGOLD + USDpm",
        "action_hint": "review_multi_coin",
    },
    "securitize": {"expected": 0, "rationale": "BUIDL etc. copy-only per spec scope"},
    "realt": {"expected": 1, "rationale": "REG governance"},
    "lofty-ai": {"expected": 0, "rationale": "Algorand properties; no on-chain member coins"},
    "toucan-protocol": {"expected": 0, "rationale": "BCT/NCT pools; no MemberCoins in scope"},
    "franklin-templeton": {
        "expected": 1,
        "rationale": "BENJI RWA coin (benji slug; on-chain via registry + CoinGecko)",
    },
    "arcton": {"expected": 0, "rationale": "Long-tail seed"},
    "aryze": {"expected": 0, "rationale": "Long-tail seed"},
    "atmosphera": {"expected": 0, "rationale": "Long-tail seed"},
    "chateau-capital": {"expected": 0, "rationale": "Long-tail seed"},
    "dinari": {"expected": 0, "rationale": "Long-tail seed"},
    "dualmint": {"expected": 0, "rationale": "Long-tail seed"},
    "estate-protocol": {"expected": 0, "rationale": "Long-tail seed"},
    "florence-finance": {"expected": 0, "rationale": "Long-tail seed"},
}
