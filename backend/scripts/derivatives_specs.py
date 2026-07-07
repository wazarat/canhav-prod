#!/usr/bin/env python3
"""
Derivatives-network specs (canhav-derivatives-implementation-spec §3/§4/§5).

The pure-play Derivatives entities that join the Network -> Protocol ->
Derivatives taxonomy, each tagged with a Derivatives sub-sector (Perp DEX /
Option Vaults / Delta-Neutral) and 0+ secondary tags. These mirror the
liquidity_specs.py pattern: live Tier-1 metrics (tvlUsd, openInterestUsd,
volume24hUsd, token price/mcap, fees, derived marketSharePct) are filled by the
DeFiLlama + CoinGecko cron pass (app/api/cron/refresh + lib/server/derivatives.ts).
Tier-2 fields (maxLeverageX, supportedMarkets, vaultStrategies, hedgeVenue,
fundingRatePct, governance) stay curated/null until per-protocol indexers wired.

Resolver ids (llamaSlug / coingeckoId) live in frontend/data/derivatives-seed.ts
and the cron maps (LLAMA_PROTOCOL_SLUGS / NETWORK_COINGECKO_IDS). Ethena
(Delta-Neutral) is extend-existing in ingest_entities.py (primary Stablecoin).
Perp venues migrated from dex_specs.py (GMX, Gains, dYdX, Hyperliquid, Drift).

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
    derivatives_sub_sector: str,
    derivatives_secondary_tags: List[str],
    chains: List[str],
    member_coins: Optional[List[Dict[str, Any]]] = None,
    pricing_model: Optional[str] = None,
    hedge_venue: Optional[List[str]] = None,
    official_docs: Optional[str] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    github: Optional[str] = None,
    competitors: Optional[List[Dict[str, Any]]] = None,
    scale_labels: Optional[Dict[str, str]] = None,
    evm_compatible: str = "yes",
    # Editorial fields (M1 General-Data): threaded through to build_entity_item,
    # mirroring lending_specs._net. Left None/[] until research-authored.
    components: Optional[List[Dict[str, str]]] = None,
    faq: Optional[List[Dict[str, Any]]] = None,
    org_structure: Optional[List[Dict[str, str]]] = None,
    tradfi_comparison: Optional[List[Dict[str, str]]] = None,
    risks: Optional[List[Dict[str, str]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    timeline: Optional[List[Dict[str, Any]]] = None,
    offchain_facts: Optional[List[Dict[str, Any]]] = None,
    investment_rounds: Optional[List[Dict[str, Any]]] = None,
    partnerships: Optional[List[Dict[str, Any]]] = None,
    sources: Optional[List[Dict[str, Any]]] = None,
    audits: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Build a Derivatives-network spec with the editorial defaults
    `build_entity_item` expects. `derivatives` holds the curated Tier-2 block;
    the cron overlays Tier-1 live fields (tvlUsd, OI, volume, token price/mcap,
    fees, share)."""
    derivatives: Dict[str, Any] = {
        "deployment": {"chains": chains, "evmCompatible": evm_compatible},
    }
    if pricing_model is not None:
        derivatives["pricingModel"] = pricing_model
    if hedge_venue:
        derivatives["hedgeVenue"] = hedge_venue

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
        "sector": "Derivatives",
        "sub_sector": derivatives_sub_sector,
        "derivatives_sub_sector": derivatives_sub_sector,
        "derivatives_secondary_tags": derivatives_secondary_tags,
        "derivatives": derivatives,
        # Derivatives entities carry no `Tags` (that vocabulary is Credit-only).
        "tags": [],
        "competitors": competitors or [],
        "member_coins": member_coins or [],
        "portal_defaults": _portal_defaults(chains),
    }


