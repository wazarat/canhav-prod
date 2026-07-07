#!/usr/bin/env python3
"""
Liquidity-network specs (canhav-liquidity-implementation-spec §3/§4).

The pure-play Liquidity entities that join the Network -> Protocol -> Liquidity
taxonomy, each tagged with a Liquidity sub-sector (Pools / Vaults) and 0+
secondary tags. These mirror the staking_specs.py pattern: live Tier-1 metrics
(tvlUsd, tvlChangePct, token price/mcap, fees, derived marketSharePct) are
filled by the DeFiLlama + CoinGecko cron pass (app/api/cron/refresh +
lib/server/liquidity.ts). Tier-2 fields (poolCount, vaultCount, avgVaultApyPct,
underlyingProtocols, governance) stay curated/null until per-protocol indexers
are wired.

Resolver ids (llamaSlug / coingeckoId) live in frontend/data/liquidity-seed.ts
and the cron maps (LLAMA_PROTOCOL_SLUGS / NETWORK_COINGECKO_IDS). The five in-platform DEX venues (Curve, Uniswap, Balancer, Aerodrome, PancakeSwap)
are exclusive Liquidity / Pools entities in liquidity_specs.py (no DEX cross-tag).

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
    liquidity_sub_sector: str,
    liquidity_secondary_tags: List[str],
    chains: List[str],
    member_coins: Optional[List[Dict[str, Any]]] = None,
    underlying_protocols: Optional[List[str]] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    github: Optional[str] = None,
    competitors: Optional[List[Dict[str, Any]]] = None,
    scale_labels: Optional[Dict[str, str]] = None,
    audit_history: Optional[str] = None,
    deployment_notes: Optional[str] = None,
    # ---- Editorial fields backing the six General Data tabs (M1) ----
    components: Optional[List[Dict[str, str]]] = None,
    faq: Optional[List[Dict[str, Any]]] = None,
    org_structure: Optional[List[Dict[str, str]]] = None,
    tradfi_comparison: Optional[List[Dict[str, str]]] = None,
    risks: Optional[List[Dict[str, str]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    timeline: Optional[List[Dict[str, Any]]] = None,
    offchain_facts: Optional[List[Dict[str, Any]]] = None,
    # Top-level provenance: SourceRef[] backing editorial claims, and audit refs
    # ({firm, date, url}) surfaced on the Risks tab. Consumed by
    # `build_entity_item` via spec.get("sources") / spec.get("audits").
    sources: Optional[List[Dict[str, Any]]] = None,
    audits: Optional[List[Dict[str, Any]]] = None,
    investment_rounds: Optional[List[Dict[str, Any]]] = None,
    partnerships: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Build a Liquidity-network spec with the editorial defaults
    `build_entity_item` expects. `liquidity` holds the curated Tier-2 block; the
    cron overlays Tier-1 live fields (tvlUsd, token price/mcap, fees, share)."""
    liquidity: Dict[str, Any] = {
        "deployment": {
            "chains": chains,
            "evmCompatible": "yes",
            **({"notes": deployment_notes} if deployment_notes else {}),
        },
    }
    if audit_history:
        liquidity["auditHistory"] = audit_history
    if underlying_protocols:
        liquidity["underlyingProtocols"] = underlying_protocols

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
        "events": events or [],
        "timeline": timeline,
        "offchain_facts": offchain_facts,
        "sources": sources or [],
        "audits": audits,
        "investment_rounds": investment_rounds or [],
        "partnerships": partnerships or [],
        "current_scale": _empty_scale(),
        "scale_labels": scale_labels or {"tvl": "Protocol TVL"},
        # Taxonomy hierarchy.
        "sub_category": "Protocol",
        "sector": "Liquidity",
        "sub_sector": liquidity_sub_sector,
        "liquidity_sub_sector": liquidity_sub_sector,
        "liquidity_secondary_tags": liquidity_secondary_tags,
        "liquidity": liquidity,
        # Liquidity entities carry no `Tags` (that vocabulary is Credit-only).
        "tags": [],
        "competitors": competitors or [],
        "member_coins": member_coins or [],
        "portal_defaults": _portal_defaults(chains),
    }


