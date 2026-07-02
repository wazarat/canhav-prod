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
    # Editorial (M1 General-Data) kwargs — threaded through to build_entity_item.
    components: Optional[List[Dict[str, str]]] = None,
    faq: Optional[List[Dict[str, Any]]] = None,
    org_structure: Optional[List[Dict[str, str]]] = None,
    tradfi_comparison: Optional[List[Dict[str, str]]] = None,
    risks: Optional[List[Dict[str, str]]] = None,
    typed_risks: Optional[List[Dict[str, str]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    timeline: Optional[List[Dict[str, Any]]] = None,
    offchain_facts: Optional[List[Dict[str, Any]]] = None,
    investment_rounds: Optional[List[Dict[str, Any]]] = None,
    partnerships: Optional[List[Dict[str, Any]]] = None,
    competitors: Optional[List[Dict[str, Any]]] = None,
    sources: Optional[List[Dict[str, Any]]] = None,
    audits: Optional[List[Dict[str, Any]]] = None,
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
        "components": components or [],
        "faq": faq or [],
        "org_structure": org_structure or [],
        "tradfi_comparison": tradfi_comparison or [],
        "risks": risks or [],
        "typed_risks": typed_risks,
        "events": events or [],
        "timeline": timeline,
        "offchain_facts": offchain_facts,
        # Top-level provenance: SourceRef[] backing editorial claims, and audit
        # refs ({firm, date, url}) surfaced on the Risks tab. Consumed by
        # build_entity_item via spec.get("sources") / spec.get("audits").
        "sources": sources or [],
        "audits": audits,
        "investment_rounds": investment_rounds or [],
        "partnerships": partnerships or [],
        "current_scale": _empty_scale(),
        "scale_labels": scale_labels or {"tvl": "Protocol TVL"},
        "sub_category": "Protocol",
        "sector": "Other",
        "sub_sector": other_sub_sector,
        "other_sub_sector": other_sub_sector,
        "other_secondary_tags": other_secondary_tags,
        "other": other,
        "tags": [],
        "competitors": competitors or [],
        "member_coins": member_coins or [],
        "portal_defaults": _portal_defaults(chains),
    }


OTHER_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # --------------------------- UNDERWRITING ---------------------------------
    "nexus-mutual": _net(
        components=[
            {
                'name': 'Capital Pool',
                'description': 'A shared, member-owned pool of crypto assets (ETH, DAI, stETH and other tokens) that backs the NXM token, underwrites all active cover, and is the reserve from which valid claims are paid. Its size relative to the Minimum Capital Requirement (MCR) determines how much cover the mutual can sell.',
            },
            {
                'name': 'Cover Products',
                'description': 'On-chain cover policies members purchase to protect DeFi positions. The mutual offers 100+ products spanning protocol/smart-contract cover, yield-token cover, custody (centralized exchange) cover, slashing and other crypto-native and real-world risks. Premiums are paid in ETH or DAI and priced by the underwriting staking pools.',
            },
            {
                'name': 'Staking Pools (V2)',
                'description': 'Introduced in V2, staking pools let expert managers deposit and manage NXM as underwriting capital, choose which cover products to open capacity for, and set risk-based pricing. Passive members can delegate NXM to a pool and earn NXM rewards as cover is sold from it.',
            },
            {
                'name': 'RAMM (Ratcheting AMM)',
                'description': "A two-pool automated market maker sitting on top of the Capital Pool that lets members mint NXM (contributing ETH in the 'above' pool) or redeem NXM for ETH (burning it in the 'below' pool). A ratchet mechanism nudges the price toward Book Value during inactive periods. It replaced the original bonding-curve mint/burn model in the V2 tokenomics upgrade.",
            },
            {
                'name': 'Claims Assessment',
                'description': 'The member-governed process for adjudicating claims. Members stake NXM to vote on whether a submitted claim meets the cover wording; approved claims are paid from the Capital Pool. Claims can be submitted after a waiting period following a loss event and within a defined window after cover expiry.',
            },
        ],
        faq=[
            {
                'question': 'What does Nexus Mutual actually cover?',
                'answer': 'It sells discretionary cover products against crypto risks: smart-contract/protocol failure, yield-token de-pegs, custody (centralized-exchange) failure, slashing and other risks. Cover is bought per-product for a chosen amount and duration, with premiums paid in ETH or DAI.',
                'pinned': True,
            },
            {
                'question': "Is it 'real' insurance?",
                'answer': 'No. Nexus Mutual is a discretionary mutual, not a regulated insurer. Payouts are decided by members through on-chain claims assessment against the cover wording rather than being legally guaranteed contracts of insurance.',
                'pinned': False,
            },
            {
                'question': 'What is the NXM token and can I buy it on an exchange?',
                'answer': "NXM is the membership and capital token. Native NXM is restricted to KYC'd members and can only be minted or redeemed against the Capital Pool via the RAMM. A wrapped version, wNXM, trades freely on secondary markets without membership.",
                'pinned': False,
            },
            {
                'question': 'How are claims paid and how long does it take?',
                'answer': 'Valid claims are paid from the member-owned Capital Pool after members stake NXM and vote to approve them under the cover wording. Historically, valid claim payouts have typically settled within a few days of assessment.',
                'pinned': False,
            },
            {
                'question': 'How do I earn as a staker?',
                'answer': 'Members deposit NXM into staking pools that underwrite specific cover products. As cover is sold from a pool, stakers earn NXM rewards; in return their staked capital is at risk of being burned to pay approved claims on the products they underwrite.',
            },
        ],
        org_structure=[
            {
                'name': 'Nexus Mutual (DAO)',
                'role': 'Member-owned mutual / DAO',
                'description': 'NXM token holders collectively own the Capital Pool and all surplus generated from cover sales, and govern the protocol (pricing, products, parameters, claims) through on-chain voting.',
            },
            {
                'name': 'Nexus Mutual Ltd (UK legal wrapper)',
                'role': 'Discretionary mutual legal entity',
                'description': 'A UK-registered discretionary mutual that wraps the DAO. It has a Board with deliberately limited powers; members can replace Board members at any time. Founded by Hugh Karp, who launched the protocol on Ethereum mainnet in 2019.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Mutual insurance company / P&O-style mutual',
                'similarity': 'Like a traditional mutual insurer, the members are the owners: they pool capital, share risk, keep any underwriting surplus, and collectively decide on claims rather than paying a shareholder-owned carrier.',
                'differences': 'Cover is discretionary (payouts voted by members under cover wording, not a legally binding insurance contract), it is unregulated as insurance, capital is on-chain crypto, and underwriting/claims are executed by smart contracts and token-holder governance.',
            },
            {
                'product': "Lloyd's-style syndicated underwriting",
                'similarity': "V2 staking pools resemble Lloyd's syndicates: specialist underwriters bring capital, pick which risks to back, and price them, while passive capital providers can back the underwriters.",
                'differences': 'Anyone can spin up a staking pool permissionlessly, capital is NXM staked on-chain, and there is no regulated managing-agent structure or legally binding policy.',
            },
        ],
        events=[
            {
                'date': '2019-05-01',
                'title': 'Nexus Mutual launches on Ethereum mainnet',
                'description': 'The mutual goes live on Ethereum, offering smart-contract cover backed by a member-owned Capital Pool and NXM token. (Day set to 1st; only month is publicly sourced.)',
                'link': 'https://nexusmutual.io/blog/celebrating-six-years-of-covering-crypto-at-nexus-mutual',
            },
            {
                'date': '2020-02-20',
                'title': 'First-ever claim payout (bZx exploit)',
                'description': 'Following the February 2020 bZx exploit, Nexus Mutual paid its first successful claims to bZx cover holders, validating the claims-assessment model.',
                'link': 'https://docs.nexusmutual.io/overview/claims-history/bzx-2020/',
            },
            {
                'date': '2020-12-14',
                'title': "Founder's personal wallet phished for ~$8M NXM",
                'description': "Founder Hugh Karp's personal wallet was drained of ~370,000 NXM (~$8M+) via a spoofed MetaMask transaction after his machine was compromised. The Nexus Mutual protocol and other members' funds were unaffected.",
                'link': 'https://cointelegraph.com/news/founder-of-defi-protocol-nexus-mutual-gets-hacked-for-8m',
            },
            {
                'date': '2021-02-04',
                'title': 'Yearn yDAI hack claims paid (~$2.4M)',
                'description': 'After the 4 Feb 2021 Yearn Finance yDAI vault exploit, members assessed 17 claims (14 accepted, 3 denied) and paid out $2,410,499.26 (1,351 ETH + 129,660 DAI) to cover holders.',
                'link': 'https://medium.com/nexus-mutual/paying-claims-for-the-yearn-hack-693bcfc5cd57',
            },
            {
                'date': '2023-03-15',
                'title': 'Nexus Mutual V2 goes live',
                'description': 'V2 re-architected the protocol into a risk-management layer with permissionless staking pools, richer cover products, and updated tokenomics (RAMM), enabling experts to launch pools and price risk.',
                'link': 'https://nexusmutual.io/blog/nexus-mutual-v2-live-on-ethereum-mainnet',
            },
        ],
        timeline=[
            {
                'date': '2019-05-01',
                'title': 'Mainnet launch (V1)',
                'description': 'Smart Contract Cover launches with the bonding-curve NXM model and member-based claims assessment. (Day set to 1st; only month sourced.)',
                'link': 'https://nexusmutual.io/blog/celebrating-six-years-of-covering-crypto-at-nexus-mutual',
                'status': 'executed',
            },
            {
                'date': '2020-06-01',
                'title': 'Pooled Staking',
                'description': 'Introduction of pooled staking, letting members stake NXM across contracts to earn rewards and back underwriting. (Day set to 1st; audited June 2020.)',
                'link': 'https://medium.com/nexus-mutual/pooled-staking-is-here-b201d10264e5',
                'status': 'executed',
            },
            {
                'date': '2023-03-15',
                'title': 'V2: staking pools, new products, RAMM tokenomics',
                'description': 'Major upgrade turning the mutual into a risk infrastructure layer with permissionless staking pools and the Ratcheting AMM replacing the original bonding curve.',
                'link': 'https://nexusmutual.io/blog/nexus-mutual-v2-live-on-ethereum-mainnet',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Mainnet launch',
                'value': 'Launched on Ethereum mainnet in May 2019',
                'freshness': 'static',
                'source': {
                    'label': 'Nexus Mutual blog - Six Years of Covering Crypto',
                    'url': 'https://nexusmutual.io/blog/celebrating-six-years-of-covering-crypto-at-nexus-mutual',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Yearn hack payout',
                'value': '$2,410,499.26 (1,351 ETH + 129,660 DAI) paid across 14 accepted claims for the Feb 2021 Yearn yDAI hack',
                'freshness': 'static',
                'source': {
                    'label': 'Nexus Mutual - Paying claims for the Yearn hack',
                    'url': 'https://medium.com/nexus-mutual/paying-claims-for-the-yearn-hack-693bcfc5cd57',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'V2 launch date',
                'value': 'Nexus Mutual V2 went live on Ethereum mainnet on 2023-03-15',
                'freshness': 'static',
                'source': {
                    'label': 'Nexus Mutual blog - V2 Live on Ethereum Mainnet',
                    'url': 'https://nexusmutual.io/blog/nexus-mutual-v2-live-on-ethereum-mainnet',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Reserve / Depeg',
                'description': 'The mutual can only pay claims up to what the Capital Pool holds. A cluster of large correlated losses, or a sharp fall in the value of pool assets (ETH/stETH), can push capital below the Minimum Capital Requirement, forcing the mutual to stop selling cover and impairing its ability to honor outstanding cover.',
            },
            {
                'category': 'Governance',
                'description': 'Cover payouts are discretionary and decided by NXM-staked members via claims assessment. Voter apathy, whale concentration, or a member majority acting in self-interest could wrongly reject valid claims (leaving policyholders unpaid) or approve invalid ones (draining the pool).',
            },
            {
                'category': 'Smart Contract',
                'description': 'The Capital Pool, RAMM, staking-pool and cover contracts hold and move all member capital on-chain. A bug or exploit in this stack could drain reserves directly, the same failure mode the mutual exists to insure against, making it its own single point of failure.',
            },
            {
                'category': 'Counterparty',
                'description': "V2 delegates underwriting to permissionless staking-pool managers who choose which products to back and how to price them. Mispriced or over-concentrated pools can leave the mutual under-reserved for a given risk, and delegators bear burn risk from a manager's poor underwriting.",
            },
            {
                'category': 'Regulatory',
                'description': 'Nexus Mutual operates as an unregulated UK discretionary mutual, not a licensed insurer, and NXM membership is KYC-gated with native NXM non-transferable. Regulatory reclassification of its cover as insurance, or of NXM/wNXM as a security, could restrict operations or market access.',
            },
        ],
        competitors=[
            {
                'name': 'InsurAce',
                'slug': 'insurace',
                'rank': 1,
                'positioning': 'Multi-chain DeFi cover protocol with portfolio-based, capital-efficient underwriting.',
                'similarities': 'Also sells smart-contract and protocol cover to DeFi users and competes for on-chain underwriting capital.',
                'differences': 'Explicitly multi-chain and uses shareholder/portfolio-based underwriting rather than a single member-owned discretionary mutual; premiums and claims model differ.',
            },
            {
                'name': 'Neptune Mutual',
                'slug': 'neptune-mutual',
                'rank': 2,
                'positioning': 'Parametric crypto cover marketplace with dedicated cover pools.',
                'similarities': 'Provides cover against DeFi/exchange incidents and is frequently grouped with Nexus Mutual among leading on-chain cover providers.',
                'differences': 'Uses parametric triggers and incident-resolution rather than member-voted discretionary claims assessment, aiming for faster, rules-based payouts.',
            },
            {
                'name': 'Sherlock',
                'slug': 'sherlock',
                'rank': 3,
                'positioning': 'Hybrid audit-plus-coverage protocol backing the protocols it audits.',
                'similarities': 'Offers smart-contract exploit coverage funded by staked capital and competes for the same protocol customers.',
                'differences': 'Bundles security auditing with coverage and underwrites via staked USDC backers and internal claims committees rather than a broad member mutual.',
            },
            {
                'name': 'Ease (ease.org)',
                'slug': 'ease-org',
                'rank': 4,
                'positioning': "'Uninsurance' model that removes claim filing via risk-adjusted, shared-loss vaults.",
                'similarities': 'Targets the same DeFi smart-contract risk-protection market as Nexus Mutual.',
                'differences': 'No premiums or claims process; losses are socialized across a shared vault of risk-adjusted deposits instead of being paid from a premium-funded mutual pool.',
            },
        ],
        investment_rounds=[
            {
                'date': '2018-04-04',
                'round': 'Seed',
                'amountUsd': 259000,
                'amountLabel': '~$259K',
                'investors': [
                    'KR1',
                    'Blockchain Coinvestors',
                ],
                'link': 'https://www.crunchbase.com/funding_round/nexus-mutual-seed--4e7b0a29',
            },
        ],
        audits=[
            {
                'firm': 'Solidified',
                'date': '2019-04-22',
                'url': 'https://github.com/solidified-platform/audits/blob/master/Audit%20Report%20-%20Nexus%20Mutual%20%5B22.04.2019%5D.pdf',
            },
            {
                'firm': 'G0 Group',
                'date': '2020-06-01',
                'url': 'https://github.com/g0-group/Audits/blob/master/G0Group-NexusMutual2020Jun.pdf',
            },
            {
                'firm': 'iosiro',
                'date': '2023-03-01',
                'url': 'https://gist.github.com/iosiro-security/9ab387c0f43fddfc50e3a66802d2f4f7',
            },
            {
                'firm': 'iosiro',
                'date': '2023-10-01',
                'url': 'https://iosiro.com/audits/nexus-mutual-tokenomics-smart-contract-audit',
            },
            {
                'firm': 'Chaos Labs',
                'date': '2023-10-01',
                'url': 'https://chaoslabs.xyz/resources/chaos_labs_nexus_mutual_pt_1.pdf',
            },
            {
                'firm': 'iosiro',
                'date': '2025-03-01',
                'url': 'https://iosiro.com/audits/nexus-mutual-cover-edit-limit-orders-and-staking-pool-fix-smart-contract-audit',
            },
        ],
        sources=[
            {
                'label': 'Nexus Mutual Documentation - Capital Pool',
                'url': 'https://docs.nexusmutual.io/protocol/capital-pool/',
            },
            {
                'label': 'Nexus Mutual Documentation - Token Model (RAMM)',
                'url': 'https://docs.nexusmutual.io/protocol/nxm-token/token-model/',
            },
            {
                'label': 'Nexus Mutual Documentation - Audits and Security',
                'url': 'https://docs.nexusmutual.io/resources/audits-and-security/',
            },
            {
                'label': 'Nexus Mutual blog - V2 Live on Ethereum Mainnet',
                'url': 'https://nexusmutual.io/blog/nexus-mutual-v2-live-on-ethereum-mainnet',
            },
            {
                'label': 'Nexus Mutual - Paying claims for the Yearn hack',
                'url': 'https://medium.com/nexus-mutual/paying-claims-for-the-yearn-hack-693bcfc5cd57',
            },
            {
                'label': 'Nexus Mutual Documentation - bZx hack claims history',
                'url': 'https://docs.nexusmutual.io/overview/claims-history/bzx-2020/',
            },
            {
                'label': 'Crunchbase - Nexus Mutual seed round',
                'url': 'https://www.crunchbase.com/funding_round/nexus-mutual-seed--4e7b0a29',
            },
        ],
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
        components=[
            {
                'name': 'Audit Cover / Sherlock Shield',
                'description': "Financial coverage that reimburses protocols for losses from smart-contract exploits that should have been caught during a Sherlock audit. Historically offered up to $10M per protocol under the V2 staking model; the current Sherlock Shield product sits on top of audited code post-launch with limits up to $500,000 and is explicitly described as 'not insurance', with payouts governed by written program terms and claims processes.",
            },
            {
                'name': 'USDC Staking Pool (V2, first-loss capital)',
                'description': 'A single Ethereum-based underwriting pool where stakers locked USDC to backstop coverage payouts. Stakers earned cover-purchase fees, yield-strategy returns and SHER token incentives, but bore first-loss risk: staked capital could be liquidated to pay valid exploit claims.',
            },
            {
                'name': 'Audit Contests',
                'description': "Large-scale adversarial competitions where thousands of registered security researchers compete to find vulnerabilities in a protocol's codebase for a prize pool, with severity-based scoring.",
            },
            {
                'name': 'Collaborative Audits',
                'description': 'Private, staffed security reviews led by top-ranked researchers, offered as a pre-launch complement or alternative to open contests.',
            },
            {
                'name': 'Bug Bounties',
                'description': 'Ongoing post-launch incentive programs for live protocols, including record-size bounties (e.g. a $16M program for Usual).',
            },
            {
                'name': 'Sherlock AI',
                'description': 'AI-driven automated code-analysis tool (beta launched September 2025) that scans smart-contract code during development to surface vulnerabilities earlier in the lifecycle.',
            },
            {
                'name': 'Claims Assessment (SPCC + UMA)',
                'description': "Two-stage claims process: the Sherlock Protocol Claims Committee (core team + security advisors) votes within ~7 days; denied claims can be escalated to UMA's Optimistic Oracle for arbitration for a fixed fee.",
            },
            {
                'name': 'SHER Token',
                'description': 'Native protocol token used for staking rewards and researcher incentives. Note: SHER was never launched as a liquid, publicly traded token; the planned large public token round did not result in a live token.',
            },
        ],
        faq=[
            {
                'question': 'Does Sherlock have a live, tradeable token?',
                'answer': 'No. Sherlock has a native SHER token used inside the protocol for staking rewards and researcher incentives, but it was never launched as a liquid, publicly traded token. A planned $100M-target public token sale (2022) did not result in a live market token.',
                'pinned': True,
            },
            {
                'question': "What did Sherlock's coverage actually protect against?",
                'answer': 'Audit Cover reimbursed protocols for losses caused by technical faults in smart-contract code that should have been detected during a Sherlock audit, up to $10M per protocol under the V2 model. It was not general-purpose insurance and covered a defined scope of audited contracts.',
                'pinned': False,
            },
            {
                'question': 'Who provided the capital that backed coverage payouts?',
                'answer': 'USDC stakers deposited into a single Ethereum underwriting pool and took first-loss risk. In exchange they earned cover-purchase fees, yield-strategy returns and SHER incentives; their staked capital could be liquidated to fund valid claims.',
                'pinned': False,
            },
            {
                'question': 'Did Sherlock ever pay out a real claim?',
                'answer': 'Yes. After the March 2023 Euler Finance exploit, Sherlock paid out $4.5M to cover an affected protocol, which severely depleted its reserves.',
                'pinned': False,
            },
            {
                'question': "Is the staking/coverage model still Sherlock's main business?",
                'answer': "No. After its reserves collapsed ~90% in 2022-2023 (driven by a Maple/Orthogonal default and the Euler payout), Sherlock pivoted to a security-services company: audit contests, collaborative audits, bug bounties, an AI auditor, and a scaled-down 'Sherlock Shield' coverage product with much lower limits.",
                'pinned': False,
            },
            {
                'question': 'How are coverage claims decided?',
                'answer': "The Sherlock Protocol Claims Committee votes first; if a claim is denied, the claimant can escalate to UMA's Optimistic Oracle for third-party arbitration.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Sherlock (Spearbit-adjacent / Sherlock Inc.)',
                'role': 'Company / core team',
                'description': 'US-based venture-funded company that builds and operates the Sherlock security platform and coverage protocol. Co-founded by Jack Sanford (co-founder, frequently quoted on the coverage model and the 2023 reserves crisis).',
            },
            {
                'name': 'Sherlock Protocol Claims Committee (SPCC)',
                'role': 'Claims governance body',
                'description': 'Committee of core team members and security advisors that reviews and votes on coverage claims within roughly 7 days before any escalation to UMA arbitration.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Warranty / audit-linked professional-liability cover',
                'similarity': "Like a warranty on professional work, Sherlock's Audit Cover pays out when the audited 'product' (smart-contract code) fails due to a defect the audit should have caught, aligning the auditor's incentives with the client's outcome.",
                'differences': "Cover is funded on-chain by USDC stakers taking first-loss risk rather than by a regulated insurer's balance sheet; claims are decided by a protocol committee plus UMA's Optimistic Oracle rather than courts or regulators; limits are modest and the product is explicitly 'not insurance'.",
            },
            {
                'product': 'Surety bond',
                'similarity': "A third party (the staking pool) posts capital that can be drawn on if the covered party's code fails, similar to how a surety guarantees performance and pays the obligee on default.",
                'differences': "There is no legal recourse against a principal to recover paid claims; the 'surety' capital is crowdsourced from anonymous USDC stakers earning yield, and pricing is tied to audit quality scores rather than credit underwriting.",
            },
        ],
        events=[
            {
                'date': '2023-03-01',
                'title': 'Sherlock pays out $4.5M for the Euler Finance exploit',
                'description': "Following Euler Finance's ~$200M exploit in March 2023, Sherlock paid $4.5M in coverage, which severely depleted its reserves.",
                'link': 'https://www.dlnews.com/articles/defi/sherlock-defi-insurer-on-edge-euler-hack/',
            },
            {
                'date': '2023-04-14',
                'title': "Sherlock's reserves fall ~90%, coverage model 'on edge'",
                'description': "DL News reported Sherlock's reserves collapsed roughly 90% over a year to ~$2.9M after the Maple/Orthogonal default (~$4M loss) and the Euler payout, while it still had $16.5M of coverage outstanding across ~a dozen protocols. Co-founder Jack Sanford said Sherlock 'will not survive if depositors can't be attracted.'",
                'link': 'https://www.dlnews.com/articles/defi/sherlock-defi-insurer-on-edge-euler-hack/',
            },
            {
                'date': '2025-04-02',
                'title': 'Usual + Sherlock launch $16M bug bounty',
                'description': "Sherlock hosted a $16M bug bounty for Usual's codebase, billed as one of the largest bounty prizes in tech history, marking Sherlock's shift toward large-scale security services.",
                'link': 'https://www.theblock.co/post/349204/usual-sherlock-crypto-bug-bounty-16-million-usd-critical-vulnerability',
            },
            {
                'date': '2025-09-16',
                'title': 'Sherlock runs $2M Ethereum Fusaka upgrade audit contest',
                'description': 'Sherlock partnered with the Ethereum Foundation on a $2M audit competition for the Fusaka hardfork, with sponsor contributions from Gnosis ($100k) and Lido ($25k).',
                'link': 'https://www.theblock.co/press-releases/370865/sherlock-kicks-off-2m-ethereum-fusaka-upgrade-audit-contest',
            },
        ],
        timeline=[
            {
                'date': '2021-06-03',
                'title': 'Pre-seed round ($1.5M)',
                'description': 'Sherlock raised $1.5M pre-seed led by IDEO CoLab Ventures to build its audit-backed coverage model.',
                'link': 'https://www.coindesk.com/business/2021/06/03/defi-risk-assessor-sherlock-raises-15m-in-pre-seed-funding',
                'status': 'executed',
            },
            {
                'date': '2022-03-07',
                'title': 'Public token sale opens (SHER, $100M target)',
                'description': 'Sherlock opened a first-come public USDC round targeting $100M, with 90% directed to the staking pool and SHER rewards (1 SHER per 10 USDC staked after six months). A liquid SHER token did not ultimately materialize.',
                'link': 'https://www.theblock.co/post/136200/defi-security-provider-sherlock-aims-to-raise-100-million-in-token-round',
                'status': 'executed',
            },
            {
                'date': '2022-09-14',
                'title': 'Seed round ($4M) led by Archetype',
                'description': 'Sherlock raised $4M seed led by Archetype (Spartan, Lattice, CoinFund participating) to scale the coverage and staking model offering ~10% USDC + 5% SHER yield.',
                'link': 'https://www.coindesk.com/business/2022/09/14/crypto-auditing-platform-sherlock-raises-4m-in-funding',
                'status': 'executed',
            },
            {
                'date': '2025-09-01',
                'title': 'Sherlock AI beta launch',
                'description': 'Sherlock launched an AI-driven smart-contract security tool in beta (September 2025) as part of its pivot to a full-lifecycle security platform.',
                'link': 'https://www.ainvest.com/news/ai-driven-smart-contract-security-sherlock-beta-launch-future-defi-infrastructure-2509/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Euler exploit coverage payout',
                'value': '$4.5M paid out after the March 2023 Euler Finance exploit',
                'freshness': 'static',
                'source': {
                    'label': 'DL News',
                    'url': 'https://www.dlnews.com/articles/defi/sherlock-defi-insurer-on-edge-euler-hack/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Reserves collapse',
                'value': 'Reserves fell ~90% over one year to ~$2.9M by April 2023, against $16.5M coverage outstanding',
                'freshness': 'static',
                'source': {
                    'label': 'DL News',
                    'url': 'https://www.dlnews.com/articles/defi/sherlock-defi-insurer-on-edge-euler-hack/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Coverage economics mismatch',
                'value': 'Charged protocols ~3%/yr for cover while paying stakers ~19%/yr, implying an expected claim only ~every 33 years per protocol',
                'freshness': 'static',
                'source': {
                    'label': 'DL News',
                    'url': 'https://www.dlnews.com/articles/defi/sherlock-defi-insurer-on-edge-euler-hack/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'The entire coverage product is exposed to smart-contract exploit risk: valid claims (e.g. the $4.5M Euler payout) draw directly from the USDC staking pool, and the underwriting contracts themselves are attack surface.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'The coverage pool was severely undercapitalized relative to outstanding exposure: reserves fell ~90% to ~$2.9M while $16.5M of cover was live, meaning a single large claim could exhaust reserves and leave cover unpaid.',
            },
            {
                'category': 'Counterparty',
                'description': 'Sherlock deposited staker USDC into external yield venues (Maple Finance) and lost ~$4M when borrower Orthogonal Trading defaulted after FTX exposure, showing coverage capital was exposed to third-party credit/counterparty default.',
            },
            {
                'category': 'Governance',
                'description': "Claim outcomes depend on the Sherlock Protocol Claims Committee (core team + advisors) with escalation only to UMA's Optimistic Oracle; claimants face discretionary, centralized first-pass decisions and a fee to escalate.",
            },
            {
                'category': 'Systemic',
                'description': 'Coverage mispricing (protocols charged far less than the loss frequency warranted) plus stakers rushing to withdraw during the 2023 crisis created a run-risk that threatened the viability of the whole coverage model, ultimately forcing a pivot away from staker-funded cover.',
            },
        ],
        competitors=[
            {
                'name': 'Nexus Mutual',
                'slug': 'nexus-mutual',
                'rank': 1,
                'positioning': 'Largest crypto-native cover protocol; discretionary mutual where members stake NXM to underwrite risk.',
                'similarities': 'Both provide on-chain smart-contract exploit cover backed by a single underwriting capital pool and both use a claims-assessment process before paying out.',
                'differences': 'Nexus is a member-owned mutual with a live NXM token and community-vote claims; Sherlock tied cover pricing to audit quality scores, used a USDC first-loss staking pool, and settled disputed claims via UMA arbitration rather than member voting. Sherlock has since de-emphasized cover in favor of audits.',
            },
            {
                'name': 'InsurAce',
                'slug': 'insurace',
                'rank': 2,
                'positioning': 'Multi-chain DeFi cover marketplace offering portfolio-style protection.',
                'similarities': 'Both underwrite smart-contract failure risk with a capital pool funding claims and both charge protocols/users premiums for defined cover.',
                'differences': 'InsurAce is a broad cover marketplace across many protocols and chains; Sherlock uniquely bundled cover with its own audits and priced it off audit outcomes, and its capital came from first-loss USDC stakers.',
            },
            {
                'name': 'Nexus Mutual / Neptune Mutual',
                'slug': 'neptune-mutual',
                'rank': 3,
                'positioning': 'Parametric cover marketplace with dedicated cover pools and a marketplace model.',
                'similarities': 'Both offer smart-contract-focused cover backed by staked/pooled capital that pays valid claims.',
                'differences': "Neptune uses a parametric/marketplace incident model with community reporting; Sherlock's cover was directly linked to its own audit engagements and adjudicated by its claims committee plus UMA.",
            },
            {
                'name': 'Ease (formerly Armor/Nexus Yields)',
                'slug': 'ease-org',
                'rank': 4,
                'positioning': 'Uninsurance / coverage-as-a-service protocol using a shared uninsurance pool.',
                'similarities': 'Both provide DeFi exploit protection and rely on a shared capital pool rather than per-user premiums in the traditional sense.',
                'differences': "Ease uses a no-premium 'uninsurance' vault model where losses are socialized; Sherlock charged explicit premiums, tied cover to audits, and paid stakers yield for first-loss risk.",
            },
        ],
        partnerships=[
            {
                'name': 'Ethereum Foundation',
                'date': '2025-09-16',
                'amountLabel': '$2M prize pool',
                'description': 'Sherlock partnered with the Ethereum Foundation to run a $2M audit contest for the Fusaka network upgrade, with additional sponsorship from Gnosis ($100k) and Lido ($25k).',
            },
            {
                'name': 'Usual',
                'date': '2025-04-02',
                'amountLabel': '$16M bug bounty',
                'description': "Sherlock hosted a $16M bug bounty program for Usual's codebase, described as one of the largest bounty prizes in tech history.",
            },
        ],
        investment_rounds=[
            {
                'date': '2021-06-03',
                'round': 'Pre-Seed',
                'amountUsd': 1500000,
                'amountLabel': '$1.5M',
                'investors': [
                    'IDEO CoLab Ventures',
                    'A.Capital',
                    'Scalar Capital',
                    'DeFi Alliance',
                    'Kain Warwick',
                    'Hart Lambur',
                    'Sidney Powell',
                ],
                'link': 'https://www.coindesk.com/business/2021/06/03/defi-risk-assessor-sherlock-raises-15m-in-pre-seed-funding',
            },
            {
                'date': '2022-09-14',
                'round': 'Seed',
                'amountUsd': 4000000,
                'amountLabel': '$4M',
                'investors': [
                    'Archetype',
                    'Spartan',
                    'Lattice',
                    'CoinFund',
                ],
                'link': 'https://www.coindesk.com/business/2022/09/14/crypto-auditing-platform-sherlock-raises-4m-in-funding',
            },
        ],
        sources=[
            {
                'label': 'CoinDesk - Sherlock pre-seed $1.5M (2021)',
                'url': 'https://www.coindesk.com/business/2021/06/03/defi-risk-assessor-sherlock-raises-15m-in-pre-seed-funding',
            },
            {
                'label': 'CoinDesk - Sherlock seed $4M (2022)',
                'url': 'https://www.coindesk.com/business/2022/09/14/crypto-auditing-platform-sherlock-raises-4m-in-funding',
            },
            {
                'label': 'The Block - Sherlock $100M SHER token round (2022)',
                'url': 'https://www.theblock.co/post/136200/defi-security-provider-sherlock-aims-to-raise-100-million-in-token-round',
            },
            {
                'label': 'DL News - Sherlock reserves fall 90% after Euler hack (2023)',
                'url': 'https://www.dlnews.com/articles/defi/sherlock-defi-insurer-on-edge-euler-hack/',
            },
            {
                'label': 'OpenCover - Sherlock (SHER) DeFi cover mechanics',
                'url': 'https://opencover.com/sherlock/',
            },
            {
                'label': 'The Block - Usual + Sherlock $16M bug bounty (2025)',
                'url': 'https://www.theblock.co/post/349204/usual-sherlock-crypto-bug-bounty-16-million-usd-critical-vulnerability',
            },
            {
                'label': 'The Block - Sherlock $2M Ethereum Fusaka audit contest (2025)',
                'url': 'https://www.theblock.co/press-releases/370865/sherlock-kicks-off-2m-ethereum-fusaka-upgrade-audit-contest',
            },
            {
                'label': 'Sherlock Shield product page',
                'url': 'https://sherlock.xyz/sherlock-shield',
            },
        ],
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
        components=[
            {
                'name': 'Cover Arm (Insurance Pools)',
                'description': 'The underwriting side of the protocol. Capital providers stake assets into underwriting/mining pools that act as liquidity reserves backing cover payouts. Coverage capacity is governed by a Solvency Capital Requirement (SCR) ratio; when pooled capital is insufficient to meet the SCR, INSUR mining rewards for the Cover Arm increase to attract more capital.',
            },
            {
                'name': 'Investment Arm',
                'description': "An investment module that deploys idle capital-pool funds into yield-bearing DeFi strategies. Investment yield is fed back to insurers and insurees as an incentive, which is how InsurAce subsidizes its 'ultra-low' premiums relative to pure mutual models.",
            },
            {
                'name': 'Cover Products',
                'description': 'Actuary-priced cover products across smart-contract/protocol risk, stablecoin de-peg risk, and custodian (CEX) risk. InsurAce was the first to offer cross-chain, portfolio-based covers, letting users insure multiple assets/protocols across chains in a single cover to save on premium and gas.',
            },
            {
                'name': 'Decentralized Claims Assessment',
                'description': 'Claims are filed on-chain and adjudicated by a community of Claims Assessors who hold and stake INSUR, combined with an advisory board / expert review. Approved claims are paid from the capital pools; this process handled the May 2022 UST de-peg claims.',
            },
            {
                'name': 'INSUR Governance Token',
                'description': 'Standard ERC-20 governance and incentive token (deployed on Ethereum, with bridged versions e.g. on Polygon). Used for community governance and claim-assessment voting, mining incentives for capital provision, and ecosystem rewards.',
            },
        ],
        faq=[
            {
                'question': 'What is InsurAce?',
                'answer': 'InsurAce is a decentralized, multi-chain DeFi insurance (cover) protocol launched on Ethereum mainnet in April 2021. It lets users buy cover against smart-contract exploits, stablecoin de-pegs, and custodian (CEX) failures, and lets capital providers underwrite that risk in exchange for INSUR rewards. Its distinguishing feature was cross-chain, portfolio-based covers and a two-arm design where an investment arm generates yield to subsidize low premiums.',
                'pinned': True,
            },
            {
                'question': 'Did InsurAce actually pay claims after the Terra/UST collapse?',
                'answer': 'Yes. After UST de-pegged in May 2022, InsurAce ran a fast-tracked claims process and its community Claims Assessors approved 155 UST de-peg claims (rejecting 18), paying out roughly $11.7 million against only about $94,000 in premiums collected on those covers. It remains one of the largest real payouts by a DeFi cover protocol.',
                'pinned': True,
            },
            {
                'question': 'Is InsurAce still operating?',
                'answer': 'InsurAce appears to be effectively wound down or dormant as of 2026. The primary insurace.io domain now resolves to a domain-for-sale parking page, the public GitHub org shows almost no activity after 2023-2024, HTX delisted the INSUR token in February 2025 for insufficient volume, and third-party tracker OpenCover paused data collection on InsurAce in May 2025. Treat the protocol as inactive; independently verify before relying on any cover.',
                'pinned': False,
            },
            {
                'question': 'How does InsurAce keep premiums low?',
                'answer': 'It uses an actuary-based pricing model plus a two-arm structure: idle capital in the cover pools is deployed by an investment arm into yield strategies, and that yield is returned to insurers/insurees. It also pioneered portfolio-based covers, bundling multiple protocols/assets into one cover to cut per-item premium and gas costs.',
                'pinned': False,
            },
            {
                'question': "How were InsurAce's smart contracts audited?",
                'answer': "InsurAce was audited by SlowMist (early 2021, ahead of its April 2021 mainnet launch) and by PeckShield (concluded July 12, 2021, rated 'Low Risk'). SlowMist's review flagged higher-severity issues, including a reordering-attack risk and a missing permission check on an owner-adding function, which the team reported fixing before launch.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Oliver Xie',
                'role': 'Founder & CEO',
                'description': 'Created InsurAce in 2020; the protocol is headquartered in Singapore. Public-facing founder who has represented InsurAce in interviews on DeFi insurance and smart-contract risk.',
            },
            {
                'name': 'Dan Thomson',
                'role': 'Chief Marketing Officer (CMO)',
                'description': "Public spokesperson; provided the official statements on InsurAce's rapid UST de-peg claims response in 2022.",
            },
            {
                'name': 'INSUR Governance / Claims Assessors',
                'role': 'DAO governance and claims adjudication',
                'description': 'InsurAce operates as a DAO governed by INSUR holders. A community of Claims Assessors who stake INSUR votes on the validity of claims (as used for the 155 UST de-peg claims), supported by an advisory board / expert review.',
            },
        ],
        tradfi_comparison=[
            {
                'product': "Specialty / parametric insurance underwriter (e.g. a Lloyd's-style syndicate)",
                'similarity': 'Pools capital from providers to underwrite defined risks (contract failure, de-peg, custodial loss), charges risk-priced premiums, and pays out on validated claims.',
                'differences': "Underwriting capital comes from permissionless DeFi liquidity providers rather than licensed insurers/reinsurers; policies are on-chain 'covers' rather than legal insurance contracts; claims are adjudicated by token-holder voting instead of licensed adjusters/regulators; and there is no regulator-backed policyholder protection or capital-adequacy mandate.",
            },
            {
                'product': 'Mutual insurance company',
                'similarity': 'Risk is shared among members via a mutual/pooled model rather than sold to external shareholders, and members participate in governance and claim decisions.',
                'differences': 'InsurAce layers an investment arm that deploys pool capital into DeFi yield to subsidize premiums, uses a governance token (INSUR) for voting and incentives, and offers cross-chain portfolio covers — none of which exist in a traditional mutual, which is regulated and holds statutory reserves.',
            },
        ],
        events=[
            {
                'date': '2022-08-23',
                'title': 'InsurAce reports ~$11.7M in UST de-peg payouts to 155 claimants',
                'description': 'InsurAce announced its community Claims Assessors approved 155 UST de-peg cover claims (rejecting 18) and paid out about $11.73M, versus roughly $94k in premiums collected — one of the largest real DeFi cover payouts to date.',
                'link': 'https://www.benzinga.com/markets/cryptocurrency/22/08/28600860/insurace-announces-12-million-insurance-payouts-to-155-victims-of-terra-ust-crash',
            },
            {
                'date': '2025-02-18',
                'title': 'HTX delists INSUR for insufficient trading volume',
                'description': "Exchange HTX delisted INSUR (alongside several other tokens), citing 30-day average daily trading volume below $50,000 — a signal of the protocol's declining activity and effective wind-down.",
                'link': 'https://www.htx.com/support/54993739523805',
            },
        ],
        timeline=[
            {
                'date': '2020-10-01',
                'title': 'InsurAce founded and seed round closed',
                'description': 'InsurAce was created by Oliver Xie during the 2020 DeFi boom (Singapore-based) and raised ~$1M in seed funding from DeFiance Capital, Signum Capital, ParaFi Capital, Hashed and others shortly after inception.',
                'link': 'https://thedefiant.io/insurace-raises-3m-in-round-led-by-alameda-hashkey/',
                'status': 'executed',
            },
            {
                'date': '2021-02-01',
                'title': '$3M strategic round led by Alameda Research & HashKey Capital',
                'description': 'InsurAce raised $3M in a token round led by Alameda Research and HashKey Capital, with existing seed investors (DeFiance, ParaFi, Hashed, Signum) plus IOSG Ventures, imToken Ventures, LongHash Ventures and others participating.',
                'link': 'https://thedefiant.io/insurace-raises-3m-in-round-led-by-alameda-hashkey/',
                'status': 'executed',
            },
            {
                'date': '2021-04-26',
                'title': 'Mainnet launch on Ethereum',
                'description': 'InsurAce launched its live cover product on Ethereum mainnet following its SlowMist audit, later expanding into a cross-chain product line covering 100+ protocols and multiple CEXs across ~20 chains.',
                'link': 'https://www.stakingrewards.com/asset/insurace',
                'status': 'executed',
            },
            {
                'date': '2022-05-13',
                'title': 'UST de-peg claims process opened',
                'description': 'Within ~48 hours of the UST de-peg, InsurAce shortened the claims window for UST/Anchor/Mirror cover holders (deadline May 20, 2022) to set the loss-claim process in motion.',
                'link': 'https://cryptoslate.com/insurance-protocols-are-paying-out-millions-to-ust-holders/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Founder & CEO',
                'value': 'Oliver Xie',
                'freshness': 'static',
                'source': {
                    'label': 'Crowdfund Insider - interview with founder Oliver Xie',
                    'url': 'https://www.crowdfundinsider.com/2021/06/175920-oliver-xie-founder-at-defi-insurance-protocol-insurace-explains-how-platform-addresses-risks-from-smart-contract-vulnerabilities/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Headquarters',
                'value': 'Singapore',
                'freshness': 'static',
                'source': {
                    'label': 'Boxmining - InsurAce Protocol overview',
                    'url': 'https://www.boxmining.com/insurace-protocol-insur/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Sub-sector',
                'value': 'DeFi insurance / cover (underwriting) - multi-chain',
                'freshness': 'static',
                'source': {
                    'label': 'DeFiLlama - InsurAce protocol page',
                    'url': 'https://defillama.com/protocol/insurace',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Governance token',
                'value': 'INSUR (ERC-20, Ethereum contract 0x544c42fBB96B39B21DF61cf322b5EDC285EE7429)',
                'freshness': 'static',
                'source': {
                    'label': 'Etherscan - INSUR token tracker',
                    'url': 'https://etherscan.io/token/0x544c42fBB96B39B21DF61cf322b5EDC285EE7429',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'UST de-peg payout',
                'value': '~$11.73M paid across 155 approved claims (18 rejected) vs ~$94k premiums collected',
                'freshness': 'static',
                'source': {
                    'label': 'Benzinga - InsurAce $12M UST payout announcement',
                    'url': 'https://www.benzinga.com/markets/cryptocurrency/22/08/28600860/insurace-announces-12-million-insurance-payouts-to-155-victims-of-terra-ust-crash',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Operating status (2026)',
                'value': 'Effectively wound down / dormant: insurace.io parked for sale, INSUR delisted by HTX (Feb 2025), OpenCover paused tracking (May 2025), GitHub largely inactive after 2023-2024',
                'freshness': 'dynamic',
                'source': {
                    'label': 'OpenCover - InsurAce (data collection paused May 30, 2025)',
                    'url': 'https://opencover.com/insurace/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': 'As a cover/insurance protocol, InsurAce is itself the counterparty on every policy. Its ability to pay depends on the size and solvency of its capital pools; the UST event showed payouts (~$11.7M) can vastly exceed premiums collected (~$94k), stressing reserves.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'InsurAce underwrites stablecoin de-peg cover, concentrating de-peg risk on its own balance sheet. A large correlated de-peg event (as with UST in 2022) can trigger many simultaneous claims that draw down reserves faster than premiums replenish them.',
            },
            {
                'category': 'Smart Contract',
                'description': "Cover, staking, claims and cross-chain contracts are exploitable. SlowMist's 2021 audit found higher-severity issues (a reordering-attack risk and a missing permission check on an owner-adding function) that had to be fixed pre-launch; multi-chain deployment widens the attack surface.",
            },
            {
                'category': 'Governance',
                'description': 'Claims are approved or rejected by INSUR-staking Claims Assessors. This makes payout decisions dependent on token-weighted voting, which can be swayed by concentrated holders or low participation and creates a conflict between claimants and capital providers.',
            },
            {
                'category': 'Systemic',
                'description': 'Protocol viability depends on ongoing premium demand, capital-provider incentives and token value. Declining activity (HTX delisting for sub-$50k daily volume, parked domain, dormant repos) indicates a wind-down where cover may effectively be unavailable or unenforceable despite historic branding.',
            },
        ],
        competitors=[
            {
                'name': 'Nexus Mutual',
                'slug': 'nexus-mutual',
                'rank': 1,
                'positioning': 'The largest and longest-running DeFi cover protocol, structured as a UK discretionary mutual with NXM member tokens.',
                'similarities': 'Both offer on-chain cover against smart-contract failure and other DeFi risks, pool member/underwriter capital, and use community-driven claims assessment.',
                'differences': 'Nexus Mutual is a formally structured mutual with KYC membership and a bonding-curve capital model; InsurAce was permissionless, cross-chain, portfolio-cover focused, and added an investment arm to subsidize premiums. Nexus remains active while InsurAce has wound down.',
            },
            {
                'name': 'Neptune Mutual',
                'slug': 'neptune-mutual',
                'rank': 2,
                'positioning': 'Parametric DeFi cover marketplace using dedicated cover pools and a defined incident-resolution process.',
                'similarities': 'Both provide multi-protocol DeFi cover, rely on capital pools funded by liquidity providers, and target smart-contract and de-peg/exchange risks.',
                'differences': 'Neptune Mutual emphasizes a parametric, marketplace/pool-per-cover model and dispute resolution; InsurAce used actuary-priced portfolio covers with an investment arm and token-staked claims voting.',
            },
            {
                'name': 'Sherlock',
                'slug': 'sherlock',
                'rank': 3,
                'positioning': 'Audit-plus-coverage protocol where staked capital backs smart-contract exploit coverage for specific audited protocols.',
                'similarities': 'Both underwrite smart-contract exploit risk using pooled staker capital and pay claims from that capital.',
                'differences': 'Sherlock ties coverage tightly to its own security audits and per-protocol contracts and targets protocol teams as buyers; InsurAce sold retail-facing multi-risk, cross-chain portfolio covers.',
            },
            {
                'name': 'Ease (formerly Armor/Nexus Mutual ecosystem)',
                'slug': 'ease-org',
                'rank': 4,
                'positioning': 'DeFi cover protocol offering uninsurance / pooled coverage with no up-front premium, sharing loss across a vault ecosystem.',
                'similarities': 'Both are DeFi-native cover providers protecting users against smart-contract and protocol loss.',
                'differences': "Ease pioneered a no-premium 'uninsurance' model where deposits share losses, versus InsurAce's premium-based, actuary-priced cover with a separate underwriting pool.",
            },
        ],
        partnerships=[
            {
                'name': 'Bright Union',
                'date': '2021-09-18',
                'amountLabel': None,
                'description': 'InsurAce integrated with DeFi insurance aggregator Bright Union via API, listing its 70+ insured protocols alongside Nexus Mutual and others so users could compare and buy InsurAce cover through the Bright Union marketplace at no extra cost.',
            },
        ],
        investment_rounds=[
            {
                'date': '2020-10-01',
                'round': 'Seed',
                'amountUsd': 1000000,
                'amountLabel': '~$1M',
                'investors': [
                    'DeFiance Capital',
                    'Signum Capital',
                    'ParaFi Capital',
                    'Hashed',
                ],
                'link': 'https://thedefiant.io/insurace-raises-3m-in-round-led-by-alameda-hashkey/',
            },
            {
                'date': '2021-02-01',
                'round': 'Strategic',
                'amountUsd': 3000000,
                'amountLabel': '$3M',
                'investors': [
                    'Alameda Research',
                    'HashKey Capital',
                    'DeFiance Capital',
                    'ParaFi Capital',
                    'Hashed',
                    'Signum Capital',
                    'IOSG Ventures',
                    'imToken Ventures',
                    'LongHash Ventures',
                ],
                'link': 'https://thedefiant.io/insurace-raises-3m-in-round-led-by-alameda-hashkey/',
            },
        ],
        audits=[
            {
                'firm': 'SlowMist',
                'date': '2021-02-01',
                'url': 'https://www.defisafety.com/app/pqrs/161',
            },
            {
                'firm': 'PeckShield',
                'date': '2021-07-12',
                'url': 'https://www.defisafety.com/app/pqrs/161',
            },
        ],
        sources=[
            {
                'label': 'DeFiLlama - InsurAce protocol page',
                'url': 'https://defillama.com/protocol/insurace',
            },
            {
                'label': 'Benzinga - InsurAce $12M UST de-peg payout (155 claimants)',
                'url': 'https://www.benzinga.com/markets/cryptocurrency/22/08/28600860/insurace-announces-12-million-insurance-payouts-to-155-victims-of-terra-ust-crash',
            },
            {
                'label': 'Cointelegraph - InsurAce to pay millions after Terra collapse',
                'url': 'https://cointelegraph.com/news/insurace-says-it-will-pay-millions-to-claimants-after-terra-s-collapse',
            },
            {
                'label': 'CryptoSlate - Insurance protocols paying out millions to UST holders',
                'url': 'https://cryptoslate.com/insurance-protocols-are-paying-out-millions-to-ust-holders/',
            },
            {
                'label': 'The Defiant - InsurAce raises $3M led by Alameda & HashKey',
                'url': 'https://thedefiant.io/insurace-raises-3m-in-round-led-by-alameda-hashkey/',
            },
            {
                'label': 'Boxmining - InsurAce Protocol overview (seed round, founder, HQ)',
                'url': 'https://www.boxmining.com/insurace-protocol-insur/',
            },
            {
                'label': 'Crowdfund Insider - Oliver Xie founder interview',
                'url': 'https://www.crowdfundinsider.com/2021/06/175920-oliver-xie-founder-at-defi-insurance-protocol-insurace-explains-how-platform-addresses-risks-from-smart-contract-vulnerabilities/',
            },
            {
                'label': 'OpenCover - InsurAce cover profile (status, chains, audits, claims process)',
                'url': 'https://opencover.com/insurace/',
            },
            {
                'label': 'DeFiSafety - InsurAce detailed report (audits, SCR model)',
                'url': 'https://www.defisafety.com/app/pqrs/161',
            },
            {
                'label': 'StakingRewards - InsurAce (mainnet April 2021, staking mechanics)',
                'url': 'https://www.stakingrewards.com/asset/insurace',
            },
            {
                'label': 'HTX - INSUR delisting announcement (Feb 18, 2025)',
                'url': 'https://www.htx.com/support/54993739523805',
            },
            {
                'label': 'Etherscan - INSUR token contract',
                'url': 'https://etherscan.io/token/0x544c42fBB96B39B21DF61cf322b5EDC285EE7429',
            },
            {
                'label': 'GitHub - InsurAce-Protocol org',
                'url': 'https://github.com/InsurAce-Protocol',
            },
            {
                'label': 'Bright Union - partnership with InsurAce',
                'url': 'https://smartliquidity.info/2021/09/18/insurace-io-has-partnered-with-bright-union/',
            },
            {
                'label': 'Three Sigma - DeFi insurance guide (InsurAce mutual/two-arm model)',
                'url': 'https://threesigma.xyz/blog/infrastructure/defi-insurance-guide-risks-rewards',
            },
        ],
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
        components=[
            {
                'name': 'Parametric Cover Marketplace',
                'description': 'The core product: a marketplace of parametric cover policies covering DeFi protocols, CEXes and custodians. Payouts trigger on the resolution of a predefined incident rather than on individual member claims, so policyholders of an affected protocol are all paid out without submitting evidence.',
            },
            {
                'name': 'Cover Pools (Dedicated & Diversified)',
                'description': 'Liquidity providers deposit stablecoins into either dedicated pools (single project) or diversified pools (a basket of projects), choosing leveraged or unleveraged exposure to earn premiums and NPM incentives.',
            },
            {
                'name': 'Incident Reporting & Resolution System',
                'description': 'A community-based, NPM-staking mechanism to report and dispute incidents that trigger payouts. Pre-TGE this operated under an interim Proof of Authority model with the Neptune Mutual Association able to pause the protocol and perform emergency resolutions.',
            },
            {
                'name': 'NPM Token',
                'description': 'Governance and staking token whose primary utility is governing the incident reporting and resolution system via staking and voting; also used for staking to create covers and provide reporting incentives.',
            },
        ],
        faq=[
            {
                'question': 'How is Neptune Mutual different from claims-based insurance like Nexus Mutual?',
                'answer': 'Neptune Mutual is parametric: payouts trigger on the resolution of a predefined incident, and all policyholders of the affected protocol are paid out. Claimants do not submit evidence and there are no member claim-assessment votes, unlike discretionary mutual models where members vote on each claim.',
                'pinned': True,
            },
            {
                'question': 'Which chains did Neptune Mutual operate on?',
                'answer': 'The marketplace ran on Ethereum, Arbitrum and BNB Smart Chain (BSC), with Polygon available to facilitate bridging. It launched first on Ethereum mainnet on 8 November 2022 and later expanded to Arbitrum and BSC to reduce gas costs.',
                'pinned': False,
            },
            {
                'question': 'What is the NPM token used for?',
                'answer': 'NPM is the governance and staking token. Its primary utility is governing the community reporting and incident-resolution system through staking and voting; it is also staked to create covers and to incentivise honest incident reporting.',
                'pinned': False,
            },
            {
                'question': 'Who are the participants in the marketplace?',
                'answer': 'There are four stakeholder roles: Cover Creators (projects that create parametric covers, subject to team approval), Cover Purchasers (buyers of cover policies), Liquidity Providers (who supply stablecoin liquidity to cover pools), and Incident Reporters (community members who report and verify incidents).',
                'pinned': False,
            },
            {
                'question': 'Is the Neptune Mutual marketplace still operating?',
                'answer': 'No. In June 2024 the team announced it would close the cover marketplaces via an emergency withdrawal process returning LP liquidity to source wallets, refund qualifying policyholders, and open-source the protocol as a public good, citing an inability to hit the growth metrics needed for a top-tier CEX listing amid weak demand across the DeFi insurance category.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Neptune Mutual Association',
                'role': 'Governing body / protocol steward',
                'description': 'Held governance powers under the interim Proof of Authority model, including the ability to pause the protocol during attacks and perform emergency resolutions to reverse incident-reporting decisions during malicious activity.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Parametric insurance (e.g. weather / flight-delay index insurance)',
                'similarity': 'Both pay out automatically when a predefined, objectively measurable trigger condition is met, rather than requiring the insured to file and prove a loss claim.',
                'differences': 'Neptune Mutual covers crypto-native perils (protocol hacks, exchange/custodian failures), is funded by permissionless stablecoin liquidity pools, and resolves incidents through on-chain community reporting and NPM staking rather than a licensed insurer and actuarial loss adjuster.',
            },
        ],
        events=[
            {
                'date': '2021-11-26',
                'title': 'Seed round led by Fenbushi Capital',
                'description': 'Raised a $1.75M seed round to build the decentralized cover protocol, emphasizing no claims assessors or middlemen and instant settlement once cover conditions are satisfied.',
                'link': 'https://cryptoslate.com/press-releases/neptune-mutual-raises-seed-round-led-by-fenbushi-capital-to-build-decentralized-cover-protocol/',
            },
            {
                'date': '2022-05-13',
                'title': '$5.3M private funding round',
                'description': 'Closed a $5.3M private round after a successful testnet launch, with exchange venture funds and strategic partners participating.',
                'link': 'https://medium.com/neptune-mutual/neptune-mutual-protocol-raises-5-3m-in-a-private-funding-round-after-successful-testnet-launch-5fb0f944c8a8',
            },
            {
                'date': '2022-11-08',
                'title': 'Parametric marketplace goes live on Ethereum mainnet',
                'description': 'The parametric cover marketplace launched on Ethereum mainnet with a diversified cover pool and coverage for major DeFi protocols such as Uniswap, Aave, Maker and Balancer.',
                'link': 'https://medium.com/neptune-mutual/neptune-mutual-parametric-marketplace-going-live-on-ethereum-mainnet-8th-november-2ebb1c59070e',
            },
        ],
        timeline=[
            {
                'date': '2024-06-01',
                'title': 'Marketplace closure and open-sourcing',
                'description': 'The team announced closure of the cover marketplaces via an emergency withdrawal process, refunds to qualifying policyholders, cancellation of Epoch 3 liquidity-gauge NPM emissions from end of June, and open-sourcing of the protocol as a public good.',
                'link': 'https://neptunemutual.com/docs/about-neptune-mutual/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Supported chains',
                'value': 'Ethereum, Arbitrum, BNB Smart Chain (Polygon for bridging)',
                'freshness': 'static',
                'source': {
                    'label': 'Exploring the Neptune Mutual Marketplace (Medium)',
                    'url': 'https://medium.com/neptune-mutual/exploring-the-neptune-mutual-marketplace-463d803444c5',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding disclosed',
                'value': '$1.75M seed (Nov 2021) + $5.3M private round (May 2022)',
                'freshness': 'static',
                'source': {
                    'label': 'Neptune Mutual Medium / CryptoSlate raise announcements',
                    'url': 'https://medium.com/neptune-mutual/neptune-mutual-protocol-raises-5-3m-in-a-private-funding-round-after-successful-testnet-launch-5fb0f944c8a8',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Ethereum mainnet launch date',
                'value': '8 November 2022',
                'freshness': 'static',
                'source': {
                    'label': 'Parametric Marketplace Going Live on Ethereum Mainnet (Medium)',
                    'url': 'https://medium.com/neptune-mutual/neptune-mutual-parametric-marketplace-going-live-on-ethereum-mainnet-8th-november-2ebb1c59070e',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Oracle',
                'description': 'Payouts depend on objectively resolving whether a predefined incident occurred. An incorrect, delayed or manipulated incident-resolution outcome (the parametric trigger) could deny valid claims or trigger unwarranted payouts.',
            },
            {
                'category': 'Governance',
                'description': 'Under the interim Proof of Authority model the Neptune Mutual Association could pause the protocol and reverse incident-reporting decisions via emergency resolutions, concentrating significant discretionary power. OpenZeppelin also flagged that the protocol has a large number of very privileged roles requiring careful key management.',
            },
            {
                'category': 'Smart Contract',
                'description': 'A complex 44-contract codebase with intricate storage and access-control patterns. Audits (OpenZeppelin, BlockSec, Hacken) found high-severity issues that were subsequently addressed, but residual smart-contract risk remains inherent.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': "Cover pools are funded with stablecoin liquidity; the protocol's ability to pay claims depends on pooled reserves. OpenZeppelin flagged risk of insufficient liquidity when computing policy coverage commitments, and a stablecoin depeg would impair reserve value.",
            },
            {
                'category': 'Counterparty',
                'description': "Cover Creators are approved at the team's discretion and covers reference third-party protocols and exchanges; the value of a policy depends on the correct scoping of the covered counterparty and event.",
            },
        ],
        competitors=[
            {
                'name': 'Nexus Mutual',
                'slug': 'nexus-mutual',
                'rank': 1,
                'positioning': 'The largest DeFi cover protocol, using a discretionary mutual model.',
                'similarities': 'Both provide on-chain cover against smart-contract hacks and DeFi/custodian risks, funded by pooled member capital.',
                'differences': 'Nexus Mutual uses member claim-assessment voting on each claim; Neptune Mutual is parametric and pays all policyholders automatically on incident resolution without individual claims votes or evidence.',
            },
            {
                'name': 'InsurAce',
                'slug': 'insurace',
                'rank': 2,
                'positioning': 'Multi-chain DeFi insurance protocol offering portfolio-based cover.',
                'similarities': 'Both are multi-chain cover marketplaces protecting against protocol exploits and offering diversified/portfolio cover pools.',
                'differences': 'InsurAce uses a claim-assessment and advisory-board process; Neptune Mutual resolves via parametric incident reporting with NPM staking.',
            },
            {
                'name': 'Sherlock',
                'slug': 'sherlock',
                'rank': 3,
                'positioning': 'Audit-plus-coverage protocol pairing security reviews with smart-contract exploit coverage.',
                'similarities': 'Both offer smart-contract exploit protection backed by staked/pooled capital.',
                'differences': 'Sherlock couples coverage with its own audit contests and uses expert claims adjudication; Neptune Mutual sells standalone parametric covers with community incident resolution.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-11-26',
                'round': 'Seed',
                'amountUsd': 1750000,
                'amountLabel': '$1.75M',
                'investors': [
                    'Fenbushi Capital',
                    'Coinbase Ventures',
                    'Huobi Ventures',
                    'OK Blockdream Ventures',
                    'GravityX',
                    'Hex Trust',
                    'Baboon VC',
                    'NVC Partners',
                    'Alphabit Digital Currency Fund',
                ],
                'link': 'https://cryptoslate.com/press-releases/neptune-mutual-raises-seed-round-led-by-fenbushi-capital-to-build-decentralized-cover-protocol/',
            },
            {
                'date': '2022-05-13',
                'round': 'Private',
                'amountUsd': 5300000,
                'amountLabel': '$5.3M',
                'investors': [
                    'XT.com',
                    'Gate.io',
                    'Bitmart',
                    'LD Capital',
                    'Mapleblock Capital',
                    'Pulsar Global',
                    'The DuckDao',
                    'Dweb3',
                    'Redline DAO',
                    'LUX Capital',
                    'Poolz Finance',
                    'BSC Army',
                    'Whitelist Ventures',
                    'CryptoLark',
                ],
                'link': 'https://medium.com/neptune-mutual/neptune-mutual-protocol-raises-5-3m-in-a-private-funding-round-after-successful-testnet-launch-5fb0f944c8a8',
            },
        ],
        audits=[
            {
                'firm': 'OpenZeppelin',
                'date': '2022-10-13',
                'url': 'https://www.openzeppelin.com/news/neptune-mutual-audit',
            },
            {
                'firm': 'BlockSec',
                'date': '2022-06-01',
                'url': 'https://neptunemutual.com/security/blocksec-audit-report/',
            },
            {
                'firm': 'Hacken',
                'date': '2023-09-01',
                'url': 'https://hacken.io/audits/neptune-mutual/sca-neptune-mutual-liquidity-pool-sep2023/',
            },
        ],
        sources=[
            {
                'label': 'About Neptune Mutual / Neptune Mutual Docs',
                'url': 'https://neptunemutual.com/docs/about-neptune-mutual/',
            },
            {
                'label': 'The Neptune Mutual Ecosystem (Medium)',
                'url': 'https://medium.com/neptune-mutual/the-neptune-mutual-ecosystem-fca13a3ac196',
            },
            {
                'label': 'Exploring the Neptune Mutual Marketplace (Medium) - chains',
                'url': 'https://medium.com/neptune-mutual/exploring-the-neptune-mutual-marketplace-463d803444c5',
            },
            {
                'label': 'Parametric Marketplace Going Live on Ethereum Mainnet (Medium)',
                'url': 'https://medium.com/neptune-mutual/neptune-mutual-parametric-marketplace-going-live-on-ethereum-mainnet-8th-november-2ebb1c59070e',
            },
            {
                'label': 'Seed round announcement (CryptoSlate)',
                'url': 'https://cryptoslate.com/press-releases/neptune-mutual-raises-seed-round-led-by-fenbushi-capital-to-build-decentralized-cover-protocol/',
            },
            {
                'label': '$5.3M private round announcement (Medium)',
                'url': 'https://medium.com/neptune-mutual/neptune-mutual-protocol-raises-5-3m-in-a-private-funding-round-after-successful-testnet-launch-5fb0f944c8a8',
            },
            {
                'label': 'OpenZeppelin audit',
                'url': 'https://www.openzeppelin.com/news/neptune-mutual-audit',
            },
        ],
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
        components=[
            {
                'name': 'Cozy Safety Module (CSM)',
                'description': "Cozy's current flagship product: a dedicated on-chain pool of capital that protocols reserve to reimburse their users up to a specified cap in the event of a hack, exploit, or other qualifying loss. Suppliers deposit capital and earn creator-defined rewards; if a covered loss is triggered, deposited funds are slashed to pay affected users. Described by the team as FDIC-like protection for on-chain assets.",
            },
            {
                'name': 'Protection Markets',
                'description': 'Market-based contracts that let protocols spin up insurance-style markets against tail risks (e.g. smart-contract hacks or stablecoin depegs). Buyers purchase protection while providers underwrite the risk and earn fees/yield collected each time protection is bought or sold. Markets support fixed, dynamic, or custom utilization-based pricing and use customizable trigger templates that define payout logic.',
            },
            {
                'name': 'Triggers',
                'description': 'Configurable payout-condition modules that define what constitutes a qualifying loss for a given market or safety module. Trigger resolution can be automated on-chain or governed by a DAO/multisig chosen by the market/module creator, determining when funds are paid out to protection buyers.',
            },
            {
                'name': 'Tranche & Reserve (DeFi Safety Stack)',
                'description': "Complementary primitives in Cozy's broader 'DeFi Safety Stack.' Tranche splits protocol yield into risk tranches where junior stakers absorb losses first; Reserve establishes asset backstops to cover shortfalls. Together with Protection Markets and the Safety Module they form Cozy's layered risk-management offering for protocols seeking safety-conscious capital.",
            },
        ],
        faq=[
            {
                'question': 'What is Cozy Finance?',
                'answer': 'Cozy Finance (the Cozy Protocol) is an open-source, parametric DeFi protection protocol. It lets protocols and users buy and sell protection against events like smart-contract hacks, exploits, and depegs. Its current flagship product is the Cozy Safety Module, a pool of reserved capital that protocols use to reimburse users after qualifying losses.',
                'pinned': True,
            },
            {
                'question': 'Is Cozy Finance still active?',
                'answer': "Yes. Despite an earlier venture-funded 'crypto insurance' era, Cozy did not shut down. It pivoted from its v1/v2 protection-market design toward a broader 'DeFi Safety Stack' centered on the Cozy Safety Module. Its GitHub org, docs, and app remain active, with security reviews continuing through late 2025 (formal verification in Dec 2025).",
                'pinned': True,
            },
            {
                'question': 'Does Cozy Finance have a governance token?',
                'answer': "No governance token has been announced for Cozy's core protection markets or safety modules. The protocol operates without a native token for its core products; economic incentives flow through fees and creator-defined reward emissions rather than a governance token.",
                'pinned': False,
            },
            {
                'question': 'How does the Cozy Safety Module protect users?',
                'answer': "A protocol creates a safety module and defines what qualifies as a covered loss. Suppliers deposit capital into the module and earn rewards set by the creator. If a qualifying loss occurs and the trigger resolves, the deposited funds are slashed and paid out to affected users, up to the module's cap. If funds are insufficient, users typically receive pro-rata payouts.",
                'pinned': False,
            },
            {
                'question': 'Did Cozy ever pay out on a real exploit?',
                'answer': 'Yes. In March 2023, while Cozy v2 was in early access, it had an active Euler Finance protection market. When Euler Finance was exploited for roughly $200M on March 13, 2023, that market triggered and paid out protection buyers, an early real-world demonstration of the protocol.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Payom Dousti',
                'role': 'Co-founder',
                'description': 'Co-founder of Cozy Finance; previously co-founder of Rare Bits. Listed across company profiles as a founder of the protocol (founded 2020).',
            },
            {
                'name': 'Tony Sheng',
                'role': 'Co-founder',
                'description': 'Co-founder of Cozy Finance, previously of Multicoin Capital. At launch he framed Cozy around building blockchain-native risk-management approaches beyond simple position sizing.',
            },
            {
                'name': 'Cozy Finance, Inc.',
                'role': 'Operating company',
                'description': 'US-based company (founded 2020) that develops the open-source Cozy Protocol and Cozy Safety Module. Small team (reported ~5 employees as of mid-2024).',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Deposit insurance (e.g. FDIC)',
                'similarity': 'The Cozy Safety Module is explicitly likened to FDIC-style protection: a reserved pool of capital that reimburses users up to a cap when a qualifying loss event occurs.',
                'differences': 'FDIC is a government-backed guarantee funded by member banks with statutory coverage limits; Cozy is a permissionless, on-chain, capital-at-risk pool funded by private suppliers who can be slashed. Coverage terms are defined per-module by the creator, there is no sovereign backstop, and payouts are limited to deposited capital.',
            },
            {
                'product': 'Parametric insurance',
                'similarity': 'Cozy protection markets pay out based on predefined, objectively verifiable trigger conditions rather than a claims-adjustment process, mirroring parametric insurance where payouts are tied to a measurable event.',
                'differences': 'Traditional parametric insurers are regulated entities carrying the risk on their balance sheet; Cozy is a non-custodial protocol where anonymous providers underwrite risk for yield, triggers are enforced by smart contracts or a DAO, and there is no insurer of last resort.',
            },
            {
                'product': 'Reinsurance / risk underwriting pools',
                'similarity': "Protection providers on Cozy act like underwriters, supplying capital to cover others' risk in exchange for premiums/fees, similar to how reinsurers pool capital against tail events.",
                'differences': 'Reinsurance is intermediated by licensed institutions with actuarial pricing and legal contracts; Cozy underwriting is open, algorithmically priced (fixed/dynamic/utilization-based), and settled on-chain without counterparties or legal recourse.',
            },
        ],
        events=[
            {
                'date': '2020-09-03',
                'title': 'Cozy Finance debuts with $2M seed round',
                'description': 'Cozy Finance publicly launched as a DeFi risk-management startup, announcing a $2M seed round led by Electric Capital, aiming to build blockchain-native protection against smart-contract failure.',
                'link': 'https://www.coindesk.com/business/2020/09/03/defi-risk-management-startup-cozy-finance-debuts-with-2m-funding-round',
            },
            {
                'date': '2023-03-13',
                'title': 'Cozy v2 Euler Finance market pays out',
                'description': "During Cozy v2 early access, an active Euler Finance protection market triggered and paid out after Euler was exploited for roughly $200M, an early real-world test of Cozy's parametric protection.",
                'link': 'https://mirror.xyz/cozy.eth/djvG1VRr08GP85ua-stmwQ2vCt8kh6pWjL-VOyZEl5E',
            },
        ],
        timeline=[
            {
                'date': '2020-09-03',
                'title': 'Seed round / public debut',
                'description': '$2M seed round led by Electric Capital; Cozy Finance founded to build DeFi risk-management primitives.',
                'link': 'https://www.coindesk.com/business/2020/09/03/defi-risk-management-startup-cozy-finance-debuts-with-2m-funding-round',
                'status': 'executed',
            },
            {
                'date': '2023-03-13',
                'title': 'Euler protection market payout',
                'description': 'Cozy v2 Euler Finance market triggered and paid protection buyers following the ~$200M Euler exploit.',
                'link': 'https://mirror.xyz/cozy.eth/djvG1VRr08GP85ua-stmwQ2vCt8kh6pWjL-VOyZEl5E',
                'status': 'executed',
            },
            {
                'date': '2024-03-01',
                'title': 'Zellic audit of Cozy Safety Module era',
                'description': "Zellic security audit associated with Cozy's Safety Module / stack development (dated Mar 2024 per Cozy's security listing).",
                'link': 'https://www.cozy.finance/',
                'status': 'executed',
            },
            {
                'date': '2025-05-01',
                'title': 'Electisec (yAudit) review of Cozy Safety Module',
                'description': 'Electisec (formerly yAudit) published a review of the Cozy Safety Module, finding a well-architected protocol with strong access controls.',
                'link': 'https://reports.electisec.com/2025-05-Cozy-Safety-Module',
                'status': 'executed',
            },
            {
                'date': '2025-12-01',
                'title': 'Certora formal verification',
                'description': "Formal verification of Cozy's safety-module contracts by Certora (dated Dec 2025 per Cozy's security listing), part of ongoing security work.",
                'link': 'https://www.cozy.finance/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Sub-sector',
                'value': 'DeFi underwriting / parametric protection (insurance-like risk markets)',
                'freshness': 'static',
                'source': {
                    'label': 'Cozy Finance homepage',
                    'url': 'https://www.cozy.finance/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Founded',
                'value': '2020, United States (Cozy Finance, Inc.)',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk seed round coverage',
                    'url': 'https://www.coindesk.com/business/2020/09/03/defi-risk-management-startup-cozy-finance-debuts-with-2m-funding-round',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Flagship product',
                'value': 'Cozy Safety Module (CSM) — reserved capital pool that protocols use to reimburse users after qualifying losses',
                'freshness': 'evolving',
                'source': {
                    'label': 'Cozy Safety Module docs',
                    'url': 'https://csm-docs.cozy.finance/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Governance token',
                'value': 'None announced for core protection markets / safety modules',
                'freshness': 'evolving',
                'source': {
                    'label': 'Cozy Safety Module user FAQs',
                    'url': 'https://csm-docs.cozy.finance/user-guides/user-faqs',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding raised',
                'value': '$2M seed (2020); later profiles list additional VC backers (Polychain, Coinbase Ventures, CMS) without disclosed round amounts',
                'freshness': 'evolving',
                'source': {
                    'label': 'CoinCarp Cozy Finance profile',
                    'url': 'https://www.coincarp.com/project/cozy-finance/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Cozy is entirely smart-contract-based; a bug in the safety-module, trigger, or protection-market contracts could cause loss of supplier capital or failure to pay valid claims. Mitigated but not eliminated by multiple audits (Zellic, Cantina, Electisec) and Certora formal verification.',
            },
            {
                'category': 'Counterparty',
                'description': 'Protection is only as good as the capital supplied by underwriters. If a safety module or market is under-collateralized relative to a loss, users receive only pro-rata payouts, so buyers bear the counterparty/capacity risk of insufficient reserves.',
            },
            {
                'category': 'Oracle',
                'description': 'Payouts depend on trigger resolution. Triggers that rely on price feeds, external data, or automated conditions can misfire (false positive/negative) if the underlying oracle or data source is manipulated, delayed, or wrong.',
            },
            {
                'category': 'Governance',
                'description': 'For non-automated markets, claim/trigger resolution can be delegated to a DAO or multisig chosen by the module creator. This introduces discretionary human/governance risk over whether and how much a valid claim is paid.',
            },
            {
                'category': 'Systemic',
                'description': 'As DeFi-native cover, Cozy is exposed to correlated tail events: a large market-wide exploit or contagion could simultaneously trigger many modules and exhaust provider capital, and the protocol has no external insurer-of-last-resort backstop.',
            },
        ],
        competitors=[
            {
                'name': 'Nexus Mutual',
                'slug': 'nexus-mutual',
                'rank': 1,
                'positioning': 'Largest DeFi cover provider; a member-owned discretionary mutual offering smart-contract and custody cover backed by a shared capital pool and the NXM token.',
                'similarities': 'Both provide on-chain protection against smart-contract hacks and exploits and rely on pooled capital from underwriters/members.',
                'differences': 'Nexus is a discretionary mutual with a native token (NXM), KYC/membership, and claims assessors; Cozy is tokenless, permissionless, and parametric with automated or creator-defined triggers rather than mutual claims voting.',
            },
            {
                'name': 'InsurAce',
                'slug': 'insurace',
                'rank': 2,
                'positioning': 'Multi-chain DeFi insurance protocol offering portfolio-based cover across many protocols with a native INSUR token.',
                'similarities': 'Both underwrite DeFi risks (protocol hacks, depegs) using pooled capital and sell cover to end users.',
                'differences': 'InsurAce uses a traditional insurer-style pooled model with a governance token and claims process; Cozy is parametric/trigger-based, tokenless, and lets any protocol spin up its own safety module or market.',
            },
            {
                'name': 'Neptune Mutual',
                'slug': 'neptune-mutual',
                'rank': 3,
                'positioning': 'Parametric cover marketplace using dedicated cover pools and a parametric/reporting-based payout model.',
                'similarities': 'Both are parametric — payouts key off predefined trigger conditions rather than case-by-case claims adjustment — and both let cover pools be created for specific protocols.',
                'differences': 'Neptune Mutual uses an incident-reporting and resolution mechanism with its own token economy; Cozy emphasizes tokenless permissionless module/market creation with on-chain or DAO-resolved triggers.',
            },
            {
                'name': 'Sherlock',
                'slug': 'sherlock',
                'rank': 4,
                'positioning': 'Audit-plus-coverage protocol that bundles smart-contract audits with staker-backed exploit coverage for protocols.',
                'similarities': 'Both provide protocols a way to backstop user funds against exploits using staked/supplied capital that can be slashed on a covered loss.',
                'differences': 'Sherlock couples coverage tightly with its own audit contests and Watson auditor network; Cozy is a general-purpose protection/safety-module layer independent of an audit program.',
            },
            {
                'name': 'Ease (formerly Armor / ease.org)',
                'slug': 'ease-org',
                'rank': 5,
                'positioning': 'DeFi cover protocol built around uninsurance / shared-pool coverage vaults for protocol exploits.',
                'similarities': 'Both offer protocol-level exploit protection funded by capital providers and both moved toward pooled, non-traditional cover structures.',
                'differences': "Ease uses its 'uninsurance' shared-loss vault model; Cozy uses parametric protection markets and dedicated per-protocol safety modules with configurable triggers.",
            },
        ],
        investment_rounds=[
            {
                'date': '2020-09-03',
                'round': 'Seed',
                'amountUsd': 2000000,
                'amountLabel': '$2M',
                'investors': [
                    'Electric Capital',
                    'Variant Fund',
                    'Dragonfly Capital',
                    'Robot Ventures',
                    'Slow Ventures',
                    'Volt Capital',
                    'Spencer Noon',
                    'Ed Moncada',
                ],
                'link': 'https://www.coindesk.com/business/2020/09/03/defi-risk-management-startup-cozy-finance-debuts-with-2m-funding-round',
            },
        ],
        audits=[
            {
                'firm': 'Zellic',
                'date': '2024-03-01',
                'url': 'https://www.cozy.finance/',
            },
            {
                'firm': 'Electisec (formerly yAudit)',
                'date': '2025-05-01',
                'url': 'https://reports.electisec.com/2025-05-Cozy-Safety-Module',
            },
            {
                'firm': 'Cantina',
                'date': '2025-10-01',
                'url': 'https://www.cozy.finance/protection-markets',
            },
            {
                'firm': 'Certora (formal verification)',
                'date': '2025-12-01',
                'url': 'https://www.cozy.finance/',
            },
        ],
        sources=[
            {
                'label': 'Cozy Finance homepage (DeFi Safety Stack, audits, backers)',
                'url': 'https://www.cozy.finance/',
            },
            {
                'label': 'Cozy Finance Protection Markets',
                'url': 'https://www.cozy.finance/protection-markets',
            },
            {
                'label': 'Cozy Safety Module docs',
                'url': 'https://csm-docs.cozy.finance/',
            },
            {
                'label': 'Cozy Safety Module user FAQs',
                'url': 'https://csm-docs.cozy.finance/user-guides/user-faqs',
            },
            {
                'label': 'CoinDesk: Cozy Finance debuts with $2M seed round',
                'url': 'https://www.coindesk.com/business/2020/09/03/defi-risk-management-startup-cozy-finance-debuts-with-2m-funding-round',
            },
            {
                'label': 'CoinCarp: Cozy Finance founders & funding',
                'url': 'https://www.coincarp.com/project/cozy-finance/',
            },
            {
                'label': 'Mirror: How to Buy Protection on Cozy v2 (Euler payout reference)',
                'url': 'https://mirror.xyz/cozy.eth/djvG1VRr08GP85ua-stmwQ2vCt8kh6pWjL-VOyZEl5E',
            },
            {
                'label': 'Electisec (yAudit) Cozy Safety Module review',
                'url': 'https://reports.electisec.com/2025-05-Cozy-Safety-Module',
            },
            {
                'label': 'Cozy Finance GitHub org',
                'url': 'https://github.com/Cozy-Finance',
            },
            {
                'label': 'DeFiLlama: Cozy Finance',
                'url': 'https://defillama.com/protocol/cozy-finance',
            },
        ],
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
        components=[
            {
                'name': 'Uninsurance (Reciprocally-Covered Assets / RCA)',
                'description': "Ease's flagship DeFi-native coverage model. Users deposit yield-bearing tokens into RCA vaults; the deposited assets simultaneously earn yield and underwrite each other, so coverage carries no upfront premium and a fee only applies in the event of a validated hack. RCAs aim to cover the total value in a sector rather than a capped amount.",
            },
            {
                'name': 'RCA Vaults',
                'description': 'Per-protocol vaults where deposited capital is routed to an external DeFi protocol to generate yield while becoming covered. Vault capacity is dynamic and continuously rebalanced to spread shared risk across the system.',
            },
            {
                'name': 'gvToken (gvEASE) governance & staking',
                'description': 'Growing-vote token model launched September 2022. Depositing EASE mints an equal amount of gvEASE whose voting/staking power grows linearly over a year up to 2x. gvEASE is used to back specific vaults and to vote in the Ease DAO.',
            },
            {
                'name': 'Ease DAO',
                'description': 'On-chain governance for the protocol. gvEASE holders create and vote on proposals; a proposer needs 100,000 gvEASE delegated, and 50 million votes with an affirmative majority are required to pass a proposal. The DAO also decides validity of hack claims/payouts.',
            },
            {
                'name': 'arNFT / arCore (legacy Armor.fi)',
                'description': 'Original Armor.fi products: arCore pay-as-you-go cover brokerage built on Nexus Mutual capacity, and arNFT tokenized (transferable) Nexus Mutual cover. These predate the Ease rebrand and RCA model.',
            },
        ],
        faq=[
            {
                'question': 'What is Ease.org and how is it related to Armor.fi?',
                'answer': 'Ease.org is the rebrand of Armor.fi (Armor Finance), announced in May 2022. Armor began in 2020/2021 as a DeFi cover brokerage aggregating Nexus Mutual capacity (arCore, arNFT). The team then built a DeFi-native coverage model called Uninsurance / Reciprocally-Covered Assets and relaunched the whole brand as Ease.',
                'pinned': True,
            },
            {
                'question': 'What are Reciprocally-Covered Assets (RCA)?',
                'answer': "RCA is Ease's coverage model in which covered assets simultaneously underwrite the other assets in the ecosystem. Users deposit yield-bearing tokens into vaults that earn yield and, by design, become covered against hacks with no upfront premium. It is described as the first coverage method unique to DeFi and able to cover the total value in a sector.",
                'pinned': True,
            },
            {
                'question': 'How does the EASE token relate to ARMOR?',
                'answer': 'EASE replaced the ARMOR token via a one-way 1:1 swap: 1 EASE for every ARMOR (and staked vARMOR), launched alongside the September 2022 rebrand/tokenomics. The swap cannot be reversed.',
                'pinned': False,
            },
            {
                'question': 'How do claims work if there is no premium?',
                'answer': "Coverage is 'uninsurance': no premium is paid upfront and a cost only materializes after a confirmed hack. Following an incident there is roughly a 7-day impact-assessment window and a ~5-day DAO vote on payout validity (typically ~12-13 days total). Users do not submit individual loss evidence; validated incidents are covered automatically, and depositors' capital serves as the underwriting/payout source.",
                'pinned': False,
            },
            {
                'question': 'Who founded Ease.org?',
                'answer': 'Ease/Armor was founded by Robert Forster (CEO, who authored the RCA whitepaper) and Harry Kikstra. It originated from the Armor.fi team.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Robert Forster',
                'role': 'Co-founder / CEO (former Armor.fi CTO)',
                'description': "Co-founder and CEO of Ease.org; authored Armor's whitepaper describing the Reciprocally-Covered Assets system. Previously served as CTO of Armor.fi.",
            },
            {
                'name': 'Harry Kikstra',
                'role': 'Co-founder',
                'description': 'Co-founder of Ease/Armor, cited alongside Robert Forster as bringing DeFi and smart-contract development expertise to the project.',
            },
            {
                'name': 'Ease DAO',
                'role': 'Decentralized governance body',
                'description': 'gvEASE-token holders govern the protocol, vote on proposals, and adjudicate the validity of hack claims. Proposal creation requires 100,000 delegated gvEASE; passing requires 50M affirmative-majority votes.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Mutual insurance / reciprocal insurance exchange',
                'similarity': "Ease's Uninsurance mirrors a mutual/reciprocal exchange: members collectively pool capital to cover each other's losses rather than paying a for-profit carrier, and members effectively act as their own underwriters.",
                'differences': 'There is no upfront premium (cost only accrues after a validated hack), the pooled capital simultaneously earns DeFi yield, payouts are decided by on-chain DAO vote rather than a claims adjuster, and everything is enforced by smart contracts on-chain.',
            },
            {
                'product': 'Catastrophe (CAT) bonds',
                'similarity': "Ease's stNXM-style underwriting resembles a catastrophe bond: capital providers earn a yield/premium while their principal is at risk and is paid out only if a defined loss event (a hack) is confirmed.",
                'differences': 'Coverage is perpetual and self-maintaining rather than a fixed-term instrument, capital is composable DeFi collateral, and trigger validation is a community/DAO process rather than a parametric or modeled trigger agency.',
            },
        ],
        events=[
            {
                'date': '2022-05-01',
                'title': 'Armor.fi rebrands to Ease.org',
                'description': 'ArmorFi announced its rebrand to Ease.org and introduced the Uninsurance (Reciprocally-Covered Assets) coverage model as its flagship product.',
                'link': 'https://cointelegraph.com/press-releases/armorfi-becomes-easeorg-to-launch-revolutionary-coverage-model',
            },
            {
                'date': '2022-09-01',
                'title': 'EASE token swap and gvTokenomics launch',
                'description': 'The EASE token and gvTokenomics (gvEASE growing-vote model) launched. Holders could swap ARMOR/vARMOR to EASE/gvEASE at a one-way 1:1 ratio, and the Ease DAO went live.',
                'link': 'https://ease.org/ease-announces-gv-tokenomics/',
            },
        ],
        timeline=[
            {
                'date': '2021-01-31',
                'title': 'Armor.fi announces strategic backers',
                'description': 'Armor announced strategic investors including Collider Ventures, Delphi Ventures, Divergence Ventures, DeFiance Capital, Alameda Research, 1kx, The LAO, Blocksync and Bering Waters Ventures. Early traction cited $250M Nexus Mutual capacity opened and $185M of coverage sold within two days of launch.',
                'link': 'https://medium.com/armorfi/armor-fi-announces-strategic-backers-15631e2ab607',
                'status': 'executed',
            },
            {
                'date': '2022-05-01',
                'title': 'Rebrand to Ease.org + Uninsurance flagship',
                'description': 'Armor rebranded as Ease and introduced Reciprocally-Covered Assets (RCA) / Uninsurance as its flagship product.',
                'link': 'https://cointelegraph.com/press-releases/armorfi-becomes-easeorg-to-launch-revolutionary-coverage-model',
                'status': 'executed',
            },
            {
                'date': '2022-09-01',
                'title': 'EASE token + gvTokenomics + Ease DAO live',
                'description': 'One-way 1:1 ARMOR-to-EASE swap opened; gvEASE growing-vote governance and the Ease DAO launched.',
                'link': 'https://ease.org/ease-announces-gv-tokenomics/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Former name',
                'value': 'Armor.fi (Armor Finance); rebranded to Ease.org in May 2022',
                'freshness': 'static',
                'source': {
                    'label': 'Cointelegraph - ArmorFi becomes Ease.org',
                    'url': 'https://cointelegraph.com/press-releases/armorfi-becomes-easeorg-to-launch-revolutionary-coverage-model',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Coverage model',
                'value': 'Uninsurance / Reciprocally-Covered Assets (RCA): no upfront premium; cost only on a validated hack; deposited assets earn yield and underwrite each other',
                'freshness': 'static',
                'source': {
                    'label': 'OpenCover - Ease DeFi Cover',
                    'url': 'https://opencover.com/ease/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Token migration',
                'value': 'One-way 1:1 swap of ARMOR/vARMOR to EASE/gvEASE; not reversible',
                'freshness': 'static',
                'source': {
                    'label': 'ease.org - The $EASE token swap is live',
                    'url': 'https://ease.org/the-ease-token-swap-is-live/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Governance',
                'value': 'Ease DAO via gvEASE; proposal creation needs 100,000 delegated gvEASE; passing needs 50M affirmative-majority votes; gvEASE power grows linearly to 2x over one year',
                'freshness': 'static',
                'source': {
                    'label': 'ease.org - Governance and DAO knowledge base',
                    'url': 'https://ease.org/learn-crypto-defi/get-defi-cover-at-ease/token-documentation-get-defi-cover-at-ease/governance/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Claims / payout process',
                'value': '~7-day impact assessment window + ~5-day DAO vote on payout validity (~12-13 days typical); confirmed incidents covered automatically without individual loss evidence',
                'freshness': 'static',
                'source': {
                    'label': 'OpenCover - Ease DeFi Cover',
                    'url': 'https://opencover.com/ease/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Founders',
                'value': 'Robert Forster (CEO, RCA whitepaper author, former Armor CTO) and Harry Kikstra',
                'freshness': 'static',
                'source': {
                    'label': 'Ease.org rebrand coverage / Cointelegraph',
                    'url': 'https://cointelegraph.com/press-releases/armorfi-becomes-easeorg-to-launch-revolutionary-coverage-model',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "RCA vaults, gvToken contracts and the underwriting mechanism are on-chain smart contracts; a bug or exploit in Ease's own contracts could cause loss of deposited principal that the coverage system itself cannot backstop.",
            },
            {
                'category': 'Counterparty',
                'description': "Deposited assets are routed into external DeFi protocols to generate yield, so users take on the failure/exploit risk of those underlying protocols and their yield-bearing tokens in addition to Ease's coverage promise.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': "The Uninsurance model has no external reserve or premium float; payouts come from depositors' own pooled capital. A large or correlated hack can exhaust available underwriting capacity, and yield-token cover depends on tokens not diverging from underlying value.",
            },
            {
                'category': 'Governance',
                'description': 'Claim validity and payouts are decided by gvEASE DAO vote rather than an independent adjuster. Concentrated or low-turnout voting, or the high 50M-vote threshold, could lead to disputed, delayed, or captured claim decisions.',
            },
            {
                'category': 'Systemic',
                'description': 'Because members reciprocally underwrite each other, a systemic DeFi event hitting multiple covered protocols simultaneously could trigger correlated claims across many vaults at once, stressing the whole shared-risk pool.',
            },
        ],
        competitors=[
            {
                'name': 'Nexus Mutual',
                'slug': 'nexus-mutual',
                'rank': 1,
                'positioning': 'The largest DeFi cover mutual and the incumbent Ease is most directly measured against; Armor.fi originally resold Nexus Mutual capacity before building RCA.',
                'similarities': 'Both provide member-owned, mutual-style protection against smart-contract hacks and protocol failure in DeFi.',
                'differences': 'Nexus Mutual charges upfront premiums, uses KYC-gated membership and a discretionary claims-assessment vote; Ease charges no premium (cost only on a hack) and covers assets reciprocally with no individual claim filing.',
            },
            {
                'name': 'InsurAce',
                'slug': 'insurace',
                'rank': 2,
                'positioning': "Multi-chain DeFi insurance protocol offering portfolio-based cover; a direct premium-based alternative to Ease's uninsurance.",
                'similarities': 'Both cover smart-contract and protocol-failure risk for DeFi users across multiple protocols.',
                'differences': 'InsurAce uses a traditional premium + capital-pool insurance model with claims assessment, whereas Ease uses premium-free reciprocal coverage where deposits both earn yield and underwrite losses.',
            },
            {
                'name': 'Neptune Mutual',
                'slug': 'neptune-mutual',
                'rank': 3,
                'positioning': 'Parametric DeFi cover marketplace using dedicated cover pools and incident resolution; competes in the same protocol-cover niche.',
                'similarities': 'Both offer cover pools protecting against DeFi hacks/exploits and resolve incidents through a community/governance process.',
                'differences': "Neptune uses a parametric, premium-priced cover marketplace with a resolution/dispute mechanism; Ease's model is premium-free reciprocal underwriting bundled with yield.",
            },
            {
                'name': 'Sherlock',
                'slug': 'sherlock',
                'rank': 4,
                'positioning': 'Audit-plus-coverage model where staked capital backs coverage for specific protocols; an alternative underwriting design.',
                'similarities': 'Both use staked/pooled capital as underwriting collateral to protect protocols against smart-contract exploits.',
                'differences': 'Sherlock couples coverage tightly with security audits and expert claim adjudication and charges protocols premiums; Ease is user-deposit, premium-free reciprocal cover governed by a token DAO.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-01-31',
                'round': 'Strategic backers (undisclosed)',
                'amountUsd': 0,
                'amountLabel': 'Undisclosed',
                'investors': [
                    'Collider Ventures',
                    'Delphi Ventures',
                    'Divergence Ventures',
                    'DeFiance Capital',
                    'Alameda Research',
                    '1kx',
                    'The LAO',
                    'Blocksync',
                    'Bering Waters Ventures',
                ],
                'link': 'https://medium.com/armorfi/armor-fi-announces-strategic-backers-15631e2ab607',
            },
        ],
        audits=[
            {
                'firm': 'HAECHI Audit',
                'date': '2021-01-01',
                'url': 'https://github.com/EaseDeFi/Audits/blob/main/%5BHAECHI%20AUDIT%5D%20Armor%20Smart%20Contract%20Audit%20Report.pdf',
            },
            {
                'firm': 'HAECHI Audit (v2.0)',
                'date': '2021-01-01',
                'url': 'https://github.com/EaseDeFi/Audits/blob/main/%5BHAECHI%20AUDIT%5D%20Armor%20Smart%20Contract%20Audit%20Report%20v2.0%20(1).pdf',
            },
            {
                'firm': 'Dedaub',
                'date': '2022-01-01',
                'url': 'https://github.com/EaseDeFi/Audits',
            },
        ],
        sources=[
            {
                'label': 'Cointelegraph - ArmorFi becomes Ease.org',
                'url': 'https://cointelegraph.com/press-releases/armorfi-becomes-easeorg-to-launch-revolutionary-coverage-model',
            },
            {
                'label': 'ease.org - Armor rebrands as Ease, adds Uninsurance flagship',
                'url': 'https://ease.org/armor-rebrands-as-ease-adds-uninsurance-flagship-product/',
            },
            {
                'label': 'ease.org - Armor releases RCA whitepaper',
                'url': 'https://ease.org/armor-releases-new-whitepaper-for-reciprocally-covered-assets/',
            },
            {
                'label': 'ease.org - gv-Tokenomics announcement',
                'url': 'https://ease.org/ease-announces-gv-tokenomics/',
            },
            {
                'label': 'ease.org - The $EASE token swap is live',
                'url': 'https://ease.org/the-ease-token-swap-is-live/',
            },
            {
                'label': 'ease.org - Governance and DAO knowledge base',
                'url': 'https://ease.org/learn-crypto-defi/get-defi-cover-at-ease/token-documentation-get-defi-cover-at-ease/governance/',
            },
            {
                'label': 'Armor.fi - Strategic backers announcement (Medium)',
                'url': 'https://medium.com/armorfi/armor-fi-announces-strategic-backers-15631e2ab607',
            },
            {
                'label': 'OpenCover - Ease DeFi Cover',
                'url': 'https://opencover.com/ease/',
            },
            {
                'label': 'easedefi.org - product site',
                'url': 'https://www.easedefi.org/',
            },
            {
                'label': 'GitHub - EaseDeFi/Audits',
                'url': 'https://github.com/EaseDeFi/Audits',
            },
            {
                'label': 'GitHub - EaseDeFi/ease-rca',
                'url': 'https://github.com/EaseDeFi/ease-rca',
            },
            {
                'label': 'DeFiLlama - Ease.org',
                'url': 'https://defillama.com/protocol/ease.org',
            },
        ],
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
        components=[
            {
                'name': 'Incentive Auction (VotiumBribe / Deposit contract)',
                'description': 'The marketplace where incentive buyers (protocols) deposit whitelisted ERC20 tokens to reward voters who direct Convex vlCVX (and Curve veCRV) gauge votes toward a chosen pool. Buyers select a payment token, amount, target pool, and (for Curve) which of the next 6 weekly votes to incentivise, and can top up the incentive until the round closes.',
            },
            {
                'name': 'Snapshot Delegation',
                'description': "vlCVX holders delegate their Convex voting power to Votium (votium.eth) once via Snapshot's Gnosis Delegate Registry. Delegation is non-custodial and persists across CVX lock/unlock/buy/sell; Votium then votes delegated power to capture the highest-value incentives each round. veCRV voting rights cannot currently be delegated.",
            },
            {
                'name': 'Multi Merkle Stash (MerkleDistributor)',
                'description': 'An updateable Merkle-airdrop distributor contract (of the type used by Sushi and others) that distributes collected incentives to eligible voters. After a round ends the multisig posts a Merkle root; users claim their share (or let it accrue across rounds to save gas). Deployed on Ethereum at 0x378ba9b73309be80bf4c2c027aad799766a7ed5a.',
            },
            {
                'name': 'Multisig Admin',
                'description': 'A team multisig controls all fund-touching functions across the contracts (VotiumBribe.sol, MerkleDistributor.sol, VotiumVeCRV.sol): setting the maintenance fee (hard-capped at 4%), fee recipient, team permissions, token whitelist, updating Merkle roots, and pausing/resuming claims.',
            },
        ],
        faq=[
            {
                'question': 'What is Votium and does it have its own token?',
                'answer': "Votium is a non-custodial vote-incentive ('bribe') marketplace where protocols pay whitelisted ERC20 rewards to Convex vlCVX and Curve veCRV holders in exchange for directing Curve gauge emissions to their pool. Votium does not have a native governance token.",
                'pinned': True,
            },
            {
                'question': 'How do I earn incentives as a vlCVX holder?',
                'answer': 'Lock CVX as vlCVX and either delegate your Convex voting power to Votium (votium.eth) via Snapshot once — after which Votium votes for the highest-value incentives on every future round automatically — or vote yourself for whichever incentivised pools you prefer. You must be locked and delegated before a proposal starts to be eligible.',
                'pinned': True,
            },
            {
                'question': 'When do rounds run and when are rewards distributed?',
                'answer': 'Convex/vlCVX rounds run bi-weekly, from Thursday 00:00 UTC until Tuesday 00:00 UTC, aligned with Convex gauge-vote proposals. Incentives are distributed within roughly 24-48 hours after a proposal ends via a Merkle airdrop; you can let rewards accumulate before claiming to minimise gas.',
                'pinned': False,
            },
            {
                'question': 'What fees does Votium charge?',
                'answer': 'There are no withdrawal fees and no cost to delegate or vote (aside from gas). A maintenance fee is taken from the incentives themselves; the fee is adjustable by the multisig between 0% and a hard-capped maximum of 4%.',
                'pinned': False,
            },
            {
                'question': 'Is my CVX or CRV at risk when I use Votium?',
                'answer': "Votium is non-custodial — your CVX/CRV is never staked or held by Votium and you always retain custody. Your locked CVX stays on Convex's smart contracts. Residual risk comes from interacting with the delegation registry, the auction contract (buyers) and the Merkle claim contract.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'oo-00',
                'role': 'Lead developer / creator (pseudonymous)',
                'description': "Pseudonymous developer under whose GitHub account (oo-00/Votium) the Votium 'CVX Vote Delegation' Solidity contracts are published. Votium is a community/fair-launched project with no disclosed corporate entity or venture backers.",
            },
            {
                'name': 'Votium Multisig',
                'description': 'Team-controlled multisig that administers all fund-affecting contract functions (fee level up to the 4% cap, fee recipient, team permissions, token whitelist, Merkle-root updates, pausing claims).',
                'role': 'Protocol administration / treasury',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Corporate proxy-vote solicitation / proxy advisory',
                'similarity': 'Like a proxy solicitor gathering shareholder votes for a corporate resolution, Votium aggregates delegated voting power (vlCVX) and directs it in shareholder-style gauge votes on behalf of many small holders who would otherwise not vote.',
                'differences': "Votium voters are explicitly paid ('incentivised') by the parties seeking their votes, distribution is on-chain and permissionless, there is no fiduciary/regulatory framework, and the votes govern emission subsidies rather than corporate control.",
            },
            {
                'product': 'Political lobbying / campaign contributions marketplace',
                'similarity': 'Protocols openly pay to influence how a governance body allocates a shared resource (Curve token emissions), analogous to lobbying spend directed at influencing an appropriations decision.',
                'differences': "Payments are transparent, on-chain, auction-priced per vote, and flow directly to the voters rather than to intermediaries or officials; the 'policy' being bought is purely economic (which liquidity pool gets more CRV rewards).",
            },
        ],
        events=[
            {
                'date': '2023-09-13',
                'title': 'Votium V2 launched',
                'description': 'Votium upgraded to V2, adding support for Convex L2 voting, multi-deposit Zap (multiple incentive deposits in one transaction), a per-vote maximum token amount option for depositors, and optional exclusion addresses. Delegators required no action.',
                'link': 'https://www.binance.com/en/feed/post/2023-09-13-votium-upgrades-to-v2-with-new-features-1141958',
            },
        ],
        timeline=[
            {
                'date': '2021-09-01',
                'title': 'Votium launches as a vlCVX bribe marketplace',
                'description': "Votium went live in September 2021 during the 'Curve Wars', extending the bribe model from Curve's veCRV votes to Convex's vlCVX gauge votes and quickly becoming the dominant hub for Convex vote incentives.",
                'link': 'https://curve.substack.com/p/oct-4-rock-the-votium-',
                'status': 'executed',
            },
            {
                'date': '2021-10-04',
                'title': 'Early rounds surpass $400K in incentives',
                'description': 'Within weeks of launch, a handful of pools had offered bribes totalling roughly $400K on Votium, marking its rapid rise as the leading Convex incentive marketplace.',
                'link': 'https://curve.substack.com/p/oct-4-rock-the-votium-',
                'status': 'executed',
            },
            {
                'date': '2023-09-13',
                'title': 'Votium V2 release',
                'description': 'V2 introduced Convex L2 voting support, Zap multi-deposits, per-vote max amounts, and exclusion addresses, streamlining the depositor experience while keeping delegation unchanged for voters.',
                'link': 'https://x.com/VotiumProtocol/status/1702042593859666210',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Native token',
                'value': 'None — Votium does not have a native or governance token',
                'freshness': 'static',
                'source': {
                    'label': 'Votium Docs — Why Votium',
                    'url': 'https://docs.votium.app/general-information/why-votium',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Maintenance fee',
                'value': 'Adjustable by multisig between 0% and a hard-capped maximum of 4% of incentives; no withdrawal fees and free for delegators/voters (excl. gas)',
                'freshness': 'static',
                'source': {
                    'label': 'Votium Docs — Multisig Admin Rights',
                    'url': 'https://docs.votium.app/faq/multisig-admin-rights',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Round schedule',
                'value': 'vlCVX/Convex rounds bi-weekly, Thursday 00:00 UTC to Tuesday 00:00 UTC; incentives distributed within 24-48h of round end via Merkle airdrop',
                'freshness': 'static',
                'source': {
                    'label': 'Votium Docs — vlCVX FAQ',
                    'url': 'https://docs.votium.app/faq/vlcvx-faq',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Custody model',
                'value': "Non-custodial — CVX/CRV is never staked or held by Votium; users always retain custody; locked CVX remains on Convex's contracts",
                'freshness': 'static',
                'source': {
                    'label': 'Votium Docs — Risks',
                    'url': 'https://docs.votium.app/faq/risks',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Markets covered',
                'value': "Convex vlCVX and Curve veCRV gauge-vote incentives; via Convex's expanded voting power, vlCVX also carries rights over Frax (veFXS/veFPIS) and other ecosystems Convex supports",
                'freshness': 'static',
                'source': {
                    'label': 'Votium Docs — Why Votium',
                    'url': 'https://docs.votium.app/general-information/why-votium',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Multi Merkle Stash contract',
                'value': 'Ethereum mainnet, 0x378ba9b73309be80bf4c2c027aad799766a7ed5a',
                'freshness': 'static',
                'source': {
                    'label': 'Etherscan — Votium Multi Merkle Stash',
                    'url': 'https://etherscan.io/address/0x378ba9b73309be80bf4c2c027aad799766a7ed5a',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Votium is described as experimental software provided 'as is'. Users interact with the auction/deposit contract, the Snapshot/Gnosis delegate registry, and the updateable Merkle airdrop distributor — any bug in these could cause loss of deposited incentives or unclaimed rewards despite an external audit (Blockian).",
            },
            {
                'category': 'Governance',
                'description': 'A team multisig controls all fund-affecting functions — fee level (up to the 4% hard cap), fee recipient, token whitelist, team permissions, and critically the Merkle root and claim pause. A compromised or malicious multisig could post an incorrect root or halt distributions. No public timelock is documented.',
            },
            {
                'category': 'Counterparty',
                'description': "Incentive buyers must trust that delegated/self-directed votes are cast and counted correctly, and voters must trust that Votium computes each round's Merkle distribution honestly and in proportion to delegated vlCVX and incentive size. Distribution is computed off-chain before the root is posted.",
            },
            {
                'category': 'Systemic',
                'description': "Votium is entirely dependent on external systems it does not control: Convex (vlCVX locking and vote power), Curve (gauge weights and the ~10-day cooldown on gauge changes), and Snapshot (delegation and vote signalling). Failure, deprecation, tokenomics changes, or governance shifts in Convex or Curve directly impair Votium's usefulness and reward flow.",
            },
            {
                'category': 'Regulatory',
                'description': "The core activity — paying token holders in exchange for how they vote in protocol governance ('vote buying') — sits in an unsettled legal/regulatory area for DAO governance and could attract scrutiny; participants bear this uncertainty.",
            },
        ],
        competitors=[
            {
                'name': 'Hidden Hand',
                'slug': 'hidden-hand',
                'rank': 1,
                'positioning': 'Multi-ecosystem vote-incentive marketplace by Redacted Cartel, using off-chain distribution like Votium.',
                'similarities': 'Same core model — protocols post incentives, voters get paid to direct gauge/emission votes; off-chain reward distribution; overlaps on Curve/Convex-style markets.',
                'differences': 'Hidden Hand spans many veTokenomics ecosystems (Balancer/Aura, Frax, etc.) under one marketplace, whereas Votium is centered on Convex vlCVX (and Curve veCRV).',
            },
            {
                'name': 'Stake DAO Votemarket',
                'slug': 'stake-dao',
                'rank': 2,
                'positioning': 'On-chain vote-incentive marketplace (Votemarket / Votemarket v2) for Curve, Balancer and other gauges.',
                'similarities': 'Directly competes for the same Curve gauge-vote incentive flow, including vlCVX/wrapper voters; campaign-based incentives for gauge votes.',
                'differences': "Votemarket distributes rewards on-chain (v2 removes weekly claims and can incentivise both direct lockers and wrapper voters), versus Votium's off-chain-computed Merkle airdrops focused on delegated vlCVX.",
            },
            {
                'name': 'Paladin',
                'slug': 'paladin',
                'rank': 3,
                'positioning': 'Governance-power platform combining vote-incentive quests (Warden/Quest) with governance-power lending (PalPools) and the WAR index.',
                'similarities': "Runs a gauge-vote incentive market for CVX/AURA voters overlapping Votium's audience.",
                'differences': "Paladin is a broader 'one-stop shop' — borrowing/renting governance power and an automated vote-incentive index — rather than a pure Convex bribe marketplace; Quest uses fixed price-per-vote campaigns.",
            },
        ],
        audits=[
            {
                'firm': 'Blockian',
                'date': '',
                'url': 'https://docs.votium.app/faq/audits',
            },
        ],
        sources=[
            {
                'label': 'Votium Docs — Home',
                'url': 'https://docs.votium.app',
            },
            {
                'label': 'Votium Docs — How It Works (The Auction)',
                'url': 'https://docs.votium.app/general-information/the-auction',
            },
            {
                'label': 'Votium Docs — Why Votium',
                'url': 'https://docs.votium.app/general-information/why-votium',
            },
            {
                'label': 'Votium Docs — vlCVX FAQ',
                'url': 'https://docs.votium.app/faq/vlcvx-faq',
            },
            {
                'label': 'Votium Docs — Risks',
                'url': 'https://docs.votium.app/faq/risks',
            },
            {
                'label': 'Votium Docs — Multisig Admin Rights',
                'url': 'https://docs.votium.app/faq/multisig-admin-rights',
            },
            {
                'label': 'Votium Docs — Audits',
                'url': 'https://docs.votium.app/faq/audits',
            },
            {
                'label': 'GitHub — oo-00/Votium (CVX Vote Delegation)',
                'url': 'https://github.com/oo-00/Votium',
            },
            {
                'label': 'Etherscan — Votium Multi Merkle Stash',
                'url': 'https://etherscan.io/address/0x378ba9b73309be80bf4c2c027aad799766a7ed5a',
            },
            {
                'label': 'Curve.substack — Oct 4 2021: Rock the Votium',
                'url': 'https://curve.substack.com/p/oct-4-rock-the-votium-',
            },
            {
                'label': 'Binance News — Votium Upgrades to V2 (2023-09-13)',
                'url': 'https://www.binance.com/en/feed/post/2023-09-13-votium-upgrades-to-v2-with-new-features-1141958',
            },
            {
                'label': 'Votium on X — V2 announcement',
                'url': 'https://x.com/VotiumProtocol/status/1702042593859666210',
            },
            {
                'label': 'Stake DAO — Votemarket',
                'url': 'https://votemarket.stakedao.org/',
            },
            {
                'label': 'Paladin — Home',
                'url': 'https://paladin.vote/',
            },
        ],
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
        github="https://github.com/oo-00/Votium",
    ),
    "hidden-hand": _net(
        components=[
            {
                'name': 'Hidden Hand marketplace',
                'description': 'A generalized governance-incentives (bribe) marketplace by Redacted where protocols deposit incentives to sway vote-escrow gauge/emissions voting, and voters/delegators earn those incentives. Runs separate markets per host ecosystem (Balancer, Aura, Frax, and others).',
            },
            {
                'name': 'Redacted (Redacted Cartel / Dinero)',
                'description': 'The DAO/organization behind Hidden Hand, originally an OlympusDAO (OHM) fork that launched the BTRFLY reserve-currency token in December 2021 and later pivoted to a fixed-supply, revenue-focused model. Now operates under the Dinero brand.',
            },
            {
                'name': 'BTRFLY / rlBTRFLY',
                'description': 'Governance token of the Redacted ecosystem. BTRFLY v2 has a capped supply (~650,000). Revenue-locked BTRFLY (rlBTRFLY) lockers receive a share of Hidden Hand and other product fees.',
            },
            {
                'name': 'Pirex',
                'description': "Redacted's token-securitization / liquid-wrapper product line. It wraps locked governance tokens (e.g. pxCVX for Convex CVX, plus pxGMX/pxGLP) into liquid tokens and offers auto-compounding and bribe-capture strategies.",
            },
            {
                'name': 'Dinero / Pirex ETH (pxETH, apxETH)',
                'description': "Redacted's ETH-staking and stablecoin stack. Pirex ETH went live December 13, 2023, using a two-token model (pxETH for liquidity, apxETH for boosted staking yield) underpinning the Dinero overcollateralized stablecoin.",
            },
        ],
        faq=[
            {
                'question': 'What is Hidden Hand?',
                'answer': 'Hidden Hand is a governance-incentives (bribe) marketplace built by Redacted. Protocols deposit incentives to attract votes in vote-escrow (ve) gauge and emissions systems, and vote-escrow token holders who delegate or vote earn those incentives. It generalized the earlier Votemak/Tokemak model to serve many DeFi protocols.',
                'pinned': True,
            },
            {
                'question': 'What fee does Hidden Hand charge?',
                'answer': 'Hidden Hand takes a 4% fee on incentive (bribe) revenue, so voters/delegators receive 96%. The 4% protocol fee has been distributed roughly 35% to the treasury, 50% to rlBTRFLY lockers, and 15% to the DAO Reserve. There is no cost for voters to use the platform.',
                'pinned': True,
            },
            {
                'question': 'Which ecosystems does Hidden Hand support?',
                'answer': 'Hidden Hand runs separate incentive markets across multiple vote-escrow ecosystems, including Balancer, Aura, and Frax, and historically served protocols such as Tokemak and Ribbon. It acts as an aggregator that consolidates ve-token voting power and routes it toward the highest incentives.',
                'pinned': False,
            },
            {
                'question': 'Where did Hidden Hand come from?',
                'answer': "Redacted acquired Votemak (a bribe marketplace built on Tokemak) in January 2022 and launched Hidden Hand later that month, generalizing Votemak's mechanics into a marketplace usable by any ve-token protocol.",
                'pinned': False,
            },
            {
                'question': 'Is Hidden Hand shutting down?',
                'answer': 'Yes. Citing declining platform activity and rising infrastructure costs, the team announced Hidden Hand would wind down. Per its official channels, new markets could be created through December 31, 2025, followed by a claims-only period from January 1 to June 30, 2026, during which previously earned rewards remain claimable.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Redacted (Redacted Cartel / Dinero)',
                'role': 'Parent protocol / DAO',
                'description': 'The organization that builds and operates Hidden Hand alongside Pirex and Dinero. Governed by BTRFLY holders and rlBTRFLY lockers; rebranded toward the Dinero identity as its ETH-staking and stablecoin products grew.',
            },
            {
                'name': 'rlBTRFLY lockers',
                'role': 'Revenue-sharing governance participants',
                'description': "Holders who lock BTRFLY into rlBTRFLY to receive a share of protocol revenue, including a portion of Hidden Hand's 4% incentive fee.",
            },
            {
                'name': 'Founding team & DAO Reserve',
                'role': 'Core contributors / treasury',
                'description': 'BTRFLY v2 allocated 9% to the founding team and 15% to the DAO Reserve, with additional allocations to Olympus DAO (10%) and investors (6%). The DAO Reserve receives part of Hidden Hand fees.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Corporate lobbying / political action committees',
                'similarity': 'Hidden Hand is a marketplace where interested parties pay to influence governance outcomes (which pools receive token emissions), analogous to paying to influence votes and policy.',
                'differences': 'All incentive flows are transparent on-chain and permissionless; payments (incentives) are paid directly to the voters/delegators rather than to intermediaries or campaigns, and outcomes are enforced by smart-contract gauge weights rather than legislation.',
            },
            {
                'product': 'Proxy-advisory firms (e.g. ISS/Glass Lewis) and vote aggregation',
                'similarity': 'Like a proxy advisor aggregating shareholder votes, Hidden Hand consolidates delegated ve-token voting power and directs it, helping vote-holders monetize and coordinate their governance rights.',
                'differences': 'Hidden Hand explicitly auctions the vote direction to the highest incentive rather than recommending votes on governance merits, and it is non-custodial and fully automated on-chain.',
            },
        ],
        events=[
            {
                'date': '2022-01-01',
                'title': 'Redacted acquires Votemak and launches Hidden Hand',
                'description': 'Redacted acquired Votemak (a Tokemak-based bribe marketplace) in January 2022 and introduced Hidden Hand, generalizing the model into a bribe marketplace usable by any ve-token DeFi protocol.',
                'link': 'https://medium.com/despread-global/redacted-cartel-6e8885bbaa38',
            },
            {
                'date': '2023-12-13',
                'title': 'Pirex ETH goes live (Dinero foundation)',
                'description': 'Redacted launched Pirex ETH on Ethereum mainnet with the two-token pxETH/apxETH model, forming the foundation of the Dinero overcollateralized stablecoin protocol.',
                'link': 'https://coinmarketcap.com/academy/article/what-is-redacted-cartel-s-decentralized-stablecoin-dinero',
            },
        ],
        timeline=[
            {
                'date': '2021-12-01',
                'title': 'Redacted (BTRFLY) launches as an OlympusDAO fork',
                'description': 'Redacted debuted in December 2021 as an official OlympusDAO fork, raising roughly $73.2M via a token issuance auction for the BTRFLY token before later moving to a fixed-supply v2 model.',
                'link': 'https://medium.com/despread-global/redacted-cartel-6e8885bbaa38',
                'status': 'executed',
            },
            {
                'date': '2022-01-01',
                'title': 'Votemak acquisition and Hidden Hand launch',
                'description': "Hidden Hand launched in January 2022 following Redacted's acquisition of Votemak, initially targeting ecosystems including Tokemak, Frax, Balancer and Ribbon.",
                'link': 'https://medium.com/despread-global/redacted-cartel-6e8885bbaa38',
                'status': 'executed',
            },
            {
                'date': '2025-12-31',
                'title': 'Last day for new Hidden Hand markets (wind-down)',
                'description': "Per the wind-down announced on Hidden Hand's official channels, new incentive markets could be created through December 31, 2025.",
                'link': 'https://hiddenhand.finance/',
                'status': 'executed',
            },
            {
                'date': '2026-06-30',
                'title': 'End of Hidden Hand claims-only period',
                'description': 'From January 1 to June 30, 2026 Hidden Hand operated in claims-only mode with no new markets; previously earned rewards remained claimable until this deadline.',
                'link': 'https://hiddenhand.finance/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Incentive (bribe) fee',
                'value': '4% protocol fee on incentives; voters/delegators receive 96%',
                'freshness': 'static',
                'source': {
                    'label': 'DeSpread Research — Redacted Cartel report',
                    'url': 'https://research.despread.io/reports-redacted/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Fee distribution',
                'value': '~35% treasury / 50% rlBTRFLY lockers / 15% DAO Reserve',
                'freshness': 'static',
                'source': {
                    'label': 'DeSpread Research — Redacted Cartel report',
                    'url': 'https://research.despread.io/reports-redacted/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Supported ecosystems',
                'value': 'Balancer, Aura, Frax (plus historical Tokemak, Ribbon)',
                'freshness': 'static',
                'source': {
                    'label': 'Hidden Hand markets',
                    'url': 'https://hiddenhand.finance/markets',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Origin',
                'value': 'Launched Jan 2022 after Redacted acquired Votemak (Tokemak-based bribe market)',
                'freshness': 'static',
                'source': {
                    'label': 'DeSpread Research — Redacted Cartel report',
                    'url': 'https://medium.com/despread-global/redacted-cartel-6e8885bbaa38',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Governance token',
                'value': 'BTRFLY (v2 capped supply ~650,000); rlBTRFLY for revenue lockers',
                'freshness': 'static',
                'source': {
                    'label': 'DeSpread Research — Redacted Cartel report',
                    'url': 'https://research.despread.io/reports-redacted/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Wind-down status',
                'value': 'Winding down: new markets ended 2025-12-31; claims-only through 2026-06-30',
                'freshness': 'static',
                'source': {
                    'label': 'Hidden Hand',
                    'url': 'https://hiddenhand.finance/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Governance',
                'description': "Hidden Hand's entire value proposition is monetizing governance influence. By auctioning vote direction to the highest incentive, it can misalign gauge/emissions outcomes from protocol fundamentals and concentrate influence in whoever pays most, a form of governance capture in the host ecosystems (Balancer, Aura, Frax).",
            },
            {
                'category': 'Smart Contract',
                'description': 'Incentive deposits, vote accounting, and reward claims run through Hidden Hand smart contracts (v1 and v2, plus the Marionette/adapter contracts). Bugs or exploits in these contracts, or in the off-chain reward-computation architecture, could lead to loss or misallocation of deposited incentives.',
            },
            {
                'category': 'Counterparty',
                'description': "Rewards depend on an off-chain process that computes vote-weighted distributions and posts claimable merkle data; users rely on Redacted's operational integrity and continued service. This dependency is sharpened by the wind-down, after which the platform stops operating and unclaimed rewards may be forfeited once the claims window closes.",
            },
            {
                'category': 'Systemic',
                'description': "Hidden Hand is tightly coupled to the ve-token 'Curve wars' incentive economy (Convex/Votium, Balancer/Aura, Frax). Declining bribe demand, ve-token depreciation, or contraction of that meta-governance economy directly reduces Hidden Hand volume and fee revenue, a dynamic the team cited when announcing the shutdown.",
            },
            {
                'category': 'Regulatory',
                'description': "Explicit vote-buying ('bribe') marketplaces occupy an uncertain legal/regulatory position; incentivized-governance and vote-payment models could attract scrutiny that affects the marketplace or its users.",
            },
        ],
        competitors=[
            {
                'name': 'Votium',
                'slug': 'votium',
                'rank': 1,
                'positioning': 'The leading bribe marketplace focused on Convex (vlCVX) and Curve (veCRV) vote incentives.',
                'similarities': 'Non-custodial incentive marketplace where protocols pay to direct ve-token votes and voters/delegators earn the incentives; charges a percentage fee.',
                'differences': 'Votium is concentrated on the Convex/Curve stack (fees around 4% on vlCVX and 2% on veCRV bribes), whereas Hidden Hand generalized across many ve-ecosystems (Balancer, Aura, Frax) with a flat 4% fee.',
            },
            {
                'name': 'Paladin',
                'slug': 'paladin',
                'rank': 2,
                'positioning': 'Governance-power marketplace offering vote-power lending (PalPools) and the Quest fixed-rate voting-incentive product (Warden).',
                'similarities': 'Also a vote-incentive marketplace covering ve-ecosystems like Balancer and Convex, competing for the same incentive spend and delegated voting power.',
                'differences': "Paladin's Quest lets bribers set a predictable $/vote rate (a hedge against round volatility) and it also enables borrowing/lending of governance power; it even optimizes delegations across Quest, Votium and Hidden Hand.",
            },
            {
                'name': 'Stake DAO',
                'slug': 'stake-dao',
                'rank': 3,
                'positioning': 'Liquid-locker and vote-incentive platform operating within the Curve/Balancer/Frax vote-escrow economy.',
                'similarities': 'Participates in the same ve-token meta-governance and vote-incentive economy, capturing and redistributing bribe/incentive rewards to depositors.',
                'differences': 'Stake DAO centers on liquid lockers (sdTokens) and vault products with integrated incentive capture, rather than being a standalone open bribe marketplace like Hidden Hand.',
            },
        ],
        audits=[
            {
                'firm': 'Code4rena / Kebabsec / Keyko (Hidden Hand v1)',
                'date': '2022-01-01',
                'url': 'https://github.com/redacted-cartel/audits',
            },
            {
                'firm': 'Spearbit (Hidden Hand v2 and off-chain architecture)',
                'date': '2022-01-01',
                'url': 'https://github.com/redacted-cartel/audits',
            },
            {
                'firm': 'Verilog (Marionette and Thena adapter)',
                'date': '2022-01-01',
                'url': 'https://github.com/redacted-cartel/audits',
            },
        ],
        sources=[
            {
                'label': 'DeSpread Research — Redacted Cartel: The Hidden Hand of the DeFi World',
                'url': 'https://research.despread.io/reports-redacted/',
            },
            {
                'label': 'DeSpread (Medium) — Redacted Cartel',
                'url': 'https://medium.com/despread-global/redacted-cartel-6e8885bbaa38',
            },
            {
                'label': 'Hidden Hand — marketplace site',
                'url': 'https://hiddenhand.finance/',
            },
            {
                'label': 'Hidden Hand — markets',
                'url': 'https://hiddenhand.finance/markets',
            },
            {
                'label': 'Redacted / Dinero audits repository',
                'url': 'https://github.com/redacted-cartel/audits',
            },
            {
                'label': "CoinMarketCap Academy — Redacted Cartel's stablecoin Dinero (Pirex ETH launch)",
                'url': 'https://coinmarketcap.com/academy/article/what-is-redacted-cartel-s-decentralized-stablecoin-dinero',
            },
            {
                'label': 'Multifarm — Hidden Hand deep dive',
                'url': 'https://medium.com/@multifarm_fi/hidden-hand-by-redacted-cartel-516ba4b5ebc8',
            },
            {
                'label': 'Exponential DeFi — Votium',
                'url': 'https://exponential.fi/protocols/votium/a680cb9e-a0e1-4d83-a465-607ade75fadd',
            },
        ],
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
        components=[
            {
                'name': 'Quest (v2)',
                'description': "Paladin's flagship gauge-vote incentive marketplace. Incentive providers create a 'Quest' targeting a specific gauge, set a target amount of votes and a reward budget in whitelisted tokens over a fixed duration, which fixes the cost-per-vote in advance. Rewards are distributed to voters who fill the target (sorted oldest-to-newest vote); unfilled budget is refundable. Supports Curve (veCRV), Balancer, Bunni, and f(x) Protocol gauges.",
            },
            {
                'name': 'Warlord (WAR / stkWAR)',
                'description': 'A yield-bearing governance index over the Convex (CVX) and Aura (AURA) ecosystems. Users mint the WAR token by depositing CVX and/or AURA; the underlying is vote-locked and delegated by Paladin to optimize vote incentives. Staking WAR (stkWAR) earns rewards distributed in WETH, with BAL/CRV harvested as auraBAL/cvxCRV and any AURA/CVX auto-compounded into more WAR. Launched June 2023.',
            },
            {
                'name': 'hPAL (Holy PAL) liquid staking / locker',
                'description': 'The governance token of Paladin DAO, minted 1:1 by staking PAL. hPAL accrues PAL rewards and can be locked for 3 months to 2 years for boosted rewards (up to a x6 multiplier at 2-year lock) and enhanced voting power (locks over 1 year grant +50% voting power). Staking withdrawal requires a 10-day cooldown plus a 2-day unstaking window.',
            },
            {
                'name': 'Paladin Lending (PalPools)',
                'description': 'The original non-custodial governance lending market. Lenders deposit a governance token into a PalPool and receive a yield-bearing PalToken (ERC20); borrowers rent voting power via a PalLoan clone contract that delegates governance power to them without transferring the underlying tokens. PalLoan ownership is represented by a transferable PalLoanToken (ERC721). Initial assets targeted UNI, COMP and AAVE.',
            },
            {
                'name': 'Autovoter / Delegation',
                'description': 'A delegation service where holders of vote-locked tokens (vlCVX, vlAURA, vlLIQ) delegate voting power to Paladin, which optimizes vote allocation across incentive platforms to maximize yield while reducing gas cost and dilution.',
            },
            {
                'name': 'Dullahan',
                'description': 'A vault product generating passive income for stkAAVE holders and offering reduced interest rates for GHO borrowers on Aave. Audited by Pessimistic in April 2023.',
            },
        ],
        faq=[
            {
                'question': 'What is Paladin?',
                'answer': "Paladin is a DeFi ecosystem of governance protocols and markets that unlock the value of on-chain voting power. Its products let token holders lend, delegate, incentivize, or index governance power, turning votes into a yield-bearing 'money lego'. Core products include the Quest vote-incentive marketplace, the Warlord (WAR) governance index, hPAL liquid staking, and Paladin Lending.",
                'pinned': True,
            },
            {
                'question': 'How is Quest different from a bribe marketplace like Votium?',
                'answer': 'Quest calculates the value of a vote in advance, so an incentive provider fixes a cost-per-vote and total budget before the round. Rewards go to voters who fill the target objective (sorted oldest-to-newest), rewarding loyalty, and any unfilled budget is refundable pro-rata. Unlike Votium-style auctions where you can be outbid and lose your spend, Quest gives predictable pricing and returns unused budget.',
                'pinned': False,
            },
            {
                'question': 'What is the WAR token and how does Warlord work?',
                'answer': "WAR is a governance index token minted by depositing CVX and/or AURA. Warlord vote-locks the underlying and delegates it to earn vote incentives. Staking WAR (stkWAR) pays rewards in WETH, harvests BAL/CRV as auraBAL/cvxCRV, and auto-compounds earned AURA/CVX into more WAR. Users redeem WAR for the underlying, which is queued for each asset's unlock date.",
                'pinned': False,
            },
            {
                'question': 'What are PAL and hPAL?',
                'answer': "PAL is Paladin's native governance token. hPAL (Holy PAL) is the staked/locked version used to govern Paladin DAO: staking PAL mints hPAL 1:1 and accrues PAL rewards, while locking hPAL for 3 months to 2 years boosts rewards (up to x6) and grants extra voting power. Staked hPAL requires a 10-day cooldown plus 2-day unstaking window to withdraw.",
                'pinned': False,
            },
            {
                'question': 'How does Paladin Lending let you borrow voting power?',
                'answer': 'Depositors put a governance token into a PalPool and receive a PalToken representing their share plus yield. A borrower opens a PalLoan, a clone contract that holds the borrowed tokens and delegates their voting power to the borrower for the loan duration, without ever transferring the underlying tokens to the borrower directly.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Romain Figuereo',
                'role': 'Founder',
                'description': "Founder of Paladin, based in Paris, France. Led the protocol's development of a vote lending market and its $2.55M seed round in 2021.",
            },
            {
                'name': 'Paladin DAO',
                'role': 'Governance body',
                'description': 'The DAO that governs the Paladin protocol, controlled by hPAL (Holy PAL) holders who vote on key decisions via the governance forum (gov.paladin.vote). Locked hPAL over 1 year receives +50% voting power.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Proxy-vote solicitation / proxy advisory market',
                'similarity': "Like a proxy solicitation firm that gathers shareholder votes behind a resolution, Paladin's Quest lets a project pay to align governance voters (veCRV/gauge voters) behind a specific outcome, and its delegation/Autovoter aggregates voting power much like a proxy advisor concentrates votes.",
                'differences': 'Everything is on-chain, permissionless and priced by a transparent per-vote formula rather than negotiated advisory fees; votes are rented or incentivized directly via smart contracts rather than solicited through registered intermediaries, and there is no regulatory proxy-statement regime.',
            },
            {
                'product': 'Securities lending',
                'similarity': "Paladin Lending mirrors securities lending: a holder lends out an asset's embedded rights (here, voting power) to a borrower for a fee/yield while the position stays economically theirs, comparable to lending shares so a borrower can vote or short.",
                'differences': 'Only the voting/governance right is transferred via delegation (the underlying tokens never leave the pool), it is non-custodial and collateral-managed by smart contracts, and there is no central agent-lender or recall mechanism.',
            },
        ],
        events=[
            {
                'date': '2022-05-17',
                'title': 'Quest vote-incentive platform announced',
                'description': 'Paladin unveiled Quest, a gauge solution and boost marketplace to help protocols align veCRV holders, calculating vote value in advance and refunding unfilled budgets. Initially focused on Curve.',
                'link': 'https://keep.paladin.vote/blog/lets-go-on-a-quest/',
            },
            {
                'date': '2023-06-01',
                'title': 'Warlord (WAR) launched',
                'description': 'Paladin launched Warlord, a yield-bearing governance index over CVX and AURA. Users mint WAR from CVX/AURA and stake for WETH rewards and auto-compounded governance yield.',
                'link': 'https://keep.paladin.vote/blog/unleashing-warlord/',
            },
        ],
        timeline=[
            {
                'date': '2021-09-30',
                'title': '$2.55M seed round announced',
                'description': 'Paladin raised a $2.55M seed round led by Greenfield One, with Galaxy Digital, NFX, Semantic and ~20 angels, to build its vote lending market.',
                'link': 'https://www.prnewswire.com/news-releases/2-55m-seed-of-paladins-ecosystem-championing-open-activism-in-decentralized-governance-301388884.html',
                'status': 'executed',
            },
            {
                'date': '2022-05-17',
                'title': 'Quest launched for Curve gauge voting',
                'description': 'Quest released as a per-vote-priced incentive marketplace for veCRV gauge voting, later expanding to Balancer, Bunni and f(x) Protocol.',
                'link': 'https://keep.paladin.vote/blog/lets-go-on-a-quest/',
                'status': 'executed',
            },
            {
                'date': '2023-06-01',
                'title': 'Warlord (WAR governance index) launched',
                'description': 'Launch of the WAR index over CVX and AURA with stkWAR staking paying WETH and auto-compounding governance rewards.',
                'link': 'https://keep.paladin.vote/blog/unleashing-warlord/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Founder',
                'value': 'Romain Figuereo',
                'freshness': 'static',
                'source': {
                    'label': 'PR Newswire seed announcement',
                    'url': 'https://www.prnewswire.com/news-releases/2-55m-seed-of-paladins-ecosystem-championing-open-activism-in-decentralized-governance-301388884.html',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Headquarters',
                'value': 'Paris, France',
                'freshness': 'static',
                'source': {
                    'label': 'FinSMEs seed funding report',
                    'url': 'https://www.finsmes.com/2021/10/paladin-raises-2-55m-in-seed-funding.html',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Governance token',
                'value': 'PAL (staked/locked as hPAL for Paladin DAO governance)',
                'freshness': 'static',
                'source': {
                    'label': 'Paladin Docs - Holy PAL (hPAL)',
                    'url': 'https://docs.paladin.vote/governance/holy-pal-hpal',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'hPAL emissions schedule',
                'value': '100,000 PAL/month initially, declining to 25,000 PAL/month over 2 years',
                'freshness': 'static',
                'source': {
                    'label': 'Paladin Docs - Holy PAL (hPAL)',
                    'url': 'https://docs.paladin.vote/governance/holy-pal-hpal',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Quest supported venues',
                'value': 'Curve, Balancer, Bunni, f(x) Protocol gauges',
                'freshness': 'dynamic',
                'source': {
                    'label': 'Paladin Docs - Overview',
                    'url': 'https://docs.paladin.vote/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Paladin runs multiple interacting contract systems (PalPools/PalLoans, Quest, Warlord/WAR, hPAL staking/locking). Code4rena contests found high- and medium-severity issues (e.g. 2 HIGH + 14 MEDIUM in the 2022 Holy PAL contest), so bugs in delegation, minting or reward accounting remain a core risk.',
            },
            {
                'category': 'Governance',
                'description': "The protocol and products (e.g. Warlord asset inclusion, resource allocation via PGM proposals) are governed by hPAL voters. Concentration of hPAL or captured proposals could redirect delegated voting power or treasury resources against smaller holders' interests.",
            },
            {
                'category': 'Counterparty',
                'description': 'Warlord and the Autovoter delegate user voting power to a Paladin-controlled delegation address that manages CVX/AURA/vlLIQ locks and claims WETH incentives. Users rely on that operator to vote optimally and distribute rewards honestly; mismanagement or a compromised delegate address is a direct counterparty risk.',
            },
            {
                'category': 'Systemic',
                'description': "Paladin's revenue and product utility depend heavily on the external 'vote market' meta around Curve, Convex, Aura and Balancer. A collapse in gauge-vote demand, veTOKEN emissions, or the underlying DEXs would sharply reduce vote-incentive value flowing through Quest and Warlord.",
            },
            {
                'category': 'Collateral',
                'description': "WAR is backed by illiquid vote-locked CVX and AURA that unlock only on staggered schedules. Redeeming WAR queues withdrawals to each asset's unlock date, so holders face lock-up/exit-liquidity risk and potential discount to backing during stress.",
            },
        ],
        competitors=[
            {
                'name': 'Votium',
                'slug': 'votium',
                'rank': 1,
                'positioning': 'Incumbent vote-incentive (bribe) marketplace concentrated on the Convex/vlCVX (Curve) ecosystem.',
                'similarities': 'Both let protocols pay veTOKEN/gauge voters to direct emissions, and both aggregate voting power in the Curve/Convex meta.',
                'differences': 'Votium uses a periodic auction where bribers can be outbid; Paladin Quest fixes cost-per-vote in advance, rewards loyal voters, and refunds unfilled budget, and Paladin adds a broader stack (lending, WAR index, hPAL).',
            },
            {
                'name': 'Hidden Hand',
                'slug': 'hidden-hand',
                'rank': 2,
                'positioning': 'Multi-protocol incentive/bribe marketplace (Redacted Cartel) spanning Balancer/Aura, Frax and other gauge ecosystems.',
                'similarities': 'Direct competitor to Quest as a marketplace for directing gauge votes across multiple DEXs including Balancer and Aura.',
                'differences': 'Hidden Hand is auction-priced and marketplace-only; Paladin offers deterministic per-vote pricing plus vertically integrated products (Warlord index, delegation, lending).',
            },
            {
                'name': 'Stake DAO',
                'slug': 'stake-dao',
                'rank': 3,
                'positioning': 'Liquid-locker and governance-yield platform (sdTokens, Votemarket) across Curve, Balancer, Angle and more.',
                'similarities': 'Overlaps with Paladin on liquid lockers, vote-incentive markets (Votemarket vs Quest) and governance-yield indexing.',
                'differences': "Stake DAO centers on sdToken liquid lockers and its own veToken accumulation; Paladin's flagship is the Quest incentive market plus the CVX/AURA-backed WAR index and PalPool lending.",
            },
        ],
        investment_rounds=[
            {
                'date': '2021-09-30',
                'round': 'Seed',
                'amountUsd': 2550000,
                'amountLabel': '$2.55M',
                'investors': [
                    'Greenfield One (lead)',
                    'Galaxy Digital',
                    'NFX',
                    'Semantic',
                    '~20 angel investors',
                ],
                'link': 'https://www.prnewswire.com/news-releases/2-55m-seed-of-paladins-ecosystem-championing-open-activism-in-decentralized-governance-301388884.html',
            },
        ],
        audits=[
            {
                'firm': 'Pessimistic',
                'date': '2021-10-01',
                'url': 'https://github.com/pessimistic-io/audits/blob/914e35fdfc879451a61d2a3969f3be839b8c808f/Paladin%20Security%20Analysis%20by%20Pessimistic.pdf',
            },
            {
                'firm': 'Code4rena',
                'date': '2022-04-02',
                'url': 'https://code4rena.com/reports/2022-03-paladin',
            },
            {
                'firm': 'Spearbit',
                'date': '2022-05-01',
                'url': 'https://github.com/PaladinFinance/Warden-Quest/blob/main/audit/Spearbit%20-%20Quest%20audit.pdf',
            },
            {
                'firm': 'Code4rena',
                'date': '2022-10-30',
                'url': 'https://code4rena.com/reports/2022-10-paladin',
            },
            {
                'firm': 'Pessimistic',
                'date': '2023-04-01',
                'url': 'https://github.com/PaladinFinance/Dullahan/blob/main/audit/Paladin%20Dullahan%20Security%20Analysis%20by%20Pessimistic.pdf',
            },
        ],
        sources=[
            {
                'label': 'Paladin Docs - Overview',
                'url': 'https://docs.paladin.vote/',
            },
            {
                'label': 'Paladin Docs - Holy PAL (hPAL)',
                'url': 'https://docs.paladin.vote/governance/holy-pal-hpal',
            },
            {
                'label': 'Paladin Docs - Paladin Lending protocol overview',
                'url': 'https://docs.paladin.vote/paladin-lending/protocol-overview',
            },
            {
                'label': 'Paladin Docs - Audits',
                'url': 'https://docs.paladin.vote/deployed-contracts/audits',
            },
            {
                'label': "Paladin Keep blog - Let's go on a Quest",
                'url': 'https://keep.paladin.vote/blog/lets-go-on-a-quest/',
            },
            {
                'label': 'Paladin Keep blog - Unleashing Warlord',
                'url': 'https://keep.paladin.vote/blog/unleashing-warlord/',
            },
            {
                'label': 'PR Newswire - $2.55M seed round',
                'url': 'https://www.prnewswire.com/news-releases/2-55m-seed-of-paladins-ecosystem-championing-open-activism-in-decentralized-governance-301388884.html',
            },
            {
                'label': 'FinSMEs - Paladin raises $2.55M seed',
                'url': 'https://www.finsmes.com/2021/10/paladin-raises-2-55m-in-seed-funding.html',
            },
            {
                'label': 'Code4rena - 2022-03 Paladin contest report',
                'url': 'https://code4rena.com/reports/2022-03-paladin',
            },
            {
                'label': 'Code4rena - 2022-10 Warden Pledges contest report',
                'url': 'https://code4rena.com/reports/2022-10-paladin',
            },
            {
                'label': 'DefiLlama - Paladin Warlord',
                'url': 'https://defillama.com/protocol/paladin-warlord',
            },
            {
                'label': 'GitHub - PaladinFinance org',
                'url': 'https://github.com/PaladinFinance',
            },
        ],
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
        components=[
            {
                'name': 'Liquid Lockers',
                'description': 'Users deposit vote-escrow governance tokens (CRV, BAL, FXS, PENDLE, ANGLE, etc.) and receive liquid, transferable sdTokens (sdCRV, sdBAL, sdFXS, sdPENDLE...) in return. The protocol perpetually re-locks the underlying at max lock, so sdTokens retain governance power, maximized yield, and vote-incentive rewards without the user having to lock. sdTokens remain liquid via DEX pools, so holders can exit to the underlying without waiting for a lock to expire.',
            },
            {
                'name': 'Strategies / Vaults',
                'description': "Auto-compounding vaults that deposit LP tokens (e.g. Curve, Balancer, Pendle LPs) and leverage the protocol's aggregated veToken balances (from the Liquid Lockers) to earn boosted rewards across multiple chains, socializing the boost among depositors.",
            },
            {
                'name': 'Votemarket',
                'description': 'A permissionless on-chain vote-incentive (bribe) marketplace where protocols create campaigns paying token rewards in exchange for gauge votes, and voters claim the incentives. Votemarket v2 (launched Nov 2024) uses storage proofs and an Arbitrum L2 architecture to cut gas, supports multi-week reward distribution (no weekly claims), covers both direct veToken holders and wrapper voters (vlCVX/vlAURA), and adds fallback strategies and point-based incentives.',
            },
            {
                'name': 'SDT / veSDT / vlSDT',
                'description': "SDT is the protocol's governance and value-capture token (100M max supply). Historically SDT was locked into veSDT (vote-escrowed, decaying) to boost sdToken voting power up to 2.5x and to govern the DAO. In 2026 governance approved a migration to vlSDT (vote-locked SDT): 1 SDT staked = 1 non-decaying voting/boosting unit, no fixed lock, with an 8-week exit queue (or instant exit with penalty).",
            },
        ],
        faq=[
            {
                'question': 'What is Stake DAO?',
                'answer': 'Stake DAO is a non-custodial DeFi protocol that lets users put vote-escrow governance tokens to work. Its flagship product, Liquid Lockers, converts locked governance tokens (CRV, BAL, FXS, PENDLE, ANGLE...) into liquid sdTokens that keep yield and governance power without the illiquidity of a lock. It also runs boosted strategy vaults and Votemarket, an on-chain vote-incentive marketplace.',
                'pinned': True,
            },
            {
                'question': 'What is sdCRV and how does a Liquid Locker work?',
                'answer': 'When you deposit CRV into Stake DAO you receive sdCRV, a liquid ERC-20. Stake DAO perpetually re-locks the underlying CRV as veCRV at max lock, so sdCRV holders keep governance power and earn maximized Curve rewards plus vote incentives, while remaining able to swap sdCRV back to CRV via DEX liquidity instead of waiting out a 4-year lock. The same model applies to sdBAL, sdFXS, sdPENDLE and others.',
                'pinned': False,
            },
            {
                'question': 'What is Votemarket?',
                'answer': "Votemarket is Stake DAO's permissionless on-chain marketplace for vote incentives (bribes). Protocols post campaigns paying token rewards to voters who direct gauge emissions to their pools; voters claim the incentives on-chain. Votemarket v2 runs heavy computation on Arbitrum using storage proofs, removing weekly claims and reducing gas while staying fully on-chain.",
                'pinned': False,
            },
            {
                'question': 'What are SDT, veSDT and vlSDT?',
                'answer': "SDT is Stake DAO's governance token (100M max supply). Locking SDT gives boosting power (up to 2.5x on sdToken votes) and DAO governance rights. The original veSDT model used a time-decaying lock; in 2026 the DAO approved a migration to vlSDT, where 1 SDT staked equals 1 non-decaying vote/boost unit with an 8-week exit queue and no fixed lock term.",
                'pinned': False,
            },
            {
                'question': 'How does Stake DAO make money and what are the fees?',
                'answer': "Stake DAO charges performance fees on rewards harvested by its Liquid Lockers and strategy vaults (no deposit or withdrawal fees). Rates vary by locker and are shown on each locker's page in the app. Fee proceeds fund liquidity incentives for sdToken pools and the DAO treasury. Votemarket also takes a platform fee on vote-incentive campaigns.",
                'pinned': False,
            },
            {
                'question': 'Was Stake DAO ever exploited?',
                'answer': "Yes. On 27 May 2026 an attacker compromised Stake DAO's deployer private key and manipulated the LayerZero v2 OFT peer configuration to forge a cross-chain message minting roughly 5.4 trillion fake vsdCRV on Arbitrum. Because vsdCRV had thin liquidity, the attacker only extracted about $91K (43.7 ETH) before DEX liquidity was exhausted. Stake DAO publicly warned users not to interact with vsdCRV.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Julien Bouteloup',
                'role': 'Founder',
                'description': 'Serial crypto entrepreneur (in crypto since ~2010) who founded Stake DAO in 2020, alongside other ventures including Stake Capital Group, BlackPool Finance and Rekt News. Stake DAO grew out of the Stake Capital DAO / liquid-staking work.',
            },
            {
                'name': 'Stake DAO Association',
                'role': 'Governing / publishing entity',
                'description': 'The association named as author on official documentation and whitepapers (e.g. the Votemarket v2 whitepaper, Nov 2024). The protocol is community-governed by SDT lockers (veSDT/vlSDT) who vote on proposals (SDGP) and gauge/boost allocations.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Actively-managed asset manager / index fund over governance positions',
                'similarity': "Like an asset manager pooling client capital to run a strategy, Stake DAO pools users' governance tokens, locks them at maximum efficiency, and manages the aggregated voting/boost position to maximize yield returned to depositors, taking a performance fee.",
                'differences': 'Non-custodial and on-chain: users always hold a liquid, redeemable sdToken and retain the ability to exit and to influence governance, with strategies enforced by public smart contracts rather than a discretionary manager or custodian.',
            },
            {
                'product': 'Lobbying / proxy-vote-advisory and pay-to-influence marketplace',
                'similarity': 'Votemarket is analogous to a marketplace for buying influence over collective decisions: campaign creators pay to steer emissions (votes) the way a firm might pay a lobbyist or use proxy advisors to sway shareholder votes.',
                'differences': 'Fully permissionless, transparent and on-chain; anyone can post or claim incentives, pricing of votes is set by open market bidding, and settlement is enforced by smart contracts rather than opaque private arrangements.',
            },
        ],
        events=[
            {
                'date': '2026-05-27',
                'title': 'vsdCRV exploit on Arbitrum (~$91K extracted)',
                'description': "An attacker compromised Stake DAO's deployer private key and manipulated the LayerZero v2 OFT peer configuration to forge a cross-chain message, minting roughly 5.4 trillion fake vsdCRV on Arbitrum. Thin liquidity capped the attacker's realized gain at ~$91K (43.7 ETH). Stake DAO warned users not to interact with vsdCRV.",
                'link': 'https://cryptobriefing.com/stake-dao-exploit-vsdcrv-arbitrum/',
            },
        ],
        timeline=[
            {
                'date': '2021-01-20',
                'title': 'SDT token launch / initial airdrop',
                'description': "SDT, the protocol's governance token (100M max supply), launched with an initial 1.5% (1,500,000 SDT) airdrop distributed on 20 January 2021.",
                'link': 'https://docs.stakedao.org/sdt',
                'status': 'executed',
            },
            {
                'date': '2022-02-01',
                'title': 'veSDT & FXS Locker audited (ChainSecurity)',
                'description': 'ChainSecurity audit of the veSDT vote-escrow system and FXS liquid locker, part of the rollout of the Liquid Lockers + veSDT product line.',
                'link': 'https://github.com/stake-dao/audits',
                'status': 'executed',
            },
            {
                'date': '2024-11-20',
                'title': 'Votemarket v2 launched',
                'description': 'Stake DAO announced Votemarket v2, an on-chain vote-incentive marketplace using storage proofs and an Arbitrum L2 architecture: multi-week reward distribution (no weekly claims), coverage of both direct and wrapper (vlCVX/vlAURA) voters, fallback strategies, and point incentives.',
                'link': 'https://stakedaohq.medium.com/introducing-votemarket-v2-633d6ac37f97',
                'status': 'executed',
            },
            {
                'date': '2026-03-26',
                'title': 'vlSDT migration and updated governance framework',
                'description': 'Governance approved migrating from decaying veSDT to vlSDT (vote-locked SDT): 1 SDT staked = 1 non-decaying vote/boost unit, no fixed lock, 8-week exit queue (or instant exit with penalty); the vlSDT token was audited by Trust Security on 2026-03-26.',
                'link': 'https://gov.stakedao.org/t/sdgp-63-migration-from-vesdt-to-vlsdt/1115',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Founder',
                'value': 'Julien Bouteloup (founded Stake DAO in 2020)',
                'freshness': 'static',
                'source': {
                    'label': 'IQ.wiki - Julien Bouteloup',
                    'url': 'https://iq.wiki/wiki/julien-bouteloup',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Governance token',
                'value': 'SDT (ERC-20, 0x73968b9a57c6e53d41345fd57a6e6ae27d6cdb2f), 100,000,000 max supply; locked as veSDT/vlSDT for governance and boost',
                'freshness': 'static',
                'source': {
                    'label': 'Stake DAO Docs - SDT Token',
                    'url': 'https://docs.stakedao.org/sdt',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Sub-sector',
                'value': 'Governance / vote-aggregation and liquid-locker protocol across Curve, Balancer, Frax, Pendle and Angle vote-escrow ecosystems',
                'freshness': 'static',
                'source': {
                    'label': 'Stake DAO Docs - Liquid Lockers',
                    'url': 'https://docs.stakedao.org/liquidlockers',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Fee model',
                'value': 'Performance fees on harvested rewards only (no deposit/withdrawal fees); rates vary by locker and shown in-app; proceeds fund sdToken liquidity incentives and DAO treasury',
                'freshness': 'dynamic',
                'source': {
                    'label': 'Stake DAO Docs - Locker Fees',
                    'url': 'https://docs.stakedao.org/lockerfees',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Chains',
                'value': 'Primarily Ethereum, with deployments/activity on Arbitrum and Base (Votemarket v2 runs computation on Arbitrum)',
                'freshness': 'dynamic',
                'source': {
                    'label': 'DeFiLlama - Stake DAO',
                    'url': 'https://defillama.com/protocol/stake-dao',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Complex multi-product Solidity codebase (Liquid Lockers, strategy vaults, Votemarket, cross-chain messaging). A bug or logic flaw in any component could cause loss of user funds; realized as the May 2026 vsdCRV exploit where forged cross-chain minting occurred.',
            },
            {
                'category': 'Counterparty',
                'description': 'Deployer/admin key and privileged-role compromise risk. The 27 May 2026 exploit stemmed from a compromised deployer private key used to manipulate the LayerZero v2 OFT peer configuration, showing that key management and admin privileges are a critical trust assumption.',
            },
            {
                'category': 'Network',
                'description': 'Cross-chain / bridging dependency. Products rely on cross-chain messaging (LayerZero OFT, storage-proof oracles bridging mainnet state to Arbitrum). Failure, forged messages, or misconfiguration of this infrastructure can create fake tokens or break reward accounting, as seen in the vsdCRV incident.',
            },
            {
                'category': 'Systemic',
                'description': "Heavy dependence on the underlying vote-escrow ecosystems (Curve, Balancer, Frax, Pendle, Angle) and the broader 'Curve wars'. Emission cuts, veToken model changes, gauge deprecation, or declining demand for vote incentives directly reduce sdToken yields and Votemarket revenue.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'sdTokens (sdCRV, sdBAL, etc.) can trade below the value of their underlying because they are perpetually locked and only redeemable via secondary DEX liquidity, not 1:1 native redemption. A liquidity crunch or loss of confidence can push the sdToken market price to a persistent discount to the underlying.',
            },
            {
                'category': 'Governance',
                'description': "Concentrated locked-token voting (veSDT/vlSDT) governs fees, gauge/boost allocation and product parameters. Voting-power concentration or a contentious migration (e.g. veSDT to vlSDT) could steer the protocol against some stakeholders' interests.",
            },
        ],
        competitors=[
            {
                'name': 'Votium',
                'slug': 'votium',
                'rank': 1,
                'positioning': 'The dominant Convex/Curve vote-incentive (bribe) marketplace, distributing incentives to vlCVX voters.',
                'similarities': "Both operate vote-incentive marketplaces monetizing gauge votes in the Curve/Convex ecosystem; both are core 'Curve wars' infrastructure.",
                'differences': "Votium is a pure bribe marketplace with off-chain/round-based distribution focused on vlCVX; Stake DAO's Votemarket is fully on-chain with storage-proof cross-chain settlement, and Stake DAO additionally runs liquid lockers and strategy vaults.",
            },
            {
                'name': 'Hidden Hand',
                'slug': 'hidden-hand',
                'rank': 2,
                'positioning': "Multi-protocol 'incentive marketplace' (by Redacted/Hidden Hand) spanning Balancer, Frax, Aura and others.",
                'similarities': 'Directly competes with Votemarket as a marketplace for buying and selling governance/gauge votes across multiple veTokenomics ecosystems.',
                'differences': 'Hidden Hand is a standalone incentive marketplace; Stake DAO couples its Votemarket with its own liquid-locker franchise (sdTokens), giving it captive voting supply to incentivize.',
            },
            {
                'name': 'Paladin',
                'slug': 'paladin',
                'rank': 3,
                'positioning': 'Governance-power infrastructure offering vote markets (Quest), boost delegation (Warden) and governance lending.',
                'similarities': 'Also builds vote-incentive/vote markets (Quest) and governance-power tooling around Curve-style veTokenomics, competing for the same incentive flows as Votemarket.',
                'differences': "Paladin focuses on renting/delegating governance power and boosts (Warden/Quest) rather than issuing liquid locker tokens; Stake DAO's core is liquid lockers plus its own marketplace.",
            },
        ],
        audits=[
            {
                'firm': 'ChainSecurity',
                'date': '2022-02-01',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'firm': 'ChainSecurity',
                'date': '2022-10-01',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'firm': 'ChainSecurity',
                'date': '2023-01-01',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'firm': 'Zach Obront',
                'date': '2023-11-22',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'firm': 'Trust Security',
                'date': '2024-02-01',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'firm': 'Trust Security',
                'date': '2024-09-01',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'firm': 'Pashov Audit Group',
                'date': '2024-10-01',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'firm': 'Omniscia',
                'date': '2025-05-01',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'firm': 'Trust Security',
                'date': '2026-03-26',
                'url': 'https://github.com/stake-dao/audits',
            },
        ],
        sources=[
            {
                'label': 'Stake DAO Docs - Home / Overview',
                'url': 'https://docs.stakedao.org/',
            },
            {
                'label': 'Stake DAO Docs - Liquid Lockers',
                'url': 'https://docs.stakedao.org/liquidlockers',
            },
            {
                'label': 'Stake DAO Docs - veSDT',
                'url': 'https://docs.stakedao.org/sdt/vesdt',
            },
            {
                'label': 'Stake DAO Docs - SDT Token',
                'url': 'https://docs.stakedao.org/sdt',
            },
            {
                'label': 'Stake DAO Docs - Votemarket',
                'url': 'https://docs.stakedao.org/vm_overview/votemarket',
            },
            {
                'label': 'Stake DAO Docs - Locker Fees',
                'url': 'https://docs.stakedao.org/lockerfees',
            },
            {
                'label': 'Introducing Votemarket v2 (Medium)',
                'url': 'https://stakedaohq.medium.com/introducing-votemarket-v2-633d6ac37f97',
            },
            {
                'label': 'Stake DAO Audits (GitHub)',
                'url': 'https://github.com/stake-dao/audits',
            },
            {
                'label': 'Stake DAO GitHub Org',
                'url': 'https://github.com/stake-dao',
            },
            {
                'label': 'SDGP-63 veSDT to vlSDT migration (Governance Forum)',
                'url': 'https://gov.stakedao.org/t/sdgp-63-migration-from-vesdt-to-vlsdt/1115',
            },
            {
                'label': 'Julien Bouteloup (IQ.wiki)',
                'url': 'https://iq.wiki/wiki/julien-bouteloup',
            },
            {
                'label': 'Stake DAO vsdCRV exploit (Crypto Briefing)',
                'url': 'https://cryptobriefing.com/stake-dao-exploit-vsdcrv-arbitrum/',
            },
            {
                'label': 'Stake DAO exploit (The Block)',
                'url': 'https://www.theblock.co/post/402719/security-researchers-flag-ongoing-stakedao-exploit-vsdcrv',
            },
            {
                'label': 'DeFiLlama - Stake DAO',
                'url': 'https://defillama.com/protocol/stake-dao',
            },
            {
                'label': 'LlamaRisk - Liquid Lockers & veSDT risk assessment',
                'url': 'https://www.llamarisk.com/research/archive-llamarisk-asset-risk-assessment-liquid-lockers-vesdt',
            },
        ],
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
