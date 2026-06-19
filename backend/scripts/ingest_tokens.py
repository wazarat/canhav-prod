#!/usr/bin/env python3
"""
Seed the Token category — currently CHIP, USD.AI's governance token.

Tokens are standalone governance / utility tokens. CHIP has no dedicated CSV row
and is not yet listed on CoinGecko (its ICO is dated Mar/Apr 2026 in the USD.AI
research), so its live fields are left empty and shared metadata (website /
Twitter / portal banner) is sourced from the "usd-ai" Portal row. The item is
tagged EntitySlug="usd-ai" so it lists under the USD.AI Entity.

Run from anywhere:
    python3 backend/scripts/ingest_tokens.py
    python3 backend/scripts/ingest_tokens.py "/path/to/some.csv"

Stdlib only.
"""

from __future__ import annotations

import csv
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Make `app` importable regardless of the current working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_repository, schema  # noqa: E402

SCRIPTS_ROOT = Path(__file__).resolve().parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))
from classification import apply_coin_classification  # noqa: E402

USD_AI_PARENT_SLUG = "usd-ai"
JUPITER_PARENT_SLUG = "jupiter"
ETHENA_PARENT_SLUG = "ethena"
SKY_PARENT_SLUG = "sky"
ONDO_FINANCE_PARENT_SLUG = "ondo-finance"
AAVE_PARENT_SLUG = "aave"
MONERIUM_PARENT_SLUG = "monerium"