LIQUIDITY_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ---------------- POOLS (major AMM venues — exclusive Liquidity / Pools) ---
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
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Concentrated-Liquidity", "Multi-Chain"],
        chains=[
            "Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "BNB Chain",
            "Avalanche", "Blast", "Celo", "ZKsync", "Worldchain", "Unichain",
        ],
        official_docs="https://docs.uniswap.org",
        website="https://uniswap.org",
        twitter="https://x.com/Uniswap",
        components=[
            {
                'name': 'Uniswap Protocol (v2 / v3 / v4)',
                'description': 'The core on-chain automated market maker (AMM) smart contracts. v2 pioneered the constant-product xy=k pools with token-to-token routing and flash swaps; v3 (2021) introduced concentrated liquidity and multiple fee tiers (0.05% / 0.30% / 1.00%); v4 (2025) added hooks, a singleton PoolManager architecture, and flash accounting.',
            },
            {
                'name': 'Hooks (v4)',
                'description': "Optional contracts that run at defined points in a pool's lifecycle (before/after swap, add/remove liquidity), letting developers extend pools with custom logic such as dynamic fees, on-chain limit orders, and TWAMMs without changing the core protocol.",
            },
            {
                'name': 'Singleton PoolManager + Flash Accounting (v4)',
                'description': 'In v4 all pools live inside a single smart contract (singleton), reducing pool-creation gas by an estimated ~99% versus deploying a contract per pool, while flash accounting nets balances across a transaction and only settles net deltas.',
            },
            {
                'name': 'UniswapX',
                'description': "An intent-based, permissionless, Dutch-auction trading protocol. Swappers sign an off-chain order and an open network of third-party fillers competes to fill it using on-chain liquidity, paying gas on the swapper's behalf and returning MEV to traders as price improvement.",
            },
            {
                'name': 'Unichain',
                'description': "Uniswap Labs' Ethereum Layer 2, built on the OP Stack, with ~1-second block times and gas costs roughly 95% lower than Ethereum L1, launched as a Stage 1 rollup with a permissionless fault-proof system.",
            },
            {
                'name': 'UNI token & Uniswap Governance',
                'description': 'UNI is the ERC-20 governance token launched in September 2020. Holders govern the DAO/treasury, and following the 2025 UNIfication vote, protocol fees are directed to a UNI burn mechanism.',
            },
        ],
        faq=[
            {
                'question': 'How does Uniswap work?',
                'answer': "Uniswap is an automated market maker: instead of an order book, liquidity providers deposit token pairs into pools and traders swap against those pools. Prices are set algorithmically by the pool's constant-product formula (v2) or concentrated-liquidity curve (v3/v4), and LPs earn the pool's swap fee.",
                'pinned': True,
            },
            {
                'question': 'What is concentrated liquidity (v3)?',
                'answer': 'Introduced in v3, concentrated liquidity lets LPs allocate capital to a custom price range rather than across the whole curve, providing up to ~4000x more capital efficiency than v2 for LPs who choose ranges well, but exposing them to more active management and impermanent loss if price leaves the range.',
                'pinned': False,
            },
            {
                'question': 'What are hooks in Uniswap v4?',
                'answer': 'Hooks are contracts attached to a pool that run custom logic at points like before/after a swap or liquidity change. They enable features such as dynamic fees, on-chain limit orders, and TWAMMs. Because hooks are third-party code, the specific hook attached to a pool is itself a smart-contract risk surface.',
                'pinned': False,
            },
            {
                'question': 'Which chains is Uniswap on?',
                'answer': 'Uniswap v4 deployed on day one (January 2025) across Ethereum, Polygon, Arbitrum, OP Mainnet, Base, BNB Chain, Blast, World Chain, Avalanche and Zora. Uniswap Labs also runs its own L2, Unichain.',
                'pinned': False,
            },
            {
                'question': 'What does the UNI token do and is there a fee switch?',
                'answer': "UNI is the governance token used to vote on the DAO treasury and protocol changes. In the 2025 'UNIfication' vote, governance approved activating protocol fees and using them to burn UNI, plus a one-time burn of 100 million UNI from the treasury.",
                'pinned': False,
            },
            {
                'question': 'What fees does Uniswap charge?',
                'answer': 'v3 pools offer LP fee tiers of 0.05%, 0.30% and 1.00% depending on the pair. Under UNIfication, v2 LP fees move from 0.30% to 0.25% with a 0.05% protocol fee, and v3 protocol fees are set at a fraction of LP fees (1/4 for smaller pools, 1/6 for larger).',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Uniswap Labs',
                'role': 'Core developer / company',
                'description': 'The company founded by Hayden Adams that builds the Uniswap Protocol, the web/mobile app, UniswapX and Unichain. Raised an $11M Series A (2020) and a $165M Series B (2022).',
            },
            {
                'name': 'Uniswap Foundation',
                'role': 'Ecosystem foundation',
                'description': 'Delaware-based non-profit foundation created by governance in August 2022 (Devin Walsh, executive director; Ken Ng) to steward grants, governance and protocol development, initially funded from the DAO treasury.',
            },
            {
                'name': 'Uniswap DAO / Governance',
                'role': 'On-chain governance',
                'description': 'UNI holders govern the treasury and protocol parameters via on-chain proposals and voting, e.g., the 2022 foundation creation and the 2025 UNIfication fee-switch/burn proposal.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Stock exchange / spot trading venue (e.g. NYSE, Nasdaq)',
                'similarity': 'Both are venues where market participants trade one asset for another and where liquidity and price discovery happen continuously.',
                'differences': 'Uniswap has no order book, no designated market makers or brokers, and no central operator; prices are set by an automated pricing curve and anyone can permissionlessly list a pair, provide liquidity, or trade non-custodially from their own wallet.',
            },
            {
                'product': 'Market maker / liquidity provision desk',
                'similarity': 'Uniswap LPs perform the economic function of a market maker: they post two-sided liquidity and earn the spread (swap fee).',
                'differences': 'LPing is passive and rule-based rather than actively quoted; returns depend on fees minus impermanent loss, capital is pooled from anyone, and positions are transparent on-chain rather than run by a proprietary trading firm.',
            },
        ],
        events=[
            {
                'date': '2020-09-16',
                'title': 'UNI governance token launched via retroactive airdrop',
                'description': 'Uniswap launched the UNI ERC-20 governance token, airdropping 400 UNI to each of ~250k addresses that had used the protocol before Sept 1, 2020, with 15% of supply claimable by users.',
                'link': 'https://www.coindesk.com/markets/2020/09/17/uniswap-recaptures-defi-buzz-with-uni-tokens-airdropped-debut',
            },
            {
                'date': '2022-08-24',
                'title': 'Uniswap Foundation created by governance vote',
                'description': 'UNI holders approved creating the Uniswap Foundation, with more than 86 million votes (~99%) in favor, to steward grants, governance and protocol development.',
                'link': 'https://cointelegraph.com/news/it-s-a-go-uniswap-foundation-becomes-reality-after-86m-votes-in-favor',
            },
            {
                'date': '2022-10-13',
                'title': '$165M Series B raise disclosed',
                'description': 'Uniswap Labs raised a $165M Series B led by Polychain Capital, reportedly valuing the company at ~$1.66B.',
                'link': 'https://www.coindesk.com/business/2022/10/13/crypto-exchange-uniswap-labs-raises-165m-in-polychain-capital-led-round',
            },
            {
                'date': '2024-11-26',
                'title': '$15.5M bug bounty announced ahead of v4',
                'description': 'Uniswap Labs launched a $15.5M bug bounty for Uniswap v4, described as the largest in DeFi history at the time.',
                'link': 'https://blog.uniswap.org/v4-bug-bounty',
            },
            {
                'date': '2025-01-31',
                'title': 'Uniswap v4 launched',
                'description': 'v4 shipped with hooks, a singleton PoolManager and flash accounting, deploying across Ethereum, Polygon, Arbitrum, OP Mainnet, Base, BNB Chain, Blast, World Chain, Avalanche and Zora, backed by nine independent audits.',
                'link': 'https://docs.uniswap.org/contracts/v4/overview',
            },
            {
                'date': '2025-02-11',
                'title': 'Unichain mainnet launched',
                'description': 'Uniswap Labs launched Unichain, an OP-Stack Ethereum L2 with ~1-second blocks and ~95% lower gas than L1, as a Stage 1 rollup.',
                'link': 'https://blog.uniswap.org/unichain-mainnet-is-here',
            },
            {
                'date': '2025-02-25',
                'title': 'SEC closes Uniswap Labs investigation with no action',
                'description': 'The SEC closed its investigation into Uniswap Labs with no enforcement action, following an April 2024 Wells notice alleging unregistered broker/exchange/security activity.',
                'link': 'https://blog.uniswap.org/a-win-for-defi',
            },
            {
                'date': '2025-12-25',
                'title': 'UNIfication proposal passes governance',
                'description': 'Governance approved UNIfication with ~99.9% support (over 125M UNI in favor), activating protocol fees to burn UNI and mandating a one-time burn of 100M UNI from the treasury.',
                'link': 'https://www.theblock.co/post/383742/uniswap-passes-unification-proposal',
            },
        ],
        timeline=[
            {
                'date': '2018-11-02',
                'title': 'Uniswap v1 deployed on Ethereum mainnet',
                'description': 'Hayden Adams launched Uniswap v1, a proof-of-concept AMM supporting ETH-to-token pairs, during the week of Devcon IV.',
                'link': 'https://en.wikipedia.org/wiki/Uniswap',
                'status': 'executed',
            },
            {
                'date': '2020-05-01',
                'title': 'Uniswap v2 launched',
                'description': "v2 added direct ERC-20-to-ERC-20 pools, flash swaps and on-chain price oracles, which drove Uniswap's rise as a leading spot DEX.",
                'link': 'https://app.uniswap.org/whitepaper.pdf',
                'status': 'executed',
            },
            {
                'date': '2021-05-05',
                'title': 'Uniswap v3 launched',
                'description': 'v3 introduced concentrated liquidity (up to ~4000x capital efficiency) and three LP fee tiers (0.05% / 0.30% / 1.00%) on Ethereum, followed by an Optimism L2 deployment.',
                'link': 'https://blog.uniswap.org/uniswap-v3',
                'status': 'executed',
            },
            {
                'date': '2023-07-17',
                'title': 'UniswapX protocol introduced',
                'description': 'Uniswap Labs unveiled UniswapX, an intent-based Dutch-auction protocol with third-party fillers and gasless swaps, rolled out as an opt-in beta on Ethereum mainnet.',
                'link': 'https://blog.uniswap.org/uniswapx-protocol',
                'status': 'executed',
            },
            {
                'date': '2025-01-31',
                'title': 'Uniswap v4 mainnet release',
                'description': 'The hooks/singleton/flash-accounting architecture went live across ten networks after being released as draft code in June 2023 to be built in public.',
                'link': 'https://docs.uniswap.org/contracts/v4/overview',
                'status': 'executed',
            },
            {
                'date': '2025-02-11',
                'title': 'Unichain L2 mainnet',
                'description': "Uniswap's own Ethereum L2 went to public mainnet after an October 2024 announcement and testnet.",
                'link': 'https://blog.uniswap.org/unichain-mainnet-is-here',
                'status': 'executed',
            },
            {
                'date': '2025-11-10',
                'title': 'UNIfication proposal published',
                'description': 'Uniswap Labs and the Uniswap Foundation proposed activating protocol fees, using them to burn UNI, and burning 100M UNI from the treasury; later approved by governance.',
                'link': 'https://blog.uniswap.org/unification',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Uniswap v4 independent audits',
                'value': '9 independent audits (OpenZeppelin, Spearbit, Certora, Trail of Bits, ABDK, Pashov Audit Group across core and periphery) plus a $2.35M security competition with 500+ researchers before launch',
                'freshness': 'static',
                'source': {
                    'label': 'Certora - Uniswap v4 audits',
                    'url': 'https://www.certora.com/blog/uniswap-v4-audits-what-we-learned-about-defi-security',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Uniswap v4 bug bounty size',
                'value': '$15.5M, described as the largest bug bounty in DeFi history at announcement (Nov 2024)',
                'freshness': 'static',
                'source': {
                    'label': 'Uniswap blog - v4 bug bounty',
                    'url': 'https://blog.uniswap.org/v4-bug-bounty',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'UNIfication one-time UNI burn',
                'value': '100,000,000 UNI to be burned from treasury after the Dec 2025 governance vote (~99.9% in favor), plus ongoing fee-funded burns',
                'freshness': 'static',
                'source': {
                    'label': 'The Block - UNIfication passes',
                    'url': 'https://www.theblock.co/post/383742/uniswap-passes-unification-proposal',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Uniswap v4's hooks let arbitrary third-party contracts execute inside a pool's swap/liquidity lifecycle. A malicious or buggy hook can trap funds, manipulate accounting, or brick a pool, so the risk of any given v4 pool depends on the specific hook attached, not just the audited core.",
            },
            {
                'category': 'Collateral',
                'description': 'Concentrated-liquidity LPs (v3/v4) who set narrow price ranges face amplified impermanent loss: when price moves outside their range their position becomes fully one-sided and stops earning fees, so poorly-chosen ranges can produce losses versus simply holding the assets.',
            },
            {
                'category': 'Oracle',
                'description': 'Protocols that read Uniswap pool prices as an on-chain oracle can be manipulated. Thin or concentrated liquidity makes spot price cheaper to push, and integrators that use instantaneous pool prices rather than time-weighted averages are exposed to manipulation-driven exploits.',
            },
            {
                'category': 'Governance',
                'description': 'UNI voting power is concentrated among large holders and early venture backers, and the 2025 UNIfication vote gave governance direct control over fee activation and treasury burns. Concentrated voting means a small set of holders can steer fee economics and treasury decisions.',
            },
            {
                'category': 'Regulatory',
                'description': 'Uniswap Labs received an SEC Wells notice in April 2024 alleging it operated as an unregistered broker/exchange and issued an unregistered security. Although the investigation was closed with no action in Feb 2025, the legal status of front-ends, the UNI token and fee-switch value accrual remains an unsettled regulatory risk.',
            },
            {
                'category': 'Network',
                'description': 'The push into Unichain and multi-chain v4 deployments adds L2/bridge dependency: Unichain is an OP-Stack rollup relying on its sequencer and fault-proof system, and cross-chain UniswapX intents introduce bridging and settlement risk beyond a single L1.',
            },
        ],
        competitors=[
            {
                'name': 'Curve Finance',
                'slug': 'curve-finance',
                'rank': 1,
                'positioning': 'Leading DEX for stable/pegged-asset swaps and a major AMM competitor overall.',
                'similarities': 'Both are permissionless on-chain AMMs where LPs pool assets and earn swap fees, with governance tokens directing protocol economics.',
                'differences': 'Curve specializes in low-slippage swaps between like-priced assets (stablecoins, LSTs) using its StableSwap invariant and a veCRV vote-escrow/gauge emissions model, whereas Uniswap targets general-purpose volatile-pair trading with concentrated liquidity and hooks.',
            },
            {
                'name': 'PancakeSwap',
                'slug': 'pancakeswap',
                'rank': 2,
                'positioning': 'Dominant AMM/DEX on BNB Chain and a large multi-chain Uniswap competitor.',
                'similarities': 'General-purpose AMM offering token swaps, LP fees and a governance/utility token, with concentrated-liquidity (v3-style) pools.',
                'differences': "PancakeSwap is centered on BNB Chain with a broader consumer product suite (lottery, perps, launchpad) and CAKE emissions incentives, versus Uniswap's Ethereum-first, protocol-and-L2 focus.",
            },
            {
                'name': 'Aerodrome',
                'slug': 'aerodrome',
                'rank': 3,
                'positioning': "Leading DEX and liquidity hub on Base, competing directly with Uniswap's large Base presence.",
                'similarities': 'On-chain AMM where LPs earn fees, deployed on Base where Uniswap is also a top venue.',
                'differences': "Aerodrome uses a Velodrome-style ve(3,3) vote-escrow and bribe/gauge model to direct emissions and liquidity on a single chain, rather than Uniswap's multi-chain, fee-tier/hooks approach.",
            },
            {
                'name': 'Balancer',
                'slug': 'balancer',
                'rank': 4,
                'positioning': 'Flexible AMM supporting weighted and multi-asset pools.',
                'similarities': 'Permissionless AMM with LP fees, programmable pool logic and a governance token.',
                'differences': "Balancer supports custom-weighted and multi-token pools (e.g. 80/20) and a vault architecture, targeting index-like and custom liquidity use cases rather than Uniswap's pairwise concentrated-liquidity default.",
            },
            {
                'name': 'CoW Swap / 1inch',
                'slug': None,
                'rank': 5,
                'positioning': 'Intent-based / aggregation trading venues competing specifically with UniswapX.',
                'similarities': "Offer intent-based, solver/filler-competition trading with MEV protection and gasless-style swaps, overlapping with UniswapX's model.",
                'differences': 'These are primarily aggregators/solvers routing across many venues (including Uniswap) rather than operating their own deep AMM liquidity and L2 like Uniswap does.',
            },
        ],
        investment_rounds=[
            {
                'date': '2020-08-01',
                'round': 'Series A',
                'amountUsd': 11000000,
                'amountLabel': '$11M',
                'investors': [
                    'Andreessen Horowitz (a16z)',
                    'Union Square Ventures',
                    'Paradigm',
                    'ParaFi Capital',
                    'Variant',
                    'Version One',
                    'SV Angel',
                    'A.Capital',
                ],
                'link': 'https://www.crowdfundinsider.com/2020/08/165047-andreessen-horowitz-union-square-ventures-others-take-part-in-11-million-series-a-round-for-uniswap-a-non-custodial-ethereum-token-exchange/',
            },
            {
                'date': '2022-10-13',
                'round': 'Series B',
                'amountUsd': 165000000,
                'amountLabel': '$165M',
                'investors': [
                    'Polychain Capital',
                    'Andreessen Horowitz (a16z crypto)',
                    'Paradigm',
                    'SV Angel',
                    'Variant',
                ],
                'link': 'https://www.coindesk.com/business/2022/10/13/crypto-exchange-uniswap-labs-raises-165m-in-polychain-capital-led-round',
            },
        ],
        audits=[
            {
                'firm': 'OpenZeppelin',
                'date': '2024-08-27',
                'url': 'https://www.openzeppelin.com/news/uniswap-v4-core-audit',
            },
            {
                'firm': 'Certora',
                'date': '2025-01-31',
                'url': 'https://www.certora.com/blog/uniswap-v4-audits-what-we-learned-about-defi-security',
            },
        ],
        sources=[
            {
                'label': 'Uniswap blog - Introducing Uniswap v3',
                'url': 'https://blog.uniswap.org/uniswap-v3',
            },
            {
                'label': 'Uniswap Developer Docs - v4 overview',
                'url': 'https://docs.uniswap.org/contracts/v4/overview',
            },
            {
                'label': 'Uniswap blog - Introducing the UniswapX Protocol',
                'url': 'https://blog.uniswap.org/uniswapx-protocol',
            },
            {
                'label': 'Uniswap blog - Unichain Mainnet is Here',
                'url': 'https://blog.uniswap.org/unichain-mainnet-is-here',
            },
            {
                'label': 'Uniswap blog - UNIfication proposal',
                'url': 'https://blog.uniswap.org/unification',
            },
            {
                'label': 'Uniswap blog - A Win for DeFi (SEC closes investigation)',
                'url': 'https://blog.uniswap.org/a-win-for-defi',
            },
            {
                'label': 'CoinDesk - Uniswap Labs $165M Series B',
                'url': 'https://www.coindesk.com/business/2022/10/13/crypto-exchange-uniswap-labs-raises-165m-in-polychain-capital-led-round',
            },
        ],
        github="https://github.com/Uniswap",
        audit_history="Trail of Bits, ABDK Consulting, ChainSecurity (V3 + V4).",
        deployment_notes="Native on 12+ EVM chains; Unichain is Uniswap's own L2.",
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
            "tokenomics where governance power is bought with locked CRV (veCRV)."
        ),
        differentiator=(
            "Stableswap invariant gives minimal slippage on like-pegged trades; "
            "veCRV bribe markets (Convex/Votium) steer emissions."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Stable-Pools", "ve-Tokenomics", "Multi-Chain"],
        chains=[
            "Ethereum", "Arbitrum", "Optimism", "Polygon", "Base", "BNB Chain",
            "Avalanche", "Fantom", "Gnosis", "ZKsync", "Fraxtal", "Sonic",
        ],
        official_docs="https://docs.curve.fi",
        website="https://curve.fi",
        twitter="https://x.com/CurveFinance",
        components=[
            {
                'name': 'StableSwap AMM',
                'description': "Curve's core exchange invariant, combining a constant-sum and constant-product market maker so like-pegged assets (e.g. stablecoins, staked-ETH derivatives) trade with very low slippage near the peg. Introduced in Michael Egorov's 2019 StableSwap whitepaper.",
            },
            {
                'name': 'Curve v2 (CryptoSwap / Tricrypto)',
                'description': 'A generalized invariant with internal price oracles that concentrates liquidity around a dynamically adjusted price, enabling low-slippage swaps between non-pegged, volatile assets (e.g. the Tricrypto USDT/WBTC/ETH pool).',
            },
            {
                'name': 'CRV token & veCRV vote-escrow',
                'description': "CRV is the governance and emissions token. Locking CRV for up to 4 years mints non-transferable veCRV, which grants governance voting power, boosts LP rewards up to 2.5x, and earns a share of protocol fees. veCRV pioneered the 've-tokenomics' model widely copied across DeFi.",
            },
            {
                'name': 'Gauge system & CRV emissions',
                'description': "Liquidity gauges measure LP participation; veCRV holders vote weekly to direct CRV emissions across gauges. This created a 'gauge/bribe economy' where protocols incentivize votes to attract liquidity to their pools.",
            },
            {
                'name': 'crvUSD stablecoin',
                'description': "Curve's native overcollateralized USD stablecoin, deployed on Ethereum mainnet on 2023-05-03. Users mint crvUSD against collateral such as ETH, wstETH, WBTC, sfrxETH and tBTC.",
            },
            {
                'name': 'LLAMMA (Lending-Liquidating AMM Algorithm)',
                'description': "The liquidation engine behind crvUSD. Rather than liquidating collateral all at once, LLAMMA continuously converts collateral into crvUSD across price bands ('soft liquidation'), reducing the risk of abrupt, total liquidation.",
            },
        ],
        faq=[
            {
                'question': 'What is Curve Finance used for?',
                'answer': 'Curve is a decentralized exchange (AMM) optimized for swapping like-pegged assets such as stablecoins and staked-ETH derivatives with minimal slippage and low fees. Liquidity providers earn trading fees plus CRV emissions, and the protocol also issues its own overcollateralized stablecoin, crvUSD.',
                'pinned': True,
            },
            {
                'question': 'What is veCRV and why lock CRV?',
                'answer': 'veCRV is vote-escrowed CRV, obtained by locking CRV for between 1 week and 4 years. Longer locks give more veCRV, which grants governance voting power, boosts LP rewards up to 2.5x, and earns a share of protocol fees. veCRV is non-transferable and decays linearly over the lock period.',
                'pinned': False,
            },
            {
                'question': 'What is crvUSD?',
                'answer': "crvUSD is Curve's native USD-pegged stablecoin, launched on Ethereum mainnet in May 2023. It is minted against collateral (e.g. ETH, wstETH, WBTC) and uses the LLAMMA mechanism for gradual 'soft liquidations' instead of abrupt liquidation.",
                'pinned': False,
            },
            {
                'question': 'Did Curve get hacked?',
                'answer': "Yes. On 2023-07-30 several Curve pools were drained after a reentrancy-protection bug in specific versions of the Vyper compiler (0.2.15, 0.2.16, 0.3.0) broke Curve's non-reentrant locks. Losses were initially estimated near $70M and reduced to roughly $52M after whitehat recovery.",
                'pinned': False,
            },
            {
                'question': 'What is the gauge and bribe economy?',
                'answer': "veCRV holders vote each week on 'gauge weights' that decide how CRV emissions are split across liquidity pools. Because emissions attract liquidity, third parties pay veCRV holders ('bribes' or incentives) to vote for their pool's gauge, creating a secondary marketplace around Curve governance (the 'Curve Wars').",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Michael Egorov',
                'role': 'Founder',
                'description': "Russian-born physicist and entrepreneur who authored the 2019 StableSwap whitepaper and founded Curve. Previously co-founded NuCypher. Central figure in Curve's development and in the June 2024 personal-loan liquidation event.",
            },
            {
                'name': 'Curve DAO (veCRV holders)',
                'role': 'Governance',
                'description': 'On-chain governance is controlled by veCRV holders, who vote on parameter changes, gauge weights, new pool deployments and treasury actions. The CRV token and DAO contracts were deployed in August 2020 via publicly reviewed code.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Money-market fund / FX spot desk for stable assets',
                'similarity': 'Like an FX or money-market desk, Curve provides deep, low-slippage liquidity for swapping between closely-priced instruments (e.g. different USD stablecoins), earning a spread/fee on flow.',
                'differences': 'Curve is a non-custodial, permissionless smart-contract protocol with no market maker or intermediary; liquidity is pooled from users, pricing is algorithmic, and there is no KYC, settlement counterparty, or central operator.',
            },
        ],
        events=[
            {
                'date': '2023-07-30',
                'title': 'Vyper compiler reentrancy exploit',
                'description': 'A malfunctioning reentrancy guard in Vyper versions 0.2.15, 0.2.16 and 0.3.0 allowed attackers to reenter and drain several Curve pools (including CRV/ETH, alETH, msETH and pETH pools). Losses were initially estimated near $70M and reduced to roughly $52M after whitehat recovery.',
                'link': 'https://www.halborn.com/blog/post/explained-the-vyper-bug-hack-july-2023',
            },
            {
                'date': '2023-08-03',
                'title': 'Egorov OTC CRV sales to reduce loan liquidation risk',
                'description': 'Following the exploit and a falling CRV price, founder Michael Egorov sold tens of millions of CRV over-the-counter (reportedly around $0.40 each) to buyers including Justin Sun, DWF Labs, Wintermute, Cream Finance and DCFGod, raising liquidity to pay down leveraged loans backed by CRV.',
                'link': 'https://www.theblock.co/post/242516/curve-founder-michael-egorov-sells-more-crv-to-dcfgod-and-others',
            },
            {
                'date': '2024-06-13',
                'title': "Founder's leveraged CRV positions liquidated",
                'description': "A sharp CRV price drop triggered liquidation of Michael Egorov's large CRV-collateralized loans across lending protocols (roughly $140M in CRV liquidated), leaving about $10-11.5M of bad debt, notably in the CRV market on LlamaLend/Aave-type venues.",
                'link': 'https://www.theblock.co/post/299864/curve-founder-loan-positions-liquidation-risk',
            },
        ],
        timeline=[
            {
                'date': '2019-11-01',
                'title': 'StableSwap whitepaper published',
                'description': "Michael Egorov published the StableSwap whitepaper introducing the hybrid constant-sum/constant-product invariant that became Curve's core AMM.",
                'link': 'https://docs.curve.finance/references/whitepaper/',
                'status': 'executed',
            },
            {
                'date': '2020-01-01',
                'title': 'Curve protocol launches',
                'description': 'Curve launched in early 2020, quickly becoming the leading venue for low-slippage stablecoin and wrapped-BTC swaps.',
                'link': 'https://news.curve.finance/curve-finance-the-rise-of-the-home-of-stablecoins/',
                'status': 'executed',
            },
            {
                'date': '2020-08-01',
                'title': 'CRV token and Curve DAO launch',
                'description': 'The CRV governance token and DAO contracts were deployed in August 2020 (deployed on-chain by an anonymous community member from publicly reviewed code), introducing the veCRV vote-escrow model.',
                'link': 'https://news.curve.finance/curve-finance-the-rise-of-the-home-of-stablecoins/',
                'status': 'executed',
            },
            {
                'date': '2022-11-22',
                'title': 'crvUSD whitepaper and code released',
                'description': "Curve released the crvUSD whitepaper and backend repository, detailing the LLAMMA soft-liquidation design ahead of the stablecoin's launch.",
                'link': 'https://www.theblock.co/post/189140/curve-releases-whitepaper-and-official-code-for-its-stablecoin',
                'status': 'executed',
            },
            {
                'date': '2023-05-03',
                'title': 'crvUSD deployed on Ethereum mainnet',
                'description': 'Curve deployed its native overcollateralized stablecoin crvUSD on Ethereum mainnet, initially with a Frax staked-ETH derivative as collateral, with wider public access following in mid-May.',
                'link': 'https://www.coindesk.com/tech/2023/05/03/curve-finance-deploys-native-stablecoin-on-mainnet',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'July 2023 Vyper exploit loss (net of whitehat recovery)',
                'value': '~$52M (initial estimate ~$70M)',
                'freshness': 'static',
                'source': {
                    'label': 'Halborn - Explained: The Vyper Bug Hack (July 2023)',
                    'url': 'https://www.halborn.com/blog/post/explained-the-vyper-bug-hack-july-2023',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'crvUSD Ethereum mainnet deployment date',
                'value': '2023-05-03',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk - Curve Finance Deploys Native Stablecoin on Mainnet',
                    'url': 'https://www.coindesk.com/tech/2023/05/03/curve-finance-deploys-native-stablecoin-on-mainnet',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Founder loan liquidation (June 2024) bad debt',
                'value': '~$140M CRV liquidated, ~$10-11.5M bad debt',
                'freshness': 'static',
                'source': {
                    'label': 'The Block - Curve founder loan positions liquidation',
                    'url': 'https://www.theblock.co/post/299864/curve-founder-loan-positions-liquidation-risk',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Curve contracts are written in Vyper. The July 30 2023 exploit showed that a bug in the Vyper compiler itself (versions 0.2.15/0.2.16/0.3.0) can silently break Curve's non-reentrant locks, allowing reentrancy drains of multiple pools even when the Curve source code appears correct. Compiler and low-level implementation risk is therefore a first-order concern.",
            },
            {
                'category': 'Oracle',
                'description': 'Curve v2 (CryptoSwap/Tricrypto) and crvUSD rely on internal EMA price oracles and aggregated stablecoin prices. Auditors (e.g. ChainSecurity) flagged that flash-loan-driven manipulation of pool totalSupply could distort the crvUSD price aggregator, so mispriced or manipulable oracle inputs can lead to bad mints or unfair liquidations.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'crvUSD is only as sound as its collateral and the LLAMMA soft-liquidation engine. In fast, gapping markets soft-liquidation may fail to fully de-risk positions, leaving undercollateralized debt and creating depeg pressure on crvUSD.',
            },
            {
                'category': 'Governance',
                'description': "Voting power concentrates in veCRV, and the emissions gauge system spawned a 'bribe economy' (the Curve Wars). Large veCRV holders and vote-buying markets can steer CRV emissions toward their own pools, and heavy founder/insider CRV holdings historically concentrated influence and market risk.",
            },
            {
                'category': 'Systemic',
                'description': "CRV was widely used as loan collateral across DeFi (Aave, Fraxlend, Inverse, UwU, LlamaLend). The founder's large CRV-backed borrowing meant a CRV price drop threatened cascading liquidations across multiple protocols, and the June 2024 liquidation left real bad debt in lending markets - illustrating cross-protocol contagion risk tied to CRV.",
            },
        ],
        competitors=[
            {
                'name': 'Uniswap',
                'slug': 'uniswap',
                'rank': 1,
                'positioning': 'Largest general-purpose DEX; with concentrated liquidity (v3) it competes directly for stablecoin and correlated-asset swaps.',
                'similarities': 'Permissionless AMM DEX with LP-provided liquidity and governance token; both are top venues for on-chain swaps.',
                'differences': 'Uniswap is a general-purpose x*y=k / concentrated-liquidity AMM; Curve specializes in like-pegged assets via the StableSwap invariant and adds veCRV vote-escrow, a gauge/emissions economy, and its own crvUSD stablecoin.',
            },
            {
                'name': 'Balancer',
                'slug': 'balancer',
                'rank': 2,
                'positioning': 'Flexible multi-token weighted/stable AMM with veBAL vote-escrow, competing for stable and correlated-asset liquidity.',
                'similarities': "AMM DEX offering stable-optimized pools and a ve-token gauge/emissions model closely modeled on Curve's.",
                'differences': "Balancer emphasizes customizable, multi-asset weighted pools and boosted pools; Curve's StableSwap is more specialized for tightly-pegged pairs and Curve issues crvUSD.",
            },
            {
                'name': 'Convex Finance',
                'slug': 'convex-finance',
                'rank': 3,
                'positioning': 'Yield/vote-aggregation layer built on top of Curve; central player in the Curve Wars via cvxCRV/vlCVX.',
                'similarities': "Deeply tied to Curve's veCRV gauge economy and stablecoin LP yields.",
                'differences': 'Convex is a meta-protocol that aggregates veCRV voting power and boosts Curve LP yields rather than a competing DEX; it depends on Curve rather than replacing it.',
            },
            {
                'name': 'Aerodrome',
                'slug': 'aerodrome',
                'rank': 4,
                'positioning': 'Leading ve(3,3) AMM/liquidity hub on Base, competing for stable and correlated-asset liquidity on L2.',
                'similarities': "AMM with stable and volatile pools plus a vote-escrow emissions/bribe model directly inspired by Curve's veCRV design.",
                'differences': 'Aerodrome is chain-specific (Base) and uses a ve(3,3) Solidly-style design; Curve is multi-chain, Ethereum-centric, and issues its own stablecoin crvUSD.',
            },
        ],
        audits=[
            {
                'firm': 'Trail of Bits',
                'date': '2020-07-10',
                'url': 'https://docs.curve.finance/references/audits/',
            },
            {
                'firm': 'MixBytes',
                'date': '2020-07-13',
                'url': 'https://github.com/mixbytes/audits_public/tree/master/Curve%20Finance',
            },
            {
                'firm': 'Quantstamp',
                'date': '2020-08-05',
                'url': 'https://docs.curve.finance/references/audits/',
            },
            {
                'firm': 'MixBytes (crvUSD)',
                'date': '2023-05-01',
                'url': 'https://github.com/mixbytes/audits_public/blob/master/Curve%20Finance/Curve%20Stablecoin%20(crvUSD)/Curve%20Stablecoin%20(crvUSD)%20Security%20Audit%20Report.pdf',
            },
            {
                'firm': 'ChainSecurity (Tricrypto)',
                'date': '2024-09-25',
                'url': 'https://www.chainsecurity.com/security-audit/curve-finance-tricrypto',
            },
        ],
        sources=[
            {
                'label': 'Curve Finance - The Rise of the Home of Stablecoins (official blog)',
                'url': 'https://news.curve.finance/curve-finance-the-rise-of-the-home-of-stablecoins/',
            },
            {
                'label': 'Curve Technical Docs - Whitepapers & References',
                'url': 'https://docs.curve.finance/references/whitepaper/',
            },
            {
                'label': 'CoinDesk - Curve Finance Deploys Native Stablecoin on Mainnet (2023-05-03)',
                'url': 'https://www.coindesk.com/tech/2023/05/03/curve-finance-deploys-native-stablecoin-on-mainnet',
            },
            {
                'label': 'The Block - Curve releases crvUSD whitepaper and code (2022-11-22)',
                'url': 'https://www.theblock.co/post/189140/curve-releases-whitepaper-and-official-code-for-its-stablecoin',
            },
            {
                'label': 'Halborn - Explained: The Vyper Bug Hack (July 2023)',
                'url': 'https://www.halborn.com/blog/post/explained-the-vyper-bug-hack-july-2023',
            },
            {
                'label': 'The Block - Egorov sells more CRV to DCFGod and others (Aug 2023)',
                'url': 'https://www.theblock.co/post/242516/curve-founder-michael-egorov-sells-more-crv-to-dcfgod-and-others',
            },
            {
                'label': 'The Block - Curve founder loan positions liquidation (June 2024)',
                'url': 'https://www.theblock.co/post/299864/curve-founder-loan-positions-liquidation-risk',
            },
        ],
        github="https://github.com/curvefi",
        audit_history="Trail of Bits, MixBytes, ChainSecurity (multi-round).",
        deployment_notes="Multi-chain stableswap pools; crvUSD is a separate entity.",
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
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Stable-Pools", "ve-Tokenomics"],
        chains=["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "Avalanche", "Gnosis", "ZKsync"],
        official_docs="https://docs.balancer.fi",
        website="https://balancer.fi",
        twitter="https://x.com/Balancer",
        components=[
            {
                'name': 'Weighted Pools',
                'description': 'Generalized AMM pools holding up to 8 assets with arbitrary weightings (not limited to the 50/50 of constant-product AMMs), enabling index-fund-like self-rebalancing portfolios.',
            },
            {
                'name': 'Composable Stable Pools',
                'description': "Pools optimized for assets expected to trade near parity (e.g. stablecoins, LSTs), using a StableSwap-style invariant and exposing the pool's own BPT for nested/composable pooling.",
            },
            {
                'name': 'Boosted Pools',
                'description': 'Pools that forward idle liquidity to external lending markets (e.g. Aave, Morpho) so LPs earn yield on the underlying while still providing swap liquidity; in V3 up to 100% of a position can be boosted in yield-bearing tokens.',
            },
            {
                'name': 'The Vault',
                'description': 'A single contract (introduced in V2) that holds and accounts for all pool assets, separating token accounting from pool math; V3 adds transient accounting via EIP-1153.',
            },
            {
                'name': 'Hooks (V3)',
                'description': 'A framework letting developers extend pool behavior at lifecycle points (e.g. the StableSurge hook that raises swap fees during volatility to defend stable-asset pegs).',
            },
            {
                'name': 'veBAL Governance',
                'description': 'Vote-escrow system where users lock the 80/20 BAL/WETH pool token (BPT) for up to 1 year to receive veBAL, granting governance voting power, gauge vote direction, and a share of protocol fees.',
            },
        ],
        faq=[
            {
                'question': 'What makes Balancer different from Uniswap or Curve?',
                'answer': 'Balancer generalizes the AMM: instead of fixed 50/50 pairs it supports pools of up to 8 tokens with arbitrary weights, plus specialized stable and boosted pool types. This lets a pool behave like a self-rebalancing index fund while still earning swap fees.',
                'pinned': True,
            },
            {
                'question': 'What is veBAL?',
                'answer': "veBAL is Balancer's vote-escrow token. Users lock the 80/20 BAL/WETH pool token for up to one year to receive veBAL, which confers governance voting power, the ability to direct liquidity-mining emissions via gauge votes, and a share of protocol fees. Unlike locking a raw governance token, the locked LP position keeps its assets active as trading liquidity.",
                'pinned': False,
            },
            {
                'question': 'What are Boosted Pools?',
                'answer': 'Boosted Pools route otherwise-idle pool liquidity into external lending protocols such as Aave or Morpho, so liquidity providers earn lending yield on top of swap fees. In Balancer V3, up to 100% of an LP position can be held in yield-bearing tokens.',
                'pinned': False,
            },
            {
                'question': 'What is new in Balancer V3?',
                'answer': 'V3, live on Ethereum mainnet since December 2024, simplifies the AMM core, adds a hooks framework for custom pool logic, native yield-bearing token support, 100% boosted pools, and transient accounting via EIP-1153 for gas efficiency.',
                'pinned': False,
            },
            {
                'question': 'Has Balancer been exploited?',
                'answer': 'Yes. In August 2023 a rate-manipulation flaw in Linear/Boosted Pools led to roughly $1.4M in losses across chains after disclosure. Far more severe, on 3 November 2025 an attacker exploited a rounding/precision flaw in V2 Composable Stable Pools to drain about $128M across six networks in under 30 minutes.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Fernando Martinelli',
                'role': 'Co-founder & CEO, Balancer Labs',
                'description': 'Started Balancer as a research project inside BlockScience in 2018 and co-founded Balancer Labs; announced the wind-down of Balancer Labs operations in March 2026.',
            },
            {
                'name': 'Mike McDonald',
                'role': 'Co-founder & CTO, Balancer Labs',
                'description': 'Security engineer who co-founded Balancer Labs and led smart-contract engineering, including the V2 Vault architecture.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Index fund / ETF (e.g. an equal-weight index)',
                'similarity': 'A Balancer weighted pool holds a basket of assets at target weights and continuously rebalances toward them, like a self-rebalancing index fund.',
                'differences': 'Rebalancing is done by arbitrageurs against market prices rather than a fund manager; instead of charging a management fee the pool earns swap fees, and there is no custodian or redemption gate.',
            },
            {
                'product': 'Automated market-making / dealer desk',
                'similarity': 'Provides continuous two-sided quotes and earns the spread (swap fee) for supplying liquidity.',
                'differences': 'Fully on-chain, permissionless, non-custodial, and governed by veBAL holders rather than an institution.',
            },
        ],
        events=[
            {
                'date': '2023-08-22',
                'title': 'Boosted/Linear Pool rate-manipulation vulnerability disclosed',
                'description': 'Balancer disclosed a critical rate-manipulation vulnerability affecting several V2 Boosted (Linear) Pools; despite mitigation, subsequent exploitation caused roughly $1.4M in losses across Fantom and Optimism deployments.',
                'link': 'https://medium.com/beethoven-x/rate-manipulation-in-balancer-boosted-pools-a-beethoven-x-perspective-e419bbb66592',
            },
            {
                'date': '2025-11-03',
                'title': '$128M V2 Composable Stable Pool exploit',
                'description': "An attacker exploited a rounding/precision flaw in the V2 Vault's handling of small-value swaps in Composable Stable Pools, draining about $128.6M across six chains in under 30 minutes; Balancer disabled the CSPv6 factory and enabled recovery-mode withdrawals.",
                'link': 'https://research.checkpoint.com/2025/how-an-attacker-drained-128m-from-balancer-through-rounding-error-exploitation/',
            },
        ],
        timeline=[
            {
                'date': '2020-03-24',
                'title': 'Balancer Labs raises $3M seed',
                'description': 'Seed round co-led by Accomplice and Placeholder, with CoinFund and Inflection participating.',
                'link': 'https://medium.com/balancer-protocol/balancer-labs-raises-3m-to-supercharge-programmable-liquidity-8f1a42323c78',
                'status': 'executed',
            },
            {
                'date': '2020-06-23',
                'title': 'BAL governance token launches',
                'description': 'BAL launched on Ethereum mainnet; liquidity-mining distribution to LPs had begun on 1 June 2020.',
                'link': 'https://medium.com/balancer-protocol/bal-is-live-104ba56e1945',
                'status': 'executed',
            },
            {
                'date': '2021-05-11',
                'title': 'Balancer V2 goes live',
                'description': 'V2 launched with the single-Vault architecture separating token accounting from pool logic.',
                'link': 'https://medium.com/balancer-protocol/developers-balancer-v2-smart-contracts-are-now-live-e97002ee0310',
                'status': 'executed',
            },
            {
                'date': '2024-12-12',
                'title': 'Balancer V3 goes live on Ethereum mainnet',
                'description': 'V3 launched with a simplified core, hooks framework, native yield-bearing token support, 100% boosted pools, and EIP-1153 transient accounting.',
                'link': 'https://ethdaily.io/607',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Seed round',
                'value': '$3M seed (2020), co-led by Accomplice and Placeholder',
                'freshness': 'static',
                'source': {
                    'label': 'Balancer Labs Raises $3M (Medium)',
                    'url': 'https://medium.com/balancer-protocol/balancer-labs-raises-3m-to-supercharge-programmable-liquidity-8f1a42323c78',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Nov 2025 exploit loss',
                'value': '~$128.6M drained across six chains on 2025-11-03',
                'freshness': 'static',
                'source': {
                    'label': 'Check Point Research',
                    'url': 'https://research.checkpoint.com/2025/how-an-attacker-drained-128m-from-balancer-through-rounding-error-exploitation/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Bug bounty max',
                'value': 'Up to 1,000 ETH for critical smart-contract vulnerabilities',
                'freshness': 'static',
                'source': {
                    'label': 'Balancer V2 Docs - Security',
                    'url': 'https://docs-v2.balancer.fi/reference/contracts/security.html',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Balancer has suffered repeated smart-contract exploits: an August 2023 rate-manipulation flaw in Linear/Boosted Pools (~$1.4M lost) and a November 2025 rounding/precision flaw in V2 Composable Stable Pools that drained ~$128M across six chains, despite numerous audits.',
            },
            {
                'category': 'Oracle',
                'description': 'Boosted and stable pools rely on token exchange-rate providers (rate providers) and internal invariants; the 2023 and 2025 incidents both hinged on manipulation of rate/price accounting inside pool math, making rate integrity a persistent attack surface.',
            },
            {
                'category': 'Systemic',
                'description': 'The V2 Vault holds assets for many pools, and the codebase is one of the most-forked in DeFi; a Vault-level flaw (as in Nov 2025) propagates across pools, chains, and protocol forks simultaneously.',
            },
            {
                'category': 'Collateral',
                'description': "Boosted Pools route liquidity into external lending markets (Aave, Morpho); LPs inherit the solvency, liquidity, and depeg risk of those underlying yield-bearing tokens in addition to Balancer's own.",
            },
            {
                'category': 'Governance',
                'description': "Control concentrates in veBAL lockers who direct emissions and protocol parameters, creating vote-buying/'bribe' dynamics and dependence on active DAO governance, especially amid the March 2026 wind-down of Balancer Labs.",
            },
        ],
        competitors=[
            {
                'name': 'Curve Finance',
                'slug': 'curve-finance',
                'rank': 1,
                'positioning': "Leading stable-asset AMM with the veCRV vote-escrow model that Balancer's veBAL is based on.",
                'similarities': 'Both use StableSwap-style pools for like-priced assets and vote-escrow governance directing liquidity-mining emissions.',
                'differences': 'Curve specializes in stable/pegged assets; Balancer generalizes to arbitrary-weight multi-asset pools, boosted pools, and V3 hooks.',
            },
            {
                'name': 'Uniswap',
                'slug': 'uniswap',
                'rank': 2,
                'positioning': 'The dominant general-purpose AMM/DEX by volume, with concentrated liquidity (V3) and hooks (V4).',
                'similarities': 'Both are permissionless AMMs earning swap fees; both introduced hooks for extensible pool logic.',
                'differences': 'Uniswap centers on two-asset concentrated-liquidity pools; Balancer offers multi-asset weighted pools and yield-bearing boosted pools.',
            },
            {
                'name': 'Aura Finance',
                'slug': 'aura',
                'rank': 3,
                'positioning': 'A liquidity-and-governance aggregator built specifically on top of Balancer/veBAL (analogous to Convex on Curve).',
                'similarities': 'Operates directly within the Balancer ecosystem, boosting BAL rewards for depositors.',
                'differences': 'Aura is a meta-layer that aggregates veBAL rather than a competing AMM; it complements as much as competes.',
            },
            {
                'name': 'Convex Finance',
                'slug': 'convex-finance',
                'rank': 4,
                'positioning': 'Yield/governance aggregator for the veCRV/veBAL ecosystems.',
                'similarities': 'Aggregates vote-escrow positions and boosts LP rewards in the same veModel design space.',
                'differences': 'Convex is an aggregation layer over Curve (and Balancer via Aura), not a base AMM.',
            },
        ],
        investment_rounds=[
            {
                'date': '2020-03-24',
                'round': 'Seed',
                'amountUsd': 3000000,
                'amountLabel': '$3M',
                'investors': [
                    'Accomplice',
                    'Placeholder',
                    'CoinFund',
                    'Inflection',
                ],
                'link': 'https://medium.com/balancer-protocol/balancer-labs-raises-3m-to-supercharge-programmable-liquidity-8f1a42323c78',
            },
        ],
        audits=[
            {
                'firm': 'OpenZeppelin',
                'date': '2021-03-15',
                'url': 'https://github.com/balancer/balancer-v2-monorepo/tree/master/audits',
            },
            {
                'firm': 'Trail of Bits',
                'date': '2021-04-02',
                'url': 'https://github.com/balancer/balancer-v2-monorepo/tree/master/audits',
            },
            {
                'firm': 'Certora',
                'date': '2021-04-22',
                'url': 'https://github.com/balancer/balancer-v2-monorepo/tree/master/audits',
            },
            {
                'firm': 'Trail of Bits',
                'date': '2022-09-02',
                'url': 'https://github.com/balancer/balancer-v2-monorepo/tree/master/audits',
            },
            {
                'firm': 'Certora',
                'date': '2022-09-23',
                'url': 'https://github.com/balancer/balancer-v2-monorepo/tree/master/audits',
            },
        ],
        sources=[
            {
                'label': 'Balancer Labs Raises $3M (Medium)',
                'url': 'https://medium.com/balancer-protocol/balancer-labs-raises-3m-to-supercharge-programmable-liquidity-8f1a42323c78',
            },
            {
                'label': 'Balancer V2 Docs - Security & Audits',
                'url': 'https://docs-v2.balancer.fi/reference/contracts/security.html',
            },
            {
                'label': 'Balancer Hooks concept docs',
                'url': 'https://docs.balancer.fi/concepts/core-concepts/hooks.html',
            },
            {
                'label': 'veBAL governance overview docs',
                'url': 'https://docs.balancer.fi/concepts/governance/veBAL/',
            },
            {
                'label': 'Beethoven X - Aug 2023 rate manipulation',
                'url': 'https://medium.com/beethoven-x/rate-manipulation-in-balancer-boosted-pools-a-beethoven-x-perspective-e419bbb66592',
            },
            {
                'label': 'Check Point Research - Nov 2025 $128M exploit',
                'url': 'https://research.checkpoint.com/2025/how-an-attacker-drained-128m-from-balancer-through-rounding-error-exploitation/',
            },
            {
                'label': 'Balancer V3 live on mainnet (ETH Daily)',
                'url': 'https://ethdaily.io/607',
            },
        ],
        github="https://github.com/balancer",
        audit_history="Trail of Bits, OpenZeppelin, Certora.",
        deployment_notes="Weighted, Composable Stable, and Boosted pools; V3 with hooks.",
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
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Concentrated-Liquidity", "ve-Tokenomics"],
        chains=["Base", "Optimism"],
        official_docs="https://docs.aerodrome.finance",
        website="https://aerodrome.finance",
        twitter="https://x.com/aerodromefi",
        components=[
            {
                'name': 'vAMM / sAMM pools',
                'description': 'Solidly-style constant-product (volatile, vAMM) and stable (sAMM) automated market maker pools, forked from Velodrome V2. vAMM serves uncorrelated pairs; sAMM uses a StableSwap-like curve for correlated/pegged assets.',
            },
            {
                'name': 'Slipstream (concentrated liquidity)',
                'description': "Aerodrome's Uniswap V3-style concentrated-liquidity AMM (CLMM), launched April 2024. LPs set custom price ranges for far higher capital efficiency and earn both AERO emissions and a share of trading fees. Slipstream drove Aerodrome's Base DEX market share to roughly 63%.",
            },
            {
                'name': 'AERO token',
                'description': 'Native ERC-20 emissions/reward token on Base (contract 0x940181a94A35A4569E4529A3CDfB74e38FD98631). Emitted to liquidity providers via gauges; can be traded or locked into veAERO.',
            },
            {
                'name': 'veAERO vote-escrow NFT',
                'description': 'ERC-721 vote-escrow NFT minted by locking AERO for up to four years. Voting power scales with lock size and duration and decays over time; used to vote on emissions gauges each epoch.',
            },
            {
                'name': 'Gauges & emissions (ve(3,3) flywheel)',
                'description': 'Weekly epoch-based emissions system. veAERO holders vote on gauges to direct AERO emissions to liquidity pools; in return voters receive 100% of the trading fees and external incentives from the pools they vote for.',
            },
            {
                'name': 'Bribe / incentive markets',
                'description': "Marketplace where protocols deposit external incentives ('bribes') to attract veAERO votes and emissions to their pools, aligning liquidity direction with the parties willing to pay for it.",
            },
        ],
        faq=[
            {
                'question': 'What is Aerodrome Finance?',
                'answer': "Aerodrome is the leading decentralized exchange and central liquidity marketplace on Coinbase's Base network. It is a ve(3,3) Solidly-fork AMM that combines vAMM/sAMM pools, the Slipstream concentrated-liquidity engine, and a vote-escrow (veAERO) emissions-and-incentives flywheel.",
                'pinned': True,
            },
            {
                'question': 'Who built Aerodrome?',
                'answer': "Aerodrome was launched on August 28, 2023 by the team behind Velodrome (Optimism's leading DEX), which later publicly organized as Dromos Labs. The team operated pseudonymously until revealing its identities in late 2025; CEO Alexander Cutler announced the formation of Dromos Labs in October 2025.",
                'pinned': False,
            },
            {
                'question': 'What is veAERO and how does voting work?',
                'answer': 'veAERO is a vote-escrow NFT created by locking AERO for up to four years. Each weekly epoch, veAERO holders vote on which pools receive AERO emissions and, in return, receive 100% of the trading fees and incentives generated by the pools they vote for.',
                'pinned': False,
            },
            {
                'question': 'What is Slipstream?',
                'answer': "Slipstream is Aerodrome's concentrated-liquidity AMM, inspired by Uniswap V3, launched in April 2024. It lets liquidity providers concentrate capital in custom price ranges for greater efficiency while still earning AERO emissions and trading fees.",
                'pinned': False,
            },
            {
                'question': 'How is Aerodrome related to Coinbase and Base?',
                'answer': "Aerodrome is the dominant DEX on Base, Coinbase's Layer-2. It is closely aligned with the Base ecosystem: in February 2024 the Base Ecosystem Fund (managed by Coinbase Ventures) market-acquired an AERO position and locks veAERO to direct emissions toward strategic pools such as cbBTC. Coinbase does not own or control the protocol.",
                'pinned': False,
            },
            {
                'question': 'Was there a VC raise or token sale?',
                'answer': "No. Aerodrome launched with no pre-sale and no private-investor allocation. A large share of the initial AERO supply was airdropped to veVELO lockers on Velodrome/Optimism, and the team's tokens are locked as veAERO rather than liquid.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Alexander Cutler',
                'role': 'Co-founder / CEO, Dromos Labs',
                'description': 'Public face and co-founder of Velodrome and Aerodrome; announced the formation of Dromos Labs (the core development company behind the MetaDEX model) in October 2025 after years of team pseudonymity.',
            },
            {
                'name': 'Dromos Labs',
                'role': 'Core developer',
                'description': "Development company behind both Velodrome (Optimism) and Aerodrome (Base). The team met in a Discord server in 2022 and built the protocols pseudonymously before organizing publicly as Dromos Labs and unveiling the unified 'Aero' DEX in November 2025.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Electronic market maker / exchange with a fee-rebate program',
                'similarity': 'Aerodrome matches buyers and sellers and pays participants who supply liquidity, much as an exchange rebates market makers who post depth.',
                'differences': 'It is fully on-chain, non-custodial and permissionless; liquidity direction and revenue distribution are governed by veAERO token votes rather than by an exchange operator, and 100% of fees flow to voters.',
            },
            {
                'product': 'Shareholder governance with dividends',
                'similarity': 'Locking AERO into veAERO resembles holding voting shares that entitle the holder to a stream of income (trading fees and incentives).',
                'differences': "Voting power decays with the remaining lock term, 'dividends' are routed only to the pools a holder actively votes for, and the whole system is transparent and enforced by smart contracts rather than a corporate board.",
            },
        ],
        events=[
            {
                'date': '2024-02-01',
                'title': 'Base Ecosystem Fund (Coinbase Ventures) acquires AERO',
                'description': 'The Base Ecosystem Fund, managed by Coinbase Ventures, market-acquired a substantial AERO position and began locking veAERO to direct emissions toward strategic Base pools such as cbBTC.',
                'link': 'https://www.coingecko.com/learn/what-is-aerodrome-finance-aero-base',
            },
            {
                'date': '2025-11-13',
                'title': 'Dromos Labs unveils Aero and plans Aerodrome/Velodrome merger',
                'description': "At a New York event, Dromos Labs announced 'Aero,' a unified DEX merging Aerodrome and Velodrome (consolidating AERO and VELO), with expansion to Ethereum planned for Q2 2026 and a new MetaDEX architecture.",
                'link': 'https://www.coindesk.com/tech/2025/11/13/leading-base-dex-aerodrome-merges-into-aero-in-major-overhaul',
            },
        ],
        timeline=[
            {
                'date': '2023-08-28',
                'title': 'Aerodrome launches on Base',
                'description': 'Aerodrome went live on the Base network as a ve(3,3) Solidly/Velodrome V2 fork, with no pre-sale or VC allocation. Initial AERO supply was largely airdropped to veVELO lockers on Optimism.',
                'link': 'https://www.coingecko.com/learn/what-is-aerodrome-finance-aero-base',
                'status': 'executed',
            },
            {
                'date': '2024-04-22',
                'title': 'Slipstream concentrated-liquidity launch',
                'description': "Aerodrome launched Slipstream, its Uniswap V3-style concentrated-liquidity AMM, sharply increasing capital efficiency and helping push Aerodrome's Base DEX market share to roughly 63%.",
                'link': 'https://www.ccn.com/analysis/crypto/base-aerodrome-finance-slipstream-tvl-2-billion/',
                'status': 'executed',
            },
            {
                'date': '2025-10-15',
                'title': 'Dromos Labs formation announced',
                'description': 'Co-founder Alexander Cutler announced the formation of Dromos Labs, the core development company behind the MetaDEX model used by Aerodrome and Velodrome, ending years of team pseudonymity.',
                'link': 'https://www.dlnews.com/articles/defi/aerodrome-founder-talks-aero-uniswap-feud-pseudonymity/',
                'status': 'executed',
            },
            {
                'date': '2025-11-13',
                'title': "'Aero' unified DEX unveiled; Aerodrome/Velodrome merger",
                'description': 'Dromos Labs unveiled Aero, merging Aerodrome and Velodrome into a single DEX with a new MetaDEX architecture and planned Ethereum expansion in Q2 2026.',
                'link': 'https://thedefiant.io/news/defi/dromos-labs-merges-aerodrome-and-velodrome-into-new-dex-aero',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'AERO token contract (Base)',
                'value': '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
                'freshness': 'static',
                'source': {
                    'label': 'BaseScan - AERO token',
                    'url': 'https://basescan.org/token/0x940181a94A35A4569E4529A3CDfB74e38FD98631',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Base DEX market share after Slipstream',
                'value': '~63% (as reported after the April 2024 Slipstream launch)',
                'freshness': 'static',
                'source': {
                    'label': 'CCN - Aerodrome launches Slipstream',
                    'url': 'https://www.ccn.com/analysis/crypto/base-aerodrome-finance-slipstream-tvl-2-billion/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Launch date',
                'value': '2023-08-28, launched on Base with no VC/pre-sale',
                'freshness': 'static',
                'source': {
                    'label': 'CoinGecko Learn - What is Aerodrome Finance',
                    'url': 'https://www.coingecko.com/learn/what-is-aerodrome-finance-aero-base',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Aerodrome is a Solidly/Velodrome V2 fork with additional custom code (Slipstream CLMM). Solidly-fork lineage has historically carried subtle accounting bugs, and forked-plus-modified contracts inherit and can introduce vulnerabilities; the Slipstream engine adds concentrated-liquidity complexity to the attack surface.',
            },
            {
                'category': 'Governance',
                'description': 'The ve(3,3) model concentrates control in large veAERO lockers who steer emissions and fee flow. Continuous AERO emissions dilute non-lockers, and large aligned holders (e.g., the Base Ecosystem Fund / Coinbase Ventures) can materially influence which pools receive rewards, raising emissions-dilution and vote-centralization concerns.',
            },
            {
                'category': 'Network',
                'description': "Aerodrome's liquidity and activity are almost entirely concentrated on Base, a single Coinbase-operated L2. Base outages, sequencer downtime, bridge issues, or reduced Coinbase support would directly impair the protocol's usability and TVL.",
            },
            {
                'category': 'Systemic',
                'description': "Deep alignment with Coinbase/Base and the incentive/bribe flywheel create reflexive dependence: much liquidity is emissions- and incentive-driven, so a fall in AERO price or a withdrawal of ecosystem support could unwind mercenary liquidity quickly. The planned Aerodrome/Velodrome merger into 'Aero' also introduces migration and execution risk.",
            },
            {
                'category': 'Oracle',
                'description': 'Concentrated-liquidity pools and integrating protocols relying on Aerodrome pool prices/TWAPs are exposed to price-manipulation risk in thin or newly created pools, which can propagate to downstream protocols using those pools as a price reference.',
            },
        ],
        competitors=[
            {
                'name': 'Uniswap',
                'slug': 'uniswap',
                'rank': 1,
                'positioning': 'The largest DEX overall and the incumbent Aerodrome most directly displaced on Base; also present on Base itself.',
                'similarities': "Both are permissionless AMMs; Aerodrome's Slipstream is directly modeled on Uniswap V3 concentrated liquidity.",
                'differences': 'Uniswap uses a fee-tier AMM without a vote-escrow token; Aerodrome adds ve(3,3) emissions, veAERO governance and bribe markets that route 100% of fees to voters. Aerodrome overtook Uniswap for Base DEX market share after Slipstream.',
            },
            {
                'name': 'Velodrome',
                'slug': None,
                'rank': 2,
                'positioning': "Aerodrome's sister protocol on Optimism, built by the same team; the closest architectural analogue (now slated to merge into 'Aero').",
                'similarities': 'Nearly identical ve(3,3) Solidly-fork design, shared Dromos Labs codebase and MetaDEX roadmap; Aerodrome is essentially Velodrome deployed on Base.',
                'differences': 'Different chain (Optimism vs Base) and token (VELO vs AERO); Aerodrome grew larger by capturing Base flow. The two are planned to merge, so they are less rivals than siblings.',
            },
            {
                'name': 'PancakeSwap',
                'slug': 'pancakeswap',
                'rank': 3,
                'positioning': 'Large multi-chain DEX also deployed on Base competing for swap volume and liquidity.',
                'similarities': 'Both are AMM DEXs offering concentrated liquidity and liquidity-mining incentives across EVM chains including Base.',
                'differences': 'PancakeSwap uses a veCAKE/gauge system but is multi-chain and BNB-Chain-centric; Aerodrome is Base-native and built around the ve(3,3) fee-to-voter flywheel.',
            },
            {
                'name': 'Curve Finance',
                'slug': 'curve-finance',
                'rank': 4,
                'positioning': 'Dominant stableswap / correlated-asset DEX whose vote-escrow (veCRV) gauge model directly inspired the ve(3,3) design Aerodrome uses.',
                'similarities': "Vote-escrow governance directing emissions to gauges, and stable-optimized pools (Aerodrome's sAMM parallels Curve's StableSwap).",
                'differences': 'Curve is multi-chain and specialized in stable/pegged assets; Aerodrome is a general-purpose Base-native DEX combining volatile, stable and concentrated pools with a fees-to-voter model.',
            },
        ],
        partnerships=[
            {
                'name': 'Coinbase Ventures / Base Ecosystem Fund',
                'date': '2024-02-01',
                'amountLabel': None,
                'description': 'The Base Ecosystem Fund, managed by Coinbase Ventures, market-acquired an AERO position and locks veAERO to participate in governance, directing emissions toward strategic Base pools such as cbBTC. This was an open-market position rather than a private investment round.',
            },
        ],
        audits=[
            {
                'firm': 'Spearbit / ChainSecurity (per Aerodrome security page)',
                'date': '2023-08-28',
                'url': 'https://aerodrome.finance/security',
            },
        ],
        sources=[
            {
                'label': 'CoinGecko Learn - What is Aerodrome Finance',
                'url': 'https://www.coingecko.com/learn/what-is-aerodrome-finance-aero-base',
            },
            {
                'label': 'CCN - Aerodrome launches Slipstream',
                'url': 'https://www.ccn.com/analysis/crypto/base-aerodrome-finance-slipstream-tvl-2-billion/',
            },
            {
                'label': 'DL News - Aerodrome co-founder on Aero, Uniswap feud, pseudonymity',
                'url': 'https://www.dlnews.com/articles/defi/aerodrome-founder-talks-aero-uniswap-feud-pseudonymity/',
            },
            {
                'label': 'CoinDesk - Aerodrome merges into Aero',
                'url': 'https://www.coindesk.com/tech/2025/11/13/leading-base-dex-aerodrome-merges-into-aero-in-major-overhaul',
            },
            {
                'label': 'The Defiant - Dromos Labs merges Aerodrome and Velodrome into Aero',
                'url': 'https://thedefiant.io/news/defi/dromos-labs-merges-aerodrome-and-velodrome-into-new-dex-aero',
            },
            {
                'label': 'Aerodrome Finance - Security page',
                'url': 'https://aerodrome.finance/security',
            },
            {
                'label': 'GitHub - aerodrome-finance/contracts',
                'url': 'https://github.com/aerodrome-finance/contracts',
            },
        ],
        audit_history="Spearbit, code4rena contests.",
        deployment_notes="Base-native; Optimism via Superchain merger with Velodrome.",
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
            "with gamification (lotteries, predictions, NFTs) plus its Infinity CLMM."
        ),
        differentiator=(
            "Retail-first BNB DEX with v3 CLMM, Infinity (hook-like router), "
            "and an IFO launchpad."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["Concentrated-Liquidity", "Multi-Chain"],
        chains=["BNB Chain", "Ethereum", "Arbitrum", "Base", "Polygon zkEVM", "Linea", "opBNB", "ZKsync", "Aptos"],
        official_docs="https://docs.pancakeswap.finance",
        website="https://pancakeswap.finance",
        twitter="https://x.com/PancakeSwap",
        components=[
            {
                'name': 'AMM DEX (v2 / v3 CLMM)',
                'description': 'Core automated market maker for token swaps and liquidity provision. v2 uses the classic constant-product Uniswap-style model; v3 (launched 2023) introduced a Concentrated Liquidity Automated Market Maker (CLAMM/CLMM) allowing LPs to allocate capital within custom price ranges for higher capital efficiency.',
            },
            {
                'name': 'PancakeSwap Infinity',
                'description': "Modular next-generation AMM architecture deployed in 2025 that succeeds v3. It introduces programmable 'hooks' — code that runs before/after key pool actions (initialize, swap, addLiquidity, removeLiquidity, donate) — enabling custom oracles, dynamic-fee pools and advanced liquidity management, plus more gas-efficient pool types (CLAMM and LBAMM).",
            },
            {
                'name': 'Farms & Syrup Pools (yield)',
                'description': 'Liquidity mining program where LP-token stakers earn CAKE emissions (Farms) and single-asset staking pools earn CAKE or partner tokens (Syrup Pools).',
            },
            {
                'name': 'IFO Launchpad',
                'description': "Initial Farm Offering fundraising platform for new BNB-ecosystem tokens. Uses an 'Overflow' allocation method where users commit CAKE and receive an allocation proportional to their share of total commitments; the iCAKE metric determines individual public-sale commit limits.",
            },
            {
                'name': 'GameFi & NFTs',
                'description': 'Gamified products including Prediction markets (forecasting BNB/CAKE price direction), a CAKE-ticket Lottery with on-chain randomness, Pottery, and an NFT marketplace.',
            },
            {
                'name': 'CAKE token',
                'description': 'Native utility and governance token used for farming rewards, staking, IFO participation, lottery tickets and Snapshot governance. It has transitioned to a deflationary model via weekly burns and successive emissions cuts.',
            },
        ],
        faq=[
            {
                'question': 'What is PancakeSwap?',
                'answer': 'PancakeSwap is a decentralized exchange (DEX) launched in September 2020 on the BNB Smart Chain. It began as a lower-cost, faster alternative to Ethereum-based DEXs like Uniswap and has grown into a multi-product DeFi platform offering swaps, yield farming, an IFO launchpad, prediction markets, lotteries and NFTs. It is the dominant DEX on BNB Chain and now operates across multiple chains.',
                'pinned': True,
            },
            {
                'question': 'What is the CAKE token used for?',
                'answer': "CAKE is PancakeSwap's native utility and governance token. It is used to earn and pay farming/staking rewards, participate in IFOs (via iCAKE limits), buy lottery tickets, and vote on governance proposals via Snapshot. CAKE has shifted to a deflationary model with weekly token burns and repeated emission reductions.",
                'pinned': False,
            },
            {
                'question': 'Who runs PancakeSwap?',
                'answer': "PancakeSwap was built and is maintained by an anonymous team known as 'Chefs' working in the 'Kitchen,' reportedly more than a dozen members including two co-leads (pseudonyms 'Hops' and 'Thumper'). The protocol is open-source, community-governed via Snapshot, and received a strategic investment from Binance Labs in June 2022.",
                'pinned': False,
            },
            {
                'question': 'What is PancakeSwap Infinity?',
                'answer': "PancakeSwap Infinity is the protocol's modular AMM architecture that succeeds v3. It introduces programmable 'hooks' that execute custom logic around pool actions (swaps, liquidity changes, initialization, donations), enabling features like dynamic fees and custom oracles, alongside more gas-efficient pool types (CLAMM and LBAMM).",
                'pinned': False,
            },
            {
                'question': 'What is an IFO on PancakeSwap?',
                'answer': "An Initial Farm Offering (IFO) is PancakeSwap's launchpad mechanism for new tokens. Using the 'Overflow' model, participants commit CAKE and receive a token allocation proportional to their share of total commitments, with unused funds returned at claim. A PancakeSwap profile is required and iCAKE sets the maximum commit limit for public sales.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'PancakeSwap Chefs (Kitchen)',
                'role': 'Core development team',
                'description': "An anonymous team of pseudonymous 'Chefs' (reportedly a dozen-plus members, including two co-leads known as 'Hops' and 'Thumper') that builds and maintains the protocol.",
            },
            {
                'name': 'CAKE holders (Snapshot governance)',
                'role': 'Governance',
                'description': 'CAKE holders vote on protocol proposals — including tokenomics changes and max-supply reductions — through off-chain Snapshot voting.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Stock/securities exchange (e.g., a spot exchange operator)',
                'similarity': 'Both provide a venue for two parties to trade assets and generate revenue from trading fees.',
                'differences': 'PancakeSwap is non-custodial and permissionless: prices are set algorithmically by an automated market maker against pooled liquidity rather than by a central-limit order book and matched buyers/sellers, and anyone can list a token or provide liquidity without an intermediary or listing approval.',
            },
            {
                'product': 'Market maker / liquidity provider desk',
                'similarity': 'Liquidity providers earn a spread/fee for supplying inventory that lets others trade, similar to how professional market makers earn from bid/ask spreads.',
                'differences': 'On PancakeSwap any user can become an LP by depositing tokens into a smart-contract pool; there is no licensed intermediary, and LPs bear impermanent loss rather than managing an actively quoted book.',
            },
        ],
        events=[
            {
                'date': '2023-12-29',
                'title': 'CAKE max supply cut to 450M approved',
                'description': "Tokenholders passed a Snapshot proposal to reduce CAKE's maximum supply by 40%, from 750 million to 450 million, with over 97% support, reinforcing the deflationary trajectory.",
                'link': 'https://www.theblock.co/post/269619/pancakeswap-community-approves-removing-300-million-cake-tokens-from-supply',
            },
            {
                'date': '2025-04-23',
                'title': 'CAKE Tokenomics 3.0 goes live',
                'description': 'PancakeSwap implemented Tokenomics 3.0, cutting daily CAKE emissions from roughly 40,000 to about 22,250, retiring the veCAKE staking/gauges model, and targeting ~4% annual deflation.',
                'link': 'https://beincrypto.com/pancakeswap-sets-date-for-new-cake-tokenomics/',
            },
            {
                'date': '2026-01-16',
                'title': 'Proposal to cut CAKE max supply to 400M',
                'description': "A Snapshot proposal (voting 16–19 Jan 2026) to further reduce CAKE's maximum supply from 450 million to 400 million, deepening the deflationary model.",
                'link': 'https://en.cryptonomist.ch/2026/01/20/cake-token-max-supply-400m/',
            },
        ],
        timeline=[
            {
                'date': '2020-09-20',
                'title': 'PancakeSwap launches on BNB Smart Chain',
                'description': "Anonymous 'Chef' developers launched PancakeSwap as a low-fee, fast Uniswap-style DEX on BNB Smart Chain amid high Ethereum gas costs. The CAKE token was introduced in October 2020.",
                'link': 'https://www.gemini.com/cryptopedia/pancakeswap-exchange-cake-crypto-pancake-swap',
                'status': 'executed',
            },
            {
                'date': '2021-04-23',
                'title': 'PancakeSwap v2 migration',
                'description': 'Following a community poll, PancakeSwap migrated liquidity to upgraded v2 smart contracts.',
                'link': 'https://coinmarketcap.com/exchanges/pancakeswap-v2/',
                'status': 'executed',
            },
            {
                'date': '2022-06-06',
                'title': 'Binance Labs strategic investment',
                'description': 'Binance Labs made an undisclosed strategic investment in PancakeSwap, citing its position as the highest-TVL dApp on BNB Chain.',
                'link': 'https://decrypt.co/102117/binance-labs-makes-undisclosed-strategic-investment-pancakeswap',
                'status': 'executed',
            },
            {
                'date': '2023-04-01',
                'title': 'PancakeSwap v3 (CLMM) launch',
                'description': 'PancakeSwap v3 introduced a Concentrated Liquidity AMM (CLAMM/CLMM), letting LPs concentrate capital within chosen price ranges for greater efficiency. (Exchange V3 audits by PeckShield and SlowMist dated March 2023.)',
                'link': 'https://docs.pancakeswap.finance/welcome-to-pancakeswap/audits',
                'status': 'executed',
            },
            {
                'date': '2025-04-23',
                'title': 'CAKE Tokenomics 3.0',
                'description': 'Emissions cut to ~22,250 CAKE/day, veCAKE retired, and a ~4% annual deflation target adopted.',
                'link': 'https://beincrypto.com/pancakeswap-sets-date-for-new-cake-tokenomics/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Launch date',
                'value': 'September 2020 on BNB Smart Chain; CAKE token introduced October 2020',
                'freshness': 'static',
                'source': {
                    'label': 'Gemini Cryptopedia — PancakeSwap',
                    'url': 'https://www.gemini.com/cryptopedia/pancakeswap-exchange-cake-crypto-pancake-swap',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'CAKE maximum supply',
                'value': 'Reduced from 750M to 450M via Snapshot vote (97%+ support) approved 29 Dec 2023; further reduction to 400M proposed Jan 2026',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — PancakeSwap community approves removing 300M CAKE',
                    'url': 'https://www.theblock.co/post/269619/pancakeswap-community-approves-removing-300-million-cake-tokens-from-supply',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'CAKE emissions (Tokenomics 3.0)',
                'value': 'Daily CAKE emissions reduced from ~40,000 to ~22,250, veCAKE retired, effective 23 Apr 2025',
                'freshness': 'static',
                'source': {
                    'label': 'BeInCrypto — PancakeSwap sets date for CAKE Tokenomics 3.0',
                    'url': 'https://beincrypto.com/pancakeswap-sets-date-for-new-cake-tokenomics/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Governance',
                'description': 'CAKE tokenomics have been changed repeatedly through Snapshot governance — including the deflationary shift, successive emission cuts and the abrupt retirement of the veCAKE gauges model in Tokenomics 3.0 (Apr 2025). The veCAKE removal drew strong opposition from large stakeholders such as Cakepie DAO, who called it non-transparent and damaging to projects built on that model, illustrating governance and roadmap-change risk.',
            },
            {
                'category': 'Network',
                'description': "PancakeSwap originated on and remains heavily concentrated on BNB Chain, a network with a small, relatively centralized validator set closely associated with Binance. Concentration on BNB Chain exposes users to that chain's centralization, uptime and dependency risks even as PancakeSwap expands multi-chain.",
            },
            {
                'category': 'Counterparty',
                'description': "The protocol is built and controlled by an anonymous team ('Chefs'), so there is no publicly identifiable, legally accountable operator. Anonymous leadership limits accountability and recourse if the team acts against user interests or disappears.",
            },
            {
                'category': 'Smart Contract',
                'description': "PancakeSwap comprises many interacting contracts (v2, v3 CLMM, Infinity hooks, cross-chain bridges, farms, lottery, prediction). Infinity's programmable hooks in particular expand the attack surface — CertiK has published security considerations specifically on Infinity hooks — and any exploit in these contracts could cause loss of pooled funds.",
            },
            {
                'category': 'Collateral',
                'description': 'Liquidity providers on the AMM are exposed to impermanent loss and to the risk of holding volatile or low-quality tokens; because listing is permissionless, pools can contain scam or thinly-traded assets, exposing LPs and traders to depeg/rug and price-manipulation risk.',
            },
        ],
        competitors=[
            {
                'name': 'Uniswap',
                'slug': 'uniswap',
                'rank': 1,
                'positioning': 'The largest DEX by TVL and the originator of the AMM and concentrated-liquidity (v3) models PancakeSwap adapted.',
                'similarities': 'Both are permissionless AMM DEXs offering swaps, concentrated liquidity and hook-based next-gen architectures (Uniswap v4 hooks vs. PancakeSwap Infinity hooks).',
                'differences': 'Uniswap is Ethereum-centric with far higher overall TVL and a doxxed US-based Labs team; PancakeSwap is BNB-Chain-native, offers extra products (IFO, lottery, prediction, NFTs) and is run by an anonymous team.',
            },
            {
                'name': 'Curve',
                'slug': 'curve-finance',
                'rank': 2,
                'positioning': 'Leading DEX for stablecoin and pegged-asset swaps with low slippage and its own vote-escrow governance model.',
                'similarities': "Both offer AMM pools, liquidity-mining incentives and (historically) vote-escrow tokenomics (Curve's veCRV; PancakeSwap's now-retired veCAKE).",
                'differences': 'Curve specializes in like-priced/stable assets and is multi-chain but Ethereum-anchored; PancakeSwap is a general-purpose DEX centered on BNB Chain with a broader consumer product suite.',
            },
            {
                'name': 'Aerodrome',
                'slug': 'aerodrome',
                'rank': 3,
                'positioning': 'Dominant AMM/liquidity hub on Base, using a ve(3,3) emissions-and-bribes model.',
                'similarities': 'Both are the leading DEX on their home chain and rely on token emissions to bootstrap liquidity.',
                'differences': 'Aerodrome is Base-native and built on the ve(3,3) Velodrome design; PancakeSwap is BNB-Chain-native, multi-product and multi-chain.',
            },
            {
                'name': 'Raydium',
                'slug': '',
                'rank': 4,
                'positioning': 'Leading AMM DEX on Solana and a major venue by spot trading volume.',
                'similarities': 'Both are top-tier DEXs by spot volume and combine AMM swaps with token-launch/launchpad features.',
                'differences': 'Raydium is Solana-native (integrating with an order book/liquidity from that ecosystem); PancakeSwap is EVM/BNB-Chain-centric.',
            },
        ],
        investment_rounds=[
            {
                'date': '2022-06-06',
                'round': 'Strategic',
                'amountUsd': 0,
                'amountLabel': 'Undisclosed',
                'investors': [
                    'Binance Labs',
                ],
                'link': 'https://decrypt.co/102117/binance-labs-makes-undisclosed-strategic-investment-pancakeswap',
            },
        ],
        audits=[
            {
                'firm': 'PeckShield',
                'date': '2023-03-01',
                'url': 'https://github.com/peckshield/publications/blob/master/audit_reports/PeckShield-Audit-Report-PancakeSwapV3-v1.0.pdf',
            },
            {
                'firm': 'SlowMist',
                'date': '2023-03-01',
                'url': 'https://docs.pancakeswap.finance/welcome-to-pancakeswap/audits',
            },
            {
                'firm': 'PeckShield',
                'date': '2023-04-01',
                'url': 'https://docs.pancakeswap.finance/welcome-to-pancakeswap/audits',
            },
            {
                'firm': 'BlockSec',
                'date': '2023-11-01',
                'url': 'https://docs.pancakeswap.finance/welcome-to-pancakeswap/audits',
            },
            {
                'firm': 'PeckShield',
                'date': '2021-07-01',
                'url': 'https://github.com/peckshield/publications/blob/master/audit_reports/PeckShield-Audit-Report-PancakeswapLottery-v1.0.pdf',
            },
            {
                'firm': 'CertiK',
                'date': '2025-01-01',
                'url': 'https://www.certik.com/resources/blog/pancakeswap-infinity-hooks-security-considerations',
            },
        ],
        sources=[
            {
                'label': 'Gemini Cryptopedia — PancakeSwap DEX & CAKE',
                'url': 'https://www.gemini.com/cryptopedia/pancakeswap-exchange-cake-crypto-pancake-swap',
            },
            {
                'label': 'PancakeSwap Docs — Security Audits',
                'url': 'https://docs.pancakeswap.finance/welcome-to-pancakeswap/audits',
            },
            {
                'label': 'PancakeSwap Docs — CAKE Tokenomics',
                'url': 'https://docs.pancakeswap.finance/protocol/cake-tokenomics',
            },
            {
                'label': 'The Block — CAKE max supply cut to 450M',
                'url': 'https://www.theblock.co/post/269619/pancakeswap-community-approves-removing-300-million-cake-tokens-from-supply',
            },
            {
                'label': 'BeInCrypto — CAKE Tokenomics 3.0',
                'url': 'https://beincrypto.com/pancakeswap-sets-date-for-new-cake-tokenomics/',
            },
            {
                'label': 'Decrypt — Binance Labs strategic investment',
                'url': 'https://decrypt.co/102117/binance-labs-makes-undisclosed-strategic-investment-pancakeswap',
            },
            {
                'label': 'CertiK — PancakeSwap Infinity Hooks Security Considerations',
                'url': 'https://www.certik.com/resources/blog/pancakeswap-infinity-hooks-security-considerations',
            },
        ],
        github="https://github.com/pancakeswap",
        audit_history="Certik, PeckShield (multi-round).",
        deployment_notes="BNB-primary; v3 CLMM + Infinity router; Aptos (non-EVM).",
        member_coins=[
            _coin("cake", "PancakeSwap", "CAKE", "Governance + utility token"),
        ],
    ),
    # ---------------- POOLS (LP strategy managers) -----------------------------
    "gamma": _net(
        name="Gamma",
        symbol="GAMMA",
        tagline="Active liquidity management for concentrated AMMs.",
        description=(
            "Gamma is an active liquidity-management protocol that automates "
            "concentrated-liquidity positions (Uniswap V3, and other CLMMs) via "
            "non-custodial 'Hypervisor' vaults, rebalancing ranges to maximize fees."
        ),
        differentiator=(
            "Automated, audited concentrated-liquidity strategies across many "
            "CLMM DEXes and chains — LPs deposit once and Gamma manages the range."
        ),
        liquidity_sub_sector="Pools",
        liquidity_secondary_tags=["LP-Strategy-Manager", "Concentrated-Liquidity", "Multi-Chain"],
        chains=["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "BNB Chain"],
        official_docs="https://docs.gamma.xyz",
        website="https://app.gamma.xyz",
        twitter="https://x.com/GammaStrategies",
        components=[
            {
                'name': 'Hypervisor LP Vaults',
                'description': 'Non-custodial, automated rebalancing vaults that hold concentrated-liquidity positions on behalf of depositors. When a user deposits a token pair, a fungible ERC-20 LP token is minted representing fractional ownership of the position; the vault auto-rebalances price ranges, collects and reinvests fees across supported CLMM DEXes.',
            },
            {
                'name': 'Active rebalancing strategies (Dynamic Range / Stable)',
                'description': "Off-chain-directed rebalancing logic that adjusts concentrated-liquidity ranges to track price. Gamma's Dynamic Range and Stable strategies are designed to reduce impermanent loss while maximizing fee capture for LPs.",
            },
            {
                'name': 'UniProxy / deposit-proxy contracts',
                'description': "Peripheral contracts that govern deposits into Hypervisor vaults, enforcing deposit ratios and price-change thresholds. Reviewed alongside Hypervisor.sol in Gamma's audits.",
            },
            {
                'name': 'GAMMA / xGAMMA staking',
                'description': 'GAMMA is the governance and fee-share token. Staking GAMMA mints xGAMMA, a share token whose value accrues as a portion of vault fees accumulates in the staking pool. There is no lock-up on the base staking contract.',
            },
            {
                'name': 'Newer product lines (LimitOrder Hook, Perpetual Vaults)',
                'description': 'Beyond LP vaults, Gamma has expanded to a Uniswap V4 limit-order hook (decentralized limit orders via swap hooks) and perpetual trading vaults on Hyperliquid using momentum/financial-signal strategies.',
            },
        ],
        faq=[
            {
                'question': 'What is Gamma?',
                'answer': 'Gamma is a non-custodial active liquidity-management protocol. Its Hypervisor vaults automatically manage and rebalance concentrated-liquidity (CLMM) positions across many DEXes and chains, so LPs can earn trading fees without manually re-ranging their positions.',
                'pinned': True,
            },
            {
                'question': 'How do Hypervisor vaults work?',
                'answer': "A user deposits a token pair into a Hypervisor and receives a fungible ERC-20 LP token representing their share. The vault holds concentrated-liquidity positions, and Gamma's strategies rebalance the price ranges, collect fees, and reinvest them to compound returns.",
                'pinned': False,
            },
            {
                'question': 'What is xGAMMA and how does fee-sharing work?',
                'answer': 'Staking GAMMA mints xGAMMA, which represents a share of the staking pool. A portion of the fees generated across Gamma-managed vaults accumulates in that pool, so xGAMMA rises in value relative to GAMMA over time. The base staking contract has no lock-up.',
                'pinned': False,
            },
            {
                'question': 'Which DEXes and chains does Gamma support?',
                'answer': 'Gamma supports a wide range of concentrated-liquidity DEXes including Uniswap V3/V4 and Algebra-based DEXes, deployed across many EVM networks such as Ethereum, Polygon, Optimism, Arbitrum, Base, and Moonbeam.',
                'pinned': False,
            },
            {
                'question': 'Has Gamma ever been exploited?',
                'answer': 'Yes. On January 4, 2024, an attacker used flash loans to exploit an overly permissive price-change threshold on certain LST and stablecoin vaults, minting excess LP tokens and draining funds. Estimates ranged from roughly $3.4M to $4.5M+. Gamma disabled public-vault deposits while keeping withdrawals open. Gamma is itself a rebrand of Visor Finance, which suffered an ~$8.2M infinite-mint exploit in December 2021.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Gamma Strategies',
                'role': 'Core development organization',
                'description': 'The organization that develops and maintains the Gamma protocol. Gamma emerged from a December 2021 re-organization / rebrand of Visor Finance, with GAMMA governance and fee-share token holders directing protocol changes.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Actively managed account / discretionary asset manager',
                'similarity': 'Like a managed account, Gamma takes deposited assets and actively repositions them (rebalancing concentrated-liquidity ranges) to optimize yield, charging a share of returns/fees rather than requiring the user to manage positions themselves.',
                'differences': 'Gamma is non-custodial and on-chain: users retain a redeemable ERC-20 claim on the underlying assets at all times, strategies execute via smart contracts, and there is no regulated custodian or discretionary manager holding client funds.',
            },
        ],
        events=[
            {
                'date': '2024-01-04',
                'title': 'Gamma vaults exploited via price-change-threshold flaw',
                'description': 'An attacker used flash loans to manipulate deposit values on certain LST and stablecoin vaults whose price-change threshold was set too high (allowing 50-200% swings), minting disproportionate LP tokens and withdrawing excess assets. Loss estimates ranged from ~$3.4M to $4.5M+. Gamma disabled deposits to public vaults while keeping withdrawals open.',
                'link': 'https://www.theblock.co/post/270338/defi-protocol-gamma-strategies-suffers-an-estimated-3-4-million-exploit',
            },
        ],
        timeline=[
            {
                'date': '2021-12-23',
                'title': 'Visor Finance merges into / rebrands to Gamma',
                'description': 'Following security incidents at Visor Finance (including an ~$8.2M infinite-mint exploit in December 2021), the project re-organized as Gamma Strategies. GAMMA tokens were distributed to VISR, vVISR and tVISR holders based on a December 21, 2021 snapshot.',
                'link': 'https://gammastrategies.medium.com/visor-merges-with-gamma-a-re-org-focusing-on-security-and-performance-b4deaf67e273',
                'status': 'executed',
            },
            {
                'date': '2022-03-28',
                'title': 'ConsenSys Diligence & Arbitrary Execution audits completed',
                'description': 'Gamma completed a v2 overhaul of its liquidity-management contracts (Hypervisor.sol / UniProxy.sol), audited by ConsenSys Diligence and Arbitrary Execution, with auditors recommending timelocks and multisig governance for the heavily parameterized system.',
                'link': 'https://docs.gamma.xyz/gamma/learn/audits',
                'status': 'executed',
            },
            {
                'date': '2024-01-04',
                'title': 'January 2024 exploit and vault-deposit pause',
                'description': 'Gamma suffered a flash-loan-driven exploit on certain LST/stablecoin vaults, paused public-vault deposits, and later published a position-safety framework in response.',
                'link': 'https://rekt.news/gamma-strategies-rekt',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'GAMMA total supply',
                'value': '100,000,000 GAMMA (fixed max supply; distributed GAMMA is bought on the open market and is non-inflationary)',
                'freshness': 'static',
                'source': {
                    'label': 'Gamma docs - Tokenomics',
                    'url': 'https://docs.gamma.xyz/gamma/learn/tokenomics',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'GAMMA circulating supply (as of 2023-12-18 snapshot)',
                'value': '65,100,661 GAMMA circulating; ~39.96% staked as xGAMMA',
                'freshness': 'static',
                'source': {
                    'label': 'Gamma docs - Tokenomics',
                    'url': 'https://docs.gamma.xyz/gamma/learn/tokenomics',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'GAMMA staker fee share',
                'value': 'GAMMA stakers (xGAMMA) earn a share of fees across Gamma-managed vaults; at least ~10% of protocol revenue is directed to non-treasury stakers',
                'freshness': 'static',
                'source': {
                    'label': 'Gamma docs - GAMMA Token / Staking',
                    'url': 'https://docs.gamma.xyz/gamma/learn/staking',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Hypervisor vaults, UniProxy deposit-proxy contracts, and newer hooks are complex smart contracts holding pooled funds. Gamma was exploited on January 4, 2024 (~$3.4M-$4.5M+) when an overly permissive price-change threshold let an attacker flash-loan-manipulate deposit values and mint excess LP tokens; its predecessor Visor Finance lost ~$8.2M to an infinite-mint bug in December 2021.',
            },
            {
                'category': 'Collateral',
                'description': 'Active rebalancing of concentrated-liquidity ranges exposes LPs to impermanent loss and rebalancing risk: repositioning ranges around volatile pairs can realize losses if price moves sharply, and vault performance depends heavily on strategy parameterization and external incentive programs rather than fee income alone.',
            },
            {
                'category': 'Oracle',
                'description': 'Vault deposit/rebalance logic relies on price references and price-change thresholds. Mis-set thresholds or manipulable pool prices (as in the January 2024 incident) can allow attackers to distort deposit valuations and mint disproportionate LP tokens.',
            },
            {
                'category': 'Systemic',
                'description': "Gamma's vaults are layered on top of third-party CLMM DEXes (Uniswap V3/V4, Algebra-based DEXes) across many chains. Bugs, exploits, or liquidity failures in an underlying DEX or host chain, or changes to their fee/AMM mechanics, propagate directly into Gamma vault performance and safety.",
            },
            {
                'category': 'Governance',
                'description': 'Auditors flagged that the system is heavily parameterized by contract owners (e.g., thresholds, strategy settings). Reliance on privileged multisig/governance control over these parameters is itself a risk vector; mis-configuration was a contributing factor in the January 2024 exploit.',
            },
        ],
        competitors=[
            {
                'name': 'Arrakis Finance',
                'slug': 'arrakis',
                'rank': 1,
                'positioning': 'The most direct in-pool peer: an automated concentrated-liquidity management protocol built primarily on Uniswap V3.',
                'similarities': 'Both are non-custodial automated liquidity managers that tokenize CLMM positions and auto-manage ranges for LPs.',
                'differences': 'Arrakis leans toward protocol-owned liquidity (its PALM product lets protocols manage their own treasury liquidity) and lower-risk / stablecoin strategies, while Gamma focuses more on retail LP vaults with a wide diversity of DEXes, chains, and high-volatility pairs, often boosted by external incentive programs.',
            },
            {
                'name': 'Maverick Protocol',
                'slug': 'maverick',
                'rank': 2,
                'positioning': "A DEX/AMM whose native Liquidity Modes automate concentrated-liquidity positioning, competing with Gamma's rebalancing value proposition.",
                'similarities': 'Both aim to reduce the manual burden and impermanent-loss exposure of concentrated-liquidity LPing via automated range management.',
                'differences': 'Maverick bakes automation into its own AMM as a DEX, whereas Gamma is a manager layered on top of external CLMM DEXes rather than operating its own exchange.',
            },
            {
                'name': 'Beefy',
                'slug': 'beefy',
                'rank': 3,
                'positioning': 'A multi-chain yield optimizer that offers concentrated-liquidity vaults (often integrating third-party managers) as part of a broader auto-compounding vault suite.',
                'similarities': 'Both provide tokenized, auto-compounding vaults over DEX liquidity across many chains.',
                'differences': 'Beefy is a generalized yield aggregator spanning many strategy types and frequently routes CLM through partners, while Gamma is a specialist active liquidity manager providing the underlying rebalancing engine.',
            },
            {
                'name': 'Uniswap',
                'slug': 'uniswap',
                'rank': 4,
                'positioning': 'The dominant CLMM DEX and the primary venue Gamma builds on; native V3/V4 LPing is the manual alternative to using a manager like Gamma.',
                'similarities': 'Both serve LPs seeking trading-fee yield on concentrated liquidity.',
                'differences': 'Uniswap provides the raw AMM where LPs must self-manage ranges; Gamma is a managed layer that automates positioning on top of Uniswap and other CLMM DEXes, and depends on them.',
            },
        ],
        audits=[
            {
                'firm': 'ConsenSys Diligence',
                'date': '2022-03-28',
                'url': 'https://github.com/GammaStrategies/hypervisor/blob/master/audits/ConsenSys-Diligence-Audit-28-03-22.pdf',
            },
            {
                'firm': 'Arbitrary Execution',
                'date': '2022-03-09',
                'url': 'https://github.com/GammaStrategies/hypervisor/blob/master/audits/AE_Gamma_audit_09_03_22.pdf',
            },
            {
                'firm': 'OpenZeppelin',
                'date': '2024-01-01',
                'url': 'https://github.com/GammaStrategies/hypervisor/blob/master/Gamma%20Security%20Review%20(Jan%202024).pdf',
            },
        ],
        sources=[
            {
                'label': 'Gamma official docs - Introduction',
                'url': 'https://docs.gamma.xyz/gamma',
            },
            {
                'label': 'Gamma docs - Audits',
                'url': 'https://docs.gamma.xyz/gamma/learn/audits',
            },
            {
                'label': 'Gamma docs - Tokenomics',
                'url': 'https://docs.gamma.xyz/gamma/learn/tokenomics',
            },
            {
                'label': 'Gamma docs - GAMMA Token / Staking',
                'url': 'https://docs.gamma.xyz/gamma/learn/staking',
            },
            {
                'label': 'The Block - Gamma Strategies ~$3.4M exploit',
                'url': 'https://www.theblock.co/post/270338/defi-protocol-gamma-strategies-suffers-an-estimated-3-4-million-exploit',
            },
            {
                'label': 'rekt.news - Gamma Strategies',
                'url': 'https://rekt.news/gamma-strategies-rekt',
            },
            {
                'label': 'Gamma Medium - Visor merges with Gamma (rebrand)',
                'url': 'https://gammastrategies.medium.com/visor-merges-with-gamma-a-re-org-focusing-on-security-and-performance-b4deaf67e273',
            },
        ],
        github="https://github.com/GammaStrategies",
        member_coins=[
            _coin("gamma-gov", "Gamma Strategies", "GAMMA", "Governance + fee-share token (xGAMMA staking)"),
        ],
    ),
    # ------------------------------- VAULTS ---------------------------------
    "yearn-finance": _net(
        name="Yearn Finance",
        symbol="YFI",
        tagline="The original DeFi yield-aggregating vaults.",
        description=(
            "Yearn pioneered the yield-vault model: users deposit assets and Yearn "
            "vaults (yVaults) route them into the best available strategies — "
            "including Curve LP + Convex farming — auto-harvesting and recompounding rewards."
        ),
        differentiator=(
            "The longest-running, most battle-tested vault aggregator; strategies "
            "are community-curated and composable across DeFi."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["Auto-Compounding", "Multi-Chain"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon"],
        underlying_protocols=["Curve", "Convex", "Aave", "Compound"],
        official_docs="https://docs.yearn.fi",
        website="https://yearn.fi",
        twitter="https://x.com/yearnfi",
        components=[
            {
                'name': 'yVaults (V3)',
                'description': "Automated yield-generating vaults built on the ERC-4626 standard. V3 vaults can be a single strategy or a multi-strategy allocator that balances deposited funds across strategies, giving users a range of risk appetites. Multi-strategy vault tokens are prefixed with 'yv' and appended with a category (e.g. yvUSDC-1). Extensible periphery contracts (4626 Router, Registry, Debt Allocator) sit alongside the core logic.",
            },
            {
                'name': 'veYFI (vote-escrowed YFI)',
                'description': 'On-chain vote-escrow governance system: YFI holders lock tokens for veYFI to direct protocol upgrades, gauge weights and treasury allocation. Longer locks grant more voting power and larger boosts, including a discount on the contributor YFI buy program tied to lock duration.',
            },
            {
                'name': 'yCRV / yLockers',
                'description': 'Liquid-locker products that wrap governance tokens (yCRV for Curve, yPRISMA for Prisma). yCRV lets users capture Curve boosting/veCRV benefits without locking CRV themselves; yUSD is an ERC-20 representing shares of the popular yCRV/crvUSD vault, auto-compounding yield into yvcrvUSD.',
            },
            {
                'name': 'yETH',
                'description': 'A basket LST (liquid staking token) product aggregating multiple Ethereum liquid-staking tokens into a single diversified, yield-bearing ETH position, with its own periphery and governance contracts.',
            },
            {
                'name': 'yBOLD',
                'description': "Auto-compounding, yield-bearing version of Liquity V2's BOLD stablecoin, built on Yearn V3. It routes BOLD across Liquity V2 Stability Pools, re-evaluating allocation roughly every 30 minutes; permissionless, oracle-less, with no entry/withdraw fee. Users can stake yBOLD to receive st-yBOLD. Live as of June 2, 2025.",
            },
        ],
        faq=[
            {
                'question': 'What is Yearn Finance?',
                'answer': 'Yearn is a DeFi yield-aggregation protocol that pools user capital into automated vaults which move funds between yield opportunities to maximize returns while minimizing individual user effort. Its V3 yVaults use the ERC-4626 standard and can be single-strategy or multi-strategy allocators.',
                'pinned': True,
            },
            {
                'question': 'How was the YFI token launched?',
                'answer': "YFI was fair-launched by Andre Cronje on July 17, 2020 with no pre-mine, no VC round, no private sale and no founder allocation. The initial 30,000 YFI were distributed entirely to users who provided liquidity to Yearn's early pools; Cronje kept zero tokens for himself. The launch became a widely-copied template for 'fair launches' in DeFi.",
                'pinned': True,
            },
            {
                'question': 'How does governance work?',
                'answer': 'Governance is conducted on-chain via veYFI (vote-escrowed YFI). Holders lock YFI to receive veYFI and vote on protocol upgrades, gauge weights and treasury allocation; longer locks yield more voting power and larger reward boosts.',
                'pinned': False,
            },
            {
                'question': 'Has Yearn ever been exploited?',
                'answer': 'Yes. In February 2021 a flash-loan attack drained roughly $11 million from a V1 DAI vault by manipulating a Curve pool exchange rate. In April 2023 a legacy, misconfigured yUSDT contract (pointing at Fulcrum iUSDC instead of iUSDT since deployment) was exploited for roughly $10-11.5 million. Yearn V2/V3 vaults were not affected by the 2023 incident.',
                'pinned': False,
            },
            {
                'question': 'What are the newest products?',
                'answer': "Recent additions include V3 yVaults, veYFI governance, yLockers (yCRV, yPRISMA), the yETH LST basket, and yBOLD, an auto-compounding yield-bearing wrapper for Liquity V2's BOLD stablecoin that went live in June 2025.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Andre Cronje',
                'role': 'Founder / original developer',
                'description': 'Created Yearn and fair-launched YFI in July 2020 with no allocation to himself. He later stepped back from day-to-day development; the protocol is maintained by a distributed set of contributors and yTeams under DAO governance.',
            },
            {
                'name': 'Yearn contributors / veYFI DAO',
                'role': 'Decentralized development and governance',
                'description': 'A community of independent contributor teams (yTeams) builds and maintains vaults and strategies, funded and directed through on-chain veYFI governance and the protocol treasury rather than a single company.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Actively-managed mutual fund / fund-of-funds',
                'similarity': "Like an actively-managed fund, a yVault pools depositors' capital and delegates allocation decisions to strategies that seek the best available returns; multi-strategy V3 vaults resemble a fund-of-funds that spreads capital across sub-strategies.",
                'differences': 'Yearn is non-custodial and permissionless with on-chain, auditable strategies and no fund manager gatekeeping; returns come from DeFi yield (lending, LP fees, staking) rather than securities, and smart-contract risk replaces traditional custody/counterparty structures.',
            },
        ],
        events=[
            {
                'date': '2021-02-04',
                'title': 'V1 DAI vault flash-loan exploit (~$11M)',
                'description': "An attacker used Aave/dYdX flash loans to imbalance Curve's 3CRV pool and force the yDAI V1 vault to deposit at an unfavorable rate, draining about $11 million; the team mitigated within minutes. A V1 issue, not V2 vaults.",
                'link': 'https://www.coindesk.com/tech/2021/02/04/yearn-finance-dai-vault-has-suffered-an-exploit-11m-drained',
            },
            {
                'date': '2023-04-13',
                'title': 'Legacy yUSDT misconfiguration exploit (~$10M+)',
                'description': 'A years-old copy-paste error made the legacy yUSDT contract reference Fulcrum iUSDC instead of iUSDT; the attacker minted 1.2 quadrillion yUSDT from a 10,000 USDT deposit, causing roughly $10-11.5M in losses. Yearn V2/V3 vaults were unaffected.',
                'link': 'https://www.halborn.com/blog/post/explained-the-yearn-finance-hack-april-2023',
            },
            {
                'date': '2025-06-02',
                'title': 'yBOLD launch (Liquity V2 integration)',
                'description': "Yearn launched yBOLD, an auto-compounding, oracle-less, yield-bearing wrapper for Liquity V2's BOLD that allocates across Stability Pools on Yearn V3, following a Sherlock audit competition.",
                'link': 'https://docs.yearn.fi/getting-started/products/yvaults/yBold',
            },
        ],
        timeline=[
            {
                'date': '2020-07-17',
                'title': 'Fair launch of YFI',
                'description': "Andre Cronje distributed 30,000 YFI to early liquidity providers with no pre-mine, no VC round and no founder allocation, establishing Yearn's governance token via a fair launch.",
                'link': 'https://coinmarketcap.com/academy/article/deep-dive-into-the-astronomic-growth-of-yearn-finance-yfi',
                'status': 'executed',
            },
            {
                'date': '2022-04-16',
                'title': 'veYFI vote-escrow governance audited',
                'description': 'yAudit completed a review of the veYFI vote-escrow tokenomics (VotingEscrow and Gauge contracts) over ~20 days, ahead of the on-chain veYFI governance rollout.',
                'link': 'https://reports.yaudit.dev/reports/04-2022-veYFI/',
                'status': 'executed',
            },
            {
                'date': '2024-05-04',
                'title': 'yVaults V3 audited by ChainSecurity',
                'description': 'ChainSecurity completed its audit of Yearn Vaults V3 (v3.0.0), the ERC-4626 rewrite enabling single- and multi-strategy vaults, alongside audits from StateMind and yAudit.',
                'link': 'https://github.com/yearn/yearn-security/tree/master/audits/20240504_ChainSecurity_Yearn_V3',
                'status': 'executed',
            },
            {
                'date': '2025-06-02',
                'title': 'yBOLD goes live',
                'description': 'Yearn integrated Liquity V2 and launched yBOLD/st-yBOLD, an auto-compounding stablecoin yield product on Yearn V3.',
                'link': 'https://docs.yearn.fi/getting-started/products/yvaults/yBold',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'YFI max supply',
                'value': '30,000 YFI (fair-launched July 17, 2020, no pre-mine or founder allocation)',
                'freshness': 'static',
                'source': {
                    'label': 'CoinMarketCap Academy — Growth of Yearn.Finance & YFI',
                    'url': 'https://coinmarketcap.com/academy/article/deep-dive-into-the-astronomic-growth-of-yearn-finance-yfi',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'April 2023 exploit loss',
                'value': '~$10M+ (reported ~$11.5M) from legacy misconfigured yUSDT; V2/V3 vaults unaffected',
                'freshness': 'static',
                'source': {
                    'label': 'Halborn — Explained: The Yearn Finance Hack (April 2023)',
                    'url': 'https://www.halborn.com/blog/post/explained-the-yearn-finance-hack-april-2023',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Vault and strategy contracts are complex and have been exploited historically (Feb 2021 V1 DAI vault ~$11M via flash loan; April 2023 legacy yUSDT misconfiguration ~$10M+). A copy-paste/config error persisting for years shows how latent bugs in legacy code can be catastrophic.',
            },
            {
                'category': 'Systemic',
                'description': 'Yearn strategies deposit into and depend on underlying protocols such as Curve, Convex, Aave, Compound and Liquity. A failure, exploit, depeg or economic attack on any of those base protocols (e.g. the Curve 3CRV pool manipulation used in 2021) can propagate losses into Yearn vaults.',
            },
            {
                'category': 'Oracle',
                'description': 'Some strategies rely on price/exchange-rate assumptions and pool ratios; the 2021 exploit manipulated a Curve pool exchange rate and the 2023 exploit manipulated share-price/pool-ratio calculation, both effectively pricing/oracle-adjacent manipulation vectors.',
            },
            {
                'category': 'Governance',
                'description': 'Protocol direction, gauge weights, strategy approvals and treasury allocation are controlled through veYFI vote-escrow governance; concentration of locked YFI or governance capture could steer risk parameters or strategy whitelisting against depositor interests.',
            },
            {
                'category': 'Collateral',
                'description': "Newer products wrap third-party assets whose stability Yearn does not control — e.g. yBOLD's exposure to Liquity V2 BOLD and its Stability Pools, and yCRV/yETH exposure to CRV and staked-ETH LSTs — so depeg or underperformance of the wrapped collateral flows through to holders.",
            },
        ],
        competitors=[
            {
                'name': 'Convex Finance',
                'slug': 'convex-finance',
                'rank': 1,
                'positioning': 'In-pool peer and yield-boosting layer for Curve; both aggregate/optimize Curve-based yield.',
                'similarities': "Both let users earn boosted Curve/Convex yield without directly locking CRV, and Yearn's yCRV strategies route through Curve/Convex.",
                'differences': 'Convex is specialized on Curve (and later Frax/Prisma) boost aggregation, whereas Yearn is a general multi-strategy yield aggregator across many protocols and asset types.',
            },
            {
                'name': 'Beefy',
                'slug': 'beefy',
                'rank': 2,
                'positioning': 'In-pool peer; multi-chain auto-compounding yield optimizer.',
                'similarities': 'Both offer automated, auto-compounding vaults that abstract away manual yield farming for depositors.',
                'differences': 'Beefy emphasizes broad multi-chain coverage and simpler auto-compounding vaults; Yearn focuses on curated, more actively-managed strategies and richer governance/tokenomics (veYFI, yLockers).',
            },
            {
                'name': 'Aura Finance',
                'slug': 'aura',
                'rank': 3,
                'positioning': 'Balancer-ecosystem yield/boost aggregator, analogous to Convex but for Balancer.',
                'similarities': 'Both aggregate and optimize DEX-based yield and offer boosted, auto-compounding exposure to LP positions.',
                'differences': 'Aura is focused on the Balancer/veBAL ecosystem; Yearn is protocol-agnostic and spans lending, LP, LST and stablecoin strategies.',
            },
            {
                'name': 'Morpho / lending vaults',
                'slug': None,
                'rank': 4,
                'positioning': 'Curated on-chain lending vaults competing for stablecoin yield deposits.',
                'similarities': 'Both offer curated, non-custodial vaults where depositors receive optimized yield without active management.',
                'differences': 'Morpho vaults are lending-market-specific (curated risk over lending protocols), while Yearn spans many yield sources beyond lending.',
            },
        ],
        audits=[
            {
                'firm': 'MixBytes',
                'date': '2020-12-01',
                'url': 'https://github.com/yearn/yearn-security/tree/master/audits/202012_MixBytes_yearn-vaults',
            },
            {
                'firm': 'Trail of Bits',
                'date': '2021-07-19',
                'url': 'https://github.com/yearn/yearn-security/tree/master/audits/20210719_ToB_yearn_vaultsv2',
            },
            {
                'firm': 'yAudit',
                'date': '2022-04-16',
                'url': 'https://reports.yaudit.dev/reports/04-2022-veYFI/',
            },
            {
                'firm': 'StateMind',
                'date': '2024-05-02',
                'url': 'https://github.com/yearn/yearn-security/tree/master/audits/20240502_Statemind_Yearn_V3',
            },
            {
                'firm': 'ChainSecurity',
                'date': '2024-05-04',
                'url': 'https://github.com/yearn/yearn-security/tree/master/audits/20240504_ChainSecurity_Yearn_V3',
            },
            {
                'firm': 'yAudit (YAcademy)',
                'date': '2024-06-01',
                'url': 'https://github.com/yearn/yearn-security/tree/master/audits/20240601_YAcademy_Yearn_V3',
            },
        ],
        sources=[
            {
                'label': 'Yearn Docs — yVaults V3 overview',
                'url': 'https://docs.yearn.fi/developers/v3/overview',
            },
            {
                'label': 'Yearn Docs — Security / audits list',
                'url': 'https://docs.yearn.fi/developers/security',
            },
            {
                'label': 'Yearn Docs — yBOLD',
                'url': 'https://docs.yearn.fi/getting-started/products/yvaults/yBold',
            },
            {
                'label': 'CoinDesk — Yearn DAI vault exploit, $11M drained (Feb 2021)',
                'url': 'https://www.coindesk.com/tech/2021/02/04/yearn-finance-dai-vault-has-suffered-an-exploit-11m-drained',
            },
            {
                'label': 'Halborn — Explained: The Yearn Finance Hack (April 2023)',
                'url': 'https://www.halborn.com/blog/post/explained-the-yearn-finance-hack-april-2023',
            },
            {
                'label': 'CoinMarketCap Academy — Growth of Yearn.Finance & YFI (fair launch)',
                'url': 'https://coinmarketcap.com/academy/article/deep-dive-into-the-astronomic-growth-of-yearn-finance-yfi',
            },
            {
                'label': 'yAudit — veYFI audit report (April 2022)',
                'url': 'https://reports.yaudit.dev/reports/04-2022-veYFI/',
            },
        ],
        github="https://github.com/yearn",
        member_coins=[
            _coin("yfi", "yearn.finance", "YFI", "Governance token (veYFI vote-escrow)"),
        ],
    ),
    "convex-finance": _net(
        name="Convex Finance",
        symbol="CVX",
        tagline="Boosted Curve yield without locking CRV yourself.",
        description=(
            "Convex lets Curve LPs and CRV holders earn boosted rewards without "
            "locking CRV themselves. It aggregates veCRV voting power to maximize "
            "gauge boosts and auto-compounds CRV/CVX rewards for depositors."
        ),
        differentiator=(
            "Controls a dominant share of veCRV, making it the primary venue for "
            "boosted Curve yield and the heart of the Curve bribe economy."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["Auto-Compounding", "ve-Tokenomics"],
        chains=["Ethereum", "Arbitrum", "Polygon"],
        underlying_protocols=["Curve", "Frax", "Prisma"],
        official_docs="https://docs.convexfinance.com",
        website="https://www.convexfinance.com",
        twitter="https://x.com/ConvexFinance",
        components=[
            {
                'name': 'cvxCRV (liquid staked CRV)',
                'description': 'A liquid wrapper minted when users stake CRV through Convex. Convex locks the CRV as veCRV permanently, so the CRV-to-cvxCRV conversion is one-way. cvxCRV can be traded on the open market or staked to earn a share of Curve trading fees (as 3CRV), a portion of the boosted CRV earned by all Convex LPs, and CVX rewards.',
            },
            {
                'name': 'CVX (governance/reward token)',
                'description': "Convex's native token with a hard cap of 100 million. 50% is emitted pro-rata to Curve LPs based on CRV earned through the platform; the remainder covers liquidity mining (25%), team (10%), treasury (9.7%), investors (3.3%) and veCRV-holder airdrops (2%).",
            },
            {
                'name': 'vlCVX (vote-locked CVX)',
                'description': "CVX locked for a 16-week epoch (16 weeks plus a few days) to receive vlCVX voting power. vlCVX holders direct how Convex's aggregated veCRV position votes on Curve gauge weights, and receive a share of protocol-earned CRV plus bribe/incentive income.",
            },
            {
                'name': 'Boosted Curve LP vaults',
                'description': 'Curve LP-token deposit vaults. Because Convex holds a very large veCRV balance, deposited LP positions receive a near-maximum CRV boost without the LP having to lock any CRV themselves; depositors also earn CVX on top of base Curve rewards.',
            },
            {
                'name': 'Votium bribe marketplace (integration)',
                'description': "An external incentive/bribe marketplace where protocols pay vlCVX voters to direct Convex's veCRV weight toward their Curve gauge. Central to the Convex-mediated Curve bribe economy.",
            },
        ],
        faq=[
            {
                'question': 'What does Convex Finance do?',
                'answer': "Convex lets Curve liquidity providers earn boosted CRV and trading fees without locking CRV themselves. It aggregates users' CRV into a large veCRV position, applies a near-maximum boost to pooled LP deposits, and adds CVX rewards on top.",
                'pinned': True,
            },
            {
                'question': 'What is cvxCRV and is the conversion reversible?',
                'answer': 'cvxCRV is a liquid token received when you stake CRV via Convex. The underlying CRV is permanently locked as veCRV by Convex, so converting CRV to cvxCRV is irreversible; to exit you must sell cvxCRV on a secondary market, where it can trade below CRV.',
                'pinned': False,
            },
            {
                'question': 'What is vlCVX and how long is the lock?',
                'answer': "vlCVX is vote-locked CVX. Locking CVX for a 16-week epoch grants vlCVX, which controls how Convex's veCRV votes on Curve gauge weights and earns a share of protocol CRV and bribe income.",
                'pinned': False,
            },
            {
                'question': 'How is Convex central to the Curve Wars?',
                'answer': "By holding roughly half of all veCRV, Convex became the dominant force directing Curve's CRV emissions. Protocols compete to acquire or bribe vlCVX (largely via Votium) to steer that voting power toward their own Curve pools.",
                'pinned': False,
            },
            {
                'question': 'What is the supply of CVX?',
                'answer': 'CVX has a hard cap of 100 million tokens. Half is distributed pro-rata to LPs based on CRV earned through Convex, with the rest allocated to liquidity mining, team, treasury, investors and veCRV-holder airdrops.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Convex core team',
                'role': 'Pseudonymous founding/development team',
                'description': 'Convex was launched in May 2021 by a pseudonymous team; core contributors are known primarily by online handles rather than public identities.',
            },
            {
                'name': 'vlCVX governance (Convex DAO)',
                'role': 'Token-holder governance',
                'description': "Protocol decisions and, most importantly, the direction of Convex's veCRV gauge votes are controlled by vote-locked CVX (vlCVX) holders via on-chain and Snapshot voting.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Actively managed yield / index fund wrapper',
                'similarity': 'Users deposit an asset and a manager pools it to capture scale advantages (here, an outsized veCRV boost) that an individual could not achieve alone, returning enhanced yield.',
                'differences': "Non-custodial and governed by token holders rather than a licensed manager; the 'boost' comes from on-chain vote-escrow mechanics, and the deposit token (cvxCRV) is itself a permanent, irreversible claim traded on open markets.",
            },
            {
                'product': 'Proxy-voting / shareholder-activism aggregator',
                'similarity': 'Aggregates dispersed voting rights (veCRV) into a concentrated bloc and monetizes control over how those votes are cast, similar to a proxy advisor marshalling shareholder votes.',
                'differences': 'Voting power is openly rented via a transparent bribe market (Votium) rather than delegated by mandate, and the votes allocate token emissions rather than corporate board seats.',
            },
        ],
        events=[
            {
                'date': '2021-05-17',
                'title': 'Convex Finance launches',
                'description': 'Convex went live, letting Curve LPs earn boosted CRV without locking CRV; it accumulated over $1B in deposits within roughly two weeks.',
                'link': 'https://medium.com/coinmonks/convex-curve-curve-d7e28cd6c1d9',
            },
            {
                'date': '2021-09-01',
                'title': 'Votium bribe marketplace and the escalation of the Curve Wars',
                'description': "Bribe marketplaces such as Votium legitimized paying vlCVX voters to direct Convex's veCRV weight, making Convex the central battleground of the Curve Wars as protocols like Frax competed for emissions.",
                'link': 'https://tokenbrice.xyz/crv-wars/',
            },
        ],
        timeline=[
            {
                'date': '2021-04-19',
                'title': 'MixBytes audit of core platform',
                'description': 'MixBytes completed a security audit of the Convex platform contracts ahead of launch.',
                'link': 'https://github.com/convex-eth/platform/blob/main/audit/Convex%20Platform%20Security%20Audit%20Report.pdf',
                'status': 'executed',
            },
            {
                'date': '2021-05-17',
                'title': 'Mainnet launch',
                'description': 'Convex Finance launched on Ethereum mainnet.',
                'link': 'https://medium.com/coinmonks/convex-curve-curve-d7e28cd6c1d9',
                'status': 'executed',
            },
            {
                'date': '2022-04-01',
                'title': 'Convex-Frax staking platform audited (PeckShield)',
                'description': "PeckShield audited the Convex-Frax staking platform, extending Convex's boost model to Frax's vote-escrow system.",
                'link': 'https://github.com/convex-eth/frax-cvx-platform/blob/main/audits/PeckShield-Audit-Report-Convex-Frax-Staking-v1.0.pdf',
                'status': 'executed',
            },
            {
                'date': '2022-11-01',
                'title': 'Sidechain platform audit (PeckShield)',
                'description': "PeckShield audited Convex's sidechain platform, expanding Convex beyond Ethereum mainnet.",
                'link': 'https://github.com/convex-eth/sidechain-platform/blob/main/audits/PeckShield-Audit-Report-Convex-Sidechain-v1.0.pdf',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'CVX max supply',
                'value': '100,000,000 CVX (hard cap); 50% distributed pro-rata to Curve LPs by CRV earned through Convex',
                'freshness': 'static',
                'source': {
                    'label': 'Convex Finance docs - Tokenomics',
                    'url': 'https://docs.convexfinance.com/convexfinance/general-information/tokenomics',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Share of veCRV controlled',
                'value': 'Largest single veCRV holder at over 41% of supply per Dune data (June 2024); has hovered around ~50% since mid-2022',
                'freshness': 'static',
                'source': {
                    'label': 'Switchere - Convex Finance guide',
                    'url': 'https://switchere.com/guides/cvx-coin',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'vlCVX vote-lock period',
                'value': 'CVX vote-locks into vlCVX for a 16-week epoch (16 weeks plus a few days) to gain gauge-voting power',
                'freshness': 'static',
                'source': {
                    'label': 'Curve Wars analysis - tokenbrice.xyz',
                    'url': 'https://tokenbrice.xyz/crv-wars/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Systemic',
                'description': "Convex is almost entirely dependent on Curve and its veCRV vote-escrow model. A collapse in CRV value, changes to Curve's gauge/boost mechanics, or a CRV emissions wind-down would directly undermine Convex's core value proposition.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'cvxCRV can depeg from CRV. Because minting cvxCRV permanently locks CRV as veCRV, the only exit is selling cvxCRV on secondary markets, where it has historically traded at a discount to CRV under sell pressure.',
            },
            {
                'category': 'Governance',
                'description': "Governance power is concentrated in vote-locked CVX (vlCVX). Large vlCVX holders and a bribe-driven vote market (Votium) can steer Convex's very large veCRV bloc, creating vote-buying and centralization-of-influence risk over Curve emissions.",
            },
            {
                'category': 'Smart Contract',
                'description': 'Convex is a complex system of vaults, staking wrappers and cross-protocol integrations. Despite multiple audits, bugs or exploits in Convex contracts, or in the Curve/Frax contracts it wraps, could lead to loss of deposited funds.',
            },
            {
                'category': 'Counterparty',
                'description': "Convex is run by a pseudonymous team and relies on external integrations (Curve, Frax, Votium). Users depend on those parties and on Convex's own privileged contract roles behaving honestly and remaining available.",
            },
        ],
        competitors=[
            {
                'name': 'Aura Finance',
                'slug': 'aura',
                'rank': 1,
                'positioning': 'The direct analogue of Convex, built on Balancer instead of Curve.',
                'similarities': "Aggregates veBAL (via auraBAL) and vote-locks its token into vlAURA to control Balancer gauge weights, mirroring Convex's cvxCRV/vlCVX model and boost-without-locking value proposition.",
                'differences': "Operates on Balancer's veBAL rather than Curve's veCRV, and controls a smaller share (~29%) of its underlying vote-escrow supply than Convex does of veCRV.",
            },
            {
                'name': 'Yearn Finance',
                'slug': 'yearn-finance',
                'rank': 2,
                'positioning': 'Long-standing yield aggregator and a peer veCRV holder competing for Curve boost.',
                'similarities': 'Also accumulates veCRV (via yveCRV/yCRV) and auto-compounds Curve/Convex yields for depositors; a rival for control of Curve emissions.',
                'differences': 'A broad multi-strategy vault platform rather than a Curve/Convex-specific boost aggregator; often routes strategies through Convex itself rather than competing purely head-to-head.',
            },
            {
                'name': 'StakeDAO',
                'slug': None,
                'rank': 3,
                'positioning': 'Liquid-locker competitor holding the third-largest veCRV position.',
                'similarities': 'Offers liquid-locker wrappers (sdCRV) and directs an accumulated veCRV bloc over Curve gauges, competing directly for the same veCRV mindshare.',
                'differences': 'Holds a materially smaller veCRV share than Convex and spans multiple vote-escrow ecosystems (Balancer, Frax, Angle) via its liquid-locker suite.',
            },
        ],
        audits=[
            {
                'firm': 'MixBytes',
                'date': '2021-04-19',
                'url': 'https://github.com/convex-eth/platform/blob/main/audit/Convex%20Platform%20Security%20Audit%20Report.pdf',
            },
            {
                'firm': 'PeckShield',
                'date': '2022-04-01',
                'url': 'https://github.com/convex-eth/frax-cvx-platform/blob/main/audits/PeckShield-Audit-Report-Convex-Frax-Staking-v1.0.pdf',
            },
            {
                'firm': 'PeckShield',
                'date': '2022-09-01',
                'url': 'https://github.com/convex-eth/platform/blob/main/audit/PeckShield-Audit-Report-ConvexStakingWrapperOhmSync-v1.0.pdf',
            },
            {
                'firm': 'PeckShield',
                'date': '2022-11-01',
                'url': 'https://github.com/convex-eth/sidechain-platform/blob/main/audits/PeckShield-Audit-Report-Convex-Sidechain-v1.0.pdf',
            },
            {
                'firm': 'Nomoi',
                'date': '2023-01-01',
                'url': 'https://github.com/convex-eth/platform/blob/main/audit/convex-cvxcrv-staking-wrapper.pdf',
            },
            {
                'firm': 'ChainSecurity',
                'date': '2023-04-01',
                'url': 'https://github.com/convex-eth/platform/blob/main/audit/Smart-Contract-Audit-Silo_Finance_Curve__Convex_Feature-ChainSecurity.pdf',
            },
        ],
        sources=[
            {
                'label': 'Convex Finance official docs - Audits',
                'url': 'https://docs.convexfinance.com/convexfinance/faq/audits',
            },
            {
                'label': 'Convex Finance official docs - Tokenomics',
                'url': 'https://docs.convexfinance.com/convexfinance/general-information/tokenomics',
            },
            {
                'label': 'Coinmonks - Convex(Curve) exploration (launch & mechanics)',
                'url': 'https://medium.com/coinmonks/convex-curve-curve-d7e28cd6c1d9',
            },
            {
                'label': 'tokenbrice.xyz - CRV Wars analysis (Votium, vlCVX, bribes)',
                'url': 'https://tokenbrice.xyz/crv-wars/',
            },
            {
                'label': 'Switchere - Convex Finance guide (veCRV share)',
                'url': 'https://switchere.com/guides/cvx-coin',
            },
            {
                'label': 'Aura Finance docs - What is Aura (competitor analogue)',
                'url': 'https://docs.aura.finance/aura/what-is-aura',
            },
        ],
        github="https://github.com/convex-eth",
        member_coins=[
            _coin("cvx", "Convex Finance", "CVX", "Governance token (vlCVX vote-locked)"),
        ],
    ),
    "beefy": _net(
        name="Beefy",
        symbol="BIFI",
        tagline="Multi-chain auto-compounding yield optimizer.",
        description=(
            "Beefy is a decentralized, multi-chain yield optimizer. Its vaults "
            "automatically harvest farm rewards and recompound them back into the "
            "underlying LP position, maximizing compounded APY across dozens of chains."
        ),
        differentiator=(
            "One of the broadest multi-chain vault footprints in DeFi (20+ chains), "
            "with fully on-chain, community-audited auto-compounding strategies."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["Auto-Compounding", "Multi-Chain"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon", "BNB Chain", "Avalanche"],
        underlying_protocols=["Curve", "Aerodrome", "Balancer", "Uniswap"],
        official_docs="https://docs.beefy.finance",
        website="https://beefy.com",
        twitter="https://x.com/beefyfinance",
        components=[
            {
                'name': 'Vaults (auto-compounding)',
                'description': "Beefy's core product. Users deposit a token (or LP token) and receive an ERC-20 mooToken receipt; the vault's investment strategy automatically harvests farm reward tokens from an underlying DEX or farm, swaps them back into the deposited asset, and reinvests them, so the redeemable value per mooToken grows over time without the user manually claiming or restaking.",
            },
            {
                'name': 'mooToken receipt tokens',
                'description': 'Interest-bearing, tokenized proof of deposit issued at deposit. The count of mooTokens in a wallet stays constant while the quantity of underlying vault tokens they redeem for increases as the strategy compounds.',
            },
            {
                'name': 'Cowcentrated Liquidity Manager (CLM)',
                'description': "Beefy's automated manager for concentrated-liquidity (Uniswap-V3-style) pools. It reassesses and resets the position range roughly every 6 hours via onchain calls, reinvests trading fees, and uses a main 50/50 position plus an alt single-sided position so all capital stays deployed. Because it does not sell tokens to rebalance, range impermanent loss is not realized until the position is exited. Depositors receive Cow Tokens / Reward Cow Tokens, and classic auto-compounding Vaults can be layered on top (issuing mooBeefy tokens).",
            },
            {
                'name': 'Zaps',
                'description': "A one-click routing tool (ZAP V2) that converts a user's input token into the correct underlying asset or LP position for a vault on deposit, and back out on withdrawal, charging a small 0.05% zap fee.",
            },
            {
                'name': 'BIFI token, DAO and Revenue Share',
                'description': "BIFI is Beefy's fixed-supply governance token. Holders vote 1-vote-per-token in the Beefy Snapshot space, and a share of vault performance fees is routed (post-2023 migration, via mooBIFI/rBIFI incentive programmes on Ethereum) back to BIFI stakers as a revenue-share.",
            },
        ],
        faq=[
            {
                'question': 'What is Beefy and how does auto-compounding work?',
                'answer': "Beefy is a decentralized, multi-chain yield optimizer. You deposit a token or LP position into a vault and receive a mooToken receipt. The vault's strategy automatically harvests reward tokens from the underlying farm, swaps them back into your deposited asset, and reinvests them multiple times, so your redeemable balance compounds without any manual claiming or restaking.",
                'pinned': True,
            },
            {
                'question': 'What does it cost to use Beefy?',
                'answer': 'Beefy charges a performance fee only on the yield it generates, not on your principal, and the fee is already reflected in the advertised APY. On standard vaults the performance fee is 4.05% of harvested profit, split between BIFI holders (3.0%), the Beefy treasury (0.5%), the vault strategist (0.5%) and the harvest caller (0.05%). Zap deposits/withdrawals incur an additional 0.05% zap fee.',
                'pinned': False,
            },
            {
                'question': 'What is BIFI and what does staking it do?',
                'answer': "BIFI is Beefy's governance token with a fixed supply of 80,000, launched in September 2020 with no ability to mint more. Holders vote on governance via Snapshot at 1 vote per token, and staking BIFI entitles you to a share of protocol revenue distributed through Beefy's incentive programmes.",
                'pinned': False,
            },
            {
                'question': 'How many chains does Beefy support?',
                'answer': "Beefy is one of DeFi's most broadly deployed yield optimizers, running on well over 15 blockchains including Ethereum, BNB Chain, Polygon, Avalanche, Fantom/Sonic, Arbitrum, Optimism and Base, with new chains added regularly.",
                'pinned': False,
            },
            {
                'question': "What is Beefy's CLM (Cowcentrated Liquidity Manager)?",
                'answer': "CLM is Beefy's product for managing concentrated-liquidity positions on Uniswap-V3-style pools. It automatically resets the price range roughly every 6 hours, compounds trading fees, and keeps capital deployed via a main 50/50 plus an alt single-sided position, letting everyday users access concentrated liquidity without manually managing ranges.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Beefy DAO',
                'role': 'Governance',
                'description': 'Beefy is governed by BIFI token holders through the Beefy Snapshot space, voting at 1 vote per token on protocol matters. The project is community-run rather than a traditional company.',
            },
            {
                'name': 'Core contributor team & multisig',
                'role': 'Development and operations',
                'description': "A team of largely pseudonymous contributors builds vault strategies and protocol infrastructure and operates the project's multisig; strategists who deploy vaults earn a slice of the performance fee as a contribution incentive.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Auto-reinvesting / accumulating index or money-market fund',
                'similarity': "Like an accumulating fund that automatically reinvests dividends and interest, a Beefy vault continuously reinvests the yield it earns so the holder's position grows without any manual action, and a receipt token (mooToken) represents a proportional, appreciating share of the pool.",
                'differences': 'Beefy is non-custodial, permissionless and on-chain, with no minimums, redemptions available at any time, and returns driven by volatile DeFi farm rewards rather than regulated securities; there is no fund manager or investor protection, and smart-contract and underlying-protocol risks apply.',
            },
        ],
        events=[
            {
                'date': '2024-06-12',
                'title': 'Beefy CLM incentive push on Arbitrum (LTIPP)',
                'description': "Beefy promoted its Cowcentrated Liquidity Manager on Arbitrum in connection with Arbitrum's Long-Term Incentive Pilot Program, expanding managed concentrated-liquidity vaults.",
                'link': 'https://x.com/beefyfinance/status/1800908958850265182',
            },
        ],
        timeline=[
            {
                'date': '2020-09-01',
                'title': 'Beefy and BIFI token launch',
                'description': 'The Beefy protocol and its fixed-supply BIFI governance token launched in September 2020; the first vaults went live shortly after on BNB Chain, making Beefy one of the earliest yield optimizers on that chain.',
                'link': 'https://docs.beefy.finance/ecosystem/bifi-token',
                'status': 'executed',
            },
            {
                'date': '2021-02-01',
                'title': 'BIFI holders granted governance rights',
                'description': "BIFI token holders were granted voting rights over platform decisions, marking Beefy's shift toward DAO-style decentralized governance.",
                'link': 'https://docs.beefy.finance/ecosystem/bifi-token',
                'status': 'executed',
            },
            {
                'date': '2023-09-01',
                'title': 'BIFI migration to Ethereum (BIP-71)',
                'description': "Following the July 2023 failure of the Multichain bridge that had issued BIFI on non-native chains, Beefy governance approved BIP-71 to move the token's base to Ethereum, restructure the incentive programmes, and build a new Revenue Bridge and Token Bridge. The migration was implemented in September 2023 with a new non-mintable BIFI contract.",
                'link': 'https://docs.beefy.finance/ecosystem/bifi-token',
                'status': 'executed',
            },
            {
                'date': '2024-07-02',
                'title': 'Cowcentrated Liquidity Manager (CLM) audited and rolled out',
                'description': "Beefy's CLM concentrated-liquidity product completed a series of audits (including Sherlock, dated 2 July 2024) as it rolled out across chains, extending Beefy from classic vaults into managed concentrated liquidity.",
                'link': 'https://docs.beefy.finance/beefy-products/clm',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Performance fee (standard vault)',
                'value': '4.05% of harvested profit, split 3.0% to BIFI holders, 0.5% treasury, 0.5% strategist, 0.05% harvest caller',
                'freshness': 'static',
                'source': {
                    'label': 'Beefy Docs - Fees Breakdown',
                    'url': 'https://docs.beefy.finance/ecosystem/beefy-bulletins/beefy-finance-fees-breakdown',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'BIFI total supply',
                'value': '80,000 BIFI, fixed at deployment with no minting function',
                'freshness': 'static',
                'source': {
                    'label': 'Beefy Docs - $BIFI Token',
                    'url': 'https://docs.beefy.finance/ecosystem/bifi-token',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Chains supported',
                'value': 'Over 15 blockchains (incl. Ethereum, BNB Chain, Polygon, Avalanche, Fantom, Arbitrum, Optimism)',
                'freshness': 'static',
                'source': {
                    'label': 'Nansen - What is Beefy Protocol',
                    'url': 'https://nansen.ai/post/what-is-beefy-protocol',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Each Beefy vault is a strategy contract that automatically moves, swaps and reinvests deposited funds. A bug or exploit in a vault strategy, the zap router, or the CLM range-management logic could lead to loss of deposited funds despite extensive auditing.',
            },
            {
                'category': 'Systemic',
                'description': 'Vaults sit on top of external farms, DEXs and lending protocols. Beefy yields and principal depend on those underlying protocols remaining solvent and functional; a hack, rug or reward collapse in an underlying farm flows straight through to Beefy depositors.',
            },
            {
                'category': 'Network',
                'description': "Beefy's very broad multi-chain footprint (well over 15 chains) plus its historical reliance on cross-chain bridges creates large surface-area and bridge risk. The July 2023 Multichain bridge failure, which forced the BIP-71 migration of BIFI to Ethereum, is a concrete example of bridge/chain risk materially affecting the protocol.",
            },
            {
                'category': 'Collateral',
                'description': 'Many vaults hold LP or concentrated-liquidity positions exposed to impermanent loss and volatile reward tokens. In CLM, range impermanent loss accrues while a position is in range and is realized on exit, so users can withdraw less value than a simple hold of the underlying assets.',
            },
            {
                'category': 'Governance',
                'description': 'Protocol parameters, treasury use, fee levels and major changes (such as the token migration) are decided by BIFI holder votes and executed by a contributor multisig. Concentration of voting power or multisig-key compromise could adversely affect users.',
            },
        ],
        competitors=[
            {
                'name': 'Yearn Finance',
                'slug': 'yearn-finance',
                'rank': 1,
                'positioning': 'The original Ethereum-centric yield aggregator and closest conceptual peer.',
                'similarities': 'Both aggregate DeFi yield into auto-compounding, tokenized vaults with a receipt token and take a performance fee on generated yield.',
                'differences': 'Yearn is Ethereum/L2-focused with more curated, strategist-driven vaults, while Beefy prioritizes extremely broad multi-chain coverage (15+ chains) and permissionless community-built strategies across many smaller farms.',
            },
            {
                'name': 'Beefy competitor - Autofarm',
                'slug': None,
                'rank': 2,
                'positioning': 'Multi-chain auto-compounding yield optimizer that grew up alongside Beefy on BNB Chain.',
                'similarities': 'Directly comparable multi-chain vault auto-compounder targeting the same farm-yield users.',
                'differences': "Smaller footprint and less active chain expansion than Beefy, and no equivalent to Beefy's CLM concentrated-liquidity product.",
            },
            {
                'name': 'Beefy competitor - Convex / Aura (LP boosters)',
                'slug': 'convex-finance',
                'rank': 3,
                'positioning': 'Yield boosters that maximize returns on specific AMM ecosystems (Curve/Balancer) rather than aggregating across many farms.',
                'similarities': 'Compete for the same LP-yield-seeking capital and, like Beefy, abstract away manual reward claiming and boosting for depositors.',
                'differences': 'Convex (and Aura for Balancer) are narrowly specialized in one AMM ecosystem and centered on veToken boosting, whereas Beefy is a general, cross-protocol, cross-chain auto-compounder with no vote-locking model of its own.',
            },
        ],
        audits=[
            {
                'firm': 'DefiYield',
                'date': '2020-12-10',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'CertiK',
                'date': '2021-03-05',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'CertiK',
                'date': '2021-05-11',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'CertiK',
                'date': '2021-06-24',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'Zellic',
                'date': '2023-08-03',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'OpenZeppelin',
                'date': '2023-12-15',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'Zellic',
                'date': '2024-02-28',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'Cyfrin',
                'date': '2024-04-06',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'Certora',
                'date': '2024-06-30',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'Sherlock',
                'date': '2024-07-02',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'firm': 'Electisec',
                'date': '2025-04-05',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
        ],
        sources=[
            {
                'label': 'Beefy Docs - Overview',
                'url': 'https://docs.beefy.finance/',
            },
            {
                'label': 'Beefy Docs - $BIFI Token',
                'url': 'https://docs.beefy.finance/ecosystem/bifi-token',
            },
            {
                'label': 'Beefy Docs - Fees Breakdown',
                'url': 'https://docs.beefy.finance/ecosystem/beefy-bulletins/beefy-finance-fees-breakdown',
            },
            {
                'label': 'Beefy Docs - Vaults',
                'url': 'https://docs.beefy.finance/beefy-products/vaults',
            },
            {
                'label': 'Beefy Docs - CLM',
                'url': 'https://docs.beefy.finance/beefy-products/clm',
            },
            {
                'label': 'Beefy Audits (GitHub)',
                'url': 'https://github.com/beefyfinance/beefy-audits',
            },
            {
                'label': 'Nansen - What is Beefy Protocol',
                'url': 'https://nansen.ai/post/what-is-beefy-protocol',
            },
        ],
        github="https://github.com/beefyfinance",
        member_coins=[
            _coin("bifi", "Beefy", "BIFI", "Governance + revenue-share token"),
        ],
    ),
    "aura": _net(
        name="Aura",
        symbol="AURA",
        tagline="Boosted Balancer yield and veBAL aggregation.",
        description=(
            "Aura is to Balancer what Convex is to Curve: it aggregates veBAL voting "
            "power to maximize Balancer gauge boosts, letting BAL/BPT holders earn "
            "boosted, auto-compounded rewards without locking BAL themselves."
        ),
        differentiator=(
            "The dominant veBAL aggregator, steering Balancer emissions and "
            "underpinning the Balancer bribe market."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["Auto-Compounding", "ve-Tokenomics"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon", "Gnosis"],
        underlying_protocols=["Balancer"],
        official_docs="https://docs.aura.finance",
        website="https://aura.finance",
        twitter="https://x.com/aurafinance",
        components=[
            {
                'name': 'auraBAL',
                'description': 'Liquid wrapper token minted when a user deposits the 80BAL-20WETH Balancer Pool Token (BPT) into Aura, which permanently locks it as veBAL. auraBAL is issued 1:1 for the underlying veBAL exposure and, unlike native veBAL, is transferable and tradable. Stakers earn a share of BAL revenue and veBAL fees plus AURA rewards, without maintaining the 1-year Balancer lock themselves.',
            },
            {
                'name': 'vlAURA (vote-locked AURA)',
                'description': 'Governance and vote-direction token obtained by locking AURA for 16 weeks. vlAURA holders vote every two weeks on which Balancer gauges receive BAL emissions, effectively steering the veBAL that Aura controls. A gauge must reach at least 0.1% of vlAURA voting supply to receive Aura-directed emissions.',
            },
            {
                'name': 'Reward Pools / BPT staking',
                'description': "Users deposit Balancer Pool Tokens into Aura reward pools to earn boosted BAL (from Aura's aggregated veBAL boost) plus additional AURA emissions, earned block-by-block, without individually locking BAL.",
            },
            {
                'name': 'Hidden Hand bribe/incentive market',
                'description': "Meta-governance incentive marketplace integrated with Aura where protocols pay vlAURA voters to direct BAL emissions to their gauges. Aura 'core pools' route 65% of the fees they generate as voting incentives on Hidden Hand each two-week veBAL gauge cycle.",
            },
        ],
        faq=[
            {
                'question': 'What is Aura Finance?',
                'answer': "Aura is a protocol built on top of Balancer that aggregates BAL deposits and veBAL voting power to maximize incentives for Balancer liquidity providers and BAL stakers. It is widely described as 'Convex for Balancer' — the same veTokenomics-aggregation model Convex applies to Curve, applied to Balancer.",
                'pinned': True,
            },
            {
                'question': 'What is auraBAL?',
                'answer': 'auraBAL is a liquid wrapper for veBAL. When you deposit the 80BAL-20WETH Balancer Pool Token into Aura it is locked permanently as veBAL, and you receive auraBAL 1:1. auraBAL is transferable and tradable, so you get veBAL-style yield without personally locking for a year. The conversion is one-way; to exit you must sell auraBAL in a secondary pool.',
                'pinned': False,
            },
            {
                'question': 'What is vlAURA and how does voting work?',
                'answer': 'Locking AURA for 16 weeks gives vlAURA, which votes every two weeks on Balancer gauge emissions. Voting opens Thursdays 02:00 UTC and closes Mondays, and a gauge needs at least 0.1% of vlAURA supply to receive Aura emissions.',
                'pinned': False,
            },
            {
                'question': 'How is Aura different from Convex?',
                'answer': "Both apply the same vote-locking-aggregator model, but Aura targets Balancer's veBAL (max 1-year lock) rather than Curve's veCRV (max 4-year lock). Historically Aura has controlled roughly a quarter of veBAL supply, whereas Convex has controlled a majority of veCRV.",
                'pinned': False,
            },
            {
                'question': 'Is AURA a fixed-supply token?',
                'answer': 'Yes. AURA has a maximum supply of 100 million, with emissions tied to BAL earned on Aura via a declining schedule that started around 3.9 AURA per BAL and trends toward 1.4 AURA per BAL as supply grows.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Aura DAO / vlAURA governance',
                'role': 'Governance',
                'description': 'Aura operates through community governance rather than a traditional corporate team. AURA is vote-locked into vlAURA, and Aura Improvement Proposals (AIPs) are decided by vlAURA holders. Early governance (first 16 weeks) allocated roughly 2% of supply across proposals AIP-1, 3, 5, 6 and 15.',
            },
            {
                'name': 'Aura contributors',
                'role': 'Core contributors / development',
                'description': 'Anonymous/pseudonymous core contributors received a 10% supply allocation on a 2-year vesting schedule. No tokens were distributed to insiders or VCs outside of protocol contributors.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Proxy-voting / voting advisory aggregator (e.g. an ISS-style bloc that pools shareholder votes)',
                'similarity': "Aura pools many participants' governance rights (veBAL) into a single large voting bloc and directs how a shared resource (BAL emissions) is allocated, much like a proxy advisor concentrates dispersed shareholder votes into influence over corporate decisions.",
                'differences': "Aura's voting power is itself a tradable, incentivized market: votes are bought and sold openly via the Hidden Hand bribe market, holders are financially rewarded for delegating, and the entire process is on-chain and permissionless — unlike regulated, disclosure-bound proxy advisory.",
            },
        ],
        events=[
            {
                'date': '2023-08-22',
                'title': 'Balancer boosted-pool vulnerability disclosure (upstream exposure)',
                'description': "Balancer disclosed a critical vulnerability affecting certain V2 Boosted Pools, with roughly 1.4% of Balancer TVL (~$10M) deemed at risk across eight chains. Aura, which stakes Balancer LP tokens, was among the 'friendly protocols' using boosted pools and was promptly informed; most at-risk liquidity was withdrawn within hours.",
                'link': 'https://medium.com/balancer-protocol/the-balancer-report-the-recent-vulnerability-disclosure-6cbed7fda9c7',
            },
        ],
        timeline=[
            {
                'date': '2022-06-10',
                'title': 'AURA Liquidity Bootstrapping Pool (LBP) launch',
                'description': 'Aura launched via a five-day Balancer LBP paired with ETH (2.5% of supply for holder bootstrapping / ~2% in the LBP), bootstrapping token liquidity and governance distribution rather than a traditional VC raise. Just under 1.7M of a planned 2M LBP tokens were claimed.',
                'link': 'https://blog.aura.finance/against-all-odds-auras-lbp-recap-and-your-next-steps',
                'status': 'executed',
            },
            {
                'date': '2022-06-15',
                'title': 'Token Generation Event (TGE) completed',
                'description': 'The AURA TGE concluded on June 15, 2022, formally launching the protocol as a veBAL aggregator for the Balancer ecosystem.',
                'link': 'https://www.gate.com/learn/articles/what-is-aura-finance/3404',
                'status': 'executed',
            },
            {
                'date': '2023-03-20',
                'title': 'auraBAL Compounder audited (Halborn)',
                'description': "Halborn completed a two-week audit of the auraBAL Compounder contracts (March 6-20, 2023), expanding Aura's auto-compounding functionality.",
                'link': 'https://docs.aura.finance/aura/security',
                'status': 'executed',
            },
            {
                'date': '2023-06-06',
                'title': 'Sidechain / multi-chain expansion audited',
                'description': "Halborn (May 9 - June 6, 2023) and Zellic (May 28 - June 6, 2023) audited Aura's sidechain and Convex-Platform-lite contracts, supporting Aura's expansion to Balancer deployments beyond Ethereum mainnet.",
                'link': 'https://docs.aura.finance/aura/security',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Max AURA supply',
                'value': '100,000,000 AURA (fixed), with 50% allocated to Balancer LP rewards and emissions tied to BAL earned on Aura',
                'freshness': 'static',
                'source': {
                    'label': 'Aura Finance docs — $AURA Distribution',
                    'url': 'https://docs.aura.finance/aura/usdaura/distribution',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Balancer treasury AURA allocation',
                'value': '2% of AURA supply allocated to the Balancer treasury (2-year vesting), a further 2% for veBAL bootstrapping incentives',
                'freshness': 'static',
                'source': {
                    'label': 'Aura Finance docs — $AURA Distribution',
                    'url': 'https://docs.aura.finance/aura/usdaura/distribution',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Systemic',
                'description': "Aura is entirely dependent on Balancer and veBAL. Its value proposition (boosted BAL, gauge voting, auraBAL yield) collapses if Balancer's gauge/emissions system, BAL token value, or veBAL mechanics fail or are deprecated. Aura holds no independent yield source outside the Balancer ecosystem.",
            },
            {
                'category': 'Smart Contract',
                'description': "Exposure to Balancer's August 22, 2023 Boosted-Pool vulnerability: because Aura stakes Balancer LP tokens (including boosted pools), it inherits upstream Balancer contract risk. Roughly 1.4% of Balancer TVL was at risk across eight chains; Aura was a 'friendly protocol' notified and reliant on rapid LP withdrawals to avoid loss.",
            },
            {
                'category': 'Governance',
                'description': 'vlAURA voting power is concentrated and openly tradable. Because votes can be bought via the Hidden Hand bribe market, a well-capitalized actor can rent large vlAURA influence to redirect BAL emissions, and large lockers can dominate AIP outcomes — a meta-governance centralization / bribe-capture risk.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'auraBAL can trade below its 1:1 veBAL reference value. Minting auraBAL is one-way (the underlying is permanently locked as veBAL), so exits depend on secondary-market liquidity in the auraBAL pool; thin liquidity or a rush to exit can push auraBAL to a persistent discount / depeg.',
            },
            {
                'category': 'Oracle',
                'description': 'The upstream Balancer Boosted-Pool incident originated from a mismatch between the rate formula in Boosted Pools and an external rate/oracle data source. Aura positions built on rate-provider-dependent Balancer pools inherit that oracle/rate-manipulation surface.',
            },
        ],
        competitors=[
            {
                'name': 'Convex Finance',
                'slug': 'convex-finance',
                'rank': 1,
                'positioning': 'The direct analogue and template: Convex is the veCRV/Curve vote-locking aggregator that Aura replicates for veBAL/Balancer.',
                'similarities': 'Identical model — aggregate a governance ve-token, issue a liquid wrapper (cvxCRV vs auraBAL), vote-lock the native token (vlCVX vs vlAURA), and run a bribe market to direct emissions.',
                'differences': 'Convex targets Curve (veCRV, max 4-year lock) and has historically controlled a majority of veCRV; Aura targets Balancer (veBAL, max 1-year lock) and controls a smaller share (~25% of veBAL).',
            },
            {
                'name': 'Balancer',
                'slug': 'balancer',
                'rank': 2,
                'positioning': 'The underlying protocol Aura is built on — both a dependency and, for users choosing to lock veBAL directly, an alternative to routing through Aura.',
                'similarities': 'Same emissions/gauge system and veBAL asset; both let LPs earn boosted BAL.',
                'differences': "Balancer is the base DEX and emissions source; Aura is a layer on top that aggregates veBAL and adds AURA incentives. Locking veBAL directly on Balancer avoids Aura's smart-contract layer and AURA dependence but forgoes liquidity and boost aggregation.",
            },
            {
                'name': 'Yearn Finance',
                'slug': 'yearn-finance',
                'rank': 3,
                'positioning': 'Yield aggregator that also builds locker/wrapper products around ve-tokens and competes for the same yield-maximizing Balancer/Curve LP capital.',
                'similarities': 'Aggregates and auto-compounds DeFi yield, including strategies over Curve/Balancer LP positions and ve-token wrappers.',
                'differences': 'Yearn is a broad multi-protocol vault aggregator, not a Balancer-specific veBAL vote-direction layer; it does not run a Balancer-native governance/bribe market.',
            },
            {
                'name': 'Wombex',
                'slug': None,
                'rank': 4,
                'positioning': 'A Convex/Aura-style boosting layer built for the Wombat ecosystem, cited in direct comparisons with Aura and Convex.',
                'similarities': 'Same vote-lock-and-aggregate architecture applied to a different underlying (Wombat).',
                'differences': 'Targets Wombat rather than Balancer; different underlying liquidity base and far smaller scale.',
            },
        ],
        partnerships=[
            {
                'name': 'Balancer (strategic ecosystem tie)',
                'date': '2022-06-15',
                'amountLabel': '2% of AURA supply',
                'description': 'At launch Aura allocated 2% of AURA supply to the Balancer treasury (2-year vesting) plus 2% for veBAL bootstrapping incentives, formalizing a strategic alignment between Aura and the underlying Balancer protocol it aggregates.',
            },
        ],
        audits=[
            {
                'firm': 'PeckShield',
                'date': '2022-04-18',
                'url': 'https://docs.aura.finance/aura/security',
            },
            {
                'firm': 'Code4rena (competitive audit, $150k prize pool)',
                'date': '2022-05-25',
                'url': 'https://docs.aura.finance/aura/security',
            },
            {
                'firm': 'Halborn (core protocol, 6-week)',
                'date': '2022-06-23',
                'url': 'https://www.halborn.com/audits/aura-finance',
            },
            {
                'firm': 'Halborn (auraBAL Compounder)',
                'date': '2023-03-20',
                'url': 'https://docs.aura.finance/aura/security',
            },
            {
                'firm': 'Halborn (Sidechain / Convex Platform lite)',
                'date': '2023-06-06',
                'url': 'https://docs.aura.finance/aura/security',
            },
            {
                'firm': 'Zellic (Sidechain / Convex Platform lite)',
                'date': '2023-06-06',
                'url': 'https://docs.aura.finance/aura/security',
            },
        ],
        sources=[
            {
                'label': 'Aura Finance docs — Security (audits & bug bounty)',
                'url': 'https://docs.aura.finance/aura/security',
            },
            {
                'label': 'Aura Finance docs — $AURA Distribution / tokenomics',
                'url': 'https://docs.aura.finance/aura/usdaura/distribution',
            },
            {
                'label': 'Aura Finance docs — Frequently Asked Questions (auraBAL, vlAURA, Hidden Hand)',
                'url': 'https://docs.aura.finance/developers/frequently-asked-questions',
            },
            {
                'label': 'Aura Finance blog — LBP recap (launch)',
                'url': 'https://blog.aura.finance/against-all-odds-auras-lbp-recap-and-your-next-steps',
            },
            {
                'label': 'Balancer Protocol — The Recent Vulnerability Disclosure (Aug 2023)',
                'url': 'https://medium.com/balancer-protocol/the-balancer-report-the-recent-vulnerability-disclosure-6cbed7fda9c7',
            },
            {
                'label': 'Gate Learn — What Is Aura Finance (TGE date, model)',
                'url': 'https://www.gate.com/learn/articles/what-is-aura-finance/3404',
            },
            {
                'label': 'Halborn — Aura Finance audit reports',
                'url': 'https://www.halborn.com/audits/aura-finance',
            },
        ],
        github="https://github.com/aurafinance",
        member_coins=[
            _coin("aura-gov", "Aura Finance", "AURA", "Governance token (vlAURA vote-locked)"),
        ],
    ),
    "arrakis": _net(
        name="Arrakis Finance",
        symbol="",
        tagline="On-chain market making and LP infrastructure.",
        description=(
            "Arrakis provides trustless, automated market-making infrastructure for "
            "concentrated liquidity. Arrakis Modular lets protocols and DAOs deploy "
            "and manage on-chain LP strategies (e.g. Uniswap V3/V4) without a token."
        ),
        differentiator=(
            "Tokenless LP-management infrastructure used by protocols/DAOs to run "
            "professional, on-chain market-making vaults."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["LP-Strategy-Manager", "Concentrated-Liquidity"],
        chains=["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon"],
        underlying_protocols=["Uniswap"],
        official_docs="https://docs.arrakis.fi",
        website="https://arrakis.finance",
        twitter="https://x.com/ArrakisFinance",
        components=[
            {
                'name': 'Arrakis Modular',
                'description': 'The onchain smart-contract framework and universal Meta Vault standard. It lets protocols, DAOs and token issuers deploy managed, non-custodial concentrated-liquidity LP vaults, and is designed so that any concentrated-liquidity DEX (Uniswap v3/v4 and others) can be plugged in behind the same Meta Vault interfaces.',
            },
            {
                'name': 'Arrakis Pro',
                'description': 'A non-custodial onchain market-maker service for token issuers. Issuers retain ownership and control of assets in self-custodial vaults while Arrakis executes concentrated-liquidity market-making strategies (Bootstrap, Flagship, Yield-Bearing Asset, Treasury Diversification) on their behalf, combining onchain vaults with offchain market-making infrastructure.',
            },
            {
                'name': 'Arrakis Vaults',
                'description': 'The vault products for managing liquidity. Vaults come in three management styles: Trustless Vaults (a smart contract with a pre-defined strategy acts as manager), Managed Vaults (operated by professional market makers running offchain strategies), and Self-Managed Vaults (controlled solely by a single owning entity).',
            },
        ],
        faq=[
            {
                'question': 'What is Arrakis Finance?',
                'answer': 'Arrakis is a trustless, non-custodial onchain market-making and liquidity-provisioning infrastructure protocol. It lets liquidity providers, protocols and token issuers run sophisticated, capital-efficient concentrated-liquidity strategies on DEXs like Uniswap v3/v4 in an automated way, without needing in-house market-making expertise.',
                'pinned': True,
            },
            {
                'question': 'Does Arrakis have a governance token?',
                'answer': 'No. Arrakis is tokenless — it has no live governance or utility token. Its 2022 seed round was structured via a Simple Agreement for Future Tokens (SAFT), but as of this research no token had been issued.',
                'pinned': False,
            },
            {
                'question': 'How is Arrakis related to Gelato and G-UNI?',
                'answer': 'Arrakis began as G-UNI, an in-house application incubated by Gelato Network that wrapped Uniswap V3 liquidity positions into fungible, auto-compounding ERC-20 tokens. In March 2022 the Gelato DAO voted to spin G-UNI out into its own separate DAO, rebranded as Arrakis Finance.',
                'pinned': False,
            },
            {
                'question': 'What is Arrakis Modular?',
                'answer': "Arrakis Modular is the protocol's universal Meta Vault standard and smart-contract framework. It provides shared vault infrastructure and interfaces so that different two-sided LP vault integrations and any concentrated-liquidity DEX can be supported behind the same modules.",
                'pinned': False,
            },
            {
                'question': 'Is Arrakis custodial?',
                'answer': 'No. Arrakis vaults are non-custodial — only depositors can withdraw their own liquidity, and token issuers using Arrakis Pro retain ownership and control of their assets while Arrakis executes the market-making strategy.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Hilmar Orth',
                'role': 'Co-Founder',
                'description': 'Co-founder of Arrakis Finance and co-founder of Gelato Network, the automation protocol that originally incubated Arrakis as G-UNI.',
            },
            {
                'name': 'Ari Rodriguez',
                'role': 'Co-Founder',
                'description': 'Co-founder of Arrakis Finance; previously a senior smart-contract engineer at Gelato Network.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Market-making-as-a-service / designated market maker',
                'similarity': 'Like a professional market maker engaged by an issuer, Arrakis Pro provides continuous two-sided liquidity and price support for a token, running algorithmic strategies to keep spreads tight and inventory balanced.',
                'differences': 'Arrakis is non-custodial and onchain: the issuer keeps assets in their own vault rather than transferring them to a market-making firm, strategies execute transparently on public DEXs, and there is no bilateral loan-of-tokens arrangement or off-balance-sheet counterparty exposure.',
            },
            {
                'product': 'Prime brokerage / treasury liquidity management',
                'similarity': "Similar to a prime broker or treasury desk managing an institution's asset inventory and liquidity provisioning across venues.",
                'differences': 'Arrakis operates entirely through auditable smart contracts on public blockchains, with no discretionary custody of client funds and outcomes governed by transparent onchain vault rules rather than private brokerage agreements.',
            },
        ],
        events=[
            {
                'date': '2023-01-12',
                'title': 'Uniswap Labs publishes Arrakis trustless market-making feature',
                'description': 'The official Uniswap blog details how Arrakis provides trustless, automated, capital-efficient market making on Uniswap v3 concentrated liquidity, including dynamic fee-tier strategies for stablecoin pairs.',
                'link': 'https://blog.uniswap.org/arrakis-uniswap-protocol-v3',
            },
        ],
        timeline=[
            {
                'date': '2022-03-01',
                'title': 'G-UNI spun out of Gelato and rebranded as Arrakis Finance',
                'description': 'The Gelato DAO voted to release G-UNI — an in-house framework for fungible, auto-compounding Uniswap V3 liquidity positions — into its own separate DAO, rebranded as Arrakis Finance.',
                'link': 'https://forum.gelato.network/t/release-g-uni-as-separate-dao-from-gelato-rebrand-it-as-arrakis-finance/364',
                'status': 'executed',
            },
            {
                'date': '2022-12-19',
                'title': 'Arrakis Finance announces $4M seed round',
                'description': 'Arrakis disclosed a $4 million seed round raised via a SAFT, with investors including Uniswap Labs Ventures, Accel, Polygon Ventures and Robot Ventures.',
                'link': 'https://www.theblock.co/post/196319/decentralized-market-maker-arrakis-finance-raises-4-million-exclusive',
                'status': 'executed',
            },
            {
                'date': '2023-06-01',
                'title': 'Sherlock security review of Arrakis V2',
                'description': 'Sherlock ran a security audit contest covering Arrakis V2 core vaults, manager templates (SimpleManager with Chainlink oracles) and periphery routers.',
                'link': 'https://github.com/sherlock-audit/2023-06-arrakis',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Seed round amount',
                'value': '$4 million (SAFT), announced Dec 19 2022; investors incl. Uniswap Labs Ventures, Accel, Polygon Ventures, Robot Ventures',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — Arrakis Finance raises $4 million',
                    'url': 'https://www.theblock.co/post/196319/decentralized-market-maker-arrakis-finance-raises-4-million-exclusive',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Origin',
                'value': 'Formerly G-UNI, incubated by Gelato Network; spun out into its own DAO and rebranded Arrakis Finance in March 2022',
                'freshness': 'static',
                'source': {
                    'label': 'Gelato governance forum — Release G-UNI as separate DAO',
                    'url': 'https://forum.gelato.network/t/release-g-uni-as-separate-dao-from-gelato-rebrand-it-as-arrakis-finance/364',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Token status',
                'value': 'Tokenless — no live governance or utility token as of this research',
                'freshness': 'static',
                'source': {
                    'label': 'Arrakis Finance official site',
                    'url': 'https://arrakis.finance/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Arrakis vault contracts (including the Arrakis Modular framework and Uniswap V4 module) could contain vulnerabilities. ChainSecurity's review of the Uniswap V4 module found issues such as bad rounding and a manager fee that could be collected multiple times; while corrected, this underlines residual smart-contract risk.",
            },
            {
                'category': 'Systemic',
                'description': "Arrakis is a management layer built directly on top of underlying DEXs like Uniswap v3/v4. A bug, exploit or failure in the integrated DEX's contracts would propagate to Arrakis vaults, so the protocol inherits the risk of the venues it deploys liquidity into.",
            },
            {
                'category': 'Collateral',
                'description': "Active liquidity management does not eliminate impermanent/divergence loss or volatile-inventory exposure. Unhedged concentrated-liquidity strategies can leave depositors with a lower dollar value than simply holding, especially when the pool's asset price ratio shifts.",
            },
            {
                'category': 'Governance',
                'description': 'Vaults are subject to upgrade and privileged-role risk. Arrakis discloses that upgrades (guarded by a 48-hour timelock) and not-fully-trusted manager/quoter roles could, in principle, misbehave or extract small amounts of liquidity in discrete intervals.',
            },
            {
                'category': 'Oracle',
                'description': 'Managed and public vaults rely on price oracles (e.g. Chainlink feeds in SimpleManager). A compromised or manipulated oracle could enable MEV leakage during rebalancing or force automated liquidity management to pause.',
            },
            {
                'category': 'Regulatory',
                'description': 'As market-making-as-a-service infrastructure for token issuers, Arrakis operates in an evolving DeFi regulatory environment; changing frameworks could increase scrutiny or restrictions on the protocol or its users.',
            },
        ],
        competitors=[
            {
                'name': 'Gamma',
                'slug': 'gamma',
                'rank': 1,
                'positioning': 'The most direct in-pool peer: an active concentrated-liquidity management protocol offering automated, non-custodial LP vaults on Uniswap v3 and other DEXs.',
                'similarities': 'Both are non-custodial active liquidity managers that automate concentrated-liquidity positions on Uniswap v3/v4 and abstract away rebalancing for LPs and protocols.',
                'differences': 'Gamma emphasizes permissionless, community-facing LP vaults and its own manager infrastructure, whereas Arrakis leans toward market-making-as-a-service for token issuers (Arrakis Pro) and a modular Meta Vault standard, and is tokenless.',
            },
            {
                'name': 'Uniswap',
                'slug': 'uniswap',
                'rank': 2,
                'positioning': 'The underlying concentrated-liquidity DEX Arrakis builds on — simultaneously the venue Arrakis depends on and an alternative for LPs who prefer to manage positions directly.',
                'similarities': 'Both let users provide concentrated liquidity to trading pairs and earn swap fees on the same Uniswap v3/v4 pools.',
                'differences': 'Uniswap is the base AMM providing raw, manually-managed concentrated-liquidity positions; Arrakis is an active-management layer on top that automates rebalancing, fungibilizes positions and offers market-making-as-a-service to issuers.',
            },
            {
                'name': 'Maverick Protocol',
                'slug': 'maverick',
                'rank': 3,
                'positioning': 'A DEX/AMM with built-in dynamic liquidity distribution that automatically shifts LP positions to follow price, competing for the same automated-concentrated-liquidity mandate.',
                'similarities': 'Both target capital-efficient, automated concentrated liquidity that reduces the manual burden of managing LP ranges.',
                'differences': 'Maverick bakes automation into its own AMM primitive and has a token, whereas Arrakis is a tokenless management layer that sits on top of external DEXs like Uniswap.',
            },
        ],
        partnerships=[
            {
                'name': 'Uniswap Labs Ventures',
                'date': '2022-12-19',
                'amountLabel': None,
                'description': "Uniswap Labs Ventures participated as an investor in Arrakis's seed round, reflecting a close alignment between Arrakis's liquidity infrastructure and the Uniswap v3/v4 concentrated-liquidity protocol it builds on.",
            },
            {
                'name': 'Gelato Network',
                'date': '2022-03-01',
                'amountLabel': None,
                'description': "Arrakis originated as G-UNI inside Gelato Network, which incubated the project before spinning it out into an independent DAO. Arrakis's automation heritage traces to Gelato's infrastructure.",
            },
        ],
        investment_rounds=[
            {
                'date': '2022-12-19',
                'round': 'Seed',
                'amountUsd': 4000000,
                'amountLabel': '$4M',
                'investors': [
                    'Uniswap Labs Ventures',
                    'Accel',
                    'Polygon Ventures',
                    'Robot Ventures',
                ],
                'link': 'https://www.theblock.co/post/196319/decentralized-market-maker-arrakis-finance-raises-4-million-exclusive',
            },
        ],
        audits=[
            {
                'firm': 'Sherlock',
                'date': '2023-06-01',
                'url': 'https://github.com/sherlock-audit/2023-06-arrakis',
            },
        ],
        sources=[
            {
                'label': 'Arrakis Documentation — Intro / Arrakis Pro',
                'url': 'https://docs.arrakis.finance/',
            },
            {
                'label': 'Arrakis Modular overview — Arrakis Documentation',
                'url': 'https://docs.arrakis.finance/text/arrakisModular/overview.html',
            },
            {
                'label': 'Uniswap blog — Arrakis: Trustless Market Making on Uniswap v3',
                'url': 'https://blog.uniswap.org/arrakis-uniswap-protocol-v3',
            },
            {
                'label': 'The Block — Arrakis Finance raises $4 million (seed)',
                'url': 'https://www.theblock.co/post/196319/decentralized-market-maker-arrakis-finance-raises-4-million-exclusive',
            },
            {
                'label': 'Gelato forum — Release G-UNI as separate DAO, rebrand as Arrakis',
                'url': 'https://forum.gelato.network/t/release-g-uni-as-separate-dao-from-gelato-rebrand-it-as-arrakis-finance/364',
            },
            {
                'label': 'Arrakis Finance — Risks page',
                'url': 'https://arrakis.finance/risks',
            },
            {
                'label': 'ChainSecurity — Arrakis Uniswap V4 Module audit',
                'url': 'https://www.chainsecurity.com/security-audit/arrakis-uniswap-v4-module',
            },
        ],
        github="https://github.com/ArrakisFinance",
        scale_labels={"tvl": "Managed liquidity"},
    ),
    "maverick": _net(
        name="Maverick Protocol",
        symbol="MAV",
        tagline="Dynamic-distribution AMM with automated liquidity modes.",
        description=(
            "Maverick is a capital-efficient AMM whose Dynamic Distribution engine "
            "auto-shifts concentrated liquidity as price moves (modes: Right/Left/"
            "Both/Static), reducing manual rebalancing for LPs."
        ),
        differentiator=(
            "Automated liquidity 'modes' move concentrated positions with price, "
            "blending CLMM efficiency with hands-off LPing."
        ),
        liquidity_sub_sector="Vaults",
        liquidity_secondary_tags=["LP-Strategy-Manager", "Concentrated-Liquidity"],
        chains=["Ethereum", "Base", "BNB Chain", "Arbitrum", "ZKsync"],
        official_docs="https://docs.mav.xyz",
        website="https://www.mav.xyz",
        twitter="https://x.com/mavprotocol",
        components=[
            {
                'name': 'Dynamic Distribution AMM',
                'description': "Maverick's core automated market maker. It lets liquidity providers place liquidity in arbitrary concentrated distributions and natively automates the movement of that liquidity to follow price, removing the manual re-balancing or metaprotocol tooling that other concentrated-liquidity AMMs require.",
            },
            {
                'name': 'Liquidity Modes (Right / Left / Both / Static)',
                'description': 'Four LP behaviors relative to price. Mode Right follows price upward (bullish directional bet); Mode Left follows price downward (bearish); Mode Both shifts liquidity in either direction to stay concentrated around price (well suited to correlated/stable pairs); Mode Static holds a fixed distribution like a classic concentrated position.',
            },
            {
                'name': 'Boosted Positions',
                'description': 'A mechanism that lets protocols add token rewards to specific dynamic-distribution positions, directing incentives to targeted price ranges and liquidity shapes rather than across an entire pool.',
            },
            {
                'name': 'veMAV',
                'description': 'Non-transferable vote-escrowed MAV obtained by locking MAV. veMAV balance grants governance voting power and the ability to direct protocol incentive emissions toward particular pools or positions.',
            },
            {
                'name': 'Maverick v2 / Programmable Pools',
                'description': "The v2 architecture introduces Programmable Pools, where a designated smart-contract 'accessor' controls state-changing functions. This enables permissioned/KYC pools, dynamic fees, single-sided liquidity, and AI-driven per-transaction parameter optimization on top of the Maverick AMM. Deploying Programmable Pools is permissionless.",
            },
        ],
        faq=[
            {
                'question': 'What makes Maverick different from Uniswap V3?',
                'answer': "Both concentrate liquidity, but Uniswap V3 leaves LPs to manually re-set ranges (or rely on third-party managers). Maverick's Dynamic Distribution AMM automatically moves liquidity to follow price on-chain via its Right/Left/Both/Static modes, so a position can stay concentrated around the market price without active management.",
                'pinned': True,
            },
            {
                'question': 'What are the four liquidity modes?',
                'answer': 'Right (liquidity follows price up), Left (follows price down), Both (follows price in either direction, useful for correlated/stable pairs), and Static (a fixed distribution that does not move).',
                'pinned': False,
            },
            {
                'question': 'What is veMAV used for?',
                'answer': 'MAV can be locked for non-transferable veMAV, which confers governance voting power and lets holders direct incentive emissions to specific pools or positions.',
                'pinned': False,
            },
            {
                'question': 'What is Maverick v2?',
                'answer': "Maverick v2 adds Programmable Pools: liquidity pools fronted by an 'accessor' smart contract that controls state changes, enabling dynamic fees, permissioned/KYC pools, single-sided liquidity and AI-optimized parameters. It expanded Maverick's multi-chain footprint (for example a Scroll deployment in mid-2024).",
                'pinned': False,
            },
            {
                'question': 'Which chains is Maverick deployed on?',
                'answer': 'Maverick launched on Ethereum mainnet and zkSync Era, and has since expanded to additional EVM chains including BNB Chain, Base and Arbitrum, with v2 deployments such as Scroll.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Maverick Protocol',
                'role': 'Protocol / core development team',
                'description': 'The company and team building Maverick Protocol, a capital-efficiency-focused DeFi AMM. Backed by investors including Founders Fund, Pantera Capital, Jump Crypto, Circle Ventures, Gemini Frontier Fund and Coinbase Ventures across rounds in 2022 and 2023.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Automated / algorithmic market making desk',
                'similarity': 'Like a professional market-making desk, Maverick continuously repositions inventory around the prevailing price to keep quotes tight and capital productive.',
                'differences': "Maverick performs this repositioning automatically on-chain through smart-contract 'modes' rather than via a discretionary trading desk, and any user can supply liquidity permissionlessly rather than the activity being restricted to a licensed intermediary.",
            },
        ],
        events=[
            {
                'date': '2023-06-14',
                'title': 'MAV listed on Binance Launchpool',
                'description': 'MAV became the 34th Binance Launchpool project; farming by staking BNB and TUSD began 2023-06-14 00:00 UTC and ran through 2023-07-08.',
                'link': 'https://www.binance.com/en/support/announcement/introducing-maverick-protocol-mav-on-binance-launchpool-farm-mav-by-staking-bnb-and-tusd-a28d005ed545464cbb9a3661c26e6b38',
            },
            {
                'date': '2023-06-28',
                'title': 'MAV spot trading opens on Binance',
                'description': 'Binance opened MAV spot trading (MAV/BTC, MAV/USDT, MAV/TUSD) on 2023-06-28 at 08:00 UTC, with a circulating supply of ~250M of the 2B total.',
                'link': 'https://www.binance.com/en/support/announcement/binance-will-open-trading-for-maverick-protocol-mav-d4694febb3dd45da81348502484bf154',
            },
        ],
        timeline=[
            {
                'date': '2022-02-15',
                'title': '$8M strategic round led by Pantera Capital',
                'description': 'Maverick announced an $8M strategic round led by Pantera Capital with Jump Crypto, Circle Ventures, Gemini Frontier Fund and others participating.',
                'link': 'https://medium.com/maverick-protocol/pantera-jump-crypto-circle-and-gemini-backing-maverick-protocols-8-million-strategic-round-c37f9aa1a97d',
                'status': 'executed',
            },
            {
                'date': '2023-03-08',
                'title': 'Maverick AMM launches on Ethereum mainnet',
                'description': 'The Dynamic Distribution AMM went live on Ethereum mainnet, reaching roughly $6M TVL in its first week per Binance Research.',
                'link': 'https://www.binance.com/en/research/projects/maverick-protocol',
                'status': 'executed',
            },
            {
                'date': '2023-03-31',
                'title': 'Dedaub PoolPosition audit report',
                'description': "Dedaub published its audit of Maverick's PoolPosition contracts, covering position accounting, management and rewards mechanisms.",
                'link': 'https://dedaub.com/audits/maverick/maverick-pool-positions-mar-31-2023/',
                'status': 'executed',
            },
            {
                'date': '2023-06-21',
                'title': '$9M strategic round led by Founders Fund',
                'description': 'Maverick completed a $9M strategic round led by Founders Fund, with Pantera Capital, Coinbase Ventures and Apollo Crypto participating.',
                'link': 'https://www.businesswire.com/news/home/20230621768901/en/Maverick-Protocol-Completes-$9M-Strategic-Funding-Round-Led-by-Founders-Fund-to-Build-More-Efficient-DeFi-Infrastructure',
                'status': 'executed',
            },
            {
                'date': '2024-04-16',
                'title': 'Maverick v2 announced',
                'description': 'Maverick introduced v2 with Programmable Pools, enabling dynamic fees, permissioned/KYC pools, single-sided liquidity and AI-optimized parameters.',
                'link': 'https://medium.com/maverick-protocol/maverick-v2-the-ai-dex-with-programmable-pools-b2632e6e3d61',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'MAV total supply',
                'value': '2,000,000,000 MAV (fixed)',
                'freshness': 'static',
                'source': {
                    'label': 'Binance Research — Maverick (MAV)',
                    'url': 'https://www.binance.com/en/research/projects/maverick-protocol',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Ethereum mainnet launch',
                'value': 'Maverick AMM launched on Ethereum mainnet on 2023-03-08',
                'freshness': 'static',
                'source': {
                    'label': 'Binance Research — Maverick (MAV)',
                    'url': 'https://www.binance.com/en/research/projects/maverick-protocol',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total capital raised',
                'value': '~$17M across a $8M strategic round (Feb 2022) and a $9M strategic round (Jun 2023)',
                'freshness': 'static',
                'source': {
                    'label': 'BusinessWire — $9M round led by Founders Fund',
                    'url': 'https://www.businesswire.com/news/home/20230621768901/en/Maverick-Protocol-Completes-$9M-Strategic-Funding-Round-Led-by-Founders-Fund-to-Build-More-Efficient-DeFi-Infrastructure',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Maverick's automated liquidity-shifting logic and Programmable Pool 'accessor' contracts are complex. Dedaub's audit of the PoolPosition contracts flagged a critical LP-share minting issue and a medium-severity reentrancy risk (since addressed), underscoring the contract-risk surface of the dynamic-distribution machinery.",
            },
            {
                'category': 'Collateral',
                'description': "Modes that follow price in one direction (Right/Left) or shift with price (Both) can convert an LP's position heavily into the depreciating asset and expose it to impermanent-loss / directional-loss dynamics; a wrong directional bet or a sharp reversal can realize losses relative to simply holding.",
            },
            {
                'category': 'Governance',
                'description': 'veMAV concentrates governance and incentive-direction (emissions/gauge) power in the hands of the largest lockers. This can bias emissions toward pools that benefit large holders and create vote-buying / bribe dynamics around incentive allocation.',
            },
            {
                'category': 'Systemic',
                'description': 'Long-tail and permissionlessly listed pairs on Maverick v2 can be thin. Low-liquidity pools are more exposed to price manipulation, high slippage and the amplified impermanent loss that auto-shifting concentration can produce in volatile, illiquid markets.',
            },
        ],
        competitors=[
            {
                'name': 'Uniswap',
                'slug': 'uniswap',
                'rank': 1,
                'positioning': 'The dominant concentrated-liquidity (V3 CLMM) DEX and the primary benchmark Maverick differentiates against.',
                'similarities': 'Both offer concentrated liquidity so LPs can achieve high capital efficiency within a chosen price range.',
                'differences': 'Uniswap V3 requires LPs to manually manage/re-set ranges (or use external managers); Maverick automates liquidity movement on-chain via its Right/Left/Both/Static modes.',
            },
            {
                'name': 'Gamma',
                'slug': 'gamma',
                'rank': 2,
                'positioning': 'Active liquidity-management layer that repositions concentrated liquidity on top of AMMs like Uniswap V3.',
                'similarities': 'Aims to keep LP liquidity concentrated around price and reduce the manual burden of managing V3-style ranges.',
                'differences': 'Gamma is an external manager/vault sitting atop other AMMs; Maverick builds automatic liquidity movement natively into the AMM itself.',
            },
            {
                'name': 'Arrakis',
                'slug': 'arrakis',
                'rank': 3,
                'positioning': 'Automated liquidity-management protocol and market-making vaults over concentrated-liquidity AMMs.',
                'similarities': 'Provides automated, capital-efficient concentrated liquidity so LPs and protocols avoid hands-on range management.',
                'differences': 'Arrakis is a vault/management layer over external AMMs; Maverick embeds the auto-shifting behavior in the pool contract and adds Boosted Positions and veMAV incentives.',
            },
            {
                'name': 'Curve Finance',
                'slug': 'curve-finance',
                'rank': 4,
                'positioning': 'Leading AMM for correlated/stable assets with a veTokenomics gauge model.',
                'similarities': "Efficient for correlated pairs and, like Maverick's veMAV, uses vote-escrow to direct incentive emissions to pools.",
                'differences': 'Curve uses a specialized stableswap invariant with static ranges; Maverick uses dynamic-distribution concentration across a broader set of pair types.',
            },
        ],
        partnerships=[
            {
                'name': 'Binance (Launchpool listing)',
                'date': '2023-06-14',
                'amountLabel': None,
                'description': 'MAV was featured as the 34th Binance Launchpool project; users farmed MAV by staking BNB and TUSD, followed by a spot listing on 2023-06-28.',
            },
        ],
        investment_rounds=[
            {
                'date': '2022-02-15',
                'round': 'Strategic',
                'amountUsd': 8000000,
                'amountLabel': '$8M',
                'investors': [
                    'Pantera Capital',
                    'Jump Crypto',
                    'Circle Ventures',
                    'Gemini Frontier Fund',
                    'Altonomy',
                    'CMT Digital',
                    'GoldenTree Asset Management',
                    'Spartan Group',
                ],
                'link': 'https://medium.com/maverick-protocol/pantera-jump-crypto-circle-and-gemini-backing-maverick-protocols-8-million-strategic-round-c37f9aa1a97d',
            },
            {
                'date': '2023-06-21',
                'round': 'Strategic',
                'amountUsd': 9000000,
                'amountLabel': '$9M',
                'investors': [
                    'Founders Fund',
                    'Pantera Capital',
                    'Coinbase Ventures',
                    'Apollo Crypto',
                ],
                'link': 'https://www.businesswire.com/news/home/20230621768901/en/Maverick-Protocol-Completes-$9M-Strategic-Funding-Round-Led-by-Founders-Fund-to-Build-More-Efficient-DeFi-Infrastructure',
            },
        ],
        audits=[
            {
                'firm': 'Dedaub',
                'date': '2023-03-31',
                'url': 'https://dedaub.com/audits/maverick/maverick-pool-positions-mar-31-2023/',
            },
        ],
        sources=[
            {
                'label': 'Maverick Docs',
                'url': 'https://docs.mav.xyz/',
            },
            {
                'label': 'Binance Research — Maverick (MAV)',
                'url': 'https://www.binance.com/en/research/projects/maverick-protocol',
            },
            {
                'label': 'Dedaub — Maverick PoolPosition audit',
                'url': 'https://dedaub.com/audits/maverick/maverick-pool-positions-mar-31-2023/',
            },
            {
                'label': 'BusinessWire — $9M strategic round led by Founders Fund',
                'url': 'https://www.businesswire.com/news/home/20230621768901/en/Maverick-Protocol-Completes-$9M-Strategic-Funding-Round-Led-by-Founders-Fund-to-Build-More-Efficient-DeFi-Infrastructure',
            },
            {
                'label': 'Medium — Pantera-led $8M strategic round',
                'url': 'https://medium.com/maverick-protocol/pantera-jump-crypto-circle-and-gemini-backing-maverick-protocols-8-million-strategic-round-c37f9aa1a97d',
            },
            {
                'label': 'Medium — Maverick v2: The AI DEX with Programmable Pools',
                'url': 'https://medium.com/maverick-protocol/maverick-v2-the-ai-dex-with-programmable-pools-b2632e6e3d61',
            },
            {
                'label': 'Binance — MAV Launchpool announcement',
                'url': 'https://www.binance.com/en/support/announcement/introducing-maverick-protocol-mav-on-binance-launchpool-farm-mav-by-staking-bnb-and-tusd-a28d005ed545464cbb9a3661c26e6b38',
            },
        ],
        github="https://github.com/maverickprotocol",
        member_coins=[
            _coin("mav", "Maverick Protocol", "MAV", "Governance token (veMAV vote-escrow)"),
        ],
    ),
}


# Per-network MemberCoin audit registry (expected count + rationale).
# Used by validate_taxonomy.py --report-member-coins; does not enforce caps at ingest.
LIQUIDITY_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    "gamma": {"expected": 1, "rationale": "GAMMA governance"},
    "yearn-finance": {"expected": 1, "rationale": "YFI governance"},
    "convex-finance": {"expected": 1, "rationale": "CVX governance"},
    "beefy": {"expected": 1, "rationale": "BIFI governance"},
    "aura": {"expected": 1, "rationale": "AURA governance"},
    "arrakis": {"expected": 0, "rationale": "Tokenless LP infrastructure (TVL via DeFi Llama)"},
    "maverick": {"expected": 1, "rationale": "MAV governance"},
}
