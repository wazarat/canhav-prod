#!/usr/bin/env python3
"""
One-off seeder: add Credit + Staking member-coin Token profiles and link them
into each network's MemberCoins[]. Mutates BOTH stores in place with identical
content, preserving the exact on-disk formatting:
  - frontend/data/bootstrap-store.json   (prod seed bundle; trailing newline)
  - backend/data/store.json              (local-dev source; no trailing newline)

Idempotent: skips a Token item that already exists; dedupes MemberCoins by
(slug, category). Run with --check to validate network keys without writing.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
FRONTEND = HERE.parent
REPO = FRONTEND.parent
BOOTSTRAP = FRONTEND / "data" / "bootstrap-store.json"
BACKEND = REPO / "backend" / "data" / "store.json"
NOW = "2026-06-25T18:30:00Z"

GOV = ("Governance", "Governance Token", "governance")
LST = ("LST", "LST", "lst")

# slug, network_slug, name, symbol, coingecko_id, contract, chains, type_tuple, role, website, twitter, github, audit, desc
TOKENS = [
    # ---------------- CREDIT ----------------
    ("rdnt", "radiant", "Radiant Capital", "RDNT", "radiant-capital",
     "0x3082CC23568eA640225c2467653dB90e9250AaA0",
     ["Arbitrum One", "BNB Chain", "Ethereum"], GOV,
     "Governance token of the cross-chain Radiant money market.",
     "https://radiant.capital", "https://x.com/RDNTCapital",
     "https://github.com/radiant-capital", None,
     "Governance token of Radiant Capital, an omnichain lending and borrowing market built on LayerZero. RDNT holders lock for dLP to earn protocol fees and direct emissions."),
    ("gear", "gearbox", "Gearbox Protocol", "GEAR", "gearbox",
     "0xBa3335588D9403515223F109EdC4eB7269a9Ab5D",
     ["Ethereum", "Arbitrum One", "Optimism"], GOV,
     "Governance token of the Gearbox leverage protocol.",
     "https://gearbox.fi", "https://x.com/GearboxProtocol",
     "https://github.com/Gearbox-protocol", None,
     "Governance token of Gearbox, a composable leverage protocol whose Credit Accounts let users borrow up to ~10x to farm across integrated DeFi strategies."),
    ("pendle", "pendle", "Pendle", "PENDLE", "pendle",
     "0x808507121B80c02388fAd14726482e061B8da827",
     ["Ethereum", "Arbitrum One", "Optimism", "BNB Chain"], GOV,
     "Governance/utility token of the Pendle yield-tokenization protocol.",
     "https://www.pendle.finance", "https://x.com/pendle_fi",
     "https://github.com/pendle-finance", None,
     "Token of Pendle, a yield-tokenization protocol that splits yield-bearing assets into Principal (PT) and Yield (YT) tokens for fixed-rate and yield-trading markets. vePENDLE directs incentives and earns fees."),
    ("note", "notional", "Notional Finance", "NOTE", "notional-finance",
     "0xCFEAead4947f0705A14ec42aC3D44129E1Ef3eD5",
     ["Ethereum", "Arbitrum One"], GOV,
     "Governance token of the Notional fixed-rate lending protocol.",
     "https://notional.finance", "https://x.com/NotionalFinance",
     "https://github.com/notional-finance", None,
     "Governance token of Notional Finance, a fixed-rate, fixed-term lending protocol that uses fCash and an on-chain AMM to price term debt."),
    ("spk", "spark", "Spark", "SPK", "spark-2",
     "0xc20059e0317DE91738d13af027DfC4a50781b066",
     ["Ethereum", "Base"], GOV,
     "Governance token of Spark, the Sky-powered lending stack.",
     "https://spark.fi", "https://x.com/sparkdotfi",
     "https://github.com/marsfoundation", None,
     "Governance token of Spark Protocol, the Sky (ex-MakerDAO) ecosystem lending stack (SparkLend + Spark Savings) built on an Aave V3 fork with Sky-supplied liquidity."),

    # ---------------- STAKING: LIQUID STAKING ----------------
    ("steth", "lido", "Lido Staked ETH", "stETH", "staked-ether",
     "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
     ["Ethereum"], LST,
     "Liquid staking token for ETH staked via Lido.",
     "https://lido.fi", "https://x.com/LidoFinance",
     "https://github.com/lidofinance", None,
     "stETH is Lido's rebasing liquid staking token representing ETH staked across Lido's node-operator set, accruing Ethereum consensus and execution rewards daily."),
    ("reth", "rocket-pool", "Rocket Pool ETH", "rETH", "rocket-pool-eth",
     "0xae78736Cd615f374D3085123A210448E74Fc6393",
     ["Ethereum", "Arbitrum One", "Optimism", "Base"], LST,
     "Liquid staking token from Rocket Pool's permissionless node network.",
     "https://rocketpool.net", "https://x.com/Rocket_Pool",
     "https://github.com/rocket-pool", None,
     "rETH is Rocket Pool's non-rebasing liquid staking token; its ETH exchange rate appreciates as staking rewards accrue across a permissionless operator set."),
    ("wbeth", "binance-wbeth", "Wrapped Beacon ETH", "wBETH", "wrapped-beacon-eth",
     "0xa2E3356610840701BDf5611a53974510Ae27E2e1",
     ["Ethereum", "BNB Chain"], LST,
     "Binance's exchange-native liquid staking token for ETH.",
     "https://www.binance.com/en/wbeth", "https://x.com/binance",
     None, None,
     "wBETH is Binance's wrapped Beacon ETH, a value-accruing liquid staking token for ETH staked through Binance's exchange-native staking service."),
    ("cbeth", "coinbase-cbeth", "Coinbase Wrapped Staked ETH", "cbETH", "coinbase-wrapped-staked-eth",
     "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
     ["Ethereum", "Base", "Arbitrum One"], LST,
     "Coinbase's exchange-native liquid staking token for ETH.",
     "https://www.coinbase.com/cbeth", "https://x.com/coinbase",
     None, None,
     "cbETH is Coinbase's wrapped staked ETH, a non-rebasing liquid staking token whose ETH exchange rate grows with staking rewards earned via Coinbase."),
    ("meth", "mantle-meth", "Mantle Staked ETH", "mETH", "mantle-staked-ether",
     "0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa",
     ["Ethereum", "Mantle"], LST,
     "Liquid staking token of the Mantle LSP.",
     "https://www.mantle.xyz/meth", "https://x.com/0xMantle",
     "https://github.com/mantlenetworkio", None,
     "mETH is the liquid staking token of Mantle's LSP, a non-rebasing receipt for ETH staked through Mantle that appreciates against ETH as rewards accrue."),
    ("sfrxeth", "frax", "Staked Frax ETH", "sfrxETH", "staked-frax-ether",
     "0xac3E018457B222d93114458476f3E3416Abbe38F",
     ["Ethereum", "Arbitrum One", "Fraxtal"], LST,
     "Yield-bearing staked frxETH (Frax liquid staking).",
     "https://frax.finance", "https://x.com/fraxfinance",
     "https://github.com/FraxFinance", None,
     "sfrxETH is the yield-bearing vault token of Frax Ether: staked frxETH whose exchange rate accrues the ETH staking yield routed to frxETH stakers."),
    ("sweth", "swell", "Swell ETH", "swETH", "sweth",
     "0xf951E335afb289353dc249e82926178EaC7DEd78",
     ["Ethereum"], LST,
     "Swell's liquid staking token for ETH.",
     "https://www.swellnetwork.io", "https://x.com/swellnetworkio",
     "https://github.com/SwellNetwork", None,
     "swETH is Swell Network's non-rebasing liquid staking token for ETH, accruing consensus and execution-layer rewards through its rising ETH exchange rate."),
    ("ethx", "stader", "Stader ETHx", "ETHx", "stader-ethx",
     "0xA35b1B31Ce002FBF2058D22F30f95D405200A15b",
     ["Ethereum"], LST,
     "Stader's multi-pool liquid staking token for ETH.",
     "https://www.staderlabs.com", "https://x.com/staderlabs",
     "https://github.com/stader-labs", None,
     "ETHx is Stader Labs' liquid staking token for ETH, backed by a permissioned and permissionless operator structure designed to lower the staking deposit barrier."),
    ("oseth", "stakewise", "StakeWise osETH", "osETH", "stakewise-v3-oseth",
     "0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38",
     ["Ethereum"], LST,
     "StakeWise V3 over-collateralized staked ETH token.",
     "https://www.stakewise.io", "https://x.com/stakewise_io",
     "https://github.com/stakewise", None,
     "osETH is StakeWise V3's liquid staking token, minted against ETH staked in permissionless vaults and over-collateralized to protect holders from operator under-performance."),
    ("ankreth", "ankr", "Ankr Staked ETH", "ankrETH", "ankreth",
     "0xE95A203B1a91a908F9B9CE46459d101078c2c3cb",
     ["Ethereum", "BNB Chain", "Arbitrum One"], LST,
     "Ankr's multi-chain liquid staking token for ETH.",
     "https://www.ankr.com/staking", "https://x.com/ankr",
     "https://github.com/Ankr-network", None,
     "ankrETH is Ankr's non-rebasing liquid staking token for ETH; its exchange rate appreciates with staking rewards and it is bridged across multiple chains."),

    # ---------------- STAKING: RESTAKING ----------------
    ("eigen", "eigenlayer", "EigenLayer", "EIGEN", "eigenlayer",
     "0xec53bF9167f50cDEB3Ae105f56099aaaB9061F83",
     ["Ethereum"], GOV,
     "Intersubjective work/governance token of EigenLayer (EigenCloud).",
     "https://www.eigenlayer.xyz", "https://x.com/eigenlayer",
     "https://github.com/Layr-Labs", None,
     "EIGEN is the universal intersubjective work token of EigenLayer (now EigenCloud), used to secure Actively Validated Services alongside restaked ETH. Note: the network's headline figure is restaked TVL, not EIGEN market cap."),

    # ---------------- STAKING: LIQUID RESTAKING ----------------
    ("weeth", "ether-fi", "Wrapped eETH", "weETH", "wrapped-eeth",
     "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
     ["Ethereum", "Arbitrum One", "Base", "Blast"], LST,
     "ether.fi's wrapped liquid restaking token.",
     "https://www.ether.fi", "https://x.com/ether_fi",
     "https://github.com/etherfi-protocol", None,
     "weETH is the non-rebasing wrapper of ether.fi's eETH, a liquid restaking token that earns Ethereum staking yield plus EigenLayer restaking rewards."),
    ("ezeth", "renzo", "Renzo Restaked ETH", "ezETH", "renzo-restaked-eth",
     "0xbf5495Efe5DB9ce00f80364C8B423567e58d2110",
     ["Ethereum", "Arbitrum One", "Blast", "Base"], LST,
     "Renzo's EigenLayer liquid restaking token.",
     "https://www.renzoprotocol.com", "https://x.com/RenzoProtocol",
     "https://github.com/Renzo-Protocol", None,
     "ezETH is Renzo's liquid restaking token, an EigenLayer strategy-manager position that abstracts operator/AVS selection while accruing staking and restaking rewards."),
    ("rseth", "kelp-dao", "Kelp rsETH", "rsETH", "kelp-dao-restaked-eth",
     "0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7",
     ["Ethereum", "Arbitrum One", "Optimism", "Base"], LST,
     "Kelp DAO's LST-backed liquid restaking token.",
     "https://kelpdao.xyz", "https://x.com/KelpDAO",
     "https://github.com/Kelp-DAO", None,
     "rsETH is Kelp DAO's liquid restaking token, backed by a basket of accepted LSTs deposited into EigenLayer to earn combined staking and restaking yield."),
    ("pufeth", "puffer", "Puffer pufETH", "pufETH", "pufeth",
     "0xD9A442856C234a39a81a089C06451EBAa4306a72",
     ["Ethereum"], LST,
     "Puffer's native liquid restaking token.",
     "https://www.puffer.fi", "https://x.com/puffer_finance",
     "https://github.com/PufferFinance", None,
     "pufETH is Puffer Finance's native liquid restaking token, secured by anti-slashing (Secure-Signer) technology and EigenLayer restaking rewards."),
    ("unieth", "bedrock", "Bedrock uniETH", "uniETH", "universal-eth",
     "0xF1376bceF0f78459C0Ed0ba5ddce976F1ddF51F4",
     ["Ethereum", "Arbitrum One", "BNB Chain"], LST,
     "Bedrock's LST-backed liquid restaking token.",
     "https://www.bedrock.technology", "https://x.com/Bedrock_DeFi",
     "https://github.com/Bedrock-Technology", None,
     "uniETH is Bedrock's multi-asset liquid restaking token, backed by staked ETH routed into EigenLayer to earn staking plus restaking rewards."),
    ("yneth", "yieldnest", "YieldNest Restaked ETH", "ynETH", "yieldnest-restaked-eth",
     "0x09db87A538BD693E9d08544577d5ccfAA6373d48",
     ["Ethereum"], LST,
     "YieldNest's LST-backed liquid restaking token.",
     "https://www.yieldnest.finance", "https://x.com/yieldnest",
     "https://github.com/yieldnest", None,
     "ynETH is YieldNest's liquid restaking token, an LRT designed to optimize AVS selection on EigenLayer for risk-adjusted restaking yield."),
]


def build_token_item(t):
    (slug, net, name, sym, cgid, contract, chains, typ, role, website,
     twitter, github, audit, desc) = t
    token_type, sub_cat, asset_sub = typ
    return {
        "ArbitrumPortalMetadata": {
            "bannerUrl": None,
            "chains": chains,
            "foundedDate": None,
            "isArbitrumNative": False,
            "isLive": True,
            "isPubliclyAudited": False,
            "logoUrl": None,
            "portalUrl": None,
            "subCategory": sub_cat,
        },
        "AssetSubtype": asset_sub,
        "AuditURL": audit,
        "Category": "Token",
        "CoinGecko": f"https://www.coingecko.com/en/coins/{cgid}",
        "ContractAddress": contract.lower(),
        "CreatedAt": NOW,
        "Description": desc,
        "Discord": None,
        "EntitySlug": net,
        "GitHub": github,
        "Name": name,
        "PK": "CATEGORY#Token",
        "PegMechanism": "none",
        "SK": f"PROTOCOL#{slug}",
        "Slug": slug,
        "Status": "APPROVED",
        "SubCategory": sub_cat,
        "Symbol": sym,
        "TokenType": token_type,
        "TotalSupply": {"source": "alchemy", "updatedAt": None, "value": None},
        "Twitter": twitter,
        "UpdatedAt": NOW,
        "Website": website,
    }


def member_ref(t):
    slug, net, name, sym, _cg, _c, _ch, typ, role, *_ = t
    return {
        "category": "Token",
        "name": name,
        "role": role,
        "slug": slug,
        "subCategory": typ[1],
        "symbol": sym,
    }


def network_key(net):
    return f"CATEGORY#Entity|PROTOCOL#{net}"


def validate(store):
    items = store["items"]
    missing = []
    for t in TOKENS:
        net = t[1]
        if network_key(net) not in items:
            missing.append(net)
    return missing


def apply(store):
    items = store["items"]
    added_tokens = 0
    linked = 0
    for t in TOKENS:
        slug = t[0]
        net = t[1]
        tkey = f"CATEGORY#Token|PROTOCOL#{slug}"
        if tkey not in items:
            items[tkey] = build_token_item(t)
            added_tokens += 1
        nkey = network_key(net)
        net_item = items[nkey]
        mc = net_item.get("MemberCoins") or []
        if not any(r.get("slug") == slug and r.get("category") == "Token" for r in mc):
            mc.append(member_ref(t))
            net_item["MemberCoins"] = mc
            linked += 1
    store["_meta"]["count"] = len(items)
    store["_meta"]["updatedAt"] = NOW
    return added_tokens, linked


def write_store(path, store, trailing_newline):
    s = json.dumps(store, indent=2, sort_keys=True, ensure_ascii=False)
    if trailing_newline:
        s += "\n"
    path.write_text(s)


def main():
    check_only = "--check" in sys.argv
    boot = json.loads(BOOTSTRAP.read_text())
    back = json.loads(BACKEND.read_text())

    miss_b = validate(boot)
    miss_k = validate(back)
    if miss_b or miss_k:
        print("MISSING network keys (bootstrap):", sorted(set(miss_b)))
        print("MISSING network keys (backend):", sorted(set(miss_k)))
        sys.exit(2)
    print("All", len(TOKENS), "network targets present in both stores.")

    if check_only:
        print("--check only; no writes.")
        return

    a1, l1 = apply(boot)
    a2, l2 = apply(back)
    write_store(BOOTSTRAP, boot, trailing_newline=True)
    write_store(BACKEND, back, trailing_newline=False)
    print(f"bootstrap-store.json: +{a1} tokens, +{l1} links -> {boot['_meta']['count']} items")
    print(f"backend/store.json:   +{a2} tokens, +{l2} links -> {back['_meta']['count']} items")


if __name__ == "__main__":
    main()
