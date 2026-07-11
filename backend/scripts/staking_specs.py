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
    components: Optional[List[Dict[str, Any]]] = None,
    faq: Optional[List[Dict[str, Any]]] = None,
    org_structure: Optional[List[Dict[str, str]]] = None,
    tradfi_comparison: Optional[List[Dict[str, str]]] = None,
    risks: Optional[List[Dict[str, Any]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    timeline: Optional[List[Dict[str, Any]]] = None,
    offchain_facts: Optional[List[Dict[str, Any]]] = None,
    sources: Optional[List[Dict[str, Any]]] = None,
    audits: Optional[List[Dict[str, Any]]] = None,
    investment_rounds: Optional[List[Dict[str, Any]]] = None,
    partnerships: Optional[List[Dict[str, Any]]] = None,
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
        "components": components or [],
        "faq": faq or [],
        "org_structure": org_structure or [],
        "tradfi_comparison": tradfi_comparison or [],
        "risks": risks or [],
        "events": events or [],
        "timeline": timeline,
        "offchain_facts": offchain_facts,
        # `build_entity_item` reads these via spec.get("sources") / spec.get("audits").
        "sources": sources or [],
        "audits": audits,
        "investment_rounds": investment_rounds or [],
        "partnerships": partnerships or [],
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
        components=[
            {
                'name': 'stETH (Lido Staked Ether)',
                'description': 'A rebasing ERC-20 liquid staking token minted 1:1 when ETH is deposited. Balances rebase daily to reflect accrued staking rewards net of the protocol fee, so 1 stETH tracks 1 staked ETH plus rewards.',
            },
            {
                'name': 'wstETH (Wrapped stETH)',
                'description': 'A non-rebasing wrapper of stETH whose balance stays constant while its exchange rate to stETH grows. Preferred for DeFi integrations (lending, LPs, L2s) that do not handle rebasing tokens well.',
            },
            {
                'name': 'Staking Router',
                'description': 'Introduced in Lido V2, a modular contract that routes stake to distinct node-operator modules (Curated, Simple DVT, and Community Staking), letting the DAO add operator sets with different trust and decentralization profiles.',
            },
            {
                'name': 'Withdrawal Queue',
                'description': 'The Lido V2 mechanism allowing stETH holders to redeem stETH for ETH at a 1:1 ratio via a queue that mints a withdrawal NFT, fulfilled from staking rewards, buffered deposits, and validator exits.',
            },
            {
                'name': 'Simple DVT Module',
                'description': "Lido's second mainnet operator module, using distributed validator technology (Obol and SSV) to let clusters of solo and community stakers collectively run validators, broadening operator decentralization.",
            },
            {
                'name': 'Dual Governance',
                'description': "A protection layer (live June 2025) that lets stETH/wstETH holders escrow tokens to delay (>1% TVL) or, at a 10% threshold, trigger a 'rage quit' that halts execution of DAO proposals they object to.",
            },
        ],
        faq=[
            {
                'question': 'How does Lido work?',
                'answer': "You deposit ETH into the Lido protocol and receive stETH 1:1. Your ETH is staked across Lido's node-operator set to secure Ethereum, and stETH balances rebase daily to reflect staking rewards minus the 10% protocol fee. stETH stays liquid and usable across DeFi while your underlying ETH remains staked.",
                'pinned': True,
            },
            {
                'question': 'What is the difference between stETH and wstETH?',
                'answer': 'stETH is a rebasing token whose balance grows daily as rewards accrue. wstETH is a wrapped, non-rebasing version that keeps a fixed balance while its value versus stETH increases; it is used in DeFi protocols and on L2s that do not support rebasing tokens.',
                'pinned': False,
            },
            {
                'question': 'What fee does Lido charge?',
                'answer': 'Lido applies a 10% fee on staking rewards only (never on your principal). The fee is split between node operators and the DAO treasury. Users keep 90% of the rewards earned by their staked ETH.',
                'pinned': False,
            },
            {
                'question': 'Can I withdraw my ETH from Lido?',
                'answer': "Yes. Since the Lido V2 upgrade (May 2023, following Ethereum's Shapella upgrade), stETH holders can redeem stETH for ETH at 1:1 through the withdrawal queue. Redemptions can take from hours up to several days depending on demand and validator exit times.",
                'pinned': False,
            },
            {
                'question': 'What are the main risks of using Lido?',
                'answer': 'Key risks include smart-contract bugs, validator slashing or downtime, oracle failure, and stETH trading at a discount to ETH on secondary markets during stress (as happened in June 2022). Lido mitigates these with extensive audits, a diversified operator set, distributed validator technology, and a coverage/insurance fund.',
                'pinned': False,
            },
            {
                'question': 'What is the LDO token used for?',
                'answer': "LDO is Lido's governance token. Holders vote on DAO proposals such as protocol parameters, operator onboarding, and treasury spending. Under Dual Governance, stETH/wstETH holders can also delay or block proposals they oppose.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Lido DAO',
                'role': 'Governing body',
                'description': 'The decentralized organization of LDO holders that governs the protocol via Aragon on-chain votes and Snapshot signaling, controlling upgrades, operator onboarding, fee parameters, and the treasury.',
            },
            {
                'name': 'Lido Labs BORG Foundation',
                'role': 'DAO-adjacent foundation / contributor entity',
                'description': 'A Lido-DAO-adjacent foundation established to coordinate core contributors and operational work supporting the protocol, formed following a Lido DAO Snapshot vote.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Money market fund / liquid deposit receipt',
                'similarity': 'Like a money-market fund share, stETH is a liquid, transferable claim that accrues yield continuously while the underlying capital is put to productive use (staking rewards vs. short-term instruments).',
                'differences': 'There is no fund manager, custodian bank, or redemption gate operator; yield comes from Ethereum protocol issuance rather than interest-bearing securities, and both the token and its yield are fully on-chain and non-custodial.',
            },
        ],
        events=[
            {
                'date': '2020-12-18',
                'title': 'Lido launches on Ethereum mainnet',
                'description': 'The liquid staking protocol went live on Ethereum, introducing stETH so users could stake ETH without the 32 ETH validator minimum while keeping a liquid, DeFi-usable token.',
                'link': 'https://messari.io/project/lido-dao/profile',
            },
            {
                'date': '2022-06-14',
                'title': 'stETH trades at a discount during the 2022 crisis',
                'description': 'Amid the Terra collapse and forced selling by Celsius and Three Arrows Capital, stETH briefly traded several percent below ETH on secondary markets (notably in the Curve pool) before withdrawals existed, though it was never insolvent.',
                'link': 'https://www.coindesk.com/markets/2022/06/14/staked-ether-becomes-focus-of-crypto-stress-from-celsius-to-three-arrows',
            },
            {
                'date': '2023-05-15',
                'title': 'Lido V2 approved, enabling withdrawals',
                'description': "The Lido DAO voted to activate the V2 upgrade, introducing the Staking Router and enabling stETH-to-ETH withdrawals at 1:1 for the first time after Ethereum's Shapella upgrade.",
                'link': 'https://blog.lido.fi/lido-v2-launch/',
            },
            {
                'date': '2024-04-16',
                'title': 'Simple DVT Module goes live on mainnet',
                'description': "Lido's second operator module launched using Obol and SSV distributed validator technology, onboarding clusters of solo and community stakers to broaden node-operator decentralization.",
                'link': 'https://blog.lido.fi/simpledvt-new-phase-for-lido-on-ethereum/',
            },
            {
                'date': '2025-06-30',
                'title': 'Dual Governance activated on mainnet',
                'description': 'The DAO approved and activated Dual Governance, giving stETH/wstETH holders the ability to delay or trigger a rage-quit against DAO proposals they object to.',
                'link': 'https://en.cryptonomist.ch/2025/06/30/lido-dao-revolutionizes-governance-the-dual-model-is-activated-to-protect-ethereum-stakers/',
            },
        ],
        timeline=[
            {
                'date': '2020-12-18',
                'title': 'Mainnet launch (V1) with stETH',
                'description': 'Initial launch of the liquid staking protocol and the stETH token on Ethereum.',
                'link': 'https://messari.io/project/lido-dao/profile',
                'status': 'executed',
            },
            {
                'date': '2023-05-15',
                'title': 'Lido V2 (Staking Router + withdrawals)',
                'description': 'Modular Staking Router and 1:1 stETH-to-ETH withdrawals enabled.',
                'link': 'https://blog.lido.fi/lido-v2-launch/',
                'status': 'executed',
            },
            {
                'date': '2024-04-16',
                'title': 'Simple DVT Module',
                'description': 'Distributed-validator operator module deployed on mainnet via Obol and SSV.',
                'link': 'https://blog.lido.fi/simpledvt-new-phase-for-lido-on-ethereum/',
                'status': 'executed',
            },
            {
                'date': '2025-06-30',
                'title': 'Dual Governance',
                'description': 'stETH-holder veto/rage-quit protection layer activated on mainnet.',
                'link': 'https://blog.lido.fi/participating-in-dual-governance-a-guide-for-steth-holders/',
                'status': 'executed',
            },
            {
                'date': '2025-12-01',
                'title': 'Lido V3 (stVaults)',
                'description': 'V3 introduces customizable staking vaults (stVaults) allowing configurable, isolated staking setups; extensive V3 audits by Certora, MixBytes, and Consensys Diligence completed in Q4 2025.',
                'link': 'https://hackmd.io/@lido/v3-whitepaper',
                'status': 'stated',
            },
        ],
        offchain_facts=[
            {
                'key': 'Protocol fee on staking rewards',
                'value': '10% of staking rewards, split between node operators and the DAO treasury; stakers keep 90%',
                'freshness': 'static',
                'source': {
                    'label': 'Lido - Protocol Fee',
                    'url': 'https://lido.fi/how-lido-works/protocol-fee',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Mainnet launch date',
                'value': 'December 18, 2020',
                'freshness': 'static',
                'source': {
                    'label': 'Messari - Lido DAO profile',
                    'url': 'https://messari.io/project/lido-dao/profile',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Withdrawals enabled',
                'value': 'May 15, 2023 with the Lido V2 upgrade (1:1 stETH-to-ETH redemption)',
                'freshness': 'static',
                'source': {
                    'label': 'Lido V2 Mainnet Launch',
                    'url': 'https://blog.lido.fi/lido-v2-launch/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Reserve / Depeg',
                'description': 'stETH is not hard-pegged and can trade below ETH on secondary markets during stress. In June 2022, cascading selling by Celsius and Three Arrows Capital plus the Terra collapse pushed stETH to a multi-percent discount to ETH in the Curve pool before native withdrawals existed.',
            },
            {
                'category': 'Governance',
                'description': "Lido's very large share of Ethereum staking concentrates influence in LDO governance and its operator set, raising concerns about single-protocol control of validation. The Dual Governance system (live June 2025) was introduced specifically so stETH holders can veto or rage-quit DAO decisions they view as harmful.",
            },
            {
                'category': 'Network',
                'description': "Because Lido delegates to a set of professional node operators and DVT clusters, validator slashing or extended downtime is passed through to stETH holders. Lido reports negligible historical slashing, but a large correlated slashing or client-bug event across operators would directly reduce stETH's backing.",
            },
            {
                'category': 'Oracle',
                'description': 'stETH rebases and the withdrawal accounting depend on the Lido oracle reporting beacon-chain balances. A compromised, buggy, or manipulated oracle report could misstate rewards or the stETH:ETH exchange rate, which is why the oracle has been repeatedly re-audited (e.g., Oracle v7.1 in 2026).',
            },
            {
                'category': 'Smart Contract',
                'description': 'The protocol comprises complex, upgradeable contracts (Staking Router, withdrawal queue, Dual Governance, stVaults). Despite 90+ audits, high-severity findings have surfaced in reviews (e.g., critical/high issues flagged and fixed during Lido V3 audits in late 2025), so residual smart-contract risk remains.',
            },
        ],
        competitors=[
            {
                'name': 'Rocket Pool',
                'slug': 'rocket-pool',
                'rank': 1,
                'positioning': 'The leading decentralized, permissionless Ethereum liquid staking alternative (rETH).',
                'similarities': 'Also an Ethereum liquid staking protocol issuing a yield-bearing ETH token usable across DeFi.',
                'differences': 'Permissionless node operation with RPL collateral bonds and a non-rebasing rETH token; far smaller than Lido but more decentralized at the operator layer.',
            },
            {
                'name': 'Coinbase (cbETH)',
                'slug': 'coinbase-cbeth',
                'rank': 2,
                'positioning': 'The largest centralized-exchange liquid staking token.',
                'similarities': 'Provides a liquid, yield-bearing staked-ETH token widely used in DeFi.',
                'differences': 'Custodial and operated by a single regulated company (Coinbase) rather than a DAO with an independent operator set; KYC and centralized control over the underlying validators.',
            },
            {
                'name': 'ether.fi',
                'slug': 'ether-fi',
                'rank': 3,
                'positioning': 'A fast-growing decentralized liquid staking and restaking protocol (eETH/weETH).',
                'similarities': 'Non-custodial Ethereum liquid staking with a DeFi-usable staked token.',
                'differences': "Emphasizes native restaking (EigenLayer) and delegated key custody design, targeting restaking yield rather than pure staking like Lido's core product.",
            },
            {
                'name': 'Binance (WBETH)',
                'slug': 'binance-wbeth',
                'rank': 4,
                'positioning': 'Major exchange-issued wrapped beacon ETH staking token.',
                'similarities': 'Liquid, yield-bearing staked-ETH representation with deep exchange liquidity.',
                'differences': "Custodial, operated by Binance; centralized validator control and exchange dependency versus Lido's DAO-governed model.",
            },
        ],
        investment_rounds=[
            {
                'date': '2020-12-01',
                'round': 'Seed',
                'amountUsd': 2000000,
                'amountLabel': '$2M',
                'investors': [
                    'Semantic Ventures',
                    'ParaFi Capital',
                    'Terra',
                    'KR1',
                    'Stakefish',
                    'Staking Facilities',
                    'Rune Christensen',
                    'Stani Kulechov',
                    'Kain Warwick',
                ],
                'link': 'https://www.theblock.co/linked/103874/eth2-staking-protocol-lido-raises-73-million-paradigm',
            },
            {
                'date': '2021-05-01',
                'round': 'Strategic (LDO token sale)',
                'amountUsd': 73000000,
                'amountLabel': '$73M',
                'investors': [
                    'Paradigm',
                    'Coinbase Ventures',
                    'Three Arrows Capital',
                    'Jump Trading',
                    'Alameda Research',
                    'Digital Currency Group',
                ],
                'link': 'https://www.theblock.co/linked/103874/eth2-staking-protocol-lido-raises-73-million-paradigm',
            },
            {
                'date': '2022-03-01',
                'round': 'Strategic (a16z LDO purchase)',
                'amountUsd': 70000000,
                'amountLabel': '$70M',
                'investors': [
                    'Andreessen Horowitz (a16z)',
                ],
                'link': 'https://www.coinspeaker.com/lido-finance-70m-funding-a16z/',
            },
        ],
        audits=[
            {
                'firm': 'OpenZeppelin',
                'date': '2025-02-01',
                'url': 'https://docs.lido.fi/security/audits/',
            },
            {
                'firm': 'Statemind',
                'date': '2024-10-01',
                'url': 'https://docs.lido.fi/security/audits/',
            },
            {
                'firm': 'Certora',
                'date': '2025-12-01',
                'url': 'https://docs.lido.fi/security/audits/',
            },
            {
                'firm': 'Consensys Diligence',
                'date': '2025-12-01',
                'url': 'https://docs.lido.fi/security/audits/',
            },
            {
                'firm': 'MixBytes',
                'date': '2025-12-01',
                'url': 'https://docs.lido.fi/security/audits/',
            },
            {
                'firm': 'ChainSecurity',
                'date': '2023-02-01',
                'url': 'https://docs.lido.fi/security/audits/',
            },
        ],
        sources=[
            {
                'label': 'Lido Docs - Protocol Audits',
                'url': 'https://docs.lido.fi/security/audits/',
            },
            {
                'label': 'Lido - Protocol Fee',
                'url': 'https://lido.fi/how-lido-works/protocol-fee',
            },
            {
                'label': 'Lido V2 Mainnet Launch (blog)',
                'url': 'https://blog.lido.fi/lido-v2-launch/',
            },
            {
                'label': 'Simple DVT: A New Phase For Lido (blog)',
                'url': 'https://blog.lido.fi/simpledvt-new-phase-for-lido-on-ethereum/',
            },
            {
                'label': 'Participating in Dual Governance (blog)',
                'url': 'https://blog.lido.fi/participating-in-dual-governance-a-guide-for-steth-holders/',
            },
            {
                'label': 'The Block - Lido raises $73M led by Paradigm',
                'url': 'https://www.theblock.co/linked/103874/eth2-staking-protocol-lido-raises-73-million-paradigm',
            },
            {
                'label': 'CoinDesk - Nansen on the stETH de-peg (2022)',
                'url': 'https://www.coindesk.com/business/2022/06/29/nansen-casts-blame-for-steth-de-peg-on-terra',
            },
        ],
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
        components=[
            {
                'name': 'rETH (liquid staking token)',
                'description': 'A reward-bearing ERC-20 that any user can mint by depositing ETH (no minimum). rETH does not rebase; instead its exchange rate to ETH increases as staking rewards accrue. It gives passive stakers liquid exposure to Ethereum staking yield without running a node.',
            },
            {
                'name': 'Minipools / node operators',
                'description': 'Permissionless node operators run validators by pairing their own ETH bond with ETH from the rETH deposit pool. Pre-Atlas a minipool required 16 ETH from the operator; the Atlas upgrade introduced 8-ETH minipools (LEB8), and the Saturn I upgrade further reduced the bond toward 4 ETH per validator, improving capital efficiency and rETH-collateralization capacity.',
            },
            {
                'name': 'RPL (protocol/collateral token)',
                'description': 'Node operators historically staked RPL as an insurance bond/collateral against their commission and to qualify for RPL inflation rewards. RPL secures the protocol and is used in governance. Post-Saturn, RPL is being repositioned to earn a share of protocol ETH revenue rather than relying on RPL inflation emissions.',
            },
            {
                'name': 'Megapools (Saturn)',
                'description': 'Introduced in Saturn I, megapools let a single node operator group multiple validators under one contract for gas and management efficiency, and support the reduced 4-ETH bond model plus express/standard deposit queues.',
            },
            {
                'name': 'Oracle DAO (oDAO)',
                'description': 'A permissioned set of members (including entities such as Consensys and Sigma Prime) that shuttle data between the Ethereum consensus and execution layers, submit oracle data (e.g., the rETH exchange rate and network balances) via threshold consensus, and historically handled protocol parameter and upgrade duties.',
            },
            {
                'name': 'Protocol DAO (pDAO)',
                'description': 'The token-holder governance body. The Houston upgrade (2024) moved the pDAO fully on-chain with an optimistic fraud-proof system, letting node operators raise, vote on, and challenge proposals directly on-chain, with Snapshot still used for gas-free signaling votes.',
            },
        ],
        faq=[
            {
                'question': 'What is rETH and how does it earn yield?',
                'answer': "rETH is Rocket Pool's liquid staking token. When you deposit ETH you receive rETH, which does not rebase; instead its ETH exchange rate rises over time as staking rewards accrue, so 1 rETH is redeemable for a growing amount of ETH.",
                'pinned': True,
            },
            {
                'question': 'How is Rocket Pool different from Lido?',
                'answer': 'Rocket Pool is permissionless on the node-operator side: anyone can run a validator by posting an ETH bond plus (historically) RPL collateral, rather than relying on a curated/whitelisted operator set. This is designed to make the validator layer more decentralized.',
                'pinned': False,
            },
            {
                'question': 'How much ETH do I need to run a Rocket Pool node?',
                'answer': 'The operator bond has fallen over time. Rocket Pool originally required 16 ETH per minipool; the Atlas upgrade added 8-ETH minipools (LEB8) and the Saturn I upgrade moved toward a 4-ETH bond per validator via megapools.',
                'pinned': False,
            },
            {
                'question': 'What does RPL do?',
                'answer': "RPL is Rocket Pool's collateral and governance token. Node operators stake RPL as an insurance bond; RPL is also used for pDAO governance. Following the Saturn tokenomics rework, staked RPL is being made to earn a share of protocol ETH revenue instead of relying on RPL inflation emissions.",
                'pinned': False,
            },
            {
                'question': 'Is Rocket Pool audited?',
                'answer': 'Yes. The core protocol was audited by Sigma Prime, Consensys Diligence, and Trail of Bits before mainnet, with additional Sigma Prime and Consensys Diligence reviews for later upgrades such as Atlas. Rocket Pool also runs an Immunefi bug bounty with a maximum payout of $150,000.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'David Rugendyke',
                'role': 'Founder / Lead Engineer',
                'description': 'Original author of the 2017 Rocket Pool whitepaper and long-time lead developer of the protocol.',
            },
            {
                'name': 'Darren Langley',
                'role': 'General Manager',
                'description': 'Leads day-to-day operations and has authored core team communications on protocol DAO governance.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Money market / dividend-reinvesting fund share',
                'similarity': 'rETH is a single fungible instrument whose per-unit value compounds automatically as underlying yield accrues, similar to an accumulating fund share where distributions are reinvested rather than paid out.',
                'differences': 'rETH is fully on-chain, redeemable 24/7 against a smart-contract deposit pool, has no fund manager or NAV cutoff, and its yield derives from Ethereum protocol staking rewards, which carry slashing and smart-contract risk rather than credit/interest-rate risk.',
            },
        ],
        events=[
            {
                'date': '2021-11-09',
                'title': 'Rocket Pool mainnet launch',
                'description': 'Rocket Pool launched publicly on Ethereum mainnet via a staged rollout, making rETH liquid staking and permissionless node operation available for the first time.',
                'link': 'https://medium.com/rocket-pool/where-we-are-and-whats-to-come-7f5f932e9035',
            },
            {
                'date': '2021-09-08',
                'title': 'Immunefi bug bounty launched',
                'description': "Rocket Pool's bug bounty program on Immunefi went live, with a maximum critical payout of $150,000.",
                'link': 'https://immunefi.com/bug-bounty/rocketpool/information/',
            },
        ],
        timeline=[
            {
                'date': '2022-09-01',
                'title': 'Redstone upgrade',
                'description': 'First major upgrade, made Rocket Pool compatible with The Merge and introduced features including the opt-in Smoothing Pool for priority fees.',
                'link': 'https://medium.com/rocket-pool/rocket-pool-atlas-upgrade-7c69e39a3d5f',
                'status': 'executed',
            },
            {
                'date': '2023-04-18',
                'title': 'Atlas upgrade (8-ETH minipools / LEB8)',
                'description': 'Reduced the node-operator bond from 16 ETH to 8 ETH (matched with 24 ETH from the deposit pool), enabled solo-staker migration, unified the minipool queue, and cut minipool creation gas.',
                'link': 'https://docs.rocketpool.net/guides/atlas/whats-new.html',
                'status': 'executed',
            },
            {
                'date': '2024-06-17',
                'title': 'Houston upgrade (on-chain pDAO)',
                'description': 'Moved the Protocol DAO fully on-chain with an optimistic fraud-proof governance system, letting node operators raise, vote on, and challenge proposals directly on-chain.',
                'link': 'https://medium.com/rocket-pool/rocket-pool-houston-launch-b056ca1a6c10',
                'status': 'executed',
            },
            {
                'date': '2024-10-28',
                'title': 'Saturn 0 (tokenomics rework prelude)',
                'description': 'Deployed parameter changes that eliminated the mandatory RPL bond minimum for new minipools, reducing friction for node operators ahead of the larger Saturn tokenomics rework.',
                'link': 'https://rpips.rocketpool.net/tokenomics-explainers/005-rework-prelude',
                'status': 'executed',
            },
            {
                'date': '2026-02-18',
                'title': 'Saturn I upgrade (megapools, 4-ETH bond, RPL fee switch)',
                'description': 'Introduced megapools grouping multiple validators under one contract, reduced the per-validator ETH bond toward 4 ETH, added express/standard queues and DAO-adjustable revenue splits, and activated redirection of a portion of protocol ETH staking revenue to staked RPL.',
                'link': 'https://saturn.rocketpool.net/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'RPL initial supply / inflation model',
                'value': '18,000,000 RPL initial supply with 5% annual inflation, split 70% to bonded nodes, 15% to oracle nodes, and 15% to the pDAO',
                'freshness': 'static',
                'source': {
                    'label': 'Rocket Pool — Staking Protocol Part 3 (David Rugendyke)',
                    'url': 'https://medium.com/rocket-pool/rocket-pool-staking-protocol-part-3-3029afb57d4c',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Immunefi max bug bounty',
                'value': '$150,000 maximum critical smart-contract payout',
                'freshness': 'static',
                'source': {
                    'label': 'Rocket Pool Bug Bounty — Immunefi',
                    'url': 'https://immunefi.com/bug-bounty/rocketpool/information/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Saturn I bond reduction',
                'value': 'Operator ETH requirement reduced to 4 ETH per validator via megapools',
                'freshness': 'static',
                'source': {
                    'label': 'Rocket Pool Saturn I info site',
                    'url': 'https://saturn.rocketpool.net/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'rETH minting/burning, the deposit pool, and minipool/megapool contracts hold and route large amounts of ETH. A bug in the newer Saturn megapool contracts or the rETH exchange-rate accounting could impair redemptions or lock funds despite audits.',
            },
            {
                'category': 'Oracle',
                'description': 'The rETH:ETH exchange rate and network balances are set by oDAO members submitting data via threshold consensus (default 51%). Collusion, compromise, or a stale/incorrect oracle submission by oDAO members could mis-price rETH.',
            },
            {
                'category': 'Collateral',
                'description': "Node operators post an ETH bond plus (historically) RPL as insurance collateral. If a validator is slashed or penalized beyond the operator's bond, or if RPL's value falls sharply relative to the ETH being insured, the buffer protecting rETH holders can be eroded.",
            },
            {
                'category': 'Counterparty',
                'description': "rETH is backed by validators run by independent, permissionless node operators. Operator downtime, poor performance, or failure to exit validators on request can drag on rETH yield and complicate redemptions, and rETH holders rely on those operators honoring the protocol's economics.",
            },
            {
                'category': 'Governance',
                'description': 'Control is split between the on-chain pDAO (RPL holders) and the permissioned oDAO. Concentrated RPL voting power, low participation, or the trusted oDAO set can push through parameter or upgrade changes (e.g., the Saturn revenue-split levers) that materially alter operator and rETH-holder economics.',
            },
        ],
        competitors=[
            {
                'name': 'Lido',
                'slug': 'lido',
                'rank': 1,
                'positioning': 'The dominant ETH liquid staking protocol by market share (stETH).',
                'similarities': 'Both mint a liquid ETH staking token and target passive stakers seeking liquid yield.',
                'differences': "Lido uses a curated/whitelisted node-operator set, whereas Rocket Pool's node layer is permissionless with an ETH+RPL bond, aiming for greater validator decentralization. Lido's stETH rebases while rETH is a non-rebasing exchange-rate token.",
            },
            {
                'name': 'Coinbase (cbETH)',
                'slug': 'coinbase-cbeth',
                'rank': 2,
                'positioning': 'Centralized-exchange-operated ETH liquid staking token.',
                'similarities': 'Offers a liquid, non-rebasing ETH staking token accruing staking yield.',
                'differences': 'cbETH is fully custodial and permissioned (validators run by Coinbase), whereas Rocket Pool is non-custodial and permissionless at the operator level.',
            },
            {
                'name': 'StakeWise',
                'slug': 'stakewise',
                'rank': 3,
                'positioning': 'Permissionless ETH staking protocol with vault-based operator model (osETH).',
                'similarities': 'Both are decentralization-focused, non-custodial ETH liquid staking protocols allowing independent operators.',
                'differences': "StakeWise v3 uses isolated staking vaults and osETH minted against staked collateral, a different architecture from Rocket Pool's shared deposit pool and RPL-bonded minipools.",
            },
            {
                'name': 'Frax Ether (frxETH/sfrxETH)',
                'slug': None,
                'rank': 4,
                'positioning': 'ETH liquid staking product from the Frax ecosystem.',
                'similarities': "Provides a liquid ETH staking derivative competing for rETH's passive-staker demand.",
                'differences': "Frax splits its LST into a base token and a yield-bearing token and runs operators more centrally, versus Rocket Pool's permissionless operator set and single rETH token.",
            },
        ],
        audits=[
            {
                'firm': 'Sigma Prime',
                'date': '2021-04-30',
                'url': 'https://rocketpool.net/files/audits/sigma-prime-audit.pdf',
            },
            {
                'firm': 'Trail of Bits',
                'date': '2021-04-30',
                'url': 'https://github.com/trailofbits/publications/blob/master/reviews/RocketPool.pdf',
            },
            {
                'firm': 'Consensys Diligence (Atlas v1.2)',
                'date': '2023-01-31',
                'url': 'https://diligence.consensys.io/audits/2023/01/rocket-pool-atlas-v1.2/',
            },
            {
                'firm': 'Sigma Prime (Atlas)',
                'date': '2023-04-18',
                'url': 'https://rocketpool.net/files/audits/sigma-prime-audit-atlas.pdf',
            },
        ],
        sources=[
            {
                'label': 'Saturn I upgrade info site',
                'url': 'https://saturn.rocketpool.net/',
            },
            {
                'label': 'Rocket Pool Atlas upgrade (Medium)',
                'url': 'https://medium.com/rocket-pool/rocket-pool-atlas-upgrade-7c69e39a3d5f',
            },
            {
                'label': "Atlas: What's New (docs)",
                'url': 'https://docs.rocketpool.net/guides/atlas/whats-new.html',
            },
            {
                'label': 'Houston launch (Medium)',
                'url': 'https://medium.com/rocket-pool/rocket-pool-houston-launch-b056ca1a6c10',
            },
            {
                'label': 'Rocket Pool bug bounty (Immunefi)',
                'url': 'https://immunefi.com/bug-bounty/rocketpool/information/',
            },
            {
                'label': 'Sigma Prime protocol audit (PDF)',
                'url': 'https://rocketpool.net/files/audits/sigma-prime-audit.pdf',
            },
            {
                'label': 'Staking Protocol Part 3 — RPL tokenomics (Medium)',
                'url': 'https://medium.com/rocket-pool/rocket-pool-staking-protocol-part-3-3029afb57d4c',
            },
        ],
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
        components=[
            {
                'name': 'WBETH (Wrapped Beacon ETH)',
                'description': 'A value-accruing ERC-20/BEP-20 liquid staking token issued by Binance. 1 WBETH represents 1 BETH plus the ETH staking rewards accrued since 2023-04-27 08:00 UTC. It is reward-bearing: rather than rebasing balances, its BETH/ETH conversion rate rises daily as rewards compound. Deployed at contract 0xa2E3356610840701BDf5611a53974510Ae27E2e1 on both Ethereum and BNB Smart Chain.',
            },
            {
                'name': 'BETH (Beacon ETH)',
                'description': "Binance's original 1:1 tokenized representation of staked ETH. BETH holders receive daily staking rewards distributed as additional BETH to their Binance Spot Wallet. BETH can be wrapped into WBETH (and unwrapped) at zero fees on the ETH Staking page; WBETH is the wrapper that makes the staked position portable to on-chain DeFi.",
            },
            {
                'name': 'ETH Staking service (Binance)',
                'description': "The custodial staking product (rebranded from 'ETH 2.0 Staking' on 2023-04-27) through which Binance stakes users' ETH on the Ethereum beacon chain and issues BETH/WBETH. Wrap, stake and redeem functions pause daily from 23:45 to 00:15 UTC to apply the conversion-rate update.",
            },
            {
                'name': 'On-chain wrap/unwrap contract',
                'description': 'The smart contract that converts between BETH and WBETH. WBETH is minted/redeemed at the prevailing dynamic conversion rate, allowing self-custody holders to hold and use WBETH across Ethereum and BNB Smart Chain DeFi while remaining eligible for accrued ETH staking rewards.',
            },
        ],
        faq=[
            {
                'question': 'What is Binance WBETH?',
                'answer': 'WBETH (Wrapped Beacon ETH) is a reward-bearing liquid staking token offered by Binance. 1 WBETH equals 1 BETH plus all ETH staking rewards accrued since 2023-04-27 08:00 UTC. Its value grows over time in accordance with the daily ETH staking APR, rather than by increasing the token count.',
                'pinned': True,
            },
            {
                'question': 'How is WBETH different from BETH?',
                'answer': "BETH is Binance's 1:1 representation of staked ETH; BETH holders receive daily rewards distributed as additional BETH into their Spot Wallet. WBETH wraps BETH into a single value-accruing token whose BETH/ETH conversion rate increases daily, so rewards auto-compound inside the token. WBETH is designed to be used on-chain in DeFi across Ethereum and BNB Smart Chain.",
                'pinned': False,
            },
            {
                'question': 'How does WBETH accrue staking rewards?',
                'answer': 'WBETH does not rebase. Each WBETH accrues ETH staking rewards daily in line with the ETH staking APR, and this is reflected through a dynamic BETH/WBETH conversion rate that Binance updates once per day. Because the WBETH price in BETH is always greater than 1 and rises over time, redeeming WBETH later returns more BETH/ETH than was originally wrapped.',
                'pinned': False,
            },
            {
                'question': 'What are the fees to wrap or unwrap WBETH?',
                'answer': "Wrapping BETH into WBETH and unwrapping WBETH back to BETH on Binance's ETH Staking page are done at zero fees. Note that staking, wrap and redeem functions are paused daily from 23:45 to 00:15 UTC to support the daily conversion-rate update.",
                'pinned': False,
            },
            {
                'question': 'On which networks is WBETH available?',
                'answer': 'WBETH is deployed on both the Ethereum network and BNB Smart Chain at the same address, 0xa2E3356610840701BDf5611a53974510Ae27E2e1, enabling holders to use it across DeFi protocols on both chains.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Binance',
                'role': 'Issuer and custodial operator',
                'description': "Binance issues WBETH/BETH, custodies the underlying ETH, and runs the validators that stake users' ETH on the Ethereum beacon chain. The conversion rate, reward accrual, and wrap/redeem functions are all controlled by Binance as a centralized custodial issuer.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Bank-issued accumulating money-market / deposit product',
                'similarity': "Like an accumulating (non-distributing) yield product from a regulated institution, WBETH reflects earned yield by increasing in unit value rather than paying out separate distributions; the issuer takes custody of the underlying asset and manages the yield-generating activity on the holder's behalf.",
                'differences': 'WBETH is a freely transferable on-chain token usable across DeFi, exposes the holder to smart-contract and Ethereum validator/slashing risk, has no deposit insurance, and its issuer (Binance) is a crypto exchange rather than a licensed bank.',
            },
        ],
        events=[
            {
                'date': '2023-04-27',
                'title': 'WBETH launched on Binance ETH Staking',
                'description': "Binance rebranded 'ETH 2.0 Staking' to 'ETH Staking' and introduced Wrapped Beacon ETH (WBETH) effective 2023-04-27 08:00 UTC. From launch, users could wrap BETH into WBETH and unwrap at zero fees; the initial BETH:WBETH rate was 1:1.",
                'link': 'https://www.binance.com/en/support/announcement/binance-introduces-wrapped-beacon-eth-wbeth-on-eth-staking-a1197f34d832445db41654ad01f56b4d',
            },
        ],
        timeline=[
            {
                'date': '2023-04-27',
                'title': 'WBETH introduced (ETH Staking rebrand)',
                'description': 'Binance introduces WBETH on ETH Staking; 1 WBETH = 1 BETH + accrued rewards from 2023-04-27 08:00 UTC. Wrap/unwrap at zero fees, initial 1:1 rate.',
                'link': 'https://www.binance.com/en/support/announcement/binance-introduces-wrapped-beacon-eth-wbeth-on-eth-staking-a1197f34d832445db41654ad01f56b4d',
                'status': 'executed',
            },
            {
                'date': '2023-04-28',
                'title': 'Daily conversion-rate updates begin',
                'description': 'The dynamic BETH/WBETH conversion rate begins updating daily at 00:00 UTC (from 2023-04-28), with stake/wrap/redeem paused daily from 23:45 to 00:15 UTC to apply the update.',
                'link': 'https://www.binance.com/en/support/faq/what-is-wbeth-e252366155174ba6887f6b32e3798273',
                'status': 'executed',
            },
            {
                'date': '2023-08-31',
                'title': 'BETH phased out in favor of WBETH',
                'description': 'Binance announced deprecation of BETH across products: delisting of BETH/ETH, BETH/USDT and BETH/BUSD spot pairs on 2023-10-11, removal from Simple Earn (2023-10-10), Auto-Invest conversion of BETH to WBETH from 2023-09-08, and end of BETH loan collateral use. WBETH/ETH and WBETH/USDT pairs remain, consolidating WBETH as the primary token.',
                'link': 'https://www.binance.com/en/support/announcement/important-updates-on-beth-and-wbeth-84e6d7df84b04d6180a267385d0a0862',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'WBETH launch date',
                'value': '2023-04-27 08:00 UTC',
                'freshness': 'static',
                'source': {
                    'label': 'Binance Support - Introduces WBETH on ETH Staking',
                    'url': 'https://www.binance.com/en/support/announcement/binance-introduces-wrapped-beacon-eth-wbeth-on-eth-staking-a1197f34d832445db41654ad01f56b4d',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'WBETH contract address (Ethereum & BNB Smart Chain)',
                'value': '0xa2E3356610840701BDf5611a53974510Ae27E2e1',
                'freshness': 'static',
                'source': {
                    'label': 'Binance Support - What Is WBETH?',
                    'url': 'https://www.binance.com/en/support/faq/what-is-wbeth-e252366155174ba6887f6b32e3798273',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Wrap/unwrap fee',
                'value': 'Zero fees; conversion rate updated daily at 00:00 UTC',
                'freshness': 'static',
                'source': {
                    'label': 'Binance Support - What Is WBETH?',
                    'url': 'https://www.binance.com/en/support/faq/what-is-wbeth-e252366155174ba6887f6b32e3798273',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': "WBETH is a custodial, exchange-issued token. Binance takes custody of the underlying ETH, runs the validators, and unilaterally controls the conversion rate, reward accrual, and wrap/redeem functions. Holders rely entirely on Binance's solvency, honesty, and operational continuity; there is no on-chain, trust-minimized claim on the staked ETH beyond Binance's redemption promise.",
            },
            {
                'category': 'Regulatory',
                'description': "As a token issued by a centralized global exchange that has faced significant regulatory action across jurisdictions, WBETH is exposed to enforcement, licensing, delisting, or service-restriction risk. Regulatory action against Binance's staking or custody operations could impair redemptions, secondary-market liquidity, or availability in certain regions.",
            },
            {
                'category': 'Network',
                'description': "The underlying ETH is staked on the Ethereum beacon chain and is subject to validator slashing, penalties for downtime, and beacon-chain/consensus risks. Adverse validator performance or protocol-level events on Ethereum reduce the rewards that accrue to WBETH's conversion rate.",
            },
            {
                'category': 'Smart Contract',
                'description': "WBETH relies on Binance's wrap/redeem and token contracts deployed on Ethereum and BNB Smart Chain (0xa2E3356610840701BDf5611a53974510Ae27E2e1). Bugs, upgrade/admin key compromise, or exploits in these contracts or in downstream DeFi integrations could lead to loss of funds or a break in the peg between WBETH and its intended value.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': "WBETH's market price can deviate from its intrinsic (conversion-rate-implied) value, especially in stressed liquidity conditions or if confidence in the issuer falls. Because redemption to ETH is gated through Binance's custodial process, secondary-market WBETH can trade at a discount to fair value during periods of stress.",
            },
        ],
        competitors=[
            {
                'name': 'Lido (stETH / wstETH)',
                'slug': 'lido',
                'rank': 1,
                'positioning': 'Dominant decentralized liquid staking protocol on Ethereum, commanding roughly half of the liquid staking market by TVL.',
                'similarities': 'Both provide a liquid staking token representing staked ETH plus accrued rewards that can be used across DeFi.',
                'differences': 'Lido is a permissionless, non-custodial protocol run by a DAO with a distributed validator set; stETH rebases (wstETH is the wrapped, value-accruing version). WBETH is a single centralized, custodial exchange-issued token with Binance as sole operator.',
            },
            {
                'name': 'Rocket Pool (rETH)',
                'slug': 'rocket-pool',
                'rank': 2,
                'positioning': 'The most decentralized major Ethereum liquid staking protocol, using permissionless node operators.',
                'similarities': 'Issues a value-accruing liquid staking token (rETH) that, like WBETH, grows in ETH value rather than rebasing balances.',
                'differences': 'Rocket Pool is fully non-custodial and permissionless with a decentralized node-operator network and RPL collateral; WBETH is custodial and centrally operated by Binance.',
            },
            {
                'name': 'Coinbase (cbETH)',
                'slug': 'coinbase-cbeth',
                'rank': 3,
                'positioning': 'The closest direct analogue: a value-accruing liquid staking token issued by a large centralized exchange.',
                'similarities': 'Both are exchange-issued, custodial, reward-bearing wrapped staking tokens whose exchange rate to ETH rises over time; both target CEX users seeking DeFi portability.',
                'differences': 'Issued and custodied by Coinbase rather than Binance, so counterparty and regulatory exposure map to a different entity and jurisdiction.',
            },
        ],
        sources=[
            {
                'label': 'Binance Support - Binance Introduces Wrapped Beacon ETH (WBETH) on ETH Staking',
                'url': 'https://www.binance.com/en/support/announcement/binance-introduces-wrapped-beacon-eth-wbeth-on-eth-staking-a1197f34d832445db41654ad01f56b4d',
            },
            {
                'label': 'Binance Support - What Is WBETH?',
                'url': 'https://www.binance.com/en/support/faq/what-is-wbeth-e252366155174ba6887f6b32e3798273',
            },
            {
                'label': 'Binance Support - Important Updates on BETH and WBETH',
                'url': 'https://www.binance.com/en/support/announcement/important-updates-on-beth-and-wbeth-84e6d7df84b04d6180a267385d0a0862',
            },
            {
                'label': 'Binance Research - Wrapped Beacon ETH (WBETH)',
                'url': 'https://www.binance.com/en/research/projects/wrapped-beacon-eth-wbeth',
            },
            {
                'label': 'Etherscan - Wrapped Binance Beacon ETH (wBETH) token contract',
                'url': 'https://etherscan.io/token/0xa2E3356610840701BDf5611a53974510Ae27E2e1',
            },
            {
                'label': 'DeFiLlama - Binance staked ETH protocol (TVL context)',
                'url': 'https://defillama.com/protocol/binance-staked-eth',
            },
        ],
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
        components=[
            {
                'name': 'cbETH ERC-20 token',
                'description': 'An ERC-20 utility token (contract 0xBe9895146f7AF43049ca1c1AE358B0541Ea49704 on Ethereum) that represents ETH staked through Coinbase plus its accrued staking rewards. It is freely transferable, tradeable on DEXs, and usable in DeFi while the underlying ETH stays staked with the protocol.',
            },
            {
                'name': 'Non-rebasing conversion-rate mechanism',
                'description': 'cbETH is non-rebasing: holder balances stay fixed while a cbETH-to-ETH conversion rate rises over time as staking rewards accrue (rewards minus penalties). Conversion Rate = Total Wrapped Staked ETH / Total cbETH Supply; the rate and balance were initialized on June 16, 2022 19:34 UTC.',
            },
            {
                'name': 'ExchangeRateUpdater / oracle',
                'description': 'An on-chain ExchangeRateUpdater contract (0x9b37180d847B27ADC13C2277299045C1237Ae281) updates the cbETH exchange rate periodically. Third-party price feeds (e.g. a Chainlink cbETH/ETH feed) publish the rate to DeFi with a heartbeat / deviation-triggered update.',
            },
            {
                'name': 'Wrap / unwrap flow',
                'description': 'Coinbase customers wrap staked ETH into cbETH and unwrap cbETH back to ETH inside the Coinbase platform with no fee on the conversion itself. Unwrapping is subject to a processing/unstaking delay (minimum roughly a day, longer in periods of high demand).',
            },
        ],
        faq=[
            {
                'question': 'What is cbETH?',
                'answer': 'cbETH (Coinbase Wrapped Staked ETH) is an ERC-20 utility token that gives customers a liquid representation of ETH staked through Coinbase, plus the staking rewards it has accrued. It lets holders sell, transfer, or use their staked ETH in DeFi while the underlying ETH remains staked.',
                'pinned': True,
            },
            {
                'question': 'Does cbETH trade 1:1 with ETH?',
                'answer': 'No. cbETH is intentionally not pegged 1:1 to ETH. It is non-rebasing: instead of the balance growing, the cbETH-to-ETH conversion rate rises over time as staking rewards accrue, so 1 cbETH is redeemable for progressively more ETH. The conversion rate was initialized on June 16, 2022.',
                'pinned': False,
            },
            {
                'question': 'When did cbETH launch?',
                'answer': 'Coinbase announced and launched cbETH on August 24, 2022, roughly three weeks ahead of the Ethereum Merge. The token contract had been deployed to mainnet earlier in 2022, and its conversion rate was initialized on June 16, 2022.',
                'pinned': False,
            },
            {
                'question': 'What fees does Coinbase charge?',
                'answer': 'There is no fee to wrap or unwrap cbETH itself. Coinbase charges a staking commission (service fee) on the ETH staking rewards earned by the underlying staked ETH; this commission is deducted before rewards accrue to the conversion rate.',
                'pinned': False,
            },
            {
                'question': 'How do I redeem cbETH for ETH?',
                'answer': 'A Coinbase account holder can unwrap cbETH back into staked ETH and then unstake to ETH through Coinbase. Unwrapping and unstaking are subject to a processing delay that can extend during periods of high withdrawal demand. Off-platform, cbETH can also be sold for ETH on DEXs for immediate liquidity.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Coinbase, Inc.',
                'role': 'Issuer, custodian and staking operator',
                'description': "cbETH is a centralized, exchange-native product issued and operated by Coinbase. Coinbase custodies the underlying staked ETH, operates the validators, mints/burns cbETH, and controls the exchange-rate update contracts. Coinbase's user agreement states it will not backstop or otherwise intervene to guarantee cbETH liquidity.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Accumulating (capitalizing) money-market or interest-bearing fund share',
                'similarity': "Like an accumulating fund share, cbETH does not pay out a running yield stream; instead the value of a single unit grows as the underlying rewards are reinvested, so appreciation shows up in the unit's redemption value (the cbETH/ETH conversion rate) rather than in a growing unit count.",
                'differences': "cbETH is a permissionless on-chain ERC-20 that trades on DEXs and is usable as DeFi collateral 24/7, with no fund prospectus, no regulated custodian in the securities sense, and price/liquidity risk that is highly concentrated on the Coinbase venue rather than backed by a fund's NAV guarantee.",
            },
        ],
        events=[
            {
                'date': '2022-08-24',
                'title': 'cbETH launched by Coinbase',
                'description': 'Coinbase announced Coinbase Wrapped Staked ETH (cbETH), a liquid, tradeable ERC-20 representation of ETH staked through Coinbase, roughly three weeks ahead of the Ethereum Merge.',
                'link': 'https://decrypt.co/108180/coinbase-announces-cbeth-wrapped-ethereum-staking-token',
            },
            {
                'date': '2022-08-24',
                'title': 'OpenZeppelin security audit published',
                'description': 'OpenZeppelin published its security audit of the Coinbase liquid staking token contracts, finding no critical or high-severity issues, one medium finding on the RateLimit contract, and five low findings.',
                'link': 'https://www.openzeppelin.com/news/coinbase-liquid-staking-token-audit',
            },
            {
                'date': '2023-06-06',
                'title': 'SEC sues Coinbase over staking-as-a-service',
                'description': 'The SEC filed a civil enforcement action against Coinbase, alleging (among other charges) that its staking-as-a-service program was an unregistered offer and sale of securities.',
                'link': 'https://www.sec.gov/newsroom/press-releases/2025-47',
            },
            {
                'date': '2025-02-27',
                'title': 'SEC dismisses its enforcement action against Coinbase',
                'description': 'The SEC filed a joint stipulation to dismiss its civil enforcement action against Coinbase, Inc. and Coinbase Global, Inc., citing the work of its newly formed Crypto Task Force.',
                'link': 'https://www.sec.gov/newsroom/press-releases/2025-47',
            },
        ],
        timeline=[
            {
                'date': '2022-06-16',
                'title': 'cbETH conversion rate initialized',
                'description': 'The cbETH conversion rate and balance were initialized (June 16, 2022, 19:34 UTC), the point from which cbETH begins accruing staking rewards into its ETH conversion rate.',
                'link': 'https://decrypt.co/108180/coinbase-announces-cbeth-wrapped-ethereum-staking-token',
                'status': 'executed',
            },
            {
                'date': '2022-08-24',
                'title': 'Public launch of cbETH',
                'description': 'Coinbase launched cbETH as an ERC-20 liquid staking token ahead of the Ethereum Merge.',
                'link': 'https://decrypt.co/108180/coinbase-announces-cbeth-wrapped-ethereum-staking-token',
                'status': 'executed',
            },
            {
                'date': '2025-02-27',
                'title': 'SEC enforcement action against Coinbase dismissed',
                'description': "The SEC dismissed its civil enforcement action against Coinbase, removing the immediate US regulatory overhang on Coinbase's staking program.",
                'link': 'https://www.sec.gov/newsroom/press-releases/2025-47',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Ethereum contract address',
                'value': '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
                'freshness': 'static',
                'source': {
                    'label': 'Etherscan - cbETH token',
                    'url': 'https://etherscan.io/token/0xbe9895146f7af43049ca1c1ae358b0541ea49704',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Conversion rate initialization',
                'value': 'June 16, 2022 19:34 UTC (cbETH is non-1:1 to ETH and accrues rewards into its conversion rate from this point)',
                'freshness': 'static',
                'source': {
                    'label': 'Decrypt - Coinbase announces cbETH',
                    'url': 'https://decrypt.co/108180/coinbase-announces-cbeth-wrapped-ethereum-staking-token',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Base network contract address',
                'value': '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22 (cbETH is bridgeable to and canonical on Base)',
                'freshness': 'static',
                'source': {
                    'label': 'BaseScan - cbETH token',
                    'url': 'https://basescan.org/token/0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Counterparty',
                'description': "cbETH is a fully centralized, custodial product: Coinbase custodies the staked ETH, operates the validators, and controls minting/burning and the exchange-rate contracts. Holders depend entirely on Coinbase's solvency, honesty, and operational continuity, and Coinbase's user agreement states it will not backstop or guarantee cbETH liquidity.",
            },
            {
                'category': 'Regulatory',
                'description': "Coinbase's staking-as-a-service program has been the subject of US securities scrutiny; the SEC's June 2023 enforcement action alleged the staking program was an unregistered securities offering. Although the SEC dismissed that action in February 2025, the legal status of exchange-run staking remains policy-dependent and could shift with future administrations or in other jurisdictions.",
            },
            {
                'category': 'Oracle',
                'description': 'DeFi protocols that price cbETH rely on its exchange rate being published on-chain (via the ExchangeRateUpdater and third-party price feeds with heartbeat/deviation-based updates). A stale, delayed, or manipulated rate feed could cause mispricing, faulty liquidations, or bad debt in protocols that accept cbETH as collateral.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'cbETH secondary-market liquidity is highly concentrated (the large majority of trading historically sat on the Coinbase venue). During stress, mass redemptions or an unwrap/unstaking queue backlog can push the secondary-market price of cbETH below its fair conversion-rate value, producing a temporary depeg from its ETH-plus-rewards redemption value.',
            },
            {
                'category': 'Smart Contract',
                'description': "cbETH depends on its wrapping, minting, and rate-limiting contracts. OpenZeppelin's August 2022 audit found no critical or high issues but flagged a medium-severity scenario in the RateLimit contract where callers could deplete their mint/rate-update allowance, potentially leaving the exchange rate outdated if not enough callers maintain sufficient allowance.",
            },
        ],
        competitors=[
            {
                'name': 'Lido (stETH)',
                'slug': 'lido',
                'rank': 1,
                'positioning': 'Largest Ethereum liquid staking protocol by staked ETH and market share.',
                'similarities': 'Both issue a liquid, DeFi-composable token that represents staked ETH plus rewards and is widely integrated across DeFi.',
                'differences': 'Lido is a decentralized, multi-operator staking protocol governed by the Lido DAO with a rebasing base token (stETH), whereas cbETH is a single-issuer, custodial, non-rebasing token controlled entirely by Coinbase.',
            },
            {
                'name': 'Rocket Pool (rETH)',
                'slug': 'rocket-pool',
                'rank': 2,
                'positioning': 'Leading decentralization-focused Ethereum liquid staking protocol with permissionless node operators.',
                'similarities': 'Both offer a non-rebasing, value-accruing ETH liquid staking token (rETH and cbETH) whose exchange rate to ETH rises over time.',
                'differences': "Rocket Pool is permissionless and node-operator-driven with its own bonding/RPL collateral model; cbETH is centralized and operated solely by Coinbase's own validators.",
            },
            {
                'name': 'Binance (WBETH)',
                'slug': 'binance-wbeth',
                'rank': 3,
                'positioning': 'The other major exchange-native ETH liquid staking token, issued by Binance.',
                'similarities': 'Directly comparable model: a centralized exchange issuing a non-rebasing, value-accruing wrapped staked-ETH token backed by exchange-operated validators.',
                'differences': 'Different issuer (Binance vs Coinbase) with a different regulatory footprint and DeFi/chain integration profile; the two compete for the centralized, exchange-served staking segment.',
            },
            {
                'name': 'Ether.fi (eETH/weETH)',
                'slug': 'ether-fi',
                'rank': 4,
                'positioning': 'Fast-growing decentralized liquid restaking provider that has captured significant ETH staking share.',
                'similarities': 'Both provide liquid, DeFi-usable tokens representing staked ETH and compete for ETH staking deposits.',
                'differences': "Ether.fi is a non-custodial liquid restaking protocol (EigenLayer-integrated) with additional restaking yield and points, versus cbETH's simpler custodial single-layer staking.",
            },
        ],
        audits=[
            {
                'firm': 'OpenZeppelin',
                'date': '2022-08-24',
                'url': 'https://www.openzeppelin.com/news/coinbase-liquid-staking-token-audit',
            },
        ],
        sources=[
            {
                'label': 'Coinbase Help - cbETH Introduction',
                'url': 'https://help.coinbase.com/en/coinbase/coinbase-staking/staking/cbeth-intro',
            },
            {
                'label': 'Decrypt - Coinbase Announces cbETH Wrapped Ethereum Staking Token',
                'url': 'https://decrypt.co/108180/coinbase-announces-cbeth-wrapped-ethereum-staking-token',
            },
            {
                'label': 'OpenZeppelin - Coinbase Liquid Staking Token Audit',
                'url': 'https://www.openzeppelin.com/news/coinbase-liquid-staking-token-audit',
            },
            {
                'label': 'Prisma Risk - cbETH Collateral Risk Assessment',
                'url': 'https://hackmd.io/@PrismaRisk/cbETH',
            },
            {
                'label': 'Etherscan - cbETH token contract',
                'url': 'https://etherscan.io/token/0xbe9895146f7af43049ca1c1ae358b0541ea49704',
            },
            {
                'label': 'BaseScan - cbETH token on Base',
                'url': 'https://basescan.org/token/0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
            },
            {
                'label': 'SEC - Dismissal of enforcement action against Coinbase (press release 2025-47)',
                'url': 'https://www.sec.gov/newsroom/press-releases/2025-47',
            },
        ],
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
        components=[
            {
                'name': 'mETH (Mantle Staked Ether)',
                'description': 'A value-accumulating (reward-bearing) ETH liquid staking receipt token issued by mETH Protocol on Ethereum L1. Balance stays fixed while its ETH exchange rate rises with consensus- and execution-layer staking rewards. Permissionless and non-custodial.',
            },
            {
                'name': 'cmETH (Mantle Restaked Ether)',
                'description': 'A composable liquid restaking token minted 1:1 when users deposit mETH via the Teller contract. Represents a portfolio of underlying restaking positions across EigenLayer, Symbiotic and Karak plus their AVSs, earning restaking rewards on top of base staking yield.',
            },
            {
                'name': 'COOK',
                'description': 'Governance token of mETH Protocol (genesis supply 5 billion). Holders vote on protocol direction including staking parameters, reward structures and strategic initiatives. TGE around late October 2024.',
            },
            {
                'name': 'BoringVault / PositionManagers',
                'description': 'cmETH principal mETH is custodied in BoringVault and can move only to approved addresses/positions. PositionManagers are simple, non-upgradable contracts controlled by BoringVault that constrain permitted calls and integrate third-party restaking protocols; StrategistNodes rebalance the portfolio verified against a MerkleRoot.',
            },
        ],
        faq=[
            {
                'question': 'What is mETH?',
                'answer': 'mETH (Mantle Staked Ether) is a reward-bearing ETH liquid staking token from mETH Protocol, deployed on Ethereum L1 and governed by Mantle. Staking ETH mints mETH; its exchange rate to ETH increases as staking rewards accrue.',
                'pinned': True,
            },
            {
                'question': 'What is cmETH and how does it differ from mETH?',
                'answer': 'cmETH (Mantle Restaked Ether) is a liquid restaking token minted 1:1 by depositing mETH. The underlying mETH keeps earning base ETH staking rewards, while cmETH additionally accrues rewards from restaking networks including EigenLayer, Symbiotic and Karak.',
                'pinned': False,
            },
            {
                'question': 'What is the COOK token?',
                'answer': "COOK is the governance token of mETH Protocol with a 5 billion genesis supply. It lets holders vote on the protocol's strategic direction, staking parameters and reward structures.",
                'pinned': False,
            },
            {
                'question': 'How do I unstake cmETH?',
                'answer': 'Redeeming cmETH for mETH uses a DelayedWithdraw flow with an 8-hour claim period; once claimable, users have 60 days to claim their funds or the unstaking process must be restarted.',
                'pinned': False,
            },
            {
                'question': 'Is mETH Protocol audited?',
                'answer': 'Yes. The protocol has been reviewed across multiple releases by firms including Hexens, MixBytes, Secure3, Verilog, Quantstamp, BlockSec, Exvul and Fuzzland, covering the token/vault contracts, oracle, cmETH/BoringVault and COOK. Reports are published in the Mantle docs.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'mETH Protocol',
                'role': 'Issuer / operator',
                'description': "Permissionless, non-custodial ETH liquid staking and restaking protocol (formerly 'Mantle LSP') deployed on Ethereum L1, issuing mETH and cmETH. Second core product of the Mantle ecosystem after Mantle Network L2.",
            },
            {
                'name': 'Mantle (Mantle DAO / Treasury)',
                'role': 'Governance & treasury backer',
                'description': "mETH Protocol is governed by Mantle. Its launch was funded by staking Mantle Treasury ETH, sanctioned via Mantle Governance Proposal MIP-25. COOK is the protocol's dedicated governance token.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Repo / cash-management sweep on a Treasury position',
                'similarity': 'Like sweeping idle cash into an interest-bearing, redeemable instrument, staking ETH into mETH turns idle ETH into a yield-accruing, transferable claim whose value grows over time.',
                'differences': 'mETH yield comes from Ethereum PoS validation (variable, subject to slashing) rather than a contractual money-market rate; redemption is subject to on-chain unstake queues and smart-contract risk rather than a regulated custodian.',
            },
        ],
        events=[
            {
                'date': '2024-10-30',
                'title': 'Methamorphosis Season 2 & cmETH restaking live',
                'description': 'mETH Protocol launched Season 2 (Methamorphosis), introducing cmETH liquid restaking on mainnet with diversified exposure across EigenLayer, Symbiotic and Karak, and a COOK-rewards incentive campaign.',
                'link': 'https://www.mantle.xyz/blog/announcements/season-2-methamorphosis-now-live-start-restaking-with-cmeth',
            },
        ],
        timeline=[
            {
                'date': '2023-07-14',
                'title': 'Mantle LSP proposal (MIP-25)',
                'description': 'Genesis proposal for a Mantle liquid staking protocol posted on the Mantle governance forum; acceptance of MIP-25 sanctioned staking Mantle Treasury ETH to seed the protocol.',
                'link': 'https://www.coindesk.com/tech/2023/12/04/mantle-releases-liquid-staking-protocol-expanding-beyond-layer-2-operator',
                'status': 'executed',
            },
            {
                'date': '2023-12-04',
                'title': 'mETH liquid staking protocol launch (permissionless)',
                'description': 'Mantle LSP (later renamed mETH Protocol) fully launched on Ethereum mainnet in permissionless mode, minting the mETH reward-bearing token. Second core product of the Mantle ecosystem.',
                'link': 'https://www.mantle.xyz/blog/announcements/earn-meth-high-yield-mantle-lsp',
                'status': 'executed',
            },
            {
                'date': '2024-10-29',
                'title': 'COOK governance token TGE',
                'description': 'mETH Protocol introduced COOK, its governance token (5 billion genesis supply), enabling holders to vote on protocol direction, staking parameters and reward structures.',
                'link': 'https://www.mantle.xyz/blog/announcements/overview-of-cook-meth-protocols-governance-token',
                'status': 'executed',
            },
            {
                'date': '2024-10-30',
                'title': 'cmETH liquid restaking launch',
                'description': 'cmETH went live on mainnet as a 1:1 receipt token for restaked mETH, spanning EigenLayer, Symbiotic and Karak restaking positions.',
                'link': 'https://www.mantle.xyz/blog/announcements/season-2-methamorphosis-now-live-start-restaking-with-cmeth',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'cook_genesis_supply',
                'value': '5,000,000,000 COOK at genesis (Community 60% / Mantle Treasury 30% / Core Contributors 10%)',
                'freshness': 'static',
                'source': {
                    'label': 'Mantle blog — Overview of $COOK',
                    'url': 'https://www.mantle.xyz/blog/announcements/overview-of-cook-meth-protocols-governance-token',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'tvl_q3_2025',
                'value': '~$1.1 billion mETH Protocol TVL at end of Q3 2025 (peak ~$2.19B prior)',
                'freshness': 'dated',
                'source': {
                    'label': 'Messari — State of Mantle Q3 2025',
                    'url': 'https://messari.io/report/state-of-mantle-q3-2025',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'cmeth_unstake_period',
                'value': '8-hour claim period on cmETH redemption; funds must be claimed within 60 days or the unstake restarts',
                'freshness': 'static',
                'source': {
                    'label': "Mantle blog — A Restaker's Guide to cmETH",
                    'url': 'https://www.mantle.xyz/blog/guide/a-restakers-guide-to-cmeth',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'mETH, cmETH, BoringVault, PositionManagers and oracle are on-chain contracts. Audits across releases surfaced HIGH/MEDIUM/LOW findings (e.g. the MixBytes review reported 3 HIGH, 4 MEDIUM, 7 LOW, all acknowledged or fixed); residual bug/exploit risk remains.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'mETH is a reward-bearing claim on staked ETH whose secondary-market price can trade below its intrinsic ETH exchange rate during stress or thin liquidity; cmETH adds a second wrapping layer that can decouple from mETH.',
            },
            {
                'category': 'Counterparty',
                'description': "cmETH routes principal into third-party restaking protocols (EigenLayer, Symbiotic, Karak) and their AVSs, exposing holders to those external protocols' operator, slashing and contract failures beyond Mantle's control.",
            },
            {
                'category': 'Network',
                'description': "Underlying yield depends on Ethereum PoS validator performance; validator downtime or slashing reduces mETH's exchange rate, and unstaking is subject to Ethereum's exit queue plus protocol withdrawal delays.",
            },
            {
                'category': 'Governance',
                'description': 'mETH Protocol is governed by Mantle with COOK as its governance token and a large treasury/contributor allocation; concentrated voting power and treasury control could steer parameters against some stakeholders.',
            },
            {
                'category': 'Oracle',
                'description': 'The mETH exchange rate relies on an oracle (separately audited); faulty or manipulated oracle updates could misprice mETH for mint/redeem and downstream DeFi integrations.',
            },
        ],
        competitors=[
            {
                'name': 'Lido',
                'slug': 'lido',
                'rank': 1,
                'positioning': 'Dominant ETH liquid staking protocol (stETH), by far the largest LST by TVL.',
                'similarities': 'Both mint a reward-bearing ETH LST usable across DeFi.',
                'differences': 'Lido is multiple times larger and node-operator-set driven; mETH is Mantle-treasury-seeded, L2-ecosystem-aligned, and pairs with an in-house cmETH restaking layer.',
            },
            {
                'name': 'ether.fi',
                'slug': 'ether-fi',
                'rank': 2,
                'positioning': 'Leading liquid restaking protocol (eETH/weETH) built natively around EigenLayer restaking.',
                'similarities': 'Both combine liquid staking with a liquid restaking token spanning EigenLayer and other networks.',
                'differences': 'ether.fi is restaking-first and independent; mETH is staking-first with cmETH layered on, and is governed/backed by Mantle.',
            },
            {
                'name': 'Rocket Pool',
                'slug': 'rocket-pool',
                'rank': 3,
                'positioning': 'Decentralized, permissionless node-operator ETH staking (rETH).',
                'similarities': 'Both offer a reward-bearing ETH LST on Ethereum L1.',
                'differences': 'Rocket Pool emphasizes a decentralized independent node-operator network; mETH is Mantle-governed and does not offer native restaking within its base token.',
            },
            {
                'name': 'Binance wBETH',
                'slug': 'binance-wbeth',
                'rank': 4,
                'positioning': 'Exchange-backed wrapped beacon ETH LST with very large TVL.',
                'similarities': 'Both are institutionally/treasury-backed reward-bearing ETH LSTs.',
                'differences': 'wBETH is centralized-exchange-operated; mETH is a permissionless, non-custodial on-chain protocol with its own restaking token and DAO governance.',
            },
        ],
        audits=[
            {
                'firm': 'Hexens',
                'date': '2023-08-25',
                'url': 'https://github.com/Hexens/Smart-Contract-Review-Public-Reports/blob/main/Mantle_SCs_Aug23(Public)(Liquid%20Staking%20Protocol).pdf',
            },
            {
                'firm': 'Hexens',
                'date': '2023-10-02',
                'url': 'https://github.com/Hexens/Smart-Contract-Review-Public-Reports/blob/main/Mantle_Sep23(Public)%20(Oracle).pdf',
            },
            {
                'firm': 'MixBytes',
                'date': '2023-10-30',
                'url': 'https://github.com/mixbytes/audits_public/blob/master/Mantle%20Network/Mantle%20Network%20METH%20Secuity%20Audit%20Report.pdf',
            },
            {
                'firm': 'Secure3',
                'date': '2023-10-12',
                'url': 'https://secure3.io/contest/64954f6b',
            },
            {
                'firm': 'Verilog',
                'date': '2023-11-21',
                'url': 'https://github.com/Verilog-Solutions/.github/blob/main/Audit/Mantle_Ecosystem_Audit/Mantle_LSP_L2_Report.pdf',
            },
            {
                'firm': 'Quantstamp',
                'date': '2024-10-18',
                'url': 'https://docs.mantle.xyz/meth/security/audits',
            },
        ],
        sources=[
            {
                'label': 'Mantle Docs — mETH Protocol Audits',
                'url': 'https://docs.mantle.xyz/meth/security/audits',
            },
            {
                'label': 'Mantle Docs — Restaking / cmETH architecture',
                'url': 'https://docs.mantle.xyz/meth/components/architecture/restaking-cmeth',
            },
            {
                'label': 'Mantle blog — Earn mETH & Access High Yield (LSP launch)',
                'url': 'https://www.mantle.xyz/blog/announcements/earn-meth-high-yield-mantle-lsp',
            },
            {
                'label': 'Mantle blog — Overview of $COOK governance token',
                'url': 'https://www.mantle.xyz/blog/announcements/overview-of-cook-meth-protocols-governance-token',
            },
            {
                'label': 'Mantle blog — Season 2 Methamorphosis: start restaking with cmETH',
                'url': 'https://www.mantle.xyz/blog/announcements/season-2-methamorphosis-now-live-start-restaking-with-cmeth',
            },
            {
                'label': 'CoinDesk — Mantle Releases Liquid Staking Protocol (Dec 2023)',
                'url': 'https://www.coindesk.com/tech/2023/12/04/mantle-releases-liquid-staking-protocol-expanding-beyond-layer-2-operator',
            },
            {
                'label': 'Messari — State of Mantle Q3 2025 (TVL context)',
                'url': 'https://messari.io/report/state-of-mantle-q3-2025',
            },
        ],
        github='https://github.com/mantle-lsp/contracts',
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
        components=[
            {
                'name': 'swETH',
                'description': "Swell's reward-bearing liquid staking token (LST). Users deposit ETH via the DepositManager contract and receive swETH, whose exchange rate appreciates as Ethereum staking rewards accrue. The swETH token on Ethereum mainnet is deployed at 0xf951E335afb289353dc249e82926178EaC7DEd78.",
            },
            {
                'name': 'rswETH',
                'description': "Swell's native Liquid Restaking Token (LRT), a tokenized version of ETH restaked on EigenLayer. Swell DAO validators for rswETH are integrated directly with EigenLayer, giving holders access to restaking rewards without locking liquidity. Announced 29 January 2024 with a 30-day zero-fee window, after which a 10% fee applies.",
            },
            {
                'name': 'Swellchain',
                'description': 'A restaking-focused Ethereum Layer 2 built on the OP Stack within the Optimism Superchain, using EigenLayer restaking plus AltLayer AVS components (MACH for fast finality, VITAL for state verification, SQUAD for decentralized sequencing). Launched December 2024. Swellchain was announced for permanent shutdown on 15 June 2026 as the team pivoted resources to the Faro AI platform on Hyperliquid.',
            },
            {
                'name': 'SWELL token',
                'description': "The governance token of Swell DAO, with a total supply of 10,000,000,000. It is used for DAO governance and for restaking to help secure Swell's L2/restaking infrastructure via EigenLayer and Symbiotic. TGE claims opened 7 November 2024; initial circulating supply was ~13%.",
            },
        ],
        faq=[
            {
                'question': 'What is the difference between swETH and rswETH?',
                'answer': "swETH is Swell's liquid staking token representing ETH staked on the Ethereum beacon chain, earning standard staking rewards. rswETH is Swell's liquid restaking token, representing ETH restaked on EigenLayer for additional restaking (AVS) rewards on top of base staking yield. Both are reward-bearing tokens whose exchange rate appreciates over time.",
                'pinned': True,
            },
            {
                'question': 'What is Swellchain?',
                'answer': 'Swellchain was a restaking-focused Ethereum Layer 2 built on the OP Stack within the Optimism Superchain. It extended Ethereum security through EigenLayer restaking and used AltLayer AVS services for fast finality, state verification and decentralized sequencing. It launched in December 2024.',
                'pinned': False,
            },
            {
                'question': 'Is Swellchain still operating?',
                'answer': 'No. Swell announced that Swellchain would permanently shut down on 15 June 2026, redirecting resources to Faro, an AI platform on the Hyperliquid ecosystem. Users were urged to bridge assets (including Lido wstETH) off the chain before the deadline, after which remaining assets on Swellchain risked being unrecoverable. The SWELL token continues to exist on Ethereum.',
                'pinned': True,
            },
            {
                'question': 'How was the SWELL token distributed?',
                'answer': "SWELL has a total supply of 10 billion tokens. 35% was reserved for the community and ecosystem. The Voyage airdrop campaign (based on 'Pearls' points) distributed 8.5% of supply, with claims opening 7 November 2024. Initial circulating supply at TGE was about 13%.",
                'pinned': False,
            },
            {
                'question': "Who has audited Swell's contracts?",
                'answer': "Swell's smart contracts have been audited by Sigma Prime (swETH, completed April 2023, and rswETH/rswETH withdrawals) and Nethermind, with additional firms including Cyfrin, Mixbytes and Hexens auditing later upgrades and the Swell L2 pre-launch deposit contracts. Development was also supported by risk firms Gauntlet and Chaos Labs, and Swell runs an Immunefi bug bounty.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Swell DAO',
                'role': 'Governance',
                'description': "Swell is a decentralized, non-custodial protocol governed by Swell DAO. SWELL holders participate in governance, and Swell DAO operates the validator set backing rswETH's EigenLayer integration.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Dividend-reinvesting index fund / accumulating ETF share',
                'similarity': 'swETH is a reward-bearing token whose value accrues automatically as staking rewards compound into the exchange rate, similar to how an accumulating fund reinvests dividends into share NAV rather than paying them out.',
                'differences': 'swETH carries smart-contract and slashing risk, is redeemable via on-chain withdrawal queues rather than a fund administrator, and can be freely used as collateral across DeFi. Its yield derives from validating a proof-of-stake network, not from underlying equities or bonds.',
            },
        ],
        events=[
            {
                'date': '2023-04-13',
                'title': 'Sigma Prime completes swETH smart contract audit',
                'description': "Sigma Prime completed a security review of Swell's v3-core Solidity contracts, identifying 16 informational/low/medium issues, all resolved, ahead of the swETH mainnet launch.",
                'link': 'https://www.swellnetwork.io/post/smart-contract-audit-completed-by-sigma-prime',
            },
            {
                'date': '2024-01-29',
                'title': 'rswETH (liquid restaking token) launched',
                'description': 'Swell introduced rswETH, a native Liquid Restaking Token integrated directly with EigenLayer, with a 30-day zero-fee window at launch (10% fee thereafter).',
                'link': 'https://www.swellnetwork.io/post/introducing-rsweth',
            },
            {
                'date': '2024-11-07',
                'title': 'SWELL token TGE and airdrop claims open',
                'description': 'SWELL token generation event; airdrop claims for the Voyage campaign opened at 09:00 UTC, with CEX listings following. Total supply 10 billion; ~13% initial circulating supply.',
                'link': 'https://www.swellnetwork.io/post/swell-token',
            },
        ],
        timeline=[
            {
                'date': '2023-04-01',
                'title': 'swETH liquid staking mainnet launch',
                'description': 'After a Goerli testnet phase and a guarded mainnet launch, Swell opened permissionless ETH staking deposits, issuing the reward-bearing swETH token.',
                'link': 'https://tokeninsight.com/en/news/liquid-staking-protocol-swell-network-to-open-staking-deposits-in-april',
                'status': 'executed',
            },
            {
                'date': '2024-01-29',
                'title': 'rswETH restaking token launch',
                'description': "Launch of rswETH, Swell's EigenLayer-integrated liquid restaking token.",
                'link': 'https://www.swellnetwork.io/post/introducing-rsweth',
                'status': 'executed',
            },
            {
                'date': '2024-11-07',
                'title': 'SWELL token TGE',
                'description': 'SWELL governance token generation event and airdrop.',
                'link': 'https://www.swellnetwork.io/post/swell-token',
                'status': 'executed',
            },
            {
                'date': '2024-12-01',
                'title': 'Swellchain L2 mainnet launch',
                'description': 'Swellchain, a restaking-focused OP Stack L2 in the Optimism Superchain, launched on mainnet in December 2024.',
                'link': 'https://l2beat.com/scaling/projects/swell',
                'status': 'executed',
            },
            {
                'date': '2026-06-15',
                'title': 'Swellchain permanent shutdown',
                'description': 'Swell announced Swellchain would permanently cease operations on 15 June 2026, pivoting to the Faro AI platform on Hyperliquid; users were urged to bridge assets off-chain before the deadline. SWELL continues on Ethereum.',
                'link': 'https://cryptorank.io/news/feed/44614-swellchain-shutdown-june-15-faro-ai-hyperliquid',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'SWELL total supply',
                'value': '10,000,000,000 SWELL (fixed max supply); ~13% initial circulating at TGE',
                'freshness': 'static',
                'source': {
                    'label': 'Swell Network - Introducing SWELL',
                    'url': 'https://www.swellnetwork.io/post/swell-token',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Swellchain shutdown date',
                'value': 'Swellchain permanently shut down 15 June 2026; team pivoted to Faro AI on Hyperliquid',
                'freshness': 'static',
                'source': {
                    'label': 'CryptoRank - Swellchain shutdown June 15, Faro AI on Hyperliquid',
                    'url': 'https://cryptorank.io/news/feed/44614-swellchain-shutdown-june-15-faro-ai-hyperliquid',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Seed round raised',
                'value': '$3.75M seed round (March 2022) led by Framework Ventures',
                'freshness': 'static',
                'source': {
                    'label': 'CoinCarp - Swell Network fundraising',
                    'url': 'https://www.coincarp.com/currencies/swell-network/fundraising/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'swETH, rswETH and related contracts carry smart-contract vulnerability risk. Audits (Sigma Prime, Nethermind, Cyfrin, Mixbytes, Hexens) found and resolved multiple medium/low issues, but audits do not eliminate residual bug risk; an Immunefi bug bounty is in place.',
            },
            {
                'category': 'Systemic',
                'description': 'Swellchain was permanently shut down on 15 June 2026 as the team pivoted to the Faro AI platform on Hyperliquid. Users had to bridge assets off-chain before the deadline or risk them becoming unrecoverable, illustrating operational/discontinuation risk for assets deployed on the L2.',
            },
            {
                'category': 'Counterparty',
                'description': 'rswETH depends on EigenLayer restaking; AVS operator misbehaviour, EigenLayer slashing conditions, or failures in the restaking middleware could impair rswETH value beyond base Ethereum staking risk.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'swETH and rswETH are reward-bearing tokens redeemable via withdrawal queues; secondary-market price can trade below the underlying ETH exchange rate (depeg) during stress, illiquidity, or delayed withdrawals.',
            },
            {
                'category': 'Oracle',
                'description': 'swETH pricing relies on a repricing oracle (0x289d...2d71) to update the ETH exchange rate. Oracle manipulation, staleness, or misconfiguration could misprice swETH across DeFi integrations that use it as collateral.',
            },
            {
                'category': 'Governance',
                'description': 'Swell DAO controls protocol parameters and the validator set backing rswETH. Concentration of SWELL voting power or governance capture could affect fees, validator selection, and treatment of user assets.',
            },
        ],
        competitors=[
            {
                'name': 'Lido',
                'slug': 'lido',
                'rank': 1,
                'positioning': 'Dominant Ethereum liquid staking protocol by TVL, issuing stETH/wstETH.',
                'similarities': 'Both are non-custodial liquid staking protocols issuing reward-bearing ETH LSTs usable across DeFi.',
                'differences': "Lido is far larger and focused on pure liquid staking, whereas Swell layered on restaking (rswETH via EigenLayer) and its own L2. Notably, Lido's wstETH was among the assets users had to bridge off Swellchain before its June 2026 shutdown.",
            },
            {
                'name': 'Ether.fi',
                'slug': 'ether-fi',
                'rank': 2,
                'positioning': 'Leading liquid restaking protocol issuing eETH/weETH on EigenLayer.',
                'similarities': 'Both offer EigenLayer-based liquid restaking tokens (rswETH vs eETH) targeting restaking yield on top of ETH staking.',
                'differences': 'Ether.fi scaled to become the largest LRT and expanded into cards/cash products; Swell paired restaking with its own OP Stack L2 which was later sunset.',
            },
            {
                'name': 'Renzo',
                'slug': 'renzo',
                'rank': 3,
                'positioning': 'Liquid restaking protocol issuing ezETH on EigenLayer.',
                'similarities': 'Both are EigenLayer LRT issuers competing for restaking deposits and DeFi integrations.',
                'differences': 'Renzo focuses purely on restaking abstraction across chains; Swell combined LST + LRT + an L2 in one stack.',
            },
            {
                'name': 'Rocket Pool',
                'slug': 'rocket-pool',
                'rank': 4,
                'positioning': 'Decentralized ETH liquid staking protocol issuing rETH via permissionless node operators.',
                'similarities': 'Both are non-custodial ETH liquid staking protocols issuing reward-bearing tokens.',
                'differences': 'Rocket Pool emphasizes a permissionless decentralized node-operator model and does not offer restaking or a dedicated L2.',
            },
        ],
        investment_rounds=[
            {
                'date': '2022-03-18',
                'round': 'Seed',
                'amountUsd': 3750000,
                'amountLabel': '$3.75M',
                'investors': [
                    'Framework Ventures',
                    'Maven 11',
                    'IOSG Ventures',
                    'Apollo Capital',
                ],
                'link': 'https://www.coincarp.com/currencies/swell-network/fundraising/',
            },
        ],
        audits=[
            {
                'firm': 'Sigma Prime',
                'date': '2023-04-13',
                'url': 'https://www.swellnetwork.io/post/smart-contract-audit-completed-by-sigma-prime',
            },
            {
                'firm': 'Sigma Prime (audit reports repository)',
                'date': '2024-06-14',
                'url': 'https://github.com/SwellNetwork/v3-core-public/tree/master/Audit%20Reports',
            },
        ],
        sources=[
            {
                'label': 'Swell Network - Introducing rswETH',
                'url': 'https://www.swellnetwork.io/post/introducing-rsweth',
            },
            {
                'label': 'Swell Network - Introducing SWELL (token)',
                'url': 'https://www.swellnetwork.io/post/swell-token',
            },
            {
                'label': 'Swell Network - Sigma Prime audit completed',
                'url': 'https://www.swellnetwork.io/post/smart-contract-audit-completed-by-sigma-prime',
            },
            {
                'label': 'Swellchain docs - About Swellchain',
                'url': 'https://build.swellnetwork.io/docs/fundamentals/about-swellchain',
            },
            {
                'label': 'L2BEAT - Swellchain',
                'url': 'https://l2beat.com/scaling/projects/swell',
            },
            {
                'label': 'CryptoRank - Swellchain shutdown / Faro AI pivot',
                'url': 'https://cryptorank.io/news/feed/44614-swellchain-shutdown-june-15-faro-ai-hyperliquid',
            },
            {
                'label': 'CoinCarp - Swell Network funding rounds',
                'url': 'https://www.coincarp.com/currencies/swell-network/fundraising/',
            },
        ],
        github='https://github.com/SwellNetwork',
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
        components=[
            {
                'name': 'ETHx',
                'description': "Stader's Ethereum liquid staking token (ERC-20). Users stake ETH and receive ETHx, which accrues staking rewards while remaining usable across DeFi. Built on a multi-pool architecture combining permissionless and permissioned validator pools.",
            },
            {
                'name': 'Multi-pool architecture',
                'description': 'ETHx routes stake across a permissionless pool (any operator can run a node with reduced collateral) and a permissioned pool (curated operators with proven performance, no collateral). Designed to reduce staking concentration risk, with planned DVT-based pools in a later phase.',
            },
            {
                'name': 'Multi-chain LSTs',
                'description': 'Beyond Ethereum, Stader issues liquid staking tokens across multiple PoS chains, including MaticX (Polygon), BNBx (BNB Chain) and HBARx (Hedera), positioning Stader as a multi-chain liquid staking provider.',
            },
            {
                'name': 'SD token',
                'description': "Stader's governance and utility token. Permissionless ETHx node operators must bond SD (~0.4 ETH worth) alongside 4 ETH of collateral, tying node-operator incentives to the token.",
            },
        ],
        faq=[
            {
                'question': 'What is Stader Labs?',
                'answer': 'Stader Labs is a non-custodial, multi-chain liquid staking platform. It lets users stake PoS assets and receive liquid staking tokens (such as ETHx for Ethereum, MaticX for Polygon, BNBx for BNB Chain and HBARx for Hedera) that keep earning staking rewards while remaining usable in DeFi.',
                'pinned': True,
            },
            {
                'question': 'What is ETHx?',
                'answer': "ETHx is Stader's Ethereum liquid staking token, launched on mainnet in July 2023. Staking ETH mints ETHx, which accrues staking rewards and can be deployed across DeFi. It uses a multi-pool architecture spanning permissionless and permissioned validator pools.",
                'pinned': False,
            },
            {
                'question': "How does ETHx's multi-pool architecture work?",
                'answer': 'ETHx stake is distributed across a permissionless pool, where anyone can operate a node by bonding roughly 4 ETH plus about 0.4 ETH worth of SD tokens, and a permissioned pool of curated operators with a track record who run nodes without collateral. This design aims to decentralize validation and reduce concentration risk.',
                'pinned': False,
            },
            {
                'question': 'What is the SD token?',
                'answer': "SD is Stader's governance and utility token. Among other roles, permissionless ETHx node operators must bond SD as part of their operator collateral, aligning operator incentives with the protocol.",
                'pinned': False,
            },
            {
                'question': 'Is Stader related to Kelp DAO?',
                'answer': 'Yes. Kelp DAO, the liquid restaking protocol behind rsETH, was founded by the Stader Labs team and launched in December 2023. ETHx is among the assets that can be restaked through Kelp.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Amitej Gajjala',
                'role': 'CEO & Co-founder',
                'description': 'Co-founder and CEO of Stader Labs; also associated with founding Kelp DAO.',
            },
            {
                'name': 'Sidhartha Doddipalli',
                'role': 'CTO & Co-founder',
                'description': 'Co-founder and CTO of Stader Labs, leading its technical and smart-contract development.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Money-market / cash management fund',
                'similarity': 'ETHx pools user deposits into a yield-bearing, redeemable instrument whose value accrues over time, similar to how a money-market fund pools cash into short-term yield.',
                'differences': 'ETHx yield comes from Ethereum protocol staking rewards rather than interest-bearing securities; it is non-custodial, on-chain, transferable in DeFi, and exposed to slashing and smart-contract risk rather than credit and rate risk of a regulated fund.',
            },
        ],
        events=[
            {
                'date': '2021-10-07',
                'title': 'Stader Labs raises $4M seed round',
                'description': 'Stader Labs raised $4 million in seed funding led by Pantera Capital, with participation from Coinbase Ventures and others, to expand its multi-chain staking platform.',
                'link': 'https://www.theblock.co/post/119761/crypto-staking-platform-stader-labs-seed-funding',
            },
            {
                'date': '2023-07-10',
                'title': 'ETHx mainnet launch',
                'description': 'Stader launched ETHx, its Ethereum liquid staking token, on Ethereum mainnet as an ERC-20 token using a permissionless/permissioned multi-pool architecture.',
                'link': 'https://iq.wiki/wiki/stader-ethx',
            },
        ],
        timeline=[
            {
                'date': '2023-03-27',
                'title': 'ETHx rolling beta on Goerli testnet',
                'description': 'Stader opened the ETHx rolling beta for permissionless node operators on the Goerli testnet ahead of mainnet, with operators bonding 4 ETH plus ~0.4 ETH worth of SD.',
                'link': 'https://www.staderlabs.com/blogs/ethereum/ethx-rolling-beta-launch/',
                'status': 'executed',
            },
            {
                'date': '2023-07-10',
                'title': 'ETHx mainnet release',
                'description': 'ETHx went live on Ethereum mainnet as an ERC-20 liquid staking token.',
                'link': 'https://iq.wiki/wiki/stader-ethx',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Seed round amount',
                'value': '$4,000,000 seed round led by Pantera Capital (announced Oct 7, 2021)',
                'freshness': 'static',
                'source': {
                    'label': 'The Block - Stader Labs seed funding',
                    'url': 'https://www.theblock.co/post/119761/crypto-staking-platform-stader-labs-seed-funding',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'ETHx permissionless operator collateral',
                'value': 'Permissionless ETHx node operators bond 4 ETH plus ~0.4 ETH worth of SD tokens per validator',
                'freshness': 'static',
                'source': {
                    'label': 'Stader ETHx rolling beta launch blog',
                    'url': 'https://www.staderlabs.com/blogs/ethereum/ethx-rolling-beta-launch/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'ETHx is a set of ERC-20 and staking smart contracts; a bug or exploit in the staking, withdrawal, or reward-accounting logic could lead to loss of user funds despite multiple audits.',
            },
            {
                'category': 'Network',
                'description': 'Rewards and principal depend on Ethereum consensus performance. Validator downtime or protocol-level failures reduce staking yield and can trigger penalties.',
            },
            {
                'category': 'Collateral',
                'description': "Underperforming or malicious validators in the permissionless/permissioned pools can be slashed, and node operators' bonded ETH and SD collateral may be insufficient to fully cover losses to ETHx holders in severe scenarios.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': "As a reward-bearing LST, ETHx's secondary-market price can trade below its underlying staked-ETH value during liquidity crunches or withdrawal-queue congestion, exposing holders to depeg risk.",
            },
            {
                'category': 'Governance',
                'description': "Protocol parameters and the SD token are subject to governance decisions; concentrated voting power or governance capture could alter fees, operator requirements, or contract upgrades against holders' interests.",
            },
        ],
        competitors=[
            {
                'name': 'Lido',
                'slug': 'lido',
                'rank': 1,
                'positioning': 'Dominant Ethereum liquid staking protocol by TVL.',
                'similarities': 'Both issue an Ethereum LST (stETH vs ETHx) usable across DeFi and rely on a validator set to stake pooled ETH.',
                'differences': "Lido is far larger and uses a curated operator set, whereas Stader's ETHx emphasizes a permissionless pool with operator collateral (ETH + SD) and a multi-chain product suite beyond Ethereum.",
            },
            {
                'name': 'Rocket Pool',
                'slug': 'rocket-pool',
                'rank': 2,
                'positioning': 'Decentralization-focused Ethereum liquid staking with permissionless node operators.',
                'similarities': 'Both allow permissionless node operators who bond collateral, aiming to decentralize the validator set beyond a curated list.',
                'differences': 'Rocket Pool operators bond ETH plus RPL, while Stader operators bond ETH plus SD; Rocket Pool is Ethereum-only whereas Stader is multi-chain.',
            },
            {
                'name': 'Stader (multi-chain non-ETH peers)',
                'slug': 'stakewise',
                'rank': 3,
                'positioning': 'Comparable smaller Ethereum liquid staking provider.',
                'similarities': 'Both are non-custodial Ethereum liquid staking protocols competing for stakers seeking DeFi-composable LSTs.',
                'differences': 'StakeWise focuses on Ethereum with its vault model, while Stader spans multiple PoS chains in addition to ETHx.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-10-07',
                'round': 'Seed',
                'amountUsd': 4000000,
                'amountLabel': '$4M',
                'investors': [
                    'Pantera Capital',
                    'Coinbase Ventures',
                    'True Ventures',
                    'Jump Capital',
                    'Huobi Ventures',
                    'TerraForm Labs',
                    'Solana Foundation',
                    'Near Foundation',
                ],
                'link': 'https://www.theblock.co/post/119761/crypto-staking-platform-stader-labs-seed-funding',
            },
        ],
        audits=[
            {
                'firm': 'Sigma Prime',
                'date': '2023-06-01',
                'url': 'https://www.staderlabs.com/audits/ethereum/smartcontracts/ETHx_SmartContract_audit_report_by_SigmaPrime_v2.pdf',
            },
            {
                'firm': 'Halborn',
                'date': '2023-07-04',
                'url': 'https://www.staderlabs.com/audits/ethereum/smartcontracts/ETHx_SmartContract_Audit_Report_by_Halborn_v2.pdf',
            },
            {
                'firm': 'Code4rena',
                'date': '2023-06-01',
                'url': 'https://code4rena.com/reports/2023-06-stader',
            },
        ],
        sources=[
            {
                'label': 'Stader ETHx documentation (GitBook) - Introduction',
                'url': 'https://staderlabs.gitbook.io/ethereum',
            },
            {
                'label': 'Stader ETHx audit reports (GitBook)',
                'url': 'https://staderlabs.gitbook.io/ethereum/ethx-security/audit-reports',
            },
            {
                'label': 'The Block - Stader Labs raises $4M seed (Oct 7, 2021)',
                'url': 'https://www.theblock.co/post/119761/crypto-staking-platform-stader-labs-seed-funding',
            },
            {
                'label': 'Stader ETHx rolling beta launch blog',
                'url': 'https://www.staderlabs.com/blogs/ethereum/ethx-rolling-beta-launch/',
            },
            {
                'label': 'IQ.wiki - Stader ETHx (mainnet launch date)',
                'url': 'https://iq.wiki/wiki/stader-ethx',
            },
            {
                'label': 'Code4rena - Stader findings & analysis report',
                'url': 'https://code4rena.com/reports/2023-06-stader',
            },
        ],
        github='https://github.com/stader-labs',
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
        components=[
            {
                'name': 'Vaults',
                'description': "Permissionless smart contracts that form StakeWise V3's staking marketplace. Each Vault is run by a chosen node operator with its own infrastructure, MEV strategy, fee/commission, and deposit cap. Stakers can deposit any amount of ETH (or GNO on Gnosis Chain), earn native staking rewards, and unstake without needing 32 ETH.",
            },
            {
                'name': 'osETH (osToken)',
                'description': 'Overcollateralized, slashing-protected liquid staking token minted against ETH staked in a Vault. In standard 90% LTV Vaults, holders must keep >1 ETH backing every osETH (a 10% overcollateralization buffer), so slashing losses are absorbed by the buffer before osETH holders are affected. osGNO is the Gnosis Chain equivalent.',
            },
            {
                'name': 'SWISE token & StakeWise DAO',
                'description': 'SWISE is the native governance token. Holders form the StakeWise DAO, which governs protocol parameters and controls the DAO Treasury (a Gnosis Safe with a committee and SafeSnap module). DAO-approved Vaults can reach up to 99.99% LTV backed by a 5M SWISE operator bond.',
            },
            {
                'name': 'StakeWise Boost',
                'description': 'A leverage strategy that lets users borrow additional assets on Aave against osETH, stake them, and loop the position to amplify staking yield.',
            },
        ],
        faq=[
            {
                'question': 'What is osETH and how is it overcollateralized?',
                'answer': "osETH is StakeWise V3's liquid staking token. In standard 90% LTV Vaults you can mint osETH against at most 90% of your staked ETH, leaving a >10% ETH buffer. This means every osETH is backed by more than 1 ETH, so if a validator is slashed the excess ETH absorbs the loss before osETH holders' principal is touched.",
                'pinned': True,
            },
            {
                'question': 'How do StakeWise V3 Vaults work?',
                'answer': 'V3 is a marketplace of Vaults, each run by a node operator who sets the infrastructure, MEV strategy, fee, and deposit cap. Stakers deposit any amount of ETH into a chosen Vault to earn rewards, can unstake at any time, and can optionally mint osETH to stay liquid and use their stake across DeFi.',
                'pinned': False,
            },
            {
                'question': 'What happens if my osETH position gets too risky?',
                'answer': 'Positions are tracked by LTV. Above ~91.5% LTV third parties can redeem (burn osETH) to restore the position to 90% LTV without the staker losing value; above 92% LTV the position can be liquidated, with the liquidator receiving collateral plus a 1% liquidation premium taken from the staker.',
                'pinned': False,
            },
            {
                'question': 'What is the SWISE token used for?',
                'answer': 'SWISE is the governance token of the StakeWise DAO. Holders govern protocol parameters and the DAO Treasury. SWISE is also used as a bond by operators of high-LTV (up to 99.99%) DAO-approved Vaults.',
                'pinned': False,
            },
            {
                'question': 'Which networks does StakeWise support?',
                'answer': 'StakeWise supports Ethereum (osETH) and Gnosis Chain (osGNO), letting users stake ETH or GNO through Vaults and mint the corresponding overcollateralized liquid staking token.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'StakeWise DAO',
                'role': 'Governance',
                'description': 'Community of SWISE token holders that governs protocol parameters and controls the DAO Treasury, a Gnosis Safe operated with a committee and a SafeSnap module allowing on-chain execution of governance decisions.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Overcollateralized secured lending (e.g. a margin loan against pledged securities)',
                'similarity': 'Minting osETH against staked ETH resembles borrowing against pledged collateral: you unlock liquidity while retaining the underlying yield-bearing asset, subject to an LTV cap.',
                'differences': 'There is no lender charging interest and no counterparty bank; the position is enforced entirely by smart contracts. The overcollateralization exists to absorb slashing, and osETH itself continues to accrue staking rewards rather than being idle collateral.',
            },
        ],
        timeline=[
            {
                'date': '2023-11-28',
                'title': 'StakeWise V3 launches on Ethereum mainnet',
                'description': 'StakeWise announced that V3 — the permissionless Vault marketplace with overcollateralized osETH minting — went live on Ethereum mainnet.',
                'link': 'https://stakewise.medium.com/announcing-the-launch-of-stakewise-v3-55effc24dbe4',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Seed round raised',
                'value': '$2,000,000 (led by Greenfield One)',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk — StakeWise Raises $2M Ahead of Mainnet Launch',
                    'url': 'https://www.coindesk.com/business/2021/03/08/ethereum-20-staking-protocol-stakewise-raises-2m-ahead-of-mainnet-launch/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Standard Vault overcollateralization',
                'value': '90% LTV mint cap with >10% ETH buffer backing every osETH',
                'freshness': 'static',
                'source': {
                    'label': 'StakeWise Docs — How osToken Works',
                    'url': 'https://docs.stakewise.io/docs/ostoken/how-ostoken-works',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'osETH minting, Vault accounting, redemption and liquidation logic all run in permissionless smart contracts; a bug or exploit in the V3 core contracts could impair stakers or osETH holders despite multiple audits.',
            },
            {
                'category': 'Collateral',
                'description': "osETH is a collateralized position with an LTV cap (~90% mint, ~91.5% redeemable, ~92% liquidatable). If the Vault's ETH value falls relative to minted osETH, positions can be redeemed or liquidated with a 1% premium taken from the staker.",
            },
            {
                'category': 'Counterparty',
                'description': 'Vaults are run by independent, permissionless node operators who control validator keys and infrastructure. Poor operator performance, downtime, or malicious behavior directly affects stakers in that Vault.',
            },
            {
                'category': 'Network',
                'description': 'Validators are subject to Ethereum (and Gnosis Chain) consensus-layer risks including slashing and penalties; the overcollateralization buffer is designed to absorb these losses but is finite and could be exceeded in an extreme slashing event.',
            },
            {
                'category': 'Governance',
                'description': 'The StakeWise DAO controls protocol parameters (LTV thresholds, approved Vaults, treasury) and the Treasury is a Gnosis Safe governed by a committee; concentrated SWISE holdings or committee action could change protocol economics.',
            },
            {
                'category': 'Oracle',
                'description': 'osETH exchange-rate and position health depend on oracle-reported reward/exchange-rate data; faulty or manipulated oracle updates could misprice positions and trigger unwarranted redemptions or liquidations.',
            },
        ],
        competitors=[
            {
                'name': 'Lido',
                'slug': 'lido',
                'rank': 1,
                'positioning': 'Dominant ETH liquid staking protocol issuing stETH; the market-share leader StakeWise competes against for staker deposits and DeFi integrations.',
                'similarities': 'Both are Ethereum liquid staking protocols that issue a reward-bearing liquid token usable across DeFi and use a curated/operator model for validators.',
                'differences': "Lido's stETH is a direct liquid staking token from a curated operator set; StakeWise V3 uses a permissionless Vault marketplace and issues osETH as an overcollateralized, slashing-protected token minted against a chosen Vault.",
            },
            {
                'name': 'Rocket Pool',
                'slug': 'rocket-pool',
                'rank': 2,
                'positioning': "Decentralized, permissionless ETH staking protocol issuing rETH, the closest philosophical competitor to StakeWise's permissionless-operator design.",
                'similarities': 'Both emphasize permissionless node operation and decentralization, letting independent operators run validators and stakers hold a liquid token.',
                'differences': 'Rocket Pool operators post RPL/ETH collateral to run minipools and issue a single rETH token; StakeWise separates staking (Vaults) from the liquid token (osETH) and enforces overcollateralization on the token rather than requiring operator ETH bonds in standard Vaults.',
            },
        ],
        investment_rounds=[
            {
                'date': '2021-03-08',
                'round': 'Private / seed',
                'amountUsd': 2000000,
                'amountLabel': '$2M',
                'investors': [
                    'Greenfield One',
                    'Collider Ventures',
                    'Gumi Cryptos',
                    'Lionschain Capital',
                ],
                'link': 'https://www.coindesk.com/business/2021/03/08/ethereum-20-staking-protocol-stakewise-raises-2m-ahead-of-mainnet-launch/',
            },
        ],
        audits=[
            {
                'firm': 'Halborn',
                'date': '2023-05-01',
                'url': 'https://github.com/stakewise/v3-core/blob/main/audits/2023-05-Halborn.pdf',
            },
            {
                'firm': 'Halborn',
                'date': '2023-08-01',
                'url': 'https://github.com/stakewise/v3-core/blob/main/audits/2023-08-Halborn.pdf',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2023-08-01',
                'url': 'https://github.com/stakewise/v3-core/blob/main/audits/2023-08-Sigma-Prime.pdf',
            },
            {
                'firm': 'ConsenSys Diligence',
                'date': '2024-03-01',
                'url': 'https://github.com/stakewise/v3-core/blob/main/audits/2024-03-Consensys-Diligence.pdf',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2024-06-01',
                'url': 'https://github.com/stakewise/v3-core/blob/main/audits/2024-06-Sigma-Prime.pdf',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2024-09-01',
                'url': 'https://github.com/stakewise/v3-core/blob/main/audits/2024-09-Sigma-Prime.pdf',
            },
            {
                'firm': 'ABDK',
                'date': '2025-09-01',
                'url': 'https://github.com/stakewise/v3-core/blob/main/audits/2025-09-ABDK.pdf',
            },
            {
                'firm': 'Statemind',
                'date': '2026-04-01',
                'url': 'https://github.com/stakewise/v3-core/blob/main/audits/2026-04-Statemind.pdf',
            },
        ],
        sources=[
            {
                'label': 'StakeWise Docs — Home',
                'url': 'https://docs.stakewise.io/',
            },
            {
                'label': 'StakeWise Docs — How osToken Works',
                'url': 'https://docs.stakewise.io/docs/ostoken/how-ostoken-works',
            },
            {
                'label': 'StakeWise — Announcing the Launch of StakeWise V3',
                'url': 'https://stakewise.medium.com/announcing-the-launch-of-stakewise-v3-55effc24dbe4',
            },
            {
                'label': 'StakeWise v3-core audits directory (GitHub)',
                'url': 'https://github.com/stakewise/v3-core/tree/main/audits',
            },
            {
                'label': 'CoinDesk — StakeWise Raises $2M Ahead of Mainnet Launch',
                'url': 'https://www.coindesk.com/business/2021/03/08/ethereum-20-staking-protocol-stakewise-raises-2m-ahead-of-mainnet-launch/',
            },
        ],
        github='https://github.com/stakewise',
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
        components=[
            {
                'name': 'Multi-Chain Liquid Staking',
                'description': "Ankr's non-custodial liquid staking product lets users stake assets across multiple chains and receive reward-bearing liquid staking tokens (ankrETH for ETH, ankrBNB for BNB, plus FTM, AVAX, POL and FLOW variants). The value of one liquid token grows against the underlying asset over time as staking rewards accrue; token quantity stays fixed. Ankr charges a technical service fee on staking rewards.",
            },
            {
                'name': 'ankrETH',
                'description': "Ankr's Ethereum liquid staking token. A reward-bearing (value-accruing, non-rebasing) token: the fair value of 1 ankrETH versus ETH increases over time as staking rewards accumulate inside the token, while the holder's balance count stays the same. ankrETH can be bridged to other chains and used across DeFi for additional yield layers. It superseded the earlier aETHb token.",
            },
            {
                'name': 'RPC / Node Infrastructure & Web3 API',
                'description': "Ankr's core infrastructure business: a decentralized network of node providers delivering RPC (Remote Procedure Call) endpoints and Web3 APIs across a large set of blockchains, so developers can read/write chain data without running their own full nodes. Also includes Advanced APIs, App Chains-as-a-Service, and gaming SDKs.",
            },
            {
                'name': 'ANKR Token',
                'description': 'The native ERC-20 utility/governance token of the Ankr network, used across its infrastructure and staking ecosystem. Distinct from the liquid staking tokens (ankrETH, ankrBNB) which represent staked positions.',
            },
        ],
        faq=[
            {
                'question': 'Is ankrETH a rebasing or reward-bearing token?',
                'answer': 'ankrETH is a reward-bearing (value-accruing) token, not a rebasing one. Your ankrETH balance stays constant in number, but the fair value of 1 ankrETH versus ETH increases over time as staking rewards accumulate inside the token.',
                'pinned': True,
            },
            {
                'question': 'What happened in the December 2022 aBNBc exploit?',
                'answer': "On December 1-2, 2022, an attacker exploited an infinite-mint bug in Ankr's aBNBc (BNB liquid staking) token contract on BNB Chain, minting a massive supply and swapping it for around $5 million in value. Ankr traced the root cause to a former team member who used a social-engineering and supply-chain attack to compromise a deployer private key. Ankr discontinued aBNBc/aBNBb, issued a new ankrBNB token airdropped to affected holders, and reimbursed liquidity providers.",
                'pinned': True,
            },
            {
                'question': 'Besides staking, what does Ankr actually do?',
                'answer': "Ankr's primary business is Web3 infrastructure: it runs a decentralized node network providing RPC endpoints and Web3 APIs across many blockchains, plus Advanced APIs, App Chains-as-a-Service and gaming SDKs. Liquid staking is one product line within this broader developer-infrastructure company.",
                'pinned': False,
            },
            {
                'question': 'Is there a fee for staking with Ankr?',
                'answer': 'Yes. Ankr charges a technical service fee taken from the staking reward (documented at 10% of rewards for ETH liquid staking). There is no advertised minimum stake amount for liquid staking.',
                'pinned': False,
            },
            {
                'question': "Has Ankr's staking code been audited?",
                'answer': 'Yes, extensively. Ankr publishes audit reports on its docs site covering ETH, BNB, AVAX, FTM, POL and FLOW liquid staking, delegated staking and its bridge, from firms including Beosin, PeckShield, Veridise, Salus and Halborn between 2020 and 2024.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Ankr',
                'role': 'Web3 infrastructure company / protocol operator',
                'description': 'Founded in 2017 by Chandler Song, Ryan Fang and Stanley Wu (an ex-Amazon engineer). Ankr operates as a company building decentralized RPC/node infrastructure, Web3 APIs and multi-chain liquid staking. It is a venture-backed (Series C) company with Binance Labs among its strategic investors.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Cloud infrastructure / API provider (e.g., AWS-style managed services)',
                'similarity': "Ankr's RPC and Web3 API business plays a role analogous to a managed cloud/API provider: developers pay for reliable access to blockchain read/write endpoints instead of provisioning and maintaining their own node servers.",
                'differences': "Ankr's node layer is decentralized across independent providers rather than centrally owned data centers, and it settles/relays blockchain state rather than hosting arbitrary applications.",
            },
            {
                'product': 'Interest-bearing deposit / money-market fund receipt',
                'similarity': 'Holding ankrETH is loosely comparable to holding an interest-bearing receipt: the position accrues yield (staking rewards) and represents a claim on the underlying deposited asset.',
                'differences': 'There is no bank or insured deposit; yield comes from Ethereum protocol staking rewards, the receipt is a freely transferable on-chain token usable in DeFi, and it carries smart-contract, slashing and depeg risks with no deposit insurance.',
            },
        ],
        events=[
            {
                'date': '2022-08-11',
                'title': 'Binance Labs makes strategic investment in Ankr',
                'description': 'Binance Labs, the venture arm of Binance, announced a strategic investment in Ankr to accelerate its RPC service and Web3 developer suite (Multi-Chain Liquid Staking SDK, Web3 Gaming SDK, App Chains-as-a-Service). No dollar amount was disclosed.',
                'link': 'https://www.binance.com/en/blog/ecosystem/binance-labs-makes-a-strategic-investment-in-ankr-8803429302834521105',
            },
            {
                'date': '2022-12-01',
                'title': 'aBNBc infinite-mint exploit on BNB Chain',
                'description': "An attacker exploited an unlimited-mint vulnerability in Ankr's aBNBc BNB liquid staking token contract, minting an enormous supply and swapping it for roughly $5M in value. Ankr traced the root cause to a former team member's social-engineering / supply-chain compromise of a deployer key. Binance's CZ said the exchange froze ~$3M sent by the attacker.",
                'link': 'https://www.coindesk.com/markets/2022/12/02/defi-protocol-ankr-exploited-for-over-5m',
            },
            {
                'date': '2022-12-02',
                'title': 'Ankr discontinues aBNBc/aBNBb and reissues ankrBNB',
                'description': 'Following the exploit, Ankr discontinued the aBNBc and aBNBb tokens, minted a new ankrBNB token airdropped to affected holders, and committed to reimbursing DeFi liquidity providers and covering associated LP losses.',
                'link': 'https://www.ankr.com/blog/after-action-report-our-findings-from-abnbc-token-exploit/',
            },
        ],
        timeline=[
            {
                'date': '2020-11-01',
                'title': 'First ETH liquid staking audit (Beosin)',
                'description': "Beosin audited Ankr's ETH liquid staking (Stkr) smart contracts, an early milestone in Ankr's liquid staking product line.",
                'link': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
                'status': 'executed',
            },
            {
                'date': '2022-12-01',
                'title': 'Post-exploit security hardening',
                'description': 'After the aBNBc exploit, Ankr moved to multi-signature authentication and timelocks for contract updates, enhanced background checks, and new monitoring/notification systems, alongside reissuing ankrBNB.',
                'link': 'https://www.ankr.com/blog/after-action-report-our-findings-from-abnbc-token-exploit/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'ETH liquid staking technical service fee',
                'value': '10% of staking rewards',
                'freshness': 'static',
                'source': {
                    'label': 'Ankr Docs / Ankr staking guide',
                    'url': 'https://www.ankr.com/docs/liquid-staking/eth/overview/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Founded',
                'value': '2017, by Chandler Song, Ryan Fang and Stanley Wu',
                'freshness': 'static',
                'source': {
                    'label': 'DailyCoin - Ankr Web3 infrastructure provider',
                    'url': 'https://dailycoin.com/ankr-coin-web-3-infrastructure-provider/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'aBNBc exploit loss',
                'value': '~$5 million; Binance froze ~$3M of attacker funds',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk - Ankr exploited for over $5M',
                    'url': 'https://www.coindesk.com/markets/2022/12/02/defi-protocol-ankr-exploited-for-over-5m',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Ankr's staking tokens are governed by upgradeable smart contracts. The December 2022 aBNBc incident demonstrated concrete smart-contract risk: an unlimited/infinite-mint bug in the BNB liquid staking token contract allowed an attacker to mint an enormous supply and drain ~$5M from liquidity pools.",
            },
            {
                'category': 'Counterparty',
                'description': "Ankr operates as a company with privileged deployer/admin keys over its contracts. The 2022 exploit root cause was a former team member compromising a deployer private key via a social-engineering / supply-chain attack, showing reliance on Ankr's internal operational and key-management controls.",
            },
            {
                'category': 'Reserve / Depeg',
                'description': "Liquid staking tokens (ankrETH, ankrBNB) trade at market prices that can diverge from the underlying asset's redemption value. Secondary-market liquidity crunches or loss-of-confidence events (as during the aBNBc exploit, when the token fell over 99%) can cause severe depegs.",
            },
            {
                'category': 'Governance',
                'description': 'Contract upgradeability and admin controls concentrate power over parameters, fees and token issuance. Post-exploit Ankr added multisig and timelocks, but users remain exposed to how these privileged controls are managed.',
            },
            {
                'category': 'Network',
                'description': 'As a multi-chain protocol and RPC/node infrastructure operator, Ankr is exposed to the security, liveness and validator/slashing conditions of every chain it stakes on and services, so faults or outages on an underlying chain propagate to its staking tokens and API business.',
            },
        ],
        competitors=[
            {
                'name': 'Lido',
                'slug': 'lido',
                'rank': 1,
                'positioning': 'Dominant Ethereum liquid staking protocol and overall LST market leader.',
                'similarities': 'Both offer non-custodial ETH liquid staking with a tradable reward token.',
                'differences': 'Lido is far larger and ETH/staking-focused; Ankr is a broader Web3 infrastructure company where liquid staking is one product alongside RPC/node services, and Ankr spans many more chains.',
            },
            {
                'name': 'Stader',
                'slug': 'stader',
                'rank': 2,
                'positioning': 'Multi-chain liquid staking protocol across several networks including ETH and BNB.',
                'similarities': 'Both are explicitly multi-chain liquid staking providers, including BNB liquid staking that competes directly with ankrBNB.',
                'differences': 'Ankr additionally runs a large RPC/API infrastructure business; Stader is focused purely on staking products.',
            },
            {
                'name': 'Rocket Pool',
                'slug': 'rocket-pool',
                'rank': 3,
                'positioning': 'Decentralized Ethereum liquid staking with permissionless node operators (rETH).',
                'similarities': 'Both issue a reward-bearing ETH liquid staking token usable in DeFi.',
                'differences': 'Rocket Pool is ETH-only and emphasizes a decentralized permissionless node-operator set, whereas Ankr is multi-chain and company-operated with its own node infrastructure.',
            },
            {
                'name': 'Binance (WBETH / native BNB staking)',
                'slug': 'binance-wbeth',
                'rank': 4,
                'positioning': 'Exchange-backed liquid staking, notably for ETH (WBETH) and BNB.',
                'similarities': 'Directly competes on ETH and BNB liquid staking; Binance is also a strategic investor in Ankr.',
                'differences': "Binance's staking is exchange-operated and custodial in nature, while Ankr's is on-chain and non-custodial.",
            },
        ],
        partnerships=[
            {
                'name': 'Binance Labs (strategic investor)',
                'date': '2022-08-11',
                'amountLabel': None,
                'description': 'Binance Labs made a strategic investment in Ankr to accelerate its RPC service and Web3 developer suite (Multi-Chain Liquid Staking SDK, Web3 Gaming SDK, App Chains-as-a-Service). No dollar amount was disclosed.',
            },
        ],
        audits=[
            {
                'firm': 'Beosin',
                'date': '2020-11-01',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
            {
                'firm': 'Beosin',
                'date': '2022-04-01',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
            {
                'firm': 'PeckShield',
                'date': '2022-07-01',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
            {
                'firm': 'Beosin',
                'date': '2022-11-01',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
            {
                'firm': 'Beosin',
                'date': '2022-12-01',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
            {
                'firm': 'Veridise',
                'date': '2023-02-01',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
            {
                'firm': 'Salus',
                'date': '2023-05-01',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
            {
                'firm': 'Halborn',
                'date': '2024-08-01',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
        ],
        sources=[
            {
                'label': 'Ankr Liquid Staking Docs (overview)',
                'url': 'https://www.ankr.com/docs/liquid-staking/overview/',
            },
            {
                'label': 'Ankr ETH Liquid Staking Docs',
                'url': 'https://www.ankr.com/docs/liquid-staking/eth/overview/',
            },
            {
                'label': 'Ankr Audit Reports (docs)',
                'url': 'https://www.ankr.com/docs/staking-extra/audit-reports/',
            },
            {
                'label': 'Ankr after-action report on aBNBc exploit',
                'url': 'https://www.ankr.com/blog/after-action-report-our-findings-from-abnbc-token-exploit/',
            },
            {
                'label': 'CoinDesk - Ankr exploited for over $5M',
                'url': 'https://www.coindesk.com/markets/2022/12/02/defi-protocol-ankr-exploited-for-over-5m',
            },
            {
                'label': 'Binance Blog - Binance Labs strategic investment in Ankr',
                'url': 'https://www.binance.com/en/blog/ecosystem/binance-labs-makes-a-strategic-investment-in-ankr-8803429302834521105',
            },
            {
                'label': 'DailyCoin - Ankr Web3 infrastructure provider (founders/history)',
                'url': 'https://dailycoin.com/ankr-coin-web-3-infrastructure-provider/',
            },
        ],
        github='https://github.com/Ankr-network',
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
        components=[
            {
                'name': 'Restaking core (EigenLayer protocol)',
                'description': "A set of Ethereum smart contracts that let stakers 'restake' ETH or liquid staking tokens to extend Ethereum's economic security to other applications. Restakers opt in by delegating to operators, who in turn secure Actively Validated Services (AVSs).",
            },
            {
                'name': 'Actively Validated Services (AVSs)',
                'description': 'Applications and services (data availability layers, oracles, bridges, coprocessors, etc.) that consume restaked security. AVSs define operational conditions and Service Level Agreements enforced economically via slashing.',
            },
            {
                'name': 'Operators',
                'description': 'Node operators who receive delegated restake from stakers and run the off-chain software required by the AVSs they opt into. Operators are the entities subject to slashing if they fail to meet AVS commitments.',
            },
            {
                'name': 'EIGEN token',
                'description': "The protocol's work token, designed to complement ETH restaking by handling 'intersubjective faults' — misbehavior not objectively provable on-chain. Its core mechanism is 'intersubjective forking,' allowing EIGEN to fork without forking Ethereum mainnet.",
            },
            {
                'name': 'EigenCloud (EigenDA / EigenVerify / EigenCompute)',
                'description': "A developer platform announced in 2025 that packages EigenLayer's verifiability primitives into unified services: EigenDA (data availability), EigenVerify (dispute resolution) and EigenCompute (execution), letting developers build apps with on-chain trust guarantees for off-chain computation.",
            },
        ],
        faq=[
            {
                'question': 'What is EigenLayer?',
                'answer': "EigenLayer is an Ethereum restaking protocol. It lets users who already stake ETH (or hold liquid staking tokens) 're-stake' that stake to extend Ethereum's economic security to additional services, called Actively Validated Services (AVSs), earning extra rewards in exchange for taking on additional slashing risk.",
                'pinned': True,
            },
            {
                'question': 'What is the EIGEN token?',
                'answer': "EIGEN is EigenLayer's work token, announced on April 29, 2024 by the Eigen Foundation. It is designed to handle 'intersubjective faults' — misbehavior that cannot be objectively proven on-chain but that reasonable observers would agree on — via a mechanism called intersubjective forking. Total supply at launch was 1,673,646,668.28 EIGEN.",
                'pinned': False,
            },
            {
                'question': 'Is slashing live on EigenLayer?',
                'answer': "Yes. Slashing went live on Ethereum mainnet on April 17, 2025. It lets AVSs burn an operator's restaked funds if the operator fails to meet the AVS's defined conditions, converting service promises into economically enforced commitments.",
                'pinned': False,
            },
            {
                'question': 'What is EigenCloud?',
                'answer': 'EigenCloud is a developer platform built on EigenLayer that combines EigenDA (data availability), EigenVerify (dispute resolution) and EigenCompute (execution) into one programmable environment, letting developers build applications with blockchain-grade verifiability for off-chain computation. a16z crypto backed the rollout with a $70M direct EIGEN token purchase in June 2025.',
                'pinned': False,
            },
            {
                'question': 'Who is behind EigenLayer?',
                'answer': 'EigenLayer was built by Eigen Labs (founded 2021 by Sreeram Kannan). An independent, shareholder-less Eigen Foundation stewards ecosystem growth, research, grants and the EIGEN token.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Eigen Labs',
                'role': 'Core developer',
                'description': 'The company (founded 2021 by Sreeram Kannan) that builds the EigenLayer protocol and the EigenCloud platform. Raised its Series A and Series B rounds under the Eigen Labs entity.',
            },
            {
                'name': 'Eigen Foundation',
                'role': 'Ecosystem steward / foundation',
                'description': 'An independent, shareholder-less entity dedicated to accelerating growth of the EigenLayer ecosystem, stewarding protocol development, the EIGEN token, research, grants and decentralization efforts.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Reinsurance / shared collateral pools',
                'similarity': 'Like reinsurance, restaking lets one pool of capital (staked ETH) underwrite the security of many separate services simultaneously, improving capital efficiency.',
                'differences': "EigenLayer's guarantees are enforced automatically by on-chain slashing rather than legal contracts, and the underwriting capital is pooled crypto stake that can be burned for misbehavior.",
            },
        ],
        events=[
            {
                'date': '2024-04-29',
                'title': 'EIGEN token and Eigen Foundation announced',
                'description': 'The Eigen Foundation announced the EIGEN work token (total launch supply ~1.67B) and a Season 1 stakedrop allocating 5% of supply to restakers based on a March 15, 2024 snapshot.',
                'link': 'https://blog.eigenfoundation.org/announcement/',
            },
            {
                'date': '2025-04-17',
                'title': 'Slashing goes live on mainnet',
                'description': 'EigenLayer activated slashing on Ethereum mainnet, allowing AVSs to burn restaked funds of operators that fail their commitments — the feature that made the protocol feature-complete.',
                'link': 'https://blog.eigencloud.xyz/slashing-goes-live/',
            },
        ],
        timeline=[
            {
                'date': '2024-04-29',
                'title': 'EIGEN token launch announced',
                'description': 'Eigen Foundation introduced the EIGEN token and Season 1 stakedrop.',
                'link': 'https://blog.eigenfoundation.org/announcement/',
                'status': 'executed',
            },
            {
                'date': '2025-04-17',
                'title': 'Mainnet slashing activated',
                'description': 'Slashing went live on Ethereum mainnet, enabling economic enforcement of AVS commitments.',
                'link': 'https://blog.eigencloud.xyz/slashing-goes-live/',
                'status': 'executed',
            },
            {
                'date': '2025-06-17',
                'title': 'EigenCloud unveiled with a16z $70M backing',
                'description': 'EigenLayer revealed the EigenCloud developer platform (EigenDA + EigenVerify + EigenCompute), backed by a $70M direct EIGEN token purchase from a16z crypto.',
                'link': 'https://www.theblock.co/post/358511/a16z-crypto-eigen-token-eigencloud',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'EIGEN total supply at launch',
                'value': '1,673,646,668.28 EIGEN',
                'freshness': 'static',
                'source': {
                    'label': 'Eigen Foundation — EIGEN announcement',
                    'url': 'https://blog.eigenfoundation.org/announcement/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Mainnet slashing activation date',
                'value': '2025-04-17',
                'freshness': 'static',
                'source': {
                    'label': 'EigenCloud Blog — Slashing Goes Live',
                    'url': 'https://blog.eigencloud.xyz/slashing-goes-live/',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Restaked ETH and LSTs are held in EigenLayer's core strategy and delegation contracts. A bug in the restaking, delegation, withdrawal or slashing logic could lead to loss or wrongful burning of staked assets across many restakers at once.",
            },
            {
                'category': 'Systemic',
                'description': "Restaking layers new services on the same underlying ETH stake. Correlated slashing or cascading failures across multiple AVSs sharing the same operators/collateral could concentrate losses and, given EigenLayer's dominant share of restaking TVL, stress the broader Ethereum staking economy.",
            },
            {
                'category': 'Counterparty',
                'description': 'Operator concentration risk: stakers delegate to a limited set of operators who run the off-chain AVS software. A poorly run, malicious or compromised operator can be slashed (funds burned) since April 2025, causing losses for the restakers who delegated to it.',
            },
            {
                'category': 'Governance',
                'description': "The EIGEN token introduces 'intersubjective forking' — social-consensus resolution of faults that cannot be proven on-chain. This gives token holders / social consensus discretionary power over what counts as misbehavior, and the Eigen Foundation controls emissions/incentives, creating governance and centralization risk.",
            },
            {
                'category': 'Collateral',
                'description': 'Restaked collateral (ETH and liquid staking tokens) is exposed to the risk of the underlying LST depegging or the Ethereum consensus-layer slashing that already applies to staked ETH, compounded by the additional AVS-level slashing conditions layered on top.',
            },
        ],
        competitors=[
            {
                'name': 'Symbiotic',
                'slug': 'symbiotic',
                'rank': 1,
                'positioning': 'Permissionless, modular restaking protocol positioned as the main direct competitor to EigenLayer.',
                'similarities': 'Also provides shared/restaked security to external services (networks) using staked collateral and slashing.',
                'differences': "Symbiotic is collateral-agnostic and more modular/permissionless in what assets and networks it supports, versus EigenLayer's ETH-centric, more integrated design.",
            },
            {
                'name': 'Karak',
                'slug': 'karak',
                'rank': 2,
                'positioning': 'Multi-asset restaking layer competing for restaked security and AVS-style services.',
                'similarities': 'Offers restaking of assets to secure additional services, similar AVS/operator model.',
                'differences': "Broader multi-chain and multi-asset collateral focus rather than EigenLayer's Ethereum-first approach.",
            },
            {
                'name': 'Babylon',
                'slug': None,
                'rank': 3,
                'positioning': 'Bitcoin staking / shared-security protocol extending BTC economic security to other chains.',
                'similarities': "Shared-security primitive that lets an underlying asset's stake secure additional networks.",
                'differences': 'Uses Bitcoin (not Ethereum) as the base collateral and a different, BTC-native staking mechanism.',
            },
        ],
        investment_rounds=[
            {
                'date': '2022-08-01',
                'round': 'Seed',
                'amountUsd': 14500000,
                'amountLabel': '$14.5M',
                'investors': [
                    'Polychain Capital',
                    'Ethereal Ventures',
                ],
                'link': 'https://www.coindesk.com/business/2023/03/28/staking-protocol-eigenlayer-raises-50m-amid-crypto-winter',
            },
            {
                'date': '2023-03-28',
                'round': 'Series A',
                'amountUsd': 50000000,
                'amountLabel': '$50M',
                'investors': [
                    'Blockchain Capital',
                    'Electric Capital',
                    'Polychain Capital',
                    'Hack VC',
                    'Finality Capital Partners',
                    'Coinbase Ventures',
                ],
                'link': 'https://www.coindesk.com/business/2023/03/28/staking-protocol-eigenlayer-raises-50m-amid-crypto-winter',
            },
            {
                'date': '2024-02-22',
                'round': 'Series B',
                'amountUsd': 100000000,
                'amountLabel': '$100M',
                'investors': [
                    'a16z crypto',
                ],
                'link': 'https://thedefiant.io/news/defi/eigenlayer-raises-usd100m-series-b-led-by-a16z',
            },
            {
                'date': '2025-06-17',
                'round': 'Token deal (EigenCloud)',
                'amountUsd': 70000000,
                'amountLabel': '$70M',
                'investors': [
                    'a16z crypto',
                ],
                'link': 'https://www.theblock.co/post/358511/a16z-crypto-eigen-token-eigencloud',
            },
        ],
        audits=[
            {
                'firm': 'Consensys Diligence',
                'date': '2023-03-22',
                'url': 'https://diligence.consensys.io/audits/2023/03/eigenlabs-eigenlayer/',
            },
            {
                'firm': 'Sigma Prime',
                'date': '2024-02-29',
                'url': 'https://docs.eigencloud.xyz/eigenlayer/security/audits',
            },
            {
                'firm': 'Certora (Slashing formal verification)',
                'date': '2025-02-11',
                'url': 'https://docs.eigencloud.xyz/eigenlayer/security/audits',
            },
        ],
        sources=[
            {
                'label': 'Eigen Foundation — EIGEN token & Season 1 stakedrop announcement',
                'url': 'https://blog.eigenfoundation.org/announcement/',
            },
            {
                'label': 'EigenCloud Blog — Slashing Goes Live on Mainnet',
                'url': 'https://blog.eigencloud.xyz/slashing-goes-live/',
            },
            {
                'label': 'The Block — a16z crypto invests $70M in EIGEN / EigenCloud',
                'url': 'https://www.theblock.co/post/358511/a16z-crypto-eigen-token-eigencloud',
            },
            {
                'label': 'The Defiant — EigenLayer raises $100M Series B led by a16z',
                'url': 'https://thedefiant.io/news/defi/eigenlayer-raises-usd100m-series-b-led-by-a16z',
            },
            {
                'label': 'CoinDesk — EigenLayer raises $50M Series A (and $14.5M seed)',
                'url': 'https://www.coindesk.com/business/2023/03/28/staking-protocol-eigenlayer-raises-50m-amid-crypto-winter',
            },
            {
                'label': 'EigenCloud docs — Security audits',
                'url': 'https://docs.eigencloud.xyz/eigenlayer/security/audits',
            },
        ],
        name="EigenLayer",
        symbol="EIGEN",
        tagline="Restaking: reuse staked ETH to secure new services.",
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
        components=[
            {
                'name': 'Vaults',
                'description': 'On-chain containers that hold collateral (one collateral token per vault) and connect it to networks. Vaults handle accounting (deposits, withdrawals, epoch timing, penalized collateral), delegation (curator limits, stake distribution across networks and operators), and slashing (via a standard Slasher or a VetoSlasher module). They guarantee stake remains slashable for at least one epoch so networks can rely on predictable security commitments.',
            },
            {
                'name': 'Operators',
                'description': 'Validators or node infrastructure providers that opt into vaults and networks, run the required infrastructure for target networks, and are held accountable for violations through slashing. Operators can use configurable delegation topologies, from securing a single network to multi-network restaking.',
            },
            {
                'name': 'Networks',
                'description': 'Chains, rollups, or modular services that outsource economic security to Symbiotic operators. Networks integrate via a middleware/relay layer, define their own collateral assets, operator selection, rewards, and slashing conditions, and set maximum stake acceptance limits per vault.',
            },
            {
                'name': 'Resolvers',
                'description': 'Arbitration systems (smart contracts, multisigs, DAOs, or external arbitration services) that review slashing requests and can approve or veto them within a defined veto period when the VetoSlasher is used.',
            },
            {
                'name': 'Curators',
                'description': 'Participants who configure and manage vault risk parameters, allocation limits, accepted collateral, and delegation across networks and operators, effectively running the staking/collateral market on top of a vault.',
            },
            {
                'name': 'Collateral',
                'description': 'The assets committed into vaults to back obligations. Symbiotic is asset-agnostic and permissionless, accepting any ERC-20 token rather than being limited to ETH and ETH liquid staking derivatives.',
            },
        ],
        faq=[
            {
                'question': 'What is Symbiotic?',
                'answer': 'Symbiotic is a permissionless, modular shared-security (restaking) protocol on Ethereum. It lets holders deposit collateral into vaults so that stake can be reused to secure multiple networks and services, with a three-way opt-in among depositors, operators, and networks. With Core V2 (July 2026) it repositioned as collateral markets infrastructure that lets DeFi applications share a unified collateral base.',
                'pinned': True,
            },
            {
                'question': 'How is Symbiotic different from EigenLayer?',
                'answer': 'Symbiotic is fully permissionless and asset-agnostic: any developer can launch a shared-security market and any ERC-20 token can be used as collateral, rather than being restricted to ETH and ETH liquid-staking derivatives. It uses immutable core contracts and a modular vault/operator/network design where each network defines its own collateral, operator set, rewards, and slashing.',
                'pinned': False,
            },
            {
                'question': 'Is there a SYMB token?',
                'answer': 'As of the capture date, no native SYMB token had been publicly launched with confirmed supply and allocation. The protocol has run a points program rewarding vault deposits and delegation; token mechanics remain unannounced from a primary source, so no token facts are asserted here.',
                'pinned': False,
            },
            {
                'question': 'Who is behind Symbiotic?',
                'answer': 'Symbiotic was founded by Lido co-founders Konstantin Lomashuk and Vasiliy Shapovalov, with early backing from Paradigm and cyber•Fund.',
                'pinned': False,
            },
            {
                'question': 'What is Symbiotic Core V2?',
                'answer': "Core V2, launched July 1, 2026, marks the protocol's transition from a restaking platform to collateral-markets infrastructure. It lets applications such as insurance, credit, and RWA vaults share a unified collateral base, with dynamic capital routing (idle vault capital can be deployed to lending protocols like Aave and Morpho and recalled when needed) and independent, on-chain-enforced per-vault risk management.",
            },
        ],
        org_structure=[
            {
                'name': 'Konstantin Lomashuk',
                'role': 'Co-founder',
                'description': 'Lido co-founder and cyber•Fund partner; co-founded Symbiotic.',
            },
            {
                'name': 'Misha Putiatin',
                'role': 'Co-founder',
                'description': "Symbiotic co-founder cited in launch coverage explaining the protocol's acceptance of any ERC-20 token as collateral.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Collateralized reinsurance / shared collateral pool',
                'similarity': 'Like a reinsurance or shared-collateral arrangement, capital providers post collateral that backs specific obligations for a defined term and cannot exit early, providing enforceable economic guarantees to counterparties.',
                'differences': 'Terms, slashing, and payouts are enforced by immutable on-chain smart contracts and are permissionless and programmable, rather than intermediated by insurers, custodians, or legal contracts.',
            },
        ],
        events=[
            {
                'date': '2024-06-11',
                'title': 'Symbiotic unveils permissionless restaking protocol and raises $5.8M seed',
                'description': 'Symbiotic publicly launched its permissionless, multi-asset restaking protocol and disclosed a $5.8M seed round co-led by Paradigm and cyber•Fund.',
                'link': 'https://cryptobriefing.com/symbiotic-restaking-protocol-launch/',
            },
            {
                'date': '2025-01-28',
                'title': 'Symbiotic mainnet launch on Ethereum',
                'description': 'Symbiotic launched its permissionless, modular shared-security protocol into production on Ethereum mainnet, supporting any ERC-20 token as collateral.',
                'link': 'https://www.theblock.co/post/337447/symbiotic-permissionless-modular-restaking-protocol-ethereum-mainnet',
            },
            {
                'date': '2025-04-23',
                'title': '$29M Series A led by Pantera Capital',
                'description': 'Symbiotic announced a $29M Series A led by Pantera Capital with Coinbase Ventures and 100+ angel investors, bringing total funding to $34.8M.',
                'link': 'https://www.theblock.co/post/351648/paradigm-restaking-symbiotic-series-a-funding',
            },
        ],
        timeline=[
            {
                'date': '2025-01-28',
                'title': 'Mainnet launch',
                'description': 'Feature-complete protocol went live on Ethereum mainnet with vaults, operators, networks, resolvers, and slashing.',
                'link': 'https://www.theblock.co/post/337447/symbiotic-permissionless-modular-restaking-protocol-ethereum-mainnet',
                'status': 'executed',
            },
            {
                'date': '2026-07-01',
                'title': 'Core V2 launch',
                'description': 'Protocol transitioned from restaking to collateral-markets infrastructure with shared collateral base, dynamic capital routing to lending protocols, and independent per-vault risk management.',
                'link': 'https://www.theblock.co/post/406862/symbiotic-officially-pivots-to-collateral-markets-with-core-v2-launch',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Total funding raised',
                'value': '$34.8M (across $5.8M seed and $29M Series A)',
                'freshness': 'static',
                'source': {
                    'label': 'The Block – Symbiotic $29M Series A',
                    'url': 'https://www.theblock.co/post/351648/paradigm-restaking-symbiotic-series-a-funding',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Mainnet launch date',
                'value': 'January 28, 2025 on Ethereum',
                'freshness': 'static',
                'source': {
                    'label': 'The Block – Symbiotic mainnet launch',
                    'url': 'https://www.theblock.co/post/337447/symbiotic-permissionless-modular-restaking-protocol-ethereum-mainnet',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Core V2 launch date',
                'value': 'July 1, 2026 (pivot to collateral markets)',
                'freshness': 'static',
                'source': {
                    'label': 'The Block – Symbiotic Core V2 launch',
                    'url': 'https://www.theblock.co/post/406862/symbiotic-officially-pivots-to-collateral-markets-with-core-v2-launch',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Collateral',
                'description': 'Because Symbiotic accepts any ERC-20 token as collateral, volatile or thinly-traded assets can undermine the value backing security guarantees, and rapid price drops can leave networks under-collateralized relative to the value they are protecting.',
            },
            {
                'category': 'Smart Contract',
                'description': 'Security depends on a modular stack of vault, delegation, slashing, rewards, relay, and network contracts. Bugs in these contracts, or in the network-defined middleware/slashing logic, could lead to loss of deposited collateral despite extensive audits.',
            },
            {
                'category': 'Oracle',
                'description': 'Slashing and stake accounting can depend on network-defined slash verifiers and off-chain data; a faulty or manipulated slash-verification/oracle input could trigger unjust slashing or fail to slash genuine faults.',
            },
            {
                'category': 'Governance',
                'description': 'Risk parameters, allocation limits, accepted collateral, and delegation are set by curators per vault; misconfiguration, malicious curation, or resolver/veto arbitration decisions can expose depositors to losses outside their control.',
            },
            {
                'category': 'Systemic',
                'description': 'Reusing the same collateral to secure many networks simultaneously creates correlated exposure: a large slashing event or cascading failure across shared collateral could propagate losses across multiple networks and vaults at once.',
            },
        ],
        competitors=[
            {
                'name': 'EigenLayer',
                'slug': 'eigenlayer',
                'rank': 1,
                'positioning': 'The largest and first-mover restaking / shared-security protocol on Ethereum.',
                'similarities': 'Both let staked capital be reused to provide economic security to multiple networks/services with slashing enforcement.',
                'differences': 'EigenLayer was ETH- and LST-centric with a more curated AVS onboarding model; Symbiotic is fully permissionless, asset-agnostic (any ERC-20), and uses immutable core contracts with per-network customization. (EigenLayer later added permissionless ERC-20 support.)',
            },
            {
                'name': 'Karak',
                'slug': 'karak',
                'rank': 2,
                'positioning': 'Multi-asset universal restaking protocol competing for shared-security mindshare.',
                'similarities': 'Permissionless-leaning, multi-asset restaking that lets deposited assets secure additional services.',
                'differences': 'Different architecture and risk model; Symbiotic emphasizes modular vaults, resolver-based veto slashing, and curator-run collateral markets.',
            },
            {
                'name': 'Symbiotic (Core V2 collateral-markets peers)',
                'rank': 3,
                'positioning': 'With Core V2, Symbiotic also competes with shared-collateral / capital-efficiency infrastructure rather than restaking alone.',
                'similarities': 'Aims to give multiple DeFi applications access to a shared, productive collateral base.',
                'differences': 'Positioning is distinct enough that no single named competitor is asserted from a primary source here.',
            },
        ],
        investment_rounds=[
            {
                'date': '2024-06-11',
                'round': 'Seed',
                'amountUsd': 5800000,
                'amountLabel': '$5.8M',
                'investors': [
                    'Paradigm',
                    'cyber•Fund',
                ],
                'link': 'https://cryptobriefing.com/symbiotic-restaking-protocol-launch/',
            },
            {
                'date': '2025-04-23',
                'round': 'Series A',
                'amountUsd': 29000000,
                'amountLabel': '$29M',
                'investors': [
                    'Pantera Capital',
                    'Coinbase Ventures',
                    '100+ angel investors (incl. Stani Kulechov, Sandeep Nailwal, Anton Bukov, Anurag Arjun, Andrew Huang, Eric Wall)',
                ],
                'link': 'https://www.theblock.co/post/351648/paradigm-restaking-symbiotic-series-a-funding',
            },
        ],
        audits=[
            {
                'firm': 'Zellic',
                'date': '2024-07-01',
                'url': 'https://github.com/symbioticfi/core/blob/main/audits/Zellic-Core.pdf',
            },
            {
                'firm': 'ChainSecurity',
                'date': '2024-08-01',
                'url': 'https://github.com/symbioticfi/core/blob/main/audits/ChainSecurity-Core.pdf',
            },
            {
                'firm': 'Certora',
                'date': '2024-09-01',
                'url': 'https://github.com/symbioticfi/core/blob/main/audits/Certora-Core.pdf',
            },
            {
                'firm': 'OtterSec',
                'date': '2024-09-01',
                'url': 'https://github.com/symbioticfi/core/blob/main/audits/OtterSec-Core%26Rewards.pdf',
            },
            {
                'firm': 'Cantina (competition)',
                'date': '2024-09-01',
                'url': 'https://github.com/symbioticfi/core/blob/main/audits/Cantina-Core.pdf',
            },
            {
                'firm': 'Bailsec',
                'date': '2026-06-01',
                'url': 'https://github.com/symbioticfi/core/blob/delegator-simplify/audits/Bailsec-CoreV2.pdf',
            },
        ],
        sources=[
            {
                'label': 'Symbiotic docs – Security audits & bug bounty',
                'url': 'https://docs.symbiotic.fi/security/',
            },
            {
                'label': 'Symbiotic docs – Vault introduction',
                'url': 'https://docs.symbiotic.fi/modules/vault/introduction/',
            },
            {
                'label': 'The Block – Mainnet launch (Jan 2025)',
                'url': 'https://www.theblock.co/post/337447/symbiotic-permissionless-modular-restaking-protocol-ethereum-mainnet',
            },
            {
                'label': 'The Block – $29M Series A (Apr 2025)',
                'url': 'https://www.theblock.co/post/351648/paradigm-restaking-symbiotic-series-a-funding',
            },
            {
                'label': 'The Block – Core V2 pivot to collateral markets (Jul 2026)',
                'url': 'https://www.theblock.co/post/406862/symbiotic-officially-pivots-to-collateral-markets-with-core-v2-launch',
            },
            {
                'label': 'Crypto Briefing – Launch & $5.8M seed, founders',
                'url': 'https://cryptobriefing.com/symbiotic-restaking-protocol-launch/',
            },
        ],
        github='https://github.com/symbioticfi',
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
        components=[
            {
                'name': 'Karak Restaking Protocol',
                'description': 'A universal, asset- and chain-agnostic restaking layer. Users (stakers) deposit assets such as ETH, liquid staking tokens (LSTs), liquid restaking tokens (LRTs), and stablecoins into operator vaults to provide shared economic security. Karak introduces multi-asset restaking so a DSS can be secured by a basket of assets rather than a single one.',
            },
            {
                'name': 'Distributed Secure Services (DSS)',
                'description': 'A DSS is a web service built on the Karak Restaking Protocol that leases pooled economic security from restaked assets. Any infrastructure platform, oracle network, cross-chain bridge, or data-availability layer can register as a DSS; operators allocate restaked vaults to a DSS, perform tasks for rewards, and can be slashed for misbehavior.',
            },
            {
                'name': 'K2',
                'description': 'A risk-management L2 built on top of Karak that leverages services provided by DSSs. K2 serves as the de facto sandbox for DSSs to develop, test, and launch mission-critical protocol upgrades before enshrining services on L1, avoiding prohibitively expensive L1 operations.',
            },
            {
                'name': 'Operators and Vaults',
                'description': 'Operators run infrastructure and choose which DSSs to allocate funds to; each asset accepted by an operator has a separate vault. Stakers deposit into these vaults and receive shares proportional to their deposit relative to total vault assets.',
            },
        ],
        faq=[
            {
                'question': 'What is Karak?',
                'answer': 'Karak is a universal, multi-asset, multi-chain restaking protocol. It lets users restake assets like ETH, LSTs, LRTs, and stablecoins to provide pooled economic security to Distributed Secure Services (DSSs) in exchange for rewards.',
                'pinned': True,
            },
            {
                'question': 'What is a Distributed Secure Service (DSS)?',
                'answer': 'A DSS is a service built on Karak (such as an oracle network, bridge, or data-availability layer) that leases economic security from restaked assets. Operators allocate restaked vaults to a DSS and can be slashed for misbehavior.',
                'pinned': False,
            },
            {
                'question': 'What is K2?',
                'answer': 'K2 is a risk-management L2 built on top of Karak. It acts as a sandbox where DSSs can develop, test, and launch upgrades before deploying to L1, since running everything directly on L1 can be prohibitively expensive.',
                'pinned': False,
            },
            {
                'question': 'How does Karak differ from single-asset restaking?',
                'answer': "Karak introduces multi-asset restaking, letting restakers secure a DSS with a basket of assets rather than only ETH. This is intended to prevent a single asset's failure from compromising a DSS.",
                'pinned': False,
            },
            {
                'question': 'Who built Karak?',
                'answer': 'Karak is built by Andalusia Labs, which also builds the Subsea risk-management marketplace and the Watchtower institutional security platform. Andalusia Labs raised a $48M Series A in December 2023 at a valuation north of $1 billion.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Andalusia Labs',
                'role': 'Developer / parent company',
                'description': 'The company behind Karak, alongside the Subsea risk-management marketplace and the Watchtower institutional platform. Raised a $48M Series A in December 2023 at a >$1B valuation and opened a global HQ in Abu Dhabi.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Reinsurance / shared collateral pools',
                'similarity': 'Like reinsurance, Karak lets a common pool of capital (restaked assets) underwrite the security of many independent services (DSSs) simultaneously, spreading economic backing across participants.',
                'differences': "Karak's guarantees are enforced on-chain via slashing of staked crypto assets rather than legal contracts; capital is programmable, permissionless to supply, and multi-asset rather than fiat-denominated reserves.",
            },
        ],
        events=[
            {
                'date': '2023-12-13',
                'title': 'Andalusia Labs closes $48M Series A',
                'description': 'Andalusia Labs, builder of Karak, raised $48M in Series A funding at a valuation north of $1 billion, led by Lightspeed Venture Partners, and opened its global HQ in Abu Dhabi.',
                'link': 'https://techcrunch.com/2023/12/13/andalusia-labs-series-a-fundraise/',
            },
            {
                'date': '2024-07-16',
                'title': 'Code4rena restaking audit begins',
                'description': "Karak's V2 restaking contracts underwent a public Code4rena audit competition (July 16-30, 2024) with $55,500 in awards.",
                'link': 'https://code4rena.com/audits/2024-07-karak-restaking',
            },
        ],
        timeline=[
            {
                'date': '2024-07-30',
                'title': 'Code4rena audit completed',
                'description': 'The Code4rena audit of Karak restaking contracts concluded, surfacing 9 unique vulnerabilities (4 High, 5 Medium) plus 15 low/non-critical reports across ~2,997 lines of Solidity in 20 contracts.',
                'link': 'https://code4rena.com/reports/2024-07-karak',
                'status': 'executed',
            },
            {
                'date': '2024-09-16',
                'title': 'Code4rena mitigation review',
                'description': 'A follow-up Code4rena mitigation review (Sept 10-16, 2024) verified fixes to the issues identified in the July audit.',
                'link': 'https://code4rena.com/audits/2024-09-karak-restaking-mitigation-review',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'series_a_amount',
                'value': '$48,000,000 Series A (Dec 2023) at a valuation north of $1B, led by Lightspeed Venture Partners',
                'freshness': 'static',
                'source': {
                    'label': 'TechCrunch - Andalusia Labs raises $48M Series A',
                    'url': 'https://techcrunch.com/2023/12/13/andalusia-labs-series-a-fundraise/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'code4rena_audit_findings',
                'value': 'Code4rena audit (Jul 16-30, 2024): 9 unique vulnerabilities (4 High, 5 Medium) plus 15 low/non-critical across ~2,997 LoC in 20 contracts',
                'freshness': 'static',
                'source': {
                    'label': 'Code4rena - Karak Restaking Findings & Analysis Report',
                    'url': 'https://code4rena.com/reports/2024-07-karak',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': "Karak's restaking, slashing, and withdrawal logic is complex; the July 2024 Code4rena audit found 4 High and 5 Medium severity issues, including a slashing bug that could permanently lock user ETH when all vault shares were burned during withdrawal.",
            },
            {
                'category': 'Governance',
                'description': "The protocol's slashing mechanism allows a privileged owner/controller to penalize stakers by reducing staked assets, concentrating power that could be misused or misconfigured.",
            },
            {
                'category': 'Systemic',
                'description': 'Restaking rehypothecates the same capital across multiple DSSs (leverage is possible), so a correlated slashing event or cascade across DSSs could compound losses across the shared security pool.',
            },
            {
                'category': 'Collateral',
                'description': 'Karak accepts a broad basket of multi-asset collateral (ETH, LSTs, LRTs, stablecoins). Volatility, depeg, or failure of any accepted asset backing a DSS can reduce the effective economic security provided.',
            },
            {
                'category': 'Counterparty',
                'description': 'Stakers must delegate to operators who choose which DSSs to secure and can be slashed; a malfunctioning, malicious, or under-provisioned operator exposes delegated stakers to loss.',
            },
        ],
        competitors=[
            {
                'name': 'EigenLayer',
                'slug': 'eigenlayer',
                'rank': 1,
                'positioning': 'The pioneer and market leader in Ethereum restaking, securing Actively Validated Services (AVSs).',
                'similarities': 'Both are restaking protocols that let staked assets provide pooled cryptoeconomic security to third-party services with slashing.',
                'differences': 'EigenLayer is Ethereum-centric and originally ETH/LST-focused; Karak emphasizes native multi-asset (including stablecoins) and multi-chain restaking, and adds the K2 sandbox L2.',
            },
            {
                'name': 'Symbiotic',
                'slug': 'symbiotic',
                'rank': 2,
                'positioning': 'Permissionless, modular shared-security protocol supporting flexible collateral types.',
                'similarities': 'Both offer asset-agnostic, multi-collateral restaking for securing external networks/services.',
                'differences': 'Symbiotic centers on a modular, immutable vault/network design; Karak bundles restaking with DSS tooling and the K2 risk-management L2.',
            },
        ],
        investment_rounds=[
            {
                'date': '2023-12-13',
                'round': 'Series A',
                'amountUsd': 48000000,
                'amountLabel': '$48M',
                'investors': [
                    'Lightspeed Venture Partners',
                    'Mubadala Capital',
                    'Pantera Capital',
                    'Framework Ventures',
                    'Bain Capital Ventures',
                    'Digital Currency Group',
                ],
                'link': 'https://techcrunch.com/2023/12/13/andalusia-labs-series-a-fundraise/',
            },
        ],
        audits=[
            {
                'firm': 'Code4rena',
                'date': '2024-07-30',
                'url': 'https://code4rena.com/reports/2024-07-karak',
            },
            {
                'firm': 'Code4rena (mitigation review)',
                'date': '2024-09-16',
                'url': 'https://code4rena.com/audits/2024-09-karak-restaking-mitigation-review',
            },
        ],
        sources=[
            {
                'label': 'TechCrunch - Andalusia Labs raises $48M Series A',
                'url': 'https://techcrunch.com/2023/12/13/andalusia-labs-series-a-fundraise/',
            },
            {
                'label': 'BusinessWire - Andalusia Labs Secures $48M Series A at $1B Valuation',
                'url': 'https://www.businesswire.com/news/home/20231213003404/en/Andalusia-Labs-Secures-%2448-Million-in-Series-A-Funding-at-%241-Billion-Valuation-Opens-Global-HQ-in-Abu-Dhabi',
            },
            {
                'label': 'Code4rena - Karak Restaking Findings & Analysis Report',
                'url': 'https://code4rena.com/reports/2024-07-karak',
            },
            {
                'label': 'Code4rena - Karak Restaking Audit (competition page)',
                'url': 'https://code4rena.com/audits/2024-07-karak-restaking',
            },
            {
                'label': 'Code4rena - Karak Restaking Mitigation Review',
                'url': 'https://code4rena.com/audits/2024-09-karak-restaking-mitigation-review',
            },
            {
                'label': 'Karak V2 restaking contracts (GitHub)',
                'url': 'https://github.com/karak-network/v2-contracts',
            },
        ],
        github='https://github.com/karak-network/v2-contracts',
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
        components=[
            {
                'name': 'eETH (liquid staking/restaking token)',
                'description': 'The core rebasing liquid restaking token. Users deposit ETH and receive eETH, which accrues Ethereum staking rewards plus EigenLayer restaking rewards; balances rebase automatically as rewards accumulate.',
            },
            {
                'name': 'weETH (wrapped eETH)',
                'description': 'A non-rebasing, wrapped version of eETH built for DeFi composability. It maintains the same underlying yield exposure while keeping a constant balance, making it usable as collateral and in liquidity pools across DeFi.',
            },
            {
                'name': 'EigenLayer restaking integration',
                'description': 'Staked ETH is natively restaked through EigenLayer, allowing Ether.fi validators/positions to secure additional services (AVSs) and earn restaking rewards on top of base staking yield.',
            },
            {
                'name': 'Liquid Vaults',
                'description': 'Automated, curated DeFi strategy vaults (e.g. Liquid ETH Yield, Liquid USD, Liquid BTC Yield) that deploy deposits across yield opportunities and issue a liquid receipt token.',
            },
            {
                'name': 'Ether.fi Cash',
                'description': 'A DeFi-native Visa payment card that lets users spend against their Ether.fi crypto balance, with cashback rewards and Visa network benefits.',
            },
            {
                'name': 'ETHFI governance token',
                'description': "The protocol's governance token (max supply 1,000,000,000, no further issuance). Holders vote on grants, protocol upgrades, node-operator permissions, treasury diversification, and economic parameters such as protocol fees.",
            },
        ],
        faq=[
            {
                'question': 'What is Ether.fi?',
                'answer': 'Ether.fi is a non-custodial liquid restaking protocol on Ethereum. Users deposit ETH, receive the liquid token eETH (or its wrapped form weETH), and the underlying ETH is staked and natively restaked through EigenLayer to earn both staking and restaking rewards while remaining liquid.',
                'pinned': True,
            },
            {
                'question': 'What is the difference between eETH and weETH?',
                'answer': 'eETH is the rebasing token whose balance grows as rewards accrue. weETH is the wrapped, non-rebasing version designed for DeFi composability, keeping a fixed balance while its value appreciates. Both represent the same underlying staked/restaked ETH position.',
                'pinned': False,
            },
            {
                'question': 'How does Ether.fi generate yield?',
                'answer': 'Yield comes from Ethereum proof-of-stake validator rewards plus restaking rewards earned by securing additional services through EigenLayer. Additional strategies are available via Liquid Vaults.',
                'pinned': False,
            },
            {
                'question': 'What is the ETHFI token?',
                'answer': "ETHFI is Ether.fi's governance token with a fixed maximum supply of 1,000,000,000. Claiming began on 18 March 2024. Holders govern grants, protocol upgrades, node-operator permissions, treasury and fee parameters.",
                'pinned': False,
            },
            {
                'question': 'What is Ether.fi Cash?',
                'answer': 'Ether.fi Cash is a DeFi-native Visa card that lets users spend against their on-chain Ether.fi balance, earning cashback and Visa benefits, without needing to sell their crypto.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Mike Silagadze',
                'role': 'CEO & Co-founder',
                'description': "Co-founder and chief executive of Ether.fi; quoted in the February 2024 Series A announcement on the protocol's growth and expansion.",
            },
            {
                'name': 'Rok Kopp',
                'role': 'Co-founder & Chief Growth Officer',
                'description': 'Co-founder of Ether.fi leading growth.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Yield-bearing/interest-bearing deposit account',
                'similarity': 'Like a savings or money-market account, users deposit an asset (ETH) and earn ongoing yield while retaining a claim on the principal.',
                'differences': "Ether.fi is non-custodial and on-chain: the receipt token (eETH/weETH) is freely transferable and usable across DeFi, yield derives from validator and restaking rewards rather than a bank's balance sheet, and there is no deposit insurance; returns and principal are subject to smart-contract, slashing and market risk.",
            },
            {
                'product': 'Cashback rewards credit/debit card',
                'similarity': 'Ether.fi Cash resembles a traditional Visa rewards card, offering cashback on everyday spending via the Visa network.',
                'differences': "Spending is settled against the user's on-chain crypto balance rather than a fiat bank account or a traditional credit line, and cashback can be paid in crypto/ETHFI.",
            },
        ],
        events=[
            {
                'date': '2024-02-28',
                'title': '$23M Series A announced',
                'description': 'Ether.fi announced a $23M round led by Bullish Capital and CoinFund, with participation from OKX Ventures, Foresight Ventures, Consensys and Amber.',
                'link': 'https://www.coindesk.com/business/2024/02/28/liquid-restaking-protocol-etherfi-raises-23m-series-a',
            },
            {
                'date': '2024-03-18',
                'title': 'ETHFI governance token claim opens',
                'description': 'Claiming of the ETHFI governance token began on 18 March 2024 with a 90-day claim window; max supply fixed at 1,000,000,000.',
                'link': 'https://etherfi.medium.com/announcing-ethfi-the-ether-fi-governance-token-8cae7327763a',
            },
        ],
        timeline=[
            {
                'date': '2023-02-25',
                'title': 'First public security audit',
                'description': "CertiK audit published, the first entry in Ether.fi's public audit registry, marking the start of continuous external security review.",
                'link': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
                'status': 'executed',
            },
            {
                'date': '2024-03-18',
                'title': 'ETHFI token launch',
                'description': 'Governance token ETHFI launched with claiming opening 18 March 2024.',
                'link': 'https://etherfi.medium.com/announcing-ethfi-the-ether-fi-governance-token-8cae7327763a',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'ETHFI max supply',
                'value': '1,000,000,000 ETHFI (fixed, no further issuance)',
                'freshness': 'static',
                'source': {
                    'label': 'Announcing ETHFI: The ether.fi Governance Token (Medium)',
                    'url': 'https://etherfi.medium.com/announcing-ethfi-the-ether-fi-governance-token-8cae7327763a',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'ETHFI initial circulating supply',
                'value': '115,200,000 ETHFI (11.52% of max supply) at launch',
                'freshness': 'static',
                'source': {
                    'label': 'Announcing ETHFI: The ether.fi Governance Token (Medium)',
                    'url': 'https://etherfi.medium.com/announcing-ethfi-the-ether-fi-governance-token-8cae7327763a',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding raised',
                'value': '$23M Series A (Feb 2024) plus a previously unannounced ~$4M SAFE round closed end of 2023',
                'freshness': 'static',
                'source': {
                    'label': 'CoinDesk: Ether.fi Raises $23M Series A',
                    'url': 'https://www.coindesk.com/business/2024/02/28/liquid-restaking-protocol-etherfi-raises-23m-series-a',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'eETH/weETH, restaking adapters and Liquid Vault contracts hold user ETH; a bug or exploit in the deposit, withdrawal, or vault-strategy contracts could cause loss of funds. Continuous new releases (V2/V3, Pectra, EigenLayer slashing adapters) each expand the audited surface area.',
            },
            {
                'category': 'Network',
                'description': 'Underlying value depends on Ethereum proof-of-stake validators; validator downtime, penalties, or slashing on the beacon chain directly reduce the ETH backing eETH/weETH.',
            },
            {
                'category': 'Governance',
                'description': 'An early CertiK finding flagged that a single account controlled most smart-contract functions (centralization concern). Governance/admin keys and upgradeable contracts mean control decisions materially affect user funds; concentration of ETHFI voting power is an ongoing consideration.',
            },
            {
                'category': 'Counterparty',
                'description': 'Restaking through EigenLayer introduces dependence on EigenLayer contracts and the AVSs that Ether.fi opts into; misbehavior or slashing conditions at that layer can propagate losses to restakers.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'weETH is a wrapper whose secondary-market price can deviate from its intrinsic redemption value during periods of thin liquidity, stress, or delayed withdrawals, exposing DeFi users and lending-market collateral positions to depeg/liquidation risk.',
            },
        ],
        competitors=[
            {
                'name': 'Renzo',
                'slug': 'renzo',
                'rank': 1,
                'positioning': 'Major liquid restaking protocol issuing ezETH, also built on EigenLayer.',
                'similarities': 'Non-custodial liquid restaking of ETH via EigenLayer, issuing a tradable LRT usable across DeFi.',
                'differences': 'Renzo is a pure-play LRT issuer; Ether.fi has a broader product suite (Cash card, Liquid Vaults) and is the largest LRT by TVL.',
            },
            {
                'name': 'Kelp DAO',
                'slug': 'kelp-dao',
                'rank': 2,
                'positioning': 'Liquid restaking protocol issuing rsETH.',
                'similarities': 'Accepts ETH/LSTs and issues a liquid restaking token restaked through EigenLayer.',
                'differences': 'Narrower product focus than Ether.fi and smaller scale.',
            },
            {
                'name': 'Puffer',
                'slug': 'puffer',
                'rank': 3,
                'positioning': 'Native liquid restaking protocol issuing pufETH with anti-slashing tech.',
                'similarities': 'Liquid restaking on Ethereum leveraging EigenLayer.',
                'differences': 'Emphasis on Secure-Signer/anti-slashing validator tech and a distinct node-operator model.',
            },
            {
                'name': 'Swell',
                'slug': 'swell',
                'rank': 4,
                'positioning': 'Liquid staking and restaking protocol (swETH / rswETH) building its own L2.',
                'similarities': 'Offers liquid (re)staking of ETH usable in DeFi.',
                'differences': 'Pursues an app-chain/L2 strategy; different scale and token model.',
            },
            {
                'name': 'Lido',
                'slug': 'lido',
                'rank': 5,
                'positioning': 'The dominant Ethereum liquid staking protocol (stETH), not a restaking protocol.',
                'similarities': 'Turns staked ETH into a liquid, DeFi-composable token; direct competitor for ETH deposits.',
                'differences': 'Lido is pure liquid staking without native EigenLayer restaking; far larger overall staking TVL but a different product category.',
            },
        ],
        investment_rounds=[
            {
                'date': '2024-02-28',
                'round': 'Series A',
                'amountUsd': 23000000,
                'amountLabel': '$23M',
                'investors': [
                    'Bullish Capital',
                    'CoinFund',
                    'OKX Ventures',
                    'Foresight Ventures',
                    'Consensys',
                    'Amber',
                ],
                'link': 'https://www.coindesk.com/business/2024/02/28/liquid-restaking-protocol-etherfi-raises-23m-series-a',
            },
            {
                'date': '2023-12-31',
                'round': 'SAFE (previously unannounced)',
                'amountUsd': 4000000,
                'amountLabel': '~$4M',
                'investors': [],
                'link': 'https://www.coindesk.com/business/2024/02/28/liquid-restaking-protocol-etherfi-raises-23m-series-a',
            },
        ],
        audits=[
            {
                'firm': 'CertiK',
                'date': '2023-02-25',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Omniscia',
                'date': '2023-05-16',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Nethermind',
                'date': '2023-07-05',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Solidified',
                'date': '2023-10-26',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Hats Finance',
                'date': '2023-12-20',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Zellic',
                'date': '2024-01-11',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Zellic',
                'date': '2024-03-13',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Decurity',
                'date': '2024-04-08',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Halborn',
                'date': '2024-06-25',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'firm': 'Paladin',
                'date': '2024-09-30',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
        ],
        sources=[
            {
                'label': 'CoinDesk: Ether.fi Raises $23M Series A',
                'url': 'https://www.coindesk.com/business/2024/02/28/liquid-restaking-protocol-etherfi-raises-23m-series-a',
            },
            {
                'label': 'Announcing ETHFI: The ether.fi Governance Token (Medium)',
                'url': 'https://etherfi.medium.com/announcing-ethfi-the-ether-fi-governance-token-8cae7327763a',
            },
            {
                'label': 'Ether.fi audit registry (GitHub)',
                'url': 'https://github.com/etherfi-protocol/smart-contracts/tree/master/audits',
            },
            {
                'label': 'Ether.fi docs: Security & Audits',
                'url': 'https://etherfi.gitbook.io/etherfi/security/security-and-risks/audits',
            },
            {
                'label': 'Ether.fi official site',
                'url': 'https://www.ether.fi/',
            },
            {
                'label': 'Datawallet: Ether.fi Explained (eETH/weETH, Cash card)',
                'url': 'https://www.datawallet.com/crypto/ether-fi-explained',
            },
        ],
        github='https://github.com/etherfi-protocol',
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
        components=[
            {
                'name': 'ezETH',
                'description': "Renzo's flagship liquid restaking token (LRT). Users deposit ETH or accepted LSTs (e.g. stETH) and mint ezETH, which represents their EigenLayer-restaked position. It is a reward-bearing token (value accrues relative to the underlying rather than rebasing) that stays liquid and composable across DeFi. Native minting is supported on Ethereum, Arbitrum and Base.",
            },
            {
                'name': 'REZ (governance token)',
                'description': "Renzo's governance token, launched via Binance Launchpool as the 53rd project. Farming ran from April 24, 2024; token trading began April 30, 2024. Used for protocol governance and airdrop-based distribution to early users.",
            },
            {
                'name': 'EigenLayer strategy manager / AVS layer',
                'description': 'Renzo operates as an EigenLayer strategy manager, abstracting the complexity of selecting node operators and Actively Validated Services (AVSs). It routes restaked ETH to secure AVSs and manages operator delegation on behalf of ezETH holders.',
            },
        ],
        faq=[
            {
                'question': 'What is Renzo and what is ezETH?',
                'answer': 'Renzo is a liquid restaking protocol built on EigenLayer. Users deposit ETH or liquid staking tokens and receive ezETH, a liquid restaking token that represents their restaked position and auto-compounds staking plus restaking rewards while remaining usable across DeFi.',
                'pinned': True,
            },
            {
                'question': 'How does ezETH accrue value?',
                'answer': 'ezETH is a reward-bearing token (similar to cTokens). Rather than rebasing balances, its value increases relative to the underlying ETH as staking and restaking rewards accrue, so one ezETH represents an increasing amount of ETH over time.',
                'pinned': False,
            },
            {
                'question': 'What happened to ezETH in April 2024?',
                'answer': 'On April 24, 2024, ezETH depegged sharply (dropping roughly 18% on-chain, with thin-liquidity DEX prints as low as ~$688-$700 on Uniswap) following the REZ tokenomics/airdrop announcement. Users rushed to exit as they learned airdrop distribution details, and the illiquidity triggered liquidations on leveraged DeFi venues before the token largely recovered.',
                'pinned': False,
            },
            {
                'question': 'What is REZ and how was it launched?',
                'answer': "REZ is Renzo's governance token. It was distributed via Binance Launchpool (the 53rd project), with BNB/FDUSD farming from April 24, 2024 and spot trading opening April 30, 2024, alongside a Season 1 airdrop to early Renzo users.",
                'pinned': False,
            },
            {
                'question': 'Which chains does Renzo support?',
                'answer': 'Renzo supports native ezETH minting on Ethereum, Arbitrum and Base, with cross-chain bridging to reduce gas costs and expand access to Layer 2 ecosystems.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Renzo Protocol team',
                'role': 'Core development and protocol operations',
                'description': 'The core team builds and maintains the Renzo smart contracts, EigenLayer integration and multi-chain deployments. REZ token governance is intended to progressively decentralize decision-making over protocol parameters and operator selection.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Money-market fund / yield-bearing deposit receipt',
                'similarity': 'ezETH functions like a transferable, yield-accruing receipt: you deposit a base asset (ETH) and hold a token whose value grows as underlying rewards accrue, while remaining freely transferable and usable as collateral.',
                'differences': 'Yield is generated by securing decentralized services (Ethereum staking plus EigenLayer AVS restaking) rather than short-term debt instruments; there is no principal guarantee, redemption can be subject to withdrawal queues and slashing, and the token can depeg from its net asset value on secondary markets, as seen in April 2024.',
            },
        ],
        events=[
            {
                'date': '2024-04-24',
                'title': 'ezETH depeg during REZ airdrop / Launchpool launch',
                'description': 'ezETH lost its peg to ETH, dropping roughly 18% on-chain (with thin-liquidity DEX prints as low as ~$688-$700 on Uniswap) after the REZ tokenomics and airdrop announcement. Users rushed to exit ezETH for ETH, and the illiquidity cascaded into liquidations on leveraged DeFi protocols before the token largely recovered.',
                'link': 'https://www.theblock.co/post/290709/renzos-ezeth-depegs-18-3-following-rez-tokenomics-announcement-on-binance',
            },
            {
                'date': '2024-04-30',
                'title': 'REZ token listing via Binance Launchpool',
                'description': "REZ began spot trading on April 30, 2024 after a Binance Launchpool farming period (BNB/FDUSD) that started April 24, 2024. Renzo was Binance's 53rd Launchpool project, with a Season 1 airdrop to early users.",
                'link': 'https://www.binance.com/en/support/announcement/introducing-renzo-rez-on-binance-launchpool-farm-rez-by-staking-bnb-and-fdusd-b1e64410cc9c4ab29687392f5581a61b',
            },
        ],
        timeline=[
            {
                'date': '2024-01-16',
                'title': '$3.2M seed round',
                'description': 'Renzo raised $3.2M in a seed round led by Maven 11 Capital with participation from Figment Capital, IOSG Ventures, OKX Ventures and SevenX Ventures, at a reported ~$25M valuation.',
                'link': 'https://www.theblock.co/post/278564/binance-labs-renzo-ethereum-restaking',
                'status': 'executed',
            },
            {
                'date': '2024-02-22',
                'title': 'Binance Labs investment',
                'description': 'Binance Labs invested an undisclosed amount in Renzo, structured as equity with a token warrant in a 1:1 ratio, matching the seed round terms.',
                'link': 'https://www.theblock.co/post/278564/binance-labs-renzo-ethereum-restaking',
                'status': 'executed',
            },
            {
                'date': '2024-04-30',
                'title': 'REZ token launch (Binance Launchpool)',
                'description': 'REZ governance token began trading following a Binance Launchpool farming period and a Season 1 airdrop.',
                'link': 'https://www.binance.com/en/support/announcement/introducing-renzo-rez-on-binance-launchpool-farm-rez-by-staking-bnb-and-fdusd-b1e64410cc9c4ab29687392f5581a61b',
                'status': 'executed',
            },
            {
                'date': '2024-06-18',
                'title': '$17M strategic round',
                'description': "Renzo raised $17M across two rounds, led by Galaxy Ventures and Brevan Howard Digital's Nova Fund, to expand restaking services including ERC-20 token support.",
                'link': 'https://www.theblock.co/post/300647/ethereum-restaking-protocol-renzo-raises-17-million',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'ezETH depeg low (Uniswap, April 24 2024)',
                'value': '~$688-$700 momentary DEX print; ~18% intraday drop',
                'freshness': 'static',
                'source': {
                    'label': 'The Block - ezETH depegs 18.3%',
                    'url': 'https://www.theblock.co/post/290709/renzos-ezeth-depegs-18-3-following-rez-tokenomics-announcement-on-binance',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Total funding raised (disclosed)',
                'value': '$3.2M seed (Jan 2024) + $17M strategic (Jun 2024); Binance Labs amount undisclosed',
                'freshness': 'static',
                'source': {
                    'label': 'The Block - Renzo raises $17 million',
                    'url': 'https://www.theblock.co/post/300647/ethereum-restaking-protocol-renzo-raises-17-million',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Reserve / Depeg',
                'description': 'ezETH can trade below its underlying ETH value on secondary markets. In April 2024 it depegged ~18% (with DEX prints near $688-$700) amid the REZ airdrop exit rush, cascading into liquidations on leveraged venues. Withdrawal queues and thin on-chain liquidity amplify depeg risk during stress.',
            },
            {
                'category': 'Smart Contract',
                'description': "Renzo's contracts, EigenLayer integration and cross-chain bridge introduce code risk. A Code4rena contest (April-May 2024) surfaced 22 unique findings, including 8 high-severity issues, later addressed in a mitigation review.",
            },
            {
                'category': 'Counterparty',
                'description': "ezETH holders delegate to node operators and rely on Renzo's operator/AVS selection; misbehavior, downtime or mismanagement by chosen operators can impair rewards or principal.",
            },
            {
                'category': 'Systemic',
                'description': 'Restaking layers the same ETH across Ethereum consensus and multiple AVSs, so a slashing event or correlated failure in the EigenLayer ecosystem can propagate losses through ezETH and the broader LRT market.',
            },
            {
                'category': 'Governance',
                'description': 'REZ token distribution drew criticism in April 2024 for allocating a large share to team, investors and advisors and for timing that let Launchpool participants sell ahead of protocol farmers, highlighting governance/insider-alignment risk.',
            },
        ],
        competitors=[
            {
                'name': 'ether.fi',
                'slug': 'ether-fi',
                'rank': 1,
                'positioning': "Largest liquid restaking protocol by TVL; ezETH's primary competitor.",
                'similarities': 'EigenLayer-based liquid restaking; issues a reward-bearing LRT (eETH/weETH) and a native token with points/airdrop programs.',
                'differences': 'ether.fi runs a non-custodial, delegated staking model with its own eETH/weETH tokens and has historically led the LRT market on total value deposited.',
            },
            {
                'name': 'Kelp DAO',
                'slug': 'kelp-dao',
                'rank': 2,
                'positioning': 'Multi-asset LRT provider (rsETH) competing directly in EigenLayer restaking.',
                'similarities': 'Liquid restaking on EigenLayer with a reward-bearing token and points/incentive program.',
                'differences': 'Kelp emphasizes multi-LST deposit support and a distinct rsETH design and incentive structure.',
            },
            {
                'name': 'Puffer Finance',
                'slug': 'puffer',
                'rank': 3,
                'positioning': 'Native liquid restaking protocol (pufETH) backed by Binance Labs, a direct LRT competitor.',
                'similarities': 'EigenLayer liquid restaking with a reward-bearing token; shares Binance Labs backing.',
                'differences': 'Puffer focuses on native restaking with anti-slashing technology and a permissionless validator model.',
            },
        ],
        investment_rounds=[
            {
                'date': '2024-01-16',
                'round': 'Seed',
                'amountUsd': 3200000,
                'amountLabel': '$3.2M',
                'investors': [
                    'Maven 11 Capital',
                    'Figment Capital',
                    'IOSG Ventures',
                    'OKX Ventures',
                    'SevenX Ventures',
                ],
                'link': 'https://www.theblock.co/post/278564/binance-labs-renzo-ethereum-restaking',
            },
            {
                'date': '2024-02-22',
                'round': 'Strategic (Binance Labs)',
                'amountUsd': 0,
                'amountLabel': 'Undisclosed',
                'investors': [
                    'Binance Labs',
                ],
                'link': 'https://www.theblock.co/post/278564/binance-labs-renzo-ethereum-restaking',
            },
            {
                'date': '2024-06-18',
                'round': 'Strategic',
                'amountUsd': 17000000,
                'amountLabel': '$17M',
                'investors': [
                    'Galaxy Ventures',
                    'Brevan Howard Digital (Nova Fund)',
                ],
                'link': 'https://www.theblock.co/post/300647/ethereum-restaking-protocol-renzo-raises-17-million',
            },
        ],
        audits=[
            {
                'firm': 'Halborn (EVM Contracts Security Assessment)',
                'date': '2023-11-01',
                'url': 'https://github.com/Renzo-Protocol/contracts-public/tree/master/Audit',
            },
            {
                'firm': 'Halborn (REZ Staking)',
                'date': '2024-04-01',
                'url': 'https://docs.renzoprotocol.com/docs/security/audits',
            },
            {
                'firm': 'Halborn (Protocol Withdrawals)',
                'date': '2024-05-01',
                'url': 'https://docs.renzoprotocol.com/docs/security/audits',
            },
            {
                'firm': 'Sigma Prime (Restaking Security Assessment)',
                'date': '2024-06-01',
                'url': 'https://docs.renzoprotocol.com/docs/security/audits',
            },
            {
                'firm': 'Code4rena (competitive audit)',
                'date': '2024-06-01',
                'url': 'https://code4rena.com/reports/2024-04-renzo',
            },
        ],
        sources=[
            {
                'label': 'Renzo Docs - ezETH',
                'url': 'https://docs.renzoprotocol.com/docs/products/staking-suite/ezeth',
            },
            {
                'label': 'Renzo Docs - Security Audits',
                'url': 'https://docs.renzoprotocol.com/docs/security/audits',
            },
            {
                'label': 'The Block - Binance Labs invests in Renzo (seed + Binance Labs)',
                'url': 'https://www.theblock.co/post/278564/binance-labs-renzo-ethereum-restaking',
            },
            {
                'label': 'The Block - Renzo raises $17M (Galaxy / Brevan Howard)',
                'url': 'https://www.theblock.co/post/300647/ethereum-restaking-protocol-renzo-raises-17-million',
            },
            {
                'label': 'The Block - ezETH depegs 18.3%',
                'url': 'https://www.theblock.co/post/290709/renzos-ezeth-depegs-18-3-following-rez-tokenomics-announcement-on-binance',
            },
            {
                'label': 'Binance - REZ Launchpool announcement',
                'url': 'https://www.binance.com/en/support/announcement/introducing-renzo-rez-on-binance-launchpool-farm-rez-by-staking-bnb-and-fdusd-b1e64410cc9c4ab29687392f5581a61b',
            },
            {
                'label': 'Code4rena - Renzo findings report',
                'url': 'https://code4rena.com/reports/2024-04-renzo',
            },
        ],
        github='https://github.com/Renzo-Protocol/contracts-public',
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
        components=[
            {
                'name': 'rsETH (Liquid Restaked Token)',
                'description': "Kelp's core liquid restaking token. Users deposit native ETH or supported LSTs (Lido stETH, Stader ETHx) and mint rsETH, a non-rebasing, reward-bearing receipt whose exchange rate versus ETH appreciates as staking and EigenLayer restaking rewards accrue. rsETH represents a proportional share of the pooled, restaked assets and can be used across DeFi.",
            },
            {
                'name': 'wrsETH (wrapped rsETH)',
                'description': 'A wrapped, value-accruing version of rsETH obtainable 1:1, used for DeFi integrations and cross-chain deployments where a non-rebasing wrapper is preferred.',
            },
            {
                'name': 'EigenLayer restaking layer',
                'description': 'Kelp routes deposited assets into EigenLayer, delegating to professional node operators who restake across multiple Actively Validated Services (AVS) such as EigenDA, Lagrange, eoracle and others, earning restaking rewards on top of base ETH staking yield.',
            },
            {
                'name': 'Gain vaults (agETH, hgETH)',
                'description': 'Actively managed strategy vaults under the Kelp/Kernel umbrella. Airdrop Gain (agETH) bridges deposits to partner L2s (e.g. Scroll, Linea) to capture airdrop upside alongside staking/restaking yield; High Gain (hgETH) targets risk-adjusted returns via professional management.',
            },
            {
                'name': 'LRTOracle / pricing contract',
                'description': "Internal oracle contract that sets the rsETH/ETH exchange rate by dividing total minted rsETH by the ETH-denominated value of underlying assets. stETH is priced 1:1 to ETH (hardcoded) and ETHx is derived from Stader's StaderStakePoolsManager; a Chainlink feed provides secondary market pricing.",
            },
        ],
        faq=[
            {
                'question': 'What is rsETH and what does it accept?',
                'answer': "rsETH is Kelp DAO's liquid restaking token on Ethereum. Users deposit native ETH or whitelisted liquid staking tokens (Lido stETH and Stader ETHx) and receive rsETH, which represents restaked exposure on EigenLayer. sfrxETH was previously accepted but its deposit limit was set to 0 in June 2024.",
                'pinned': True,
            },
            {
                'question': 'Is rsETH rebasing?',
                'answer': 'No. rsETH is non-rebasing. Your token balance stays constant while the rsETH/ETH exchange rate increases over time to reflect accrued staking and restaking rewards.',
                'pinned': False,
            },
            {
                'question': 'How do withdrawals work?',
                'answer': 'Withdrawal is a multi-step process: a user submits a request (locking in the exchange rate), an off-chain service undelegates assets from EigenLayer and unstakes as needed, and after a minimum delay (historically ~7 days, reduced to ~2 days for small withdrawals via a buffer pool) the user claims the underlying asset.',
                'pinned': False,
            },
            {
                'question': 'How is Kelp DAO related to Stader and KernelDAO?',
                'answer': 'Kelp DAO was founded by Amitej Gajjala and Dheeraj Borra, who also built the Stader Labs liquid staking platform (source of the ETHx LST). Kelp later became part of the broader KernelDAO ecosystem, which spans Kernel (BNB Chain restaking), Kelp (Ethereum rsETH restaking) and Gain (automated vaults), unified under the KERNEL token.',
                'pinned': False,
            },
            {
                'question': 'What is the KERNEL token and airdrop?',
                'answer': 'KERNEL is the governance and utility token of the KernelDAO ecosystem, with a 1 billion max supply. It launched via a Binance Megadrop with its TGE / listing on 14 April 2025. Kelp users earned Kelp Miles / Kernel Points that fed into airdrop eligibility.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Amitej Gajjala',
                'role': 'Co-founder & CEO',
                'description': 'Co-founder of Kelp DAO / KernelDAO; also co-founder of Stader Labs. Leads product and strategy for the restaking ecosystem.',
            },
            {
                'name': 'Dheeraj Borra',
                'role': 'Co-founder',
                'description': "Co-founder of Kelp DAO / KernelDAO and Stader Labs, bringing liquid staking infrastructure experience to Kelp's rsETH restaking design.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Structured yield / fund-of-funds note',
                'similarity': 'rsETH is a single, tradable instrument that pools an underlying basket (multiple LSTs plus restaking exposure) and passes through blended yield, similar to how a structured note or fund wrapper packages diversified income streams into one holding.',
                'differences': 'rsETH is non-custodial, on-chain, transferable 24/7 and usable as DeFi collateral; there is no NAV administrator or redemption desk, and withdrawals are subject to protocol/unbonding delays and smart-contract and depeg risks rather than credit intermediaries.',
            },
        ],
        events=[
            {
                'date': '2023-12-12',
                'title': 'Kelp DAO Early Queue launches; rsETH goes live',
                'description': 'Kelp opened deposits for LSTs (stETH, ETHx); rsETH is cited as the first liquid restaking token to reach Ethereum mainnet on top of EigenLayer.',
                'link': 'https://www.flywheeldefi.com/article/kelp-dao/',
            },
            {
                'date': '2024-05-22',
                'title': 'Kelp DAO raises $9M private round',
                'description': 'Kelp announced a $9M private token sale led by SCB Limited and Laser Digital (Nomura), at a reported $90M fully diluted valuation.',
                'link': 'https://www.theblock.co/post/295972/ethereum-kelp-token-round-valuation',
            },
            {
                'date': '2024-06-20',
                'title': 'sfrxETH deposits disabled',
                'description': 'Deposit limit for sfrxETH set to 0 to ease integration with lending markets; supported collateral narrowed to ETH, stETH and ETHx.',
                'link': 'https://llamarisk.com/research/collateral-risk-rseth',
            },
            {
                'date': '2025-04-14',
                'title': 'KERNEL token TGE / Binance listing',
                'description': 'KERNEL, the KernelDAO ecosystem token (covering Kernel, Kelp and Gain), launched via Binance Megadrop with a 1B max supply.',
                'link': 'https://www.binance.com/en/support/announcement/detail/fcb0aca70fe7458197d653f63117d8ff',
            },
        ],
        timeline=[
            {
                'date': '2023-12-12',
                'title': 'rsETH mainnet launch',
                'description': 'First liquid restaking token live on Ethereum mainnet via EigenLayer.',
                'link': 'https://www.flywheeldefi.com/article/kelp-dao/',
                'status': 'executed',
            },
            {
                'date': '2025-04-14',
                'title': 'KERNEL token generation event',
                'description': 'Ecosystem-wide KERNEL token launched, unifying Kernel, Kelp and Gain governance and incentives.',
                'link': 'https://www.binance.com/en/support/announcement/detail/fcb0aca70fe7458197d653f63117d8ff',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Private round raise',
                'value': '$9,000,000 private token sale at a reported $90M FDV',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — Kelp token round',
                    'url': 'https://www.theblock.co/post/295972/ethereum-kelp-token-round-valuation',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Ecosystem assets (per KernelDAO, Mar 2025)',
                'value': '~$2B total assets deposited across products; Kelp cited at $1.2B+ rsETH TVL and 300K+ restakers',
                'freshness': 'dated',
                'source': {
                    'label': 'KernelDAO on X (Season 1 airdrop announcement)',
                    'url': 'https://x.com/kernel_dao/status/1904569248036634914',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'KERNEL token supply',
                'value': '1,000,000,000 KERNEL max supply; TGE 14 April 2025 via Binance Megadrop',
                'freshness': 'static',
                'source': {
                    'label': 'Binance — KernelDAO Megadrop announcement',
                    'url': 'https://www.binance.com/en/support/announcement/detail/fcb0aca70fe7458197d653f63117d8ff',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'rsETH relies on complex deposit, oracle and withdrawal contracts plus off-chain (AWS Lambda) automation for undelegation. Audits found no criticals but issues required fixes, and LlamaRisk flagged the absence of an active bug bounty at review time and limited public GitHub visibility.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': "The LRTOracle hardcodes stETH at 1:1 with ETH; if stETH (or ETHx) depegs, an arbitrageur could deposit the cheap asset and withdraw unaffected collateral, and the basket design socializes one asset's depeg across all rsETH holders. rsETH itself traded at roughly -1.5% discount during April 2024 market stress.",
            },
            {
                'category': 'Oracle',
                'description': "Exchange-rate integrity depends on the internal LRTOracle and permissioned price updates (ETHx rate sourced from Stader's contract; secondary Chainlink feed with 24h heartbeat). Faulty, stale or manipulated feeds could misprice mints and withdrawals.",
            },
            {
                'category': 'Counterparty',
                'description': 'Restaking runs through EigenLayer and a small set of professional node operators (e.g. Kiln, Allnodes, Luganodes) delegating to multiple AVS. Failure, downtime or (once live) slashing at EigenLayer/AVS/operator level flows through to rsETH.',
            },
            {
                'category': 'Governance',
                'description': 'At the LlamaRisk review no DAO existed; the protocol was controlled by a 6/8 admin multisig and a 2/5 manager multisig plus a 10-day timelock, with upgrade, oracle and operator powers concentrated in the team — a centralization and key-management risk.',
            },
            {
                'category': 'Collateral',
                'description': "Accepted collateral is concentrated in a few LSTs (stETH, ETHx) subject to deposit caps; ETHx is issued by the founders' own Stader platform, creating correlated exposure between the collateral issuer and the protocol operator.",
            },
        ],
        competitors=[
            {
                'name': 'Ether.fi',
                'slug': 'ether-fi',
                'rank': 1,
                'positioning': 'Market-leading Ethereum liquid restaking protocol (eETH/weETH) built on EigenLayer.',
                'similarities': 'Liquid restaking on EigenLayer; issues a non-rebasing wrapped token usable across DeFi; points/airdrop-driven growth.',
                'differences': 'Ether.fi centers on native ETH staking with delegated node operation and has expanded into cards/cash products; Kelp is built around accepting existing LSTs (stETH, ETHx) into a restaked basket.',
            },
            {
                'name': 'Renzo',
                'slug': 'renzo',
                'rank': 2,
                'positioning': 'Liquid restaking protocol issuing ezETH across EigenLayer and multiple chains.',
                'similarities': 'EigenLayer-based LRT with a reward-bearing token and heavy points/airdrop incentives; multi-chain distribution.',
                'differences': 'Renzo emphasizes cross-chain ezETH availability and its own AVS strategy; Kelp differentiates on multi-LST deposit support and the Stader/Kernel ecosystem.',
            },
            {
                'name': 'Puffer Finance',
                'slug': 'puffer',
                'rank': 3,
                'positioning': 'Native liquid restaking protocol (pufETH) with anti-slashing tech on EigenLayer.',
                'similarities': 'EigenLayer liquid restaking with a value-accruing token and DeFi integrations.',
                'differences': 'Puffer focuses on native restaking and permissionless node operation with Secure-Signer anti-slashing; Kelp focuses on pooling third-party LSTs.',
            },
            {
                'name': 'Kelp DAO (Stader ETHx as base staking comparison)',
                'slug': 'stader',
                'rank': 4,
                'positioning': "Stader is the multichain liquid staking provider (ETHx) run by Kelp's founders — an adjacent, partly overlapping product.",
                'similarities': 'Shared founders and infrastructure; ETHx is one of the LSTs restaked inside rsETH.',
                'differences': 'Stader provides base liquid staking (ETHx) while Kelp adds a restaking layer on top; they are complementary more than directly competitive.',
            },
        ],
        investment_rounds=[
            {
                'date': '2024-05-22',
                'round': 'Private token sale',
                'amountUsd': 9000000,
                'amountLabel': '$9M (reported ~$90M FDV)',
                'investors': [
                    'SCB Limited',
                    'Laser Digital (Nomura)',
                    'Bankless Ventures',
                    'Hypersphere Ventures',
                    'Draper Dragon',
                    'DACM',
                    'Cypher Capital',
                    'GSR',
                    'HTX Ventures',
                    'DWF Ventures',
                ],
                'link': 'https://blogs.kerneldao.com/blog/kelp-dao-secures-9-million-in-private-sale-to-propel-restaking-innovation',
            },
        ],
        audits=[
            {
                'firm': 'Code4rena',
                'date': '2023-11-15',
                'url': 'https://code4rena.com/reports/2023-11-kelp',
            },
            {
                'firm': 'Sigma Prime (rsETH Adapter, v2.0)',
                'date': '2024-11-01',
                'url': 'https://kerneldao.com/kelp/audits/smartcontracts/SigmaPrime_4.pdf',
            },
        ],
        sources=[
            {
                'label': 'Kelp / KernelDAO official site',
                'url': 'https://kerneldao.com/kelp/',
            },
            {
                'label': 'LlamaRisk — rsETH Collateral Risk Assessment',
                'url': 'https://llamarisk.com/research/collateral-risk-rseth',
            },
            {
                'label': 'The Block — Kelp raises $9M token round at $90M valuation',
                'url': 'https://www.theblock.co/post/295972/ethereum-kelp-token-round-valuation',
            },
            {
                'label': 'KernelDAO blog — Kelp secures $9M private sale',
                'url': 'https://blogs.kerneldao.com/blog/kelp-dao-secures-9-million-in-private-sale-to-propel-restaking-innovation',
            },
            {
                'label': 'Code4rena — Kelp DAO rsETH findings report',
                'url': 'https://code4rena.com/reports/2023-11-kelp',
            },
            {
                'label': 'Binance — KernelDAO (KERNEL) Megadrop / listing announcement',
                'url': 'https://www.binance.com/en/support/announcement/detail/fcb0aca70fe7458197d653f63117d8ff',
            },
            {
                'label': 'Flywheel DeFi — Kelp DAO rsETH explainer',
                'url': 'https://www.flywheeldefi.com/article/kelp-dao/',
            },
        ],
        github='https://github.com/Kelp-DAO/LRT-rsETH',
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
        components=[
            {
                'name': 'pufETH (native Liquid Restaking Token)',
                'description': "The protocol's reward-bearing nLRT. Users deposit ETH (or stETH, wstETH, WETH) into the Puffer vault and receive pufETH, which appreciates against ETH as it accrues Ethereum PoS staking rewards plus EigenLayer restaking rewards. Withdrawals and DeFi composability keep the staked capital liquid.",
            },
            {
                'name': 'Secure-Signer',
                'description': 'A remote-signing tool that runs inside a Trusted Execution Environment (Intel SGX enclave). It keeps validator keys in encrypted memory and hardware-enforces that only non-slashable messages can be signed, maintaining an EIP-3076 integrity-protected database of prior signatures to prevent slashing from accidents or compromised/buggy clients. Funded by an Ethereum Foundation grant.',
            },
            {
                'name': 'RAVe (Remote Attestation Verification)',
                'description': "A set of smart contracts that verify SGX remote-attestation evidence on-chain, letting an untrusted node operator cryptographically prove it is running Secure-Signer before being admitted to the pool. RAVe is the second deliverable of Puffer's Ethereum Foundation grant.",
            },
            {
                'name': 'UniFi (based rollup + AVS)',
                'description': "Puffer's flagship Layer-2 roadmap: UniFi is a based rollup and UniFi AVS on EigenLayer provides preconfirmations (preconfs) as a service for based-rollup fast finality. It is the primary use of the Binance Labs / L2 investment.",
            },
            {
                'name': 'PUFFER token & vlPUFFER',
                'description': 'PUFFER is the native governance token for the Puffer Protocol and UniFi ecosystem (1 billion max supply). vlPUFFER is a non-transferable, vote-escrow position minted by locking PUFFER (30 days at 1x up to 24 months at 24x multiplier; 10 PUFFER minimum) that grants voting weight over Puffer LRT parameters, UniFi AVS and UniFi Rollup.',
            },
        ],
        faq=[
            {
                'question': 'What is pufETH?',
                'answer': "pufETH is Puffer's native liquid restaking token (nLRT). When you deposit ETH (or stETH/wstETH/WETH) you receive pufETH, which represents your stake and appreciates over time as it accrues both Ethereum proof-of-stake rewards and EigenLayer restaking rewards, while remaining liquid for use across DeFi.",
                'pinned': True,
            },
            {
                'question': 'How is Puffer different from a normal liquid staking token?',
                'answer': 'Puffer is a native liquid *restaking* protocol built on EigenLayer, so pufETH earns an additional restaking-reward layer on top of base PoS yield. It also lowers the barrier to running a validator (as little as ~1 ETH of operator bond) and uses anti-slashing hardware (Secure-Signer) rather than relying solely on operator diligence.',
                'pinned': False,
            },
            {
                'question': 'How does Secure-Signer reduce slashing risk?',
                'answer': 'Secure-Signer runs validator signing inside an Intel SGX Trusted Execution Environment. Keys stay in encrypted memory and the hardware only permits signing of non-slashable messages, backed by an EIP-3076 database of past signatures. This protects against slashing from accidents, double-signing or compromised/buggy consensus clients.',
                'pinned': False,
            },
            {
                'question': 'What is the PUFFER token used for?',
                'answer': 'PUFFER is the governance token of Puffer Protocol and the UniFi ecosystem (1 billion max supply). Holders can lock PUFFER into non-transferable vlPUFFER to gain voting power over LRT parameters, operator selection, UniFi AVS fees and UniFi Rollup upgrades, with lock multipliers up to 24x for a 24-month lock.',
                'pinned': False,
            },
            {
                'question': 'What is UniFi?',
                'answer': "UniFi is Puffer's based-rollup roadmap. UniFi AVS is an EigenLayer service that provides preconfirmations for based rollups, and the UniFi rollup is Puffer's Layer-2 aiming to inherit Ethereum's decentralization while offering fast finality.",
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Puffer Finance (Puffer Labs)',
                'role': 'Core protocol developer',
                'description': 'The team building the Puffer native liquid restaking protocol, Secure-Signer/RAVe anti-slashing tooling and the UniFi based rollup. Governance is transitioning to PUFFER / vlPUFFER token holders over Puffer LRT, UniFi AVS and UniFi Rollup parameters.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Interest-bearing / money-market fund share',
                'similarity': 'pufETH is a liquid, transferable claim whose value accrues over time from an underlying yield stream, similar to how a money-market fund share grows in value while staying redeemable.',
                'differences': 'Yield comes from Ethereum validation and restaking rather than short-term debt; there is no regulated custodian or NAV guarantee, and holders bear smart-contract, slashing and restaking (AVS) risks with no deposit insurance.',
            },
        ],
        events=[
            {
                'date': '2023-08-08',
                'title': '$5.5M seed round announced',
                'description': 'Puffer raised a $5.5M seed round co-led by Lemniscap and Lightspeed Faction, with Brevan Howard Digital, Bankless Ventures, Animoca Ventures and others participating.',
                'link': 'https://www.coindesk.com/business/2023/08/08/brevan-howard-backs-crypto-infrastructure-startup-puffer-in-55m-round',
            },
            {
                'date': '2024-01-30',
                'title': 'Binance Labs strategic investment',
                'description': "Binance Labs invested an undisclosed amount to support Puffer's Layer-2 (EigenLayer AVS) build-out and to bring pufETH to BNB Chain users.",
                'link': 'https://www.theblock.co/post/275102/binance-labs-puffer-investment',
            },
            {
                'date': '2024-04-16',
                'title': '$18M Series A announced',
                'description': 'Puffer raised $18M (SAFT) co-led by Brevan Howard Digital and Electric Capital at a $200M fully diluted token valuation, ahead of its mainnet launch.',
                'link': 'https://www.theblock.co/post/288295/ethereum-puffer-finance-funding-token-valuation',
            },
            {
                'date': '2024-10-14',
                'title': 'PUFFER airdrop / TGE',
                'description': "PUFFER token generation event; the Season 1 'Crunchy Carrot Quest' airdrop claim window opened on 14 October 2024 and ran through 14 January 2025.",
                'link': 'https://www.kucoin.com/news/articles/puffer-finance-airdrop-starts-on-october-14-2024-listing-date-eligibility-and-more',
            },
        ],
        timeline=[
            {
                'date': '2024-05-08',
                'title': 'Mainnet launch',
                'description': "Puffer's mainnet went live, opening native liquid restaking and node-operator participation. Announcement published 9 May 2024.",
                'link': 'https://medium.com/puffer-fi/welcome-to-puffer-mainnet-685eefd59698',
                'status': 'executed',
            },
            {
                'date': '2024-10-14',
                'title': 'PUFFER governance token launch',
                'description': 'PUFFER launched as the governance token for Puffer and UniFi, with the vlPUFFER vote-escrow mechanism.',
                'link': 'https://docs.puffer.fi/yield/governance/token',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Series A raise',
                'value': '$18M SAFT at $200M FDV, co-led by Brevan Howard Digital and Electric Capital (16 Apr 2024)',
                'freshness': 'static',
                'source': {
                    'label': 'The Block — Puffer Finance $200M valuation funding',
                    'url': 'https://www.theblock.co/post/288295/ethereum-puffer-finance-funding-token-valuation',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'PUFFER max supply',
                'value': '1,000,000,000 PUFFER (governance token; ~102.3M initially circulating)',
                'freshness': 'static',
                'source': {
                    'label': 'Puffer Docs — PUFFER Token and vlPUFFER',
                    'url': 'https://docs.puffer.fi/yield/governance/token',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'Mainnet launch',
                'value': '8 May 2024',
                'freshness': 'static',
                'source': {
                    'label': 'Puffer Finance — Welcome to Puffer Mainnet',
                    'url': 'https://medium.com/puffer-fi/welcome-to-puffer-mainnet-685eefd59698',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'pufETH, PufferVault/Depositor, RAVe and related contracts hold pooled staked ETH; an exploit or upgrade/timelock error could cause loss of deposits despite multiple audits.',
            },
            {
                'category': 'Network',
                'description': "Validator slashing risk on Ethereum: although Secure-Signer (SGX TEE) is designed to prevent slashable messages, downtime, penalties, or a flaw/compromise in the SGX enclave or attestation flow could still impair pufETH's backing.",
            },
            {
                'category': 'Counterparty',
                'description': 'Native restaking on EigenLayer means pufETH is exposed to EigenLayer AVS operators and their conditions; misbehavior, additional slashing at the AVS layer, or EigenLayer protocol risk feeds back into pufETH value.',
            },
            {
                'category': 'Oracle',
                'description': 'The pufETH-to-ETH exchange rate and reward accounting depend on rate/oracle inputs; manipulation or stale pricing could misprice pufETH in the vault or in downstream DeFi markets.',
            },
            {
                'category': 'Governance',
                'description': "PUFFER/vlPUFFER holders and multisig/timelock controllers can change operator selection, supported assets, fees and upgrades; concentrated voting power or governance capture could push parameters against stakers' interests.",
            },
            {
                'category': 'Collateral',
                'description': "pufETH accepts stETH/wstETH as deposit assets, so it inherits exposure to Lido's staking token; a depeg or issue with the underlying LST could affect Puffer's reserves and redemptions.",
            },
        ],
        competitors=[
            {
                'name': 'ether.fi',
                'slug': 'ether-fi',
                'rank': 1,
                'positioning': 'Largest EigenLayer-based liquid restaking protocol (eETH/weETH).',
                'similarities': 'Native/liquid restaking on EigenLayer; issues a reward-bearing LRT that stacks PoS + restaking yield and is composable across DeFi.',
                'differences': 'ether.fi is non-custodial delegated restaking with a broader product suite (cash card, liquid vaults); Puffer differentiates on hardware anti-slashing (Secure-Signer) and its UniFi based-rollup roadmap.',
            },
            {
                'name': 'Renzo',
                'slug': 'renzo',
                'rank': 2,
                'positioning': 'Major EigenLayer liquid restaking protocol issuing ezETH.',
                'similarities': 'Liquid restaking token on EigenLayer combining PoS and AVS restaking rewards.',
                'differences': 'Renzo abstracts AVS/operator selection as a strategy manager and expanded cross-chain; Puffer emphasizes permissionless node operation with a low bond and TEE-based slashing protection.',
            },
            {
                'name': 'Kelp DAO',
                'slug': 'kelp-dao',
                'rank': 3,
                'positioning': 'Liquid restaking protocol issuing rsETH on EigenLayer.',
                'similarities': 'LRT wrapper over EigenLayer restaking with DeFi composability.',
                'differences': 'Kelp accepts multiple LSTs into a single rsETH basket; Puffer centers on native ETH restaking with its own operator/anti-slashing stack and L2 ambitions.',
            },
            {
                'name': 'Swell',
                'slug': 'swell',
                'rank': 4,
                'positioning': 'Liquid staking/restaking protocol (swETH/rswETH) with its own L2 roadmap.',
                'similarities': "Restaking LRT plus a Layer-2 scaling roadmap, overlapping directly with Puffer's UniFi ambitions.",
                'differences': 'Swell built the Swell L2; Puffer pursues a based rollup (UniFi) with EigenLayer preconfirmations.',
            },
        ],
        partnerships=[
            {
                'name': 'BNB Chain (via Binance Labs)',
                'date': '2024-01-30',
                'amountLabel': None,
                'description': 'Alongside its strategic investment, Binance Labs stated Puffer would introduce pufETH to BNB Chain users, enabling them to earn staking and restaking rewards.',
            },
        ],
        investment_rounds=[
            {
                'date': '2023-08-08',
                'round': 'Seed',
                'amountUsd': 5500000,
                'amountLabel': '$5.5M',
                'investors': [
                    'Lemniscap',
                    'Lightspeed Faction',
                    'Brevan Howard Digital',
                    'Bankless Ventures',
                    'Animoca Ventures',
                    'DACM',
                    'Canonical Crypto',
                ],
                'link': 'https://www.coindesk.com/business/2023/08/08/brevan-howard-backs-crypto-infrastructure-startup-puffer-in-55m-round',
            },
            {
                'date': '2024-01-30',
                'round': 'Strategic (Binance Labs)',
                'amountUsd': 0,
                'amountLabel': 'Undisclosed',
                'investors': [
                    'Binance Labs',
                ],
                'link': 'https://www.theblock.co/post/275102/binance-labs-puffer-investment',
            },
            {
                'date': '2024-04-16',
                'round': 'Series A',
                'amountUsd': 18000000,
                'amountLabel': '$18M',
                'investors': [
                    'Brevan Howard Digital',
                    'Electric Capital',
                    'Coinbase Ventures',
                    'Kraken Ventures',
                    'Franklin Templeton',
                    'Avon Ventures',
                    'Mechanism Capital',
                    'Lightspeed Faction',
                    'Consensys',
                    'Animoca',
                    'GSR',
                    'Lemniscap',
                ],
                'link': 'https://www.theblock.co/post/288295/ethereum-puffer-finance-funding-token-valuation',
            },
        ],
        audits=[
            {
                'firm': 'BlockSec',
                'date': '',
                'url': 'https://github.com/blocksecteam/audit-reports/blob/main/solidity/blocksec_puffer_v1.0-signed.pdf',
            },
            {
                'firm': 'SlowMist',
                'date': '',
                'url': 'https://github.com/slowmist/Knowledge-Base/blob/master/open-report-V2/smart-contract/SlowMist%20Audit%20Report%20-%20pufETH_en-us.pdf',
            },
        ],
        sources=[
            {
                'label': 'Puffer Docs — Stake (pufETH)',
                'url': 'https://docs.puffer.fi/yield/stakers/stake',
            },
            {
                'label': 'Puffer Docs — PUFFER Token and vlPUFFER',
                'url': 'https://docs.puffer.fi/yield/governance/token',
            },
            {
                'label': 'The Block — Puffer $18M Series A at $200M valuation',
                'url': 'https://www.theblock.co/post/288295/ethereum-puffer-finance-funding-token-valuation',
            },
            {
                'label': 'CoinDesk — Brevan Howard backs Puffer $5.5M seed',
                'url': 'https://www.coindesk.com/business/2023/08/08/brevan-howard-backs-crypto-infrastructure-startup-puffer-in-55m-round',
            },
            {
                'label': 'The Block — Binance Labs invests in Puffer',
                'url': 'https://www.theblock.co/post/275102/binance-labs-puffer-investment',
            },
            {
                'label': 'BlockSec — pufETH audit report (PDF)',
                'url': 'https://github.com/blocksecteam/audit-reports/blob/main/solidity/blocksec_puffer_v1.0-signed.pdf',
            },
            {
                'label': 'Puffer Finance — Welcome to Puffer Mainnet',
                'url': 'https://medium.com/puffer-fi/welcome-to-puffer-mainnet-685eefd59698',
            },
        ],
        github='https://github.com/PufferFinance',
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
        components=[
            {
                'name': 'uniETH',
                'description': 'Non-custodial ETH liquid restaking token. ETH staked with Bedrock is delegated to node operators (including RockX) and natively restaked via EigenLayer for additional rewards. uniETH is a non-rebasing, value-accruing token: 1 uniETH grows increasingly worth more than 1 ETH over time.',
            },
            {
                'name': 'uniBTC',
                'description': 'Liquid restaked Bitcoin token. Accepts wrapped BTC (wBTC first, later others) and routes it to Bitcoin staking / restaking yield layers, with Bedrock described as building natively on Babylon. uniBTC has been integrated into restaking ecosystems (e.g. EigenLayer via the ARPA AVS).',
            },
            {
                'name': 'brBTC',
                'description': 'Bedrock BTC. A BTC yield product that accepts uniBTC and multiple wrapped BTC assets and allocates them across trusted yield sources such as Babylon, Kernel, Pell and SatLayer. Audited by Blocksec (Dec 2024).',
            },
            {
                'name': 'uniIOTX',
                'description': "Liquid staking token for IoTeX (IOTX), extending Bedrock's non-rebasing, value-accruing model to the IoTeX network.",
            },
            {
                'name': 'BR token',
                'description': "Bedrock's native governance/utility token. Total supply 1 billion; Token Generation Event on 21 March 2025 with a Binance Wallet IDO that was heavily oversubscribed.",
            },
        ],
        faq=[
            {
                'question': 'What is Bedrock?',
                'answer': 'Bedrock is a multi-asset liquid restaking protocol offering tokens including uniETH (ETH), uniBTC/brBTC (Bitcoin) and uniIOTX (IoTeX). It was designed as a non-custodial solution in partnership with blockchain infrastructure firm RockX.',
                'pinned': True,
            },
            {
                'question': 'What is the relationship between Bedrock and RockX?',
                'answer': "Bedrock's non-custodial liquid restaking solution was designed in partnership with RockX, a long-standing blockchain infrastructure company with roots in crypto staking. RockX acts as an early contributor and node operator; per Bedrock's May 2024 disclosure, around 41,344 ETH had been staked across 1,292 validators on RockX.",
                'pinned': False,
            },
            {
                'question': 'Are uniETH and uniBTC rebasing tokens?',
                'answer': 'No. Bedrock uses a non-rebasing model: token quantity does not grow, instead each token accrues value, so 1 uniETH (or uniIOTX) becomes worth increasingly more than 1 ETH (or IOTX) over time.',
                'pinned': False,
            },
            {
                'question': 'Was Bedrock ever exploited?',
                'answer': 'Yes. In late September 2024 Bedrock disclosed a smart-contract exploit in the uniBTC minting mechanism. An attacker used a flash loan to abuse a flaw that mispriced ETH against uniBTC, netting roughly 649.6 WETH (about $2 million). Bedrock paused affected contracts, worked with white-hat hackers and auditors on recovery, prepared a reimbursement plan, and integrated Chainlink Proof of Reserve to secure uniBTC minting.',
                'pinned': False,
            },
            {
                'question': 'Does Bedrock have a token?',
                'answer': 'Yes. The BR token had its Token Generation Event on 21 March 2025 via a Binance Wallet IDO, with a total supply of 1 billion tokens.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'RockX',
                'role': 'Institutional design partner and node operator',
                'description': "Singapore-based blockchain infrastructure company that co-designed Bedrock's non-custodial liquid restaking solution and operates validators for the protocol.",
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Interest-bearing / accumulating fund share',
                'similarity': 'uniETH and uniBTC are non-rebasing, value-accruing tokens: like an accumulating fund unit whose NAV rises rather than paying out distributions, the token quantity is fixed while its redemption value grows with accrued staking/restaking yield.',
                'differences': 'Bedrock is non-custodial and on-chain, exposed to smart-contract, oracle and slashing risk rather than a regulated custodian; yield derives from proof-of-stake and restaking rewards, not fixed-income coupons, and there is no deposit insurance.',
            },
        ],
        events=[
            {
                'date': '2024-05-02',
                'title': 'Bedrock expands to Bitcoin with strong backers',
                'description': 'Bedrock announced its expansion into Bitcoin liquid restaking and a fundraise led by OKX Ventures, LongHash Ventures and Comma3 Ventures, describing itself as building natively on Babylon.',
                'link': 'https://www.globenewswire.com/news-release/2024/05/02/2873774/0/en/Bedrock-a-multi-asset-liquid-restaking-protocol-expands-to-Bitcoin-with-strong-backers.html',
            },
            {
                'date': '2024-09-27',
                'title': 'uniBTC exploit disclosed and Chainlink Proof of Reserve integration',
                'description': 'Bedrock disclosed a uniBTC minting exploit (~649.6 WETH / ~$2M) and announced integration of Chainlink Proof of Reserve to secure the uniBTC minting function.',
                'link': 'https://chainlinktoday.com/after-2-million-exploit-bedrock-turns-to-chainlink-proof-of-reserve-for-secure-minting/',
            },
            {
                'date': '2025-03-21',
                'title': 'BR token generation event',
                'description': 'Bedrock conducted its BR Token Generation Event via a Binance Wallet IDO, which drew heavy oversubscription; BR listed for trading across several exchanges.',
                'link': 'https://www.prnewswire.com/news-releases/bedrocks-br-token-launch-draws-9653-oversubscription-on-binance-wallet-ido-reinforcing-community-driven-bitcoin-staking-302408000.html',
            },
        ],
        timeline=[
            {
                'date': '2024-05-01',
                'title': 'Seed / strategic round',
                'description': 'Fundraise led by OKX Ventures, LongHash Ventures and Comma3 Ventures with additional backers; amount not publicly disclosed.',
                'link': 'https://www.globenewswire.com/news-release/2024/05/02/2873774/0/en/Bedrock-a-multi-asset-liquid-restaking-protocol-expands-to-Bitcoin-with-strong-backers.html',
                'status': 'executed',
            },
            {
                'date': '2025-03-21',
                'title': 'BR token launch (TGE)',
                'description': 'BR token generation event via Binance Wallet IDO; total supply 1 billion.',
                'link': 'https://www.prnewswire.com/news-releases/bedrocks-br-token-launch-draws-9653-oversubscription-on-binance-wallet-ido-reinforcing-community-driven-bitcoin-staking-302408000.html',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'BR total supply',
                'value': '1,000,000,000 BR',
                'freshness': 'static',
                'source': {
                    'label': 'PR Newswire - BR token launch',
                    'url': 'https://www.prnewswire.com/news-releases/bedrocks-br-token-launch-draws-9653-oversubscription-on-binance-wallet-ido-reinforcing-community-driven-bitcoin-staking-302408000.html',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'uniBTC exploit loss',
                'value': '~649.6 WETH (~$2,000,000)',
                'freshness': 'static',
                'source': {
                    'label': 'The Defiant - Bedrock uniBTC exploit',
                    'url': 'https://thedefiant.io/news/hacks/bedrock-vulnerability-allows-hacker-to-drain-usd2m-from-unibtc-liquidity-pools',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'Bedrock suffered a real uniBTC minting exploit disclosed September 2024 (~$2M) caused by an unaudited/faulty exchange-rate mint path; complex multi-asset, multi-chain contracts remain a primary risk surface despite subsequent audits.',
            },
            {
                'category': 'Oracle',
                'description': 'Minting/redemption relies on correct asset pricing and reserve accounting. The exploit stemmed from mispricing ETH vs BTC; Bedrock now depends on Chainlink Proof of Reserve, so oracle correctness and availability are load-bearing.',
            },
            {
                'category': 'Counterparty',
                'description': 'Non-custodial but operationally dependent on node operators such as RockX and on external yield venues (Babylon, EigenLayer, Kernel, Pell, SatLayer); operator failure or misbehavior can impair backing.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'uniETH/uniBTC are value-accruing wrapped claims; if reserves are compromised (as during the 2024 exploit) or redemption is impaired, the tokens can trade below their intended backing.',
            },
            {
                'category': 'Collateral',
                'description': 'uniBTC/brBTC route wrapped-BTC collateral (e.g. wBTC) into restaking layers; the underlying wrapped assets and third-party restaking layers carry their own custody, slashing and liquidity risks that pass through to holders.',
            },
        ],
        competitors=[
            {
                'name': 'EigenLayer',
                'slug': 'eigenlayer',
                'rank': 1,
                'positioning': 'Underlying restaking base layer on Ethereum',
                'similarities': "Both are core to the Ethereum restaking thesis; Bedrock's uniETH natively restakes through EigenLayer.",
                'differences': 'EigenLayer is the restaking primitive/marketplace itself; Bedrock is a liquid restaking token issuer that abstracts EigenLayer restaking into a tradable token and extends to BTC and IoTeX.',
            },
            {
                'name': 'ether.fi',
                'slug': 'ether-fi',
                'rank': 2,
                'positioning': 'Leading ETH liquid restaking token issuer',
                'similarities': 'Both issue ETH liquid restaking tokens built on EigenLayer with a non-custodial design.',
                'differences': 'ether.fi is far larger and ETH-restaking-focused with a broader product suite; Bedrock is smaller and differentiates via multi-asset (BTC, IoTeX) coverage.',
            },
            {
                'name': 'Renzo',
                'slug': 'renzo',
                'rank': 3,
                'positioning': 'ETH liquid restaking (ezETH)',
                'similarities': 'Both issue ETH LRTs abstracting EigenLayer restaking into a liquid token.',
                'differences': 'Renzo concentrates on ETH restaking strategy management; Bedrock spans ETH plus a distinct Bitcoin restaking product line.',
            },
            {
                'name': 'Kelp DAO',
                'slug': 'kelp-dao',
                'rank': 4,
                'positioning': 'ETH liquid restaking (rsETH)',
                'similarities': 'Both are LRT issuers on EigenLayer with value-accruing token designs.',
                'differences': "Kelp focuses on ETH restaking; Bedrock's differentiator is multi-asset restaking including Bitcoin via Babylon.",
            },
        ],
        partnerships=[
            {
                'name': 'RockX',
                'date': None,
                'amountLabel': None,
                'description': "Institutional design partner; Bedrock's non-custodial liquid restaking solution was co-designed with RockX, which also operates validators for the protocol.",
            },
            {
                'name': 'Chainlink (Proof of Reserve)',
                'date': '2024-09-27',
                'amountLabel': None,
                'description': 'Bedrock integrated Chainlink Proof of Reserve to provide automated on-chain verification of reserves backing uniBTC and to secure the uniBTC minting function following the September 2024 exploit.',
            },
            {
                'name': 'Babylon',
                'date': None,
                'amountLabel': None,
                'description': "Bedrock builds its Bitcoin staking/restaking (uniBTC/brBTC) natively on Babylon; Babylon co-founder Fisher Yu also participated as an angel investor in Bedrock's 2024 round.",
            },
        ],
        investment_rounds=[
            {
                'date': '2024-05-01',
                'round': 'Seed / strategic',
                'amountUsd': 0,
                'amountLabel': 'Undisclosed',
                'investors': [
                    'OKX Ventures',
                    'LongHash Ventures',
                    'Comma3 Ventures',
                    'Waterdrip Capital',
                    'Lbank Labs',
                    'Amber Group',
                    'ArcheFund',
                    'Whale Ground',
                    'Fisher Yu (Babylon co-founder, angel)',
                ],
                'link': 'https://www.globenewswire.com/news-release/2024/05/02/2873774/0/en/Bedrock-a-multi-asset-liquid-restaking-protocol-expands-to-Bitcoin-with-strong-backers.html',
            },
        ],
        audits=[
            {
                'firm': 'PeckShield',
                'date': '2024-02-15',
                'url': 'https://raw.githubusercontent.com/Bedrock-Technology/docs/main/PeckShield-Audit-Report-Bedrock-v1.0.pdf',
            },
            {
                'firm': 'Blocksec',
                'date': '2024-06-12',
                'url': 'https://github.com/Bedrock-Technology/uniBTC/blob/main/code%20audit%20blocksec.pdf',
            },
            {
                'firm': 'PeckShield',
                'date': '2024-10-01',
                'url': 'https://github.com/Bedrock-Technology/uniBTC/blob/main/PeckShield-Audit-Report-uniBTC-v1.0.pdf',
            },
            {
                'firm': 'Blocksec',
                'date': '2024-10-30',
                'url': 'https://github.com/Bedrock-Technology/uniBTC/blob/main/blocksec_bedrock_unibtc_v1.0-signed.pdf',
            },
            {
                'firm': 'Blocksec',
                'date': '2024-12-16',
                'url': 'https://github.com/Bedrock-Technology/omni/blob/main/blocksec_bedrock_br_v1.0-signed.pdf',
            },
        ],
        sources=[
            {
                'label': 'Bedrock official site',
                'url': 'https://www.bedrock.technology/',
            },
            {
                'label': 'Bedrock docs - audit reports',
                'url': 'https://docs.bedrock.technology/security/audit-reports',
            },
            {
                'label': 'OKX Ventures - lead investment announcement',
                'url': 'https://okxventures.medium.com/okx-ventures-announces-lead-investment-in-bedrock-a-multi-asset-liquid-restaking-protocol-0f2bb73e4192',
            },
            {
                'label': 'GlobeNewswire - Bedrock expands to Bitcoin with strong backers',
                'url': 'https://www.globenewswire.com/news-release/2024/05/02/2873774/0/en/Bedrock-a-multi-asset-liquid-restaking-protocol-expands-to-Bitcoin-with-strong-backers.html',
            },
            {
                'label': 'The Defiant - uniBTC $2M exploit',
                'url': 'https://thedefiant.io/news/hacks/bedrock-vulnerability-allows-hacker-to-drain-usd2m-from-unibtc-liquidity-pools',
            },
            {
                'label': 'Chainlink Today - Bedrock Proof of Reserve integration',
                'url': 'https://chainlinktoday.com/after-2-million-exploit-bedrock-turns-to-chainlink-proof-of-reserve-for-secure-minting/',
            },
            {
                'label': 'PR Newswire - BR token launch (Binance Wallet IDO)',
                'url': 'https://www.prnewswire.com/news-releases/bedrocks-br-token-launch-draws-9653-oversubscription-on-binance-wallet-ido-reinforcing-community-driven-bitcoin-staking-302408000.html',
            },
        ],
        github='https://github.com/Bedrock-Technology',
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
        components=[
            {
                'name': 'MAX LRTs (MAX Vaults)',
                'description': "YieldNest's core product: curated liquid restaking baskets that bundle multiple restaking and DeFi strategies into a single liquid token. Four asset-specific vaults exist: ynETH MAX (ynETHx) for ETH strategies, ynBTC MAX (ynBTCx) for BTC, ynUSD MAX (ynUSDx) for stablecoins, and ynBNB MAX (ynBNBx) for BNB. Each MAX LRT targets optimized risk-adjusted returns.",
            },
            {
                'name': 'ynETH',
                'description': "YieldNest's native liquid restaking token for Ethereum. Users deposit ETH and receive ynETH, natively restaking into EigenLayer to earn base-layer staking rewards plus restaking rewards while retaining liquidity. Launched on Ethereum mainnet on May 16, 2024.",
            },
            {
                'name': 'ynBNB',
                'description': "The first BNB liquid restaking token on BNB Chain, launched September 12, 2024. Built on top of Lista DAO's slisBNB and aggregates yield across BNB-chain restaking protocols including Kernel, Karak, and Binomial.",
            },
            {
                'name': 'NEST AI',
                'description': 'AI-driven strategy engine that dynamically rebalances allocations between restaking and DeFi protocols, optimizes collateral allocation for capital efficiency, executes cross-protocol arbitrage across MAX LRTs, and monitors systemic risk to adjust risk parameters.',
            },
            {
                'name': 'YND / veYND governance',
                'description': 'YND is the governance token (TGE June 3, 2025). Users lock YND to obtain vote-escrowed veYND (minimum 42 YND, 30-day exit queue). veYND holders direct gauge incentives, vote on fees and integrations, and receive protocol revenue via a buyback-and-distribute model.',
            },
        ],
        faq=[
            {
                'question': 'What is YieldNest?',
                'answer': 'YieldNest is a liquid restaking protocol that consolidates restaking and DeFi strategies into single liquid tokens called MAX LRTs. It offers curated, risk-adjusted baskets (ynETH MAX, ynBTC MAX, ynUSD MAX, ynBNB MAX) plus native LRTs like ynETH, aiming to maximize risk-adjusted yield while keeping deposits liquid.',
                'pinned': True,
            },
            {
                'question': 'What are MAX LRTs?',
                'answer': 'MAX LRTs are curated liquid restaking baskets that aggregate multiple restaking and DeFi strategies into one liquid token per asset class. NEST AI dynamically rebalances between strategies to optimize capital efficiency and risk-adjusted returns.',
                'pinned': False,
            },
            {
                'question': 'What is ynETH and how does it work?',
                'answer': "ynETH is YieldNest's native ETH liquid restaking token. Users deposit ETH and receive ynETH, which natively restakes ETH into EigenLayer to earn both base-layer staking rewards and restaking rewards without sacrificing liquidity. It launched on Ethereum mainnet on May 16, 2024.",
                'pinned': False,
            },
            {
                'question': 'What is the YND token used for?',
                'answer': "YND is YieldNest's governance token, launched at TGE on June 3, 2025. YND is locked to mint vote-escrowed veYND, which grants governance power (gauge incentive allocation, fee and integration votes) and a share of protocol revenue distributed through a buyback-and-distribute model.",
                'pinned': False,
            },
            {
                'question': 'Has YieldNest been audited?',
                'answer': 'Yes. YieldNest contracts have undergone multiple audits by ChainSecurity, Zokyo, Composable Security, and NFR Audits, covering ynETH, ynLSDe, the MAX LRT product, ynBTCk, and ynBNBx. It also runs an Immunefi bug bounty and uses HyperNative for real-time threat detection.',
                'pinned': False,
            },
        ],
        org_structure=[
            {
                'name': 'Security Council',
                'role': 'Protocol administration / multisig control',
                'description': 'Core-team-controlled multisigs manage access controls, parameters, upgrades, and emergency functions (e.g., pausing). LlamaRisk notes this creates centralization risk; the protocol intends to transition from Security Council control to DAO (veYND) governance over time.',
            },
        ],
        tradfi_comparison=[
            {
                'product': 'Actively managed multi-strategy yield fund / fund-of-funds',
                'similarity': 'A MAX LRT resembles a professionally managed fund-of-funds: user capital is pooled and allocated across many underlying yield strategies, and holders receive a single liquid share token representing diversified exposure with dynamic rebalancing.',
                'differences': 'Rebalancing is executed on-chain by NEST AI and smart contracts rather than a human fund manager; shares are permissionlessly redeemable via an on-chain withdrawal buffer; there is no custodian or transfer agent, but there is smart-contract, slashing, and depeg risk absent from traditional funds.',
            },
        ],
        events=[
            {
                'date': '2024-04-17',
                'title': 'YieldNest raises $5.2M contribution round',
                'description': 'YieldNest announced closing an oversubscribed $5.2M contribution round led by Faculty Group, with participation from Backed VC and notable DeFi founders/angels.',
                'link': 'https://medium.com/@yieldnest/eth-liquid-restaking-protocol-yieldnest-raises-5-2m-in-contribution-round-bb7e2e56dbe3',
            },
            {
                'date': '2024-05-16',
                'title': 'ynETH launches on Ethereum mainnet',
                'description': 'YieldNest launched ynETH, its native ETH liquid restaking token built on EigenLayer, on Ethereum mainnet.',
                'link': 'https://chainwire.org/2024/05/16/liquid-restaking-protocol-yieldnest-launches-yneth-on-mainnet/',
            },
            {
                'date': '2024-09-12',
                'title': 'ynBNB launches on BNB Chain',
                'description': "YieldNest launched ynBNB, described as the first BNB liquid restaking token, built on Lista DAO's slisBNB and integrating Kernel, Karak, and Binomial.",
                'link': 'https://www.globenewswire.com/news-release/2024/09/12/2945526/0/en/YieldNest-Launches-the-First-BNB-Liquid-Restaking-Token-ynBNB-on-BNB-Chain.html',
            },
            {
                'date': '2025-06-03',
                'title': 'YND token generation event (TGE)',
                'description': 'YieldNest launched its YND governance token at TGE, alongside a community airdrop (~40% of the incentives pool) to early supporters and partner communities; snapshot was taken May 28, 2025.',
                'link': 'https://bitcoinist.com/yieldnest-announces-token-generation-event-tge-and-launch-of-ynd-governance-token/',
            },
        ],
        timeline=[
            {
                'date': '2024-05-16',
                'title': 'ynETH mainnet launch',
                'description': 'Native ETH liquid restaking token goes live on Ethereum mainnet.',
                'link': 'https://chainwire.org/2024/05/16/liquid-restaking-protocol-yieldnest-launches-yneth-on-mainnet/',
                'status': 'executed',
            },
            {
                'date': '2024-09-12',
                'title': 'ynBNB launch on BNB Chain',
                'description': 'First BNB liquid restaking token launches, extending YieldNest beyond Ethereum.',
                'link': 'https://www.globenewswire.com/news-release/2024/09/12/2945526/0/en/YieldNest-Launches-the-First-BNB-Liquid-Restaking-Token-ynBNB-on-BNB-Chain.html',
                'status': 'executed',
            },
            {
                'date': '2025-06-03',
                'title': 'YND governance token TGE',
                'description': 'Governance token launches; protocol begins transition toward veYND-based DAO governance.',
                'link': 'https://bitcoinist.com/yieldnest-announces-token-generation-event-tge-and-launch-of-ynd-governance-token/',
                'status': 'executed',
            },
        ],
        offchain_facts=[
            {
                'key': 'Contribution round raised',
                'value': '$5.2M (announced 2024-04-17, led by Faculty Group)',
                'freshness': 'static',
                'source': {
                    'label': 'YieldNest Medium - $5.2M contribution round',
                    'url': 'https://medium.com/@yieldnest/eth-liquid-restaking-protocol-yieldnest-raises-5-2m-in-contribution-round-bb7e2e56dbe3',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'YND TGE date',
                'value': 'June 3, 2025',
                'freshness': 'static',
                'source': {
                    'label': 'Bitcoinist - YieldNest TGE / YND launch',
                    'url': 'https://bitcoinist.com/yieldnest-announces-token-generation-event-tge-and-launch-of-ynd-governance-token/',
                },
                'capturedAt': '2026-07-02',
            },
            {
                'key': 'veYND lock minimum / exit queue',
                'value': 'Minimum 42 YND to lock; 30-day exit queue',
                'freshness': 'static',
                'source': {
                    'label': 'YieldNest Docs - YND & veYND Tokenomics',
                    'url': 'https://docs.yieldnest.finance/governance-and-tokenomics/ynd-and-veynd-tokenomics',
                },
                'capturedAt': '2026-07-02',
            },
        ],
        risks=[
            {
                'category': 'Smart Contract',
                'description': 'MAX LRT vaults and LRT contracts carry share-issuance inflation-attack and reentrancy risk from external protocol interactions. An early Zokyo audit found (and resolved) a high-severity inflationary/share-allocation attack in ynETH, and upgradeable beacon-pattern contracts add upgrade-vulnerability surface despite timelocks.',
            },
            {
                'category': 'Governance',
                'description': 'Access controls, parameters, upgrades, and emergency pause are managed by core-team multisigs (Security Council), creating centralization risk. The planned transition from Security Council to veYND DAO governance introduces additional uncertainty (per LlamaRisk).',
            },
            {
                'category': 'Oracle',
                'description': 'The LSDRateProvider relies on a single price feed for LST rate accuracy; LlamaRisk notes additional price sources would reduce reliance and that this dependency is vulnerable to mispricing and depeg events.',
            },
            {
                'category': 'Reserve / Depeg',
                'description': 'MAX LRTs and native LRTs hold liquid staking token collateral (e.g., slisBNB, various LSDs) that carries inherent depeg exposure; a depeg of underlying collateral or the LRT itself on secondary AMMs could impair redemptions at par.',
            },
            {
                'category': 'Counterparty',
                'description': 'Heavy dependence on third-party protocols (EigenLayer, Kernel, Karak, Binomial, Lista DAO, Curve, etc.) and on selected operators. Operator performance and third-party protocol failures directly affect yield and principal safety.',
            },
            {
                'category': 'Network',
                'description': "As a restaking protocol on EigenLayer (and Kernel/Karak on BNB Chain), restaked assets are subject to slashing penalties for operator/AVS misbehavior; EigenLayer's slashing (ELIP-002) makes slashing outcomes more probable, and withdrawal buffers may be insufficient under stress, forcing queues or reliance on secondary-market liquidity.",
            },
        ],
        competitors=[
            {
                'name': 'ether.fi',
                'slug': 'ether-fi',
                'rank': 1,
                'positioning': 'Largest Ethereum liquid restaking protocol (eETH/weETH) built on EigenLayer.',
                'similarities': 'Both are EigenLayer-based ETH liquid restaking protocols that issue a liquid receipt token and pass through restaking + staking rewards.',
                'differences': 'ether.fi is far larger and offers a broader consumer product suite (card, cash); YieldNest differentiates via curated multi-asset MAX LRT baskets and NEST AI-driven rebalancing across restaking and DeFi.',
            },
            {
                'name': 'Renzo',
                'slug': 'renzo',
                'rank': 2,
                'positioning': 'Major EigenLayer liquid restaking protocol issuing ezETH, with multi-chain reach.',
                'similarities': 'EigenLayer-based ETH LRT abstracting AVS/operator selection into a single liquid token.',
                'differences': 'Renzo focuses primarily on ETH restaking; YieldNest spans ETH, BTC, USD, and BNB via curated MAX LRT baskets and cross-protocol strategy aggregation.',
            },
            {
                'name': 'Kelp DAO',
                'slug': 'kelp-dao',
                'rank': 3,
                'positioning': 'Liquid restaking protocol issuing rsETH on EigenLayer.',
                'similarities': 'Curated EigenLayer restaking exposure through a liquid token, targeting risk-adjusted restaking yield.',
                'differences': 'Kelp centers on rsETH LST-based restaking; YieldNest emphasizes AI-managed multi-strategy MAX baskets and a native ETH restaking token plus BNB/BTC/USD products.',
            },
            {
                'name': 'Puffer',
                'slug': 'puffer',
                'rank': 4,
                'positioning': 'Native liquid restaking protocol (pufETH) on EigenLayer with anti-slashing tech.',
                'similarities': 'Native ETH liquid restaking on EigenLayer with a liquid token and a focus on validator/operator risk management.',
                'differences': 'Puffer emphasizes native restaking and its own secure-signer/anti-slashing stack; YieldNest emphasizes curated multi-asset MAX baskets and DeFi+restaking strategy blending.',
            },
        ],
        partnerships=[
            {
                'name': 'Lista DAO (slisBNB)',
                'date': '2024-09-12',
                'amountLabel': None,
                'description': "ynBNB is built on top of Lista DAO's slisBNB liquid staking token, using it as the base asset for BNB restaking.",
            },
            {
                'name': 'Kernel',
                'date': '2024-09-12',
                'amountLabel': None,
                'description': 'BNB Chain restaking protocol integrated by ynBNB to aggregate BNB restaking yield; partnership confirmed by both parties.',
            },
            {
                'name': 'Karak',
                'date': '2024-09-12',
                'amountLabel': None,
                'description': 'Universal restaking layer integrated into ynBNB on BNB Chain to broaden restaking yield sources.',
            },
            {
                'name': 'Binomial',
                'date': '2024-09-12',
                'amountLabel': None,
                'description': 'BNB Chain restaking protocol integrated by ynBNB as one of the yield-source protocols for restaked slisBNB.',
            },
        ],
        investment_rounds=[
            {
                'date': '2024-04-17',
                'round': 'Contribution round',
                'amountUsd': 5200000,
                'amountLabel': '$5.2M',
                'investors': [
                    'Faculty Group',
                    'Backed VC',
                    'Sam Kazemian (Frax)',
                    'Michael Egorov (Curve)',
                    'Loi Luu (Kyber)',
                    'Proof Capital',
                    'LVT Capital',
                    'Contango',
                    'Mozaik Capital',
                    'Kahuna',
                    'Rana Capital',
                    'Insignius Capital',
                    'CKC',
                ],
                'link': 'https://medium.com/@yieldnest/eth-liquid-restaking-protocol-yieldnest-raises-5-2m-in-contribution-round-bb7e2e56dbe3',
            },
        ],
        audits=[
            {
                'firm': 'ChainSecurity',
                'date': '2024-04-15',
                'url': 'https://www.chainsecurity.com/reports/YieldNest/ChainSecurity_YieldNest_YieldNestProtocol_Audit.pdf',
            },
            {
                'firm': 'ChainSecurity',
                'date': '2024-08-09',
                'url': 'https://docs.yieldnest.finance/security/audits-and-security-measures',
            },
            {
                'firm': 'Zokyo',
                'date': '2024-12-12',
                'url': 'https://docs.yieldnest.finance/security/audits-and-security-measures',
            },
            {
                'firm': 'Composable Security',
                'date': '2025-01-09',
                'url': 'https://docs.yieldnest.finance/security/audits-and-security-measures',
            },
            {
                'firm': 'NFR Audits',
                'date': '2025-02-13',
                'url': 'https://docs.yieldnest.finance/security/audits-and-security-measures',
            },
        ],
        sources=[
            {
                'label': 'YieldNest Docs - Protocol Overview',
                'url': 'https://docs.yieldnest.finance/protocol-design/yieldnest-protocol-overview',
            },
            {
                'label': 'YieldNest Docs - Audits & Security Measures',
                'url': 'https://docs.yieldnest.finance/security/audits-and-security-measures',
            },
            {
                'label': 'YieldNest Docs - YND & veYND Tokenomics',
                'url': 'https://docs.yieldnest.finance/governance-and-tokenomics/ynd-and-veynd-tokenomics',
            },
            {
                'label': 'YieldNest Medium - $5.2M contribution round',
                'url': 'https://medium.com/@yieldnest/eth-liquid-restaking-protocol-yieldnest-raises-5-2m-in-contribution-round-bb7e2e56dbe3',
            },
            {
                'label': 'Chainwire - ynETH mainnet launch',
                'url': 'https://chainwire.org/2024/05/16/liquid-restaking-protocol-yieldnest-launches-yneth-on-mainnet/',
            },
            {
                'label': 'GlobeNewswire - ynBNB launch on BNB Chain',
                'url': 'https://www.globenewswire.com/news-release/2024/09/12/2945526/0/en/YieldNest-Launches-the-First-BNB-Liquid-Restaking-Token-ynBNB-on-BNB-Chain.html',
            },
            {
                'label': 'LlamaRisk - YieldNest General Protocol Assessment',
                'url': 'https://llamarisk.com/research/yieldnest-general-assessment',
            },
        ],
        github='https://github.com/yieldnest',
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