# slug -> spec. USD.AI tokens pull shared metadata from the Portal row; Jupiter
# tokens are fully curated (Solana-native, no Arbitrum CSV row). Values are
# mostly strings, but specs MAY also carry rich overlay objects/lists
# (tokenomics, yieldMechanics, poolComposition, offchainFacts, ...).
TOKENS: Dict[str, Dict[str, Any]] = {
    "chip": {
        "name": "CHIP",
        "symbol": "CHIP",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "CHIP is the governance token of USD.AI. CHIP holders steer the "
            "protocol's DAO — collateral parameters, risk policy, treasury and "
            "ecosystem development — executed off-chain by the USD.AI Foundation. "
            "It is distributed via the USD.AI ICO (Permian Labs)."
        ),
        "entitySlug": USD_AI_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": USD_AI_PARENT_SLUG,
        "chains": None,
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "jup": {
        "name": "JUP",
        "symbol": "JUP",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "JUP is the governance token of Jupiter DAO (Jupiter United Planet). "
            "Founder Meow has stated it is for DAO governance only, not a utility "
            "token. Supply is capped at 10B with 50% allocated to the community."
        ),
        "entitySlug": JUPITER_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/jupiter-exchange-solana",
        "contractAddress": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://jup.ag",
        "twitter": "https://x.com/JupiterExchange",
        "discord": "https://discord.gg/jup",
        "github": "https://github.com/jup-ag",
    },
    "jlp": {
        "name": "JLP",
        "symbol": "JLP",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Jupiter Liquidity Provider token: a tradeable basket of SOL (~44%), ETH (~9%), "
            "BTC (~11%), USDC (~27%), USDT (~9%) (~35% stable / 65% volatile). Value = "
            "index + trader PnL + 75% of perp fees auto-compounded. LPs are the house."
        ),
        "entitySlug": JUPITER_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/jupiter-perpetuals-liquidity-provider-token",
        "contractAddress": "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://jup.ag/perps",
        "twitter": "https://x.com/JupiterExchange",
        "discord": "https://discord.gg/jup",
        "github": "https://github.com/jup-ag",
    },
    "ena": {
        "name": "ENA",
        "symbol": "ENA",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token for Ethena protocol parameters, treasury, and ecosystem "
            "development. ERC-20 on Ethereum and bridged networks."
        ),
        "entitySlug": ETHENA_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/ethena",
        "contractAddress": "0x57e114B691Db790C35207b2e685D4A43181e6061",
        "csvParentSlug": ETHENA_PARENT_SLUG,
        "chains": None,
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "sky-gov": {
        "name": "SKY",
        "symbol": "SKY",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Sky governance token (MKR successor). Stake to earn rewards or borrow USDS. "
            "Supply ~23.46B after the Sep 2024 migration."
        ),
        "entitySlug": SKY_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/sky",
        "contractAddress": "0x56072C95FAA701256059aa122697B133aDEd9279",
        "csvParentSlug": SKY_PARENT_SLUG,
        "chains": None,
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "jupsol": {
        "name": "JupSOL",
        "symbol": "JUPSOL",
        "tokenType": "LST",
        "subCategory": "LST",
        "description": (
            "Jupiter Staked SOL liquid staking token. Represents staked SOL in "
            "Jupiter's staking product with DeFi composability across the ecosystem."
        ),
        "entitySlug": JUPITER_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/jupiter-staked-sol",
        "contractAddress": "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://jup.ag/stake",
        "twitter": "https://x.com/JupiterExchange",
        "discord": "https://discord.gg/jup",
        "github": "https://github.com/jup-ag",
    },
    "usdy": {
        "name": "USDY",
        "symbol": "USDY",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Yield-bearing bearer note secured by short-term Treasuries and bank deposits. "
            "NOT a stablecoin — value accrues via NAV/yield. Reg S (non-US persons); "
            "24/7 mint/redeem for eligible users."
        ),
        "entitySlug": ONDO_FINANCE_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/ondo-us-dollar-yield",
        "contractAddress": "0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d",
        "csvParentSlug": None,
        "chains": ["Arbitrum One", "Ethereum", "Mantle", "Solana"],
        "website": "https://ondo.finance/usdy",
        "twitter": "https://x.com/OndoFinance",
        "discord": None,
        "github": "https://github.com/ondo-finance",
    },
    "ondo-gov": {
        "name": "ONDO",
        "symbol": "ONDO",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": "Governance token for Ondo Finance protocol parameters and ecosystem.",
        "entitySlug": ONDO_FINANCE_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/ondo-finance",
        "contractAddress": "0xfaba6f8e4a5e8ab82f62fe7c39859fa577269be3",
        "csvParentSlug": None,
        "chains": ["Ethereum"],
        "website": "https://ondo.finance",
        "twitter": "https://x.com/OndoFinance",
        "discord": None,
        "github": "https://github.com/ondo-finance",
    },
    "aave-gov": {
        "name": "AAVE",
        "symbol": "AAVE",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Aave DAO governance token. Max supply 16M; tokenholders steer parameters, "
            "listings, emissions, and buybacks."
        ),
        "entitySlug": AAVE_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/aave",
        "contractAddress": "0xba5ddd1f9d7f570dc94a51479a000e3bce967196",
        "csvParentSlug": AAVE_PARENT_SLUG,
        "chains": None,
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "stkaave": {
        "name": "stkAAVE",
        "symbol": "stkAAVE",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Staked AAVE in the legacy Safety Module. Superseded by Umbrella backstop; "
            "positions remain on-chain on Ethereum."
        ),
        "entitySlug": AAVE_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/staked-aave",
        "contractAddress": "0x4da27a545c0c5b758a6ba100e3a049001de870f5",
        "csvParentSlug": AAVE_PARENT_SLUG,
        "chains": ["Ethereum"],
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "ausdc": {
        "name": "Aave aUSDC",
        "symbol": "aUSDC",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Interest-bearing receipt minted 1:1 when USDC is supplied to an Aave market. "
            "The balance grows in real time as borrowers pay interest and is redeemable for "
            "the underlying USDC plus accrued interest. Can be staked in Umbrella for "
            "additional security rewards."
        ),
        "entitySlug": AAVE_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": AAVE_PARENT_SLUG,
        "chains": ["Ethereum", "Arbitrum One"],
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "ausdt": {
        "name": "Aave aUSDT",
        "symbol": "aUSDT",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Interest-bearing receipt minted 1:1 when USDT is supplied to an Aave market. "
            "Accrues lending yield continuously and is redeemable for the underlying USDT "
            "plus interest. Can be staked in Umbrella for additional security rewards."
        ),
        "entitySlug": AAVE_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": AAVE_PARENT_SLUG,
        "chains": ["Ethereum", "Arbitrum One"],
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "aweth": {
        "name": "Aave aWETH",
        "symbol": "aWETH",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Interest-bearing receipt minted 1:1 when WETH is supplied to an Aave market. "
            "Accrues lending yield on supplied ETH/WETH and is redeemable for the underlying "
            "plus interest. Can be staked in Umbrella for additional security rewards."
        ),
        "entitySlug": AAVE_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": AAVE_PARENT_SLUG,
        "chains": ["Ethereum", "Arbitrum One"],
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "stkabpt": {
        "name": "stkABPT",
        "symbol": "stkABPT",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Staked Aave Balancer Pool Token (80 AAVE / 20 wstETH). A legacy Safety Module "
            "backstop that provides a secondary security layer — slashed first to cover "
            "shortfalls — while earning Balancer swap fees plus AAVE incentives. Superseded "
            "by Umbrella; positions remain on-chain on Ethereum."
        ),
        "entitySlug": AAVE_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": AAVE_PARENT_SLUG,
        "chains": ["Ethereum"],
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "iusde": {
        "name": "iUSDe",
        "symbol": "iUSDe",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Institutional receipt token: a TradFi-wrapped version of sUSDe engineered "
            "strictly for verified institutional investors seeking crypto-native yields "
            "under a compliant wrapper. KYC/eligibility-gated."
        ),
        "entitySlug": ETHENA_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": ETHENA_PARENT_SLUG,
        "chains": None,
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "sena": {
        "name": "sENA",
        "symbol": "sENA",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Staked ENA governance token. Composable across DeFi, accrues ENA rewards, "
            "enables protocol fee sharing once the fee switch is active, and qualifies "
            "holders for airdrop-campaign multipliers."
        ),
        "entitySlug": ETHENA_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/ethena-staked-ena",
        "contractAddress": "0x8be3460a480c80728a8c4d7a5d5303c85ba7b3b9",
        "csvParentSlug": ETHENA_PARENT_SLUG,
        "chains": ["Ethereum"],
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "true": {
        "name": "TRUE",
        "symbol": "TRUE",
        "tokenType": "Utility",
        "subCategory": "Utility Token",
        "description": (
            "Crypto-asset identifier referenced in Monerium compliance documentation, "
            "used for unique digital identification across the supported blockchains "
            "(Ethereum, Polygon, Gnosis, Arbitrum, Base, Linea, Noble). Not a yield or "
            "investment instrument."
        ),
        "entitySlug": MONERIUM_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": MONERIUM_PARENT_SLUG,
        "chains": None,
        "website": "https://monerium.com",
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "mkr": {
        "name": "MKR",
        "symbol": "MKR",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Legacy MakerDAO governance token, kept fully functional for users who opt "
            "out of the Sky migration. Convertible to SKY at a 1:24,000 ratio."
        ),
        "entitySlug": SKY_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/maker",
        "contractAddress": "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
        "csvParentSlug": SKY_PARENT_SLUG,
        "chains": ["Ethereum"],
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "schip": {
        "name": "sCHIP",
        "symbol": "sCHIP",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Staked CHIP: USD.AI's decentralized insurance module. Earns rewards but "
            "serves as first-loss capital — slashed first if a GPU compute borrower "
            "defaults, shielding sUSDai depositors from hardware-loan losses."
        ),
        "entitySlug": USD_AI_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": USD_AI_PARENT_SLUG,
        "chains": None,
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    # --- Lending-network governance tokens (PDF Week 7+8) -------------------
    "morpho": {
        "name": "MORPHO",
        "symbol": "MORPHO",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of the Morpho protocol. MORPHO holders govern the Morpho "
            "Blue lending primitive, market creation, and the MetaMorpho vault framework."
        ),
        "entitySlug": "morpho",
        "coingecko": "https://www.coingecko.com/en/coins/morpho",
        "contractAddress": "0x58D97B57BB95320F9a05dC918Aef65434969c2B2",
        "deployments": [
            {
                "chain": "Base",
                "address": "0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842",
            },
            {
                "chain": "Ethereum",
                "address": "0x9994E35Db50125E0DF82e4c2dde62496CE330999",
                "label": "legacy",
            },
        ],
        "csvParentSlug": None,
        "chains": ["Ethereum", "Base"],
        "website": "https://morpho.org",
        "twitter": "https://x.com/MorphoLabs",
        "discord": None,
        "github": "https://github.com/morpho-org",
    },
    "spk": {
        "name": "Spark",
        "symbol": "SPK",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Spark, the Sky/Maker-aligned stablecoin lending stack "
            "(SparkLend + Spark Savings). Governs risk parameters and USDS/DAI liquidity."
        ),
        "entitySlug": "spark",
        "coingecko": "https://www.coingecko.com/en/coins/spark",
        "contractAddress": "0xc20059e0317DE91738d13af027DfC4a50781b066",
        "csvParentSlug": None,
        "chains": ["Ethereum"],
        "website": "https://spark.fi",
        "twitter": "https://x.com/sparkdotfi",
        "discord": None,
        "github": "https://github.com/marsfoundation",
    },
    "comp": {
        "name": "Compound",
        "symbol": "COMP",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Compound. COMP holders propose and vote on market "
            "parameters and upgrades for the Compound III money markets."
        ),
        "entitySlug": "compound",
        "coingecko": "https://www.coingecko.com/en/coins/compound",
        "contractAddress": "0xc00e94cb662c3520282e6f5717214004a7f26888",
        "csvParentSlug": None,
        "chains": ["Ethereum", "Base", "Arbitrum One", "Optimism", "Polygon"],
        "website": "https://compound.finance",
        "twitter": "https://x.com/compoundfinance",
        "discord": None,
        "github": "https://github.com/compound-finance",
    },
    "fluid": {
        "name": "Fluid",
        "symbol": "FLUID",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Fluid (formerly Instadapp / INST). Governs the shared "
            "liquidity layer combining lending, vaults, and DEX liquidity."
        ),
        "entitySlug": "fluid",
        "coingecko": "https://www.coingecko.com/en/coins/fluid",
        "contractAddress": "0x6f40d4a6237c257fff2db00fa0510deeecd303eb",
        "csvParentSlug": None,
        "chains": ["Ethereum", "Arbitrum One", "Base", "Polygon"],
        "website": "https://fluid.io",
        "twitter": "https://x.com/0xfluid",
        "discord": None,
        "github": "https://github.com/Instadapp",
    },
    "xvs": {
        "name": "Venus",
        "symbol": "XVS",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Venus Protocol, the leading money market on BNB Chain. "
            "XVS governs markets, risk parameters, and the VAI stablecoin module."
        ),
        "entitySlug": "venus",
        "coingecko": "https://www.coingecko.com/en/coins/venus",
        "contractAddress": "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
        "csvParentSlug": None,
        "chains": ["BNB Chain", "Ethereum", "Arbitrum One", "Optimism", "zkSync"],
        "website": "https://venus.io",
        "twitter": "https://x.com/VenusProtocol",
        "discord": None,
        "github": "https://github.com/VenusProtocol",
    },
    "jst": {
        "name": "JUST",
        "symbol": "JST",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of JustLend DAO, the largest lending market on Tron "
            "(notably for USDT). JST governs parameters across the JUST ecosystem."
        ),
        "entitySlug": "justlend",
        "coingecko": "https://www.coingecko.com/en/coins/just",
        "contractAddress": "TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9",
        "csvParentSlug": None,
        "chains": ["Tron"],
        "website": "https://justlend.org",
        "twitter": "https://x.com/DeFi_JUST",
        "discord": None,
        "github": None,
    },
    "kmno": {
        "name": "Kamino",
        "symbol": "KMNO",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Kamino Finance, a Solana-native lending and liquidity "
            "protocol with isolated/curated markets. KMNO governs the protocol."
        ),
        "entitySlug": "kamino",
        "coingecko": "https://www.coingecko.com/en/coins/kamino",
        "contractAddress": "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://kamino.finance",
        "twitter": "https://x.com/KaminoFinance",
        "discord": None,
        "github": None,
    },
    "syrup": {
        "name": "Syrup",
        "symbol": "SYRUP",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance and staking token of Maple Finance (SYRUP, migrated from MPL). "
            "Maple runs onchain institutional / private-credit lending pools."
        ),
        "entitySlug": "maple",
        "coingecko": "https://www.coingecko.com/en/coins/syrup",
        "contractAddress": "0x643C4E15d7d62Ad0aBeC4a9BD4b001aA3Ef52d66",
        "deployments": [
            {
                "chain": "Base",
                "address": "0x688AEe022AA544f150678B8E5720b6b96a9E9a2F",
                "label": "OFT",
            },
        ],
        "csvParentSlug": None,
        "chains": ["Ethereum", "Solana", "Base", "Arbitrum One"],
        "website": "https://maple.finance",
        "twitter": "https://x.com/maplefinance",
        "discord": None,
        "github": "https://github.com/maple-labs",
    },
    "syrup-oft": {
        "name": "SYRUP (OFT)",
        "symbol": "SYRUP",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "OFT (Omnichain Fungible Token) deployment of SYRUP on Base, bridged from "
            "the canonical Ethereum SYRUP token via LayerZero."
        ),
        "entitySlug": "maple",
        "coingecko": "https://www.coingecko.com/en/coins/syrup",
        "contractAddress": "0x688AEe022AA544f150678B8E5720b6b96a9E9a2F",
        "csvParentSlug": None,
        "chains": ["Base"],
        "website": "https://maple.finance",
        "twitter": "https://x.com/maplefinance",
        "discord": None,
        "github": "https://github.com/maple-labs",
    },
    "stsyrup": {
        "name": "stSYRUP",
        "symbol": "stSYRUP",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Staked SYRUP receipt token. SYRUP holders stake into stSYRUP to participate "
            "in Maple governance and fee sharing."
        ),
        "entitySlug": "maple",
        "coingecko": None,
        "contractAddress": "0xc7E8b36E0766D9B04c93De68A9D47dD11f260B45",
        "csvParentSlug": None,
        "chains": ["Ethereum"],
        "website": "https://maple.finance",
        "twitter": "https://x.com/maplefinance",
        "discord": None,
        "github": "https://github.com/maple-labs",
    },
    "syrup-usdc-pool": {
        "name": "syrupUSDC pool",
        "symbol": "syrupUSDC",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Maple syrupUSDC institutional lending pool — permissionless USDC lending "
            "pool token on Ethereum."
        ),
        "entitySlug": "maple",
        "coingecko": None,
        "contractAddress": "0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b",
        "csvParentSlug": None,
        "chains": ["Ethereum"],
        "website": "https://maple.finance",
        "twitter": "https://x.com/maplefinance",
        "discord": None,
        "github": "https://github.com/maple-labs",
    },
    "syrup-usdt-pool": {
        "name": "syrupUSDT pool",
        "symbol": "syrupUSDT",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Maple syrupUSDT institutional lending pool — permissionless USDT lending "
            "pool token on Ethereum."
        ),
        "entitySlug": "maple",
        "coingecko": None,
        "contractAddress": "0x356B8d89c1e1239Cbbb9dE4815c39A1474d5BA7D",
        "csvParentSlug": None,
        "chains": ["Ethereum"],
        "website": "https://maple.finance",
        "twitter": "https://x.com/maplefinance",
        "discord": None,
        "github": "https://github.com/maple-labs",
    },
    # ---- DEX governance tokens (PDF "DEX + RWA Sector Expansion" §3) -----
    "uni": {
        "name": "Uniswap",
        "symbol": "UNI",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of the Uniswap Protocol; UNI holders steer fee "
            "switches, treasury, and deployments across Uniswap's V3/V4 markets."
        ),
        "entitySlug": "uniswap",
        "coingecko": "https://www.coingecko.com/en/coins/uniswap",
        "contractAddress": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        "csvParentSlug": None,
        "chains": ["Ethereum", "Arbitrum One", "Base", "Optimism", "Polygon"],
        "website": "https://uniswap.org",
        "twitter": "https://x.com/Uniswap",
        "discord": None,
        "github": "https://github.com/Uniswap",
    },
    "crv": {
        "name": "Curve DAO Token",
        "symbol": "CRV",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Curve Finance; lock CRV into veCRV to direct "
            "gauge emissions and earn protocol fees / bribes."
        ),
        "entitySlug": "curve-finance",
        "coingecko": "https://www.coingecko.com/en/coins/curve-dao-token",
        "contractAddress": "0xD533a949740bb3306d119CC777fa900bA034cd52",
        "csvParentSlug": None,
        "chains": ["Ethereum", "Arbitrum One", "Optimism", "Polygon", "Base"],
        "website": "https://curve.fi",
        "twitter": "https://x.com/CurveFinance",
        "discord": None,
        "github": "https://github.com/curvefi",
    },
    "bal": {
        "name": "Balancer",
        "symbol": "BAL",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Balancer; lock 80/20 BAL/WETH into veBAL to "
            "direct gauge emissions and earn protocol revenue."
        ),
        "entitySlug": "balancer",
        "coingecko": "https://www.coingecko.com/en/coins/balancer",
        "contractAddress": "0xba100000625a3754423978a60c9317c58a424e3D",
        "csvParentSlug": None,
        "chains": ["Ethereum", "Arbitrum One", "Polygon", "Optimism", "Base"],
        "website": "https://balancer.fi",
        "twitter": "https://x.com/Balancer",
        "discord": None,
        "github": "https://github.com/balancer",
    },
    "aero": {
        "name": "Aerodrome",
        "symbol": "AERO",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Aerodrome Finance on Base; lock into veAERO to "
            "vote on emissions and earn bribes/fees (ve(3,3) model)."
        ),
        "entitySlug": "aerodrome",
        "coingecko": "https://www.coingecko.com/en/coins/aerodrome-finance",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["Base"],
        "website": "https://aerodrome.finance",
        "twitter": "https://x.com/aerodromefi",
        "discord": None,
        "github": None,
    },
    "cake": {
        "name": "PancakeSwap",
        "symbol": "CAKE",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance + utility token of PancakeSwap, the dominant BNB-chain "
            "DEX; used for staking, gauges, and IFO participation."
        ),
        "entitySlug": "pancakeswap",
        "coingecko": "https://www.coingecko.com/en/coins/pancakeswap-token",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["BNB Chain", "Ethereum", "Arbitrum One", "Base"],
        "website": "https://pancakeswap.finance",
        "twitter": "https://x.com/PancakeSwap",
        "discord": None,
        "github": "https://github.com/pancakeswap",
    },
    "joe": {
        "name": "JOE",
        "symbol": "JOE",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Trader Joe (LFJ); stake as sJOE for USDC fee "
            "share or veJOE for boosted yield."
        ),
        "entitySlug": "trader-joe",
        "coingecko": "https://www.coingecko.com/en/coins/joe",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["Avalanche", "Arbitrum One", "BNB Chain"],
        "website": "https://lfj.gg",
        "twitter": "https://x.com/LFJ_gg",
        "discord": None,
        "github": None,
    },
    "sushi": {
        "name": "Sushi",
        "symbol": "SUSHI",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of SushiSwap; stake to xSUSHI to accrue a share of "
            "protocol fees across 40+ chains."
        ),
        "entitySlug": "sushiswap",
        "coingecko": "https://www.coingecko.com/en/coins/sushi",
        "contractAddress": "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
        "csvParentSlug": None,
        "chains": ["Ethereum", "Arbitrum One", "Polygon", "Optimism", "Base"],
        "website": "https://www.sushi.com",
        "twitter": "https://x.com/SushiSwap",
        "discord": None,
        "github": "https://github.com/sushiswap",
    },
    "ray": {
        "name": "Raydium",
        "symbol": "RAY",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance + utility token of Raydium, Solana's hybrid AMM that "
            "shares liquidity with the OpenBook order book."
        ),
        "entitySlug": "raydium",
        "coingecko": "https://www.coingecko.com/en/coins/raydium",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://raydium.io",
        "twitter": "https://x.com/RaydiumProtocol",
        "discord": None,
        "github": None,
    },
    "rune": {
        "name": "THORChain",
        "symbol": "RUNE",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Settlement + governance asset of THORChain; bonded by node operators "
            "and paired in every liquidity pool for native cross-chain swaps."
        ),
        "entitySlug": "thorchain",
        "coingecko": "https://www.coingecko.com/en/coins/thorchain",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["THORChain"],
        "website": "https://thorchain.org",
        "twitter": "https://x.com/THORChain",
        "discord": None,
        "github": None,
    },
    "hype": {
        "name": "Hyperliquid",
        "symbol": "HYPE",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Hyperliquid, the purpose-built L1 with a fully "
            "on-chain order book and the deepest on-chain perp liquidity."
        ),
        "entitySlug": "hyperliquid",
        "coingecko": "https://www.coingecko.com/en/coins/hyperliquid",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["Hyperliquid L1"],
        "website": "https://hyperliquid.xyz",
        "twitter": "https://x.com/HyperliquidX",
        "discord": None,
        "github": None,
    },
    "dydx-gov": {
        "name": "dYdX",
        "symbol": "DYDX",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance + staking token of the dYdX Chain; secures the Cosmos "
            "appchain and governs permissionless perpetual market listings."
        ),
        "entitySlug": "dydx",
        "coingecko": "https://www.coingecko.com/en/coins/dydx-chain",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["dYdX Chain", "Ethereum"],
        "website": "https://dydx.exchange",
        "twitter": "https://x.com/dYdX",
        "discord": None,
        "github": "https://github.com/dydxprotocol",
    },
    "gmx-gov": {
        "name": "GMX",
        "symbol": "GMX",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance + fee-share token of GMX; stake for esGMX vesting and a "
            "share of trading fees from the GLP/GM pools."
        ),
        "entitySlug": "gmx",
        "coingecko": "https://www.coingecko.com/en/coins/gmx",
        "contractAddress": "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
        "csvParentSlug": None,
        "chains": ["Arbitrum One", "Avalanche"],
        "website": "https://gmx.io",
        "twitter": "https://x.com/GMX_IO",
        "discord": None,
        "github": "https://github.com/gmx-io",
    },
    "drift": {
        "name": "Drift",
        "symbol": "DRIFT",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Drift Protocol, the leading Solana-native perps "
            "DEX; stake as sDRIFT for fee discounts and revenue share."
        ),
        "entitySlug": "drift-protocol",
        "coingecko": "https://www.coingecko.com/en/coins/drift-protocol",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://drift.trade",
        "twitter": "https://x.com/DriftProtocol",
        "discord": None,
        "github": None,
    },
    "gns": {
        "name": "Gains Network",
        "symbol": "GNS",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Gains Network (gTrade); also collateralizes the "
            "gGNS vault backing its synthetic leveraged markets."
        ),
        "entitySlug": "gains-network",
        "coingecko": "https://www.coingecko.com/en/coins/gains-network",
        "contractAddress": "0x18c11FD286C5EC11c3b683Caa813B77f5163A122",
        "csvParentSlug": None,
        "chains": ["Arbitrum One", "Polygon", "Base"],
        "website": "https://gains.trade",
        "twitter": "https://x.com/GainsNetwork_io",
        "discord": None,
        "github": None,
    },
    # ---- RWA governance tokens (PDF "DEX + RWA Sector Expansion" §4) -----
    "cfg": {
        "name": "Centrifuge",
        "symbol": "CFG",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Centrifuge; governs the protocol that tokenizes "
            "real-world private-credit pools via bankruptcy-remote SPVs."
        ),
        "entitySlug": "centrifuge",
        "coingecko": "https://www.coingecko.com/en/coins/centrifuge",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["Centrifuge Chain", "Ethereum"],
        "website": "https://centrifuge.io",
        "twitter": "https://x.com/centrifuge",
        "discord": None,
        "github": "https://github.com/centrifuge",
    },
    "gfi": {
        "name": "Goldfinch",
        "symbol": "GFI",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Goldfinch; used for staking, backer incentives, "
            "and governance of its uncollateralized private-credit protocol."
        ),
        "entitySlug": "goldfinch",
        "coingecko": "https://www.coingecko.com/en/coins/goldfinch",
        "contractAddress": "0xdab396cCF3d84Cf2D07C4454e10C8A6F5b008D2b",
        "csvParentSlug": None,
        "chains": ["Ethereum"],
        "website": "https://goldfinch.finance",
        "twitter": "https://x.com/goldfinch_fi",
        "discord": None,
        "github": "https://github.com/goldfinch-eng",
    },
    "cpool": {
        "name": "Clearpool",
        "symbol": "CPOOL",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of Clearpool; governs its institutional "
            "uncollateralized lending pools and Credit Vaults."
        ),
        "entitySlug": "clearpool",
        "coingecko": "https://www.coingecko.com/en/coins/clearpool",
        "contractAddress": "0x66761Fa41377003622aEE3c7675Fc7b5c1C2FaC5",
        "csvParentSlug": None,
        "chains": ["Ethereum", "Arbitrum One", "Polygon", "Optimism", "Base"],
        "website": "https://clearpool.finance",
        "twitter": "https://x.com/ClearpoolFin",
        "discord": None,
        "github": None,
    },
    "reg": {
        "name": "RealToken Ecosystem Governance",
        "symbol": "REG",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "Governance token of the RealT ecosystem; governs the fractional "
            "real-estate platform that streams daily rental yield on-chain."
        ),
        "entitySlug": "realt",
        "coingecko": "https://www.coingecko.com/en/coins/realtoken-ecosystem-governance",
        "contractAddress": None,
        "csvParentSlug": None,
        "chains": ["Gnosis Chain", "Ethereum"],
        "website": "https://realt.co",
        "twitter": "https://x.com/RealTPlatform",
        "discord": None,
        "github": None,
    },
}