DERIVATIVES_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    # ------------------------------ PERP DEX --------------------------------
    "synthetix": _net(
        components=[
            {
                'name': 'SNX staking & pooled debt',
                'description': "SNX stakers lock collateral to back a shared, pooled debt. Historically stakers minted the sUSD stablecoin against SNX at a high collateralization ratio and collectively shared the profit/loss of all synths outstanding. SIP-420 (2025) introduced a protocol-owned 'delegated' staking model and a shared debt pool that lowered the effective collateral ratio.",
            },
            {
                'name': 'Synths (sUSD / sETH / sBTC)',
                'description': "Synthetic assets that track the price of an underlying via oracles. sUSD is the native dollar-pegged synth and the system's base asset; sETH and sBTC track ETH and BTC. Synths are minted/backed by the pooled staker debt rather than 1:1 reserves.",
            },
            {
                'name': 'Synthetix Perps (V2)',
                'description': 'Oracle-based perpetual futures engine on Optimism. Uses off-chain Pyth Network price feeds delivered by keepers with a short settlement delay to reduce frontrunning and cut fees. Historically fronted almost entirely by third-party UIs such as Kwenta.',
            },
            {
                'name': 'Synthetix V3 (Core) + Perps V3',
                'description': "Rebuilt, modular core system where any market can borrow liquidity from configurable collateral pools. Perps V3 adds cross-margin and multi-collateral support (USDC, sUSD, sETH, sBTC and governance-approved collateral), whereas V2 perps liquidity was SNX-backed only. Deployed on Base as the 'Andromeda' release.",
            },
            {
                'name': 'Oracles (Chainlink + Pyth)',
                'description': "Price feeds that value every synth and perp market. Chainlink aggregators price spot synths; Pyth off-chain feeds power Perps V2/V3. Oracle integrity is core to the design and the subject of the protocol's most famous incident.",
            },
        ],
        faq=[
            {
                'question': 'How does Synthetix work?',
                'answer': 'SNX holders stake their tokens as collateral to back a shared pool of debt. That pooled debt issues synthetic assets (synths) like the sUSD stablecoin and powers Synthetix Perps, an oracle-priced perpetual futures market. Traders get liquidity from the staker-backed pool rather than a traditional order book.',
                'pinned': True,
            },
            {
                'question': 'What is sUSD and is it a normal stablecoin?',
                'answer': "sUSD is Synthetix's dollar-pegged synth. It is not fully reserve-backed like USDC; it is minted against pooled SNX (and later protocol) collateral. Because the peg relies on staker incentives rather than redeemable reserves, it can and has depegged — most notably to around $0.68 in April 2025 after the SIP-420 collateral changes.",
                'pinned': False,
            },
            {
                'question': 'Which chains does Synthetix run on?',
                'answer': "The original V2 system and Perps V2 live on Ethereum and Optimism. Synthetix V3 (Core V3 + Perps V3), the 'Andromeda' release, deployed on Base. Synthetix later wound down its V3 perps on Arbitrum to focus on Base.",
                'pinned': False,
            },
            {
                'question': 'What are the risks of using Synthetix?',
                'answer': 'Stakers carry the pooled debt of the whole system, so their obligation can grow if other traders profit. Synths depend on oracle accuracy (a false oracle price caused a large 2019 exploit), and sUSD carries depeg risk as seen in 2025. Perps traders face liquidation and funding-rate risk.',
                'pinned': False,
            },
            {
                'question': 'What is the SNX token used for?',
                'answer': 'SNX is the collateral and governance token. Staking SNX backs synths and perps liquidity and earns trading fees; SNX is also used in protocol governance (the Spartan Council and related councils). Under the Andromeda release, a portion of Base perp fees is used to buy back and burn SNX (SIP-345).',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Synthetix (Kain Warwick, founder)',
                'role': 'Founding team / core contributors',
                'description': 'Protocol founded in 2017 as Havven by Kain Warwick and rebranded to Synthetix in late 2018. The founding team and core contributors build the protocol; historically stewarded by the Synthetix Foundation, which was later dissolved in favor of on-chain governance.',
            },
            {
                'name': 'Spartan Council & Treasury/Grants Councils',
                'role': 'DAO governance',
                'description': 'Elected councils govern the protocol. The Spartan Council votes on Synthetix Improvement Proposals (SIPs) and parameter changes (SCCPs); the Treasury Council manages the treasury and funding; the Grants Council funds public-goods work.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Synthetic / total-return swap desk at an investment bank',
                'similarity': 'Both give price exposure to an asset without holding it, via a synthetic contract backed by a collateral pool rather than delivery of the underlying.',
                'differences': 'Synthetix is permissionless and on-chain, prices off decentralized oracles, and mutualizes counterparty risk across a pool of SNX stakers instead of a single bank balance sheet.',
            },
            {
                'product': 'Regulated perpetual/futures exchange (e.g. CME) with a clearinghouse',
                'similarity': 'Perps offer leveraged directional exposure with funding/mark pricing, similar in economic effect to listed futures.',
                'differences': 'There is no central clearinghouse or KYC; liquidity comes from a pooled staker-backed market and oracle prices, and settlement is on-chain with keeper-delivered price updates.',
            },
        ],
        events=[
            {
                'date': '2018-02-28',
                'title': 'Havven ICO',
                'description': 'Havven (later Synthetix) held its token sale beginning 28 Feb 2018, raising its ~$30M hardcap at a base rate of about $0.67 per token.',
                'link': 'https://www.gate.com/learn/articles/what-is-synthetix-all-you-need-to-know-about-snx/3706',
            },
            {
                'date': '2018-11-30',
                'title': 'Rebrand from Havven to Synthetix',
                'description': 'Havven rebranded to Synthetix in late 2018 to reflect its pivot from a single USD stablecoin to a broader synthetic-asset platform.',
                'link': 'https://www.gate.com/learn/articles/what-is-synthetix-all-you-need-to-know-about-snx/3706',
            },
            {
                'date': '2019-06-25',
                'title': 'sKRW oracle incident',
                'description': 'On 25 June 2019 a faulty API reported the Korean Won (sKRW) rate ~1000x too high; a trading bot arbitraged it into sETH, at one point exposing over $1B of notional profit in under an hour. The oracle was halted and the bot operator returned the funds in exchange for a bounty.',
                'link': 'https://blog.synthetix.io/response-to-oracle-incident/',
            },
            {
                'date': '2021-02-14',
                'title': '$12M raise led by Paradigm, Coinbase Ventures, IOSG',
                'description': 'Investors purchased SNX directly from the DAO treasury in a $12M round to support liquidity and governance participation.',
                'link': 'https://www.coindesk.com/markets/2021/02/14/coinbase-ventures-paradigm-invest-12m-in-synthetix-defi-platform',
            },
            {
                'date': '2022-12-22',
                'title': 'Perps V2 goes live on Optimism',
                'description': 'Synthetix Perps V2 launched on Optimism using off-chain Pyth Network oracles delivered by keepers, cutting fees to ~5-10bps and reducing frontrunning risk.',
                'link': 'https://blog.synthetix.io/synthetix-perps-v2-is-now-live/',
            },
            {
                'date': '2024-01-24',
                'title': 'Andromeda release on Base (Core V3 + Perps V3)',
                'description': 'Synthetix deployed Core V3 and Perps V3 on Base with USDC collateral, completing the V3 architecture upgrade and adding multi-collateral, cross-margin perps.',
                'link': 'https://www.businesswire.com/news/home/20240124505362/en/Synthetix-Deploys-First-Major-Perpetuals-Protocol-on-Base-Mainnet-Marking-the-Completion-of-the-Synthetix-V3-Upgrade',
            },
            {
                'date': '2025-04-18',
                'title': 'sUSD depeg to ~$0.68',
                'description': 'Following SIP-420, which lowered the collateralization ratio and introduced a shared/protocol-owned debt pool, sUSD fell ~31% to about $0.68 as the individual incentive to buy back sUSD below peg weakened.',
                'link': 'https://www.tradingview.com/news/cointelegraph:554a62b5e094b:0-what-happened-to-susd-how-a-crypto-collateralized-stablecoin-depegged/',
            },
        ],
        timeline=[
            {
                'date': '2019-06-25',
                'title': 'Oracle incident response & feed redundancy',
                'description': 'After the sKRW incident, Synthetix added price-feed redundancy and improved exception handling in its oracle aggregation.',
                'link': 'https://blog.synthetix.io/response-to-oracle-incident/',
                'status': 'executed',
            },
            {
                'date': '2022-12-22',
                'title': 'Perps V2 engine',
                'description': 'Off-chain oracle perps engine on Optimism with Pyth price feeds and keeper settlement.',
                'link': 'https://blog.synthetix.io/synthetix-perps-v2-is-now-live/',
                'status': 'executed',
            },
            {
                'date': '2024-01-24',
                'title': 'V3 architecture (Andromeda / Core V3 + Perps V3)',
                'description': 'Modular V3 core and multi-collateral Perps V3 deployed on Base, marking the V3 migration milestone.',
                'link': 'https://www.businesswire.com/news/home/20240124505362/en/Synthetix-Deploys-First-Major-Perpetuals-Protocol-on-Base-Mainnet-Marking-the-Completion-of-the-Synthetix-V3-Upgrade',
                'status': 'executed',
            },
            {
                'date': '2025-04-01',
                'title': 'SIP-420 shared debt / staking overhaul',
                'description': 'Introduced a protocol-owned debt pool (the 420 Pool) and lower collateral ratio to improve capital efficiency; a debt jubilee and sUSD staking-ratio requirements followed to restore the peg.',
                'link': 'https://blog.synthetix.io/synthetix-susd-peg-update/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'founded_as_havven',
                'value': 'Founded in 2017 as Havven by Kain Warwick; rebranded to Synthetix in late 2018.',
                'freshness': 'static',
                'source': {
                    'label': 'Gate Learn — What is Synthetix',
                    'url': 'https://www.gate.com/learn/articles/what-is-synthetix-all-you-need-to-know-about-snx/3706',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'ico_raise',
                'value': 'Havven ICO opened 28 Feb 2018 and raised its ~$30M hardcap at a base rate of ~$0.67 per token.',
                'freshness': 'static',
                'source': {
                    'label': 'Gate Learn — What is Synthetix',
                    'url': 'https://www.gate.com/learn/articles/what-is-synthetix-all-you-need-to-know-about-snx/3706',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'susd_depeg_2025',
                'value': 'sUSD fell ~31% to about $0.68 on 18 April 2025 after the SIP-420 collateral changes.',
                'freshness': 'static',
                'source': {
                    'label': 'TradingView / Cointelegraph — What happened to sUSD',
                    'url': 'https://www.tradingview.com/news/cointelegraph:554a62b5e094b:0-what-happened-to-susd-how-a-crypto-collateralized-stablecoin-depegged/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Oracle',
                'description': 'Synths and perps price entirely off external oracles. A false price feed has already been exploited: in June 2019 a bad sKRW rate (~1000x) let a bot arbitrage into sETH with over $1B of notional exposure before the oracle was halted. Perps V2/V3 rely on Pyth off-chain feeds delivered by keepers, so feed manipulation, staleness, or keeper failure remains a live risk.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'sUSD is not reserve-backed; it is minted against pooled SNX/protocol collateral and holds its peg through staker incentives. After SIP-420 lowered the collateral ratio and pooled the debt, the buy-back-below-peg incentive weakened and sUSD depegged ~31% to ~$0.68 in April 2025, requiring a debt jubilee and forced 420-Pool sUSD ratios to recover.',
            },
            {
                'category': 'Systemic',
                'description': "All SNX stakers share a single pooled debt: a staker's liability rises when other participants' synth positions gain value. This mutualized 'debt pool' design means concentrated winning trades, oracle errors, or a synth mispricing can inflate the debt every staker owes, a structural risk distinct from isolated-margin perp venues.",
            },
            {
                'category': 'Smart Contract',
                'description': 'The V3 rebuild is large and novel; the iosiro V3 audit found 6 high and 11 medium-risk issues (all addressed) and attributed them partly to the size and complexity of a first-time-audited new system. The multi-contract modular architecture and ongoing SIP-driven upgrades keep contract-risk surface high.',
            },
            {
                'category': 'Governance',
                'description': "Protocol parameters (collateral ratios, fees, market listings, debt policy) are set by elected councils via SIPs/SCCPs. Governance moved fast and materially — e.g. SIP-420's collateral change directly triggered the 2025 sUSD depeg — so governance decisions can rapidly alter risk for stakers and synth holders.",
            },
        ],
        competitors=[
            {
                'name': 'GMX',
                'slug': 'gmx',
                'rank': 1,
                'positioning': "Leading pooled-liquidity perp DEX on Arbitrum/Avalanche; a direct architectural rival to Synthetix's oracle-and-pool perps model.",
                'similarities': 'Both are decentralized perp venues that source liquidity from a shared pool and price off oracles rather than a full central-limit order book.',
                'differences': 'GMX uses a multi-asset LP (GLP/GM) pool taking the other side of trades; Synthetix uses SNX/protocol-staker-backed pooled debt and (in V3) multi-collateral markets.',
            },
            {
                'name': 'dYdX',
                'slug': 'dydx',
                'rank': 2,
                'positioning': "Order-book perp exchange running on its own app-chain; the main CLOB alternative to Synthetix's pool model.",
                'similarities': 'Both are major decentralized perpetual futures venues offering leveraged trading on crypto assets.',
                'differences': 'dYdX runs a central-limit order book on a dedicated Cosmos app-chain with market makers; Synthetix is oracle-priced with staker-backed pooled liquidity on Ethereum L2s.',
            },
            {
                'name': 'Hyperliquid',
                'slug': 'hyperliquid',
                'rank': 3,
                'positioning': 'High-performance on-chain order-book perp exchange that has rapidly captured perp volume.',
                'similarities': 'Direct competitor for decentralized perpetual futures flow and liquidity.',
                'differences': 'Hyperliquid runs its own L1 with an on-chain order book and vault-based liquidity; Synthetix relies on oracle pricing and pooled staker collateral.',
            },
            {
                'name': 'Gains Network (gTrade)',
                'slug': 'gains-network',
                'rank': 4,
                'positioning': 'Synthetic-liquidity perp/leveraged-trading protocol on Arbitrum/Polygon with a DAI vault backing trades.',
                'similarities': 'Oracle-priced, pool-backed synthetic leverage trading with no order book — conceptually close to Synthetix perps.',
                'differences': 'Gains backs trades with a single-asset DAI vault and offers broad forex/stock-style pairs; Synthetix uses SNX/protocol pooled debt and its own synth stack.',
            },
        ],
        investment_rounds=[
            {
                'date': '2019-10-28',
                'round': 'Treasury token purchase',
                'amountUsd': 0,
                'amountLabel': '5,000,000 SNX purchased from treasury',
                'investors': [
                    'Framework Ventures',
                ],
                'link': 'https://blog.synthetix.io/framework-ventures-backs-synthetix/',
            },
            {
                'date': '2021-02-14',
                'round': 'Treasury token sale',
                'amountUsd': 12000000,
                'amountLabel': '$12M',
                'investors': [
                    'Paradigm',
                    'Coinbase Ventures',
                    'IOSG',
                ],
                'link': 'https://www.coindesk.com/markets/2021/02/14/coinbase-ventures-paradigm-invest-12m-in-synthetix-defi-platform',
            },
        ],
        audits=[
            {
                'firm': 'iosiro',
                'date': '2023-02-03',
                'url': 'https://iosiro.com/audits/synthetix-v3-smart-contract-audit',
            },
        ],
        sources=[
            {
                'label': 'Synthetix Blog — Response to Oracle Incident (sKRW, 2019)',
                'url': 'https://blog.synthetix.io/response-to-oracle-incident/',
            },
            {
                'label': 'Synthetix Blog — Perps V2 is now live',
                'url': 'https://blog.synthetix.io/synthetix-perps-v2-is-now-live/',
            },
            {
                'label': 'BusinessWire — Andromeda / V3 on Base',
                'url': 'https://www.businesswire.com/news/home/20240124505362/en/Synthetix-Deploys-First-Major-Perpetuals-Protocol-on-Base-Mainnet-Marking-the-Completion-of-the-Synthetix-V3-Upgrade',
            },
            {
                'label': 'iosiro — Synthetix v3 Smart Contract Audit',
                'url': 'https://iosiro.com/audits/synthetix-v3-smart-contract-audit',
            },
            {
                'label': 'CoinDesk — $12M raise (Paradigm, Coinbase Ventures, IOSG)',
                'url': 'https://www.coindesk.com/markets/2021/02/14/coinbase-ventures-paradigm-invest-12m-in-synthetix-defi-platform',
            },
            {
                'label': 'Synthetix Blog — Framework Ventures backs Synthetix',
                'url': 'https://blog.synthetix.io/framework-ventures-backs-synthetix/',
            },
            {
                'label': 'Synthetix Blog — sUSD Peg Update (SIP-420)',
                'url': 'https://blog.synthetix.io/synthetix-susd-peg-update/',
            },
        ],
        name="Synthetix",
        symbol="SNX",
        tagline="Synthetic-asset liquidity layer powering perps and synths.",
        description=(
            "Synthetix is a derivatives liquidity protocol where SNX stakers back a "
            "pooled debt that mints synthetic assets and powers perpetual-futures "
            "markets (Synthetix Perps / V3) across Optimism, Base, Ethereum and Arbitrum."
        ),
        differentiator=(
            "A shared, staker-backed liquidity layer (rather than per-market order "
            "books) that other front-ends (Kwenta, Polynomial) build perps on top of."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Synthetic-Assets", "Multi-Chain"],
        chains=["Optimism", "Base", "Ethereum", "Arbitrum One"],
        pricing_model="oracle",
        official_docs="https://docs.synthetix.io",
        website="https://synthetix.io",
        twitter="https://x.com/synthetix_io",
        github="https://github.com/Synthetixio",
        member_coins=[
            _coin("snx", "Synthetix Network Token", "SNX", "Governance + staking collateral (debt-pool backing)"),
        ],
    ),
    "aevo": _net(
        components=[
            {
                'name': 'Aevo L2 (OP Stack rollup)',
                'description': 'A dedicated Ethereum optimistic rollup built on the OP Stack, with a cloud-hosted sequencer operated by third-party infrastructure provider Conduit. Gives Aevo a purpose-built app-chain to avoid the throughput/congestion constraints of shared L2s. Aevo was the first OP Stack fork to go live on mainnet.',
            },
            {
                'name': 'Off-chain CLOB matching engine + on-chain settlement',
                'description': 'A high-performance off-chain central-limit order book matches orders (options, perps, spot) while trades settle on-chain on the Aevo L2. This hybrid design targets low latency and high throughput for professional traders while retaining Ethereum-anchored settlement.',
            },
            {
                'name': 'Derivatives products (options, perpetuals, pre-launch futures)',
                'description': 'Options and perpetual futures across multiple assets (originally ETH, later BTC and others) within a single unified margin account. Aevo added perpetual futures on 18 May 2023 and also offers pre-launch/pre-market token perps.',
            },
            {
                'name': 'Legacy Ribbon DeFi Options Vaults (DOVs) / Theta Vaults',
                'description': 'Automated options-selling structured-product vaults inherited from Ribbon Finance (the original Theta Vault product line). These legacy vaults remained deployed after the rebrand and were the component drained in the December 2025 oracle exploit.',
            },
            {
                'name': 'AEVO governance token',
                'description': "The protocol's governance token with a 1,000,000,000 max supply, created by converting the legacy RBN token 1:1. Governs the Aevo DAO and treasury committees.",
            },
        ],
        faq=[
            {
                'question': 'Is Aevo the same project as Ribbon Finance?',
                'answer': "Yes. Aevo evolved from Ribbon Finance's options stack. In July 2023 RBN tokenholders passed proposal RGP-33 to merge Ribbon into Aevo, rebranding all products under the Aevo name and converting the RBN token to AEVO 1:1.",
                'pinned': True,
            },
            {
                'question': 'How do I convert my RBN tokens to AEVO?',
                'answer': 'RBN converts to AEVO on a 1:1 basis, with no limits on amounts and no deadline, directly via the exchange. Several centralized venues (e.g. Crypto.com, Gate) also supported the conversion.',
                'pinned': False,
            },
            {
                'question': 'What can I trade on Aevo?',
                'answer': 'Options, perpetual futures, and pre-launch token futures, plus spot, all within a single unified margin account. Perpetual futures were added on 18 May 2023.',
                'pinned': False,
            },
            {
                'question': 'What is Aevo built on?',
                'answer': 'A custom Ethereum layer-2 optimistic rollup based on the OP Stack, using a sequencer operated by Conduit. Order matching happens off-chain via a central-limit order book while settlement is on-chain.',
                'pinned': False,
            },
            {
                'question': 'What is the maximum supply of AEVO?',
                'answer': '1,000,000,000 AEVO. As of 1 January 2025, all AEVO tokens are fully unlocked and circulating per the Aevo documentation.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Julian Koh',
                'role': 'Co-founder & CEO',
                'description': 'Co-founded Ribbon Finance (which became Aevo) and leads the project as CEO. Quoted in coverage of both the 2022 raise and the Conduit/OP Stack migration.',
            },
            {
                'name': 'Ken Chan',
                'role': 'Co-founder',
                'description': 'Co-founder of Ribbon Finance alongside Julian Koh, named in coverage of the 2022 Series B raise.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Listed options exchange / clearing (e.g. CBOE / OCC model)',
                'similarity': 'Aevo runs an order-book venue for standardized options and futures contracts with centralized matching, analogous to a listed derivatives exchange with a matching engine.',
                'differences': 'Settlement is on a permissionless on-chain rollup rather than a regulated central clearinghouse; users self-custody collateral; there is no broker/KYC intermediation layer in the core protocol.',
            },
            {
                'product': 'Structured product / auto-callable yield notes desk',
                'similarity': 'The legacy Ribbon Theta Vaults (DOVs) systematically sell options to generate yield, similar to bank-issued structured yield notes.',
                'differences': 'Fully automated via smart contracts, non-custodial, and transparent on-chain rather than an OTC desk product with a bank counterparty.',
            },
        ],
        events=[
            {
                'date': '2022-03-22',
                'title': 'Ribbon Finance closes $8.75M Series B led by Paradigm',
                'description': 'Ribbon Finance (the entity that became Aevo) raised $8.75M in a round led by Paradigm, with Dragonfly Capital, Coinbase Ventures, Nascent and Scalar Capital participating.',
                'link': 'https://www.coindesk.com/business/2022/03/22/paradigm-invests-875m-in-defis-ribbon-finance',
            },
            {
                'date': '2023-04-07',
                'title': 'Aevo mainnet launch',
                'description': 'Aevo went live on mainnet on its custom OP Stack rollup, opening decentralized options and futures trading with real USDC and on-chain settlement. It was the first OP Stack fork on mainnet.',
                'link': 'https://www.conduit.xyz/blog/aevo-case-study/',
            },
            {
                'date': '2023-05-18',
                'title': 'Aevo adds perpetual futures',
                'description': 'Aevo announced perpetual futures, letting users take leveraged positions on select crypto assets alongside its options offering.',
                'link': 'https://coinmarketcap.com/academy/article/what-is-aevo-the-derivatives-l2-chain',
            },
            {
                'date': '2023-07-25',
                'title': 'RGP-33 approved: Ribbon merges into Aevo',
                'description': 'RBN tokenholders passed governance proposal RGP-33 in a near-unanimous vote (133 holders), authorizing the merger of Ribbon Finance into Aevo and a 1:1 RBN-to-AEVO token conversion.',
                'link': 'https://gov.ribbon.finance/t/rgp-33-merge-ribbon-finance-into-aevo/709',
            },
            {
                'date': '2024-03-13',
                'title': 'AEVO listed on Binance',
                'description': 'Following a Binance Launchpool (farming 8-12 March 2024), AEVO was listed for spot trading on Binance on 13 March 2024 as the 48th Launchpool project, with 45,000,000 AEVO (4.5% of max supply) allocated to the pool.',
                'link': 'https://www.binance.com/en/support/announcement/introducing-aevo-aevo-on-binance-launchpool-farm-aevo-by-staking-bnb-and-fdusd-3ff4cb81f21346a4a6b1c966e0b797f0',
            },
            {
                'date': '2025-12-12',
                'title': 'Legacy Ribbon DOV vaults exploited for ~$2.7M',
                'description': 'An attacker exploited an access-control flaw plus a decimals-precision mismatch introduced by a 6 December 2025 oracle upgrade in the legacy Ribbon DeFi Options Vaults, draining roughly $2.7M. Aevo said its primary L2 exchange was unaffected.',
                'link': 'https://www.theblock.co/post/382461/aevos-legacy-ribbon-dov-vaults-exploited-for-2-7-million-following-oracle-upgrade',
            },
        ],
        timeline=[
            {
                'date': '2023-04-07',
                'title': 'Aevo L2 mainnet (first OP Stack fork live)',
                'description': 'Launch of the dedicated OP Stack rollup with off-chain matching and on-chain settlement.',
                'link': 'https://www.conduit.xyz/blog/aevo-case-study/',
                'status': 'executed',
            },
            {
                'date': '2023-05-18',
                'title': 'Perpetual futures product live',
                'description': 'Expansion from options-only to a combined options + perps venue under one margin account.',
                'link': 'https://coinmarketcap.com/academy/article/what-is-aevo-the-derivatives-l2-chain',
                'status': 'executed',
            },
            {
                'date': '2023-07-25',
                'title': 'Ribbon -> Aevo rebrand / RBN->AEVO conversion',
                'description': 'Governance-approved merger consolidating all Ribbon products under the Aevo brand and converting RBN to AEVO 1:1.',
                'link': 'https://gov.ribbon.finance/t/rgp-33-merge-ribbon-finance-into-aevo/709',
                'status': 'executed',
            },
            {
                'date': '2025-01-01',
                'title': 'AEVO fully unlocked and circulating',
                'description': 'Per Aevo documentation, as of 1 January 2025 all AEVO tokens are fully unlocked and in circulation.',
                'link': 'https://docs.aevo.xyz/aevo-governance/token-distribution',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Max supply',
                'value': '1,000,000,000 AEVO',
                'freshness': 'static',
                'source': {
                    'label': 'Binance Launchpool announcement (AEVO)',
                    'url': 'https://www.binance.com/en/support/announcement/introducing-aevo-aevo-on-binance-launchpool-farm-aevo-by-staking-bnb-and-fdusd-3ff4cb81f21346a4a6b1c966e0b797f0',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding raised (as Ribbon Finance)',
                'value': '$16.6M across funding rounds; latest was an $8.75M round led by Paradigm on 2022-03-22',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk - Paradigm invests $8.75M in Ribbon Finance',
                    'url': 'https://www.coindesk.com/business/2022/03/22/paradigm-invests-875m-in-defis-ribbon-finance',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'RBN to AEVO conversion ratio',
                'value': '1:1, no amount limits and no deadline',
                'freshness': 'static',
                'source': {
                    'label': 'Aevo Documentation - Token Distribution',
                    'url': 'https://docs.aevo.xyz/aevo-governance/token-distribution',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Oracle',
                'description': "The December 2025 exploit stemmed directly from an oracle upgrade: a 6-decimal vs 18-decimal precision mismatch plus an access-control flaw in the proxy-based oracle stack let an attacker set expiry prices for newly-created assets. Aevo's options settlement depends heavily on correct expiry-price oracle inputs, making oracle integrity a first-order risk.",
            },
            {
                'category': 'Smart Contract',
                'description': 'Legacy Ribbon DeFi Options Vault contracts remain deployed and were drainable for ~$2.7M in December 2025 due to weak access control (no per-account/per-series max payout, permissionless expiry-price setting). Old, less-maintained contract surface coexisting with the newer L2 exchange enlarges the attack surface.',
            },
            {
                'category': 'Network',
                'description': 'Aevo runs on a single dedicated OP Stack rollup with a centralized sequencer operated by third-party provider Conduit. A sequencer outage, censorship, or downtime at that operator can halt or delay order matching and settlement for the entire venue.',
            },
            {
                'category': 'Counterparty',
                'description': "Order matching is performed off-chain by Aevo's own central-limit order book before on-chain settlement. Users must trust the operator's off-chain matching engine for fair, timely execution and correct order handling, a trust assumption absent from fully on-chain AMM-style DEXs.",
            },
            {
                'category': 'Governance',
                'description': 'Control is concentrated: the Aevo DAO Treasury is the largest AEVO holder and DAO committees direct large treasury allocations (e.g. up to 16% incentives, 16% reserved for future DAO spending). Governance decisions such as the RGP-33 merger were carried by a small number of voters (133 RBN holders), concentrating control over protocol direction and token economics.',
            },
        ],
        competitors=[
            {
                'name': 'Hyperliquid',
                'slug': 'hyperliquid',
                'rank': 1,
                'positioning': 'High-performance on-chain perp DEX with an off-chain-style order book on its own chain.',
                'similarities': 'Both are order-book derivatives DEXs on purpose-built chains targeting professional traders with low latency and high throughput.',
                'differences': 'Hyperliquid runs its own L1 with a fully on-chain order book and is perps-focused; Aevo is an OP Stack L2 with off-chain matching and a strong options franchise.',
            },
            {
                'name': 'Derive (formerly Lyra)',
                'slug': 'derive',
                'rank': 2,
                'positioning': 'Options-focused DeFi derivatives protocol that also moved to its own OP Stack chain.',
                'similarities': 'Direct competitor in on-chain crypto options; both use dedicated OP Stack infrastructure and target options traders.',
                'differences': 'Derive originated as an options AMM/portfolio-margin protocol; Aevo leans on a central-limit order book with off-chain matching and a broader options-plus-perps product set.',
            },
            {
                'name': 'dYdX',
                'slug': 'dydx',
                'rank': 3,
                'positioning': 'Established order-book perpetuals DEX, now on its own Cosmos app-chain.',
                'similarities': 'Order-book model, app-chain architecture, off-chain matching heritage, and a professional-trader focus.',
                'differences': 'dYdX is perps-only and on Cosmos; Aevo is an Ethereum OP Stack rollup and additionally offers options and pre-launch futures.',
            },
            {
                'name': 'GMX',
                'slug': 'gmx',
                'rank': 4,
                'positioning': 'Pool-based perpetuals DEX on Arbitrum/Avalanche.',
                'similarities': 'Competes for on-chain perpetual-futures volume and traders.',
                'differences': 'GMX uses an oracle-priced liquidity-pool (GLP-style) model with no order book and no options; Aevo is order-book based with options as a core product.',
            },
        ],
        partnerships=[
            {
                'name': 'Conduit',
                'date': '2023-04-07',
                'amountLabel': None,
                'description': "Conduit provides the Rollup-as-a-Service infrastructure and operates the sequencer for Aevo's OP Stack rollup. Aevo was the first OP Stack fork on mainnet, launched and maintained on Conduit.",
            },
        ],
        investment_rounds=[
            {
                'date': '2022-03-22',
                'round': 'Series B',
                'amountUsd': 8750000,
                'amountLabel': '$8.75M',
                'investors': [
                    'Paradigm',
                    'Dragonfly Capital',
                    'Coinbase Ventures',
                    'Nascent',
                    'Scalar Capital',
                ],
                'link': 'https://www.coindesk.com/business/2022/03/22/paradigm-invests-875m-in-defis-ribbon-finance',
            },
        ],
        audits=[
            {
                'firm': 'OpenZeppelin',
                'date': '2021-09-09',
                'url': 'https://www.openzeppelin.com/news/ribbon-finance-audit',
            },
            {
                'firm': 'Veridise',
                'date': '2023-10-04',
                'url': 'https://veridise.com/audits-archive/company/ribbon-finance/ribbon-aevo-exchange-2023-10-04/',
            },
        ],
        sources=[
            {
                'label': 'CoinDesk - Paradigm invests $8.75M in Ribbon Finance',
                'url': 'https://www.coindesk.com/business/2022/03/22/paradigm-invests-875m-in-defis-ribbon-finance',
            },
            {
                'label': 'Conduit case study - Aevo, first OP Stack fork on mainnet',
                'url': 'https://www.conduit.xyz/blog/aevo-case-study/',
            },
            {
                'label': 'Ribbon governance forum - RGP-33 Merge Ribbon into Aevo',
                'url': 'https://gov.ribbon.finance/t/rgp-33-merge-ribbon-finance-into-aevo/709',
            },
            {
                'label': 'Aevo Documentation - Token Distribution',
                'url': 'https://docs.aevo.xyz/aevo-governance/token-distribution',
            },
            {
                'label': 'Binance - AEVO Launchpool / listing announcement',
                'url': 'https://www.binance.com/en/support/announcement/introducing-aevo-aevo-on-binance-launchpool-farm-aevo-by-staking-bnb-and-fdusd-3ff4cb81f21346a4a6b1c966e0b797f0',
            },
            {
                'label': 'OpenZeppelin - Ribbon Finance audit',
                'url': 'https://www.openzeppelin.com/news/ribbon-finance-audit',
            },
            {
                'label': 'Veridise - Ribbon Aevo Exchange audit (archive)',
                'url': 'https://veridise.com/audits-archive/company/ribbon-finance/ribbon-aevo-exchange-2023-10-04/',
            },
        ],
        github='https://github.com/aevoxyz',
        name="Aevo",
        symbol="AEVO",
        tagline="High-performance options + perps on a custom EVM rollup.",
        description=(
            "Aevo is a decentralized derivatives exchange offering options and "
            "perpetual futures via a high-throughput central limit order book on a "
            "custom EVM rollup. It evolved from Ribbon Finance's options stack."
        ),
        differentiator=(
            "Off-chain order-book matching with on-chain settlement on a dedicated "
            "rollup, combining CEX-like UX with self-custody."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=["Orderbook"],
        chains=["Ethereum"],
        pricing_model="orderbook",
        official_docs="https://docs.aevo.xyz",
        website="https://www.aevo.xyz",
        twitter="https://x.com/aevoxyz",
        member_coins=[
            _coin("aevo-gov", "Aevo", "AEVO", "Governance token"),
        ],
    ),
    "hyperliquid": _net(
        components=[
            {
                'name': 'HyperCore',
                'description': 'The performance layer running the fully on-chain central limit order book (CLOB) for perpetuals and spot. All orders, cancels, matches, and liquidations are recorded as native L1 transactions rather than smart-contract calls, targeting sub-second finality and very high order throughput.',
            },
            {
                'name': 'HyperBFT consensus',
                'description': "Hyperliquid's custom Byzantine-fault-tolerant consensus (a HotStuff-derived design) that orders transactions and finalizes blocks. It is optimized for end-to-end latency and one-block deterministic finality, and secures both HyperCore and HyperEVM with the same validator set.",
            },
            {
                'name': 'HyperEVM',
                'description': 'An Ethereum-compatible execution environment launched on mainnet Feb 18, 2025. It lets Solidity contracts deploy and compose with the native L1 order book via precompiles, using HYPE as the gas token. It is not a separate chain — it inherits security from the same HyperBFT consensus as HyperCore.',
            },
            {
                'name': 'HLP (Hyperliquidity Provider) vault',
                'description': "A community-owned protocol vault that market-makes across listed perps, runs the backstop liquidation engine, and accrues a portion of trading fees. Depositors share the vault's PnL directly with no performance fee, subject to a 4-day lockup from the most recent deposit.",
            },
            {
                'name': 'HYPE token',
                'description': 'Native asset of the Hyperliquid L1 (fixed 1B supply). Used to stake and secure HyperBFT, pay HyperEVM gas, and trade on the native spot book. Protocol revenue funds an Assistance Fund that buys back HYPE on the open market.',
            },
        ],
        faq=[
            {
                'question': 'What is Hyperliquid?',
                'answer': 'Hyperliquid is a purpose-built Layer-1 blockchain whose core application is a fully on-chain central limit order book (CLOB) for perpetual futures and spot trading. It aims to deliver a centralized-exchange-like experience — deep liquidity, sub-second finality, high throughput — while keeping the order book, matching, and liquidations fully on-chain. It is one of the dominant on-chain perpetuals venues.',
                'pinned': True,
            },
            {
                'question': 'Did Hyperliquid raise money from VCs?',
                'answer': "No. Founder Jeff Yan has said the team rejected all venture capital and self-funded development using profits from the founders' trading operation. In early 2024 they reportedly turned down a VC offer valuing the project at $1 billion in order to keep the platform 'credibly neutral' with no privileged insiders. There is no on-record equity or token raise.",
                'pinned': False,
            },
            {
                'question': 'What was the HYPE airdrop?',
                'answer': 'At the November 29, 2024 genesis event, roughly 310 million HYPE — 31% of the fixed 1 billion supply — was distributed to eligible early users based on accumulated points, fully unlocked at launch. Tokens were pushed to wallets rather than manually claimed. No allocation went to private investors, and reporting cited over 90,000 recipients.',
                'pinned': False,
            },
            {
                'question': 'What is the HLP vault?',
                'answer': "HLP (Hyperliquidity Provider) is a community-owned protocol vault that provides market-making quotes across perps, absorbs backstop liquidations, and accrues a share of trading fees. Depositors share the vault's profit and loss directly with no performance fee. Because it can end up holding the losing side of a crowded book, its returns are event-driven rather than a steady yield, and it can experience drawdowns during fast directional moves.",
                'pinned': False,
            },
            {
                'question': 'What happened in the JELLY incident?',
                'answer': "On March 26, 2025, a trader exploited the low-liquidity JELLYJELLY memecoin: a large short was forced onto the HLP vault via the liquidation engine while the token's spot price was pumped ~400% in an hour, driving HLP's unrealized loss to roughly $12M. The validator set convened and voted to delist JELLY perps, settling positions at a price favorable to the vault. HLP ended the day in profit, but the episode drew heavy criticism of Hyperliquid's decentralization given how quickly a small validator set intervened.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Jeff Yan',
                'role': 'Co-founder',
                'description': 'Harvard-educated founder who previously ran crypto market-making firm Chameleon Trading. He self-funded Hyperliquid and has publicly explained the decision to reject venture capital to preserve neutrality. Development is carried out by Hyperliquid Labs / Hyper Foundation with a small team.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Centralized derivatives exchange (e.g. a CME- or Binance-Futures-style perpetual/futures venue)',
                'similarity': 'Uses a central limit order book with maker/taker matching, deep liquidity, high throughput, and fast execution — the trading experience closely mirrors a centralized futures exchange.',
                'differences': 'Order book, matching, custody, and liquidations run on a public blockchain rather than a private matching engine; users self-custody via wallets, settlement is on-chain, and market-making profits are shared with a community vault (HLP) rather than a private firm.',
            },
            {
                'product': 'Designated market-maker / exchange liquidity provisioning',
                'similarity': 'HLP performs the market-making and backstop-liquidation role a professional trading firm plays on a traditional venue.',
                'differences': 'HLP is open to any depositor, charges no performance fee, and distributes PnL pro-rata on-chain, democratizing a role normally reserved for privileged firms.',
            },
        ],
        events=[
            {
                'date': '2024-11-29',
                'title': 'HYPE genesis event and airdrop',
                'description': 'Token generation event at 07:30 UTC. Roughly 310M HYPE (31% of the 1B fixed supply) distributed to eligible early users, fully unlocked, with no allocation to private investors. Reported to reach 90,000+ recipients.',
                'link': 'https://www.theblock.co/post/328631/hyperliquid-plans-to-launch-hype-token-in-nov-29-genesis-event',
            },
            {
                'date': '2025-02-18',
                'title': 'HyperEVM mainnet launch',
                'description': 'Hyper Foundation launched HyperEVM on mainnet, adding general-purpose EVM programmability that inherits security from HyperBFT consensus, with HYPE as the gas token.',
                'link': 'https://www.theblock.co/post/341424/hyperliquid-launches-hyperevm-on-mainnet-to-bring-general-purpose-programmability',
            },
            {
                'date': '2025-03-26',
                'title': 'JELLYJELLY short-squeeze incident and delisting',
                'description': "A trader forced a large JELLY short onto the HLP vault and pumped spot price ~400% in an hour, driving HLP's unrealized loss to ~$12M. Validators voted to delist JELLY perps and settled positions favorably; HLP ended the day in profit but the response drew decentralization criticism.",
                'link': 'https://www.theblock.co/post/348314/hyperliquid-delists-jellyjelly-memecoin-amid-whale-manipulation-fiasco',
            },
        ],
        timeline=[
            {
                'date': '2023-05-01',
                'title': 'HLP vault live (mainnet era)',
                'description': "The Hyperliquidity Provider vault began operating in May 2023, letting the community backstop the exchange's perps market and share PnL.",
                'link': 'https://www.coingecko.com/learn/hyperliquid-hlp-vault-analysis',
                'status': 'executed',
            },
            {
                'date': '2024-11-29',
                'title': 'HYPE token / staking and consensus decentralization',
                'description': 'HYPE launched as the staking asset for HyperBFT, enabling delegated proof-of-stake security and progressive validator decentralization.',
                'link': 'https://www.theblock.co/post/328631/hyperliquid-plans-to-launch-hype-token-in-nov-29-genesis-event',
                'status': 'executed',
            },
            {
                'date': '2025-02-18',
                'title': 'HyperEVM programmability',
                'description': 'EVM execution environment shipped, with general ERC-20 native transfers and additional precompiles planned as follow-on upgrades after testnet feedback.',
                'link': 'https://www.theblock.co/post/341424/hyperliquid-launches-hyperevm-on-mainnet-to-bring-general-purpose-programmability',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'HYPE genesis airdrop size',
                'value': '~310,000,000 HYPE (31% of 1B fixed supply) distributed to eligible users at the Nov 29, 2024 genesis event, fully unlocked',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — Hyperliquid Nov. 29 genesis event',
                    'url': 'https://www.theblock.co/post/328631/hyperliquid-plans-to-launch-hype-token-in-nov-29-genesis-event',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'HYPE total supply',
                'value': '1,000,000,000 HYPE fixed supply; 31% airdrop, ~38.8% future emissions/community rewards, ~23.8% to core contributors',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — HYPE genesis allocation',
                    'url': 'https://www.theblock.co/post/328631/hyperliquid-plans-to-launch-hype-token-in-nov-29-genesis-event',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'HLP vault economics',
                'value': 'Community-owned vault with no performance fee; depositors share PnL directly, subject to a 4-day withdrawal lockup from the most recent deposit',
                'freshness': 'static',
                'source': {
                    'label': 'Hyperliquid Docs — Protocol vaults (HLP)',
                    'url': 'https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults/protocol-vaults',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Governance',
                'description': 'The active validator set is small and top-heavy, with a large share of stake historically held by Hyper Foundation validators. The March 2025 JELLY response — validators convening to delist a perp and set a settlement price within minutes — showed that a quorum can override normal market outcomes, raising real questions about decentralization and discretionary intervention.',
            },
            {
                'category': 'Smart Contract',
                'description': 'Value entering and leaving Hyperliquid depends on an Arbitrum-based bridge contract audited by Zellic. Bridge and node software are a concentrated attack surface; any bug in the bridge, node binaries, or HyperEVM precompiles could put user funds or chain integrity at risk.',
            },
            {
                'category': 'Systemic',
                'description': 'The HLP vault backstops liquidations across all listed perps and can inherit the losing side of a crowded or manipulated book. A large, illiquid, or manipulated market (as with JELLY) can push HLP into sharp drawdowns, and losses in the shared vault propagate to all depositors simultaneously.',
            },
            {
                'category': 'Oracle',
                'description': 'Perp mark prices, funding, and liquidations rely on price inputs that can be manipulated for thinly traded or newly listed assets. Attackers have pumped low-liquidity spot markets to distort on-venue pricing and force adverse liquidations onto the protocol.',
            },
            {
                'category': 'Network',
                'description': 'As a purpose-built L1 with a custom HyperBFT consensus and a relatively small validator set, Hyperliquid depends on the liveness and correctness of that set. Consensus stalls, validator collusion, or client bugs would halt trading and settlement across both HyperCore and HyperEVM.',
            },
            {
                'category': 'Regulatory',
                'description': 'Hyperliquid offers high-leverage perpetual derivatives to a global user base without traditional KYC gating at the protocol level. Perpetual futures face increasing regulatory scrutiny across jurisdictions, and enforcement actions or access restrictions could materially affect volumes and the HYPE fee/buyback economics.',
            },
        ],
        competitors=[
            {
                'name': 'dYdX',
                'slug': 'dydx',
                'rank': 1,
                'positioning': 'Long-standing order-book perp DEX that pioneered on-chain CLOB perpetuals and later migrated to its own app-chain.',
                'similarities': 'Central limit order book model for perpetuals on a dedicated chain, targeting professional traders with deep liquidity and self-custody.',
                'differences': 'Hyperliquid runs its entire order book and matching natively on its own L1 with HyperBFT sub-second finality and added HyperEVM programmability, and grew to a larger on-chain perps market share; dYdX uses a Cosmos-based app-chain and has a different token/fee model.',
            },
            {
                'name': 'GMX',
                'slug': 'gmx',
                'rank': 2,
                'positioning': 'Leading pool/oracle-based perp DEX on Arbitrum and Avalanche using a shared liquidity pool (GLP-style) as counterparty.',
                'similarities': 'On-chain perpetuals venue where a community liquidity pool backstops trader PnL, comparable in spirit to HLP.',
                'differences': "GMX prices trades off oracles against a shared LP rather than a live order book, so it has no CLOB, generally lower throughput, and a different fee/liquidity design than Hyperliquid's on-chain order book.",
            },
            {
                'name': 'Drift Protocol',
                'slug': 'drift-protocol',
                'rank': 3,
                'positioning': 'Solana-based perp DEX combining an order book with AMM/JIT liquidity.',
                'similarities': 'On-chain perpetuals with an order-book component and vault-style liquidity provisioning, targeting low-latency trading.',
                'differences': 'Built on Solana as a smart-contract application rather than a purpose-built perps L1; different liquidity architecture and no HyperEVM equivalent.',
            },
            {
                'name': 'Aevo',
                'slug': 'aevo',
                'rank': 4,
                'positioning': 'Order-book derivatives DEX (perps and options) built on an OP-stack rollup.',
                'similarities': 'Off-the-shelf CLOB experience for perpetuals with on-chain settlement.',
                'differences': 'Rollup-based rather than a bespoke L1 with custom BFT consensus; smaller perps market share and no fully on-chain matching L1 of its own.',
            },
        ],
        audits=[
            {
                'firm': 'Zellic',
                'date': '2023-01-01',
                'url': 'https://hyperliquid.gitbook.io/hyperliquid-docs/audits',
            },
        ],
        sources=[
            {
                'label': "The Block — Hyperliquid Nov. 29 'genesis event'",
                'url': 'https://www.theblock.co/post/328631/hyperliquid-plans-to-launch-hype-token-in-nov-29-genesis-event',
            },
            {
                'label': 'The Block — Hyperliquid launches HyperEVM on mainnet',
                'url': 'https://www.theblock.co/post/341424/hyperliquid-launches-hyperevm-on-mainnet-to-bring-general-purpose-programmability',
            },
            {
                'label': 'The Block — Hyperliquid delists JELLYJELLY amid manipulation fiasco',
                'url': 'https://www.theblock.co/post/348314/hyperliquid-delists-jellyjelly-memecoin-amid-whale-manipulation-fiasco',
            },
            {
                'label': 'Hyperliquid Docs — Protocol vaults (HLP)',
                'url': 'https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults/protocol-vaults',
            },
            {
                'label': 'Hyperliquid Docs — Audits (Zellic bridge audit)',
                'url': 'https://hyperliquid.gitbook.io/hyperliquid-docs/audits',
            },
            {
                'label': 'Fortune — Jeff Yan, Hyperliquid with no venture funding',
                'url': 'https://fortune.com/2026/01/12/hyperliquid-jeff-yan-defi-perpetuals-perps-exchange-defi/',
            },
            {
                'label': "CoinGecko — How Hyperliquid's HLP Vault works (May 2023 launch)",
                'url': 'https://www.coingecko.com/learn/hyperliquid-hlp-vault-analysis',
            },
        ],
        github='https://github.com/hyperliquid-dex',
        name="Hyperliquid",
        symbol="HYPE",
        tagline="Purpose-built L1 with a fully on-chain order book.",
        description=(
            "Hyperliquid is a purpose-built L1 with a fully on-chain CLOB — ~200k "
            "orders/sec throughput, sub-second finality, and the deepest on-chain "
            "perp liquidity in 2026 (typically >70% of on-chain perp volume). "
            "HyperEVM extends programmability."
        ),
        differentiator=(
            "Fully on-chain central limit order book on a bespoke L1; HyperEVM adds "
            "EVM execution without sacrificing CLOB performance."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=[],
        chains=["Hyperliquid L1", "Arbitrum"],
        pricing_model="orderbook",
        evm_compatible="mixed",
        official_docs="https://hyperliquid.gitbook.io",
        website="https://hyperliquid.xyz",
        twitter="https://x.com/HyperliquidX",
        member_coins=[
            _coin("hype", "Hyperliquid", "HYPE", "Governance token"),
        ],
    ),
    "dydx": _net(
        components=[
            {
                'name': 'dYdX Chain (v4)',
                'description': 'A standalone, sovereign proof-of-stake Layer 1 blockchain built with the Cosmos SDK and CometBFT consensus. It is a purpose-built appchain that powers a decentralized perpetual futures exchange, launched on mainnet on October 26, 2023 after dYdX migrated off its former StarkEx-based Ethereum L2 (v3).',
            },
            {
                'name': 'Off-chain orderbook & matching engine',
                'description': 'Validators run an in-memory (off-chain) orderbook and matching engine that is not committed to consensus, allowing dYdX to match orders at CEX-like speed. Trades are then settled on-chain and verified by all validators through consensus, combining off-chain performance with on-chain settlement.',
            },
            {
                'name': 'MegaVault',
                'description': "A 'master' USDC liquidity pool introduced with the dYdX Unlimited upgrade. Depositors provide USDC and earn yield from an automated market-making strategy run across market-specific sub-vaults; MegaVault is the liquidity backbone that enables permissionless / instant market listings on dYdX Chain.",
            },
            {
                'name': 'Instant / Permissionless Market Listings',
                'description': 'A feature enabled by the dYdX Unlimited upgrade that lets anyone list a new perpetual market by depositing USDC into MegaVault (locked for a period), with MegaVault automatically sourcing liquidity for the new pair — removing the need for a governance vote per market.',
            },
            {
                'name': 'DYDX token',
                'description': 'The native staking, gas and governance token of dYdX Chain. It secures the PoS network (validators/delegators stake DYDX) and governs protocol parameters. It replaced the former Ethereum ERC-20 ethDYDX via a one-way migration bridge.',
            },
        ],
        faq=[
            {
                'question': 'What is dYdX?',
                'answer': "dYdX is a decentralized exchange for perpetual futures ('perps'). It pioneered on-chain perps and now runs on its own dedicated Cosmos-based Layer 1 (dYdX Chain, or v4), where validators operate an off-chain orderbook and settle trades on-chain.",
                'pinned': True,
            },
            {
                'question': 'How is dYdX v4 different from v3?',
                'answer': "v3 ran as an Ethereum Layer 2 using StarkWare's StarkEx, with a centrally-operated orderbook and matching engine. v4 (dYdX Chain) is a standalone, fully decentralized Cosmos SDK appchain where validators run the orderbook off-chain and settle trades on-chain, and where the core team no longer collects trading fees.",
                'pinned': False,
            },
            {
                'question': 'What is MegaVault?',
                'answer': 'MegaVault is a pooled USDC liquidity product. Users deposit USDC and earn yield generated by an automated market-making strategy deployed across dYdX markets. It also underpins permissionless market listings by automatically supplying liquidity to newly listed pairs.',
                'pinned': False,
            },
            {
                'question': 'How did the DYDX token migrate from Ethereum?',
                'answer': 'Following a community governance vote, the Ethereum ERC-20 ethDYDX migrates one-way to native DYDX on dYdX Chain via the wethDYDX bridge contract. Sending ethDYDX locks it and returns wethDYDX on Ethereum plus mints native DYDX on dYdX Chain at a 1:1 ratio. There is no reverse bridge.',
                'pinned': False,
            },
            {
                'question': 'Can US users trade on dYdX?',
                'answer': "No. The dYdX perpetuals trading software's terms of use prohibit persons located in, resident in, or operating from the United States, Canada, and other restricted/sanctioned jurisdictions, and the front end geoblocks these regions.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Antonio Juliano',
                'role': 'Founder',
                'description': 'Founder of dYdX; started the protocol in 2017. Founded dYdX Trading Inc., the company that developed the protocol software.',
            },
            {
                'name': 'dYdX Foundation',
                'role': 'Non-profit ecosystem foundation',
                'description': 'Independent foundation supporting the growth, governance and decentralization of the dYdX Chain ecosystem, distinct from dYdX Trading Inc. which developed the software.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Regulated futures exchange (e.g. CME) with a central limit order book',
                'similarity': 'Both offer leveraged derivatives (perpetual/futures contracts) traded through a central limit order book with a matching engine, funding/settlement mechanics, and margining.',
                'differences': 'dYdX is non-custodial and permissionless: users self-custody funds, settlement is on a public blockchain via consensus rather than a clearinghouse, perpetuals never expire and use a funding rate, and there is no KYC gatekeeper (access is geoblocked by jurisdiction instead).',
            },
            {
                'product': 'Prime brokerage / market-making desk providing liquidity for a fee',
                'similarity': 'MegaVault lets participants pool capital to provide market-making liquidity and earn a share of trading revenue/PnL, similar to institutional liquidity provision.',
                'differences': 'MegaVault is a permissionless on-chain vault open to any depositor, with pro-rata yield/loss and an automated strategy, rather than a discretionary, relationship-based institutional desk.',
            },
        ],
        events=[
            {
                'date': '2021-04-06',
                'title': 'dYdX v3 launches on StarkEx L2',
                'description': "dYdX launched its perpetuals exchange on StarkWare's StarkEx zk-rollup Layer 2, moving off Ethereum L1 to reduce gas costs and increase throughput; this became the widely-used v3 exchange.",
                'link': 'https://medium.com/starkware/dydx-now-on-mainnet-c21c84d8e342',
            },
            {
                'date': '2023-10-24',
                'title': 'dYdX open-sources v4 code',
                'description': 'dYdX released the open-source software for the dYdX Chain (v4) ahead of mainnet, marking the transition from an Ethereum L2 to a standalone Cosmos appchain.',
                'link': 'https://www.coindesk.com/tech/2023/10/24/dydx-decentralized-crypto-exchange-open-sources-v4-code-for-upcoming-cosmos-chain',
            },
            {
                'date': '2023-10-26',
                'title': 'dYdX Chain (v4) mainnet launch',
                'description': 'The dYdX Chain alpha mainnet went live as a standalone Cosmos SDK Layer 1, with bridging of ethDYDX and staking becoming available.',
                'link': 'https://www.theblock.co/post/259658/dydx-chain-officially-launches-on-mainnet-as-standalone-cosmos-layer-1',
            },
            {
                'date': '2024-11-19',
                'title': 'dYdX Unlimited upgrade deployed',
                'description': "dYdX deployed the 'Unlimited' (v7.0.0) upgrade, introducing permissionless / instant market listings and MegaVault — its largest product upgrade since the first perps launch.",
                'link': 'https://thedefiant.io/news/defi/dydx-launches-permissionless-listings-with-unlimited-upgrade',
            },
            {
                'date': '2025-01-24',
                'title': 'dYdX Chain security audit results published',
                'description': "dYdX published results of Informal Systems' full audit of the dYdX Chain code, reporting zero critical issues remaining after all findings (1 critical, 4 medium, 17 low, 19 informational) were addressed.",
                'link': 'https://www.dydx.xyz/blog/dydx-chain-audit',
            },
        ],
        timeline=[
            {
                'date': '2021-04-06',
                'title': 'v3 on StarkEx',
                'description': "Perpetuals exchange live on StarkWare's StarkEx Ethereum Layer 2 with a centrally-operated orderbook.",
                'link': 'https://medium.com/starkware/dydx-now-on-mainnet-c21c84d8e342',
                'status': 'executed',
            },
            {
                'date': '2023-10-26',
                'title': 'v4 — dYdX Chain mainnet',
                'description': 'Migration to a sovereign Cosmos SDK / CometBFT appchain with validator-run off-chain orderbook and on-chain settlement.',
                'link': 'https://www.theblock.co/post/259658/dydx-chain-officially-launches-on-mainnet-as-standalone-cosmos-layer-1',
                'status': 'executed',
            },
            {
                'date': '2024-11-19',
                'title': 'dYdX Unlimited (v7.0.0)',
                'description': 'Permissionless market listings and MegaVault liquidity pool go live.',
                'link': 'https://thedefiant.io/news/defi/dydx-launches-permissionless-listings-with-unlimited-upgrade',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Total VC funding raised (through Series C)',
                'value': '~$87 million across seed, Series A, Series B and Series C',
                'freshness': 'static',
                'source': {
                    'label': 'Decrypt — dYdX raises $65M from a16z, Paradigm and more',
                    'url': 'https://decrypt.co/73651/ethereum-defi-exchange-dydx-65-million-andreessen-paradigm',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Permissionless market listing deposit requirement',
                'value': '10,000 USDC deposited into MegaVault, locked for ~30 days, to list a new market',
                'freshness': 'static',
                'source': {
                    'label': 'The Defiant — dYdX Launches Permissionless Listings With Unlimited Upgrade',
                    'url': 'https://thedefiant.io/news/defi/dydx-launches-permissionless-listings-with-unlimited-upgrade',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Bug bounty maximum payout',
                'value': 'Up to $5,000,000 for the dYdX Chain software depending on severity',
                'freshness': 'static',
                'source': {
                    'label': 'dYdX blog — Dive Into The dYdX Chain Audit',
                    'url': 'https://www.dydx.xyz/blog/dydx-chain-audit',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'The wethDYDX migration bridge and dYdX Chain custom Cosmos modules (x/clob, x/bridge, x/perpetuals, etc.) are complex, novel code. The Informal Systems audit itself surfaced one critical and multiple medium/low issues (since fixed), and any residual bug in matching, liquidation, or the bridge could cause loss of funds.',
            },
            {
                'category': 'Network',
                'description': 'dYdX v4 is its own sovereign PoS appchain secured by a limited validator set staking DYDX. Its security and liveness depend on that validator set; a small or concentrated validator/stake distribution, or a consensus/liveness failure in CometBFT, would directly halt or compromise trading — unlike an app inheriting Ethereum L1 security.',
            },
            {
                'category': 'Oracle',
                'description': 'As a perps DEX, dYdX relies on price feeds for mark prices, funding, and liquidations. Manipulated, stale, or lagging oracle prices — especially for thinly-traded permissionlessly-listed markets — can trigger wrongful liquidations or bad debt in MegaVault.',
            },
            {
                'category': 'Counterparty',
                'description': 'MegaVault depositors take on market-making risk: yield or loss is distributed pro-rata from PnL on vault positions across many markets. A sharp adverse move, especially in low-liquidity permissionless markets that MegaVault must backstop, can produce losses for LPs rather than yield.',
            },
            {
                'category': 'Regulatory',
                'description': 'dYdX geoblocks and contractually prohibits US, Canadian, UK and sanctioned-jurisdiction users from the perpetuals software. This concentrates its addressable market outside major regulated venues and exposes the ecosystem to enforcement/regulatory risk around decentralized derivatives and the DYDX token.',
            },
            {
                'category': 'Governance',
                'description': 'Protocol parameters, upgrades (e.g. dYdX Unlimited), trading rewards, and the MegaVault operator are set by DYDX stake-weighted governance. Concentrated token/voting power or contentious upgrades could push changes that disadvantage traders or LPs, and governance is the control surface for critical economic parameters.',
            },
        ],
        competitors=[
            {
                'name': 'Hyperliquid',
                'slug': 'hyperliquid',
                'rank': 1,
                'positioning': "Perps DEX on its own high-performance L1 appchain with a fully on-chain orderbook; the leading challenger that overtook much of dYdX's perp DEX market share.",
                'similarities': 'Both are order-book-based decentralized perpetual exchanges running on purpose-built app-specific chains rather than general-purpose smart-contract platforms.',
                'differences': 'Hyperliquid runs its orderbook fully on-chain via HyperBFT and has its own EVM layer, whereas dYdX keeps the orderbook off-chain in validator memory and settles on-chain; the two use different token/incentive models.',
            },
            {
                'name': 'GMX',
                'slug': 'gmx',
                'rank': 2,
                'positioning': 'Leading pooled-liquidity (oracle-priced, peer-to-pool) perps DEX on Arbitrum and Avalanche.',
                'similarities': "Both are major decentralized perpetual futures venues offering leverage on crypto assets with a shared liquidity pool component (GMX's GLP/GM vs. dYdX's MegaVault).",
                'differences': 'GMX uses an oracle-priced peer-to-pool AMM model on general-purpose L2s, while dYdX uses a central-limit-order-book matching engine on its own dedicated Cosmos L1.',
            },
            {
                'name': 'Aevo',
                'slug': 'aevo',
                'rank': 3,
                'positioning': 'Derivatives DEX (perps and options) using an off-chain orderbook with on-chain settlement on a dedicated rollup.',
                'similarities': 'Both use an off-chain orderbook / matching engine with on-chain settlement for derivatives trading.',
                'differences': 'Aevo settles on an Ethereum-based rollup and emphasizes options alongside perps, while dYdX is a Cosmos-native perps-focused L1.',
            },
        ],
        partnerships=[
            {
                'name': 'StarkWare',
                'date': '2021-04-06',
                'amountLabel': None,
                'description': "StarkWare provided the StarkEx scalability engine that powered dYdX v3 as an Ethereum Layer 2, and StarkWare participated as a partner in dYdX's Series C round.",
            },
        ],
        investment_rounds=[
            {
                'date': '2017-12-01',
                'round': 'Seed',
                'amountUsd': 2000000,
                'amountLabel': '$2M',
                'investors': [
                    'Andreessen Horowitz (a16z)',
                    'Polychain Capital',
                ],
                'link': 'https://decrypt.co/73651/ethereum-defi-exchange-dydx-65-million-andreessen-paradigm',
            },
            {
                'date': '2018-10-01',
                'round': 'Series A',
                'amountUsd': 10000000,
                'amountLabel': '$10M',
                'investors': [
                    'Andreessen Horowitz (a16z)',
                    'Polychain Capital',
                ],
                'link': 'https://www.crunchbase.com/funding_round/dydx-series-a--a879c7aa',
            },
            {
                'date': '2021-01-01',
                'round': 'Series B',
                'amountUsd': 10000000,
                'amountLabel': '$10M',
                'investors': [
                    'Three Arrows Capital',
                    'DeFiance Capital',
                    'Wintermute',
                    'Hashed',
                    'GSR',
                    'Spartan Group',
                ],
                'link': 'https://www.dydx.xyz/blog/series-b',
            },
            {
                'date': '2021-06-15',
                'round': 'Series C',
                'amountUsd': 65000000,
                'amountLabel': '$65M',
                'investors': [
                    'Paradigm',
                    'a16z',
                    'Polychain Capital',
                    'Three Arrows Capital',
                    'Wintermute',
                    'HashKey',
                    'Electric Capital',
                    'Delphi Digital',
                    'StarkWare',
                ],
                'link': 'https://www.dydx.xyz/blog/series-c',
            },
        ],
        audits=[
            {
                'firm': 'Informal Systems',
                'date': '2025-01-24',
                'url': 'https://www.dydx.xyz/blog/dydx-chain-audit',
            },
        ],
        sources=[
            {
                'label': 'dYdX Documentation — Intro to dYdX Chain Architecture',
                'url': 'https://docs.dydx.xyz/concepts/architecture/overview',
            },
            {
                'label': 'The Block — dYdX Chain launches on mainnet as standalone Cosmos L1',
                'url': 'https://www.theblock.co/post/259658/dydx-chain-officially-launches-on-mainnet-as-standalone-cosmos-layer-1',
            },
            {
                'label': 'dYdX blog — Series C ($65M) announcement',
                'url': 'https://www.dydx.xyz/blog/series-c',
            },
            {
                'label': 'DYDX Token Migration docs (ethDYDX -> native DYDX via wethDYDX)',
                'url': 'https://docs.dydx.community/dydx-token-migration',
            },
            {
                'label': 'dYdX blog — Dive Into The dYdX Chain Audit (Informal Systems)',
                'url': 'https://www.dydx.xyz/blog/dydx-chain-audit',
            },
            {
                'label': 'The Defiant — dYdX Unlimited: permissionless listings & MegaVault',
                'url': 'https://thedefiant.io/news/defi/dydx-launches-permissionless-listings-with-unlimited-upgrade',
            },
            {
                'label': 'dYdX Help Center — Geo Restrictions & Site Access',
                'url': 'https://help.dydx.trade/en/articles/166970-geo-restrictions-site-access',
            },
        ],
        name="dYdX",
        symbol="DYDX",
        tagline="The original decentralized perps pioneer.",
        description=(
            "dYdX is the original decentralized perps pioneer. V4 runs on its own "
            "Cosmos appchain with decentralized, validator-driven order matching and "
            "strong BTC/ETH perp liquidity targeted at professional traders."
        ),
        differentiator=(
            "Permissionless perpetual markets on a dedicated Cosmos appchain with "
            "off-chain orderbook and on-chain settlement; Megavault LP product."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=[],
        chains=["dYdX Chain", "Ethereum"],
        pricing_model="orderbook",
        evm_compatible="no",
        official_docs="https://docs.dydx.exchange",
        website="https://dydx.exchange",
        twitter="https://x.com/dYdX",
        github="https://github.com/dydxprotocol",
        member_coins=[
            _coin("dydx-gov", "dYdX", "DYDX", "Governance + staking token"),
        ],
    ),
    "gmx": _net(
        components=[
            {
                'name': 'GLP (V1 shared liquidity pool)',
                'description': "GMX V1's multi-asset index pool. A single basket of blue-chip assets and stablecoins that acts as the counterparty to all traders on V1. LPs mint/redeem GLP and earn a share of swap and leverage-trading fees; they collectively take the other side of trader PnL.",
            },
            {
                'name': 'GM pools (V2 isolated markets)',
                'description': "GMX V2's per-market liquidity pools introduced in the August 2023 upgrade. Each market (e.g. BTC/USD, ETH/USD, SOL/USD) has its own isolated GM pool with independent parameters and risk, replacing the single shared GLP so that risk from one market does not contaminate others.",
            },
            {
                'name': 'Oracle-based pricing engine',
                'description': "GMX prices trades off external oracle feeds (Chainlink plus GMX's own low-latency price feeds in V2) rather than an AMM curve. Traders open/close at the oracle price, historically with zero price impact on V1 — the design that enabled the 2022 AVAX manipulation and that V2 hardened with price impact and funding mechanics.",
            },
            {
                'name': 'GMX token, staking and esGMX vesting',
                'description': 'GMX is the governance and fee-sharing token; stakers receive a share of protocol fees (in ETH/AVAX) plus esGMX and Multiplier Points. esGMX (escrowed GMX) is a non-transferable reward token that can be staked or linearly vested into liquid GMX over 365 days.',
            },
        ],
        faq=[
            {
                'question': 'What is GMX and who is the counterparty to trades?',
                'answer': 'GMX is a decentralized perpetual and spot exchange on Arbitrum and Avalanche. Rather than matching a taker against a maker on an order book, traders trade against a pool of liquidity providers — the shared GLP pool in V1 and isolated GM pools in V2. LPs collectively take the opposite side of trader profit and loss and earn trading and swap fees in return.',
                'pinned': True,
            },
            {
                'question': 'How does GMX price trades?',
                'answer': "GMX uses external oracle prices (Chainlink, plus GMX's own low-latency feeds in V2) instead of an internal AMM curve. In V1 this meant zero price impact at the oracle price; V2 added price impact, borrowing and funding fees to make the model more robust against manipulation and imbalance.",
                'pinned': False,
            },
            {
                'question': 'What is the difference between GMX V1 and V2?',
                'answer': 'V1 uses one shared multi-asset pool (GLP) that backs every market. V2, launched in August 2023, splits liquidity into isolated per-market GM pools with their own parameters, adds funding rates and price impact, and expands the list of tradeable assets. V2 isolates risk so a problem in one market does not drain liquidity backing others.',
                'pinned': False,
            },
            {
                'question': 'Did GMX raise money from VCs?',
                'answer': 'No. GMX had a fair launch with no venture-capital round or private token sale. The token supply came largely from migrating the earlier Gambit/XVIX tokens, plus Uniswap liquidity, esGMX vesting reserves, a floor-price fund, marketing/community and a small (~1.9%) team allocation.',
                'pinned': False,
            },
            {
                'question': 'Has GMX been hacked?',
                'answer': "GMX suffered two notable incidents. In September 2022 a trader manipulated the AVAX/USD oracle price to extract roughly $565K from GLP on Avalanche, exploiting V1's zero-price-impact design. In July 2025 an attacker drained about $40M+ from GMX V1 on Arbitrum via a re-entrancy/accounting flaw; after GMX offered a 10% white-hat bounty, the exploiter returned the bulk of the funds.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'GMX DAO / GMX token holders',
                'role': 'Governance',
                'description': 'GMX is governed by a pseudonymous core team and its DAO. Protocol changes, treasury use and parameter updates are discussed on the GMX governance forum (gov.gmx.io) and voted on by GMX/esGMX holders.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Futures / perpetual swap exchange (e.g. CME or a CEX derivatives desk)',
                'similarity': 'Offers leveraged long/short exposure to crypto assets via perpetual contracts, with funding-style mechanics and a central price feed.',
                'differences': 'There is no central broker or matching engine. Traders trade against a pool of on-chain liquidity providers rather than other traders; custody is self-custodial; pricing comes from oracles, not an internal order book.',
            },
            {
                'product': 'Market-making / liquidity-provision fund',
                'similarity': 'GLP and GM liquidity providers earn fee income by supplying capital that others trade against, similar to a market maker earning spread and financing.',
                'differences': 'LPs are fully passive and take the aggregate other side of all trader PnL automatically; there is no active quoting, and returns depend on net trader performance plus fees rather than managed spread capture.',
            },
        ],
        events=[
            {
                'date': '2022-09-18',
                'title': 'AVAX oracle price-manipulation exploit (~$565K)',
                'description': "A trader exploited GMX V1's zero-price-impact oracle pricing on Avalanche, moving AVAX price on CEXs (Binance/FTX) while opening and flipping large AVAX positions against GLP with no slippage, netting roughly $565K from LPs. GMX capped AVAX open interest in response.",
                'link': 'https://www.coindesk.com/markets/2022/09/19/defi-trader-nets-over-500k-by-using-dex-gmx-to-manipulate-avalanche-token',
            },
            {
                'date': '2025-07-09',
                'title': 'GMX V1 exploit on Arbitrum (~$40M+)',
                'description': 'An attacker drained roughly $40-42M from GMX V1 on Arbitrum, abusing a re-entrancy / GLP accounting desynchronization to inflate GLP valuation via manipulated short positions. GMX halted V1 trading and minting and offered a $5M (10%) white-hat bounty.',
                'link': 'https://www.theblock.co/post/362164/gmx-token-surges-14-after-hacker-begins-returning-funds-from-40-million-exploit',
            },
            {
                'date': '2025-07-11',
                'title': 'Exploiter returns funds after V1 hack',
                'description': "The July 2025 exploiter accepted GMX's white-hat bounty and began returning the stolen assets — over $10.5M in FRAX first, then the remainder including ~9K ETH — totalling roughly $37.5M returned. GMX's token rebounded on the news.",
                'link': 'https://www.coindesk.com/markets/2025/07/11/gmx-exploiter-return-usd40m-days-after-hack-token-zooms-higher',
            },
        ],
        timeline=[
            {
                'date': '2021-09-01',
                'title': 'GMX launches on Arbitrum (rebrand from Gambit)',
                'description': 'GMX went live on Arbitrum in September 2021, rebranding and merging the earlier Gambit Financial (BNB Chain) and XVIX tokens (XVIX, GMT, XLGE, xGMT) into the single GMX token via a migration allocation.',
                'link': 'https://www.coingecko.com/learn/what-is-gmx-guide-to-the-decentralized-perpetual-exchange',
                'status': 'executed',
            },
            {
                'date': '2022-01-01',
                'title': 'GMX deploys on Avalanche',
                'description': 'GMX expanded to a second network, Avalanche, in January 2022, extending its GLP-backed perpetual and swap markets to AVAX-based assets.',
                'link': 'https://www.coingecko.com/learn/what-is-gmx-guide-to-the-decentralized-perpetual-exchange',
                'status': 'executed',
            },
            {
                'date': '2023-08-03',
                'title': 'GMX V2 beta launch (GM isolated markets)',
                'description': 'GMX V2 went live on Arbitrum and Avalanche mainnet, replacing the single GLP pool with isolated per-market GM pools, adding new assets (SOL, XRP, LTC, DOGE, ARB), multiple collateral types, funding rates and lower-slippage block-by-block oracle pricing.',
                'link': 'https://gmxio.substack.com/p/gmx-v2-beta-is-now-live',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Team token allocation',
                'value': '250,000 GMX (~1.88% of supply), vested linearly over 2 years — reflecting a fair launch with no VC round',
                'freshness': 'static',
                'source': {
                    'label': 'GMX Docs — GMX token',
                    'url': 'https://docs.gmx.io/docs/tokenomics/gmx-token/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Bug bounty ceiling',
                'value': 'Up to $5,000,000 for critical smart-contract vulnerabilities via Immunefi',
                'freshness': 'static',
                'source': {
                    'label': 'GMX Immunefi bug bounty',
                    'url': 'https://immunefi.com/bounty/gmx/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Oracle',
                'description': 'GMX prices trades from external oracle feeds with historically zero price impact on V1. If the referenced spot price is manipulated (as in the Sept 2022 AVAX incident), traders can extract value from LPs at the manipulated oracle price.',
            },
            {
                'category': 'Counterparty',
                'description': 'GLP and GM liquidity providers are the direct counterparty to all traders. When traders are net profitable, LPs bear those losses, so LP returns depend on aggregate trader performance rather than being purely fee-driven.',
            },
            {
                'category': 'Smart Contract',
                'description': "GMX's contracts hold large pooled liquidity. The July 2025 V1 exploit (~$40M+) abused a re-entrancy / GLP accounting desynchronization, demonstrating that complex pool-accounting logic remains an attack surface despite multiple audits.",
            },
            {
                'category': 'Collateral',
                'description': 'GLP concentrates multiple assets in one pool (V1) and GM pools hold specific collateral tokens (V2). Sharp moves or depeg in an underlying pool asset directly impair LP value and the backing behind open positions.',
            },
            {
                'category': 'Governance',
                'description': 'Protocol parameters, treasury and emergency actions (e.g. halting V1 trading after the 2025 hack) are controlled by the core team and a multisig / DAO. Concentrated control over pausing and upgrades is a trust and centralization risk.',
            },
        ],
        competitors=[
            {
                'name': 'Hyperliquid',
                'slug': 'hyperliquid',
                'rank': 1,
                'positioning': 'Dominant order-book perp DEX on its own L1, leading perpetual DEX volume with a large market share and CEX-like performance.',
                'similarities': 'Decentralized perpetual futures with high leverage and self-custody.',
                'differences': "Fully on-chain central limit order book with sub-second finality and its own L1, versus GMX's pool-vs-oracle model on Arbitrum/Avalanche.",
            },
            {
                'name': 'dYdX',
                'slug': 'dydx',
                'rank': 2,
                'positioning': 'Established order-book perpetual DEX running on its own Cosmos appchain with pro trading tooling and 200+ markets.',
                'similarities': 'Non-custodial perpetual futures with high leverage.',
                'differences': "Central limit order book with off-chain matching / appchain consensus, versus GMX's passive-LP pool model and oracle pricing.",
            },
            {
                'name': 'GNS (Gains Network)',
                'slug': 'gains-network',
                'rank': 3,
                'positioning': 'Synthetic leveraged trading on Arbitrum/Polygon backed by a single DAI vault, covering crypto plus forex and stocks.',
                'similarities': 'Pool-backed (vault) perpetual trading with oracle pricing and LPs as counterparty, similar in spirit to GLP.',
                'differences': "Uses a synthetic single-DAI vault and offers non-crypto assets, versus GMX's basket/GM pools of real spot assets.",
            },
            {
                'name': 'Synthetix',
                'slug': 'synthetix',
                'rank': 4,
                'positioning': 'Derivatives liquidity layer whose perps (via front-ends) are backed by a shared debt/collateral pool.',
                'similarities': 'Pooled-liquidity, oracle-priced derivatives where stakers/LPs are the systemic counterparty.',
                'differences': "Synthetic-asset debt-pool architecture and a liquidity-layer role for other apps, versus GMX's direct trader-facing pool product.",
            },
        ],
        audits=[
            {
                'firm': 'ABDK Consulting',
                'date': '2021-08-01',
                'url': 'https://github.com/gmx-io/gmx-contracts/blob/master/audits/ABDK_Audit_Review.txt',
            },
            {
                'firm': 'Dedaub',
                'date': '2022-11-20',
                'url': 'https://dedaub.com/audits/gmx/gmx-synthetics-nov-20-2022/',
            },
        ],
        sources=[
            {
                'label': 'GMX Docs — Security / audits',
                'url': 'https://docs.gmx.io/docs/security/',
            },
            {
                'label': 'GMX V2 Beta launch announcement (GMX Substack)',
                'url': 'https://gmxio.substack.com/p/gmx-v2-beta-is-now-live',
            },
            {
                'label': 'CoinGecko — What is GMX (launch, Gambit rebrand, Avalanche)',
                'url': 'https://www.coingecko.com/learn/what-is-gmx-guide-to-the-decentralized-perpetual-exchange',
            },
            {
                'label': 'CoinDesk — Sept 2022 AVAX manipulation',
                'url': 'https://www.coindesk.com/markets/2022/09/19/defi-trader-nets-over-500k-by-using-dex-gmx-to-manipulate-avalanche-token',
            },
            {
                'label': 'The Block — July 2025 exploit and fund return',
                'url': 'https://www.theblock.co/post/362164/gmx-token-surges-14-after-hacker-begins-returning-funds-from-40-million-exploit',
            },
            {
                'label': 'CoinDesk — July 2025 exploiter returns $40M',
                'url': 'https://www.coindesk.com/markets/2025/07/11/gmx-exploiter-return-usd40m-days-after-hack-token-zooms-higher',
            },
            {
                'label': 'GMX Docs — GMX tokenomics (fair launch, esGMX)',
                'url': 'https://docs.gmx.io/docs/tokenomics/gmx-token/',
            },
        ],
        name="GMX",
        symbol="GMX",
        tagline="Multi-asset pool-backed perpetuals with zero price impact.",
        description=(
            "GMX uses multi-asset liquidity pools (GLP V1, GM V2) where LPs are the "
            "counterparty to traders; oracle-based pricing means zero price-impact "
            "trades up to pool depth. V2 added isolated-market GM pools."
        ),
        differentiator=(
            "Oracle-priced, pool-backed perps with zero price impact within pool "
            "depth; GLP composability across DeFi."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=[],
        chains=["Arbitrum", "Avalanche"],
        pricing_model="oracle",
        official_docs="https://docs.gmx.io",
        website="https://gmx.io",
        twitter="https://x.com/GMX_IO",
        github="https://github.com/gmx-io",
        member_coins=[
            _coin("gmx-gov", "GMX", "GMX", "Governance + fee-share token (esGMX vesting)"),
        ],
    ),
    "drift-protocol": _net(
        components=[
            {
                'name': 'Hybrid Liquidity Engine (JIT + DLOB + AMM)',
                'description': "Drift v2 matches orders across three layers. A taker market order first enters a Just-In-Time (JIT) Dutch auction where whitelisted market makers (Keepers) compete to fill at or inside the oracle price; unfilled size falls through to the on-chain Decentralized Limit Order Book (DLOB) of resting limit orders; any residual routes to the protocol's virtual AMM (vAMM), which prices flow against a constant-product curve anchored to the Pyth oracle so every order fills.",
            },
            {
                'name': 'Dynamic vAMM',
                'description': 'A virtual AMM using a constant-product curve with a concentration factor and dynamic spread/peg that programmatically update before filling trades, plus external Backstop AMM Liquidity (BAL). It acts as the fallback liquidity source of last resort behind the JIT auction and orderbook.',
            },
            {
                'name': 'Insurance Fund',
                'description': "The protocol's first backstop for solvency, held in separate per-asset funds (USDC, BTC, ETH, SOL). Funded by premiums from liquidation, trading and borrow fees, and by stakers. Users can stake assets into the Insurance Fund to earn a proportionate share of the Revenue Pool, with excess losses beyond limits covered by a socialised loss mechanism.",
            },
            {
                'name': 'Drift Vaults',
                'description': 'On-chain, smart-contract-governed strategy vaults for structured products. Common strategies include hedged JLP (hJLP) delta-neutral vaults that deposit into the Jupiter Liquidity Pool and open offsetting BTC/ETH/SOL shorts on Drift, plus borrow-and-lend vaults. Vaults support delegate-managed trades with customizable terms.',
            },
            {
                'name': 'Spot & Cross-Collateral Margin',
                'description': 'A unified cross-collateral margin account spanning perpetual futures (up to 10x), spot trading (up to 5x) with Jupiter-integrated routing, and borrow-lend markets. Drift markets itself as the first on-chain platform to offer cross-collateral margin across a full DeFi product suite.',
            },
            {
                'name': 'DRIFT Governance Token',
                'description': 'DRIFT is a Solana SPL governance token (1B total supply) letting holders vote on protocol decisions such as adding markets, adjusting risk parameters, and treasury allocation. Holders can also stake to earn a share of protocol fees.',
            },
        ],
        faq=[
            {
                'question': 'What is Drift Protocol?',
                'answer': 'Drift is the leading Solana-native perpetual futures DEX. It runs a hybrid liquidity model combining a Just-In-Time (JIT) auction, an on-chain decentralized limit orderbook (DLOB), and a fallback virtual AMM, alongside spot trading routed via Jupiter, borrow-lend markets, and passive strategy vaults.',
                'pinned': True,
            },
            {
                'question': "How does Drift's hybrid liquidity model work?",
                'answer': 'A taker order first enters a short JIT Dutch auction where market makers compete to fill at or inside the oracle price. Unfilled size then matches against resting limit orders in the DLOB, and any remainder routes to the vAMM, which prices against a Pyth-anchored constant-product curve so every order is guaranteed a fill.',
                'pinned': False,
            },
            {
                'question': 'What happened to Drift v1 in May 2022?',
                'answer': 'During the UST/LUNA collapse on 11 May 2022, a design flaw let users withdraw positive PnL and drain the Insurance Fund without socialised-loss or clawback guardrails. About $8.72M net withdrew in 12 hours, depleting the vault to ~$4.94M. Drift paused the protocol, secured $14.5M in external financing, and made users whole by 27 May 2022, then rebuilt as Drift v2.',
                'pinned': False,
            },
            {
                'question': 'When did the DRIFT token launch?',
                'answer': "DRIFT's Token Generation Event and launch airdrop went live on 16 May 2024, distributing 120M tokens (~12% of the 1B supply) to roughly 150,000 eligible wallets including v1/v2 users, Drift Points participants, and Keepers.",
                'pinned': False,
            },
            {
                'question': 'What is the Insurance Fund and can I stake in it?',
                'answer': "The Insurance Fund is Drift's primary solvency backstop, kept in separate USDC, BTC, ETH and SOL funds. Anyone can stake the corresponding asset to further collateralise it and earn a proportionate share of the Revenue Pool (fees from liquidations, trading and borrows) every hour.",
                'pinned': False,
            },
            {
                'question': 'Who audited Drift?',
                'answer': "Drift v2 has been audited by Trail of Bits (2022-2023, no high-severity findings) and Neodyme (2024). OtterSec audited the 'Connect by Drift' MetaMask Snap. Zellic has also published a Drift Protocol audit report.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Cindy Leow',
                'role': 'Co-founder, Drift Labs',
                'description': "Co-founder who has publicly framed the goal of building Drift into the 'Robinhood of crypto' via a full on-chain trading suite (perps, spot, prediction markets) on Solana.",
            },
            {
                'name': 'Drift Labs',
                'role': 'Core developer / Foundation',
                'description': 'The team building Drift Protocol; a DRIFT Foundation and community governance via the DRIFT token oversee protocol decisions. Airdrop eligibility and claims were run via drift.foundation.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'CME / centralized futures exchange (CLOB)',
                'similarity': 'Both offer leveraged perpetual/futures exposure matched through a limit orderbook with market makers providing liquidity.',
                'differences': "Drift settles fully on-chain on Solana with non-custodial wallets, a Pyth-oracle vAMM fallback that guarantees fills, and a JIT auction compressed into one slot due to Solana's lack of a public mempool; there is no central clearinghouse or KYC gatekeeper.",
            },
            {
                'product': 'Retail brokerage (e.g., Robinhood)',
                'similarity': 'Both aim to be a single consumer app bundling multiple asset classes (spot, derivatives, and more) with a simple trading UX.',
                'differences': 'Drift is self-custodial and permissionless with on-chain cross-collateral margin, community DRIFT governance, and token-based fee sharing, rather than a custodial regulated broker routing to third-party venues.',
            },
        ],
        events=[
            {
                'date': '2021-10-26',
                'title': 'Drift Labs raises $3.8M seed',
                'description': "Seed round led by Multicoin Capital with Alameda Research, Jump Capital, LedgerPrime, QCP Capital, Robot Ventures, ROK Capital and Not3Lau Capital, coinciding with Drift's alpha mainnet launch.",
                'link': 'https://driftprotocol.medium.com/drift-labs-raises-3-8-million-in-seed-round-8c4ed64f2080',
            },
            {
                'date': '2022-05-11',
                'title': 'Drift v1 incident during UST/LUNA crash',
                'description': 'A design flaw allowing unchecked PnL and Insurance Fund withdrawals, catalysed by the LUNA drawdown, drained ~$8.72M net in 12 hours to a ~$4.94M vault balance; the protocol was paused at 19:29 UTC.',
                'link': 'https://driftprotocol.medium.com/drift-protocol-technical-incident-report-2022-05-11-eedea078b6d4',
            },
            {
                'date': '2022-05-27',
                'title': 'User settlement completed',
                'description': 'Drift secured $14.5M in external financing to cover the full settlement shortfall from the May incident, with full redemption available to affected users on 27 May 2022.',
                'link': 'https://driftprotocol.medium.com/drift-protocol-technical-incident-report-2022-05-11-eedea078b6d4',
            },
            {
                'date': '2023-05-22',
                'title': 'Drift raises $23.5M Series A',
                'description': 'Series A led by Polychain Capital with Solana founders Anatoly Yakovenko and Raj Gokal, Ethereal Ventures (Consensys) and Folius Ventures, bringing total funding to $27.3M; announced at Breakpoint 2023.',
                'link': 'https://www.drift.trade/updates/drifts-series-a-announcement',
            },
            {
                'date': '2024-05-16',
                'title': 'DRIFT token TGE and launch airdrop',
                'description': 'DRIFT launched with a 120M-token airdrop (~12% of supply) to ~150,000 wallets, with allocations split between an initial claim and a bonus unlocking linearly over six hours to reduce congestion and dumping.',
                'link': 'https://phantom.com/learn/crypto-101/drift-airdrop',
            },
            {
                'date': '2024-09-19',
                'title': 'Drift raises $25M Series B',
                'description': 'All-token Series B led by Multicoin Capital with Blockchain Capital, Primitive Ventures, Maelstrom and Folius Ventures, bringing total funding to ~$52.5M; Drift cited 200,000+ users and $50B+ cumulative volume.',
                'link': 'https://fortune.com/crypto/2024/09/19/drift-solana-multicoin-crypto-funding-series-b/',
            },
        ],
        timeline=[
            {
                'date': '2021-10-26',
                'title': 'Alpha mainnet launch (v1)',
                'description': "Drift's original dynamic-AMM perpetuals platform launched on Solana mainnet alongside its seed raise.",
                'link': 'https://driftprotocol.medium.com/drift-labs-raises-3-8-million-in-seed-round-8c4ed64f2080',
                'status': 'executed',
            },
            {
                'date': '2022-10-01',
                'title': 'Drift v2 public devnet',
                'description': 'Drift launched v2 on public devnet, introducing the hybrid JIT + orderbook + AMM liquidity mechanism to replace the v1 single-vAMM design.',
                'link': 'https://messari.io/project/drift-protocol/profile',
                'status': 'executed',
            },
            {
                'date': '2022-12-01',
                'title': 'Drift v2 public mainnet',
                'description': 'After an NFT-gated mainnet launch in November 2022, Drift v2 opened to the public on mainnet in December 2022.',
                'link': 'https://messari.io/project/drift-protocol/profile',
                'status': 'executed',
            },
            {
                'date': '2024-05-16',
                'title': 'DRIFT governance token live',
                'description': 'Token Generation Event enabling community governance and fee-sharing via DRIFT staking.',
                'link': 'https://phantom.com/learn/crypto-101/drift-airdrop',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Launch airdrop size',
                'value': '120M DRIFT (~12% of 1B supply) to ~150,000 eligible wallets',
                'freshness': 'static',
                'source': {
                    'label': 'The Defiant / Phantom airdrop guide',
                    'url': 'https://phantom.com/learn/crypto-101/drift-airdrop',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding raised',
                'value': '~$52.5M across seed ($3.8M), Series A ($23.5M) and Series B ($25M)',
                'freshness': 'static',
                'source': {
                    'label': 'Fortune (Series B announcement)',
                    'url': 'https://fortune.com/crypto/2024/09/19/drift-solana-multicoin-crypto-funding-series-b/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Cumulative volume / users at Series B',
                'value': '200,000+ users and $50B+ cumulative trading volume (Sept 2024)',
                'freshness': 'static',
                'source': {
                    'label': 'Fortune',
                    'url': 'https://fortune.com/crypto/2024/09/19/drift-solana-multicoin-crypto-funding-series-b/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Drift is a complex multi-program Solana protocol (perps engine, vAMM, vaults, insurance fund). Despite audits by Trail of Bits and Neodyme, bugs in the matching engine, margin math or vault programs could cause loss of funds, as the v1 design flaw demonstrated in 2022.',
            },
            {
                'category': 'Oracle',
                'description': 'Pricing for the vAMM, JIT auction starting price, funding rates and liquidations is anchored to Pyth oracle feeds. Oracle latency, manipulation or stale prices could trigger mispriced fills, bad liquidations or funding-rate exploits.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': "The Insurance Fund is Drift's primary solvency backstop and is finite. In extreme volatility (as in May 2022) it can be depleted, forcing socialised losses across all user deposits and positions when losses exceed allotted limits.",
            },
            {
                'category': 'Systemic',
                'description': 'The v1 collapse was triggered by the UST/LUNA death spiral: cross-market contagion, mass withdrawals and collateral depegs. As a Solana-native venue, Drift is also exposed to Solana network outages/congestion that can freeze the JIT auction and orderbook keeper network.',
            },
            {
                'category': 'Counterparty',
                'description': 'The JIT auction and DLOB rely on a network of whitelisted market-maker Keeper bots. If keepers withdraw or fail to fill during stress, order flow falls back to the vAMM at deeper slippage, worsening execution and funding costs for traders.',
            },
            {
                'category': 'Governance',
                'description': 'DRIFT holders control market listings, risk parameters and treasury funds. Concentrated token holdings (large VC/team allocations under the vesting schedule) or low participation could let governance push risk-parameter or treasury changes adverse to smaller users.',
            },
        ],
        competitors=[
            {
                'name': 'Hyperliquid',
                'slug': 'hyperliquid',
                'rank': 1,
                'positioning': 'Dominant perp DEX overall, running a CEX-style CLOB on its own L1 app-chain with sub-second blocks and the largest share of DEX perp volume.',
                'similarities': 'Fully on-chain orderbook-style perpetual futures with market-maker liquidity and self-custody.',
                'differences': "Runs on a purpose-built L1 rather than Solana; processes multiples of Drift's daily volume and does not integrate with the Solana DeFi stack or use a JIT+vAMM fallback.",
            },
            {
                'name': 'Jupiter Perps',
                'slug': None,
                'rank': 2,
                'positioning': "Solana's largest perpetual venue by volume, built by the Jupiter swap-aggregator team using an oracle/pool (JLP) model.",
                'similarities': 'Solana-native leveraged perpetuals leveraging Pyth-style oracle pricing; Drift vaults even build on the JLP pool.',
                'differences': "Traders trade against the JLP liquidity pool rather than an orderbook/JIT auction; no on-chain CLOB, and it leans on Jupiter's existing swap user base.",
            },
            {
                'name': 'dYdX',
                'slug': 'dydx',
                'rank': 3,
                'positioning': 'Established orderbook perp DEX now on its own Cosmos app-chain, known for decentralization depth and ecosystem maturity.',
                'similarities': 'Orderbook-based perpetual futures DEX with a native governance token.',
                'differences': "Non-Solana app-chain; off-chain orderbook/on-chain settlement model rather than Drift's on-chain DLOB + JIT + vAMM hybrid, and no Solana DeFi integration.",
            },
            {
                'name': 'Zeta Markets',
                'slug': None,
                'rank': 4,
                'positioning': 'Smaller Solana-native derivatives DEX competing for the remaining Solana perp share alongside Drift and Jupiter.',
                'similarities': 'Solana-native leveraged derivatives with on-chain orderbook design.',
                'differences': 'Materially smaller volume and open interest than Drift, with a narrower product suite.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-10-26',
                'round': 'Seed',
                'amountUsd': 3800000,
                'amountLabel': '$3.8M',
                'investors': [
                    'Multicoin Capital',
                    'Alameda Research',
                    'Jump Capital',
                    'LedgerPrime',
                    'QCP Capital',
                    'Robot Ventures',
                    'ROK Capital',
                    'Not3Lau Capital',
                ],
                'link': 'https://driftprotocol.medium.com/drift-labs-raises-3-8-million-in-seed-round-8c4ed64f2080',
            },
            {
                'date': '2023-05-22',
                'round': 'Series A',
                'amountUsd': 23500000,
                'amountLabel': '$23.5M',
                'investors': [
                    'Polychain Capital',
                    'Anatoly Yakovenko',
                    'Raj Gokal',
                    'Ethereal Ventures',
                    'Folius Ventures',
                ],
                'link': 'https://www.drift.trade/updates/drifts-series-a-announcement',
            },
            {
                'date': '2024-09-19',
                'round': 'Series B',
                'amountUsd': 25000000,
                'amountLabel': '$25M',
                'investors': [
                    'Multicoin Capital',
                    'Blockchain Capital',
                    'Primitive Ventures',
                    'Maelstrom',
                    'Folius Ventures',
                ],
                'link': 'https://fortune.com/crypto/2024/09/19/drift-solana-multicoin-crypto-funding-series-b/',
            },
        ],
        audits=[
            {
                'firm': 'Trail of Bits',
                'date': '2022-12-02',
                'url': 'https://www.drift.trade/audit',
            },
            {
                'firm': 'Neodyme',
                'date': '2024-05-10',
                'url': 'https://cdn.prod.website-files.com/6310e7dee49f0866da8eed4c/6686bbdfe7c6e5a997cc51bc_Neodyme%20-%20Drift%20Security%20Audit.pdf',
            },
            {
                'firm': 'Zellic',
                'date': '2022-12-01',
                'url': 'https://github.com/Zellic/publications/blob/master/Drift%20Protocol%20Audit%20Report.pdf',
            },
            {
                'firm': 'OtterSec',
                'date': '2024-01-01',
                'url': 'https://www.drift.trade/connect-by-drift-security-audit-by-ottersec',
            },
        ],
        sources=[
            {
                'label': 'Drift Protocol Technical Incident Report 2022-05-11',
                'url': 'https://driftprotocol.medium.com/drift-protocol-technical-incident-report-2022-05-11-eedea078b6d4',
            },
            {
                'label': 'Drift Labs Raises $3.8M Seed Round',
                'url': 'https://driftprotocol.medium.com/drift-labs-raises-3-8-million-in-seed-round-8c4ed64f2080',
            },
            {
                'label': 'Drift $23.5M Series A Announcement',
                'url': 'https://www.drift.trade/updates/drifts-series-a-announcement',
            },
            {
                'label': 'Fortune: Drift $25M Series B',
                'url': 'https://fortune.com/crypto/2024/09/19/drift-solana-multicoin-crypto-funding-series-b/',
            },
            {
                'label': 'Phantom DRIFT airdrop guide',
                'url': 'https://phantom.com/learn/crypto-101/drift-airdrop',
            },
            {
                'label': 'Drift docs: Audits',
                'url': 'https://docs.drift.trade/protocol/risk-and-safety/audits',
            },
            {
                'label': 'Drift docs: JIT Auctions',
                'url': 'https://docs.drift.trade/developers/market-makers/jit-auctions',
            },
        ],
        github='https://github.com/drift-labs',
        name="Drift Protocol",
        symbol="DRIFT",
        tagline="Leading Solana-native perps DEX.",
        description=(
            "Drift is the leading Solana-native perps DEX. It combines an on-chain "
            "orderbook (DLOB) with an AMM (vAMM) fallback so liquidity providers and "
            "just-in-time market makers can both serve fills."
        ),
        differentiator=(
            "DLOB + vAMM hybrid with JIT auctions; Drift Vaults offer passive "
            "strategies, with spot routed via Jupiter."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=[],
        chains=["Solana"],
        pricing_model="orderbook",
        evm_compatible="no",
        official_docs="https://docs.drift.trade",
        website="https://drift.trade",
        twitter="https://x.com/DriftProtocol",
        member_coins=[
            _coin("drift", "Drift", "DRIFT", "Governance token (sDRIFT staking)"),
        ],
    ),
    "gains-network": _net(
        components=[
            {
                'name': 'gTrade',
                'description': 'The decentralized leveraged trading platform built by Gains Network. Traders open synthetic leveraged positions on crypto, forex, stocks, indices, and commodities using stablecoin collateral, with prices sourced from a custom Chainlink oracle network rather than a traditional order book.',
            },
            {
                'name': 'gToken Vaults (gDAI / gUSDC / gETH / gBTCUSD / gGNS)',
                'description': 'ERC-4626 tokenized vaults that act as the sole counterparty to all trades on the collateral they back. When traders lose, losses flow into the vault; when traders win, profits are paid from it. Vaults receive a share of trading fees, which appreciates the gToken exchange rate for liquidity providers.',
            },
            {
                'name': 'GNS token',
                'description': 'The native ERC-20 utility and value-capture token. Used for staking (fee discounts up to 50%), revenue sharing via buyback-and-burn, and as a balancing/backstop mechanism for the vaults. Max supply capped at 100,000,000.',
            },
            {
                'name': 'Custom Chainlink DON',
                'description': "An on-demand real-time Chainlink decentralized oracle network. When a trade is submitted, gTrade's node operators each return a median spot price aggregated from multiple exchange APIs, and the aggregator contract takes the median of the responses so there is no single point of failure.",
            },
        ],
        faq=[
            {
                'question': 'What is Gains Network?',
                'answer': 'Gains Network is the team behind gTrade, a decentralized synthetic leveraged trading platform. It lets users trade crypto, forex, stocks, indices, and commodities with leverage (up to 150x on crypto and higher on forex) using stablecoin collateral, with gToken vaults acting as counterparty.',
                'pinned': True,
            },
            {
                'question': 'How does gTrade differ from an order-book perp DEX?',
                'answer': 'gTrade is synthetic: there is no order book and no direct counterparty matching. A gToken vault (e.g. gDAI or gUSDC) is the counterparty to every trade, and execution prices come from a custom Chainlink oracle network delivering median spot prices, giving deep liquidity with no market impact.',
                'pinned': False,
            },
            {
                'question': 'Did Gains Network raise money from VCs?',
                'answer': 'No. Gains Network was a fair launch. The predecessor GFARM2 token was distributed via a liquidity pool on Ethereum with no ICO, presale, or VC allocation. The project was bootstrapped by its developer(s).',
                'pinned': False,
            },
            {
                'question': 'What is the relationship between GFARM2 and GNS?',
                'answer': 'GNS is the rebranded successor to GFARM2. On 27 October 2021 the project rebranded to Gains Network and migrated GFARM2 to GNS with a 1:1000 split (1000 GNS per GFARM2), targeting a 100m max supply.',
                'pinned': False,
            },
            {
                'question': 'What are gToken vaults and how do LPs earn?',
                'answer': 'gToken vaults (gDAI, gUSDC, gETH, gBTCUSD, gGNS) are ERC-4626 vaults that back trades. LPs deposit the underlying asset and receive a yield-bearing gToken. Vaults collect a portion of trading fees; as long as fees earned exceed net trader PnL payouts, LPs earn a positive return.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Seb (Sébastien)',
                'role': 'Founder / lead developer',
                'description': 'Built the original GFARM2 protocol largely solo over roughly a year before the rebrand to Gains Network, and remains the core developer behind gTrade.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'CFD / spread-betting broker (e.g. leveraged CFDs on forex and equities)',
                'similarity': 'Both offer high-leverage synthetic exposure to crypto, forex, indices, stocks, and commodities without holding the underlying asset, with the platform/liquidity pool acting as counterparty.',
                'differences': "gTrade is non-custodial and on-chain, settles in stablecoins via smart contracts, uses a Chainlink oracle network for pricing, and its counterparty is a permissionless ERC-4626 LP vault rather than a licensed broker's balance sheet.",
            },
            {
                'product': 'Prop/market-maker liquidity pool acting as house',
                'similarity': "The gToken vault functions like a 'house' that wins when traders lose and loses when they win, earning fees for providing liquidity.",
                'differences': 'Anyone can become an LP in the vault permissionlessly and hold a tokenized, transferable share, unlike a private market-making desk.',
            },
        ],
        events=[
            {
                'date': '2021-10-27',
                'title': 'Rebrand to Gains Network and GFARM2 to GNS migration',
                'description': 'The GFARM2 project rebranded to Gains Network and migrated its token to GNS with a 1:1000 split (1000 GNS per GFARM2), targeting a 100m max supply.',
                'link': 'https://gainsnetwork-io.medium.com/migrating-gfarm2-to-gns-aa51bea889ff',
            },
            {
                'date': '2022-01-05',
                'title': 'Polygon grant for trading contests',
                'description': 'Gains Network received a $250,000 grant from Polygon to fund two gTrade trading contests, per widely reported coverage of the early Polygon deployment.',
                'link': 'https://iq.wiki/wiki/gains-network',
            },
            {
                'date': '2022-12-07',
                'title': 'Introduction of gToken Vaults (gDAI)',
                'description': 'Gains Network launched the ERC-4626 gToken vault standard, with gDAI as the first gToken, replacing the earlier direct DAI vault and making LP positions composable and yield-bearing.',
                'link': 'https://medium.com/gains-network/introducing-gtoken-vaults-ea98f10a49d5',
            },
            {
                'date': '2022-12-31',
                'title': 'gTrade launches on Arbitrum',
                'description': 'gTrade deployed to Arbitrum with a new gDAI vault, expanding beyond Polygon to Arbitrum-native DeFi traders.',
                'link': 'https://medium.com/gains-network/gtrade-december-recap-new-vault-new-chain-ab1f0f9fecbb',
            },
            {
                'date': '2024-09-25',
                'title': 'gTrade expands to Base',
                'description': 'gTrade rolled out on Base with a single gUSDC vault, seeded partly with protocol-owned over-collateral migrated from Polygon.',
                'link': 'https://medium.com/gains-network/gtrade-expands-to-base-a-strategic-rollout-b6422f77045e',
            },
        ],
        timeline=[
            {
                'date': '2021-01-01',
                'title': 'GFARM2 fair launch on Ethereum',
                'description': 'The predecessor GFARM2 token launched on Ethereum and was distributed fairly via the GFARM2/ETH liquidity pool, with no presale or VC allocation.',
                'link': 'https://gainsnetwork-io.medium.com/migrating-gfarm2-to-gns-aa51bea889ff',
                'status': 'executed',
            },
            {
                'date': '2021-10-27',
                'title': 'GNS token and Gains Network rebrand',
                'description': '1:1000 migration from GFARM2 to GNS and rebrand to Gains Network, ahead of the move to Polygon.',
                'link': 'https://gainsnetwork-io.medium.com/migrating-gfarm2-to-gns-aa51bea889ff',
                'status': 'executed',
            },
            {
                'date': '2022-12-07',
                'title': 'gToken vaults (ERC-4626) go live',
                'description': 'gDAI introduced as the first ERC-4626 gToken vault, the model later extended to gUSDC, gETH, gBTCUSD, and gGNS.',
                'link': 'https://medium.com/gains-network/introducing-gtoken-vaults-ea98f10a49d5',
                'status': 'executed',
            },
            {
                'date': '2022-12-31',
                'title': 'Multi-chain expansion begins (Arbitrum)',
                'description': 'gTrade deployed on Arbitrum, its first chain beyond Polygon.',
                'link': 'https://medium.com/gains-network/gtrade-december-recap-new-vault-new-chain-ab1f0f9fecbb',
                'status': 'executed',
            },
            {
                'date': '2024-09-25',
                'title': 'Base deployment',
                'description': 'gTrade launched on Base with a gUSDC vault.',
                'link': 'https://medium.com/gains-network/gtrade-expands-to-base-a-strategic-rollout-b6422f77045e',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'GNS max supply',
                'value': '100,000,000 GNS (capped; initial supply 38,892,000 at launch)',
                'freshness': 'static',
                'source': {
                    'label': 'Gains Network docs — GNS Token',
                    'url': 'https://docs.gains.trade/what-is-gains-network/gfarm2-token',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Token migration ratio',
                'value': '1:1000 split — 1000 GNS per 1 GFARM2 (migration announced 27 Oct 2021)',
                'freshness': 'static',
                'source': {
                    'label': 'Gains Network — Migrating GFARM2 to GNS',
                    'url': 'https://gainsnetwork-io.medium.com/migrating-gfarm2-to-gns-aa51bea889ff',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Supported chains',
                'value': 'Arbitrum One, Base, Polygon (plus additional deployments noted in docs); collateral in stablecoins such as DAI and USDC',
                'freshness': 'live',
                'source': {
                    'label': 'Gains Network gTrade FAQ',
                    'url': 'https://docs.gains.trade/help/faq',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': "The gToken vaults (gDAI, gUSDC, etc.) are the direct counterparty to every trade. During sustained periods where traders' net PnL outpaces collected fees, the vault's backing can be drawn down, exposing LPs to losses and impairing the gToken exchange rate.",
            },
            {
                'category': 'Oracle',
                'description': "Execution prices depend on gTrade's custom Chainlink DON, which fetches median spot prices from a set of exchange APIs. Oracle latency, feed manipulation, or thin off-chain liquidity on a given asset could allow mispriced fills or be exploited, which is especially sensitive given leverage up to 150x.",
            },
            {
                'category': 'Smart Contract',
                'description': 'gTrade uses an upgradeable Diamond (EIP-2535) architecture across multiple chains and vault contracts. Bugs in the diamond facets, vault accounting, or the oracle aggregator could cause loss of user or vault funds despite audits and timelocks.',
            },
            {
                'category': 'Governance',
                'description': "A June 2022 CertiK audit flagged a centralization / privileged-role concern (acknowledged), and governance can alter core parameters — e.g. the 'Make Gains Great Again' vote paused buyback-and-burn in 2026. Concentrated control over upgrades and reward policy is a governance risk to token holders and LPs.",
            },
            {
                'category': 'Systemic',
                'description': 'As a synthetic leveraged venue, gTrade is exposed to correlated, cross-market stress: simultaneous large adverse moves across crypto/forex/equities positions, cascading liquidations, or a stablecoin depeg of the collateral (DAI/USDC) could stress vault solvency at once.',
            },
        ],
        competitors=[
            {
                'name': 'GMX',
                'slug': 'gmx',
                'rank': 1,
                'positioning': 'Leading on-chain perp DEX using shared LP pools (GLP/GM) as counterparty on Arbitrum and Avalanche.',
                'similarities': 'Both are pool-backed (no order book), oracle-priced leveraged trading venues where an LP pool is the counterparty and provides deep, market-impact-free liquidity.',
                'differences': 'GMX trades a narrower set of crypto assets against a basket-collateralized pool, whereas gTrade offers synthetic exposure to forex, equities, indices, and commodities in addition to crypto, backed by single-asset ERC-4626 gToken vaults.',
            },
            {
                'name': 'Hyperliquid',
                'slug': 'hyperliquid',
                'rank': 2,
                'positioning': 'High-performance on-chain order-book perp exchange on its own L1.',
                'similarities': 'Both are decentralized leveraged/perp trading venues competing for perp DEX volume and traders.',
                'differences': 'Hyperliquid is a central-limit order-book model on a purpose-built L1 with direct counterparties; gTrade is synthetic with a vault counterparty and Chainlink oracle pricing on general-purpose chains.',
            },
            {
                'name': 'dYdX',
                'slug': 'dydx',
                'rank': 3,
                'positioning': 'Order-book derivatives DEX (now on its own Cosmos appchain).',
                'similarities': 'Both are major decentralized leveraged-derivatives platforms.',
                'differences': 'dYdX uses a matched order book with market makers; gTrade uses a synthetic vault-counterparty model and covers non-crypto asset classes like forex and stocks.',
            },
            {
                'name': 'Synthetix',
                'slug': 'synthetix',
                'rank': 4,
                'positioning': 'Synthetic-asset and perps protocol where a staked-collateral pool backs synthetic exposure.',
                'similarities': 'Both are synthetic, pool-backed models where a collateral pool is the counterparty to leveraged/synthetic positions across asset classes.',
                'differences': 'Synthetix backs synths with SNX/stablecoin staker debt pools and powers front-ends like Kwenta; gTrade runs its own gTrade front-end with single-asset gToken vaults and a bespoke Chainlink oracle network.',
            },
            {
                'name': 'Gains-adjacent equity/forex CFD DEXs',
                'slug': None,
                'rank': 5,
                'positioning': 'Other synthetic leveraged venues offering forex/equity exposure on-chain.',
                'similarities': 'Compete for the multi-asset (forex/stocks/commodities) synthetic leverage niche that distinguishes gTrade.',
                'differences': "gTrade's combination of a fair-launched token, ERC-4626 vaults, and custom Chainlink DON pricing is relatively distinctive in this niche.",
            },
        ],
        partnerships=[
            {
                'name': 'Chainlink',
                'date': None,
                'amountLabel': None,
                'description': "gTrade integrates Chainlink Price Feeds and operates a custom Chainlink decentralized oracle network (DON) for real-time median pricing; it has also integrated Chainlink CCIP and Data Streams for cross-chain and low-latency data. Sourced via Gains Network's own Chainlink engineering posts.",
            },
        ],
        audits=[
            {
                'firm': 'CertiK',
                'date': '2022-06-01',
                'url': 'https://skynet.certik.com/projects/gains-network',
            },
            {
                'firm': 'Halborn',
                'date': None,
                'url': 'https://docs.gains.trade/help/faq',
            },
        ],
        sources=[
            {
                'label': 'Gains Network docs — GNS Token',
                'url': 'https://docs.gains.trade/what-is-gains-network/gfarm2-token',
            },
            {
                'label': 'Gains Network — Migrating GFARM2 to GNS (Medium)',
                'url': 'https://gainsnetwork-io.medium.com/migrating-gfarm2-to-gns-aa51bea889ff',
            },
            {
                'label': 'Gains Network docs — gToken Vaults',
                'url': 'https://docs.gains.trade/liquidity-farming-pools/gtoken-vaults',
            },
            {
                'label': 'Gains Network — Introducing gToken Vaults (Medium)',
                'url': 'https://medium.com/gains-network/introducing-gtoken-vaults-ea98f10a49d5',
            },
            {
                'label': 'Gains Network — gTrade using Chainlink DON (Medium)',
                'url': 'https://medium.com/gains-network/gains-farm-using-chainlink-to-power-decentralized-leveraged-trading-fe954b37eb97',
            },
            {
                'label': 'Gains Network — gTrade expands to Base (Medium)',
                'url': 'https://medium.com/gains-network/gtrade-expands-to-base-a-strategic-rollout-b6422f77045e',
            },
            {
                'label': 'Gains Network gTrade FAQ (docs)',
                'url': 'https://docs.gains.trade/help/faq',
            },
        ],
        github='https://github.com/GainsNetwork-org',
        name="Gains Network",
        symbol="GNS",
        tagline="Synthetic leveraged trading (gTrade).",
        description=(
            "Gains Network (gTrade) offers synthetic leveraged trading backed by "
            "gToken LP vaults; it supports very high leverage (up to 150x) across "
            "crypto, forex, and equities/indices, accessible to retail with low minimums."
        ),
        differentiator=(
            "Synthetic markets (no spot leg) collateralized by gToken vaults; "
            "up-to-150x leverage on majors plus forex and equities."
        ),
        derivatives_sub_sector="Perp DEX",
        derivatives_secondary_tags=[],
        chains=["Arbitrum", "Polygon", "Base"],
        pricing_model="oracle",
        official_docs="https://docs.gains.trade",
        website="https://gains.trade",
        twitter="https://x.com/GainsNetwork_io",
        member_coins=[
            _coin("gns", "Gains Network", "GNS", "Governance token (gGNS vault collateral)"),
        ],
    ),
    # ---------------------------- OPTION VAULTS -----------------------------
    "ribbon-finance": _net(
        components=[
            {
                'name': 'Theta Vaults',
                'description': "Ribbon's flagship DeFi Option Vaults (DOVs). Automated, one-click strategies that run weekly covered-call (on ETH/WBTC) or cash-secured put-selling strategies, writing out-of-the-money options and collecting premiums as yield. Early versions minted Opyn oTokens; later versions auctioned options via Gnosis Auction.",
            },
            {
                'name': 'Ribbon V2',
                'description': 'Second-generation vault architecture that improved capital efficiency and moved option sales to a competitive auction (Gnosis Auction / market-maker bidding) rather than relying solely on Opyn oToken sales.',
            },
            {
                'name': 'Ribbon Earn',
                'description': 'A principal-protected structured product that keeps most capital in a lending/yield base and deploys a small allocation to weekly options exposure, aiming to preserve principal while capturing upside.',
            },
            {
                'name': 'RBN token / veRBN (Ribbonomics)',
                'description': 'RBN is the governance token (1B max supply). Holders could lock RBN into veRBN to direct gauge emissions and vote on governance. RBN was later wound down and converted 1:1 into AEVO.',
            },
            {
                'name': 'Aevo (successor)',
                'description': "The order-book derivatives exchange that Ribbon merged into. Aevo runs on the Aevo Chain (an OP Stack optimistic rollup) and absorbed Ribbon's structured products and brand.",
            },
        ],
        faq=[
            {
                'question': 'What is a DeFi Option Vault (DOV) and how did Ribbon pioneer it?',
                'answer': 'A DOV is a smart-contract vault that pools user deposits and automatically runs an options strategy (typically selling weekly out-of-the-money covered calls or cash-secured puts) to generate yield from collected premiums. Ribbon Finance launched the first Theta Vaults, popularizing the DOV category across DeFi.',
                'pinned': True,
            },
            {
                'question': 'Does Ribbon Finance still exist as a separate protocol?',
                'answer': 'No. Ribbon is legacy. Its DAO approved proposal RGP-33 to merge into Aevo, wind down the RBN token, and adopt the Aevo brand. RBN holders can convert to AEVO at a 1:1 ratio, and RBN emissions were set to zero.',
                'pinned': True,
            },
            {
                'question': 'How does a Theta Vault covered-call strategy earn yield?',
                'answer': 'The vault sells out-of-the-money call options against deposited collateral (e.g., ETH) each week and collects the option premium as yield. If the option expires out of the money, depositors keep the premium; the tradeoff is capping upside if price rises past the strike.',
                'pinned': False,
            },
            {
                'question': 'What was the October 2021 Ribbon airdrop exploit?',
                'answer': "A researcher at Divergence Ventures (a Ribbon investor) ran a Sybil attack using dozens of wallets to over-claim the RBN retroactive airdrop, netting roughly $2.5M in RBN. After on-chain sleuthing exposed it, the firm apologized and returned 705 ETH to Ribbon's treasury.",
                'pinned': False,
            },
            {
                'question': 'Who founded Ribbon Finance?',
                'answer': 'Ribbon Finance was founded by Julian Koh (co-founder/CEO), with Ken Chan as co-founder. Koh previously worked at Coinbase.',
                'pinned': False,
            },
            {
                'question': 'What happens to RBN tokens now?',
                'answer': 'RBN is being wound down. Holders can convert RBN to the new AEVO token on a 1:1 basis with no deadline; veRBN lockers were allowed to unlock 100% without penalty.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Julian Koh',
                'role': 'Co-founder & CEO',
                'description': 'Founder of Ribbon Finance (later Aevo). Ex-Coinbase engineer; led the creation of Theta Vaults and the pivot into the Aevo order-book derivatives exchange.',
            },
            {
                'name': 'Ken Chan',
                'role': 'Co-founder',
                'description': "Co-founder of Ribbon Finance, credited alongside Julian Koh in the protocol's founding and product development.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Options income / covered-call fund (e.g., a buy-write income fund)',
                'similarity': 'Both systematically sell (write) call options against a held asset and distribute the collected premium as recurring yield to investors.',
                'differences': 'Ribbon runs fully on-chain via non-custodial smart contracts with weekly, transparent, permissionless deposits and auctions, versus a manager-run regulated fund with custody, gatekeeping, and periodic NAV reporting.',
            },
            {
                'product': 'Structured note (yield-enhancement / reverse convertible)',
                'similarity': 'Both package derivatives exposure into a single product that pays an enhanced yield in exchange for capping upside or accepting downside contingency.',
                'differences': 'A structured note is issued by a bank with counterparty/credit risk and fixed terms; Ribbon vaults are composable smart contracts with smart-contract and market risk, weekly rollover, and no issuer credit backstop.',
            },
        ],
        events=[
            {
                'date': '2021-04-12',
                'title': 'Theta Vaults go live',
                'description': 'Ribbon launched its first Theta Vault, an automated one-click ETH covered-call strategy selling weekly out-of-the-money calls (initially via Opyn oTokens) and distributing premiums as yield.',
                'link': 'https://ribbonfinance.medium.com/theta-vaults-are-now-live-af3d2e4907d6',
            },
            {
                'date': '2021-05-25',
                'title': 'RBN token launch & retroactive airdrop',
                'description': 'Following the TGE, 3% of RBN supply (30M tokens) was retroactively airdropped to past Ribbon users, active Discord members, and users of other Ethereum options protocols (Hegic, Opyn, Charm, Primitive).',
                'link': 'https://www.research.ribbon.finance/blog/rbn-airdrop-distribution',
            },
            {
                'date': '2021-10-08',
                'title': 'Airdrop Sybil exploit (~$2.5M)',
                'description': "A Divergence Ventures researcher used a Sybil attack (dozens of wallets) to over-claim the RBN airdrop, extracting ~$2.5M in RBN. After on-chain exposure, the firm apologized and returned 705 ETH to Ribbon's treasury.",
                'link': 'https://www.coindesk.com/tech/2021/10/08/airdrop-ethics-vc-firm-draws-ire-following-25m-ribbon-finance-exploit',
            },
            {
                'date': '2022-03-22',
                'title': '$8.75M Series B led by Paradigm',
                'description': 'Ribbon closed an $8.75M Series B round led by Paradigm to build new DeFi risk products and scale across chains.',
                'link': 'https://www.coindesk.com/business/2022/03/22/paradigm-invests-875m-in-defis-ribbon-finance',
            },
            {
                'date': '2023-07-25',
                'title': 'RGP-33 approved: merge Ribbon into Aevo',
                'description': 'Ribbon DAO governance approved RGP-33 near-unanimously (133 RBN holders), authorizing the merge into Aevo, the wind-down of RBN, and a 1:1 RBN-to-AEVO conversion.',
                'link': 'https://gov.ribbon.finance/t/rgp-33-merge-ribbon-finance-into-aevo/709',
            },
        ],
        timeline=[
            {
                'date': '2021-04-12',
                'title': 'Theta Vault v1',
                'description': 'First-generation DeFi Option Vault built on Opyn oTokens, running weekly covered calls.',
                'link': 'https://ribbonfinance.medium.com/theta-vaults-are-now-live-af3d2e4907d6',
                'status': 'executed',
            },
            {
                'date': '2021-09-09',
                'title': 'Ribbon V2 architecture & audit',
                'description': 'Second-generation vaults improved capital efficiency and moved option sales to competitive auctions; OpenZeppelin audited the Theta/Delta Vault contracts.',
                'link': 'https://www.openzeppelin.com/news/ribbon-finance-audit',
                'status': 'executed',
            },
            {
                'date': '2023-07-25',
                'title': 'Merge into Aevo (RGP-33)',
                'description': "Governance approved folding Ribbon's products and brand into Aevo, converting RBN to AEVO 1:1 and moving to an order-book exchange on the OP Stack Aevo Chain.",
                'link': 'https://gov.ribbon.finance/t/rgp-33-merge-ribbon-finance-into-aevo/709',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Retroactive airdrop size',
                'value': '30,000,000 RBN (3% of total supply) airdropped on 2021-05-25 to past users, Discord members, and users of Hegic/Opyn/Charm/Primitive',
                'freshness': 'static',
                'source': {
                    'label': 'Ribbon Research — RBN Airdrop Distribution',
                    'url': 'https://www.research.ribbon.finance/blog/rbn-airdrop-distribution',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Series B raise',
                'value': '$8.75M Series B led by Paradigm, closed 2022-03-22',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk — Paradigm Invests $8.75M in Ribbon Finance',
                    'url': 'https://www.coindesk.com/business/2022/03/22/paradigm-invests-875m-in-defis-ribbon-finance',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'RBN to AEVO conversion',
                'value': '1:1 RBN-to-AEVO conversion authorized by RGP-33 (near-unanimous, 133 holders), vote concluded 2023-07-25',
                'freshness': 'static',
                'source': {
                    'label': 'Ribbon Governance — RGP-33: Merge Ribbon Finance into Aevo',
                    'url': 'https://gov.ribbon.finance/t/rgp-33-merge-ribbon-finance-into-aevo/709',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Vault strategies depend on complex smart contracts (vault logic, Opyn oToken minting, auction settlement). Bugs or upgrade flaws could freeze or lose funds; OpenZeppelin's V2 audit flagged a critical instant-withdrawal issue among others.",
            },
            {
                'category': 'Systemic',
                'description': 'Covered-call vaults cap upside and remain exposed to sharp downside moves in the underlying (ETH/WBTC). In a rapid market move, deposited collateral can lose value faster than premiums compensate, and options can be assigned against depositors.',
            },
            {
                'category': 'Counterparty',
                'description': 'Options are sold to external market makers via auction. Reliance on a limited set of institutional counterparties for bidding and settlement concentrates dependence and can degrade pricing or liquidity in stressed conditions.',
            },
            {
                'category': 'Governance',
                'description': 'Concentrated token-holder governance was demonstrated by RGP-33 passing with only 133 RBN holders voting, enabling a full protocol wind-down and token conversion — a small quorum controlling material outcomes for all holders.',
            },
            {
                'category': 'Oracle',
                'description': 'Strike selection, settlement pricing, and option valuation rely on external price feeds; manipulated or delayed oracle data could produce mispriced strikes or incorrect settlement.',
            },
        ],
        competitors=[
            {
                'name': 'Dopex',
                'slug': 'dopex',
                'rank': 1,
                'positioning': "On-chain options and option-vault protocol offering Single Staking Option Vaults (SSOVs), a direct DOV competitor to Ribbon's Theta Vaults.",
                'similarities': 'Both offer automated option-selling vaults that let depositors earn premium yield without manually managing options positions.',
                'differences': 'Dopex focuses on SSOVs and a broader options AMM/rebate model with its own token economics, whereas Ribbon centered on covered-call/put Theta Vaults before merging into the Aevo order-book exchange.',
            },
            {
                'name': 'Ribbon-successor Aevo / Derive (Lyra)',
                'slug': 'derive',
                'rank': 2,
                'positioning': 'On-chain options exchange (formerly Lyra, rebranded Derive) providing an AMM-based options market as an alternative venue for options yield and hedging.',
                'similarities': 'Both target on-chain options exposure and structured yield; each provides infrastructure retail users can access without off-chain brokers.',
                'differences': 'Derive/Lyra is an options AMM/order venue for active traders, while Ribbon packaged passive one-click DOV yield strategies on top of such venues.',
            },
            {
                'name': 'Friktion',
                'slug': None,
                'rank': 3,
                'positioning': "Solana-based DeFi Option Vault provider that offered covered-call and put-selling 'Volts' comparable to Ribbon's Theta Vaults (since wound down).",
                'similarities': 'Directly competing DOV product: automated weekly option-selling vaults for premium yield.',
                'differences': 'Built on Solana rather than Ethereum; Friktion shut down, whereas Ribbon transitioned into Aevo.',
            },
            {
                'name': 'Thetanuts Finance',
                'slug': None,
                'rank': 4,
                'positioning': 'Multi-chain DeFi Option Vault protocol offering covered calls and cash-secured puts across several EVM chains.',
                'similarities': 'Same core DOV model of automated option-selling vaults distributing premiums.',
                'differences': 'Emphasizes multi-chain deployment and basket/index vaults; smaller and later than Ribbon.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-01-01',
                'round': 'Seed',
                'amountUsd': 1850000,
                'amountLabel': '$1.85M',
                'investors': [
                    'Dragonfly Capital',
                    'Coinbase Ventures',
                    'Nascent',
                    'Scalar Capital',
                ],
                'link': 'https://tracxn.com/d/companies/ribbon/__yEknbGTDiAC_tTxHwaKoGSurjDGFfyjqoFtEm-D8ack',
            },
            {
                'date': '2022-03-22',
                'round': 'Series B',
                'amountUsd': 8750000,
                'amountLabel': '$8.75M',
                'investors': [
                    'Paradigm',
                ],
                'link': 'https://www.coindesk.com/business/2022/03/22/paradigm-invests-875m-in-defis-ribbon-finance',
            },
        ],
        audits=[
            {
                'firm': 'ChainSafe',
                'date': '2021-04-01',
                'url': 'https://github.com/ChainSafe/audits/blob/main/Ribbon%20Finance/Ribbon-Audit_April-2021.pdf',
            },
            {
                'firm': 'OpenZeppelin',
                'date': '2021-09-09',
                'url': 'https://www.openzeppelin.com/news/ribbon-finance-audit',
            },
            {
                'firm': 'PeckShield',
                'date': '2021-04-01',
                'url': 'https://github.com/ribbon-finance/audit/blob/master/reports/PeckShield-Audit-Report-Ribbon-v1.0.pdf',
            },
            {
                'firm': 'Quantstamp',
                'date': '2021-09-01',
                'url': 'https://github.com/ribbon-finance/audit/blob/master/reports/Quantstamp%20Theta%20Vault.pdf',
            },
        ],
        sources=[
            {
                'label': 'Ribbon Finance — Theta Vaults Are Now Live',
                'url': 'https://ribbonfinance.medium.com/theta-vaults-are-now-live-af3d2e4907d6',
            },
            {
                'label': 'Ribbon Research — RBN Airdrop Distribution',
                'url': 'https://www.research.ribbon.finance/blog/rbn-airdrop-distribution',
            },
            {
                'label': 'CoinDesk — VC Firm Draws Ire Following $2.5M Ribbon Exploit',
                'url': 'https://www.coindesk.com/tech/2021/10/08/airdrop-ethics-vc-firm-draws-ire-following-25m-ribbon-finance-exploit',
            },
            {
                'label': 'CoinDesk — Paradigm Invests $8.75M in Ribbon Finance',
                'url': 'https://www.coindesk.com/business/2022/03/22/paradigm-invests-875m-in-defis-ribbon-finance',
            },
            {
                'label': 'Ribbon Governance — RGP-33: Merge Ribbon Finance into Aevo',
                'url': 'https://gov.ribbon.finance/t/rgp-33-merge-ribbon-finance-into-aevo/709',
            },
            {
                'label': 'OpenZeppelin — Ribbon Finance Audit',
                'url': 'https://www.openzeppelin.com/news/ribbon-finance-audit',
            },
            {
                'label': 'Ribbon Finance Docs — Security (audit list)',
                'url': 'https://docs.ribbon.finance/security',
            },
        ],
        name="Ribbon Finance",
        symbol="RBN",
        tagline="The pioneer of DeFi Option Vaults (DOVs).",
        description=(
            "Ribbon Finance pioneered automated DeFi Option Vaults (DOVs) that run "
            "covered-call and put-selling strategies to generate yield. Ribbon has "
            "since merged into Aevo; RBN persists as a legacy / transitioning token."
        ),
        differentiator=(
            "First to productize automated, recurring options strategies as "
            "deposit-and-forget vaults — the template most later DOVs followed."
        ),
        derivatives_sub_sector="Option Vaults",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Ethereum"],
        official_docs="https://docs.ribbon.finance",
        website="https://www.ribbon.finance",
        twitter="https://x.com/ribbonfinance",
        github="https://github.com/ribbon-finance",
        member_coins=[
            _coin("rbn", "Ribbon Finance", "RBN", "Governance token (merged into Aevo)"),
        ],
    ),
    "dopex": _net(
        components=[
            {
                'name': 'Single Staking Option Vaults (SSOV)',
                'description': "Dopex's flagship product. Depositors lock a single asset into a vault and effectively sell covered call (SSOV) or cash-secured put (SSOV-P) options at a set of fixed strikes chosen for a monthly or weekly epoch. Deposits are also staked to farm rewards, so writers earn option premiums plus yield without needing to manage option Greeks. SSOVs concentrate option liquidity at chosen strikes, giving buyers on-chain options across assets such as ETH, BTC, DPX, rDPX, gOHM and GMX.",
            },
            {
                'name': 'DPX (governance token)',
                'description': 'Finite-supply governance and value-accrual token capped at 500,000. DPX holders vote on protocol proposals (including rebate percentages) and the token accrues fees/income from pools, vaults and custodial accounts. Migrated to SYK at 1 DPX = 100 SYK in the 2024 Stryke rebrand.',
            },
            {
                'name': 'rDPX (rebate token)',
                'description': 'The Dopex Rebate Token, designed to compensate option writers for losses. Each epoch a percentage of rDPX relative to the value of writer losses is minted and distributed to option-pool participants; the rebate percentage is set by DPX governance. rDPX V2 later added a bonding/synthetic-asset (dpxETH/rtETH) design. Migrated to SYK at 1 rDPX = 13.333 SYK in the rebrand.',
            },
            {
                'name': 'Atlantic Options',
                'description': 'Capital-efficient options whose collateral can be borrowed against while the option is live. Atlantic puts can be used as collateral by other protocols/strategies (e.g., alongside GMX) to build leveraged positions with a defined maximum loss. Atlantic Straddles were also deployed.',
            },
            {
                'name': 'CLAMM (Concentrated Liquidity Automated Market Maker options)',
                'description': "Dopex/Stryke's LPDfi product that lets concentrated-liquidity LP positions (Uniswap-v3-style) be lent out and exercised as American-style on-chain options, letting traders buy calls/puts against real DEX liquidity. CLAMM became the core product carried into the Stryke rebrand and is integrated with DEXs including PancakeSwap.",
            },
        ],
        faq=[
            {
                'question': 'What is Dopex?',
                'answer': 'Dopex is an Arbitrum-native decentralized options protocol. Its core innovation, Single Staking Option Vaults (SSOVs), lets liquidity providers passively sell options (covered calls or cash-secured puts) at chosen strikes for fixed monthly/weekly expiries, concentrating option liquidity so buyers can trade on-chain options while writers earn premiums and staking yield.',
                'pinned': True,
            },
            {
                'question': 'What is the difference between DPX and rDPX?',
                'answer': "DPX is the finite-supply (500,000 cap) governance and fee-accrual token. rDPX is the rebate token minted to compensate option writers for a portion of their losses each epoch, with the rebate rate set by DPX governance. Together they formed Dopex's dual-token model.",
                'pinned': False,
            },
            {
                'question': 'Did Dopex rebrand?',
                'answer': 'Yes. In 2024 Dopex rebranded to Stryke and collapsed its dual-token model into a single token, SYK. Holders migrated at 1 DPX = 100 SYK and 1 rDPX = 13.333 SYK. The rebrand centered the protocol on its CLAMM options product and sunset legacy products (monthly/weekly SSOVs, rDPX V2 bonding, the Perp Put Vault).',
                'pinned': False,
            },
            {
                'question': 'What is an SSOV?',
                'answer': 'A Single Staking Option Vault. Users deposit one asset, the vault sells that deposit as call (or put) options at fixed strikes chosen for the epoch, and simultaneously stakes it to farm rewards. Writers passively earn option premiums plus yield with a capped, defined risk profile.',
                'pinned': False,
            },
            {
                'question': 'What are Atlantic Options?',
                'answer': "Atlantic Options are a Dopex design in which the option's underlying collateral can be borrowed against while the option is still active. This enables capital-efficient, defined-maximum-loss leveraged strategies, for example using Atlantic puts as collateral in trades alongside GMX.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Team Dopex (pseudonymous)',
                'role': 'Founding/core team',
                'description': "Dopex was built and run by a largely anonymous/pseudonymous team publishing under 'Team Dopex'. Public founder identities were not disclosed; the project and early seed backers were described as anonymous DeFi participants.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Listed equity options exchange (e.g., CBOE / options market maker)',
                'similarity': 'Both let participants buy and sell standardized call/put options at defined strikes and expiries, with writers collecting premium and buyers gaining leveraged directional/hedging exposure.',
                'differences': 'Dopex is fully on-chain, permissionless and non-custodial with automated vault-based writing (no KYC or clearinghouse). Liquidity is pooled at pre-set strikes via SSOVs rather than a continuous order book, and settlement/collateralization is enforced by smart contracts rather than a central counterparty.',
            },
            {
                'product': 'Covered-call income funds / buy-write ETFs (e.g., a covered-call strategy fund)',
                'similarity': 'SSOV depositors run essentially the same payoff as a systematic covered-call/buy-write strategy: hold an asset, sell calls against it, and earn premium income.',
                'differences': 'The Dopex vault automates strike selection per epoch and pays premiums plus on-chain staking rewards, with rebate-token compensation for writer losses; a TradFi buy-write fund has a manager, custody, fees and no token-based loss rebate.',
            },
        ],
        events=[
            {
                'date': '2021-09-07',
                'title': 'Single Staking Option Vaults (SSOV) introduced',
                'description': 'Team Dopex published the SSOV concept: deposit a single asset, sell it as covered calls at fixed strikes for end-of-month expiries while staking for farm rewards.',
                'link': 'https://teamdopex.medium.com/introducing-single-staking-option-vaults-ssov-b90bbb0a9ae5',
            },
            {
                'date': '2024-02-23',
                'title': 'Stryke rebrand and SYK token announced',
                'description': 'Dopex announced its rebrand to Stryke, replacing the DPX/rDPX dual-token model with a single token, SYK, and refocusing on the CLAMM options product.',
                'link': 'https://blog.stryke.xyz/articles/introducing-stryke-the-future-of-crypto-options',
            },
            {
                'date': '2024-02-29',
                'title': 'Legacy products and rDPX V2 bonding deprecated',
                'description': 'Monthly/weekly SSOVs, rDPX V2 bonding, the Perp Put Vault and rtETH-LP rewards were sunset ahead of the token migration; users were told to redeem/withdraw rtETH and related positions.',
                'link': 'https://blog.stryke.xyz/articles/introducing-stryke-the-future-of-crypto-options',
            },
        ],
        timeline=[
            {
                'date': '2021-06-25',
                'title': 'DPX token generation event',
                'description': 'Dopex conducted its token sale/IDO in June 2021, generating the DPX governance token (500,000 max supply).',
                'link': 'https://icodrops.com/dopex/',
                'status': 'executed',
            },
            {
                'date': '2021-09-07',
                'title': 'SSOV launch',
                'description': "Single Staking Option Vaults introduced as Dopex's core option-writing primitive on Arbitrum.",
                'link': 'https://teamdopex.medium.com/introducing-single-staking-option-vaults-ssov-b90bbb0a9ae5',
                'status': 'executed',
            },
            {
                'date': '2023-08-21',
                'title': 'rDPX V2 Code4rena audit contest',
                'description': 'Community audit contest reviewing the rDPX V2 smart contract system (9 contracts, ~2,264 lines of Solidity).',
                'link': 'https://code4rena.com/reports/2023-08-dopex',
                'status': 'executed',
            },
            {
                'date': '2024-02-23',
                'title': 'Rebrand to Stryke; migration to single SYK token',
                'description': 'Dual-token model retired in favor of SYK; conversion at 1 DPX = 100 SYK and 1 rDPX = 13.333 SYK; protocol refocused on CLAMM/LPDfi options.',
                'link': 'https://blog.stryke.xyz/articles/introducing-stryke-the-future-of-crypto-options',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'DPX max supply',
                'value': '500,000 DPX (finite governance-token cap)',
                'freshness': 'static',
                'source': {
                    'label': 'Gate Learn - What is Dopex ($DPX)?',
                    'url': 'https://www.gate.com/learn/articles/what-is-dopex/524',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'SYK migration conversion rates',
                'value': '1 DPX = 100 SYK; 1 rDPX = 13.333 SYK; SYK total supply 100,000,000',
                'freshness': 'static',
                'source': {
                    'label': 'Stryke blog - Introducing Stryke',
                    'url': 'https://blog.stryke.xyz/articles/introducing-stryke-the-future-of-crypto-options',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Dopex/Stryke is a complex options and LPDfi (CLAMM) system with many interacting contracts (SSOVs, rDPX V2 bonding, CLAMM). Bugs in option settlement, collateral accounting or the CLAMM lending logic could cause loss of writer/LP funds; the codebase required multiple audits and a public Code4rena contest on rDPX V2.',
            },
            {
                'category': 'Governance',
                'description': 'Key economic parameters (notably the rDPX rebate percentage) were set by DPX-holder governance, and the 2024 decision to sunset products and force-migrate DPX/rDPX into SYK shows governance/team decisions can materially and unilaterally change token value and product availability for holders.',
            },
            {
                'category': 'Oracle',
                'description': 'Option pricing, strike settlement and CLAMM exercise depend on external price feeds. Inaccurate, stale or manipulated oracle prices could misprice premiums or trigger mispriced exercises, transferring value between writers and buyers.',
            },
            {
                'category': 'Counterparty',
                'description': 'SSOV writers are the counterparty to option buyers with a capped-but-real payoff obligation; the rDPX rebate only offsets a portion of writer losses. In sharp moves, writers can realize losses that the rebate mechanism does not fully cover, and the rebate token itself must retain value for the mechanism to compensate.',
            },
            {
                'category': 'Systemic',
                'description': 'The protocol is Arbitrum-native and deeply integrated with the broader DeFi/DEX stack (Curve for rtETH liquidity, GMX for Atlantic strategies, Uniswap-v3-style liquidity for CLAMM). Stress or failure in those dependencies, or the winding-down/rebrand of Dopex itself, can impair liquidity and product continuity.',
            },
        ],
        competitors=[
            {
                'name': 'Ribbon Finance',
                'slug': 'ribbon-finance',
                'rank': 1,
                'positioning': "Leading DeFi options-vault protocol (Theta Vaults) offering automated option-writing strategies, the closest analog to Dopex's SSOV model.",
                'similarities': 'Both automate covered-call / cash-secured-put writing via vaults so LPs earn option premium passively; both target on-chain structured options yield.',
                'differences': 'Ribbon (later Aevo) auctioned option flow to market makers off-chain and pivoted to a perps/options exchange; Dopex kept option liquidity fully on-chain at fixed strikes via SSOVs and added rebate tokenomics and CLAMM/LPDfi.',
            },
            {
                'name': 'Aevo',
                'slug': 'aevo',
                'rank': 2,
                'positioning': 'Off-chain-orderbook options and perpetuals exchange (evolution of Ribbon) competing for on-chain options traders.',
                'similarities': 'Both provide on-chain-settled options exposure to DeFi users and originated from the DeFi options-vault era.',
                'differences': 'Aevo runs a central-limit-orderbook (roll-up) exchange with market makers; Dopex uses pooled vault liquidity concentrated at strikes rather than an order book.',
            },
            {
                'name': 'Premia Finance',
                'slug': None,
                'rank': 3,
                'positioning': 'Peer-to-pool on-chain options AMM/marketplace, a direct decentralized-options competitor on Arbitrum and other chains.',
                'similarities': 'Both offer permissionless on-chain American/European options with pooled liquidity acting as writers.',
                'differences': 'Premia uses a continuous options AMM/marketplace with pool-set pricing; Dopex uses discrete fixed-strike epoch vaults (SSOVs) and later CLAMM against DEX liquidity.',
            },
            {
                'name': 'Lyra / Derive',
                'slug': 'derive',
                'rank': 4,
                'positioning': 'AMM-based on-chain options protocol (rebranded to Derive) with dynamic pricing and hedging.',
                'similarities': 'Both are decentralized options venues letting LPs act as the option-writing counterparty and traders buy calls/puts on-chain.',
                'differences': 'Lyra/Derive uses a live options AMM with delta-hedging and market-maker vaults; Dopex concentrates liquidity at pre-set strikes per epoch and emphasizes covered-call yield and rebate tokenomics.',
            },
        ],
        audits=[
            {
                'firm': 'SourceHat (formerly Solidity Finance)',
                'date': '2021-04-11',
                'url': 'https://sourcehat.com/audits/Dopex/',
            },
            {
                'firm': 'SourceHat (formerly Solidity Finance)',
                'date': '2022-02-17',
                'url': 'https://sourcehat.com/audits/DopexSSOV/',
            },
            {
                'firm': 'Code4rena',
                'date': '2023-08-21',
                'url': 'https://code4rena.com/reports/2023-08-dopex',
            },
        ],
        sources=[
            {
                'label': 'Team Dopex - Introducing Single Staking Option Vaults (SSOV)',
                'url': 'https://teamdopex.medium.com/introducing-single-staking-option-vaults-ssov-b90bbb0a9ae5',
            },
            {
                'label': 'Stryke blog - Introducing Stryke: The Future of Crypto Options (rebrand, SYK, conversion rates)',
                'url': 'https://blog.stryke.xyz/articles/introducing-stryke-the-future-of-crypto-options',
            },
            {
                'label': 'Gate Learn - What is Dopex ($DPX)? (DPX/rDPX dual-token model, rebate, Atlantic Options)',
                'url': 'https://www.gate.com/learn/articles/what-is-dopex/524',
            },
            {
                'label': 'Code4rena - Dopex (rDPX V2) audit findings report',
                'url': 'https://code4rena.com/reports/2023-08-dopex',
            },
            {
                'label': 'SourceHat - Dopex smart contract audit (2021)',
                'url': 'https://sourcehat.com/audits/Dopex/',
            },
            {
                'label': 'SourceHat - Dopex SSOV audit (2022)',
                'url': 'https://sourcehat.com/audits/DopexSSOV/',
            },
            {
                'label': 'ICO Drops - Dopex (DPX) token sale',
                'url': 'https://icodrops.com/dopex/',
            },
        ],
        github='https://github.com/stryke-xyz',
        name="Dopex",
        symbol="DPX",
        tagline="Decentralized options exchange with single-staking vaults.",
        description=(
            "Dopex is an Arbitrum-native decentralized options protocol whose "
            "Single Staking Option Vaults (SSOVs) let users write and buy options "
            "with pooled liquidity, automating options yield strategies."
        ),
        differentiator=(
            "SSOV design concentrates option liquidity at chosen strikes, with "
            "rebate mechanics to offset writer losses."
        ),
        derivatives_sub_sector="Option Vaults",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Arbitrum One"],
        official_docs="https://docs.dopex.io",
        website="https://www.dopex.io",
        twitter="https://x.com/dopex_io",
        # DPX has no clean CoinGecko markets entry — TVL via DeFi Llama (path c),
        # so no token member coin is linked.
        scale_labels={"tvl": "Protocol TVL"},
    ),
    "derive": _net(
        components=[
            {
                'name': 'Derive Protocol',
                'description': 'The trustless on-chain settlement layer for options, perpetual futures and spot; enforces margin, collateral and settlement rules on-chain. Evolved from the original Lyra options AMM.',
            },
            {
                'name': 'Derive Chain',
                'description': "A dedicated OP-Stack layer-2 rollup that settles to Ethereum mainnet and acts as V2's execution environment for margin, liquidations and settlement of options and perpetuals.",
            },
            {
                'name': 'Derive Matcher (CLOB)',
                'description': 'Off-chain order-matching service exposing REST and WebSocket APIs that provides a gasless central-limit-order-book experience with on-chain settlement, replacing the pure AMM model of V1.',
            },
            {
                'name': 'Cross-Margin Risk Engine',
                'description': 'Portfolio-margin engine that supports cross-margining between options and perpetuals plus multi-asset collateral (e.g. using stETH to sell ETH covered calls at leverage).',
            },
            {
                'name': 'Options AMM (V1 legacy) & Option Vaults',
                'description': 'The original automated options market maker and automated market-maker vaults (MMVs) where LPs underwrite options exposure; a founding primitive that later expanded into structured Option Vault products.',
            },
            {
                'name': 'DRV Token',
                'description': 'Utility and governance token of the Derive Derivatives Network; staked as non-transferable stDRV for governance and rewards, with a buyback program funded by protocol revenue.',
            },
        ],
        faq=[
            {
                'question': 'Is Derive the same protocol as Lyra Finance?',
                'answer': 'Yes. Derive is the rebrand of Lyra Finance, completed in 2024 as the project expanded from options-only into a broader derivatives suite (options, perpetuals and spot). The LYRA token migrated 1:1 to DRV.',
                'pinned': True,
            },
            {
                'question': 'How did the LYRA to DRV token migration work?',
                'answer': 'A snapshot of all LYRA and staked LYRA (stkLYRA) balances across Ethereum, Optimism and Arbitrum was taken on 8 May 2024 at 00:00 UTC. Snapshotted balances convert 1:1 to DRV, and the DRV token became claimable from 15 January 2025.',
                'pinned': False,
            },
            {
                'question': 'What is Derive Chain?',
                'answer': "Derive Chain is the project's own layer-2 rollup built on the OP Stack that settles to Ethereum. It serves as the execution engine for margin, liquidations and settlement of both options and perpetuals in the V2 architecture.",
                'pinned': False,
            },
            {
                'question': 'How does Derive V2 differ from the original Lyra AMM?',
                'answer': 'V1 pioneered an on-chain options AMM. V2 shifts to a gasless central-limit-order-book (the Derive Matcher) with on-chain settlement and a cross-margin risk engine supporting portfolio margin across options and perps.',
                'pinned': False,
            },
            {
                'question': 'What does the DRV token do?',
                'answer': 'DRV can be staked as non-transferable stDRV to participate in on-chain governance and earn staking rewards. 35% of protocol revenue funds weekly DRV buybacks.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Nick Forster',
                'role': 'Co-founder',
                'description': 'Co-founder of Lyra Finance / Derive, an on-chain options and derivatives protocol originally launched on Optimism.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Listed equity/index options exchange (e.g. CBOE)',
                'similarity': 'Both offer standardized options with defined strikes and expiries, portfolio margin and central price discovery for buyers and sellers.',
                'differences': 'Derive settles trustlessly on its own OP-Stack rollup with 24/7 crypto-underlier markets and permissionless access, versus centralized clearing, regulated intermediaries and market hours in TradFi.',
            },
            {
                'product': 'Derivatives clearing house / prime broker cross-margin',
                'similarity': "Derive's risk engine offers cross-margining and multi-asset collateral akin to a prime broker netting positions across products.",
                'differences': 'Margin, liquidations and collateral rules are enforced on-chain by smart contracts rather than by a central clearing member, and there is no credit intermediation.',
            },
        ],
        events=[
            {
                'date': '2021-07-26',
                'title': 'Lyra raises $3.3M seed round',
                'description': 'Lyra announced a $3.3M seed round co-led by Framework Ventures and ParaFi Capital, with DeFi Alliance, Orthogonal, Robot Ventures, Apollo Capital and angels from Aave, 1inch and Synthetix participating.',
                'link': 'https://www.coindesk.com/business/2021/07/26/some-of-defis-leading-investors-are-backing-a-new-options-protocol',
            },
            {
                'date': '2021-08-25',
                'title': 'Lyra live on Optimism mainnet',
                'description': "Lyra's options AMM went live on the Optimistic Ethereum (OP) mainnet, making it one of the earliest protocols deployed on Optimism.",
                'link': 'https://insights.derive.xyz/lyra-mainnet-launch/',
            },
            {
                'date': '2022-06-28',
                'title': 'Avalon upgrade live on Optimism',
                'description': "Lyra V1's Avalon upgrade went live, adding anytime LP entry/exit (7-day delay), expiries out to 3 months, universal position closing and partial collateralization letting traders sell 4-5x more options per unit of capital.",
                'link': 'https://insights.derive.xyz/avalon-is-live/',
            },
            {
                'date': '2024-03-08',
                'title': 'Announcing Lyra V2 / Derive Chain',
                'description': 'Lyra announced its V2 architecture built on the OP Stack (Derive Chain), introducing the Derive Matcher order-matching layer and a cross-margin risk engine for options, perpetuals and spot.',
                'link': 'https://insights.derive.xyz/announcing-lyra-v2/',
            },
            {
                'date': '2024-05-08',
                'title': 'LYRA to DRV migration snapshot',
                'description': 'A snapshot of all LYRA and stkLYRA balances across Ethereum, Optimism and Arbitrum was taken at 00:00 UTC, with balances set to convert 1:1 to the new DRV token as part of the Lyra-to-Derive rebrand.',
                'link': 'https://help.derive.xyz/en/articles/9219427-lyra-to-drv-migration',
            },
            {
                'date': '2025-01-15',
                'title': 'DRV token launch and claim',
                'description': 'The DRV token became live and claimable for all holders from 00:00 UTC on 15 January 2025, alongside a 7.71% airdrop to protocol users and partners.',
                'link': 'https://insights.derive.xyz/drv/',
            },
        ],
        timeline=[
            {
                'date': '2021-08-25',
                'title': 'Lyra V1 options AMM on Optimism',
                'description': 'Initial mainnet launch of the Lyra options AMM on Optimism.',
                'link': 'https://insights.derive.xyz/lyra-mainnet-launch/',
                'status': 'executed',
            },
            {
                'date': '2022-06-28',
                'title': 'Avalon upgrade',
                'description': 'Partial collateralization, anytime LP entry/exit and longer expiries.',
                'link': 'https://insights.derive.xyz/avalon-is-live/',
                'status': 'executed',
            },
            {
                'date': '2023-01-31',
                'title': 'Newport upgrade & multi-chain (Arbitrum)',
                'description': 'Newport removed the need for the AMM to swap to spot, collateralizing with cash and hedging with perpetuals, and Lyra deployed Newport on Arbitrum going multi-chain.',
                'link': 'https://insights.derive.xyz/newport-upgrade/',
                'status': 'executed',
            },
            {
                'date': '2024-03-08',
                'title': 'Lyra V2 / Derive Chain announced',
                'description': 'OP-Stack Derive Chain, CLOB Matcher and cross-margin risk engine proposed for V2.',
                'link': 'https://insights.derive.xyz/announcing-lyra-v2/',
                'status': 'executed',
            },
            {
                'date': '2025-01-15',
                'title': 'DRV token generation and migration complete',
                'description': 'DRV launched with 1:1 migration from LYRA plus airdrop and staking/buyback tokenomics.',
                'link': 'https://insights.derive.xyz/drv/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Seed round size',
                'value': '$3.3M co-led by Framework Ventures and ParaFi Capital (July 2021)',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk',
                    'url': 'https://www.coindesk.com/business/2021/07/26/some-of-defis-leading-investors-are-backing-a-new-options-protocol',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'DRV total supply',
                'value': '1,500,000,000 DRV (Ethereum mainnet + Derive L2)',
                'freshness': 'static',
                'source': {
                    'label': 'Derive Docs — Token',
                    'url': 'https://docs.derive.xyz/docs/token',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Buyback share of protocol revenue',
                'value': '35% of protocol revenue funds weekly DRV buybacks',
                'freshness': 'dynamic',
                'source': {
                    'label': 'Derive Docs — Token',
                    'url': 'https://docs.derive.xyz/docs/token',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'The protocol relies on complex on-chain options, margin and settlement contracts (V1 AMM, V2 matching, PPTSA and basis-vault contracts). A bug in margin/liquidation or settlement logic could lead to loss of LP or trader funds despite multiple audits.',
            },
            {
                'category': 'Oracle',
                'description': 'Options pricing, margin and liquidations depend on accurate spot/implied-volatility price feeds. Manipulated or stale oracle data could mis-price options or trigger unfair liquidations.',
            },
            {
                'category': 'Network',
                'description': 'Core execution runs on Derive Chain, a self-operated OP-Stack rollup that settles to Ethereum. Sequencer downtime, rollup bugs or bridge issues could halt trading, delay settlement or impede withdrawals.',
            },
            {
                'category': 'Counterparty',
                'description': 'In the AMM/vault model, liquidity providers act as the counterparty underwriting options; adverse market moves can produce large LP drawdowns, and cross-margin between options and perps concentrates risk if a large account becomes insolvent.',
            },
            {
                'category': 'Governance',
                'description': 'DRV/stDRV holders govern tokenomics including the buyback rate (raised from 25% to 35%), staking emissions and protocol parameters; concentrated voting power or contentious proposals could adversely change incentives.',
            },
            {
                'category': 'Regulatory',
                'description': "On-chain options and perpetual futures are derivatives that face uncertain and tightening regulatory treatment across jurisdictions, which could restrict access or the protocol's operations.",
            },
        ],
        competitors=[
            {
                'name': 'Hyperliquid',
                'slug': 'hyperliquid',
                'rank': 1,
                'positioning': 'Dominant high-performance on-chain perpetuals venue running its own L1 with a fully on-chain order book.',
                'similarities': 'Both operate a dedicated app-chain with an order-book trading model and on-chain settlement for crypto derivatives.',
                'differences': 'Hyperliquid focuses on perpetual futures on its own L1; Derive centers on options and structured products with cross-margin across options and perps on an OP-Stack rollup.',
            },
            {
                'name': 'GMX',
                'slug': 'gmx',
                'rank': 2,
                'positioning': 'Liquidity-pool-based perpetuals and spot DEX on Arbitrum and Avalanche.',
                'similarities': 'Both are on-chain derivatives protocols where a liquidity pool can act as counterparty to traders.',
                'differences': "GMX offers perps/spot via a shared liquidity pool; Derive's core product is options with an AMM-plus-CLOB and a portfolio-margin risk engine.",
            },
            {
                'name': 'Aevo',
                'slug': 'aevo',
                'rank': 3,
                'positioning': 'Options and perpetuals exchange on a custom OP-Stack rollup, spun out of Ribbon Finance.',
                'similarities': 'Very close analogue: on-chain options plus perps on a dedicated OP-Stack rollup with an order-book model and structured-product roots.',
                'differences': 'Both target the same options+perps niche; they differ mainly in liquidity, token design and margin implementation.',
            },
            {
                'name': 'Dopex',
                'slug': 'dopex',
                'rank': 4,
                'positioning': 'Decentralized options protocol on Arbitrum using single-staking option vaults.',
                'similarities': 'Both provide decentralized options exposure and vault-based option-selling strategies for LPs.',
                'differences': 'Dopex relies on option vaults / SSOV mechanics on Arbitrum; Derive runs a full AMM+CLOB options market with cross-margin on its own chain.',
            },
            {
                'name': 'Ribbon Finance',
                'slug': 'ribbon-finance',
                'rank': 5,
                'positioning': 'Pioneer of DeFi structured products and automated option-selling vaults (now merged into Aevo).',
                'similarities': 'Both offer automated option-vault / structured-product strategies to passive depositors.',
                'differences': 'Ribbon focused on vaults that sold options into external markets; Derive operates the underlying options venue itself.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-07-26',
                'round': 'Seed',
                'amountUsd': 3300000,
                'amountLabel': '$3.3M',
                'investors': [
                    'Framework Ventures',
                    'ParaFi Capital',
                    'DeFi Alliance',
                    'Orthogonal Trading',
                    'Robot Ventures',
                    'Apollo Capital',
                ],
                'link': 'https://www.coindesk.com/business/2021/07/26/some-of-defis-leading-investors-are-backing-a-new-options-protocol',
            },
        ],
        audits=[
            {
                'firm': 'Sigma Prime',
                'date': '2023-08-01',
                'url': 'https://github.com/sigp/public-audits/blob/master/reports/derive/review.pdf',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2023-12-01',
                'url': 'https://github.com/sigp/public-audits/blob/master/reports/derive/review-round2.pdf',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2024-07-01',
                'url': 'https://github.com/sigp/public-audits/blob/master/reports/derive/v2-matching/review.pdf',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2024-08-01',
                'url': 'https://github.com/sigp/public-audits/blob/master/reports/derive/pptsa/review.pdf',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2025-03-01',
                'url': 'https://github.com/sigp/public-audits/blob/master/reports/derive/atomic/review.pdf',
            },
        ],
        sources=[
            {
                'label': 'Derive Help Center — LYRA to DRV Migration',
                'url': 'https://help.derive.xyz/en/articles/9219427-lyra-to-drv-migration',
            },
            {
                'label': 'Derive Insights — Announcing Lyra V2 / Derive Chain',
                'url': 'https://insights.derive.xyz/announcing-lyra-v2/',
            },
            {
                'label': 'Derive Insights — Lyra OP Mainnet Launch',
                'url': 'https://insights.derive.xyz/lyra-mainnet-launch/',
            },
            {
                'label': 'Derive Insights — Avalon Upgrade',
                'url': 'https://insights.derive.xyz/avalon-is-live/',
            },
            {
                'label': 'Derive Insights — $DRV',
                'url': 'https://insights.derive.xyz/drv/',
            },
            {
                'label': 'Derive Docs — Token',
                'url': 'https://docs.derive.xyz/docs/token',
            },
            {
                'label': 'Sigma Prime public audits (GitHub)',
                'url': 'https://github.com/sigp/public-audits',
            },
        ],
        name="Derive",
        symbol="DRV",
        tagline="On-chain options and structured products (formerly Lyra).",
        description=(
            "Derive (rebranded from Lyra) is an on-chain options and structured-"
            "products protocol with an options AMM and automated vaults, deployed on "
            "its own OP-stack chain alongside Optimism, Arbitrum and Base."
        ),
        differentiator=(
            "A purpose-built options AMM + settlement chain, offering composable "
            "options and yield vaults with cross-margin."
        ),
        derivatives_sub_sector="Option Vaults",
        derivatives_secondary_tags=["Auto-Strategy", "Multi-Chain"],
        chains=["Optimism", "Arbitrum One", "Base", "Ethereum"],
        official_docs="https://docs.derive.xyz",
        website="https://www.derive.xyz",
        twitter="https://x.com/derivexyz",
        github="https://github.com/derivexyz",
        member_coins=[
            _coin("drv", "Derive", "DRV", "Governance token (ex-LYRA)"),
        ],
    ),
    "jones-dao": _net(
        components=[
            {
                'name': 'Jones Vaults (Option / Strategy Vaults)',
                'description': 'Automated strategy vaults that abstract complex derivatives positions into one-click, auto-managed deposits. Early vaults ran risk-managed options strategies (e.g. spreads) on top of Dopex Single Staking Options Vaults (SSOVs) for assets such as ETH and gOHM, generating yield from option premiums.',
            },
            {
                'name': 'jGLP Vault',
                'description': "An ERC-4626 leveraged-GLP vault built on GMX's GLP. Depositors provide GLP (or GLP basket tokens) and the vault borrows USDC from the jUSDC vault to mint additional GLP, gaining algorithmic 'Smart Leverage' on the GLP position while auto-rebalancing within a backtested range to deliver amplified real yield.",
            },
            {
                'name': 'jUSDC Vault',
                'description': "A companion vault where depositors supply Arbitrum-bridged USDC.e that is lent to the jGLP vault as leverage collateral. jUSDC is not a stablecoin but accrues stablecoin-denominated yield sourced from a portion of the GLP strategy's returns; mintable jGLP is capped by available jUSDC.",
            },
            {
                'name': 'jAURA',
                'description': "An auto-compounding liquid-staking-derivative vault for vlAURA (Aura Finance / Balancer ecosystem), issued as the wjAURA receipt token. It auto-compounds bribe and gauge rewards, integrating Redacted Cartel's Hidden Hand for bribe optimization and Balancer gauges for wjAURA liquidity incentives.",
            },
            {
                'name': 'Metavaults',
                'description': 'Vaults that take LP tokens and stake them in Dopex farms to earn DPX/rDPX rewards while automatically hedging or slightly levering price action on the underlying tokens, subject to available liquidity.',
            },
            {
                'name': 'JONES governance token',
                'description': "The protocol's ERC-20 governance token on Arbitrum (10M max supply). Used for governance and incentive programs across the vault ecosystem.",
            },
        ],
        faq=[
            {
                'question': 'What is Jones DAO?',
                'answer': 'Jones DAO is an Arbitrum-native yield, strategy and liquidity protocol that packages complex options and derivatives strategies into one-click, auto-managed vault deposits. Its flagship products are the leveraged-GLP jGLP and jUSDC vaults built on GMX, plus jAURA, Metavaults, and earlier Dopex-based options vaults.',
                'pinned': True,
            },
            {
                'question': 'How do jGLP and jUSDC work together?',
                'answer': 'Users deposit GLP into the jGLP vault and USDC.e into the jUSDC vault. jGLP borrows USDC from jUSDC to mint extra GLP, levering its GLP exposure and auto-rebalancing to avoid liquidation. jGLP earns amplified GLP real yield; jUSDC earns a share of that yield as stablecoin-denominated return. Mintable jGLP is limited by available jUSDC.',
                'pinned': False,
            },
            {
                'question': 'Was there a JONES airdrop?',
                'answer': 'Public sources describe token sale rounds and a launchpool/free-distribution allocation rather than a conventional retroactive airdrop. Jones raised capital via a private sale and two public sale rounds in January 2022, with the TGE on Jan 30, 2022.',
                'pinned': False,
            },
            {
                'question': 'Are the vaults audited?',
                'answer': 'Yes. The GLP vault suite (jGLP/jUSDC contracts including JonesGlpVault, JonesGlpStableVault, JonesGlpVaultRouter and JonesGlpLeverageStrategy) was audited by SourceHat in January 2023, which found and resolved four high-severity issues and rated the code PASS while noting centralized aspects.',
                'pinned': False,
            },
            {
                'question': 'Is Jones DAO still active?',
                'answer': 'Activity is low. The JONES token trades around $0.10 (mid-2026), roughly 99.7% below its ~$28 all-time high, with very thin daily volume and a market cap well under $1M, indicating a strongly diminished protocol compared to its 2022-2023 peak.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Jones DAO team (pseudonymous core contributors)',
                'role': 'Core development / DAO',
                'description': 'Jones DAO operates as a DAO with a largely pseudonymous core team. Publicly available records do not attribute verifiable real-name founders, so no individual is asserted here.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Structured product / managed derivatives fund',
                'similarity': 'Like a bank-issued structured note or a managed options fund, Jones vaults package a complex derivatives strategy into a single deposit product so users get exposure to option-premium or leveraged yield without managing positions themselves.',
                'differences': 'Jones is fully on-chain, non-custodial and permissionless, uses tokenized receipt shares (jGLP, jUSDC, wjAURA) that remain liquid and composable, and settles via smart contracts rather than a custodian or fund administrator, with associated smart-contract and leverage-liquidation risk.',
            },
            {
                'product': 'Leveraged / yield-enhanced ETF',
                'similarity': "jGLP resembles a leveraged, yield-enhanced index product: GLP is a basket of crypto assets, and jGLP levers it to amplify yield much as a leveraged ETF amplifies an index's return.",
                'differences': 'Leverage is sourced peer-to-peer from the jUSDC vault rather than a broker, rebalancing is algorithmic on-chain, and there is direct liquidation risk if the GLP position moves against the vault.',
            },
        ],
        events=[
            {
                'date': '2022-01-30',
                'title': 'JONES token generation event (TGE)',
                'description': 'Jones DAO concluded its token launch, raising capital through a private sale and two public sale rounds in January 2022 with the TGE on Jan 30, 2022.',
                'link': 'https://icodrops.com/jones-dao/',
            },
            {
                'date': '2023-01-24',
                'title': 'jGLP & jUSDC smoothpaper published / GLP vaults launch',
                'description': "Jones published the jUSDC & jGLP smoothpaper introducing its leveraged-GLP vault system built on GMX's GLP, delivering leveraged real yield (jGLP) and stablecoin yield (jUSDC).",
                'link': 'https://jonesdao.ghost.io/jusdc-jglp-smoothpaper/',
            },
            {
                'date': '2023-04-13',
                'title': 'jAURA launch',
                'description': "Jones launched jAURA, an auto-compounding vlAURA vault issuing the wjAURA receipt token, integrating Redacted Cartel's Hidden Hand for bribe optimization and Balancer gauges for liquidity incentives.",
                'link': 'https://jonesdao.ghost.io/jaura/',
            },
            {
                'date': '2023-10-13',
                'title': 'Arbitrum Foundation grant',
                'description': 'Jones DAO received a $1.6M grant from the Arbitrum Foundation.',
                'link': 'https://cryptorank.io/ico/jones-dao',
            },
        ],
        timeline=[
            {
                'date': '2022-01-30',
                'title': 'Protocol launch on Arbitrum with Dopex options vaults',
                'description': 'Jones DAO launched on Arbitrum, initially offering ETH and gOHM options-strategy vaults built on top of Dopex Single Staking Options Vaults (SSOVs).',
                'link': 'https://jonesdao.ghost.io/dpx-vaults/',
                'status': 'executed',
            },
            {
                'date': '2023-01-25',
                'title': 'jGLP/jUSDC GLP vault suite audited and shipped',
                'description': 'The leveraged-GLP vault contracts were audited by SourceHat (Jan 25-26, 2023) and launched, expanding Jones from options vaults into leveraged real-yield strategies on GMX.',
                'link': 'https://sourcehat.com/audits/JonesDAOGLPVaults/',
                'status': 'executed',
            },
            {
                'date': '2023-04-13',
                'title': 'jAura LSD vault milestone',
                'description': 'Expansion into the Aura/Balancer ecosystem with the wjAURA auto-compounding LSD vault.',
                'link': 'https://jonesdao.ghost.io/jaura/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Total capital raised',
                'value': '~$29M across a private sale and two public sale rounds (Jan 2022), plus a $1.6M Arbitrum Foundation grant (Oct 2023)',
                'freshness': 'static',
                'source': {
                    'label': 'CryptoRank / ICO Drops - Jones DAO ICO',
                    'url': 'https://icodrops.com/jones-dao/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'JONES max supply',
                'value': '10,000,000 JONES (approximate max supply); ~5.9M circulating',
                'freshness': 'static',
                'source': {
                    'label': 'CoinGecko - Jones DAO',
                    'url': 'https://www.coingecko.com/en/coins/jones-dao',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Token drawdown from ATH',
                'value': 'JONES ~99.7% below its ~$28.39 all-time high with sub-$1M market cap and very thin volume, indicating low current activity',
                'freshness': 'live',
                'source': {
                    'label': 'CoinGecko - Jones DAO',
                    'url': 'https://www.coingecko.com/en/coins/jones-dao',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'The vaults are complex ERC-4626 leverage and auto-compounding contracts. The SourceHat audit of the GLP vault suite found four high-severity issues (later resolved), underscoring meaningful smart-contract risk; audits reduce but do not eliminate exploit risk.',
            },
            {
                'category': 'Collateral',
                'description': "jGLP takes leveraged exposure to GMX's GLP basket. Adverse moves in GLP's underlying assets, or a fall in the jGLP position value relative to borrowed USDC debt, can trigger deleveraging/liquidation and losses for depositors.",
            },
            {
                'category': 'Counterparty',
                'description': 'The protocol is deeply dependent on external protocols it builds on - GMX/GLP for jGLP-jUSDC, Dopex for options vaults and Metavaults, and Aura/Balancer for jAURA. A failure, exploit, or economic change in any of these underlying protocols directly impairs Jones vaults.',
            },
            {
                'category': 'Governance',
                'description': "The audited GLP contracts retain 'centralized aspects,' meaning privileged roles can influence vault behavior; concentrated governance/admin control creates the risk of adverse parameter changes or misuse.",
            },
            {
                'category': 'Systemic',
                'description': 'Protocol activity has collapsed from its 2022-2023 peak (JONES ~99.7% off ATH, sub-$1M market cap, thin liquidity). Low TVL and liquidity raise the risk of degraded vault performance, wind-down, or difficulty exiting positions at fair value.',
            },
            {
                'category': 'Oracle',
                'description': 'Leverage and rebalancing rely on accurate pricing of GLP and underlying assets; oracle mispricing or manipulation on the underlying platforms could cause incorrect leverage calculations, mistimed rebalances, or unfair liquidations.',
            },
        ],
        competitors=[
            {
                'name': 'Dopex',
                'slug': 'dopex',
                'rank': 1,
                'positioning': 'Arbitrum-native decentralized options protocol (SSOVs) that Jones both integrated with and competes against for options-vault yield.',
                'similarities': 'Both are Arbitrum options-centric protocols offering vaulted options-strategy yield; Jones vaults were originally built on Dopex SSOVs.',
                'differences': 'Dopex provides the base options infrastructure/liquidity, while Jones packages strategies into abstracted one-click auto-managed vaults on top rather than running the options marketplace itself.',
            },
            {
                'name': 'Ribbon Finance',
                'slug': 'ribbon-finance',
                'rank': 2,
                'positioning': 'Pioneer of automated DeFi options-vault (DOV) structured products.',
                'similarities': 'Both abstract options strategies (covered calls, spreads, structured yield) into deposit vaults with tokenized shares for passive users.',
                'differences': 'Ribbon focused on cross-chain covered-call/put-selling DOVs and later Aevo; Jones is Arbitrum-native and diversified into leveraged-GLP and LSD auto-compounding vaults beyond pure options.',
            },
            {
                'name': 'GMX',
                'slug': 'gmx',
                'rank': 3,
                'positioning': 'The underlying GLP/perps venue on Arbitrum that jGLP levers.',
                'similarities': 'Competes for the same GLP-holder yield seekers; both offer GLP-based real yield to Arbitrum users.',
                'differences': 'GMX provides the base GLP liquidity/perps product, whereas Jones offers a leveraged, auto-rebalanced wrapper (jGLP) on top of GLP.',
            },
            {
                'name': 'Rage Trade',
                'slug': 'rage-trade',
                'rank': 4,
                'positioning': 'Arbitrum protocol offering delta-neutral and leveraged GLP-based vault strategies.',
                'similarities': 'Directly comparable GLP-vault yield products (delta-neutral / leveraged GLP) targeting the same Arbitrum GLP audience as jGLP/jUSDC.',
                'differences': 'Rage Trade emphasizes delta-neutral GLP and 80-20 vaults, while Jones emphasizes Smart Leverage amplification of GLP yield paired with a stablecoin-yield jUSDC vault.',
            },
        ],
        partnerships=[
            {
                'name': 'Rodeo Finance',
                'date': '2023-01-01',
                'amountLabel': None,
                'description': "Collaboration announced by Rodeo Finance integrating Jones DAO vaults/strategies (jGLP/jUSDC ecosystem) for leverage. Announced via Rodeo Finance's Medium; exact day not specified so date is approximate to the announcement period.",
            },
            {
                'name': 'Redacted Cartel (Hidden Hand)',
                'date': '2023-04-13',
                'amountLabel': None,
                'description': "jAURA integrates Redacted Cartel's Hidden Hand marketplace to automate vlAURA bribe optimization, announced alongside the jAURA launch.",
            },
        ],
        investment_rounds=[
            {
                'date': '2022-01-23',
                'round': 'Private / Seed Sale',
                'amountUsd': 3000000,
                'amountLabel': '$3M',
                'investors': [
                    'Tetranode',
                    'Redacted Cartel',
                    '0xSami',
                    'David Iach',
                    'Olympus DAO',
                ],
                'link': 'https://icodrops.com/jones-dao/',
            },
            {
                'date': '2022-01-25',
                'round': 'Public Sale Round 1',
                'amountUsd': 11000000,
                'amountLabel': '$11M',
                'investors': [],
                'link': 'https://icodrops.com/jones-dao/',
            },
            {
                'date': '2022-01-30',
                'round': 'Public Sale Round 2',
                'amountUsd': 13400000,
                'amountLabel': '$13.4M',
                'investors': [],
                'link': 'https://icodrops.com/jones-dao/',
            },
        ],
        audits=[
            {
                'firm': 'SourceHat',
                'date': '2023-01-25',
                'url': 'https://sourcehat.com/audits/JonesDAOGLPVaults/',
            },
        ],
        sources=[
            {
                'label': 'Jones DAO docs - Understanding jUSDC and jGLP',
                'url': 'https://docs.jonesdao.io/jones-dao/features/understanding-jusdc-and-jglp',
            },
            {
                'label': 'Jones DAO Ghost blog - jUSDC & jGLP Smoothpaper',
                'url': 'https://jonesdao.ghost.io/jusdc-jglp-smoothpaper/',
            },
            {
                'label': 'Jones DAO Ghost blog - Introducing jAURA',
                'url': 'https://jonesdao.ghost.io/jaura/',
            },
            {
                'label': 'SourceHat - JonesDAO GLP Vaults audit',
                'url': 'https://sourcehat.com/audits/JonesDAOGLPVaults/',
            },
            {
                'label': 'ICO Drops - Jones DAO token sale',
                'url': 'https://icodrops.com/jones-dao/',
            },
            {
                'label': 'CoinGecko - Jones DAO (current status)',
                'url': 'https://www.coingecko.com/en/coins/jones-dao',
            },
            {
                'label': 'DefiLlama - Jones DAO',
                'url': 'https://defillama.com/protocol/jones-dao',
            },
        ],
        github='https://github.com/Jones-DAO',
        name="Jones DAO",
        symbol="JONES",
        tagline="Yield, liquidity and options strategy vaults on Arbitrum.",
        description=(
            "Jones DAO is an Arbitrum-native protocol offering automated yield and "
            "options strategy vaults that abstract complex derivatives positions "
            "into one-click, auto-managed deposits."
        ),
        differentiator=(
            "Strategy vaults that combine options, hedging and liquidity provisioning "
            "to deliver risk-adjusted yield with minimal user management."
        ),
        derivatives_sub_sector="Option Vaults",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Arbitrum One"],
        official_docs="https://docs.jonesdao.io",
        website="https://www.jonesdao.io",
        twitter="https://x.com/DAOJonesOptions",
        member_coins=[
            _coin("jones", "Jones DAO", "JONES", "Governance token"),
        ],
    ),
    # ---------------------------- DELTA-NEUTRAL -----------------------------
    "rage-trade": _net(
        components=[
            {
                'name': 'Delta-Neutral GMX GLP Vaults (Risk-On / Risk-Off)',
                'description': "Two complementary Arbitrum vaults launched atop GMX. The Risk-On vault deposits sGLP (staked GLP) and hedges GLP's embedded BTC/ETH exposure by opening short positions on Aave (via a Balancer flash loan sold on Uniswap), isolating the GLP fee/esGMX yield. The Risk-Off vault lets USDC depositors earn a leveraged yield by lending USDC to the Risk-On vault, providing the borrow liquidity for the hedge.",
            },
            {
                'name': 'Omnichain Perpetuals & 80-20 Vaults',
                'description': "A composable ETH perpetual-futures protocol built on Uniswap V3 (RageTrade 'core'). The 80-20 vault keeps ~80% of TVL earning yield in the source protocol (isolated risk) while ~20% is used as virtual concentrated liquidity on Rage. LayerZero passes cross-chain messages and Stargate bridges USDC PnL, enabling omnichain recycled liquidity so LPs on AMMs across supported chains can deposit into Rage vaults.",
            },
            {
                'name': 'Perp Aggregator (Rage V2)',
                'description': 'A later pivot into a perpetuals aggregator / SDK routing orders across multiple perp DEXs for best price and aggregated liquidity across chains, exposed via the Perp-Aggregator-SDK and integration tooling.',
            },
        ],
        faq=[
            {
                'question': 'Is Rage Trade still operational?',
                'answer': 'No. On October 6, 2025 the team announced it was winding down operations, disabling the app, and returning funds to token holders and investors. Users were told to manage any open positions directly through the underlying source protocols.',
                'pinned': True,
            },
            {
                'question': 'Did Rage Trade have a token?',
                'answer': 'Yes. Although Rage Trade was tokenless for most of its life, it launched the RAGE token via a Fjord Foundry Liquidity Bootstrapping Pool with a Token Generation Event that concluded on August 7, 2024.',
                'pinned': False,
            },
            {
                'question': 'How did the delta-neutral GLP vaults work?',
                'answer': "The Risk-On vault held GMX's GLP and shorted the BTC and ETH portion of GLP on Aave using a Balancer flash loan, keeping the position roughly market-neutral so depositors captured GLP's trading-fee and esGMX yield without directional price exposure. The Risk-Off vault supplied USDC to lever this strategy.",
                'pinned': False,
            },
            {
                'question': "What made Rage Trade's perps 'omnichain'?",
                'answer': "Rage used LayerZero for cross-chain messaging and Stargate to bridge USDC PnL, so liquidity providers on multiple chains could recycle their AMM LP into Rage's perpetual liquidity via the 80-20 vault design.",
                'pinned': False,
            },
            {
                'question': 'What are holders receiving in the wind-down?',
                'answer': 'Per the October 2025 announcement, liquid RAGE holders are settled at $0.42 per token, investors with unsold/unvested allocations at 2.1x entry price, and team members via token allocations or severance. Distributions occur automatically from a holder snapshot; unclaimed vault deposits are returned to original addresses.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Rage Trade (core team)',
                'role': 'Protocol development team',
                'description': 'Anonymous / pseudonymous core team operating under the Rage Trade brand; individual founder identities were not publicly disclosed. The team maintained the RageTrade GitHub organization and later executed the wind-down and holder distributions.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Market-neutral / delta-neutral hedge fund',
                'similarity': 'The Risk-On GLP vault mirrors a classic delta-neutral strategy: hold a yield-bearing asset (GLP) and short the underlying market exposure (BTC/ETH) so returns come from carry/fees rather than price direction.',
                'differences': 'Fully on-chain, non-custodial, and permissionless with transparent smart-contract execution; hedging is automated via flash loans and Aave rather than through prime brokers, and it carries smart-contract and DeFi composability risks absent in a traditional fund.',
            },
            {
                'product': 'Structured-note / covered-yield product on an index',
                'similarity': 'Packages a complex derivatives strategy into a one-click deposit product that abstracts the hedging mechanics for the end user, similar to a structured yield note referencing an underlying basket.',
                'differences': 'No issuer credit backstop or principal guarantee; yields float with on-chain funding and GMX fee generation, and liquidity/redemption depends on protocol solvency and oracle correctness.',
            },
        ],
        events=[
            {
                'date': '2022-12-12',
                'title': 'Rage Trade perpetuals launch on Arbitrum One',
                'description': "Rage Trade's ETH perpetual-futures protocol went live on Arbitrum One, bringing Uniswap V3-based perps and recycled/omnichain liquidity to the Arbitrum ecosystem.",
                'link': 'https://tokeninsight.com/en/news/perpetual-protocol-rage-trade-to-go-live-on-arbitrum-one-on-december-12th',
            },
            {
                'date': '2024-08-07',
                'title': 'RAGE Token Generation Event concludes',
                'description': 'The RAGE token TGE concluded on August 7, 2024, following a Fjord Foundry Liquidity Bootstrapping Pool in July 2024 that sold 20M RAGE at $0.30 each, raising roughly $6M.',
                'link': 'https://icodrops.com/rage-trade/',
            },
            {
                'date': '2025-10-06',
                'title': 'Rage Trade announces wind-down of operations',
                'description': 'The team announced it was winding down Rage Trade and returning funds to token holders and investors. Liquid RAGE holders settled at $0.42/token, unvested investor allocations at 2.1x entry, distributions automatic from a snapshot, and unclaimed vault deposits returned to original addresses. The app was slated to shut down; users advised to manage positions via source protocols.',
                'link': 'https://www.cryptotimes.io/2025/10/06/rage-trade-winds-down-plans-cash-return-to-holders/',
            },
        ],
        timeline=[
            {
                'date': '2022-11-28',
                'title': 'Delta-Neutral GMX GLP vaults audited (Sherlock)',
                'description': 'Sherlock completed its audit of the Rage Trade delta-neutral GMX (DN GMX) vaults, covering the Risk-On/Risk-Off vault contracts ahead of their late-2022 launch.',
                'link': 'https://github.com/sherlock-protocol/sherlock-reports/blob/main/audits/2022.11.28%20-%20Final%20-%20Rage%20Trade%20Audit%20Report.pdf',
                'status': 'executed',
            },
            {
                'date': '2022-12-12',
                'title': 'Perpetuals + omnichain liquidity go live on Arbitrum',
                'description': 'Launch of the core ETH perp protocol on Arbitrum One with the 80-20 vault and LayerZero/Stargate-based omnichain recycled liquidity design.',
                'link': 'https://tokeninsight.com/en/news/perpetual-protocol-rage-trade-to-go-live-on-arbitrum-one-on-december-12th',
                'status': 'executed',
            },
            {
                'date': '2024-08-07',
                'title': 'RAGE token launch (TGE)',
                'description': 'Transition from tokenless protocol to a live token via a Fjord Foundry LBP and TGE concluding August 7, 2024.',
                'link': 'https://icodrops.com/rage-trade/',
                'status': 'executed',
            },
            {
                'date': '2025-10-06',
                'title': 'Wind-down and capital return',
                'description': 'Protocol ceased operations; structured return of funds to holders and investors and shutdown of the app.',
                'link': 'https://www.cryptotimes.io/2025/10/06/rage-trade-winds-down-plans-cash-return-to-holders/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Status',
                'value': 'Wound down; operations ceased and app shut down as of the October 6, 2025 announcement, with funds returned to holders and investors.',
                'freshness': 'static',
                'source': {
                    'label': 'Crypto Times - Rage Trade Winds Down',
                    'url': 'https://www.cryptotimes.io/2025/10/06/rage-trade-winds-down-plans-cash-return-to-holders/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'RAGE token launch (TGE)',
                'value': 'TGE concluded August 7, 2024 via a Fjord Foundry LBP that sold 20M RAGE at $0.30 (~$6M raised).',
                'freshness': 'static',
                'source': {
                    'label': 'ICO Drops - Rage Trade (RAGE)',
                    'url': 'https://icodrops.com/rage-trade/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Wind-down holder settlement',
                'value': 'Liquid RAGE holders settled at $0.42 per token; investors with unsold/unvested allocations at 2.1x entry price; distributions automatic from a snapshot.',
                'freshness': 'static',
                'source': {
                    'label': 'Crypto Times - Rage Trade Winds Down',
                    'url': 'https://www.cryptotimes.io/2025/10/06/rage-trade-winds-down-plans-cash-return-to-holders/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Complex vault logic involving flash loans, Aave positions and cross-protocol composability creates a broad attack surface; a bug in the delta-neutral or omnichain contracts could cause loss of deposits despite the Sherlock audit.',
            },
            {
                'category': 'Counterparty',
                'description': 'The strategy is fully dependent on external protocols (GMX/GLP for yield, Aave for the hedge borrow, Balancer/Uniswap for execution, LayerZero/Stargate for messaging and bridging); failure, insolvency, or parameter changes at any of these breaks the strategy.',
            },
            {
                'category': 'Oracle',
                'description': 'GLP valuation and the BTC/ETH hedge sizing rely on accurate price feeds; oracle manipulation or staleness could misprice the hedge, leaving the vault directionally exposed or subject to bad liquidations.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'The hedge can drift from true delta-neutrality (basis/funding divergence, rebalancing lag, or Aave borrow-rate spikes), so the vault may retain residual market exposure and underperform or incur losses during sharp moves.',
            },
            {
                'category': 'Network',
                'description': 'Omnichain design depends on LayerZero and Stargate bridging; cross-chain message failures, bridge exploits, or Arbitrum sequencer downtime could delay rebalancing/hedging and strand PnL in transit.',
            },
            {
                'category': 'Systemic',
                'description': 'As a wound-down protocol, ongoing/tail risk exists around final distributions, unclaimed vault deposits, and reliance on source-protocol interfaces for legacy positions after the app was shut down.',
            },
        ],
        competitors=[
            {
                'name': 'GMX',
                'slug': 'gmx',
                'rank': 1,
                'positioning': "The GLP liquidity pool that Rage Trade's flagship delta-neutral vaults were built directly on top of.",
                'similarities': 'Both are Arbitrum-native derivatives protocols centered on perpetual trading and GLP-style yield.',
                'differences': 'GMX is the underlying spot/perp liquidity and yield source; Rage Trade layered a hedged, delta-neutral vault and an omnichain perp/aggregator on top rather than being a base AMM/pool itself.',
            },
            {
                'name': 'Gains Network',
                'slug': 'gains-network',
                'rank': 2,
                'positioning': 'Arbitrum/Polygon synthetic-leverage perp protocol competing for the same on-chain perpetuals users.',
                'similarities': 'On-chain perpetual futures with LP-backed liquidity vaults on Arbitrum.',
                'differences': 'Gains uses a single gDAI/DAI vault and synthetic pricing (gTrade); Rage focused on GLP-hedged vaults and omnichain recycled liquidity.',
            },
            {
                'name': 'GMX-style delta-neutral vault competitors (Neutra, Rage-style aggregators)',
                'slug': 'neutra-finance',
                'rank': 3,
                'positioning': 'Protocols offering pre-packaged delta-neutral GLP strategies, competing for the same GLP-hedging depositors.',
                'similarities': 'Both wrap GMX GLP into automated market-neutral yield vaults using shorts to hedge BTC/ETH exposure.',
                'differences': 'Differ in hedging venue, leverage mechanics, and fee structure; Rage additionally pursued omnichain perp liquidity.',
            },
            {
                'name': 'Rage-style omnichain perp DEXs (dYdX, Hyperliquid)',
                'slug': 'hyperliquid',
                'rank': 4,
                'positioning': "High-liquidity perp DEXs that Rage's aggregator/omnichain perps competed against for order flow.",
                'similarities': 'On-chain perpetual futures trading targeting deep liquidity and cross-market access.',
                'differences': 'Hyperliquid runs its own high-throughput L1 order book; Rage relied on Uniswap V3 virtual liquidity, GLP recycling and cross-chain messaging, and later became an aggregator routing to such venues.',
            },
        ],
        investment_rounds=[
            {
                'date': '2024-07-01',
                'round': 'Public Sale (Fjord Foundry LBP)',
                'amountUsd': 6000000,
                'amountLabel': '~$6M',
                'investors': [
                    'Public / individual investors (Fjord Foundry LBP)',
                ],
                'link': 'https://icodrops.com/rage-trade/',
            },
        ],
        audits=[
            {
                'firm': 'Sherlock',
                'date': '2022-11-28',
                'url': 'https://github.com/sherlock-protocol/sherlock-reports/blob/main/audits/2022.11.28%20-%20Final%20-%20Rage%20Trade%20Audit%20Report.pdf',
            },
        ],
        sources=[
            {
                'label': 'Crypto Times - Rage Trade Winds Down, Plans Cash Return to Holders',
                'url': 'https://www.cryptotimes.io/2025/10/06/rage-trade-winds-down-plans-cash-return-to-holders/',
            },
            {
                'label': 'ICO Drops - Rage Trade (RAGE) token sale',
                'url': 'https://icodrops.com/rage-trade/',
            },
            {
                'label': 'Sherlock - Rage Trade Final Audit Report (2022-11-28)',
                'url': 'https://github.com/sherlock-protocol/sherlock-reports/blob/main/audits/2022.11.28%20-%20Final%20-%20Rage%20Trade%20Audit%20Report.pdf',
            },
            {
                'label': 'TokenInsight - Rage Trade to go live on Arbitrum One Dec 12',
                'url': 'https://tokeninsight.com/en/news/perpetual-protocol-rage-trade-to-go-live-on-arbitrum-one-on-december-12th',
            },
            {
                'label': "Deus Ex DAO - Deep Dive into Rage Trade's Delta Neutral Vaults",
                'url': 'https://medium.com/deus-ex-dao/deep-dive-into-rage-trades-delta-neutral-vaults-3e8f71af82c3',
            },
            {
                'label': 'Sherlock audit repo - 2022-10-rage-trade (DN GMX vaults source)',
                'url': 'https://github.com/sherlock-audit/2022-10-rage-trade',
            },
            {
                'label': 'RageTrade GitHub organization',
                'url': 'https://github.com/RageTrade',
            },
        ],
        github='https://github.com/RageTrade',
        name="Rage Trade",
        symbol="",
        tagline="Delta-neutral vaults and omnichain perps liquidity.",
        description=(
            "Rage Trade is an Arbitrum-native derivatives protocol offering "
            "delta-neutral vaults (e.g. recycling GLP yield while hedging its market "
            "exposure) and omnichain perpetual-futures liquidity."
        ),
        differentiator=(
            "Delta-neutral strategy vaults that hedge external LP positions (like "
            "GMX's GLP) to isolate yield from directional risk."
        ),
        derivatives_sub_sector="Delta-Neutral",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Arbitrum One"],
        hedge_venue=["GMX"],
        official_docs="https://docs.rage.trade",
        website="https://www.rage.trade",
        twitter="https://x.com/rage_trade",
        # No headline tradable token — network TVL sourced from DeFi Llama (path c).
        scale_labels={"tvl": "Protocol TVL"},
    ),
    "neutra-finance": _net(
        components=[
            {
                'name': 'nGLP Market-Neutral Vault',
                'description': "The flagship automated strategy vault. Users deposit DAI (later also GLP directly); the vault buys GMX's GLP liquidity token (a basket that is ~50% stablecoins and ~50% BTC/ETH and other majors) and simultaneously opens leveraged short BTC and ETH perpetual positions on GMX to hedge the volatile exposure, targeting a market-neutral return derived from GLP's fee/esGMX yield.",
            },
            {
                'name': 'Rebalancing engine (Tolerance Band Volatility Model)',
                'description': 'A proprietary rebalancing algorithm using ATR (Average True Range) to predict volatility ranges and pre-emptively rebalance the short hedge when combined asset-weight deviation plus predicted volatility exceeds an optimal threshold (~2.6%), aiming to hold delta near zero while minimizing rebalancing cost and liquidation risk.',
            },
            {
                'name': 'NEU / esNEU token system',
                'description': 'NEU is the utility and governance token (6M max supply). esNEU is escrowed NEU distributed to NEU stakers and vault participants; it vests linearly into NEU over 12 months. Staking NEU earns protocol fees (in stablecoins), esNEU, and fee boosters.',
            },
            {
                'name': 'Uniswap V3 delta-neutral vault (nUSDC LP, V3 pivot)',
                'description': 'Following a Q3 2023 strategic overhaul, the team pivoted toward a 100% Uniswap V3 delta-neutral LP strategy (backtested D7.5r15 configuration: 7.5% debt ratio, 15% tick spread), intended to replace the GLP vault. As of the last public updates the optimized parameters were still being finalized and the strategy had not been confirmed as fully launched.',
            },
        ],
        faq=[
            {
                'question': 'What is Neutra Finance?',
                'answer': "Neutra Finance is an Arbitrum-based protocol offering automated 'strategy vaults' that target market-neutral (delta-neutral) returns. Its flagship product paired long GLP exposure with short BTC/ETH perpetual hedges on GMX so that depositors could earn GLP's yield without directional BTC/ETH price risk.",
                'pinned': True,
            },
            {
                'question': 'How did the nGLP delta-neutral vault work?',
                'answer': "Users deposited DAI (or GLP). The vault allocated capital into GLP (a GMX liquidity basket) and opened leveraged short BTC and ETH perpetuals on GMX to offset the basket's volatile assets, leaving a roughly delta-neutral position that harvested GLP fee/esGMX yield. An ATR-based algorithm rebalanced the hedge automatically.",
                'pinned': False,
            },
            {
                'question': 'What are NEU and esNEU?',
                'answer': "NEU is Neutra's utility and governance token (6M max supply). esNEU is escrowed NEU rewarded to stakers and vault users; initiating vesting converts esNEU into NEU linearly over 12 months. Staking NEU shares protocol fees (a 2% annual management fee and 20% performance fee are split 50/50 between operations and staker rewards).",
                'pinned': False,
            },
            {
                'question': 'Was Neutra Finance audited?',
                'answer': 'Yes. The vault contracts were audited by SolidProof (report published in the SolidProof GitHub projects repository) and the protocol also underwent a CertiK audit (delivered April 2023).',
                'pinned': False,
            },
            {
                'question': 'Is Neutra Finance still active?',
                'answer': 'It appears effectively inactive/wound down. Public activity stopped after early 2024, the NEU token trades near all-time lows with negligible volume (roughly single-digit-dollar daily volume), and the primary website domains no longer resolve. Treat the protocol as abandoned or dormant and do not assume the vaults are safely operating.',
                'pinned': True,
            },
        ],
        org_structure=[
            {
                'name': 'Neutra Finance team',
                'role': 'Pseudonymous core team',
                'description': "The protocol was built and operated by a small, largely pseudonymous team publishing under the 'Neutra Finance' identity on Medium and X. No verified individual founder identities are publicly documented; the team collaborated with GMX, RoboLabs, and CertiK on the V2 vault.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Market-neutral / long-short hedge fund',
                'similarity': 'Like a market-neutral hedge fund, the nGLP vault paired a yield-bearing long position (GLP) with offsetting shorts (BTC/ETH perps) so returns came from carry/yield rather than directional market moves, targeting positive returns in any market direction.',
                'differences': 'Fully on-chain, non-custodial, and automated by smart contracts rather than a fund manager; returns depended on DeFi-native yields (GLP fees, esGMX) and were exposed to smart-contract, oracle, and perp-funding risks absent in a traditional fund. No investor accreditation, lockups managed by contracts, and no legal fund wrapper or redemption guarantees.',
            },
        ],
        events=[
            {
                'date': '2022-12-08',
                'title': 'Delta-Neutral GLP Strategy introduced',
                'description': 'Neutra published its delta-neutral GLP strategy design, pairing long GLP with short BTC/ETH GMX perps and backtesting ~9.77% net APR over June-November 2022.',
                'link': 'https://medium.com/@neutrafinance/delta-neutral-glp-strategy-5f86708412c0',
            },
            {
                'date': '2023-03-23',
                'title': 'nGLP Delta-Neutral Vault V2 (alpha) launched',
                'description': 'V2 removed batch/epoch processing (instant deposits/withdrawals), added direct GLP deposits, raised short leverage from 5.5x to 8x, and introduced NEU burn mechanics; built with GMX, RoboLabs, and CertiK.',
                'link': 'https://medium.com/@neutrafinance/nglp-delta-neutral-vault-v2-update-alpha-6b9273f9e621',
            },
            {
                'date': '2024-01-17',
                'title': 'Pivot to Uniswap V3 delta-neutral strategy',
                'description': 'Following a Q3 2023 overhaul, the team announced transitioning its vault to a 100% Uniswap V3 delta-neutral strategy; parameters (D7.5r15) were still being finalized and not yet deployed.',
                'link': 'https://medium.com/@neutrafinance/uniswap-v3-delta-neutral-strategy-part-2-e56dbd0f565b',
            },
        ],
        timeline=[
            {
                'date': '2022-12-08',
                'title': 'GLP delta-neutral strategy design',
                'description': 'Initial delta-neutral GLP vault concept and backtests published.',
                'link': 'https://medium.com/@neutrafinance/delta-neutral-glp-strategy-5f86708412c0',
                'status': 'executed',
            },
            {
                'date': '2023-03-23',
                'title': 'nGLP Vault V2',
                'description': 'Instant deposits/withdrawals, GLP deposits, 8x short leverage, deflationary NEU.',
                'link': 'https://medium.com/@neutrafinance/nglp-delta-neutral-vault-v2-update-alpha-6b9273f9e621',
                'status': 'executed',
            },
            {
                'date': '2023-04-10',
                'title': 'CertiK audit delivered',
                'description': 'CertiK audit of the protocol completed.',
                'link': 'https://skynet.certik.com/projects/neutra-finance',
                'status': 'executed',
            },
            {
                'date': '2024-01-17',
                'title': 'Uniswap V3 delta-neutral pivot (stated)',
                'description': 'Planned transition to a 100% Uniswap V3 delta-neutral vault; optimized parameters stated as not yet finalized/launched.',
                'link': 'https://medium.com/@neutrafinance/uniswap-v3-delta-neutral-strategy-part-2-e56dbd0f565b',
                'status': 'stated',
            },
        ],
        offchain_facts=[
            {
                'key': 'NEU max supply',
                'value': '6,000,000 NEU',
                'freshness': 'static',
                'source': {
                    'label': 'CoinMarketCap - Neutra Finance',
                    'url': 'https://coinmarketcap.com/currencies/neutra-finance/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'NEU all-time high',
                'value': '$3.54 on 2023-02-08 (~99% below ATH as of capture)',
                'freshness': 'static',
                'source': {
                    'label': 'CoinMarketCap - Neutra Finance',
                    'url': 'https://coinmarketcap.com/currencies/neutra-finance/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'GLP delta-neutral strategy backtest APR',
                'value': '~9.77% net annual APR (June-November 2022 backtest, after rebalancing costs) vs ~20% raw GLP APR',
                'freshness': 'static',
                'source': {
                    'label': 'Neutra Finance - Delta Neutral GLP Strategy (Medium)',
                    'url': 'https://medium.com/@neutrafinance/delta-neutral-glp-strategy-5f86708412c0',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'The vaults are complex automated contracts (GLP handling, perp position management, rebalancing). Despite SolidProof and CertiK audits, audited contracts can still contain exploitable bugs, and the protocol now appears unmaintained, increasing the risk of undiscovered or unpatched vulnerabilities.',
            },
            {
                'category': 'Systemic',
                'description': 'The protocol appears abandoned/dormant: no public activity after early 2024, negligible NEU trading volume, and the primary website domains no longer resolve. Depositors risk stranded funds, unmaintained hedges, and inability to reach the team.',
            },
            {
                'category': 'Counterparty',
                'description': 'The strategy is entirely dependent on GMX (GLP as the yield source and GMX perps as the hedge venue). Any GMX exploit, GLP pool imbalance, insolvency, or downtime directly threatens both legs of the position; Neutra has no control over GMX.',
            },
            {
                'category': 'Oracle',
                'description': "Both GLP pricing and GMX perpetual liquidations rely on GMX's oracle price feeds. Oracle manipulation, staleness, or divergence can misprice the hedge, trigger premature liquidation of the short leg, or break delta neutrality.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': "GLP is heavily weighted to stablecoins; a depeg of a constituent stablecoin (or of the deposit asset DAI) would impair the long leg's value independently of the BTC/ETH hedge, causing losses the delta-neutral design does not offset.",
            },
            {
                'category': 'Network',
                'description': 'The protocol runs solely on Arbitrum. Arbitrum sequencer downtime or congestion could block timely rebalancing/withdrawals, leaving the leveraged short hedge unmanaged during volatile periods and exposing positions to liquidation.',
            },
        ],
        competitors=[
            {
                'name': 'Rage Trade',
                'slug': 'rage-trade',
                'rank': 1,
                'positioning': "Arbitrum protocol whose Delta-Neutral GLP vaults (Risk-On / Risk-Off) are the most direct analogue, hedging GLP's BTC/ETH exposure with borrowed-asset shorts.",
                'similarities': 'Same core thesis: hold GLP for yield while hedging its volatile BTC/ETH components to deliver a market-neutral, mostly-stablecoin return on Arbitrum.',
                'differences': 'Rage Trade hedged via Aave/Balancer borrow-and-short flash-loan mechanics rather than GMX perps, and reached materially larger TVL and a more active community than Neutra.',
            },
            {
                'name': 'Umami Finance',
                'slug': None,
                'rank': 2,
                'positioning': 'Arbitrum protocol that offered GLP-based delta-neutral/hedged vaults marketed toward institutional-style yield.',
                'similarities': 'Also built delta-neutral GLP strategies on Arbitrum aimed at stable, hedged yield.',
                'differences': 'Different hedging architecture and risk-tranche design; Umami pivoted its product suite multiple times and is not GMX-perp-hedged in the same single-venue way as Neutra.',
            },
        ],
        audits=[
            {
                'firm': 'CertiK',
                'date': '2023-04-10',
                'url': 'https://skynet.certik.com/projects/neutra-finance',
            },
            {
                'firm': 'SolidProof',
                'date': '2023-03-23',
                'url': 'https://github.com/solidproof/projects/blob/main/Neutra%20Finance/v2_SmartContract_Audit_Solidproof_NeutraFinance.pdf',
            },
        ],
        sources=[
            {
                'label': 'Neutra Finance - Delta Neutral GLP Strategy (Medium, 2022-12-08)',
                'url': 'https://medium.com/@neutrafinance/delta-neutral-glp-strategy-5f86708412c0',
            },
            {
                'label': 'Neutra Finance - nGLP Delta Neutral Vault V2 Update (Medium, 2023-03-23)',
                'url': 'https://medium.com/@neutrafinance/nglp-delta-neutral-vault-v2-update-alpha-6b9273f9e621',
            },
            {
                'label': 'Neutra Finance - Uniswap V3 Delta Neutral Strategy Part 2 (Medium, 2024-01-17)',
                'url': 'https://medium.com/@neutrafinance/uniswap-v3-delta-neutral-strategy-part-2-e56dbd0f565b',
            },
            {
                'label': 'SolidProof - Neutra Finance V2 Smart Contract Audit (GitHub)',
                'url': 'https://github.com/solidproof/projects/blob/main/Neutra%20Finance/v2_SmartContract_Audit_Solidproof_NeutraFinance.pdf',
            },
            {
                'label': 'CertiK Skynet - Neutra Finance project insight',
                'url': 'https://skynet.certik.com/projects/neutra-finance',
            },
            {
                'label': 'CoinMarketCap - Neutra Finance (NEU) price and supply',
                'url': 'https://coinmarketcap.com/currencies/neutra-finance/',
            },
            {
                'label': 'TokenInsight - Neutra Finance (NEU) overview',
                'url': 'https://tokeninsight.com/en/coins/neutra-finance/overview',
            },
        ],
        github='https://github.com/solidproof/projects/tree/main/Neutra%20Finance',
        name="Neutra Finance",
        symbol="",
        tagline="Automated delta-neutral yield strategies.",
        description=(
            "Neutra Finance offers automated delta-neutral strategy vaults that pair "
            "yield-bearing positions with short hedges to target market-neutral "
            "returns on Arbitrum."
        ),
        differentiator=(
            "Packaged delta-neutral strategies (long yield asset + short perp hedge) "
            "as auto-managed vaults for passive market-neutral yield."
        ),
        derivatives_sub_sector="Delta-Neutral",
        derivatives_secondary_tags=["Auto-Strategy"],
        chains=["Arbitrum One"],
        hedge_venue=["GMX"],
        official_docs="https://docs.neutra.finance",
        website="https://neutra.finance",
        twitter="https://x.com/NeutraFinance",
        # No headline tradable token — network TVL sourced from DeFi Llama (path c).
        scale_labels={"tvl": "Protocol TVL"},
    ),
}


# Per-network MemberCoin audit registry (expected count + rationale).
# Used by validate_taxonomy.py --report-member-coins; does not enforce caps at ingest.
DERIVATIVES_MEMBER_COIN_AUDIT: Dict[str, Dict[str, Any]] = {
    "synthetix": {"expected": 1, "rationale": "SNX governance/staking"},
    "aevo": {"expected": 1, "rationale": "AEVO governance"},
    "hyperliquid": {"expected": 1, "rationale": "HYPE governance"},
    "dydx": {"expected": 1, "rationale": "DYDX governance"},
    "gmx": {"expected": 1, "rationale": "GMX governance"},
    "drift-protocol": {"expected": 1, "rationale": "DRIFT governance"},
    "gains-network": {"expected": 1, "rationale": "GNS governance"},
    "ribbon-finance": {"expected": 1, "rationale": "RBN governance (legacy, merged into Aevo)"},
    "dopex": {"expected": 0, "rationale": "DPX has no clean CoinGecko markets entry (TVL via DeFi Llama)"},
    "derive": {"expected": 1, "rationale": "DRV governance (ex-LYRA)"},
    "jones-dao": {"expected": 1, "rationale": "JONES governance"},
    "rage-trade": {"expected": 0, "rationale": "Tokenless delta-neutral vaults (TVL via DeFi Llama)"},
    "neutra-finance": {"expected": 0, "rationale": "Tokenless delta-neutral vaults (TVL via DeFi Llama)"},
}
