"""
Curated entity specs for Ethena, Sky, Monerium, Stably, and TrueUSD.

Sourced from entity-research-batch.md (2026-06-05). Imported by ingest_entities.py.
"""

from __future__ import annotations

from typing import Any, Dict

BATCH_ENTITY_SPECS: Dict[str, Dict[str, Any]] = {
    "ethena": {
        "name": "Ethena",
        "symbol": "ENA",
        "csv_slug": "ethena",
        "tagline": "Digital dollars for the internet economy.",
        "description": (
            "Ethena Labs issues USDe, a crypto-native synthetic dollar, and related "
            "products including sUSDe (yield), USDtb (Treasury-backed), and the ENA "
            "governance token."
        ),
        "differentiator": (
            "USDe is a synthetic dollar backed by crypto collateral and short futures "
            "(delta-hedged), not bank deposits. It is a structured carry product rather "
            "than a fiat-backed coin."
        ),
        "official_docs": "https://docs.ethena.fi/",
        "website": "https://ethena.fi/",
        "twitter": "https://x.com/ethena_labs",
        "discord": None,
        "github": "https://github.com/ethena-labs",
        "components": [
            {
                "name": "USDe",
                "description": (
                    "Synthetic dollar pegged via delta-hedging BTC/ETH spot plus perp "
                    "shorts and liquid stables. Mint/redeem is KYC-gated to market makers."
                ),
            },
            {
                "name": "sUSDe",
                "description": (
                    "Staked USDe receipt token that accrues protocol revenue. Savings "
                    "asset, not a separate pegged stablecoin."
                ),
            },
            {
                "name": "USDtb",
                "description": (
                    "Treasury-backed dollar distinct from synthetic USDe, backed by "
                    "short-term Treasuries / BUIDL exposure."
                ),
            },
            {
                "name": "ENA",
                "description": "Governance token for Ethena protocol parameters and treasury.",
            },
        ],
        "faq": [
            {
                "question": "Is USDe fiat-backed?",
                "answer": (
                    "No. USDe is synthetic: collateral plus delta-neutral hedging across "
                    "CEX and DEX venues, not bank deposit reserves."
                ),
                "pinned": True,
            },
            {
                "question": "What is the USDe / sUSDe distinction?",
                "answer": (
                    "USDe is the base synthetic dollar. sUSDe is the yield-bearing staked "
                    "receipt that accrues protocol revenue, similar to USDai/sUSDai."
                ),
                "pinned": True,
            },
            {
                "question": "How is USDtb different from USDe?",
                "answer": (
                    "USDtb is a Treasury-backed reserve dollar (BUIDL/Treasury exposure), "
                    "while USDe uses crypto collateral and derivatives hedging."
                ),
                "pinned": True,
            },
        ],
        "org_structure": [
            {
                "name": "Ethena protocol multisigs",
                "role": "Operations",
                "description": (
                    "Dev multisig (5/11, contract params), sUSDe Payout Fund (3/11), "
                    "Reserve Fund (4/10). Founder: Guy Young."
                ),
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Delta-hedged structured note / market-neutral carry",
                "similarity": (
                    "USDe resembles a delta-hedged note earning funding-rate carry on "
                    "hedged crypto exposure."
                ),
                "differences": (
                    "On-chain mint/redeem with KYC-gated market makers rather than "
                    "broker-dealer structured products."
                ),
            },
            {
                "product": "Money-market share class",
                "similarity": "sUSDe resembles a yield share class on the base dollar.",
                "differences": "Reward accrual via protocol revenue, not MMF NAV.",
            },
            {
                "product": "Tokenized Treasury reserve",
                "similarity": "USDtb maps to Treasury/MM-backed tokenized dollar exposure.",
                "differences": "Distinct reserve stack from synthetic USDe.",
            },
            {
                "product": "Governance / equity token",
                "similarity": "ENA aligns with protocol governance equity.",
                "differences": "On-chain DAO control via multisigs.",
            },
        ],
        "risks": [
            {
                "category": "Collateral",
                "description": (
                    "Collateral and funding-rate risk: negative or volatile funding can "
                    "compress carry and stress the hedging book."
                ),
            },
            {
                "category": "Reserve / Depeg",
                "description": (
                    "Depeg risk on USDe if hedges fail or venues become impaired "
                    "(see SSRN delta-hedged stablecoin studies)."
                ),
            },
            {
                "category": "Counterparty",
                "description": (
                    "Counterparty and venue risk on CEX/DEX hedging and custody partners."
                ),
            },
            {
                "category": "Smart Contract",
                "description": "Smart-contract risk across mint, stake, and payout modules.",
            },
            {
                "category": "Regulatory",
                "description": (
                    "Regulatory risk: sUSDe is not offered in EU/EEA per protocol disclosures."
                ),
            },
            {
                "category": "Governance",
                "description": (
                    "Governance concentration via operational multisigs controlling parameters."
                ),
            },
        ],
        "events": [
            {
                "date": "Feb 2024",
                "title": "Series A raise",
                "description": (
                    "~$14M strategic round led by Dragonfly with Arthur Hayes, Deribit, "
                    "Bybit, OKX, Gemini, and others."
                ),
                "link": "https://theblock.co/post/278938/ethena-raises-14-million-series-a-for-synthetic-dollar-protocol",
            },
            {
                "date": "Jul 2024",
                "title": "Coinbase Ventures ENA buy",
                "description": "Coinbase Ventures open-market purchase of ENA tokens.",
                "link": None,
            },
        ],
        "investment_rounds": [
            {
                "date": "Feb 2024",
                "round": "Series A / strategic",
                "amountUsd": 14_000_000,
                "amountLabel": "~$14M",
                "investors": [
                    "Dragonfly (lead)",
                    "Arthur Hayes",
                    "Deribit",
                    "Bybit",
                    "OKX",
                    "Gemini",
                    "Maelstrom",
                    "Mirana",
                ],
                "link": "https://theblock.co/post/278938/ethena-raises-14-million-series-a-for-synthetic-dollar-protocol",
            },
        ],
        "partnerships": [
            {
                "name": "Coinbase",
                "date": "Jun 2026",
                "amountLabel": None,
                "description": (
                    "Savings products integration and Coinbase Ventures ENA market purchase."
                ),
            },
            {
                "name": "Bitwise + Jupiter + Fluid",
                "date": "May 2026",
                "amountLabel": None,
                "description": "USDe Solana lending market deployment.",
            },
        ],
        "current_scale": {
            "tvlUsd": 5_600_000_000,
            "users": 117_000,
            "aprPct": 11.3,
            "targetAprPct": None,
            "loanPipelineUsd": None,
            "partnerships": 2,
        },
        "scale_labels": {
            "tvl": "Total supply",
            "users": "USDe holders",
            "apr": "Lifetime avg APY",
            "pipeline": "Rewards distributed",
            "partnerships": "Partnerships",
            "coins": "Products",
        },
        "member_coins": [
            {
                "slug": "ethena",
                "name": "USDe",
                "symbol": "USDe",
                "category": "Stablecoin",
                "role": "Synthetic dollar (delta-hedged, not fiat-backed)",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "susde",
                "name": "sUSDe",
                "symbol": "sUSDe",
                "category": "Stablecoin",
                "role": "Yield-bearing staked USDe receipt",
                "subCategory": "Staked Stablecoin",
            },
            {
                "slug": "usdtb",
                "name": "USDtb",
                "symbol": "USDtb",
                "category": "Stablecoin",
                "role": "Treasury-backed dollar (distinct from USDe)",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "ena",
                "name": "ENA",
                "symbol": "ENA",
                "category": "Token",
                "role": "Governance token",
                "subCategory": "Governance Token",
            },
        ],
        "portal_defaults": {
            "chains": ["Arbitrum One", "Ethereum"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": True,
            "foundedDate": "2024",
            "logoUrl": None,
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
    "sky": {
        "name": "Sky",
        "symbol": "SKY",
        "csv_slug": "sky",
        "tagline": "Stablecoins aren't built to sit still.",
        "description": (
            "Sky (formerly MakerDAO) is the largest decentralized stablecoin issuer, "
            "managing USDS, sUSDS, legacy DAI, stUSDS, and the SKY governance token."
        ),
        "differentiator": (
            "Protocol-set Sky Savings Rate, instant no-lockup yield via sUSDS, and the "
            "Sky Agent Network for allocator-driven deployment."
        ),
        "official_docs": "https://sky.money",
        "website": "https://sky.money",
        "twitter": "https://x.com/SkyEcosystem",
        "discord": None,
        "github": "https://github.com/makerdao",
        "components": [
            {
                "name": "USDS",
                "description": (
                    "Primary Sky dollar (DAI successor). ERC-20 with 1:1 USDC swap and "
                    "base for sUSDS."
                ),
            },
            {
                "name": "sUSDS",
                "description": (
                    "Yield-bearing USDS via Sky Savings Rate. Non-custodial wrapper with "
                    "compounding exchange rate, no lockup or fees."
                ),
            },
            {
                "name": "DAI",
                "description": "Legacy Maker collateral-minted stablecoin, still in circulation.",
            },
            {
                "name": "stUSDS",
                "description": (
                    "Expert-user yield from SKY-backed borrowing with dynamic "
                    "utilization-based returns."
                ),
            },
            {
                "name": "SKY",
                "description": (
                    "Governance token; stake to earn rewards or borrow USDS. MKR migrated to SKY."
                ),
            },
        ],
        "faq": [
            {
                "question": "How is USDS related to DAI?",
                "answer": (
                    "USDS is the successor Sky dollar from the Sep 2024 rebrand and "
                    "MKR/SKY, DAI/USDS migration path."
                ),
                "pinned": True,
            },
            {
                "question": "What is sUSDS?",
                "answer": (
                    "sUSDS is yield-bearing USDS via the Sky Savings Rate. It is not a "
                    "separate pegged coin or governance token."
                ),
                "pinned": True,
            },
        ],
        "org_structure": [
            {
                "name": "Sky Protocol / Ecosystem",
                "role": "Issuer",
                "description": "Issues USDS, sUSDS, and related Sky products.",
            },
            {
                "name": "Maker Governance Portal",
                "role": "Legacy governance",
                "description": "Legacy governance surface and MKR to SKY migration tooling.",
            },
            {
                "name": "Sky Agent Network",
                "role": "Allocators",
                "description": "Allocator agents deploying protocol capital across strategies.",
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Digital cash / demand deposit",
                "similarity": "USDS behaves like on-chain digital cash with protocol swap rails.",
                "differences": "Decentralized collateral and governance, not bank deposits.",
            },
            {
                "product": "Yield-bearing deposit receipt",
                "similarity": "sUSDS resembles a savings account receipt earning protocol rate.",
                "differences": "Non-custodial, instant exit, rate set by DAO.",
            },
            {
                "product": "Governance equity",
                "similarity": "SKY maps to protocol governance and staking economics.",
                "differences": "On-chain voting and staking integrations.",
            },
        ],
        "risks": [
            {
                "category": "Collateral",
                "description": "Collateral quality risk across diversified Maker/Sky vault types.",
            },
            {
                "category": "Reserve / Depeg",
                "description": "Depeg risk on USDS/DAI under collateral stress or liquidity events.",
            },
            {
                "category": "Smart Contract",
                "description": (
                    "Smart-contract risk in core protocol and integrations (Pendle, Morpho, bridges)."
                ),
            },
            {
                "category": "Counterparty",
                "description": "Integration and counterparty risk on external vaults and bridges.",
            },
            {
                "category": "Governance",
                "description": (
                    "Governance risk on Sky Savings Rate and risk parameters; liquidation "
                    "risk on staked-SKY borrow positions."
                ),
            },
            {
                "category": "Network",
                "description": "Bridge risk for USDS/sUSDS deployments beyond Ethereum.",
            },
        ],
        "events": [
            {
                "date": "Dec 2018",
                "title": "MakerDAO seed raise",
                "description": (
                    "~$15M from a16z, Polychain, Coinbase Ventures and others."
                ),
                "link": "https://www.coindesk.com/business/2018/12/06/makerdao-raises-15-million-from-andreesen-horowitz-polychain-and-others/",
            },
            {
                "date": "Sep 2024",
                "title": "Sky rebrand",
                "description": (
                    "MakerDAO rebrand to Sky with MKR to SKY and DAI to USDS migration."
                ),
                "link": "https://sky.money",
            },
        ],
        "investment_rounds": [
            {
                "date": "Dec 2018",
                "round": "Seed",
                "amountUsd": 15_000_000,
                "amountLabel": "~$15M",
                "investors": ["a16z", "Polychain", "Coinbase Ventures"],
                "link": "https://www.coindesk.com/business/2018/12/06/makerdao-raises-15-million-from-andreesen-horowitz-polychain-and-others/",
            },
            {
                "date": "Aug 2019",
                "round": "Follow-on",
                "amountUsd": 1_000_000,
                "amountLabel": "~$1M",
                "investors": ["Framework", "Dragonfly", "Hashed"],
                "link": "https://www.coindesk.com/markets/2019/08/21/makerdao-says-it-has-raised-1m-and-now-its-organizing-a-new-foundation/",
            },
        ],
        "partnerships": [
            {
                "name": "Pendle",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Fixed-yield sUSDS via PT markets.",
            },
            {
                "name": "Morpho",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Sky Vaults lending integration.",
            },
            {
                "name": "LayerZero / Skylink",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "USDS and sUSDS on Avalanche via burn-and-mint bridge.",
            },
            {
                "name": "Grove",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Ecosystem accord partner.",
            },
        ],
        "current_scale": {
            "tvlUsd": 15_490_000_000,
            "users": 64_000,
            "aprPct": None,
            "targetAprPct": None,
            "loanPipelineUsd": 1_390_000_000,
            "partnerships": 4,
        },
        "scale_labels": {
            "tvl": "USDS + DAI supply",
            "users": "USDS holders",
            "apr": "Sky Savings Rate",
            "pipeline": "SKY market cap",
            "partnerships": "Partnerships",
            "coins": "Products",
        },
        "member_coins": [
            {
                "slug": "sky",
                "name": "USDS",
                "symbol": "USDS",
                "category": "Stablecoin",
                "role": "Primary Sky dollar (DAI successor)",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "susds",
                "name": "sUSDS",
                "symbol": "sUSDS",
                "category": "Stablecoin",
                "role": "Yield-bearing USDS (Sky Savings Rate)",
                "subCategory": "Staked Stablecoin",
            },
            {
                "slug": "dai",
                "name": "DAI",
                "symbol": "DAI",
                "category": "Stablecoin",
                "role": "Legacy Maker stablecoin",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "stusds",
                "name": "stUSDS",
                "symbol": "stUSDS",
                "category": "Stablecoin",
                "role": "Expert yield from SKY-backed borrowing",
                "subCategory": "Staked Stablecoin",
            },
            {
                "slug": "sky-gov",
                "name": "SKY",
                "symbol": "SKY",
                "category": "Token",
                "role": "Governance token (MKR successor)",
                "subCategory": "Governance Token",
            },
        ],
        "portal_defaults": {
            "chains": ["Arbitrum One", "Ethereum"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": False,
            "foundedDate": "2014",
            "logoUrl": None,
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
    "monerium": {
        "name": "Monerium",
        "symbol": "EURe",
        "csv_slug": "monerium",
        "tagline": "The onchain fiat platform.",
        "description": (
            "Monerium is a regulated Icelandic EMI issuing EURe and GBPe as onchain "
            "e-money redeemable at par via banking rails and Web3 IBAN."
        ),
        "differentiator": (
            "EURe is issued by a licensed EMI and redeemable at par via banking rails. "
            "It behaves like bank-issued e-money onchain, not an overcollateralized "
            "crypto stablecoin."
        ),
        "official_docs": "https://monerium.com/policies/business-terms-of-service/",
        "website": "https://monerium.com",
        "twitter": "https://x.com/monerium",
        "discord": "https://discord.gg/bGCf7v4sXZ",
        "github": "https://github.com/monerium",
        "components": [
            {
                "name": "EURe",
                "description": (
                    "Regulated euro e-money on Ethereum, Polygon, Gnosis, and Arbitrum. "
                    "EUR to Web3 IBAN to EURe, redeemable at par."
                ),
            },
            {
                "name": "GBPe",
                "description": "Pound e-money token issued under the same EMI framework.",
            },
        ],
        "faq": [
            {
                "question": "Is EURe a crypto stablecoin?",
                "answer": (
                    "EURe is regulated e-money issued by Monerium hf., an Icelandic EMI "
                    "supervised by the Central Bank of Iceland FSA. It is not a "
                    "collateralized DeFi stablecoin."
                ),
                "pinned": True,
            },
            {
                "question": "Is EURe deposit-insured?",
                "answer": (
                    "Funds are safeguarded under EMI rules but are not deposit-insured "
                    "like traditional bank accounts."
                ),
                "pinned": True,
            },
        ],
        "org_structure": [
            {
                "name": "Monerium hf.",
                "role": "Licensed issuer",
                "description": (
                    "Icelandic regulated EMI supervised by the Central Bank of Iceland "
                    "FSA. Centralized issuer, no DAO."
                ),
            },
            {
                "name": "AS LHV Pank",
                "role": "Banking partner",
                "description": "Banking, IBAN, and SEPA rail partner for fiat flows.",
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Electronic money / stored-value account",
                "similarity": (
                    "EURe maps to regulated e-money redeemable at par, similar to "
                    "stored-value electronic money accounts."
                ),
                "differences": (
                    "Onchain ERC-20 with Web3 IBAN rails; not a money-market fund and "
                    "not deposit-insured."
                ),
            },
        ],
        "risks": [
            {
                "category": "Regulatory",
                "description": "EMI regulatory regime changes or license constraints.",
            },
            {
                "category": "Counterparty",
                "description": "Banking partner (LHV) and custody counterparty risk.",
            },
            {
                "category": "Reserve / Depeg",
                "description": (
                    "Par/depeg risk under rail or redemption constraints during stress."
                ),
            },
            {
                "category": "Smart Contract",
                "description": "Smart-contract risk on token and payment flow contracts.",
            },
            {
                "category": "Governance",
                "description": (
                    "Centralized issuer governance; no onchain DAO for monetary policy."
                ),
            },
            {
                "category": "Network",
                "description": "Operational risk from chain congestion affecting redemptions.",
            },
        ],
        "events": [
            {
                "date": "Oct 2020",
                "title": "Series A",
                "description": "Series A funding round (amount and investors to verify from filings).",
                "link": None,
            },
        ],
        "investment_rounds": [],
        "partnerships": [
            {
                "name": "AS LHV Pank",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Fiat banking, IBAN, and SEPA rails.",
            },
            {
                "name": "MetaMask Card",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Consumer payment integration.",
            },
            {
                "name": "Gnosis Pay",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Payment card ecosystem integration.",
            },
            {
                "name": "Safe",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Wallet and treasury integration.",
            },
            {
                "name": "Curve / ParaSwap / Jarvis",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "DeFi liquidity and swap integrations.",
            },
        ],
        "current_scale": {
            "tvlUsd": None,
            "users": None,
            "aprPct": None,
            "targetAprPct": None,
            "loanPipelineUsd": None,
            "partnerships": 5,
        },
        "scale_labels": {
            "tvl": "EURe supply",
            "users": "Holders",
            "apr": "Yield",
            "pipeline": "Networks",
            "partnerships": "Partnerships",
            "coins": "Products",
        },
        "member_coins": [
            {
                "slug": "monerium",
                "name": "EURe",
                "symbol": "EURe",
                "category": "Stablecoin",
                "role": "Regulated euro e-money (not yield/governance)",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "gbpe",
                "name": "GBPe",
                "symbol": "GBPe",
                "category": "Stablecoin",
                "role": "Regulated pound e-money",
                "subCategory": "Stablecoin",
            },
        ],
        "portal_defaults": {
            "chains": ["Arbitrum One", "Ethereum", "Polygon", "Gnosis"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": False,
            "foundedDate": "2016",
            "logoUrl": None,
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
    "trueusd": {
        "name": "TrueUSD",
        "symbol": "TUSD",
        "csv_slug": "trueusd",
        "tagline": "The most transparent USD-backed stablecoin.",
        "description": (
            "TrueUSD is a fiat-backed USD stablecoin with daily attestations, Chainlink "
            "Proof of Reserve, and smart-contract mint/redeem controls."
        ),
        "differentiator": (
            "Transparency-first design: daily attestations, Chainlink Proof of Reserve, "
            "and on-chain mint/redeem. No algorithmic stabilization or native yield."
        ),
        "official_docs": "https://tusd.io",
        "website": "https://tusd.io",
        "twitter": "https://x.com/TrueUSD",
        "discord": None,
        "github": "https://github.com/trusttoken/smart-contracts",
        "components": [
            {
                "name": "TUSD",
                "description": (
                    "1:1 USD-backed stablecoin. Mint via bank wire, redeem to unique "
                    "address (min $1,000, ~1 business day). Chainlink PoR verification."
                ),
            },
        ],
        "faq": [
            {
                "question": "How is TUSD backed?",
                "answer": (
                    "TUSD is backed 1:1 by USD reserves with daily attestations from "
                    "Moore Hong Kong and Chainlink Proof of Reserve feeds."
                ),
                "pinned": True,
            },
            {
                "question": "Does TUSD pay yield?",
                "answer": "No. TUSD is a plain fiat-backed stablecoin with no native yield product.",
                "pinned": True,
            },
        ],
        "org_structure": [
            {
                "name": "Techteryx",
                "role": "Operating entity",
                "description": (
                    "Reported operating/controlling entity for TrueUSD (verify ownership chain)."
                ),
            },
            {
                "name": "TrustToken",
                "role": "Original issuer",
                "description": (
                    "Original issuer and brand behind the 2018 launch. Founders: Rafael "
                    "Cosman, Stephen Kade, Danny An."
                ),
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Tokenized bank deposit / cash substitute",
                "similarity": (
                    "TUSD resembles a tokenized dollar balance backed by custodied reserves."
                ),
                "differences": "Not FDIC-insured; onchain ERC-20 with attestations.",
            },
        ],
        "risks": [
            {
                "category": "Reserve / Depeg",
                "description": "Reserve and collateral adequacy risk if attestations lag reality.",
            },
            {
                "category": "Counterparty",
                "description": "Banking and custody counterparty reliance for USD reserves.",
            },
            {
                "category": "Regulatory",
                "description": "Regulatory risk on money transmission and reserve disclosures.",
            },
            {
                "category": "Smart Contract",
                "description": "Bridge and smart-contract risk on non-native chain deployments.",
            },
            {
                "category": "Governance",
                "description": "Centralized mint/redeem control; no DAO governance.",
            },
            {
                "category": "Oracle",
                "description": (
                    "Attestation and Chainlink PoR reliance (note: some TUSD feeds marked "
                    "for deprecation)."
                ),
            },
        ],
        "events": [
            {
                "date": "Jan 2018",
                "title": "TrueUSD launch",
                "description": "TrustToken launches TUSD as a regulated USD-backed stablecoin.",
                "link": "https://tusd.io",
            },
            {
                "date": "2023",
                "title": "Techteryx transition",
                "description": (
                    "Reported control transition from TrustToken to Techteryx (verify)."
                ),
                "link": None,
            },
        ],
        "investment_rounds": [],
        "partnerships": [
            {
                "name": "Chainlink Proof of Reserve",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Real-time reserve verification feeds.",
            },
            {
                "name": "Moore Hong Kong",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Daily reserve attestations.",
            },
        ],
        "current_scale": {
            "tvlUsd": 494_100_000,
            "users": 663_000,
            "aprPct": None,
            "targetAprPct": None,
            "loanPipelineUsd": None,
            "partnerships": 2,
        },
        "scale_labels": {
            "tvl": "Market cap",
            "users": "Holders",
            "apr": "Yield",
            "pipeline": "24h volume",
            "partnerships": "Partnerships",
            "coins": "Products",
        },
        "member_coins": [
            {
                "slug": "trueusd",
                "name": "TUSD",
                "symbol": "TUSD",
                "category": "Stablecoin",
                "role": "Fiat-backed USD stablecoin",
                "subCategory": "Stablecoin",
            },
        ],
        "portal_defaults": {
            "chains": ["Arbitrum One", "Ethereum", "BNB Chain", "TRON", "Avalanche"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": False,
            "foundedDate": "2018",
            "logoUrl": None,
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
    "stably": {
        "name": "Stably",
        "symbol": "Stably",
        "csv_slug": "stably",
        "tagline": "Stablecoin-as-a-service issuer and fiat on/off-ramp provider.",
        "description": (
            "Stably provides stablecoin-as-a-service infrastructure and fiat ramps, "
            "issuing Stably USD and partner tokens such as VeUSD on VeChain."
        ),
        "differentiator": (
            "Combines consumer/enterprise fiat ramps with multi-chain stablecoin issuance "
            "infrastructure, including partner-issued models like VeUSD."
        ),
        "official_docs": "https://stably.io",
        "website": "https://stably.io",
        "twitter": "https://twitter.com/Stably_Official",
        "discord": "https://discord.com/channels/978765464186540093/1022531141535813783",
        "github": "https://github.com/Git-on-my-level",
        "components": [
            {
                "name": "Stably USD",
                "description": (
                    "Stablecoin-as-a-service dollar issued across multiple networks "
                    "(XRPL, Stellar, Tezos, and others per Stably claims)."
                ),
            },
            {
                "name": "Stably Ramp",
                "description": "Fiat on/off-ramp product for consumers and enterprises.",
            },
            {
                "name": "VeUSD",
                "description": (
                    "VeChain stablecoin developed by Stably and issued by Prime Trust."
                ),
            },
        ],
        "faq": [
            {
                "question": "Is Stably USD the same as Sky USDS?",
                "answer": (
                    "No. Stably USD (USDS.s on this platform) is a separate "
                    "stablecoin-as-a-service product from Stably, distinct from Sky USDS."
                ),
                "pinned": True,
            },
            {
                "question": "Who issues VeUSD?",
                "answer": (
                    "VeUSD was developed by Stably and issued by Prime Trust on VeChain."
                ),
                "pinned": True,
            },
        ],
        "org_structure": [
            {
                "name": "Stably",
                "role": "Issuer / infrastructure",
                "description": (
                    "Seattle-based stablecoin infrastructure company. Product lines: "
                    "Stably Ramp and Stably USD."
                ),
            },
            {
                "name": "Prime Trust",
                "role": "Custody partner",
                "description": "Referenced partner issuer/custodian for VeUSD.",
            },
        ],
        "tradfi_comparison": [
            {
                "product": "Money transmitter + e-money issuer",
                "similarity": (
                    "Stably combines money transmission, stablecoin issuance, and "
                    "embedded settlement rails."
                ),
                "differences": (
                    "Multi-chain token issuance and partner-issued models vs single-bank e-money."
                ),
            },
        ],
        "risks": [
            {
                "category": "Reserve / Depeg",
                "description": (
                    "Reserve transparency risk where backing details are not fully verified "
                    "from primary sources."
                ),
            },
            {
                "category": "Regulatory",
                "description": (
                    "Money transmission and FinCEN regulatory exposure across jurisdictions."
                ),
            },
            {
                "category": "Counterparty",
                "description": (
                    "Partner-issued and custodial counterparty risk (e.g., Prime Trust for VeUSD)."
                ),
            },
            {
                "category": "Smart Contract",
                "description": "Smart-contract risk across multi-chain deployments.",
            },
            {
                "category": "Governance",
                "description": "Centralized corporate governance; no onchain DAO.",
            },
            {
                "category": "Collateral",
                "description": "Liquidity risk on thinner chains and partner networks.",
            },
        ],
        "events": [
            {
                "date": "Mar 2022",
                "title": "VeUSD launch",
                "description": (
                    "VeUSD goes live on VeChain, developed by Stably and issued by Prime Trust."
                ),
                "link": "https://coinmarketcap.com/currencies/veusd/",
            },
        ],
        "investment_rounds": [],
        "partnerships": [
            {
                "name": "VeChain / VeUSD",
                "date": "Mar 2022",
                "amountLabel": None,
                "description": (
                    "VeUSD stablecoin developed by Stably, issued by Prime Trust on VeChain."
                ),
            },
            {
                "name": "XRPL / Stellar / Tezos",
                "date": "Ongoing",
                "amountLabel": None,
                "description": "Multi-chain Stably USD expansion (per Stably claims).",
            },
        ],
        "current_scale": {
            "tvlUsd": None,
            "users": None,
            "aprPct": None,
            "targetAprPct": None,
            "loanPipelineUsd": None,
            "partnerships": 2,
        },
        "scale_labels": {
            "tvl": "Supply",
            "users": "Holders",
            "apr": "Yield",
            "pipeline": "Ramp countries",
            "partnerships": "Partnerships",
            "coins": "Products",
        },
        "member_coins": [
            {
                "slug": "stably",
                "name": "Stably USD",
                "symbol": "USDS.s",
                "category": "Stablecoin",
                "role": "Stablecoin-as-a-service dollar",
                "subCategory": "Stablecoin",
            },
            {
                "slug": "veusd",
                "name": "VeUSD",
                "symbol": "VeUSD",
                "category": "Stablecoin",
                "role": "VeChain USD stablecoin (Prime Trust issued)",
                "subCategory": "Stablecoin",
            },
        ],
        "portal_defaults": {
            "chains": ["Arbitrum One", "Ethereum", "XRPL", "Stellar", "Tezos"],
            "subCategory": "Entity",
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": False,
            "foundedDate": None,
            "logoUrl": None,
            "bannerUrl": None,
            "portalUrl": None,
        },
    },
}