def _fact(key, value, freshness, label, url, theoretical=False):
    fact = {
        "key": key,
        "value": value,
        "freshness": freshness,
        "source": {"label": label, "url": url},
        "capturedAt": "2026-06-08",
    }
    if theoretical:
        fact["theoretical"] = True
    return fact


# Rich detail-page overlays merged into TOKENS below. Kept separate so the base
# specs stay readable and only curated tokens carry heavy fields. Curated +
# sourced; volatile figures (APY/AUM) are tagged dataSource "demo" so the UI
# never presents them as live (live price/supply come from the render overlays).
TOKEN_RICH: Dict[str, Dict[str, Any]] = {
    "jlp": {
        "longDescription": (
            "JLP is the liquidity-provider index token for Jupiter Perpetuals on Solana. "
            "Holding JLP gives exposure to a basket of SOL, BTC, ETH, USDC and USDT plus a "
            "75% share of perpetuals trading and borrowing fees, which auto-compound into "
            "the pool's NAV. JLP appreciates with fees and the basket, and can lose value "
            "when traders win against the pool."
        ),
        "poolComposition": {
            "assets": [
                {"symbol": "SOL", "name": "Solana", "targetWeightPct": 44,
                 "currentWeightPct": 44, "kind": "volatile", "valueUsd": 616_000_000},
                {"symbol": "BTC", "name": "Wrapped Bitcoin", "targetWeightPct": 11,
                 "currentWeightPct": 11, "kind": "volatile", "valueUsd": 154_000_000},
                {"symbol": "ETH", "name": "Wrapped Ether", "targetWeightPct": 9,
                 "currentWeightPct": 9, "kind": "volatile", "valueUsd": 126_000_000},
                {"symbol": "USDC", "name": "USD Coin", "targetWeightPct": 27,
                 "currentWeightPct": 27, "kind": "stable", "valueUsd": 378_000_000},
                {"symbol": "USDT", "name": "Tether", "targetWeightPct": 9,
                 "currentWeightPct": 9, "kind": "stable", "valueUsd": 126_000_000},
            ],
            "stablePct": 36,
            "volatilePct": 64,
            "aumUsd": 1_400_000_000,
            "aumCapUsd": None,
            "utilizationPct": 0,
            "dataSource": "demo",
            "updatedAt": None,
        },
        "yieldMechanics": {
            "currentApyPct": 20.0,
            "feeShareToHoldersPct": 75,
            "yieldSource": "75% of Jupiter Perpetuals trading & borrowing fees accrue to the JLP pool",
            "isAutoCompounding": True,
            "emissionsBased": False,
            "payoutAsset": "Auto-compounded into JLP NAV (real yield, no token emissions)",
            "dataSource": "demo",
        },
    },
    "aave-gov": {
        "longDescription": (
            "AAVE is the governance token of the Aave protocol, capped at 16M. Holders vote "
            "on risk parameters and the treasury and can stake into the Umbrella safety "
            "system; under Aavenomics, protocol revenue funds recurring AAVE buybacks."
        ),
        "tokenomics": {
            "maxSupply": 16_000_000,
            "buybackPolicy": "Aavenomics buys back AAVE with protocol revenue (~$1M/week, ~$50M/yr scale).",
            "distribution": [
                {"bucket": "Migrated from LEND (100:1)", "pct": 77},
                {"bucket": "Ecosystem reserve", "pct": 23},
            ],
            "notes": ["16M AAVE max supply.", "Stake into Umbrella / Safety Module for backstop rewards."],
        },
        "offchainFacts": [
            _fact("buyback", "Aavenomics directs protocol revenue to recurring AAVE buybacks (~$1M/week).",
                  "semi-live", "Aave", "https://aave.com"),
            _fact("safetyModule", "Umbrella replaces the legacy Safety Module; stkGHO/stkABPT absorb first-loss.",
                  "static", "Aave", "https://aave.com"),
        ],
    },
    "ena": {
        "longDescription": (
            "ENA is Ethena's governance token (15B max supply). Staking ENA into sENA "
            "enables protocol fee sharing once the governance fee switch is active and "
            "earns airdrop-campaign multipliers."
        ),
        "tokenomics": {
            "maxSupply": 15_000_000_000,
            "buybackPolicy": "Governance fee switch can route revenue to sENA stakers (not a buyback/burn).",
            "distribution": [
                {"bucket": "Ecosystem development & airdrops", "pct": 30},
                {"bucket": "Core contributors", "pct": 30},
                {"bucket": "Investors", "pct": 25},
                {"bucket": "Foundation", "pct": 15},
            ],
            "notes": ["15B ENA max supply.", "sENA captures fee sharing (once enabled) + airdrop multipliers."],
        },
        "offchainFacts": [
            _fact("feeSwitch",
                  "ENA governance can activate a fee switch sharing revenue with sENA stakers once thresholds are met.",
                  "static", "Ethena", "https://ethena.fi", theoretical=True),
        ],
    },
    "jup": {
        "longDescription": (
            "JUP is Jupiter's governance token, capped at 10B with 50% allocated to the "
            "community via the Jupuary airdrops. Jupiter directs 50% of protocol fees to "
            "JUP buybacks held in the Litterbox Trust (3-year lock)."
        ),
        "tokenomics": {
            "maxSupply": 10_000_000_000,
            "buybackPolicy": "50% of protocol fees buy back JUP into the Litterbox Trust (3-year lock).",
            "distribution": [
                {"bucket": "Community", "pct": 50},
                {"bucket": "Team & strategic reserves", "pct": 50},
            ],
            "notes": ["10B JUP max supply.", "Half of supply reserved for the community."],
        },
        "offchainFacts": [
            _fact("buybacks", "Jupiter directs 50% of protocol fees to JUP buybacks (Litterbox Trust, 3-year lock).",
                  "semi-live", "Jupiter", "https://jup.ag"),
        ],
    },
    "sky-gov": {
        "longDescription": (
            "SKY is the governance token of Sky (the MakerDAO successor). Legacy MKR "
            "converts to SKY at 1:24,000, and the Smart Burn Engine uses protocol surplus "
            "to buy back and burn governance tokens."
        ),
        "tokenomics": {
            "maxSupply": None,
            "buybackPolicy": "Smart Burn Engine buys back and burns governance tokens with protocol surplus.",
            "notes": ["1 MKR converts to 24,000 SKY.", "Supply is governance-managed (no fixed cap)."],
        },
        "offchainFacts": [
            _fact("migration", "USDS upgrades 1:1 from DAI; legacy MKR converts to SKY at 1:24,000.",
                  "static", "Sky", "https://sky.money"),
        ],
    },
    "ondo-gov": {
        "longDescription": (
            "ONDO is Ondo Finance's governance token (10B max supply). It governs the "
            "protocol; product yield accrues to USDY/OUSG holders rather than to ONDO."
        ),
        "tokenomics": {
            "maxSupply": 10_000_000_000,
            "emissionsPolicy": "Ecosystem-growth and protocol-development allocations vest over multi-year schedules.",
            "notes": ["10B ONDO max supply.", "Governance only — not a yield-bearing asset."],
        },
        "offchainFacts": [
            _fact("governanceOnly", "ONDO is governance only; USDY/OUSG holders receive the product yield.",
                  "static", "Ondo Finance", "https://ondo.finance"),
        ],
    },
    "chip": {
        "longDescription": (
            "CHIP is the governance token of USD.AI (10B total supply). The ICO sold 700M "
            "CHIP (7%) at $0.03 (~$300M FDV) with full unlock at TGE. Staking to sCHIP "
            "provides first-loss insurance capital that protects sUSDai depositors from "
            "GPU-loan defaults."
        ),
        "tokenomics": {
            "maxSupply": 10_000_000_000,
            "emissionsPolicy": (
                "ICO: 700M CHIP (7%) at $0.03, ~$300M FDV, 100% unlock at TGE; remainder across "
                "foundation, ecosystem and contributors."
            ),
            "notes": ["10B CHIP total supply.", "sCHIP is staked CHIP serving as first-loss capital."],
        },
        "offchainFacts": [
            _fact("icoTerms", "$CHIP ICO: $0.03/token, $300M FDV, 700M CHIP (7%), 100% unlock at TGE, on CoinList.",
                  "static", "USD.AI", "https://usd.ai/insights/chip-ico-airdrop"),
            _fact("insurance", "sCHIP (staked CHIP) is first-loss capital protecting sUSDai depositors from defaults.",
                  "static", "USD.AI", "https://docs.usd.ai/"),
        ],
    },
    "usdy": {
        "yieldMechanics": {
            "currentApyPct": 5.0,
            "feeShareToHoldersPct": 0,
            "yieldSource": "Short-term US Treasuries & bank deposits backing USDY (Reg S note)",
            "isAutoCompounding": True,
            "emissionsBased": False,
            "payoutAsset": "Accrues into USDY's price daily (token appreciates)",
            "dataSource": "demo",
        },
        "offchainFacts": [
            _fact("yieldSource", "USDY pays through short-term Treasury & bank-deposit yield via a Reg S wrapper.",
                  "static", "Ondo Finance", "https://ondo.finance"),
        ],
    },
    "stkaave": {
        "yieldMechanics": {
            "currentApyPct": 5.0,
            "feeShareToHoldersPct": 0,
            "yieldSource": "Safety Module staking rewards for backstopping the Aave protocol",
            "isAutoCompounding": False,
            "emissionsBased": True,
            "payoutAsset": "AAVE incentive emissions; staked AAVE is slashed first on a shortfall",
            "dataSource": "demo",
        },
        "offchainFacts": [
            _fact("role", "stkAAVE backstops Aave via the Safety Module / Umbrella and can be slashed to cover shortfalls.",
                  "static", "Aave", "https://aave.com"),
        ],
    },
    "stkabpt": {
        "yieldMechanics": {
            "currentApyPct": 5.0,
            "feeShareToHoldersPct": 0,
            "yieldSource": "Balancer 80/20 AAVE-wstETH pool swap fees plus AAVE incentives (legacy)",
            "isAutoCompounding": False,
            "emissionsBased": True,
            "payoutAsset": "Balancer fees + AAVE incentives; slashed first on shortfall (legacy Safety Module)",
            "dataSource": "demo",
        },
        "offchainFacts": [
            _fact("legacy", "stkABPT is a legacy Safety Module backstop superseded by Umbrella; positions remain on Ethereum.",
                  "static", "Aave", "https://aave.com"),
        ],
    },
    "schip": {
        "yieldMechanics": {
            "currentApyPct": 10.0,
            "feeShareToHoldersPct": 0,
            "yieldSource": "Insurance-module rewards for providing first-loss capital to USD.AI",
            "isAutoCompounding": False,
            "emissionsBased": True,
            "payoutAsset": "Reward emissions; slashed first on a GPU-loan default",
            "dataSource": "demo",
        },
        "offchainFacts": [
            _fact("insurance", "sCHIP is first-loss capital: slashed before sUSDai depositors if a compute borrower defaults.",
                  "static", "USD.AI", "https://docs.usd.ai/"),
        ],
    },
    "sena": {
        "offchainFacts": [
            _fact("feeSwitch",
                  "sENA earns ENA rewards and airdrop multipliers; protocol fee sharing is pending the "
                  "governance fee-switch activation.",
                  "static", "Ethena", "https://ethena.fi", theoretical=True),
        ],
    },
    "iusde": {
        "offchainFacts": [
            _fact("access", "iUSDe is a TradFi-wrapped sUSDe restricted to verified institutional investors (KYC-gated).",
                  "static", "Ethena", "https://ethena.fi"),
        ],
    },
}

for _slug, _rich in TOKEN_RICH.items():
    TOKENS[_slug].update(_rich)

DEFAULT_CSV = BACKEND_ROOT / "data" / "Arbitrum Ecosystem - scrape v2.csv"
DOWNLOADS_CSV = Path.home() / "Downloads" / "Arbitrum Ecosystem - scrape v2.csv"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    v = value.strip()
    return v or None


def _as_bool(value: Optional[str]) -> bool:
    return (value or "").strip().upper() == "TRUE"


def _split_chains(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [c.strip() for c in value.split("|") if c.strip()]


def resolve_csv_path(argv: List[str]) -> Path:
    if len(argv) > 1 and argv[1].strip():
        return Path(argv[1]).expanduser()
    if DEFAULT_CSV.exists():
        return DEFAULT_CSV
    if DOWNLOADS_CSV.exists():
        return DOWNLOADS_CSV
    return DEFAULT_CSV


# Optional rich detail-page overlays a token spec MAY define. Each maps a
# camelCase spec key -> the PascalCase store key the frontend reader expects
# (see frontend/lib/server/store.ts). Only emitted when present, so simple
# tokens stay lean and old store records deserialize unchanged.
RICH_TOKEN_FIELDS: Dict[str, str] = {
    "longDescription": "LongDescription",
    "market": "Market",
    "priceHistory": "PriceHistory",
    "poolComposition": "PoolComposition",
    "yieldMechanics": "YieldMechanics",
    "typedRisks": "TypedRisks",
    "tokenomics": "Tokenomics",
    "audits": "Audits",
    "sources": "Sources",
    "offchainFacts": "OffchainFacts",
    "agentSkill": "AgentSkill",
}


def token_item(slug: str, parent_row: Optional[Dict[str, str]], created_at: str) -> dict:
    spec = TOKENS[slug]
    row = parent_row or {}
    now = _now_iso()
    chains = spec.get("chains")
    if chains is None and row:
        chains = _split_chains(row.get("Chains"))
    item = {
        schema.PK: schema.category_pk(schema.CATEGORY_TOKEN),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_TOKEN,
        "Status": schema.STATUS_APPROVED,
        "Name": spec["name"],
        "Slug": slug,
        "Symbol": spec["symbol"],
        "TokenType": spec["tokenType"],
        "SubCategory": spec.get("subCategory"),
        "Description": spec["description"],
        "Website": spec.get("website") or _clean(row.get("Website")) or "https://usd.ai",
        "Twitter": spec.get("twitter") or _clean(row.get("Twitter")),
        "Discord": spec.get("discord") or _clean(row.get("Discord")),
        "GitHub": spec.get("github") or _clean(row.get("GitHub")),
        "CoinGecko": spec.get("coingecko"),
        "AuditURL": _clean(row.get("Audit URL")),
        "ContractAddress": spec.get("contractAddress"),
        "EntitySlug": spec["entitySlug"],
        "TotalSupply": {"value": None, "source": "alchemy", "updatedAt": None},
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")),
            "logoUrl": _clean(row.get("Logo URL")),
            "bannerUrl": _clean(row.get("Banner URL")),
            "chains": chains or [],
            "subCategory": spec.get("subCategory") or "Token",
            "isLive": _as_bool(row.get("Is Live")) or bool(chains),
            "isArbitrumNative": _as_bool(row.get("Is Arbitrum Native")),
            "isPubliclyAudited": _as_bool(row.get("Is Publicly Audited")),
            "foundedDate": _clean(row.get("Founded Date")),
        },
        "CreatedAt": created_at,
        "UpdatedAt": now,
    }
    for spec_key, store_key in RICH_TOKEN_FIELDS.items():
        value = spec.get(spec_key)
        if value is not None:
            item[store_key] = value
    deployments = spec.get("deployments")
    if deployments:
        item["Deployments"] = deployments
    return item


def main(argv: List[str]) -> int:
    csv_path = resolve_csv_path(argv)
    csv_rows: Dict[str, Dict[str, str]] = {}
    if csv_path.exists():
        with csv_path.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                slug = (row.get("Slug") or "").strip()
                if slug:
                    csv_rows[slug] = row

    repo = get_repository()
    pk = schema.category_pk(schema.CATEGORY_TOKEN)

    entity_slugs = {
        item.get("Slug", "")
        for item in repo.all()
        if item.get("Category") == schema.CATEGORY_ENTITY and item.get("Slug")
    }

    staged: List[str] = []
    skipped_entity_owned: List[str] = []
    for slug, spec in TOKENS.items():
        if slug in entity_slugs:
            skipped_entity_owned.append(slug)
            continue
        csv_parent = spec.get("csvParentSlug")
        parent_row = csv_rows.get(csv_parent) if csv_parent else None
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        repo.put_item(apply_coin_classification(token_item(slug, parent_row, created_at)))
        staged.append(slug)

    print(f"Source CSV : {csv_path if csv_path.exists() else '(none — usd.ai defaults)'}")
    print(f"Backend    : {type(repo).__name__}")
    print(f"Partition  : {pk}")
    print("-" * 64)
    print(f"{'STATUS':<18}{'SYMBOL':<10}{'NAME'}")
    print("-" * 64)
    for slug in staged:
        spec = TOKENS[slug]
        print(f"{schema.STATUS_PENDING:<18}{spec['symbol']:<10}{spec['name']}")
    print("-" * 64)
    print(f"Published {len(staged)} / {len(TOKENS)} token(s) as APPROVED.")
    if skipped_entity_owned:
        print(
            f"Skipped {len(skipped_entity_owned)} token(s) whose slug matches a "
            f"promoted Entity profile: {', '.join(skipped_entity_owned)}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
