# CanHav Credit Sector: Partnership Dataset

Companion data for Linear milestone **M9, Partnerships interactive explorer**, in the [Credits completion](https://linear.app/canhav/project/credits-completion-12e57590a52b) project. Directly satisfies **CAN-81 (M9.4)** and supplies the edge list for **CAN-86 (M9.3)**, modelled against the taxonomy defined in **CAN-88 (M9.1)**.

Compiled 2026-07-26. Machine-readable companion: `docs/credit/credit-partnerships.json`.

## How to use this file

Every row is one edge in the partnership graph. The fields map one to one onto the M9.1 data model, so the JSON companion can be loaded straight into the store without a transform step. Every row carries a source URL that was fetched during research. No relationship is included on inference alone. Rows marked `deprecated` are historical and should render greyed rather than being deleted, because they carry real signal about a protocol's trajectory.

**Category ids** used throughout, matching M9.1:

| id | label |
|---|---|
| `integration_technical` | Technical integration |
| `liquidity_provider` | Liquidity provider |
| `oracle` | Oracle provider |
| `custody` | Custody |
| `chain_deployment` | Chain deployment |
| `institutional_tradfi` | Institutional or TradFi |
| `security_audit` | Security or audit |
| `governance_dao` | Governance or DAO |
| `grant_investment` | Grant, investment or backer |
| `distribution_frontend` | Distribution or front end |

## Coverage matrix

| Entity | Tag | Rows | integr | liquid | oracle | custod | chain | instit | securi | govern | grant | distri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Aave** | Lending | 52 | 14 | 2 | 3 | 1 | 2 | 9 | 14 | 5 | 0 | 2 |
| **Compound Finance** | Lending | 32 | 8 | 0 | 2 | 0 | 2 | 1 | 5 | 5 | 7 | 2 |
| **Morpho** | Lending | 59 | 12 | 3 | 5 | 3 | 2 | 6 | 13 | 6 | 3 | 6 |
| **Radiant Capital** | Lending | 28 | 11 | 0 | 2 | 0 | 2 | 0 | 9 | 0 | 2 | 2 |
| **Spark** | Lending | 43 | 12 | 3 | 4 | 0 | 2 | 4 | 7 | 6 | 2 | 3 |
| **Extra Finance** | Leveraged Yield | 30 | 10 | 2 | 2 | 0 | 3 | 0 | 5 | 2 | 3 | 3 |
| **Fluid** | Leveraged Yield | 46 | 15 | 2 | 4 | 0 | 6 | 2 | 8 | 3 | 2 | 4 |
| **Gearbox Protocol** | Leveraged Yield | 80 | 30 | 2 | 4 | 2 | 11 | 4 | 8 | 3 | 12 | 4 |
| **Stella** | Leveraged Yield | 34 | 9 | 2 | 2 | 0 | 4 | 2 | 3 | 3 | 6 | 3 |
| **Maple Finance** | Fixed Income | 82 | 11 | 5 | 5 | 7 | 11 | 14 | 11 | 3 | 9 | 6 |
| **Notional Finance** | Fixed Income | 44 | 12 | 4 | 4 | 0 | 3 | 4 | 5 | 4 | 7 | 1 |
| **Pendle Finance** | Fixed Income | 67 | 12 | 5 | 5 | 1 | 15 | 6 | 8 | 4 | 8 | 3 |
| **Sense Finance** | Fixed Income | 31 | 6 | 2 | 2 | 0 | 2 | 2 | 6 | 3 | 6 | 2 |
| **Spectra** | Fixed Income | 59 | 12 | 5 | 5 | 0 | 13 | 3 | 5 | 5 | 7 | 4 |

**687 evidenced partnership rows across 14 entities.** Column order matches the category table above: technical integration, liquidity, oracle, custody, chain deployment, institutional, security, governance, grant, distribution.

# Tag: Lending

## Aave

Slug `aave` · Sector Credit · Tag Lending · 52 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink CCIP | inbound | active | n.a. | Aave Governance approved Chainlink CCIP as the cross chain messaging bridge for the GHO stablecoin. | [Aave GHO docs](https://aave.com/docs/ecosystem/gho) |
| Chainlink SVR | mutual | active | 03-2025 | Chainlink Smart Value Recapture v1 went live on Aave v3 Ethereum on 29 March 2025 for LBTC, tBTC, LINK and AAVE feeds with a 65/35 OEV revenue split to Aave and Chainlink. | [Aave governance ARFC](https://governance.aave.com/t/arfc-aave-chainlink-svr-v1-phase-1-activation/21247) |
| Flashbots | inbound | active | 03-2025 | Flashbots MEV-Share is the auction venue used in the Chainlink SVR v1 implementation on Aave v3 Ethereum. | [Aave governance ARFC](https://governance.aave.com/t/arfc-aave-chainlink-svr-v1-phase-1-activation/21247) |
| CoW Swap | mutual | active | 12-2025 | Aave Labs announced a CoW Swap partnership on 4 December 2025 to power swap functionality across aave.com, including adapters on several chains and a Balancer v3 flash loan factory. | [Aave governance thread](https://governance.aave.com/t/aave-cowswap-integration-tokenholder-questions/23530) |
| ParaSwap | mutual | deprecated | 2022 | ParaSwap adapters were introduced with Aave v2 and v3 and a June 2022 referral programme routed surplus to the Aave DAO treasury, now superseded by the CoW Swap integration. | [Aave governance thread](https://governance.aave.com/t/aave-cowswap-integration-tokenholder-questions/23530) |
| Balancer | mutual | active | 2023 | GHO liquidity was seeded in a Balancer GHO/USDC/USDT pool as part of the karpatkey and TokenLogic liquidity mandate. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| Curve | mutual | active | 2024 | GHO pools including GHO/WBTC/wstETH and GHO/crvUSD were deployed on Curve under the DAO liquidity programme. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| Gyroscope | mutual | active | 2024 | GHO/USDC and GHO/GYD ECLP pools on Gyroscope were used as GHO liquidity venues. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| Maverick | mutual | active | 2024 | GHO/USDC pools on Maverick formed part of the GHO liquidity strategy. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| f(x) Protocol | mutual | active | 2024 | A GHO/fxUSD pool was included in the GHO liquidity venue set. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| Gearbox | inbound | active | 2024 | Gearbox accepts GHO as collateral, listed among GHO ecosystem integrations delivered in the mandate. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| Spectra Finance | inbound | active | 2024 | Spectra supports stkGHO, extending GHO staking into fixed rate markets. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| Aura and Convex | inbound | active | 2024 | Aura and Convex were used to direct incentives to GHO pools on Balancer and Curve. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| Securitize | inbound | active | 2025 | Securitize is a named tokenization partner in the Aave Horizon RWA market. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| karpatkey | inbound | deprecated | 12-2023 | karpatkey served as a financial service provider for GHO liquidity from 29 December 2023 to 18 June 2024 for 220k GHO. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |
| TokenLogic | inbound | deprecated | 12-2023 | TokenLogic worked alongside karpatkey on the same GHO liquidity mandate for 180k GHO. | [Aave governance Phase I summary](https://governance.aave.com/t/phase-i-summary-karpatkey-tokenlogic/17962) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink Price Feeds | inbound | active | n.a. | Aave production markets read Chainlink Price Feeds through the protocol oracle contracts. | [Aave oracle docs](https://aave.com/docs/ecosystem/oracle) |
| Correlated Assets Price Oracle (CAPO) | inbound | active | n.a. | CAPO is the second oracle contract type used on Aave production markets alongside Chainlink feeds. | [Aave oracle docs](https://aave.com/docs/ecosystem/oracle) |
| Chainlink SmartData NAVLink | inbound | active | 2025 | Chainlink NAVLink feeds supply net asset value data for tokenized funds listed in the Horizon RWA market. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |

### Custody

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Fireblocks | mutual | deprecated | 01-2022 | Fireblocks was the first and only active whitelister for the permissioned Aave Arc market, which is no longer active. | [Fireblocks blog](https://www.fireblocks.com/blog/permissioned-defi-goes-live-with-aave-arc-fireblocks) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum, Arbitrum, Base, Avalanche, BNB Chain, Polygon, OP Mainnet, Gnosis, Linea, Scroll, Sonic, Celo, Metis, Mantle, Soneium, ZKsync Era, Aptos, Plasma, MegaETH, X Layer, Fantom, Harmony | outbound | active | n.a. | DefiLlama lists Aave deployments across these chains. | [DefiLlama Aave](https://defillama.com/protocol/aave) |
| GHO chains: Ethereum, Arbitrum, Base, Avalanche, Gnosis, Mantle | outbound | active | n.a. | GHO is deployed on these six networks per the Aave GHO documentation. | [Aave GHO docs](https://aave.com/docs/ecosystem/gho) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Circle | mutual | active | 2025 | Circle USYC is one of the tokenized assets available in the Aave Horizon RWA market. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |
| Superstate | mutual | active | 2025 | Superstate USTB and USCC are listed as Horizon RWA collateral. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |
| Centrifuge | mutual | active | 2025 | Centrifuge JTRSY and JAAA are listed as Horizon RWA collateral. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |
| VanEck | mutual | active | 2025 | VanEck is named as a Horizon RWA issuer partner. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |
| WisdomTree | mutual | active | 2025 | WisdomTree is named as a Horizon RWA issuer partner. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |
| Ripple | mutual | active | 2025 | Ripple RLUSD is included in the Horizon market asset set. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |
| Ant Digital Technologies | mutual | active | 2025 | Ant Digital Technologies is named among Horizon launch partners. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |
| Ethena, OpenEden, KAIO | mutual | active | 2025 | These issuers are listed among Horizon RWA market partners. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |
| Anubi Digital, Bluefire Capital, Canvas Digital, CoinShares, GSR, Hidden Road, Wintermute | inbound | deprecated | 01-2022 | These firms were named participants in the permissioned Aave Arc market, which has been discontinued. | [Fireblocks blog](https://www.fireblocks.com/blog/permissioned-defi-goes-live-with-aave-arc-fireblocks) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Certora | inbound | active | 01-2022 | Certora reports appear in the Aave v3 Origin audits directory from January 2022 through November 2025. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| OpenZeppelin | inbound | active | 11-2021 | OpenZeppelin delivered the November 2021 Aave v3 audit held in the audits directory. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| Trail of Bits | inbound | active | 01-2022 | Trail of Bits delivered a January 2022 Aave v3 audit. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| PeckShield | inbound | active | 01-2022 | PeckShield delivered a January 2022 Aave v3 audit. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| Sigma Prime | inbound | active | 01-2022 | Sigma Prime audited Aave v3 in 2022 and again in 2023. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| ABDK | inbound | active | 01-2022 | ABDK reports are dated January 2022 and July 2025. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| MixBytes | inbound | active | 05-2024 | MixBytes delivered reviews in May 2024, December 2024 and July 2025. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| Cantina | inbound | active | 06-2024 | A Cantina competition report from June 2024 is stored in the audits directory. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| Oxorio | inbound | active | 09-2024 | Oxorio reports are dated September 2024 and January 2025. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| Pashov Audit Group | inbound | active | 09-2024 | A Pashov report is dated September 2024. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| Enigma Dark | inbound | active | 09-2024 | Enigma reports are dated September 2024 and May 2025. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| StErMi | inbound | active | 10-2024 | StErMi delivered reviews in October 2024, June 2025 and July 2025. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| Sherlock | inbound | active | 01-2025 | A Sherlock report is dated January 2025. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |
| Blackthorn | inbound | active | 06-2025 | Blackthorn reports are dated June 2025 and November 2025. | [aave-v3-origin audits](https://github.com/aave-dao/aave-v3-origin/tree/main/audits) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chaos Labs | inbound | deprecated | 11-2022 | Chaos Labs served as an Aave risk provider from November 2022 and announced its departure in April 2026. | [Chaos Labs departure post](https://governance.aave.com/t/chaos-labs-is-leaving-aave/24386) |
| LlamaRisk | inbound | active | 2025 | LlamaRisk is a risk service provider to Aave and took over full risk coverage after Chaos Labs departed. | [Chaos Labs departure post](https://governance.aave.com/t/chaos-labs-is-leaving-aave/24386) |
| BGD Labs | inbound | deprecated | n.a. | BGD Labs acted as Aave technical service provider, including on the Chainlink SVR deployment and Safety Module upgrade, and departed before Chaos Labs. | [Chaos Labs departure post](https://governance.aave.com/t/chaos-labs-is-leaving-aave/24386) |
| Aave Chan Initiative | inbound | deprecated | n.a. | ACI ran the Merit and Frontier programmes for the DAO and departed as a service provider ahead of Chaos Labs. | [Chaos Labs departure post](https://governance.aave.com/t/chaos-labs-is-leaving-aave/24386) |
| Chaos Labs and LlamaRisk (Horizon) | inbound | active | 2025 | Both firms are the named risk managers for the Aave Horizon RWA market. | [Aave Horizon launch](https://aave.com/blog/horizon-launch) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| CoW Swap | inbound | active | 12-2025 | CoW Swap powers the swap experience on the aave.com front end. | [Aave governance thread](https://governance.aave.com/t/aave-cowswap-integration-tokenholder-questions/23530) |
| Merkl | inbound | active | 12-2025 | Merkl incentives tooling is part of the Aave Labs and CoW Swap integration scope. | [Aave governance thread](https://governance.aave.com/t/aave-cowswap-integration-tokenholder-questions/23530) |

*No evidenced relationships found for: Grant, investment or backer. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

## Compound Finance

Slug `compound` · Sector Credit · Tag Lending · 32 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Morpho | outbound | active | 03-2025 | Compound Blue, launched 13 March 2025, runs Compound branded lending on Polygon using Morpho infrastructure and passed 20M dollars of TVL in its first week. | [Morpho forum MIP-99](https://forum.morpho.org/t/mip-99-phase-2-frontend-for-compound-morpho-polygon-collaboration/1633) |
| Polygon | mutual | active | 03-2025 | Polygon PoS is the chain hosting the Compound and Morpho collaboration. | [Morpho forum MIP-99](https://forum.morpho.org/t/mip-99-phase-2-frontend-for-compound-morpho-polygon-collaboration/1633) |
| Office Supply Ventures LLC (Paperclip Labs) | inbound | active | 03-2025 | An affiliate of Paperclip Labs is the technology partner delivering the compound.blue front end. | [Morpho forum MIP-99](https://forum.morpho.org/t/mip-99-phase-2-frontend-for-compound-morpho-polygon-collaboration/1633) |
| Whisk | inbound | active | 03-2025 | Whisk provides data infrastructure for the Compound Blue front end. | [Morpho forum MIP-99](https://forum.morpho.org/t/mip-99-phase-2-frontend-for-compound-morpho-polygon-collaboration/1633) |
| CometWrapper | inbound | active | 2023 | CometWrapper is a Compound Grants Program project that received an OpenZeppelin audit under the DAO security partnership. | [OpenZeppelin 2023 review](https://www.comp.xyz/t/openzeppelin-security-partnership-2023-year-in-review/4852) |
| Wido | inbound | active | 2023 | Wido is a Compound Grants Program project audited by OpenZeppelin in 2023. | [OpenZeppelin 2023 review](https://www.comp.xyz/t/openzeppelin-security-partnership-2023-year-in-review/4852) |
| Tally | inbound | active | 2023 | OpenZeppelin refactored Compound governance monitoring to use the Tally API after the Compound v2 API was deprecated. | [OpenZeppelin 2023 review](https://www.comp.xyz/t/openzeppelin-security-partnership-2023-year-in-review/4852) |
| Aera | inbound | active | 09-2025 | Gauntlet runs Compound treasury operations non custodially through Aera under the Year 5 partnership. | [Compound forum Gauntlet Year 5](https://www.comp.xyz/t/compound-gauntlet-year-5-partnership/7200) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink | inbound | active | n.a. | Comet price feed contracts import the Chainlink AggregatorV3Interface, and the mainnet USDC market configuration points at Chainlink feed addresses. | [Comet ScalingPriceFeed source](https://raw.githubusercontent.com/compound-finance/comet/main/contracts/pricefeeds/ScalingPriceFeed.sol) |
| Chainlink (mainnet USDC market) | inbound | active | n.a. | The mainnet USDC Comet configuration file lists Chainlink price feed addresses for each collateral asset. | [Comet mainnet USDC configuration](https://raw.githubusercontent.com/compound-finance/comet/main/deployments/mainnet/usdc/configuration.json) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum, Arbitrum, Base, OP Mainnet, Polygon, Mantle, Unichain, Ronin, Scroll, Linea | outbound | active | n.a. | DefiLlama lists Compound Finance deployments on these ten networks. | [DefiLlama Compound](https://defillama.com/protocol/compound-finance) |
| Comet deployment directory | outbound | active | n.a. | The Comet repository deployments directory confirms the same network set at the contract level. | [Comet deployments](https://github.com/compound-finance/comet/tree/main/deployments) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| S&P Global Ratings | inbound | deprecated | 05-2022 | S&P Global Ratings assigned Compound Treasury a B- credit rating, the first such rating for an institutional DeFi offering. | [Compound Digest](https://compound.substack.com/p/defi-state-of-the-union-recap-treasury) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| OpenZeppelin | inbound | active | 2021 | OpenZeppelin has been Compound DAO's security partner for audits, advisory and monitoring, completing 13 reviews in 2023 alone. | [OpenZeppelin 2023 review](https://www.comp.xyz/t/openzeppelin-security-partnership-2023-year-in-review/4852) |
| OpenZeppelin (Compound III) | inbound | active | 06-2022 | OpenZeppelin delivered the Compound III (Comet) protocol audit on 14 June 2022 under the security partnership. | [OpenZeppelin Compound III audit](https://www.openzeppelin.com/news/compound-iii-audit) |
| ChainSecurity | inbound | active | 05-2022 | ChainSecurity audited Compound Comet with a report dated 30 May 2022, and is listed as an auditor in the Compound docs. | [ChainSecurity Comet report](https://reports.chainsecurity.com/Compound/ChainSecurity_Compound_Comet_Audit.pdf) |
| Compound documentation auditor list | inbound | active | n.a. | Compound documentation names OpenZeppelin and ChainSecurity as protocol auditors. | [Compound docs](https://docs.compound.finance/) |
| SEAL 911 | mutual | active | 2023 | OpenZeppelin ran a SEAL Chaos incident response drill with the Compound Pause Guardian multisig. | [OpenZeppelin 2023 review](https://www.comp.xyz/t/openzeppelin-security-partnership-2023-year-in-review/4852) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Gauntlet | inbound | active | 09-2025 | Gauntlet's Year 5 risk management partnership runs 28 September 2025 to 28 September 2026 for 2.3M dollars, covering up to 50 Comet deployments with a 30 percent insolvency refund. | [Compound forum Gauntlet Year 5](https://www.comp.xyz/t/compound-gauntlet-year-5-partnership/7200) |
| Compound Foundation | mutual | active | 2025 | The Gauntlet Year 5 mandate is aligned with the Compound Foundation, whose formation was also central to the growth programme debate. | [Compound forum Gauntlet Year 5](https://www.comp.xyz/t/compound-gauntlet-year-5-partnership/7200) |
| AlphaGrowth | inbound | active | 05-2025 | AlphaGrowth ran the Compound Growth Program and received an interim two month extension from 1 May to 1 July 2025 for 340,000 USDC. | [Compound growth program extension](https://www.comp.xyz/t/compound-growth-program-interim-extension/6677) |
| Gauntlet (Compound Blue vaults) | inbound | active | 2025 | Gauntlet manages the Compound Blue vaults created in the Morpho and Polygon collaboration. | [Compound forum vault updates](https://www.comp.xyz/t/gauntlet-compound-x-morpho-x-polygon-vault-management-updates/6554) |
| Sky | inbound | active | 2025 | The Sky team committed to send incentives to the Compound Growth Program on a rolling basis. | [Compound growth program extension](https://www.comp.xyz/t/compound-growth-program-interim-extension/6677) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Andreessen Horowitz | inbound | active | 11-2019 | a16z backed Compound's 25M dollar Series A and its earlier 8.2M dollar 2018 seed round. | [The Block](https://www.theblock.co/post/47158/a16z-paradigm-back-compounds-25m-series-a-to-integrate-with-crypto-exchanges-and-brokers) |
| Paradigm | inbound | active | 11-2019 | Paradigm participated in the 25M dollar Series A. | [The Block](https://www.theblock.co/post/47158/a16z-paradigm-back-compounds-25m-series-a-to-integrate-with-crypto-exchanges-and-brokers) |
| Bain Capital Ventures | inbound | active | 11-2019 | Bain Capital Ventures invested in both the seed and Series A rounds. | [The Block](https://www.theblock.co/post/47158/a16z-paradigm-back-compounds-25m-series-a-to-integrate-with-crypto-exchanges-and-brokers) |
| Polychain Capital | inbound | active | 11-2019 | Polychain Capital invested in both the seed and Series A rounds. | [The Block](https://www.theblock.co/post/47158/a16z-paradigm-back-compounds-25m-series-a-to-integrate-with-crypto-exchanges-and-brokers) |
| Mantle | inbound | active | 2025 | The Compound Growth Program holds roughly 1M dollars of MNT incentives from Mantle. | [Compound growth program extension](https://www.comp.xyz/t/compound-growth-program-interim-extension/6677) |
| Optimism | inbound | active | n.a. | Optimism is named as a source of remaining incentives held by the growth programme. | [Compound growth program extension](https://www.comp.xyz/t/compound-growth-program-interim-extension/6677) |
| Ronin | inbound | announced | 2025 | Incoming incentives from the Ronin blockchain were disclosed in the interim extension post. | [Compound growth program extension](https://www.comp.xyz/t/compound-growth-program-interim-extension/6677) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| compound.blue | outbound | active | 03-2025 | The compound.blue front end distributes Compound branded lending on Polygon and was built by the Paperclip Labs affiliate. | [Morpho forum MIP-99](https://forum.morpho.org/t/mip-99-phase-2-frontend-for-compound-morpho-polygon-collaboration/1633) |
| Woof | inbound | active | 2025 | Woof was engaged by the growth programme to code planned new Comet deployments. | [Compound growth program extension](https://www.comp.xyz/t/compound-growth-program-interim-extension/6677) |

*No evidenced relationships found for: Liquidity provider, Custody. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

## Morpho

Slug `morpho` · Sector Credit · Tag Lending · 59 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Compound | inbound | active | 03-2025 | Compound chose Morpho as its infrastructure on Polygon PoS, operated by Gauntlet with front end support from Paperclip Labs. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| Seamless | inbound | active | 03-2025 | Seamless migrated all liquidity from its Aave v3 fork to Morpho, which now powers both Earn and Borrow on Seamless. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| Moonwell | inbound | active | 03-2025 | Moonwell launched isolated markets and a Flagship USDC vault on OP Mainnet powered by Morpho. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| Index Coop | inbound | active | 2025 | Index Coop migrated its hyETH strategy to Morpho and is building a Leverage Suite on it. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| Maple (syrupUSDC) | mutual | active | 03-2025 | A syrupUSDC/USDC market launched on Morpho, extending syrupUSDC beyond native yield. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| Midas | mutual | active | 03-2025 | Midas launched an mMEV/USDC market on Morpho for mMEV backed USDC borrowing. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| TAC | mutual | announced | 03-2025 | TAC is developing Morpho powered mini apps to bring Morpho to TON and Telegram. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| Send Earn | inbound | active | 03-2025 | Send Earn builds onchain savings on Morpho powered Moonwell vaults. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| Veda | inbound | active | 2025 | Kraken DeFi Earn routes deposits through Veda vaults which allocate into Morpho vaults. | [Morpho Kraken story](https://morpho.org/stories/kraken/) |
| Sky | mutual | active | n.a. | Sky deployed five savings vaults through sky.money on Morpho, and sUSDS backs over 325M dollars of Morpho lending markets. | [Morpho Sky story](https://morpho.org/stories/sky/) |
| Spiko | mutual | active | 2025 | Spiko issued USTBL and EUTBL used as collateral in the SG Forge markets on Morpho. | [Morpho SG Forge story](https://morpho.org/stories/societe-generale/) |
| Uniswap | mutual | active | 2025 | Uniswap is the DEX liquidity venue named alongside Morpho in the SG Forge onchain stack. | [Morpho SG Forge story](https://morpho.org/stories/societe-generale/) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Flowdesk | inbound | active | 2025 | Flowdesk is the named market maker in the SG Forge deployment on Morpho. | [Morpho SG Forge story](https://morpho.org/stories/societe-generale/) |
| Keyrock | mutual | active | n.a. | Keyrock is featured as a Morpho ecosystem partner in the stories directory. | [Morpho stories](https://morpho.org/stories/) |
| Sky (vault deposits) | inbound | active | n.a. | Sky vaults on Morpho hold over 300M dollars of deposits and over 400M dollars of Sky native assets are used as collateral. | [Morpho Sky story](https://morpho.org/stories/sky/) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink | inbound | active | n.a. | Morpho is oracle agnostic and its reference implementation MorphoChainlinkOracleV2 reads Chainlink compliant feeds. | [Morpho oracle docs](https://docs.morpho.org/learn/concepts/oracle/) |
| RedStone | inbound | active | n.a. | RedStone is listed among oracle providers usable with Morpho markets. | [Morpho oracle docs](https://docs.morpho.org/learn/concepts/oracle/) |
| Pyth | inbound | active | n.a. | Pyth is listed among oracle providers usable with Morpho markets. | [Morpho oracle docs](https://docs.morpho.org/learn/concepts/oracle/) |
| Chronicle | inbound | active | n.a. | Chronicle is listed among oracle providers usable with Morpho markets. | [Morpho oracle docs](https://docs.morpho.org/learn/concepts/oracle/) |
| API3 | inbound | active | n.a. | API3 is listed among oracle providers usable with Morpho markets. | [Morpho oracle docs](https://docs.morpho.org/learn/concepts/oracle/) |

### Custody

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Anchorage Digital | mutual | active | n.a. | Anchorage Digital is featured as a Morpho partner in the official stories directory. | [Morpho stories](https://morpho.org/stories/) |
| Ledger | mutual | active | 05-2025 | Ledger integrated Morpho into the Ledger Wallet Earn dashboard as the default USDC and USDT solution via Kiln's DeFi, with over 100M dollars deposited since launch. | [Morpho Ledger story](https://morpho.org/stories/ledger/) |
| Safe | mutual | active | n.a. | Safe is named as an integration in the SG Forge deployment and is featured in the Morpho stories directory. | [Morpho SG Forge story](https://morpho.org/stories/societe-generale/) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum, Base, Arbitrum, OP Mainnet, Polygon, Unichain, Hyperliquid L1, Monad, Katana, Flare, World Chain, Stable, Sei, Tempo, Plume, Citrea, Etherlink, Hemi, Celo, TAC, Kaia, Abstract, Lisk, Soneium, Fraxtal, Corn, Sonic, BNB Chain, 0G, Scroll, Botanix, Ink, Gnosis, Zircuit, Bitlayer, Linea, Mode | outbound | active | n.a. | DefiLlama lists Morpho deployments across these networks. | [DefiLlama Morpho](https://defillama.com/protocol/morpho) |
| Cronos | outbound | announced | Q4 2025 | Morpho is being deployed on Cronos as part of the Crypto.com partnership. | [Morpho Crypto.com story](https://morpho.org/stories/crypto-com/) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Société Générale FORGE | mutual | active | 2025 | SG Forge selected Morpho as its lending network for EURCV and USDCV, with ETH, BTC, USTBL and EUTBL accepted as collateral. | [Morpho SG Forge story](https://morpho.org/stories/societe-generale/) |
| Coinbase | mutual | active | 01-2025 | Coinbase launched USDC crypto backed loans in its main app on Base, powered by Morpho, initially collateralized by bitcoin. | [Morpho Coinbase blog](https://morpho.org/blog/coinbase-launches-crypto-backed-loans-powered-by-morpho/) |
| Crypto.com | mutual | active | Q4 2025 | Crypto.com embedded Cronos USDC vaults curated by Steakhouse into its DeFi Lending product in the app and exchange. | [Morpho Crypto.com story](https://morpho.org/stories/crypto-com/) |
| Kraken | mutual | active | 2025 | Kraken DeFi Earn routes over 200M dollars into Morpho vaults, with a Bitcoin Vault taking 150M dollars in its first week. | [Morpho Kraken story](https://morpho.org/stories/kraken/) |
| Apollo, Gemini, Bitget, Binance, OKX, Wirex, Lemon, Deblock, SafePal, Galaxy, Bitpanda | mutual | active | n.a. | These institutions and platforms are featured as Morpho partners in the official stories directory. | [Morpho stories](https://morpho.org/stories/) |
| TruBit | mutual | active | 03-2025 | LATAM exchange TruBit integrated Morpho USDC vaults into its Earn+ product. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Spearbit | inbound | active | 10-2023 | Spearbit has run managed reviews of Morpho Blue, Vault V1, Vault V1.1, periphery contracts and Vault V2. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| OpenZeppelin | inbound | active | 10-2023 | OpenZeppelin audited Morpho Blue in October 2023, the periphery in November 2023 and the Vault V1.1 diff in November 2024. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| Cantina | inbound | active | 11-2023 | Cantina ran competitions on Morpho Blue, Vault V1 and Vault V2. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| Certora | inbound | active | 12-2025 | Certora provides formal verification and audited Vault V2 adapters and the adapters registry. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| ChainSecurity | inbound | active | 09-2025 | ChainSecurity audited Morpho Vault V2 in September 2025. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| Blackthorn | inbound | active | 09-2025 | Blackthorn audited Vault V2 and the MarketV1 adapter. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| Zellic | inbound | active | 07-2025 | Zellic audited Morpho Vault V2. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| ABDK Consulting | inbound | active | 11-2024 | ABDK reviewed the Morpho Blue pre liquidation periphery. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| Omniscia | inbound | active | 06-2022 | Omniscia audited the MORPHO token contract. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| Lexfo | inbound | active | 05-2023 | Lexfo reviewed Morpho related DNS and GitHub infrastructure. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| Securing | inbound | active | 04-2022 | Securing audited the beta Morpho Association dApp. | [Morpho audits](https://docs.morpho.org/learn/resources/audits/) |
| Cantina and OpenZeppelin (Blue repo) | inbound | active | 2023 | The morpho-blue and metamorpho GitHub audit directories hold the OpenZeppelin and Cantina reports for the core protocol. | [morpho-blue audits](https://github.com/morpho-org/morpho-blue/tree/main/audits) |
| Cantina (oracle adapters) | inbound | active | 03-2024 | Cantina managed reviews cover the wstETH-ETH adapter and oracle vault loan asset contracts. | [morpho-blue-oracles audits](https://github.com/morpho-org/morpho-blue-oracles/tree/main/audits) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Gauntlet | inbound | active | 02-2024 | Gauntlet joined Morpho to curate MetaMorpho lending vaults on Morpho Blue. | [Gauntlet joins Morpho](https://morpho.org/blog/gauntlet-joins-morpho/) |
| Steakhouse Financial | inbound | active | 03-2025 | Steakhouse curates Morpho vaults and reached 500M dollars of TVL across them, and curates the Cronos USDC vaults for Crypto.com. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| MEV Capital | inbound | active | 2025 | MEV Capital is the curator of the SG Forge markets on Morpho. | [Morpho SG Forge story](https://morpho.org/stories/societe-generale/) |
| Sentora | inbound | active | 2025 | Sentora provides strategy design and risk curation for the Kraken DeFi Earn vaults built on Morpho. | [Morpho Kraken story](https://morpho.org/stories/kraken/) |
| Credora | inbound | active | 03-2025 | Credora powers the risk ratings shown in Morpho vault risk disclosures. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |
| Sky (curator) | mutual | active | n.a. | Sky became a vault curator on Morpho, deploying five savings vaults through sky.money. | [Morpho Sky story](https://morpho.org/stories/sky/) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Paradigm, a16z crypto, Ribbit Capital | inbound | active | 06-2026 | These three firms co led a 175M dollar token purchase at a valuation of up to 2B dollars. | [The Block](https://www.theblock.co/post/404111/morpho-raises-175m-paradigm-a16z-crypto-ribbit-capital) |
| Ribbit Capital (2024) | inbound | active | 2024 | Ribbit led Morpho's prior 50M dollar strategic round in 2024. | [The Block](https://www.theblock.co/post/404111/morpho-raises-175m-paradigm-a16z-crypto-ribbit-capital) |
| Apollo Funds, Circle Ventures, VanEck, Ledger Cathay, Variant, Wintermute Ventures, Prelude, IOSG, HashKey, Mirana, NJJ Capital, SBI Group, Bpifrance | inbound | active | 06-2026 | These investors participated in the 175M dollar round. | [The Block](https://www.theblock.co/post/404111/morpho-raises-175m-paradigm-a16z-crypto-ribbit-capital) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Coinbase app | outbound | active | 01-2025 | Users borrow USDC against bitcoin directly in the Coinbase app, with Morpho as the underlying protocol on Base. | [Morpho Coinbase blog](https://morpho.org/blog/coinbase-launches-crypto-backed-loans-powered-by-morpho/) |
| Ledger Wallet | outbound | active | 05-2025 | Morpho yield is surfaced inside the Ledger Wallet Earn dashboard for USDC and USDT on Ethereum. | [Morpho Ledger story](https://morpho.org/stories/ledger/) |
| Kraken app | outbound | active | 2025 | Kraken DeFi Earn exposes Morpho yield in the Kraken app without users managing keys or signing transactions. | [Morpho Kraken story](https://morpho.org/stories/kraken/) |
| Crypto.com app and exchange | outbound | active | Q4 2025 | Cronos USDC vaults are embedded in the Crypto.com DeFi Lending product across app and exchange. | [Morpho Crypto.com story](https://morpho.org/stories/crypto-com/) |
| Trust Wallet, World, Farcaster, Privy, Jumper, Gemini Wallet, SafePal | outbound | active | n.a. | These wallets and front ends are featured as Morpho distribution partners in the official stories directory. | [Morpho stories](https://morpho.org/stories/) |
| Morpho Frame | outbound | active | 03-2025 | Morpho Frame enables in frame MORPHO reward claims on Farcaster. | [The Morpho Effect March 2025](https://morpho.org/blog/the-morpho-effect-march-2025/) |

## Radiant Capital

Slug `radiant` · Sector Credit · Tag Lending · 28 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| LayerZero | inbound | deprecated | 2022 | Radiant's cross chain interoperability runs on LayerZero, whose team also peer reviewed Radiant smart contracts. | [Radiant integrations docs](https://docs.radiant.capital/radiant/other-info/integrations) |
| Stargate | inbound | deprecated | 2022 | Radiant v1 leveraged Stargate's stable router interface for cross chain transfers. | [Radiant v1 docs](https://docs.radiant.capital/radiant/radiantv1) |
| Lido | mutual | deprecated | n.a. | Radiant partnered with Lido to enable lending and borrowing of wstETH in the Arbitrum money market. | [Radiant integrations docs](https://docs.radiant.capital/radiant/other-info/integrations) |
| Balancer | mutual | deprecated | 11-2023 | Balancer is listed as a Radiant integration and supported the Ethereum mainnet launch alongside LayerZero and Stargate. | [Radiant integrations docs](https://docs.radiant.capital/radiant/other-info/integrations) |
| Silo Finance | mutual | deprecated | 11-2023 | Radiant DAO worked with Silo Finance to create an RDNT lend and borrow market on Arbitrum, funded with 50,000 ARB. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |
| Camelot | mutual | deprecated | 11-2023 | Camelot v3 hosted the incentivized RDNT/ETH liquidity pool under the STIP programme. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |
| Dopex | mutual | deprecated | 11-2023 | Dopex v2 was paired with Camelot in the RDNT/ETH liquidity incentive initiative. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |
| PlutusDAO | mutual | deprecated | 11-2023 | PlutusDAO's plsRDNT product received a dedicated ARB incentive allocation. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |
| GMX | mutual | deprecated | 11-2023 | GMX v2 GM BTC and ETH depositors on Radiant were the target of a dedicated ARB airdrop initiative. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |
| Gamma Strategies | inbound | deprecated | 11-2023 | Gamma Strategies vaults were used for automated v3 liquidity strategies in the incentive distribution. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |
| Angle Merkl | inbound | deprecated | 11-2023 | Angle's Merkl distribution contract was the mechanism for manual v3 liquidity incentives. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink | inbound | deprecated | 02-2023 | Radiant integrated Chainlink USD price feeds on Arbitrum mainnet for BTC, DAI, ETH, USDC, USDT and BNB, with BNB Chain to follow. | [Radiant Chainlink post](https://medium.com/@RadiantCapital/radiant-capital-integrates-chainlink-price-feeds-to-help-secure-decentralized-money-market-902f845ce07) |
| Chainlink (working relationship) | mutual | deprecated | n.a. | Radiant documentation describes a working relationship with the Chainlink team on oracle price feed security. | [Radiant integrations docs](https://docs.radiant.capital/radiant/other-info/integrations) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Arbitrum, Ethereum, Base, BNB Chain | outbound | deprecated | n.a. | DefiLlama lists Radiant deployments on Arbitrum, Ethereum, Base and BSC. | [DefiLlama Radiant](https://defillama.com/protocol/radiant) |
| Ethereum, Arbitrum, Base, Binance Chain (docs) | outbound | deprecated | n.a. | Radiant documentation names the same four networks. | [Radiant v1 docs](https://docs.radiant.capital/radiant/radiantv1) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| OpenZeppelin | inbound | deprecated | n.a. | OpenZeppelin is one of four named auditors of Radiant v2. | [Radiant audits docs](https://docs.radiant.capital/radiant/contracts-and-security/audits) |
| BlockSec | inbound | deprecated | n.a. | BlockSec is a named Radiant auditor. | [Radiant audits docs](https://docs.radiant.capital/radiant/contracts-and-security/audits) |
| Zokyo | inbound | deprecated | n.a. | Zokyo is a named Radiant auditor. | [Radiant audits docs](https://docs.radiant.capital/radiant/contracts-and-security/audits) |
| PeckShield | inbound | deprecated | n.a. | PeckShield is a named Radiant auditor. | [Radiant audits docs](https://docs.radiant.capital/radiant/contracts-and-security/audits) |
| Immunefi | inbound | deprecated | n.a. | Radiant ran an ongoing Immunefi bug bounty programme alongside its v2 audits. | [Radiant v1 docs](https://docs.radiant.capital/radiant/radiantv1) |
| Mandiant | inbound | active | 10-2024 | Radiant retained Mandiant for on device forensics in the investigation of the 16 October 2024 exploit. | [Radiant incident update](https://medium.com/@RadiantCapital/radiant-capital-incident-update-e56d8c23829e) |
| zeroShadow | inbound | active | 10-2024 | zeroShadow was engaged by the Radiant DAO for onchain asset tracking after the exploit. | [Radiant incident update](https://medium.com/@RadiantCapital/radiant-capital-incident-update-e56d8c23829e) |
| Hypernative | inbound | active | 10-2024 | Hypernative was engaged by the Radiant DAO for onchain asset tracking after the exploit. | [Radiant incident update](https://medium.com/@RadiantCapital/radiant-capital-incident-update-e56d8c23829e) |
| SEAL 911 | inbound | active | 10-2024 | SEAL 911 was enlisted for additional incident response support. | [Radiant incident update](https://medium.com/@RadiantCapital/radiant-capital-incident-update-e56d8c23829e) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Arbitrum DAO (STIP) | inbound | deprecated | 11-2023 | Radiant received STIP disbursements from the Arbitrum DAO and reported on their use bi weekly, including a 407,435 ARB disbursement. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |
| Open Block Labs | inbound | deprecated | 11-2023 | Open Block Labs is thanked as facilitator of the Arbitrum incentives reporting process for Radiant. | [Arbitrum forum STIP updates](https://forum.arbitrum.foundation/t/radiant-stip-program-updates/19612) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Offchain Labs | inbound | deprecated | n.a. | Radiant was selected by Offchain Labs to be listed on the Arbitrum Official Portal. | [Radiant integrations docs](https://docs.radiant.capital/radiant/other-info/integrations) |
| Radiant front end (wind down) | outbound | deprecated | 06-2026 | The Radiant website and front end remain live through the end of 2026 with borrowing disabled and withdrawals still possible. | [BeInCrypto](https://beincrypto.com/radiant-capital-winding-down-50-million-hack/) |

*No evidenced relationships found for: Liquidity provider, Custody, Institutional or TradFi, Governance or DAO. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

## Spark

Slug `spark` · Sector Credit · Tag Lending · 43 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Aave v3 | outbound | active | n.a. | The Spark Liquidity Layer allocates into AAVE compatible lending markets including SparkLend and Aave v3. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Morpho | outbound | active | n.a. | The SLL deposits into ERC-4626 vaults including Spark curated Morpho vaults. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Curve | outbound | active | n.a. | The SLL adds and removes liquidity and swaps in 1:1 Curve stableswap pools. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Uniswap v4 | outbound | active | n.a. | The SLL mints and manages positions in hookless 1:1 Uniswap v4 stablecoin pools within governance set tick limits. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Ethena | outbound | active | n.a. | The SLL mints and burns USDe, manages delegated signers for Ethena and handles sUSDe cooldown and unstaking. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| EtherFi | outbound | active | n.a. | The SLL stakes weETH and handles EtherFi withdrawal requests and claims via a dedicated module. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Lido | outbound | active | n.a. | The SLL stakes wstETH and processes withdrawals through the Lido withdrawal queue. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Maple Finance | outbound | active | n.a. | The SLL submits and cancels Maple Finance redemption requests. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Circle CCTP | inbound | active | n.a. | USDC bridging inside the SLL is executed through Circle CCTP. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| LayerZero | inbound | active | n.a. | Per asset OFT bridging in the SLL is handled by LayerZero. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Sky allocation system | mutual | active | n.a. | USDS minting and burning and USDS to DAI conversion inside the SLL run through the Sky allocation system. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Aave v3 codebase (SparkLend) | inbound | active | 2023 | The SparkLend core repository ships the original Aave v3 audit reports, evidencing that SparkLend is built on the Aave v3 codebase. | [sparklend-v1-core audits](https://github.com/sparkdotfi/sparklend-v1-core/tree/master/audits) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Sky | inbound | active | n.a. | Spark sources wholesale liquidity from Sky at the Sky base rate and reinvests it, retaining the net margin. | [Blockworks token transparency filing](https://blockworks.com/token-transparency/filing/spark) |
| OTC desks | mutual | active | n.a. | The SLL can trade with OTC desks through dedicated OTCBuffer contracts. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Maple, Aave, Morpho, Curve, PayPal, Anchorage | outbound | active | n.a. | DefiLlama breaks out Spark revenue by yield source across these venues. | [DefiLlama Spark](https://defillama.com/protocol/spark) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chronicle | inbound | active | n.a. | Chronicle is one of three oracle providers powering SparkLend price feeds. | [SparkLend oracle docs](https://docs.spark.fi/user-guides/using-sparklend/oracles) |
| Chainlink | inbound | active | n.a. | Chainlink feeds are used by SparkLend, including in redundant multi provider setups. | [SparkLend oracle docs](https://docs.spark.fi/user-guides/using-sparklend/oracles) |
| RedStone | inbound | active | n.a. | RedStone is the third oracle provider used by SparkLend, with a Uniswap TWAP as final fallback. | [SparkLend oracle docs](https://docs.spark.fi/user-guides/using-sparklend/oracles) |
| Chronicle (RWA NAV) | inbound | active | 04-2025 | Chronicle was named backing oracle provider for all Tokenization Grand Prix winners, writing custom plugins for each fund's custodial setup. | [The Block](https://www.theblock.co/post/350614/chronicle-tapped-as-oracle-provider-for-winners-of-the-1-billion-sparkdao-tokenization-grand-prix) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum, Arbitrum, Base, OP Mainnet, Unichain, Gnosis, Avalanche | outbound | active | n.a. | DefiLlama lists Spark deployments across these seven networks. | [DefiLlama Spark](https://defillama.com/protocol/spark) |
| Ethereum, Base, Arbitrum, Optimism, Unichain, Avalanche, Robinhood chain | outbound | active | n.a. | The Spark Liquidity Layer documentation lists these supported networks, including a Robinhood network. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| BlackRock and Securitize | mutual | active | 03-2025 | The BUIDL fund, managed by BlackRock and tokenized by Securitize, won a 500M dollar allocation in the Spark Tokenization Grand Prix. | [Spark Grand Prix results](https://paragraph.com/@spark-11/spark-tokenization-grand-prix-winners-the-race-is-on) |
| Superstate | mutual | active | 03-2025 | Superstate's USTB short duration Treasury fund won a 300M dollar allocation. | [Spark Grand Prix results](https://paragraph.com/@spark-11/spark-tokenization-grand-prix-winners-the-race-is-on) |
| Centrifuge, Anemoy and Janus Henderson | mutual | active | 03-2025 | The JTRSY fund won a 200M dollar allocation, with Janus Henderson acting as sub advisor. | [Spark Grand Prix results](https://paragraph.com/@spark-11/spark-tokenization-grand-prix-winners-the-race-is-on) |
| Superstate USTB (SLL route) | outbound | active | n.a. | The Spark Liquidity Layer has a dedicated Superstate USTB subscription route. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Cantina | inbound | active | 09-2024 | Cantina has audited the Spark PSM, Spark Vaults and every released version of the Spark ALM Controller. | [spark-alm-controller audits](https://github.com/sparkdotfi/spark-alm-controller/tree/master/audits) |
| ChainSecurity | inbound | active | 10-2024 | ChainSecurity has audited the Spark PSM, Spark Vaults, SparkLend core updates and the ALM Controller versions. | [spark-alm-controller audits](https://github.com/sparkdotfi/spark-alm-controller/tree/master/audits) |
| Certora | inbound | active | 2025 | Certora audited ALM Controller versions 1.8.0 and 1.9.0. | [spark-alm-controller audits](https://github.com/sparkdotfi/spark-alm-controller/tree/master/audits) |
| ChainSecurity (SparkLend core) | inbound | active | n.a. | A ChainSecurity SparkLend Core Updates report sits alongside the inherited Aave v3 audits in the SparkLend core repository. | [sparklend-v1-core audits](https://github.com/sparkdotfi/sparklend-v1-core/tree/master/audits) |
| Cantina and ChainSecurity (PSM) | inbound | active | 09-2024 | The Spark PSM repository holds Cantina reports from September and October 2024 and a ChainSecurity report from October 2024. | [spark-psm audits](https://github.com/sparkdotfi/spark-psm/tree/master/audits) |
| ChainSecurity and Cantina (Spark Vaults) | inbound | active | 01-2025 | Spark Vaults were audited by ChainSecurity in January 2025 and Cantina in February 2025. | [spark-vaults audits](https://github.com/sparkdotfi/spark-vaults/tree/master/audits) |
| OpenZeppelin, Trail of Bits, PeckShield, Sigma Prime, ABDK (inherited) | inbound | active | 2021 | The SparkLend core repository retains the original Aave v3 audit reports from these five firms. | [sparklend-v1-core audits](https://github.com/sparkdotfi/sparklend-v1-core/tree/master/audits) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Sky (formerly MakerDAO) | mutual | active | 2023 | Spark was incubated by the MakerDAO and Sky ecosystem, and the Spark DAO treasury is controlled by SPK governance with execution managed by SKY holders. | [Blockworks token transparency filing](https://blockworks.com/token-transparency/filing/spark) |
| Spark Foundation | mutual | active | 06-2025 | The Cayman based Spark Foundation stewards the protocol and received 2.4M USDS from Spark DAO between June and September. | [Blockworks token transparency filing](https://blockworks.com/token-transparency/filing/spark) |
| Phoenix Labs | inbound | active | 2023 | Phoenix Labs is the private service provider giving technical and operational support to the Spark Foundation. | [Blockworks token transparency filing](https://blockworks.com/token-transparency/filing/spark) |
| Steakhouse Financial | inbound | active | 2024 | Steakhouse Financial reviewed the 39 Tokenization Grand Prix applications and selected the winners. | [Spark Grand Prix results](https://paragraph.com/@spark-11/spark-tokenization-grand-prix-winners-the-race-is-on) |
| Block Analitica | inbound | active | n.a. | Spark's public SparkLend dashboard is hosted by Block Analitica, which is named as a Spark risk dashboard provider in the token transparency filing. | [Blockworks token transparency filing](https://blockworks.com/token-transparency/filing/spark) |
| Sky governance | inbound | active | 04-2025 | Final allocation of the 1B dollar Grand Prix was funded by Sky and subject to a Sky governance vote scheduled for 3 April 2025. | [Spark Grand Prix results](https://paragraph.com/@spark-11/spark-tokenization-grand-prix-winners-the-race-is-on) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Sky DAO | inbound | active | 06-2025 | 65 percent of the 10 billion SPK supply is allocated to Sky farming, with those tokens held in the Sky DAO treasury. | [Blockworks token transparency filing](https://blockworks.com/token-transparency/filing/spark) |
| Unnamed market makers | inbound | active | n.a. | SPK Company Ltd has entered agreements with market makers for CeFi and DeFi liquidity, with no names disclosed. | [Blockworks token transparency filing](https://blockworks.com/token-transparency/filing/spark) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| sky.money | mutual | active | n.a. | Spark Savings is powered by the Sky savings rate and sUSDS, distributed to end users and partners with Spark earning a rate spread. | [Blockworks token transparency filing](https://blockworks.com/token-transparency/filing/spark) |
| SPK farm | outbound | active | n.a. | The SLL includes SPK farm staking and reward claiming routes. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |
| Morpho (Spark curated vaults) | outbound | active | n.a. | Spark distributes liquidity to end users through Spark curated Morpho vaults. | [Spark Liquidity Layer docs](https://docs.spark.fi/products/spark-liquidity-layer) |

*No evidenced relationships found for: Custody. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

# Tag: Leveraged Yield

## Extra Finance

Slug `extra-finance` · Sector Credit · Tag Leveraged Yield · 30 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Velodrome | outbound | active | 2023 | Extra Finance vault contracts are tied to Velodrome liquidity pairs, with borrowed capital from the Extra lending pool supplied into those pairs. | [Extra Finance contracts repo](https://github.com/ExtraFi/extra-contracts) |
| Aerodrome | mutual | active | Aug 2023 | Extra Finance launched as a launch partner on Aerodrome and runs leveraged farming vaults on Aerodrome pairs on Base. | [Extra Finance monthly review, August 2023](https://medium.com/@ExtraFinance/extra-finance-monthly-review-august-2023-89cb00b57fba) |
| Aave (Aave V3 codebase) | outbound | active | 2024 | The XLend liquidity protocol is a fork of Aave V3. | [XLend audits and security](https://docs.extrafi.io/extrafi-xlend/security/audits-and-security) |
| Coinbase Smart Wallet | outbound | active | 2024 | XLend smart accounts are powered by Coinbase Smart Wallet infrastructure. | [XLend docs](https://docs.extrafi.io/extrafi-xlend) |
| LayerZero | outbound | active | Aug 2023 | The EXTRA token uses the LayerZero OFT standard for cross-chain transfer between OP Mainnet and Base. | [Extra Finance monthly review, August 2023](https://medium.com/@ExtraFinance/extra-finance-monthly-review-august-2023-89cb00b57fba) |
| Exactly Protocol | mutual | active | Aug 2023 | Extra Finance partnered with Exactly Protocol and listed EXA farming and lending pools. | [Extra Finance monthly review, August 2023](https://medium.com/@ExtraFinance/extra-finance-monthly-review-august-2023-89cb00b57fba) |
| Angle Protocol | outbound | active | Sep 2023 | Extra Finance listed a USDC-agEUR farming pool using Angle Protocol's agEUR. | [Extra Finance monthly review, September 2023](https://medium.com/@ExtraFinance/extra-finance-monthly-review-september-2023-bd53379cad29) |
| Tangible (wUSDR) | outbound | active | Sep 2023 | Extra Finance listed a wUSDR-USDbC farming pool using Tangible's wUSDR. | [Extra Finance monthly review, September 2023](https://medium.com/@ExtraFinance/extra-finance-monthly-review-september-2023-bd53379cad29) |
| Overnight.fi | mutual | active | Sep 2023 | Extra Finance acted as an official launch partner for Overnight.fi products. | [Extra Finance monthly review, September 2023](https://medium.com/@ExtraFinance/extra-finance-monthly-review-september-2023-bd53379cad29) |
| Berachain LYF pools (iBERA, beraETH, BYUSD, HONEY) | outbound | active | Apr 2025 | Extra Finance launched leveraged yield farming on Berachain with WETH-WBERA, WBERA-iBERA, WBTC-WBERA, WETH-beraETH and BYUSD-HONEY pools. | [Extra Finance monthly review, April 2025](https://medium.com/@ExtraFinance/extra-finance-monthly-review-april-2025-9b43ae243034) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| OKX | inbound | active | Aug 2023 | OKX integrated Extra Finance USDC and ETH lending pools into its platform. | [Extra Finance monthly review, August 2023](https://medium.com/@ExtraFinance/extra-finance-monthly-review-august-2023-89cb00b57fba) |
| Aerodrome (EXTRA liquidity) | mutual | active | 2023 | EXTRA trades against WETH in an Aerodrome pool on Base. | [GeckoTerminal EXTRA-WETH pool](https://www.geckoterminal.com/base/pools/0x84ff3b6e2046579fb2f2b891ce18ee10b5fbdbf2) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink | outbound | active | 2023 | Extra Finance aggregates Chainlink price feeds for Optimism assets and uses them as a sanity check that gates liquidations. | [Extra Finance price feed docs](https://docs.extrafi.io/extra_finance/leverage-farming/price-feed) |
| DEX AMM TWAP (Velodrome / Aerodrome pools) | outbound | active | 2023 | Extra Finance reads real-time AMM prices plus a 30 minute TWAP from the underlying DEX pools as its primary price source. | [Extra Finance price feed docs](https://docs.extrafi.io/extra_finance/leverage-farming/price-feed) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| OP Mainnet | outbound | active | 2023 | Extra Finance is deployed on OP Mainnet, its original deployment chain. | [DefiLlama Extra Finance](https://defillama.com/protocol/extra-finance) |
| Base | outbound | active | Aug 2023 | Extra Finance is deployed on Base. | [DefiLlama Extra Finance](https://defillama.com/protocol/extra-finance) |
| Berachain | outbound | active | Apr 2025 | Extra Finance launched a leveraged yield farming beta on Berachain. | [Extra Finance monthly review, April 2025](https://medium.com/@ExtraFinance/extra-finance-monthly-review-april-2025-9b43ae243034) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| PeckShield | inbound | active | May 2023 | PeckShield published an audit report on ExtraFi dated 5 May 2023. | [PeckShield ExtraFi audit report](https://github.com/peckshield/publications/tree/master/audit_reports/PeckShield-Audit-Report-ExtraFi-v1.0.pdf) |
| BlockSec | inbound | active | 2023 | BlockSec published a signed audit report on Extra Finance contracts. | [BlockSec Extra Finance audit report](https://github.com/blocksecteam/audit-reports/blob/main/solidity/blocksec_extrafinance_v1.0-signed.pdf) |
| Sherlock | inbound | active | Dec 2024 | Sherlock delivered a final Extra Finance audit report dated 1 December 2024. | [Sherlock Extra Finance audit report](https://github.com/sherlock-protocol/sherlock-reports/blob/main/audits/2024.12.01%20-%20Final%20-%20Extra%20Finance%20Audit%20Report.pdf) |
| EtherAuthority | inbound | active | Jun 2024 | EtherAuthority audited the EXTRAoft cross-chain token contract, report dated 24 June 2024. | [EtherAuthority Extra Finance audit](https://etherauthority.io/wp-content/uploads/2024/07/Extra-Finance.pdf) |
| Immunefi | mutual | active | Sep 2023 | Extra Finance runs an Immunefi bug bounty live from 8 September 2023 with a maximum payout of 100,000 USD. | [Immunefi Extra Finance program](https://immunefi.com/bug-bounty/extrafinance/information/) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| EXTRA / veEXTRA governance | inbound | active | 2023 | EXTRA is the protocol token used for vote-escrowed governance, traded on Base. | [GeckoTerminal EXTRA-WETH pool](https://www.geckoterminal.com/base/pools/0x84ff3b6e2046579fb2f2b891ce18ee10b5fbdbf2) |
| Optimism Grants Council | outbound | announced | 2023 | Extra Finance submitted "Extra Finance, Unleash L2 LST Efficiency" to the Optimism Grants Council Cycle 19 review round. | [Optimism Grants Council Cycle 19 roundup](https://gov.optimism.io/t/grants-council-cycle-19-s5-r1-preliminary-review-roundup/7812) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Optimism Foundation (bug bounty matching) | inbound | active | Sep 2023 | Optimism matched Extra Finance's Immunefi bug bounty with 52,500 OP. | [Immunefi Extra Finance program](https://immunefi.com/bug-bounty/extrafinance/information/) |
| deBridge (OP Horizon) | mutual | deprecated | 2023 | Extra Finance participated in deBridge's OP Horizon 100,000 OP campaign. | [deBridge OP Horizon announcement](https://debridge.finance/learn/blog/op-horizon-is-live/) |
| Clique (OP Red Wars) | mutual | deprecated | Jan 2024 | Extra Finance partnered with Clique for OP Red Wars Event 3 with a 2,000 OP reward pool. | [Extra Finance monthly review, January 2024](https://medium.com/@ExtraFinance/extra-finance-monthly-review-january-2024-964bf4f30b08) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Coinbase Wallet dapp directory | inbound | active | n.a. | Extra Finance is listed in the Coinbase web3 dapp directory. | [Coinbase dapp listing for Extra Finance](https://www.coinbase.com/web3/dapps/extra-finance) |
| OKX (web portal) | inbound | active | Aug 2023 | OKX surfaced Extra Finance lending pools through its own interface. | [Extra Finance monthly review, August 2023](https://medium.com/@ExtraFinance/extra-finance-monthly-review-august-2023-89cb00b57fba) |
| DefiLlama | inbound | active | n.a. | Extra Finance is tracked as a listed protocol on DefiLlama. | [DefiLlama Extra Finance](https://defillama.com/protocol/extra-finance) |

*No evidenced relationships found for: Custody, Institutional or TradFi. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

## Fluid

Slug `fluid` · Sector Credit · Tag Leveraged Yield · 46 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Aave V3 | outbound | active | n.a. | Fluid Lite routes leveraged ETH loops across Aave V3 among other lending markets. | [Fluid Lite ETH vault guide](https://lite.guides.instadapp.io/getting-started/fluid-lite-eth-vault) |
| Compound | outbound | active | n.a. | Fluid Lite routes leveraged ETH loops across Compound. | [Fluid Lite ETH vault guide](https://lite.guides.instadapp.io/getting-started/fluid-lite-eth-vault) |
| Spark | outbound | active | n.a. | Fluid Lite routes leveraged ETH loops across Spark. | [Fluid Lite ETH vault guide](https://lite.guides.instadapp.io/getting-started/fluid-lite-eth-vault) |
| Morpho | outbound | active | n.a. | Fluid Lite routes leveraged ETH loops across Morpho. | [Fluid Lite ETH vault guide](https://lite.guides.instadapp.io/getting-started/fluid-lite-eth-vault) |
| Lido (stETH, wstETH) | mutual | active | 2024 | Fluid uses wstETH as collateral in Lite and vault products and integrated the Lido stETH Redemption protocol alongside wstETH/ETH vault optimisation. | [Fluid governance proposal on stETH redemption](https://gov.fluid.io/t/optimizing-wsteth-eth-vault-and-integrating-steth-redemption/712) |
| Ether.fi (weETH) | mutual | active | 2024 | Fluid governance launched a weETH/wstETH vault using Ether.fi's weETH. | [Fluid governance proposal for weETH/wstETH vault](https://gov.fluid.io/t/launch-weeth-wsteth-vault/705) |
| Coinbase (cbBTC) | outbound | active | 2024 | Fluid governance approved cbBTC markets on Ethereum and Base. | [Fluid governance proposal for cbBTC markets](https://gov.fluid.io/t/launch-cbbtc-markets-on-fluid/845) |
| Ethena (USDtb) | mutual | active | 2025 | Ethena's USDtb was integrated on Fluid, allowing USDtb borrowing against ETH, wstETH, weETH, wBTC and cbBTC. | [Report on USDtb integration with Fluid](https://www.binance.com/en/square/post/27028289436954) |
| Ethena (USDe) via Bitwise | mutual | active | 2026 | Bitwise curates a USDe lending market on Jupiter Lend that is powered by Fluid. | [Fluid announcement of the Bitwise curated market](https://x.com/0xfluid/status/2056443242976022531) |
| Maple (syrupUSDC, syrupUSDT) | outbound | active | n.a. | Fluid Lite supports syrupUSDC and syrupUSDT as vault assets. | [Fluid Lite vault features](https://lite.guides.instadapp.io/getting-started/vaults-features) |
| USD.AI (sUSDai) | outbound | active | n.a. | Fluid Lite supports sUSDai as a vault asset. | [Fluid Lite vault features](https://lite.guides.instadapp.io/getting-started/vaults-features) |
| Jupiter (Jupiter Lend) | inbound | active | Aug 2025 | Jupiter Lend on Solana is built on Fluid's lending infrastructure, went to public beta on 29 August 2025 and shares revenue with Fluid. | [Jupiter Lend public beta press release](https://www.prnewswire.com/news-releases/the-most-advanced-money-market-on-solana-is-here-jupiter-lend-public-beta-is-live-302541430.html) |
| Uniswap v3 | outbound | active | 2023 | Fluid reads Uniswap v3 TWAP checkpoints as a primary oracle input and holds protocol-owned FLUID liquidity in Uniswap v3. | [Fluid protocol introduction](https://fluid.io/blog/protocol-introducing-fluid) |
| Chainlink CCIP | outbound | active | May 2025 | FLUID adopted the Chainlink CCIP Cross-Chain Token standard for transfers across Ethereum, Arbitrum and Base. | [Chainlink CCIP directory entry for FLUID](https://docs.chain.link/ccip/directory/mainnet/token/FLUID) |
| Almanak | inbound | active | n.a. | Almanak ships an SDK connector for Fluid DEX on Arbitrum, Base, Ethereum and Polygon. | [Almanak SDK Fluid connector](https://sdk.docs.almanak.co/api/connectors/fluid.html) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Arbitrum Foundation | mutual | active | Dec 2024 | The Arbitrum Foundation co-authored the Fluid DEX Arbitrum deployment proposal committing up to 750,000 USD in FLUID and 750,000 USD in USDC of rewards over three months for wstETH/ETH, weETH/ETH and FLUID/ETH pools. | [Fluid governance proposal to deploy Fluid DEX on Arbitrum](https://gov.fluid.io/t/deploy-fluid-dex-on-arbitrum-network/1074) |
| Uniswap v3 (protocol owned liquidity) | outbound | active | 2025 | Fluid governance approved seeding FLUID DEX liquidity on Base and Arbitrum alongside Uniswap v3 protocol-owned liquidity. | [Fluid governance proposal to seed DEX liquidity](https://gov.fluid.io/t/seed-fluid-dex-liquidity-on-base-and-arbitrum/1636) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink (Data Feeds) | outbound | active | 2023 | Fluid checks its Uniswap TWAP against Chainlink feeds, and its FallbackOracleImpl supports Chainlink-only and Chainlink-with-Redstone-fallback modes. | [Fluid FallbackOracleImpl docs](https://docs.fluid.instadapp.io/autogenerated-docs/oracle/implementations/fallbackOracleImpl.sol/abstract.FallbackOracleImpl.html) |
| Uniswap v3 TWAP | outbound | active | 2023 | Fluid's primary price input is a Uniswap TWAP taken across three checkpoints. | [Fluid protocol introduction](https://fluid.io/blog/protocol-introducing-fluid) |
| RedStone | outbound | active | n.a. | Fluid's fallback oracle supports Redstone as primary with Chainlink fallback, and FluidGenericOracleL2 combines Redstone and Chainlink hops. | [Fluid FluidGenericOracleL2 docs](https://docs.fluid.instadapp.io/autogenerated-docs/oracle/oraclesL2/genericOracleL2.sol/contract.FluidGenericOracleL2.html) |
| L2 sequencer uptime feed | outbound | active | n.a. | On L2s, UniV3CheckCLRSOracleL2 combines Uniswap v3 with Chainlink or Redstone and additionally checks a sequencer uptime feed. | [Fluid UniV3CheckCLRSOracleL2 docs](https://docs.fluid.io/autogenerated-docs/oracle/oraclesL2/uniV3CheckCLRSOracleL2.sol/contract.UniV3CheckCLRSOracleL2.html) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum | outbound | active | 2023 | Fluid is deployed on Ethereum. | [DefiLlama Fluid](https://defillama.com/protocol/fluid) |
| Arbitrum | outbound | active | 2024 | Fluid is deployed on Arbitrum. | [DefiLlama Fluid](https://defillama.com/protocol/fluid) |
| Base | outbound | active | 2024 | Fluid is deployed on Base. | [DefiLlama Fluid](https://defillama.com/protocol/fluid) |
| Polygon | outbound | active | 2024 | Fluid is deployed on Polygon. | [DefiLlama Fluid](https://defillama.com/protocol/fluid) |
| Plasma | outbound | active | 2025 | Fluid is deployed on Plasma and joined the Plasma ecosystem from day one of its testnet. | [Report on the Fluid and Plasma partnership](https://www.gate.com/post/status/13167505) |
| Solana | outbound | active | Aug 2025 | Fluid infrastructure reaches Solana through Jupiter Lend. | [DefiLlama Fluid](https://defillama.com/protocol/fluid) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Bitwise Asset Management | mutual | active | 2026 | Bitwise, described as managing 11 billion USD in client assets, curates a USDe lending market powered by Fluid. | [Fluid announcement of the Bitwise curated market](https://x.com/0xfluid/status/2056443242976022531) |
| MiCA whitepaper filing | outbound | active | n.a. | Instadapp published a MiCA whitepaper covering FLUID that lists Ethereum, Arbitrum, Base and Polygon deployments. | [Instadapp MiCA whitepaper](https://instadapp.io/mica-whitepaper.pdf) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| PeckShield | inbound | active | 2023 | PeckShield performed a pre-launch audit of Fluid. | [Fluid audits and security page](https://docs.fluid.instadapp.io/audits-and-security.html) |
| Statemind | inbound | active | Oct 2023 | Statemind audited Fluid between 30 October 2023 and 29 December 2023 and later reviewed liquidity layer updates. | [Statemind Fluid audit report](https://docs.fluid.instadapp.io/Statemind_Fluid_Audit.pdf) |
| MixBytes | inbound | active | Jun 2024 | MixBytes audited the Fluid Vault protocol with a public report dated 27 June 2024, and later the DEX and Liquidity Layer. | [MixBytes Instadapp Fluid audit](https://github.com/mixbytes/audits_public/blob/master/Instadapp/Fluid/README.md) |
| MixBytes (Liquidity Layer) | inbound | active | Dec 2025 | MixBytes published a Fluid Liquidity audit report dated 10 December 2025. | [MixBytes Fluid Liquidity audit report](https://docs.fluid.instadapp.io/MixBytes_Fluid_Liquidity_Audit.pdf) |
| Cantina | inbound | active | Sep 2024 | Cantina ran a competitive audit of Fluid DEX from 11 September to 2 October, funded by a governance proposal with a 300,000 USD budget. | [Cantina Fluid DEX audit report](https://docs.fluid.instadapp.io/cantina-audit-dex.pdf) |
| Immunefi | mutual | active | Sep 2021 | Instadapp runs an Immunefi bug bounty with a maximum payout of 500,000 USD, live from 20 September 2021. | [Immunefi Instadapp program](https://immunefi.com/bug-bounty/instadapp/information/) |
| Immunefi (invite-only audit competition) | mutual | deprecated | Nov 2024 | Fluid ran an 80,000 USD invite-only Immunefi audit competition from 14 November to 12 December 2024. | [Immunefi invite-only Fluid competition](https://immunefi.com/audit-competition/iop-fluid-protocol/leaderboard/) |
| Hats Finance | inbound | announced | 2024 | Hats Finance proposed a bug bounty vault for Fluid through governance. | [Hats Finance bug bounty vault proposal](https://gov.fluid.io/t/bug-bounty-vault-proposal-by-hats-finance/645) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Fluid DAO (gov.fluid.io) | inbound | active | n.a. | Fluid market launches, deployments and funding decisions are made through governance proposals on gov.fluid.io. | [Fluid governance forum proposal example](https://gov.fluid.io/t/launch-cbbtc-markets-on-fluid/845) |
| Yearn (risk curation) | inbound | active | n.a. | Yearn's curation team publishes a risk report on the Fluid lending protocol. | [Yearn curation report on Fluid](https://curation.yearn.fi/report/fluid/) |
| Multi-chain bridge evaluation (LayerZero, Socket, Axelar, Wormhole, CCTP) | outbound | announced | 2025 | Fluid governance formally evaluated LayerZero, Socket, Axelar, Wormhole and CCTP as bridge providers for multi-chain deployment. | [Fluid bridge evaluation proposal](https://gov.fluid.io/t/fluid-multi-chain-deployment-evaluating-bridge-solutions/1418) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Arbitrum Foundation | inbound | active | Dec 2024 | The Arbitrum Foundation co-funded the Fluid DEX Arbitrum launch incentive programme. | [Fluid governance proposal to deploy Fluid DEX on Arbitrum](https://gov.fluid.io/t/deploy-fluid-dex-on-arbitrum-network/1074) |
| Cantina (DAO funded competition) | outbound | active | 2024 | Fluid governance funded a Cantina audit competition with 150 stETH against a 300,000 USD budget. | [Cantina competition funding proposal](https://gov.fluid.io/t/cantina-competition-funding/836) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| DeFi Saver | inbound | active | n.a. | DeFi Saver supports the Fluid Vault Protocol in its front end. | [DeFi Saver Fluid vault protocol help page](https://help.defisaver.com/protocols/fluid/vault-protocol) |
| Jupiter | inbound | active | Aug 2025 | Jupiter distributes Fluid-powered lending to Solana users under the Jupiter Lend brand. | [Coverage of Jupiter Lend built with Fluid](https://unchainedcrypto.com/jupiter-unveils-new-lending-protocol-with-fluid/) |
| Fluid DEX V2 integration API | outbound | active | n.a. | Fluid publishes integration docs so aggregators can source liquidity from Fluid DEX V2. | [Fluid DEX V2 swap integration docs](https://docs.fluid.instadapp.io/integrate/dex-v2-swaps.html) |
| Open source contracts repo | outbound | active | n.a. | Fluid publishes its contracts and integration documentation publicly on GitHub. | [Fluid public contracts repo](https://github.com/instadapp/fluid-contracts-public/blob/main/docs/docs.md) |

*No evidenced relationships found for: Custody. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

## Gearbox Protocol

Slug `gearbox` · Sector Credit · Tag Leveraged Yield · 80 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Uniswap V2 | outbound | active | 2021 | Gearbox has an adapter enabling swaps on Uniswap V2 from Credit Accounts. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Uniswap V3 | outbound | active | 2021 | Gearbox has an adapter enabling swaps on Uniswap V3. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Sushiswap | outbound | active | n.a. | Gearbox has an adapter enabling swaps on Sushiswap. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Oku Trade | outbound | active | n.a. | Gearbox has an adapter enabling swaps via Oku Trade. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| PancakeSwap V3 | outbound | active | n.a. | Gearbox supports PancakeSwap V3 swaps and Stableswap LP deposits. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| IguanaDEX | outbound | active | n.a. | Gearbox supports IguanaDEX swaps and Stableswap LP deposits. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Curve (StableSwap, CryptoSwap, Stable NG) | outbound | active | 2021 | Gearbox supports Curve swaps and LP deposits across StableSwap, CryptoSwap and Stable NG pools. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Convex | outbound | active | n.a. | Gearbox supports staking Curve LP into Convex and claiming rewards. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Pendle | outbound | active | n.a. | Gearbox supports Pendle PT swaps from Credit Accounts. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Napier | outbound | active | n.a. | Gearbox supports Napier PT swaps and LP deposits. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Lido | outbound | active | 2021 | Gearbox supports stETH to wstETH conversion, and runs a dedicated Lido instance for leveraged staking. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Sky (formerly MakerDAO) | outbound | active | n.a. | Gearbox supports DAI to USDS conversion and staking USDS for SKY. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Mellow (DVstETH) | outbound | active | n.a. | Gearbox supports instant deposits and delayed withdrawals on Mellow DVstETH. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Velodrome | outbound | active | n.a. | Gearbox supports Velodrome swaps. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Aerodrome | outbound | active | n.a. | Gearbox supports Aerodrome swaps. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Camelot | outbound | active | n.a. | Gearbox supports Camelot swaps on Arbitrum. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Thena | outbound | active | n.a. | Gearbox supports Thena swaps. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| QuickSwap | outbound | active | n.a. | Gearbox supports QuickSwap swaps. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Trader Joe | outbound | active | n.a. | Gearbox supports Trader Joe swaps. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Infrared | outbound | active | n.a. | Gearbox supports staking LP into Infrared and claiming rewards. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Kodiak Island | outbound | active | n.a. | Gearbox supports deposits into Kodiak Island and swaps in the pool. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Fluid DEX | outbound | active | n.a. | The Gearbox adapter configuration page includes adding a Fluid DEX adapter for swap routing. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| ERC-4626 vaults (generic) | outbound | active | n.a. | Gearbox supports instant deposits and delayed withdrawals into any whitelisted ERC-4626 vault. | [Gearbox adapter configuration](https://docs.gearbox.fi/gearbox-permissionless-doc/advanced-configuration/configuring-adapters) |
| Balancer | outbound | active | 2022 | ChainSecurity's V2.1 audit covers Gearbox adapters for Balancer. | [ChainSecurity Gearbox V2.1 audit](https://www.chainsecurity.com/security-audit/gearbox-v2-1) |
| Aave V2 | outbound | deprecated | 2022 | ChainSecurity's V2.1 audit covers a Gearbox adapter for Aave V2. | [ChainSecurity Gearbox V2.1 audit](https://www.chainsecurity.com/security-audit/gearbox-v2-1) |
| Compound | outbound | deprecated | 2022 | ChainSecurity's V2.1 audit covers a Gearbox adapter for Compound. | [ChainSecurity Gearbox V2.1 audit](https://www.chainsecurity.com/security-audit/gearbox-v2-1) |
| Yearn V2 | outbound | deprecated | 2021 | Gearbox V1 interacted with Yearn V2 vaults alongside Uniswap and Curve. | [ChainSecurity Gearbox audit, December 2021](https://old.chainsecurity.com/wp-content/uploads/2021/12/ChainSecurity_Gearbox_Protocol_Gearbox_audit_Dec-13th-2021.pdf) |
| Rocket Pool | outbound | active | n.a. | Gearbox's own repository describes leveraged staking on Lido and Rocket Pool. | [Gearbox core-v3 repository](https://github.com/Gearbox-protocol/core-v3) |
| Threshold (tBTC) and Mezo (uptBTC) | outbound | active | 2026 | A Re7 curated BTCfi market lets users lend tBTC by Threshold and borrow tBTC for up to 6x leverage on uptBTC by Mezo. | [Gearbox blog](https://www.gearbox.finance/blog) |
| Midas (mTBILL, mBASIS, mRe7YIELD) | outbound | active | Aug 2025 | The Gearbox Etherlink deployment supports treasury-backed tokens mTBILL, mBASIS and mRe7YIELD as collateral. | [Tezos media centre on the Gearbox Etherlink launch](https://tezos.com/media-center/2025/gearbox-protocol-etherlink/) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Uniswap V2 (GEAR-WETH POL) | outbound | active | n.a. | Under GIP-219, 25 percent of realised monthly protocol revenue is allocated to acquiring GEAR-WETH LP tokens on Uniswap V2. | [Gearbox blog on the GEAR token](https://blog.gearbox.finance/gear-token-protocol-and-what-next/) |
| kpk | mutual | active | 2025 | kpk curates ETH and wstETH Earn Pools on Gearbox Permissionless, supplying the lending side liquidity. | [kpk on curated Gearbox Earn Pools](https://kpk.io/gearbox-curated-earn-pools/) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink | outbound | active | 2021 | Gearbox's multichain architecture lists Chainlink among supported oracle providers, and Gearbox price feeds return USD prices in a Chainlink-compatible latestRoundData format. | [Gearbox multichain architecture](https://docs.gearbox.fi/gearbox-permissionless-doc/multichain-architecture) |
| RedStone | outbound | active | 2023 | The Gearbox and RedStone integration allows permissionless day-zero usage of feeds on any chain, and RedStone lists Gearbox as a pull-model user. | [Gearbox multichain architecture](https://docs.gearbox.fi/gearbox-permissionless-doc/multichain-architecture) |
| Pyth | outbound | active | n.a. | Pyth is listed as a supported oracle provider and as an on-demand feed requiring price pushes per transaction. | [Gearbox docs on updating price feeds](https://docs.gearbox.finance/developers/updating-price-feeds) |
| Curve and Yearn derived price feeds | outbound | active | 2022 | Gearbox maintains LP price feeds for Curve LP and Yearn share prices with bounding logic to prevent manipulation. | [Gearbox core-v2 repository](https://github.com/Gearbox-protocol/core-v2) |

### Custody

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Non-custodial curator model | outbound | active | 2025 | Gearbox states curators manage parameters, not funds, and never possess or control user funds. | [Gearbox Permissionless for curators](https://docs.gearbox.finance/core/gearbox-permissionless-for-curators) |
| Instance Owner multisig | inbound | active | 2025 | A chain-specific Instance Owner multisig, open to active curators and chain contributors, controls the price feed store. | [Gearbox docs on adding price feeds](https://docs.gearbox.fi/gearbox-permissionless-doc/step-by-step-guides/adding-required-price-feeds) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum | outbound | active | 2021 | Gearbox is deployed on Ethereum. | [DefiLlama Gearbox](https://defillama.com/protocol/gearbox) |
| Arbitrum | outbound | active | 2023 | Gearbox is deployed on Arbitrum. | [DefiLlama Gearbox](https://defillama.com/protocol/gearbox) |
| OP Mainnet | outbound | active | n.a. | Gearbox is deployed on OP Mainnet. | [DefiLlama Gearbox](https://defillama.com/protocol/gearbox) |
| Etherlink | outbound | active | Aug 2025 | Gearbox launched on Etherlink, the Tezos Layer 2, with a Re7 Labs curated USDC vault. | [Tezos media centre on the Gearbox Etherlink launch](https://tezos.com/media-center/2025/gearbox-protocol-etherlink/) |
| Sonic | outbound | active | 2025 | Gearbox launched on Sonic with wS and USDC lending pools. | [Gearbox blog on the Sonic expansion](https://www.gearbox.finance/blog/gearbox-expands-to-sonic-lending-leverage-and-points) |
| BNB Chain | outbound | active | 2025 | Gearbox went live on BNB Chain with an instance curated permissionlessly by Chaos Labs. | [Gearbox blog](https://www.gearbox.finance/blog) |
| Plasma | outbound | active | 2025 | Gearbox is deployed on Plasma. | [DefiLlama Gearbox](https://defillama.com/protocol/gearbox) |
| Lisk | outbound | active | Jul 2025 | Gearbox is deployed on Lisk with wstETH and lskETH credit. | [DefiLlama Gearbox](https://defillama.com/protocol/gearbox) |
| Hemi | outbound | active | n.a. | Gearbox is deployed on Hemi. | [DefiLlama Gearbox](https://defillama.com/protocol/gearbox) |
| Monad | outbound | active | n.a. | Gearbox is deployed on Monad. | [DefiLlama Gearbox](https://defillama.com/protocol/gearbox) |
| Somnia | outbound | active | n.a. | Gearbox is deployed on Somnia. | [DefiLlama Gearbox](https://defillama.com/protocol/gearbox) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| K3 Capital | inbound | active | 2025 | A Gearbox instance operated and curated by K3 is live, providing institutional grade lending markets. | [Gearbox blog](https://www.gearbox.finance/blog) |
| Re7 Labs | mutual | active | Aug 2025 | Re7 Labs, described as managing over 700 million USD across 100-plus pools on 14 chains, curates the Gearbox USDC vault on Etherlink. | [Tezos media centre on the Gearbox Etherlink launch](https://tezos.com/media-center/2025/gearbox-protocol-etherlink/) |
| kpk | mutual | active | 2025 | kpk, an onchain asset manager that has advised the Ethereum Foundation, Aave and Lido, joined as one of the first Gearbox curators. | [Gearbox migration guide for borrowers](https://www.gearbox.finance/blog/migrating-to-permissionless-guide-for-borrowers) |
| Chaos Labs | mutual | active | 2025 | Chaos Labs curates the Gearbox BNB Chain instance and is cited as supporting user safety across the protocol. | [Gearbox blog](https://www.gearbox.finance/blog) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| ChainSecurity | inbound | active | 2021 | ChainSecurity audited Gearbox V1, V2 and the full V3 release including the V3 oracles. | [Gearbox audits and bug bounty](https://docs.gearbox.finance/risk-and-security/audits-bug-bounty) |
| ABDK | inbound | active | 2023 | ABDK performed a full V3 audit between Q2 and Q4 2023. | [Gearbox audits and bug bounty](https://docs.gearbox.finance/risk-and-security/audits-bug-bounty) |
| Decurity | inbound | active | Nov 2023 | Decurity audited the Gearbox governor between 8 and 20 November 2023. | [Gearbox audits and bug bounty](https://docs.gearbox.finance/risk-and-security/audits-bug-bounty) |
| Consensys Diligence | inbound | active | 2021 | Consensys Diligence performed V1 fuzzing in 2021 and a V2 audit in 2022, with the report published in the Gearbox security repo. | [Consensys Diligence Gearbox report](https://github.com/Gearbox-protocol/security/blob/main/audits/2022%20Sep%20-%20Consensys%20Diligence.pdf) |
| Sigma Prime | inbound | active | 2022 | Sigma Prime performed a partial V2 audit between February and August 2022. | [Gearbox audits and bug bounty](https://docs.gearbox.finance/risk-and-security/audits-bug-bounty) |
| MixBytes | inbound | active | 2021 | MixBytes audited Gearbox V1 between July and December 2021. | [Gearbox audits and bug bounty](https://docs.gearbox.finance/risk-and-security/audits-bug-bounty) |
| PeckShield | inbound | active | 2021 | PeckShield audited Gearbox in April to May 2021 and again in July to August 2021. | [Gearbox audits and bug bounty](https://docs.gearbox.finance/risk-and-security/audits-bug-bounty) |
| Immunefi | mutual | active | n.a. | Gearbox runs an Immunefi bug bounty with rewards up to 1,000,000 USD. | [Gearbox developer security page](https://docs.gearbox.finance/developers/res-security) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Gearbox DAO | inbound | active | 2021 | The Gearbox DAO controls system contract versions and GEAR incentive programmes while curators set market parameters. | [Gearbox Permissionless overview](https://docs.gearbox.finance/developers/gp-overview) |
| GIP-264 curator model | inbound | active | 2025 | Under GIP-264 the DAO leads protocol development while curators lead permissionless lending market setup. | [Gearbox migration guide for borrowers](https://www.gearbox.finance/blog/migrating-to-permissionless-guide-for-borrowers) |
| Optimism Grants Council | outbound | announced | 2023 | Gearbox Protocol appeared under Growth Experiments in the Optimism Grants Council Cycle 19 review roundup. | [Optimism Grants Council Cycle 19 roundup](https://gov.optimism.io/t/grants-council-cycle-19-s5-r1-preliminary-review-roundup/7812) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Arbitrum DAO (LTIPP) | inbound | deprecated | 2024 | Gearbox DAO was awarded an Arbitrum LTIPP grant and matched it with 20 million GEAR to fund the STIMMIES rewards programme of over 700,000 USD. | [Gearbox blog on STIMMIES](https://www.gearbox.finance/blog/gear-and-arb-rewards-stimmies) |
| Lisk | inbound | active | Jul 2025 | Gearbox announced 100,000 LSK in rewards alongside 10x credit on wstETH and lskETH via Lisk. | [CoinMarketCap Gearbox updates feed](https://coinmarketcap.com/ko/cmc-ai/gearbox-protocol/latest-updates/) |
| Placeholder | inbound | active | Aug 2022 | Placeholder participated in Gearbox's 4 million USD DAO round at a 150 million USD valuation. | [Blockworks on the Gearbox DAO round](https://blockworks.com/news/gearbox-shifts-into-v2-with-4m-funding-boost) |
| Zee Prime Capital | inbound | active | 2021 | Zee Prime participated in the 2021 private round and the 2022 DAO round. | [DefiLlama Gearbox raises](https://preview.dl.llama.fi/protocol/gearbox?denomination=USD) |
| LedgerPrime | inbound | active | Aug 2022 | LedgerPrime participated in the Gearbox DAO round. | [Blockworks on the Gearbox DAO round](https://blockworks.com/news/gearbox-shifts-into-v2-with-4m-funding-boost) |
| Polymorphic Capital | inbound | active | Aug 2022 | Polymorphic Capital participated in the Gearbox DAO round. | [Blockworks on the Gearbox DAO round](https://blockworks.com/news/gearbox-shifts-into-v2-with-4m-funding-boost) |
| Global Coin Research | inbound | active | Aug 2022 | GCR participated in the Gearbox DAO round. | [Blockworks on the Gearbox DAO round](https://blockworks.com/news/gearbox-shifts-into-v2-with-4m-funding-boost) |
| Variant Fund | inbound | active | May 2021 | Variant Fund participated in the 2.3 million USD private round in May 2021. | [DefiLlama Gearbox raises](https://preview.dl.llama.fi/protocol/gearbox?denomination=USD) |
| 1kx | inbound | active | May 2021 | 1kx participated in the May 2021 private round. | [DefiLlama Gearbox raises](https://preview.dl.llama.fi/protocol/gearbox?denomination=USD) |
| Lido Finance | inbound | active | May 2021 | Lido Finance participated in the May 2021 private round. | [DefiLlama Gearbox raises](https://preview.dl.llama.fi/protocol/gearbox?denomination=USD) |
| P2P Capital, Focus Labs, LAUNCHub Ventures, Encode Club, eGirl Capital | inbound | active | May 2021 | These funds participated in the May 2021 private round alongside angels including Stani Kulechov, Anton Bukov and Sergej Kunz. | [DefiLlama Gearbox raises](https://preview.dl.llama.fi/protocol/gearbox?denomination=USD) |
| A.Capital Ventures and Galaxy Digital | inbound | announced | 2022 | The approved 5.5 million USD strategic DAO funding proposal listed A.Capital Ventures and Galaxy Digital among planned investors. | [TokenInsight on the Gearbox DAO funding proposal](https://tokeninsight.com/en/news/5.5-million-strategic-dao-funding-proposal-launched-by-gearbox-community-approved) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| OKX Wallet | inbound | active | Jul 2024 | OKX Wallet integrated with Gearbox Protocol, letting eligible users access margin trading on Uniswap and leveraged farming on Curve via the web extension. | [OKX Wallet and Gearbox integration press release](https://www.prnewswire.com/news-releases/okx-wallet-now-integrated-with-gearbox-protocol-302209173.html) |
| MetaMask, Trust Wallet, WalletConnect | outbound | active | n.a. | The Gearbox application supports connection through third-party software wallets including MetaMask, Trust Wallet and WalletConnect. | [Gearbox terms of service](https://gearbox.fi/terms) |
| Curator white-label front ends | outbound | active | 2025 | Curators can obtain a personal domain in the form your_curator.gearbox.fi, be featured on app.gearbox.fi, or host their own front end. | [Gearbox curation iceberg](https://docs.gearbox.fi/gearbox-permissionless-doc/curation-iceberg) |
| Permissionless deployment portal | outbound | active | 2025 | permissionless.gearbox.foundation is the no-code entry point for deploying and curating Gearbox markets. | [Gearbox curator key concepts](https://docs.gearbox.finance/curators/key-concepts-system-overview) |

## Stella

Slug `stella` · Sector Credit · Tag Leveraged Yield · 34 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Uniswap V3 | outbound | active | Jun 2023 | Stella supports leveraged Uniswap V3 LP strategies at up to 5x on WETH/USDC.e, WETH/USDT, ARB/USDC.e, WETH/ARB, WETH/WBTC, RDNT/WETH, PENDLE/WETH, WETH/GMX and WETH/HMX. | [Stella supported strategies](https://docs.stellaxyz.io/stella-doc/stella-yield/stella-strategy/supported-strategies) |
| Trader Joe V2 | outbound | active | Nov 2023 | Stella supports leveraged Trader Joe V2 liquidity book strategies at up to 5x on ETH/USDC, ARB/ETH, JOE/ETH, GMX/ETH and PENDLE/ETH. | [Stella new leveraged strategies on Trader Joe](https://medium.com/@stellaxyz_/stella-new-leveraged-strategies-announcement-gmx-eth-pendle-eth-on-trader-joe-fd8420c02681) |
| Pendle | outbound | active | 2023 | Stella supports a Hyper strategy on wstETH via Pendle at up to 10x leverage. | [Stella supported strategies](https://docs.stellaxyz.io/stella-doc/stella-yield/stella-strategy/supported-strategies) |
| Penpie | outbound | active | 2023 | Stella supports a Hyper strategy on wstETH via Penpie at up to 10x leverage. | [Stella supported strategies](https://docs.stellaxyz.io/stella-doc/stella-yield/stella-strategy/supported-strategies) |
| Camelot | mutual | active | 2024 | Stella teamed up with Camelot, the Arbitrum native DEX, to offer leveraged automated market making on Camelot Nitro Pools. | [Stella on the first leveraged automated market making strategy](https://medium.com/@stellaxyz_/announcing-the-first-leveraged-and-automated-market-making-strategy-78575c3a836b) |
| Gamma Strategies | mutual | active | 2024 | Stella allows leverage on Gamma's automated market making vaults managing concentrated liquidity on Camelot, launching ETH/ARB, ETH/USDC, ETH/GMX and ARB/USDC strategies plus a native USDC lending pool. | [Stella on the first leveraged automated market making strategy](https://medium.com/@stellaxyz_/announcing-the-first-leveraged-and-automated-market-making-strategy-78575c3a836b) |
| Stella Lend (internal borrow source) | inbound | active | Jun 2023 | Leveraged positions borrow from Stella's own lending pools, and lenders are paid out of realised leveragoor yield rather than an interest rate. | [Stella launch post](https://medium.com/@stellaxyz_/stella-the-leveraged-strategies-protocol-with-0-cost-to-borrow-bad4f89d5cd3) |
| GMX and HMX (as farmed assets) | outbound | active | 2023 | Stella lists WETH/GMX and WETH/HMX Uniswap V3 pools plus a GMX/ETH Trader Joe pool as leveraged strategies. | [Stella supported strategies](https://docs.stellaxyz.io/stella-doc/stella-yield/stella-strategy/supported-strategies) |
| Arbitrum canonical bridge | outbound | active | 2023 | ALPHA is bridged to Arbitrum through the canonical Arbitrum bridge. | [Stella ALPHA token docs](https://docs.stellaxyz.io/stella-doc/tokenomics/alpha-token) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Camelot (Nitro Pools) | mutual | active | 2024 | Camelot supplied additional ARB incentives on top of Stella's own boosters for users opening leveraged market making positions on Camelot. | [Stella on the first leveraged automated market making strategy](https://medium.com/@stellaxyz_/announcing-the-first-leveraged-and-automated-market-making-strategy-78575c3a836b) |
| Binance (ALPHA listing) | inbound | active | Oct 2020 | Binance listed ALPHA in the Innovation Zone with ALPHA/BTC, ALPHA/BNB, ALPHA/BUSD and ALPHA/USDT pairs. | [Binance Launchpad and Launchpool announcement for ALPHA](https://www.binance.com/bg/support/announcement/detail/44788a90eb204201ae7f4cecb5cfc733) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink Price Feeds | outbound | active | Jun 2023 | Stella integrated Chainlink Price Feeds on Arbitrum mainnet, beginning with ETH/USD, ARB/USD, USDT/USD, USDC/USD and BTC/USD. | [Chainlink community post on the Stella integration](https://medium.com/chainlink-community/stella-%E0%B8%9C%E0%B8%AA%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%A7%E0%B8%A1-chainlink-price-feeds-%E0%B9%80%E0%B8%9E%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%8A%E0%B9%88%E0%B8%A7%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%B2%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%9B%E0%B8%A5%E0%B8%AD%E0%B8%94%E0%B8%A0%E0%B8%B1%E0%B8%A2%E0%B8%81%E0%B8%A5%E0%B8%A2%E0%B8%B8%E0%B8%97%E0%B8%98%E0%B9%8C-defi-f48618ba0df0) |
| Custom off-chain oracle sourcing Binance, Coinbase, Bybit, OKX, Kucoin, Gate.io, MEXC, Kraken | outbound | active | 2025 | Stella Trade uses a custom off-chain oracle that takes a weighted median across tiered exchanges to produce index and mark prices, with a secondary on-chain oracle as fallback. | [Stella price oracles docs](https://docs.stellaxyz.io/stella-doc/price-oracles) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Arbitrum | outbound | active | Jun 2023 | The Stella protocol itself is deployed on Arbitrum, which is the only chain DefiLlama tracks TVL on. | [DefiLlama Stella](https://defillama.com/protocol/stella) |
| Ethereum (ALPHA token) | outbound | active | Oct 2020 | The ALPHA token contract is deployed on Ethereum. | [Stella ALPHA token docs](https://docs.stellaxyz.io/stella-doc/tokenomics/alpha-token) |
| BNB Smart Chain (ALPHA token) | outbound | active | 2020 | The ALPHA token is deployed on BNB Smart Chain. | [Stella ALPHA token docs](https://docs.stellaxyz.io/stella-doc/tokenomics/alpha-token) |
| Avalanche C-Chain (ALPHA.e) | outbound | active | n.a. | ALPHA.e is deployed on Avalanche C-Chain. | [Stella ALPHA token docs](https://docs.stellaxyz.io/stella-doc/tokenomics/alpha-token) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| SCB 10X (Siam Commercial Bank) | mutual | active | 2020 | Alpha Finance Lab, the predecessor entity of Stella, secured a strategic partnership with SCB 10X, the venture arm of Siam Commercial Bank. | [Alpha Finance Lab 2020 review](https://blog.alphaventuredao.io/alpha-finance-lab-2020-review-and-2021-preview/) |
| Binance (Launchpad and Launchpool) | inbound | deprecated | Oct 2020 | Binance ran a 2 million USD Launchpad token sale and a Launchpool farming programme for ALPHA. | [Binance blog on the Alpha Finance Lab double launch](https://www.binance.com/en/blog/all/421499824684901042) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| PeckShield | inbound | active | 2023 | Stella states it was audited by PeckShield prior to its Arbitrum launch, with reports published in the stellaxyz/audits repository. | [Stella Arbitrum launch post](https://medium.com/@stellaxyz_/stella-is-now-live-on-arbitrum-heres-everything-you-need-to-know-55bffa370fe2) |
| Trust Security | inbound | active | May 2023 | Trust Security's Stella audit report dated 29 May 2023 is published in the stellaxyz/audits repository. | [Trust Security Stella audit report](https://github.com/stellaxyz/audits/blob/main/reports/20230529_Trust_Security.pdf) |
| Quantstamp | inbound | deprecated | 2021 | Alpha Homora v2, built by the same core team, passed audits from Quantstamp and PeckShield. | [ChainCatcher interview with the Alpha Finance Lab founder](https://www.chaincatcher.com/en/article/2059001) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| ALPHA token governance | inbound | active | 2020 | ALPHA is the protocol token for Stella and collects 20 percent of yields cut from leveragoors as protocol fees. | [Stella ALPHA token docs](https://docs.stellaxyz.io/stella-doc/tokenomics/alpha-token) |
| Arbitrum DAO | outbound | deprecated | Sep 2023 | Stella submitted and had approved an STIP Round 1 grant application to the Arbitrum DAO forum, then filed programme updates and an addendum. | [Stella STIP Round 1 application](https://forum.arbitrum.foundation/t/stella-final-stip-round-1/17328) |
| Alpha Venture DAO rebrand | inbound | deprecated | Mar 2022 | Alpha Finance Lab rebranded to Alpha Venture DAO in March 2022 before becoming Stella in June 2023 while retaining the ALPHA token. | [IQ.wiki entry on Alpha Finance](https://iq.wiki/wiki/alpha-finance) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Arbitrum DAO (STIP) | inbound | deprecated | Nov 2023 | Stella received 186,000 ARB under the Arbitrum Short Term Incentive Program, split 120,000 ARB to lending pools and 66,000 ARB to profitable leveraged positions. | [StellARB Incentive Rush epoch 5 announcement](https://medium.com/@stellaxyz_/stellarb-incentive-rush-arb-stip-epoch-5-now-live-on-stella-b8f60c79fe9b) |
| The Spartan Group | inbound | active | 2020 | The Spartan Group joined Alpha Finance Lab as a strategic investor. | [Alpha Finance Lab investor announcement](https://blog.alphaventuredao.io/investors/) |
| Multicoin Capital | inbound | active | 2020 | Multicoin Capital joined Alpha Finance Lab as a strategic investor. | [Alpha Finance Lab investor announcement](https://blog.alphaventuredao.io/investors/) |
| DeFiance Capital | inbound | active | 2020 | DeFiance Capital joined Alpha Finance Lab as a strategic investor. | [Alpha Finance Lab investor announcement](https://blog.alphaventuredao.io/investors/) |
| YZi Labs (formerly Binance Labs) | inbound | active | 2020 | Binance Labs, now YZi Labs, is listed as an incubator and backer in the ALPHA token sale record. | [ICO Drops record for Alpha Finance Lab](https://icodrops.com/alpha-finance-lab/) |
| Delphi Ventures and Divergence Ventures | inbound | active | n.a. | Delphi Ventures and Divergence Ventures are listed among ALPHA's investors. | [CryptoRank record for Alpha Finance Lab](https://cryptorank.io/ico/alpha-finance-lab) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| app.stellaxyz.io | outbound | active | Jun 2023 | Stella operates its own front end at app.stellaxyz.io for opening leveraged strategies. | [Stella new leveraged strategies on Trader Joe](https://medium.com/@stellaxyz_/stella-new-leveraged-strategies-announcement-gmx-eth-pendle-eth-on-trader-joe-fd8420c02681) |
| DefiLlama | inbound | active | n.a. | Stella is tracked on DefiLlama under the Leveraged Farming category. | [DefiLlama Stella](https://defillama.com/protocol/stella) |
| Binance Square | inbound | active | 2024 | Stella publishes strategy performance content through Binance Square under the Alpha Venture DAO account. | [Binance Square post from Alpha Venture DAO](https://www.binance.com/en/square/post/3138944888218) |

*No evidenced relationships found for: Custody. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

# Tag: Fixed Income

## Maple Finance

Slug `maple` · Sector Credit · Tag Fixed Income · 82 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Aave | mutual | active | Oct 2025 | Strategic partnership under which syrupUSDC is listed on the Aave core market and syrupUSDT on the Aave Plasma instance. | [Maple: Aave x Maple](https://maple.finance/insights/maple-aave) |
| Spark | inbound | active | Apr 2025 | Spark integrated with Maple and deployed an initial 50 million USDC into syrupUSDC, its first allocation outside treasury bills. | [Maple: Spark Integrates with Maple](https://maple.finance/insights/spark-integrates-with-maple-and-allocates-initial-50m) |
| Morpho | mutual | active | Mar 2025 | A syrupUSDC/USDC market is live on Morpho with a 20 million USDC borrow limit at 91.5 percent LTV. | [Maple: syrupUSDC on Morpho](https://maple.finance/insights/syrupusdc-is-now-live-on-morpho-curated-by-gauntlet-and-mev-capital) |
| Euler | outbound | active | Sep 2025 | syrupUSDC is available on Euler on Arbitrum for collateral and Multiply positions with an initial 20 million USD supply cap. | [Maple: syrupUSDC Expands to Arbitrum](https://maple.finance/insights/syrupusdc-expands-to-arbitrum) |
| Fluid | outbound | active | Sep 2025 | syrupUSDC is usable on Fluid on Arbitrum for swapping and leverage with an initial 40 million USD cap across multiple vaults. | [Maple: syrupUSDC Expands to Arbitrum](https://maple.finance/insights/syrupusdc-expands-to-arbitrum) |
| Pendle | mutual | active | n.a. | syrupUSDC is listed on Pendle, where Maple applies a boosted Drips multiplier to the position. | [Maple docs: Pendle integration](https://docs.maple.finance/syrupusdc-usdt-usdg-for-lenders/pendle-integration.md) |
| Chainlink CCIP | inbound | active | n.a. | Chainlink CCIP is the cross-chain transport used to move syrupUSDC and syrupUSDT between supported chains. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| Transporter | inbound | active | Sep 2025 | Transporter is named as the bridge used to move syrupUSDC from Ethereum mainnet to Arbitrum. | [Maple: syrupUSDC Expands to Arbitrum](https://maple.finance/insights/syrupusdc-expands-to-arbitrum) |
| Core (Core DAO) | mutual | active | Feb 2025 | lstBTC uses Core blockchain Dual Staking so that custodied Bitcoin earns CORE rewards while Maple manages the yield strategy. | [Maple: Unlock BTC Yield with lstBTC](https://maple.finance/insights/unlock-btc-yield-with-lstbtc) |
| Lombard (LBTC) | inbound | active | n.a. | Lombard LBTC was made available on Maple as a supported Bitcoin yield asset. | [Maple: LBTC live on Maple](https://maple.finance/insights/lbtc-live-on-maple) |
| Balancer | outbound | active | n.a. | syrupUSDC liquidity was deployed on Balancer. | [Maple: syrupUSDC live on Balancer](https://maple.finance/insights/syrupusdc-live-on-balancer) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Spark | inbound | active | Apr 2025 | Spark liquidity is integrated into syrupUSDC as a 50 million USD lender allocation. | [Maple: Spark Integrates with Maple](https://maple.finance/insights/spark-integrates-with-maple-and-allocates-initial-50m) |
| Gauntlet | mutual | active | Mar 2025 | Gauntlet curates one of the two Morpho vaults through which USDC liquidity is supplied against syrupUSDC collateral. | [Maple: syrupUSDC on Morpho](https://maple.finance/insights/syrupusdc-is-now-live-on-morpho-curated-by-gauntlet-and-mev-capital) |
| MEV Capital | mutual | active | Mar 2025 | MEV Capital curates the second Morpho vault supplying USDC against syrupUSDC collateral. | [Maple: syrupUSDC on Morpho](https://maple.finance/insights/syrupusdc-is-now-live-on-morpho-curated-by-gauntlet-and-mev-capital) |
| Steakhouse Financial | mutual | active | 2026 | Steakhouse Financial is the sole risk curator of the Morpho vault behind Robinhood Earn and approved syrupUSDG as its collateral. | [Maple: Credit Engine to Robinhood Chain](https://maple.finance/insights/syrupusdg) |
| Arbitrum DRIP program | inbound | active | Sep 2025 | Arbitrum's DRIP incentive program pays ARB rewards to users borrowing against syrupUSDC on Arbitrum. | [Maple: syrupUSDC Expands to Arbitrum](https://maple.finance/insights/syrupusdc-expands-to-arbitrum) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink | inbound | active | n.a. | Maple reads Chainlink oracles, with protocol wrappers around the feeds, for collateral valuation. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| Pyth Network | inbound | active | n.a. | Pyth provides price feeds for syrupUSDC/USDC and syrupUSDT/USDT used by integrators. | [Maple docs: Asset integration](https://docs.maple.finance/integrate/ethereum-mainnet/asset-integration.md) |
| Constant USD oracle for USDC | inbound | active | n.a. | Maple uses a constant USD price oracle for USDC rather than a market feed. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| CoinGecko | inbound | active | n.a. | CoinGecko API pricing is listed as an integration data source for Maple assets. | [Maple docs: Asset integration](https://docs.maple.finance/integrate/ethereum-mainnet/asset-integration.md) |
| CoinMarketCap | inbound | active | n.a. | CoinMarketCap API pricing is listed as an integration data source for Maple assets. | [Maple docs: Asset integration](https://docs.maple.finance/integrate/ethereum-mainnet/asset-integration.md) |

### Custody

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Anchorage Digital | inbound | active | May 2025 | Anchorage Digital acts as custodian for the Bitcoin-backed financing facility arranged with Cantor. | [Maple: Maple and Cantor](https://maple.finance/insights/maple-cantor) |
| BitGo | inbound | active | Feb 2025 | BitGo is one of the custodians where institutions deposit Bitcoin to mint lstBTC. | [Maple: Unlock BTC Yield with lstBTC](https://maple.finance/insights/unlock-btc-yield-with-lstbtc) |
| Copper | inbound | active | Feb 2025 | Copper provides custody and collateral management, including ClearLoop settlement, for the lstBTC program. | [Maple: Unlock BTC Yield with lstBTC](https://maple.finance/insights/unlock-btc-yield-with-lstbtc) |
| Hex Trust | inbound | active | Feb 2025 | Hex Trust provides regulated institutional custody for Bitcoin deposited into lstBTC. | [Maple: Unlock BTC Yield with lstBTC](https://maple.finance/insights/unlock-btc-yield-with-lstbtc) |
| Fireblocks | inbound | active | n.a. | The Cash Management Pool routes assets through a whitelisted Fireblocks wallet. | [Maple docs: Cash Management Pool risks](https://docs.maple.finance/cash-management-pool/risks.md) |
| J.P. Morgan | inbound | active | n.a. | J.P. Morgan is named as banking provider, prime broker and custodian for the Cash Management Pool. | [Maple docs: Cash Management Pool risks](https://docs.maple.finance/cash-management-pool/risks.md) |
| Kraken Financial | inbound | active | 2026 | Kraken Financial holds the underlying collateral for the onchain warehouse facility funding Kraken's OTC lending program. | [Maple: Maple and Kraken warehouse facility](https://maple.finance/insights/maple-and-kraken-close-landmark-onchain-warehouse-facility) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum | outbound | active | n.a. | Ethereum mainnet is Maple's primary deployment chain. | [DefiLlama: Maple](https://defillama.com/protocol/maple) |
| Solana | outbound | active | n.a. | Maple is deployed on Solana and syrupUSDC is available there. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| Arbitrum | outbound | active | Sep 2025 | syrupUSDC expanded to Arbitrum with Euler, Morpho and Fluid support. | [Maple: syrupUSDC Expands to Arbitrum](https://maple.finance/insights/syrupusdc-expands-to-arbitrum) |
| Base | outbound | active | n.a. | syrupUSDC is available on Base. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| Ink | outbound | active | n.a. | Both syrupUSDC and syrupUSDT are available on Ink. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| Monad | outbound | active | n.a. | syrupUSDC is listed as available on Monad. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| Tempo | outbound | active | n.a. | syrupUSDC is listed as available on Tempo. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| Plasma | outbound | active | n.a. | syrupUSDT is deployed on Plasma and listed on the Aave Plasma instance. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| Mantle | outbound | active | n.a. | syrupUSDT is available on Mantle. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| BNB Chain | outbound | active | n.a. | syrupUSDT is available on BNB Chain. | [Maple docs: syrupUSD cross-chain](https://docs.maple.finance/integrate/crosschain/syrupusd-crosschain.md) |
| Robinhood Chain | outbound | active | 2026 | syrupUSDG launched on Robinhood Chain. | [Maple: Credit Engine to Robinhood Chain](https://maple.finance/insights/syrupusdg) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Cantor Fitzgerald | inbound | active | May 2025 | Maple received a Bitcoin-backed financing facility from Cantor under a program sized up to 2 billion USD. | [Maple: Maple and Cantor](https://maple.finance/insights/maple-cantor) |
| Kraken | mutual | active | 2026 | Maple provides senior financing through a bankruptcy-remote SPV to a USDC-denominated warehouse facility funding Kraken's OTC lending program, with Kraken affiliates as originator, seller and servicer. | [Maple: Maple and Kraken warehouse facility](https://maple.finance/insights/maple-and-kraken-close-landmark-onchain-warehouse-facility) |
| Zaria | inbound | active | 2026 | Zaria acts as independent administrative agent for the Kraken warehouse SPV. | [Maple: Maple and Kraken warehouse facility](https://maple.finance/insights/maple-and-kraken-close-landmark-onchain-warehouse-facility) |
| J.P. Morgan | inbound | active | n.a. | J.P. Morgan provides banking, prime brokerage and custody services underpinning the Cash Management Pool. | [Maple docs: Cash Management Pool risks](https://docs.maple.finance/cash-management-pool/risks.md) |
| Robinhood | mutual | active | 2026 | Robinhood distributes the Maple-powered Robinhood Earn lending product inside the Robinhood app on Robinhood Chain. | [Maple: Credit Engine to Robinhood Chain](https://maple.finance/insights/syrupusdg) |
| Paxos | inbound | active | 2026 | Paxos provides regulated issuance for USDG, the stablecoin underlying syrupUSDG. | [Maple: Credit Engine to Robinhood Chain](https://maple.finance/insights/syrupusdg) |
| Global Dollar Network | mutual | active | 2026 | Maple's syrupUSDG is built on USDG, issued through the Global Dollar Network whose partners include Kraken, OKX, Robinhood and Mastercard. | [Maple: Credit Engine to Robinhood Chain](https://maple.finance/insights/syrupusdg) |
| Core Foundation | mutual | active | Feb 2025 | Core Foundation partnered with Maple, BitGo, Copper and Hex Trust to launch lstBTC, with Maple as investment manager of the yield strategy. | [Maple: Unlock BTC Yield with lstBTC](https://maple.finance/insights/unlock-btc-yield-with-lstbtc) |
| Block Analitica | inbound | active | Apr 2025 | Block Analitica was one of the independent third parties that ran the multi-month risk assessment of Maple ahead of the Spark allocation. | [Maple: Spark Integrates with Maple](https://maple.finance/insights/spark-integrates-with-maple-and-allocates-initial-50m) |
| Steakhouse Financial | inbound | active | Apr 2025 | Steakhouse Financial contributed to the independent risk assessment of Maple's underwriting and collateral management for Spark. | [Maple: Spark Integrates with Maple](https://maple.finance/insights/spark-integrates-with-maple-and-allocates-initial-50m) |
| Phoenix Labs | inbound | active | Apr 2025 | Phoenix Labs participated in the independent risk review preceding Spark's allocation to Maple. | [Maple: Spark Integrates with Maple](https://maple.finance/insights/spark-integrates-with-maple-and-allocates-initial-50m) |
| Circle | inbound | active | n.a. | Circle is the USDC issuer whose stablecoin denominates Maple's Cash Management Pool exposure. | [Maple docs: Cash Management Pool risks](https://docs.maple.finance/cash-management-pool/risks.md) |
| Maple Direct | mutual | active | n.a. | Maple Direct performs borrower underwriting for the Syrup lending products, with lending run through Maple International Operations SPC segregated portfolios. | [Maple docs: Syrup introduction](https://docs.maple.finance/syrupusdc-usdt-usdg-for-lenders/introduction.md) |
| Bitwise | mutual | active | n.a. | Bitwise is listed by Maple as an ecosystem partner. | [Maple: About](https://maple.finance/about) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Trail of Bits | inbound | active | Aug 2022 | Trail of Bits audited Maple protocol contracts. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| Spearbit | inbound | active | Oct 2022 | Spearbit audited Maple in October 2022 and again in November 2025. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| Three Sigma | inbound | active | Oct 2022 | Three Sigma performed repeated audits between 2022 and 2024. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| Cantina | inbound | active | Jun 2023 | Cantina, operated with Spearbit, ran a review of Maple contracts. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| 0xMacro | inbound | active | Nov 2023 | 0xMacro audited Maple releases in 2023, 2024 and 2025. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| Sherlock | inbound | active | Sep 2025 | Sherlock audited Maple contracts in September and November 2025. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| Dedaub | inbound | active | Nov 2025 | Dedaub reviewed the Maple CCIP receiver contract. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| Sigma Prime | inbound | active | Jan 2026 | Sigma Prime carried out a Maple audit in January 2026. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| Immunefi | mutual | active | n.a. | Maple runs its public bug bounty program on Immunefi. | [Immunefi: Maple bounty](https://immunefi.com/bounty/maple/) |
| Tenderly | inbound | active | n.a. | Tenderly is used for real-time contract monitoring and alerting. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |
| PagerDuty | inbound | active | n.a. | PagerDuty is used for incident escalation on monitoring alerts. | [Maple docs: Security](https://docs.maple.finance/technical-resources/security/security.md) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Maple Foundation (Cayman) | mutual | active | n.a. | The Maple Foundation acts as Security Agent for the bankruptcy-remote SPV structure in the Cash Management Pool. | [Maple docs: Cash Management Pool risks](https://docs.maple.finance/cash-management-pool/risks.md) |
| Spark governance | inbound | active | Apr 2025 | Spark's allocation to Maple followed a governance-mandated multi-month third party risk assessment. | [Maple: Spark Integrates with Maple](https://maple.finance/insights/spark-integrates-with-maple-and-allocates-initial-50m) |
| Sky | mutual | active | n.a. | Sky is listed among Maple's ecosystem partners alongside Spark. | [Maple: About](https://maple.finance/about) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Framework Ventures | inbound | active | Dec 2020 | Framework Ventures participated in Maple's seed round and in later rounds through 2023. | [DefiLlama: Maple raises](https://defillama.com/protocol/maple) |
| Polychain Capital | inbound | active | Mar 2021 | Polychain took part in Maple's 1.4 million USD March 2021 round. | [DefiLlama: Maple raises](https://defillama.com/protocol/maple) |
| BlockTower Capital | inbound | active | Aug 2023 | BlockTower Capital participated in the 5 million USD strategic round. | [DefiLlama: Maple raises](https://defillama.com/protocol/maple) |
| Spartan Group | inbound | active | Aug 2023 | The Spartan Group joined the August 2023 strategic round. | [DefiLlama: Maple raises](https://defillama.com/protocol/maple) |
| GSR | inbound | active | Aug 2023 | GSR participated in the August 2023 strategic round. | [DefiLlama: Maple raises](https://defillama.com/protocol/maple) |
| Cherry Ventures | inbound | active | Aug 2023 | Cherry Ventures participated in the August 2023 strategic round. | [DefiLlama: Maple raises](https://defillama.com/protocol/maple) |
| Tioga Capital | inbound | active | Aug 2023 | Tioga participated in the August 2023 strategic round. | [DefiLlama: Maple raises](https://defillama.com/protocol/maple) |
| Alameda Research | inbound | deprecated | Dec 2020 | Alameda Research was a seed investor in Maple; the firm is defunct following the FTX collapse. | [DefiLlama: Maple raises](https://defillama.com/protocol/maple) |
| Arbitrum DRIP | inbound | active | Sep 2025 | Arbitrum's DRIP program funds ARB incentives for syrupUSDC borrowing on Arbitrum. | [Maple: syrupUSDC Expands to Arbitrum](https://maple.finance/insights/syrupusdc-expands-to-arbitrum) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Binance | outbound | active | Aug 2025 | Binance offers syrupUSDC to its users via a MapleKit integration. | [Maple: MapleKit](https://maple.finance/insights/maple-kit) |
| OKX | outbound | active | Aug 2025 | OKX offers syrupUSDC to its users. | [Maple: MapleKit](https://maple.finance/insights/maple-kit) |
| Rainbow Wallet | outbound | active | Aug 2025 | Rainbow Wallet is named as a frontend integration path where listed assets can be whitelisted for syrupUSDC deposits. | [Maple: MapleKit](https://maple.finance/insights/maple-kit) |
| Robinhood Earn | outbound | active | 2026 | Robinhood Earn is described as the first decentralized lending product available inside the Robinhood app, powered by Maple credit. | [Maple: Credit Engine to Robinhood Chain](https://maple.finance/insights/syrupusdg) |
| ether.fi | mutual | active | n.a. | ether.fi is listed by Maple as an ecosystem partner. | [Maple: About](https://maple.finance/about) |
| Uniswap | mutual | active | n.a. | Uniswap is listed by Maple as an ecosystem partner. | [Maple: About](https://maple.finance/about) |

## Notional Finance

Slug `notional` · Sector Credit · Tag Fixed Income · 44 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Morpho | mutual | active | Jun 2025 | Notional Exponent connects to lending markets, with Morpho named as the primary venue and Exponent vaults acting as their own Morpho price oracle. | [Notional docs: Exponent Morpho oracle design](https://docs.notional.finance/exponent/smart-contracts/oracle-design-morpho) |
| Euler | outbound | active | n.a. | Exponent implements lending routers for Euler in addition to Morpho and Silo. | [Notional docs: Exponent system overview](https://docs.notional.finance/exponent/smart-contracts/system-overview) |
| Silo Finance | outbound | active | n.a. | Exponent implements a lending router for Silo. | [Notional docs: Exponent system overview](https://docs.notional.finance/exponent/smart-contracts/system-overview) |
| Pendle | outbound | active | Jun 2024 | Notional supports Pendle PT strategies, with a dedicated PendlePT strategy type and a June 2024 audit covering Pendle PTs. | [Notional docs: V3 audits](https://docs.notional.finance/v3-technical-docs/security/audits) |
| Ethena | outbound | active | Sep 2025 | Exponent withdraw request managers interact with Ethena, and the beta shipped sUSDe staking and sUSDe PT vaults. | [Notional: Exponent beta launch](https://blog.notional.finance/notional-exponent-beta-launch/) |
| Lido | outbound | active | n.a. | Exponent withdraw request managers interact directly with Lido for staked ETH redemptions. | [Notional docs: Exponent system overview](https://docs.notional.finance/exponent/smart-contracts/system-overview) |
| Curve | outbound | active | Sep 2025 | Exponent runs Liquidity strategies on Curve pools, including an OETH/WETH Curve position. | [Notional: Exponent beta launch](https://blog.notional.finance/notional-exponent-beta-launch/) |
| Convex | outbound | active | Sep 2025 | Convex boosting is used within Exponent Curve LP strategies. | [Notional docs: Exponent strategy types](https://docs.notional.finance/exponent/overview/strategy-types) |
| ether.fi (weETH) | outbound | active | Sep 2025 | A weETH staking vault was included in the Exponent beta strategy set. | [Notional: Exponent beta launch](https://blog.notional.finance/notional-exponent-beta-launch/) |
| Midas Protocol | mutual | active | Jan 2026 | Exponent launched two USDC vaults built on a Midas Protocol integration, separately audited in January 2026. | [Notional: Exponent launch details](https://blog.notional.finance/notional-exponent-launch-details/) |
| Infinifi | outbound | announced | Mar 2026 | An Infinifi integration was audited by Sherlock in March 2026. | [Notional docs: Exponent security](https://docs.notional.finance/exponent/smart-contracts/security) |
| Balancer | outbound | active | Nov 2022 | Notional's first leveraged vault was a Balancer wstETH/ETH strategy, and Balancer vault strategies were part of the audited V3 scope. | [Notional docs: V3 audits](https://docs.notional.finance/v3-technical-docs/security/audits) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Clearstar | mutual | active | Jan 2026 | Notional announced a liquidity partnership with Clearstar, a risk curator on Morpho, at the Exponent launch. | [Notional: Exponent is live](https://blog.notional.finance/notional-exponent-is-live/) |
| Hyperithm | mutual | active | Jan 2026 | Hyperithm is the strategist for the mHYPER vault and provides liquidity for that market. | [Notional: Exponent is live](https://blog.notional.finance/notional-exponent-is-live/) |
| Apollo Crypto | mutual | active | Jan 2026 | Apollo Crypto is the strategist behind the mAPOLLO vault, the first vault live on Exponent. | [Notional: Exponent launch details](https://blog.notional.finance/notional-exponent-launch-details/) |
| NOTE incentives program | outbound | active | Jan 2026 | Notional allocated 100,000 NOTE in incentives to bootstrap Exponent liquidity. | [Notional: Exponent is live](https://blog.notional.finance/notional-exponent-is-live/) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Chainlink | inbound | active | 2021 | Notional integrated Chainlink Price Feeds for ETH/USD, BTC/USD, USDC/USD and DAI/USD to drive fixed rate collateralization calculations. | [Notional blog: Chainlink integration](https://blog.notional.finance/notional-finance-integrates-chainlink-price-feeds-to-support-fixed-rate-collateralization-calculations/) |
| Chainlink (rETH feed) | inbound | active | n.a. | Governance proposal NIP-37 updated the rETH oracle on Notional's Arbitrum deployment. | [Notional forum: NIP-37](https://forum.notional.finance/t/nip-37-update-reths-oracle-and-increase-reths-supply-cap-arbitrum/120) |
| Chronicle | inbound | active | n.a. | NIP-82 listed a Balancer osETH/ETH leveraged vault relying on a Chronicle oracle. | [Notional forum: NIP-82](https://forum.notional.finance/t/nip-82-list-a-balancer-oseth-eth-leveraged-vault-arbitrum/191) |
| Exponent vault as Morpho oracle | outbound | active | Jun 2025 | Morpho markets list the Exponent vault itself as the price oracle, with the Trading Module supplying yieldToken/USD and asset/USD feeds. | [Notional docs: Exponent Morpho oracle design](https://docs.notional.finance/exponent/smart-contracts/oracle-design-morpho) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum | outbound | active | n.a. | Notional V3 has a mainnet deployment with published contract addresses. | [Notional docs: mainnet deployments](https://docs.notional.finance/notional-v3/smart-contracts/deployments-mainnet) |
| Arbitrum | outbound | active | n.a. | Notional V3 is deployed on Arbitrum with its own published contract set. | [Notional docs: Arbitrum deployments](https://docs.notional.finance/v3-technical-docs/deployed-contracts/notional-v3/arbitrum) |
| Ethereum and Arbitrum (NOTE) | outbound | active | n.a. | The NOTE governance token exists on both Ethereum and Arbitrum. | [Notional docs: The NOTE](https://docs.notional.finance/notional-v3/governance/the-note) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Apollo Crypto | mutual | active | Jan 2026 | Apollo Crypto acts as an external professional strategist running the mAPOLLO Exponent vault. | [Notional: Exponent launch details](https://blog.notional.finance/notional-exponent-launch-details/) |
| Hyperithm | mutual | active | Jan 2026 | Hyperithm, a digital asset investment firm, is strategist for the mHYPER vault. | [Notional: Exponent launch details](https://blog.notional.finance/notional-exponent-launch-details/) |
| Clearstar | mutual | active | Jan 2026 | Clearstar operates as a professional risk curator on Morpho in partnership with Notional Exponent. | [Notional: Exponent is live](https://blog.notional.finance/notional-exponent-is-live/) |
| Midas Protocol | mutual | active | Jan 2026 | Midas provides the tokenised vault wrapper used by the first two Exponent USDC markets. | [Notional: Exponent launch details](https://blog.notional.finance/notional-exponent-launch-details/) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Sherlock | inbound | active | Sep 2022 | Sherlock audited the Trading Module in September 2022, leveraged vaults in October 2022, Exponent in July 2025, the Midas integration in January 2026 and the Infinifi integration in March 2026. | [Notional docs: Exponent security](https://docs.notional.finance/exponent/smart-contracts/security) |
| Sherlock (V3 vaults) | inbound | active | Oct 2022 | Sherlock audited the leveraged vaults and Balancer vault strategy in October 2022 and Pendle PTs plus vault incentives in June 2024. | [Notional docs: V3 audits](https://docs.notional.finance/v3-technical-docs/security/audits) |
| MixBytes | inbound | active | Aug 2025 | MixBytes audited Notional Exponent in August 2025. | [Notional docs: Exponent security](https://docs.notional.finance/exponent/smart-contracts/security) |
| Immunefi | mutual | active | n.a. | Notional Exponent runs a 250,000 USD bug bounty program on Immunefi. | [Immunefi: Notional Exponent](https://immunefi.com/bug-bounty/notional-exponent/information/) |
| Hypernative | inbound | active | n.a. | Hypernative provides real-time monitoring for Notional Exponent. | [Notional docs: Exponent security](https://docs.notional.finance/exponent/smart-contracts/security) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Notional DAO (NOTE holders) | mutual | active | n.a. | NOTE holders govern Notional across Ethereum and Arbitrum through NIP proposals. | [Notional docs: The NOTE](https://docs.notional.finance/notional-v3/governance/the-note) |
| Chainlink (via NIP-29) | inbound | active | n.a. | NIP-29 onboarded LINK as a collateral asset on Notional V3 through DAO vote. | [Notional forum: NIP-29](https://forum.notional.finance/t/nip-29-onboard-link-as-a-collateral-asset-on-notional-v3/94) |
| Aura Finance / Balancer | mutual | active | n.a. | NIP-82 governance listed a Balancer osETH/ETH leveraged vault routed through Aura on Arbitrum. | [Notional forum: NIP-82](https://forum.notional.finance/t/nip-82-list-a-balancer-oseth-eth-leveraged-vault-arbitrum/191) |
| Arbitrum DAO | inbound | active | n.a. | NIP-26 allocated NOTE incentives to Notional's Arbitrum deployment. | [Notional forum: NIP-26](https://forum.notional.finance/t/nip-26-allocate-note-incentives-to-notionals-arbitrum-deployment/88) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Pantera Capital | inbound | active | Apr 2021 | Pantera Capital backed Notional's 10 million USD Series A. | [DefiLlama: Notional](https://defillama.com/protocol/notional) |
| ParaFi Capital | inbound | active | Apr 2021 | ParaFi Capital participated in the Series A. | [DefiLlama: Notional](https://defillama.com/protocol/notional) |
| 1confirmation | inbound | active | Apr 2021 | 1confirmation is listed among Notional's investors. | [DefiLlama: Notional](https://defillama.com/protocol/notional) |
| Spartan Group | inbound | active | Apr 2021 | The Spartan Group is listed among Notional's investors. | [DefiLlama: Notional](https://defillama.com/protocol/notional) |
| Nascent | inbound | active | Apr 2021 | Nascent is listed among Notional's investors. | [DefiLlama: Notional](https://defillama.com/protocol/notional) |
| Nima Capital | inbound | active | Apr 2021 | Nima Capital is listed among Notional's investors. | [DefiLlama: Notional](https://defillama.com/protocol/notional) |
| Arbitrum STIP | inbound | active | n.a. | Notional received ARB incentives through Arbitrum's Short Term Incentive Program. | [Notional blog: ARB STIP incentives are live](https://blog.notional.finance/arb-stip-incentives-are-live/) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Morpho front-end | outbound | active | Jun 2025 | Exponent positions are surfaced through Morpho markets that use the Exponent vault as oracle, giving Notional distribution via Morpho's lending interface. | [Notional docs: Exponent Morpho oracle design](https://docs.notional.finance/exponent/smart-contracts/oracle-design-morpho) |

*No evidenced relationships found for: Custody. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

## Pendle Finance

Slug `pendle` · Sector Credit · Tag Fixed Income · 67 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Aave | mutual | active | Jan 2025 | Aave governance approved onboarding Pendle PT tokens to the Aave V3 core instance, starting with PT-sUSDE-31JUL2025. | [Aave governance: Onboard Pendle PT tokens](https://governance.aave.com/t/arfc-onboard-pendle-pt-tokens-to-aave-v3-core-instance/20541) |
| Morpho | mutual | active | n.a. | Pendle PT tokens are used as collateral in Morpho markets. | [Pendle docs: Principal Token](https://docs.pendle.finance/pendle-v2/ProtocolMechanics/YieldTokenization/PT) |
| Silo Finance | mutual | active | n.a. | Silo accepts Pendle PT tokens as collateral. | [Pendle docs: Principal Token](https://docs.pendle.finance/pendle-v2/ProtocolMechanics/YieldTokenization/PT) |
| Euler | mutual | active | n.a. | Euler accepts Pendle PT tokens as collateral. | [Pendle docs: Principal Token](https://docs.pendle.finance/pendle-v2/ProtocolMechanics/YieldTokenization/PT) |
| Inverse Finance (FiRM) | mutual | active | Nov 2024 | Inverse Finance listed PT-sUSDe-27MAR25 as collateral on FiRM with up to 87 percent max LTV. | [Inverse Finance: Pendle PT-sUSDe on FiRM](https://www.inverse.finance/blog/posts/en-US/pendle-pt-usde-on-firm) |
| Ethena | mutual | active | n.a. | Aave onboarded Pendle PT-sUSDe alongside Ethena's sUSDe, making Ethena assets the dominant PT underlying. | [Aave: Ethena integration](https://aave.com/blog/ethena) |
| Penpie | inbound | active | n.a. | Penpie is a third party protocol built on Pendle that provides boosted yields to Pendle LPs without requiring them to lock PENDLE. | [Penpie docs: Pendle Finance](https://docs.penpiexyz.io/penpie-ecosystem/pendle-finance) |
| Equilibria | inbound | active | n.a. | Equilibria is a yield booster built on Pendle that distributes Pendle fees and rewards to its depositors. | [Equilibria docs: Fees and rewards distribution](https://docs.equilibria.fi/mechanism/fees-and-rewards-distribution) |
| Boros | mutual | active | Aug 2025 | Boros is a Pendle team platform on Arbitrum for trading BTC and ETH funding rates, built to stand alongside Pendle V2 and using Pendle PTs as collateral. | [Boros: Introducing Funding Futures](https://medium.com/boros-fi/boros-introducing-funding-futures-d1f69111a8a7) |
| LayerZero | inbound | active | n.a. | Pendle documents a cross-chain PT design for moving PT tokens between chains. | [Pendle docs: Cross-chain PT](https://docs.pendle.finance/pendle-v2-dev/Integration/CrossChainPT) |
| Maple Finance | mutual | active | n.a. | syrupUSDC is listed on Pendle with a boosted Drips multiplier for Maple depositors. | [Maple docs: Pendle integration](https://docs.maple.finance/syrupusdc-usdt-usdg-for-lenders/pendle-integration.md) |
| Notional Finance | mutual | active | Jun 2024 | Notional integrated Pendle PTs as a strategy type, with a dedicated audit of the Pendle PT integration. | [Notional docs: V3 audits](https://docs.notional.finance/v3-technical-docs/security/audits) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Penpie | inbound | active | n.a. | Penpie aggregates Pendle LP deposits and boosts their yields, concentrating third party liquidity in Pendle pools. | [Penpie docs: Pendle Finance](https://docs.penpiexyz.io/penpie-ecosystem/pendle-finance) |
| Equilibria | inbound | active | n.a. | Equilibria routes LP liquidity into Pendle pools and redistributes the resulting fees. | [Equilibria docs: Fees and rewards distribution](https://docs.equilibria.fi/mechanism/fees-and-rewards-distribution) |
| Arbitrum | mutual | active | Feb 2025 | Pendle's 2025 roadmap names Arbitrum among chains where it works on liquidity boosting programs. | [Pendle: 2025 Zenith](https://medium.com/pendle/pendle-2025-zenith-cf1a91e6e23f) |
| Zircuit | mutual | active | Feb 2025 | Zircuit is named in Pendle's 2025 roadmap as a liquidity boosting partner chain. | [Pendle: 2025 Zenith](https://medium.com/pendle/pendle-2025-zenith-cf1a91e6e23f) |
| Berachain | mutual | active | Feb 2025 | Berachain is named in Pendle's 2025 roadmap as a liquidity boosting partner chain. | [Pendle: 2025 Zenith](https://medium.com/pendle/pendle-2025-zenith-cf1a91e6e23f) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Pendle Linear Discount Oracle | outbound | active | n.a. | Pendle publishes a linear discount oracle that has been adopted by top Aave and Morpho curators including Gauntlet and Steakhouse. | [Pendle docs: Oracle overview](https://docs.pendle.finance/pendle-v2-dev/Oracles/OracleOverview) |
| Pendle TWAP PT/LP oracle (PendlePYLpOracle) | outbound | active | n.a. | Pendle provides a TWAP based PT and LP oracle contract for integrators pricing PT and LP tokens. | [Pendle docs: Oracle overview](https://docs.pendle.finance/pendle-v2-dev/Oracles/OracleOverview) |
| Chainlink (AggregatorV3 wrapper) | mutual | active | n.a. | Pendle ships a Chainlink-compatible oracle wrapper so integrators can read PT prices through the standard Chainlink interface. | [Pendle docs: Chainlink oracle contract](https://docs.pendle.finance/pendle-v2-dev/Contracts/Oracle/ChainlinkOracle) |
| Chainlink CRE | mutual | announced | Jun 2026 | Aave's PT risk oracle is being upgraded to run three Chainlink Runtime Environment workflows computing implied rate, discount rate and per E-Mode risk parameters for Pendle PTs. | [Aave governance: PT risk oracle on CRE](https://governance.aave.com/t/arfc-upgrade-pt-risk-oracle-to-protocol-owned-infrastructure-on-cre/25119) |
| LlamaRisk | mutual | active | Jun 2026 | LlamaRisk operates the risk manager and Updater role for Aave's Pendle PT discount rate oracle stack. | [Aave governance: PT risk oracle on CRE](https://governance.aave.com/t/arfc-upgrade-pt-risk-oracle-to-protocol-owned-infrastructure-on-cre/25119) |

### Custody

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Isolated SPVs via regulated investment managers | mutual | announced | Feb 2025 | Pendle's TradFi Citadel is designed as a KYC product using isolated SPVs run by regulated investment managers. | [Pendle: 2025 Zenith](https://medium.com/pendle/pendle-2025-zenith-cf1a91e6e23f) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum (chain 1) | outbound | active | n.a. | Pendle V2 core contracts are deployed on Ethereum mainnet. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Optimism (chain 10) | outbound | active | n.a. | Pendle V2 contracts are deployed on Optimism. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| BNB Chain (chain 56) | outbound | active | n.a. | Pendle V2 contracts are deployed on BNB Chain. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Monad (chain 143) | outbound | active | n.a. | Pendle V2 contracts are deployed on Monad. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Sonic (chain 146) | outbound | active | n.a. | Pendle V2 contracts are deployed on Sonic. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| HyperEVM (chain 999) | outbound | active | n.a. | Pendle V2 contracts are deployed on HyperEVM. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Mantle (chain 5000) | outbound | active | n.a. | Pendle V2 contracts are deployed on Mantle. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Base (chain 8453) | outbound | active | n.a. | Pendle V2 contracts are deployed on Base. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Arbitrum (chain 42161) | outbound | active | n.a. | Pendle V2 contracts are deployed on Arbitrum, which also hosts Boros. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Ink (chain 57073) | outbound | active | n.a. | Pendle V2 contracts are deployed on Ink. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Berachain (chain 80094) | outbound | active | n.a. | Pendle V2 contracts are deployed on Berachain. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Katana (chain 747474) | outbound | active | n.a. | Pendle V2 contracts are deployed on Katana. | [Pendle docs: Deployments](https://docs.pendle.finance/pendle-v2-dev/Deployments) |
| Avalanche | outbound | active | n.a. | DefiLlama lists Avalanche among the chains where Pendle holds TVL. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| Plasma | outbound | active | n.a. | DefiLlama lists Plasma among Pendle's chains. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| Solana, TON, HYPE | outbound | announced | Feb 2025 | Pendle's 2025 roadmap sets out a non-EVM expansion targeting Solana, TON and HYPE. | [Pendle: 2025 Zenith](https://medium.com/pendle/pendle-2025-zenith-cf1a91e6e23f) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethena | mutual | active | 2025 | Ethena is named as a partner in Pendle's Citadel strategy, and Ethena governance recorded roughly 450 million USD of Pendle PT collateral on Aave. | [Ethena governance: April 2025 update](https://gov.ethenafoundation.com/t/ethena-s-april-2025-governance-update/567) |
| Aave DAO | mutual | active | Jan 2025 | Aave DAO formally onboarded Pendle PT collateral with risk oversight from LlamaRisk, Chaos Labs, BGD Labs and Certora. | [Aave governance: Onboard Pendle PT tokens](https://governance.aave.com/t/arfc-onboard-pendle-pt-tokens-to-aave-v3-core-instance/20541) |
| Binance | mutual | active | Aug 2025 | Boros launched with trading on Binance BTCUSDT and ETHUSDT funding rates. | [Boros: Introducing Funding Futures](https://medium.com/boros-fi/boros-introducing-funding-futures-d1f69111a8a7) |
| Hyperliquid | mutual | active | Aug 2025 | Hyperliquid is named among the major exchanges whose funding rates Boros tracks. | [Boros: Introducing Funding Futures](https://medium.com/boros-fi/boros-introducing-funding-futures-d1f69111a8a7) |
| Bybit | mutual | active | Aug 2025 | Bybit is named among the exchanges covered by Boros funding rate markets. | [Boros: Introducing Funding Futures](https://medium.com/boros-fi/boros-introducing-funding-futures-d1f69111a8a7) |
| Regulated investment managers (TradFi Citadel) | mutual | announced | Feb 2025 | Pendle's TradFi Citadel is structured for institutional capital via KYC access and isolated SPVs operated by regulated managers. | [Pendle: 2025 Zenith](https://medium.com/pendle/pendle-2025-zenith-cf1a91e6e23f) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ackee Blockchain | inbound | active | n.a. | Ackee is named as one of Pendle V2's auditors. | [Pendle docs: Security](https://docs.pendle.finance/pendle-v2/Security) |
| Dedaub | inbound | active | n.a. | Dedaub is named as a Pendle V2 auditor. | [Pendle docs: Security](https://docs.pendle.finance/pendle-v2/Security) |
| Dingbats | inbound | active | n.a. | Dingbats is named as a Pendle V2 auditor. | [Pendle docs: Security](https://docs.pendle.finance/pendle-v2/Security) |
| Code4rena | inbound | active | n.a. | Pendle engaged top Code4rena wardens for review, with reports published in the core repository. | [Pendle docs: Security](https://docs.pendle.finance/pendle-v2/Security) |
| Pendle audits repository | outbound | active | n.a. | All Pendle V2 audit reports are published in the public pendle-core-v2-public repository. | [GitHub: Pendle audits](https://github.com/pendle-finance/pendle-core-v2-public/tree/main/audits/) |
| Chaos Labs | inbound | active | Jan 2025 | Chaos Labs acted as a risk provider on the Aave PT onboarding proposal. | [Aave governance: Onboard Pendle PT tokens](https://governance.aave.com/t/arfc-onboard-pendle-pt-tokens-to-aave-v3-core-instance/20541) |
| Certora | inbound | active | Jan 2025 | Certora is listed among the service providers reviewing the Aave Pendle PT onboarding. | [Aave governance: Onboard Pendle PT tokens](https://governance.aave.com/t/arfc-onboard-pendle-pt-tokens-to-aave-v3-core-instance/20541) |
| BGD Labs | inbound | active | Jan 2025 | BGD Labs was involved in the technical implementation review for Pendle PT onboarding to Aave. | [Aave governance: Onboard Pendle PT tokens](https://governance.aave.com/t/arfc-onboard-pendle-pt-tokens-to-aave-v3-core-instance/20541) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Aave DAO | mutual | active | Jan 2025 | The Aave Chan Initiative authored and passed the ARFC onboarding Pendle PT tokens to Aave V3 core. | [Aave governance: Onboard Pendle PT tokens](https://governance.aave.com/t/arfc-onboard-pendle-pt-tokens-to-aave-v3-core-instance/20541) |
| Aave on-chain vote (proposal 337) | mutual | active | 2025 | An on-chain Aave proposal executed changes relating to Pendle PT listings. | [Aave vote: proposal 337](https://vote.onaave.com/proposal/?proposalId=337) |
| Ethena governance | mutual | active | Apr 2025 | Ethena's governance update tracks Pendle PT collateral usage on Aave as a core part of its liquidity strategy. | [Ethena governance: April 2025 update](https://gov.ethenafoundation.com/t/ethena-s-april-2025-governance-update/567) |
| Penpie (vePENDLE governance) | inbound | active | n.a. | Penpie lets PENDLE holders earn voting rewards without locking, participating in Pendle governance on their behalf. | [Penpie docs: Pendle Finance](https://docs.penpiexyz.io/penpie-ecosystem/pendle-finance) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Binance Labs | inbound | active | Aug 2023 | Binance Labs invested in Pendle in August 2023. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| Spartan Group | inbound | active | Nov 2023 | The Spartan Group made an OTC purchase of PENDLE in November 2023. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| Mechanism Capital | inbound | active | May 2021 | Mechanism Capital participated in Pendle's 3.7 million USD seed round. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| HashKey Capital | inbound | active | May 2021 | HashKey participated in the seed round. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| Crypto.com Capital | inbound | active | May 2021 | Crypto.com Capital participated in the seed round. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| CMS Holdings | inbound | active | May 2021 | CMS Holdings participated in the seed round. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| Lemniscap | inbound | active | May 2021 | Lemniscap participated in the seed round. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |
| imToken Ventures | inbound | active | May 2021 | imToken Ventures participated in the seed round. | [DefiLlama: Pendle](https://defillama.com/protocol/pendle) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Penpie | inbound | active | n.a. | Penpie operates an alternative front end through which users access Pendle pools with boosted rewards. | [Penpie docs: Pendle Finance](https://docs.penpiexyz.io/penpie-ecosystem/pendle-finance) |
| Equilibria | inbound | active | n.a. | Equilibria provides a separate interface for depositing into Pendle markets. | [Equilibria docs: Fees and rewards distribution](https://docs.equilibria.fi/mechanism/fees-and-rewards-distribution) |
| Boros | outbound | active | Aug 2025 | Boros is a Pendle team front end for funding rate trading, opened to the public on Arbitrum. | [Boros: Introducing Funding Futures](https://medium.com/boros-fi/boros-introducing-funding-futures-d1f69111a8a7) |

## Sense Finance

Slug `sense` · Sector Credit · Tag Fixed Income · 31 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Balancer V2 | mutual | deprecated | 2022 | Sense's Space AMM was built as a custom pool on the Balancer V2 vault. | [Sense docs: Smart contracts](https://docs.sense.finance/docs/smart-contracts/) |
| Rari Capital (Fuse) | mutual | deprecated | Mar 2022 | Sense partnered with Rari Capital to launch a Sense Pool on Fuse for borrowing and lending against PT and YT. | [Sense: Sense Finance x Rari Capital](https://medium.com/sensefinance/sense-finance-x-rari-capital-5c0e0b6289d4) |
| Lido | outbound | deprecated | n.a. | Sense shipped a wstETH adapter to strip yield from Lido staked ETH. | [Sense docs: Deployed contracts](https://docs.sense.finance/developers/deployed-contracts/) |
| Compound | outbound | deprecated | n.a. | Sense deployed cUSDC and cDAI adapters targeting Compound money markets. | [Sense docs: Deployed contracts](https://docs.sense.finance/developers/deployed-contracts/) |
| Morpho (Morpho-Aave) | outbound | deprecated | n.a. | Sense ran maUSDC and maUSDT Roller Liquidity Vaults on Morpho-Aave positions. | [Sense docs: Deployed contracts](https://docs.sense.finance/developers/deployed-contracts/) |
| Balancer Smart Order Router | inbound | deprecated | n.a. | Balancer documented Sense Space pools as routable through its Smart Order Router. | [Balancer: Traversing the Balancer Vault with SOR](https://medium.com/balancer-protocol/traversing-the-balancer-vault-with-smart-order-routing-sor-8ac850df22fc) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Balancer V2 (Space AMM) | mutual | deprecated | 2022 | Space, Sense's yield space AMM, hosted all PT liquidity as a Balancer V2 pool type. | [Sense: Introducing Sense Space](https://medium.com/sensefinance/introducing-sense-space-85a949087209) |
| Morpho (MORPHO rewards) | inbound | deprecated | 2023 | MORPHO token rewards accrued to Sense Roller Liquidity Vault users and remained claimable through Morpho Governance up to Age 7. | [Sense: Sunsetting Sense](https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Space AMM oracle | outbound | deprecated | 2022 | Sense Fuse pools at Rari Capital relied on the Space AMM's own oracle for PT and YT pricing. | [Immunefi: Sense Finance bugfix review](https://medium.com/immunefi/sense-finance-access-control-issue-bugfix-review-32e0c806b1a0) |
| Chainlink stETH price feed | inbound | deprecated | n.a. | A stale stETH price feed used in wstETH Adapter 7 caused an incident, and the price feed integration was removed in Adapter 8. | [Sense: Post mortem on stale stETH price feed](https://medium.com/sensefinance/post-mortem-stale-steth-price-feed-in-a7-c70d648bef89) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum | outbound | deprecated | 2021 | Sense deployed only on Ethereum mainnet, governed by a 2 of 3 multisig. | [Sense docs: Deployed contracts](https://docs.sense.finance/developers/deployed-contracts/) |
| Ethereum (TVL) | outbound | deprecated | n.a. | DefiLlama lists Ethereum as the sole chain for Sense with residual TVL of roughly 42,000 USD. | [DefiLlama: Sense](https://defillama.com/protocol/sense) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Bain Capital Crypto | inbound | deprecated | Aug 2021 | Bain Capital's crypto arm backed Sense's 5.2 million USD seed round. | [DefiLlama: Sense](https://defillama.com/protocol/sense) |
| Dragonfly Capital | inbound | deprecated | Aug 2021 | Dragonfly led the Sense seed round. | [CoinDesk: Sense Finance raises 5.2M](https://www.coindesk.com/markets/2021/08/03/sense-finance-raises-52m-to-bring-yield-trading-to-defi) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| PeckShield | inbound | deprecated | Nov 2021 | PeckShield audited Sense v1. | [Sense docs: Security](https://docs.sense.finance/developers/security/) |
| ABDK | inbound | deprecated | Nov 2021 | ABDK audited Sense in November 2021 and again in March 2022. | [Sense docs: Security](https://docs.sense.finance/developers/security/) |
| Fixed Point Solutions (Kurt Barry) | inbound | deprecated | Nov 2021 | Fixed Point Solutions reviewed Sense v1, Space v1 and the Roller Liquidity Vaults. | [Sense docs: Security](https://docs.sense.finance/developers/security/) |
| Spearbit | inbound | deprecated | Jan 2022 | Spearbit audited Sense v1 and Space v1. | [Sense docs: Security](https://docs.sense.finance/developers/security/) |
| Sherlock | inbound | deprecated | Nov 2022 | Sherlock audited the Roller Liquidity Vaults. | [Sense docs: Security](https://docs.sense.finance/developers/security/) |
| Immunefi | mutual | deprecated | n.a. | Sense ran an Immunefi bug bounty up to 50,000 USD and paid a 50,000 USD bounty for an access control issue. | [Immunefi: Sense Finance bugfix review](https://medium.com/immunefi/sense-finance-access-control-issue-bugfix-review-32e0c806b1a0) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Sense multisig (2 of 3) | mutual | deprecated | n.a. | Protocol control sat with a 2 of 3 multisig on Ethereum mainnet. | [Sense docs: Deployed contracts](https://docs.sense.finance/developers/deployed-contracts/) |
| Morpho Governance | inbound | deprecated | Oct 2023 | Morpho Governance remained the claim path for MORPHO rewards earned by Sense users after the sunset. | [Sense: Sunsetting Sense](https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad) |
| Sense Protocol wind-down | outbound | deprecated | Oct 2023 | Sense announced it was sunsetting the protocol after 18 months, open-sourcing the UI and asking users to withdraw by December 1 2023. | [Sense: Sunsetting Sense](https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Dragonfly Capital | inbound | deprecated | Aug 2021 | Dragonfly led the 5.2 million USD Sense round. | [Sense: raises 5.2M](https://medium.com/sensefinance/sense-finance-raises-5-2m-to-add-a-new-dimension-to-defi-bbccb508d271) |
| Bain Capital Ventures | inbound | deprecated | Aug 2021 | Bain Capital Ventures participated in the round. | [Sense: raises 5.2M](https://medium.com/sensefinance/sense-finance-raises-5-2m-to-add-a-new-dimension-to-defi-bbccb508d271) |
| Nascent | inbound | deprecated | Aug 2021 | Nascent participated in the round. | [Sense: raises 5.2M](https://medium.com/sensefinance/sense-finance-raises-5-2m-to-add-a-new-dimension-to-defi-bbccb508d271) |
| Variant | inbound | deprecated | Aug 2021 | Variant participated in the round. | [Sense: raises 5.2M](https://medium.com/sensefinance/sense-finance-raises-5-2m-to-add-a-new-dimension-to-defi-bbccb508d271) |
| Robot Ventures | inbound | deprecated | Aug 2021 | Robot Ventures participated in the round. | [DefiLlama: Sense](https://defillama.com/protocol/sense) |
| theLAO | inbound | deprecated | Aug 2021 | theLAO participated in the round. | [Sense: raises 5.2M](https://medium.com/sensefinance/sense-finance-raises-5-2m-to-add-a-new-dimension-to-defi-bbccb508d271) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Open-sourced Sense UI | outbound | deprecated | Oct 2023 | Sense open-sourced its front end as part of the wind-down so third parties could continue to run it. | [Sense: Sunsetting Sense](https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad) |
| Sense docs deprecation notice | outbound | deprecated | Q4 2023 | The documentation states the Sense Project is winding down and the UI will be deprecated in Q4 2023. | [Sense docs](https://docs.sense.finance/) |

*No evidenced relationships found for: Custody. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

## Spectra

Slug `spectra` · Sector Credit · Tag Fixed Income · 59 rows

### Technical integration

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Curve Finance | mutual | active | n.a. | Spectra uses Curve as the DEX for all PT liquidity, deploying each PT market as a Curve pool. | [Spectra dev docs: Providing liquidity](https://dev.spectra.finance/guides/providing-liquidity.md) |
| Curve twocrypto-ng and stableswap-ng | inbound | active | n.a. | Spectra integrates Curve's twocrypto-ng and stableswap-ng AMM implementations for its pools. | [Spectra dev docs: TWAP oracles](https://dev.spectra.finance/integration-reference/spectra-oracles/twap-oracles) |
| Morpho | mutual | active | Jan 2025 | A PT-wstUSR/USDC Morpho market curated by MEV Capital uses Spectra PT as collateral. | [Morpho: PT-wstUSR/USDC market](https://app.morpho.org/ethereum/market/0xbf4d7952ceeb29d52678172c348b8ef112d6e32413c547cbf56bbf6addcfa13e/pt-wstusr-1740182579-usdc) |
| Resolv (USR / wstUSR) | outbound | active | Jan 2025 | Spectra PT is issued against Resolv wstUSR, with the market priced off a Resolv USR/USD feed. | [Morpho: PT-wstUSR/USDC market](https://app.morpho.org/ethereum/market/0xbf4d7952ceeb29d52678172c348b8ef112d6e32413c547cbf56bbf6addcfa13e/pt-wstusr-1740182579-usdc) |
| YieldNest | mutual | active | Mar 2025 | YieldNest governance approved Spectra PT looping on Morpho for the ynETHx product. | [YieldNest governance: Max LRT PT looping](https://gov.yieldnest.finance/t/yieldnest-max-lrt-pt-looping/139) |
| Yearn (yvvbTokens) | outbound | active | Oct 2025 | Spectra went live on Katana with markets on AUSD and Yearn yvvbTokens. | [Katana on X: Spectra live on Katana](https://x.com/katana/status/1976292477272224055) |
| Liquity (BOLD / sBOLD) | mutual | active | Aug 2025 | Spectra opened markets for sBOLD and BOLD. | [Liquity on X](https://x.com/LiquityProtocol/status/1952724955436618208) |
| Merkl (MetaVaults) | mutual | active | Feb 2026 | Campaign creators can distribute rewards to Spectra MetaVault depositors directly from Merkl Studio. | [Merkl: February 2026 recap](https://blog.merkl.xyz/monthly-recap-february-2026-private-campaigns-metamask-airdrop-and-more) |
| Spectra Router | outbound | active | n.a. | The Spectra app routes deposits, tokenisation and liquidity provision through a single Router contract that integrators can reuse. | [Spectra dev docs: Providing liquidity](https://dev.spectra.finance/guides/providing-liquidity.md) |
| Uniswap V3 | outbound | active | Jan 2024 | APW liquidity was migrated to a Uniswap V3 1 percent ETH/APW pool. | [Spectra governance: SGP 1](https://gov.spectra.finance/t/sgp-1-liquidity-migration/370) |
| Tokemak | inbound | deprecated | Jan 2024 | A Tokemak reactor previously directed over 95 percent of APW liquidity on the Sushiswap ETH/APW pair and was retired. | [Spectra governance: SGP 1](https://gov.spectra.finance/t/sgp-1-liquidity-migration/370) |
| Sushiswap | outbound | deprecated | n.a. | The Sushiswap ETH/APW V2 pool was the prior venue for APW liquidity before migration to Uniswap V3. | [Spectra governance: SGP 1](https://gov.spectra.finance/t/sgp-1-liquidity-migration/370) |

### Liquidity provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Angle Labs (Merkl distributor) | inbound | active | Jan 2024 | Spectra distributed 40,000 APW over 28 days to Uniswap V3 in-range liquidity using Angle Labs' Merkl rewards distributor. | [Spectra governance: SGP 1](https://gov.spectra.finance/t/sgp-1-liquidity-migration/370) |
| Merkl | mutual | active | Feb 2026 | Merkl supports incentive campaigns on Spectra MetaVaults through Merkl Studio. | [Merkl: February 2026 recap](https://blog.merkl.xyz/monthly-recap-february-2026-private-campaigns-metamask-airdrop-and-more) |
| Katana (KAT rewards) | inbound | active | Oct 2025 | Spectra markets on Katana are incentivised with KAT rewards distributed via Merkl. | [Katana on X: Spectra live on Katana](https://x.com/katana/status/1976292477272224055) |
| Comethswap | outbound | deprecated | Jan 2024 | The APW distribution to Comethswap LPs was terminated under SGP 1. | [Spectra governance: SGP 1](https://gov.spectra.finance/t/sgp-1-liquidity-migration/370) |
| MEV Capital | mutual | active | Jan 2025 | MEV Capital curates the Morpho vault lending USDC against Spectra PT-wstUSR collateral. | [Morpho: PT-wstUSR/USDC market](https://app.morpho.org/ethereum/market/0xbf4d7952ceeb29d52678172c348b8ef112d6e32413c547cbf56bbf6addcfa13e/pt-wstusr-1740182579-usdc) |

### Oracle provider

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Spectra Deterministic, TWAP and Hybrid oracles | outbound | active | n.a. | Spectra publishes three oracle types for PT and yield token pricing, all following Chainlink's AggregatorV3 interface. | [Spectra dev docs: Oracles](https://dev.spectra.finance/integration-reference/spectra-oracles.md) |
| Chainlink (AggregatorV3 standard) | mutual | active | n.a. | Spectra oracles conform to the Chainlink AggregatorV3 standard so integrators can consume them as standard feeds. | [Spectra dev docs: Oracles](https://dev.spectra.finance/integration-reference/spectra-oracles.md) |
| Curve pool price_oracle | inbound | active | n.a. | Spectra TWAP oracles read price_oracle() from the underlying Curve twocrypto-ng and stableswap-ng pools. | [Spectra dev docs: TWAP oracles](https://dev.spectra.finance/integration-reference/spectra-oracles/twap-oracles) |
| Spectra linear price adapter on Morpho | outbound | active | Jan 2025 | The Morpho PT-wstUSR market prices collateral via a Spectra PT to USR linear price adapter combined with Resolv and Chainlink feeds. | [Morpho: PT-wstUSR/USDC market](https://app.morpho.org/ethereum/market/0xbf4d7952ceeb29d52678172c348b8ef112d6e32413c547cbf56bbf6addcfa13e/pt-wstusr-1740182579-usdc) |
| Ojo Network | inbound | announced | n.a. | Ojo Network applied for a Morpho grant to build a Smart Oracle serving Pendle and Spectra PT markets on Morpho. | [Morpho forum: MIP-93 call for grants](https://forum.morpho.org/t/mip-93-call-for-grants/1177?page=2) |

### Chain deployment

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Ethereum | outbound | active | n.a. | Spectra publishes deployed contract addresses on Ethereum. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| Arbitrum | outbound | active | n.a. | Spectra contracts are deployed on Arbitrum. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| Optimism | outbound | active | n.a. | Spectra contracts are deployed on Optimism. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| Base | outbound | active | n.a. | Spectra contracts are deployed on Base, which is also its governance home chain. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| Sonic | outbound | active | n.a. | Spectra contracts are deployed on Sonic. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| Hemi | outbound | active | n.a. | Spectra contracts are deployed on Hemi. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| HyperEVM | outbound | active | n.a. | Spectra contracts are deployed on HyperEVM. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| Katana | outbound | active | Oct 2025 | Spectra went live on Katana with AUSD and Yearn yvvbToken markets. | [Katana on X: Spectra live on Katana](https://x.com/katana/status/1976292477272224055) |
| Avalanche | outbound | active | n.a. | Spectra contracts are deployed on Avalanche. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| BNB Chain | outbound | active | n.a. | Spectra contracts are deployed on BNB Chain. | [Spectra dev docs: Deployed contracts](https://dev.spectra.finance/technical-reference/deployed-contracts.md) |
| Flare | outbound | active | n.a. | The Spectra app lists Flare among supported chains, and DefiLlama shows Flare as its largest TVL chain. | [Spectra](https://www.spectra.finance/) |
| Monad | outbound | active | n.a. | The Spectra app lists Monad among supported chains. | [Spectra](https://www.spectra.finance/) |
| Polygon | outbound | active | n.a. | DefiLlama records Spectra TVL on Polygon, a legacy APWine deployment chain. | [DefiLlama: Spectra](https://defillama.com/protocol/spectra) |

### Institutional or TradFi

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Perspective SAS | mutual | active | Dec 2024 | Perspective SAS is the development company behind Spectra, referenced in the SPECTRA token migration to Base. | [Spectra Mirror: SPECTRA migration to Base](https://mirror.xyz/spectraprotocol.eth/WlXvGmZL3iPwjRbCbIy1tJqQKfwUlI92F6pRx0_BCow) |
| Greenfield Capital | inbound | active | Nov 2022 | Greenfield led a 2.5 million USD seed extension into APWine, now Spectra. | [Greenfield Capital: Backing APWine](https://greenfieldcapital.com/publications/page/6/?migrated=1) |
| Spectra (Paris HQ entity) | mutual | active | n.a. | PitchBook lists the Spectra company profile with a Paris headquarters. | [PitchBook: Spectra](https://pitchbook.com/profiles/company/482092-48) |

### Security or audit

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Code4rena | inbound | active | Mar 2024 | A Code4rena competition with 42 auditors reviewed Spectra between March and April 2024. | [Spectra docs: Audits](https://docs.spectra.finance/security/audits) |
| Code4rena report | outbound | active | Apr 2024 | The full Spectra Code4rena findings report is published publicly. | [Code4rena: 2024-02 Spectra report](https://code4rena.com/reports/2024-02-spectra) |
| Pashov Audit Group | inbound | active | Mar 2024 | Pashov Audit Group produced a security review of Spectra in March 2024. | [Pashov audits: Spectra security review](https://github.com/pashov/audits/blob/master/team/pdf/Spectra-security-review.pdf) |
| Sherlock | inbound | active | Sep 2025 | Sherlock audited Spectra metavaults-V1 in September 2025. | [Spectra docs: Audits](https://docs.spectra.finance/security/audits) |
| Immunefi | mutual | active | n.a. | Spectra ran an Immunefi audit competition scoped to Ethereum, Optimism, Arbitrum, Sonic and Base, covering its Curve NG and Stableswap NG integrations. | [Immunefi: Spectra audit competition](https://immunefi.com/audit-competition/audit-comp-spectra-finance/scope/) |

### Governance or DAO

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Spectra DAO | mutual | active | Jan 2024 | Spectra governance passes SGP proposals such as SGP 1, which authorised the APW liquidity migration and reward distribution. | [Spectra governance: SGP 1](https://gov.spectra.finance/t/sgp-1-liquidity-migration/370) |
| Base (governance home) | mutual | active | Dec 2024 | SIP3 migrated APW to SPECTRA and moved governance to a Base-first model. | [Spectra Mirror: SPECTRA migration to Base](https://mirror.xyz/spectraprotocol.eth/WlXvGmZL3iPwjRbCbIy1tJqQKfwUlI92F6pRx0_BCow) |
| APWine to Spectra rebrand | outbound | active | Jul 2023 | APWine formally rebranded to Spectra in July 2023. | [Spectra Mirror: rebrand announcement](https://mirror.xyz/spectraprotocol.eth/n168TYwI25kXjAOavf77zWROZvhT8SA3ab2DPu9MAwA) |
| APW token holders | mutual | deprecated | n.a. | The APW token documentation covers the legacy governance token superseded by SPECTRA. | [Spectra docs: APW](https://docs.spectra.finance/tokenomics/apw) |
| YieldNest DAO | mutual | active | Mar 2025 | YieldNest's DAO approved deploying Spectra PT looping strategies for ynETHx. | [YieldNest governance: Max LRT PT looping](https://gov.yieldnest.finance/t/yieldnest-max-lrt-pt-looping/139) |

### Grant, investment or backer

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Greenfield Capital | inbound | active | Nov 2022 | Greenfield led the 2.5 million USD seed extension round for APWine, now Spectra. | [Greenfield Capital: Backing APWine](https://greenfieldcapital.com/publications/page/6/?migrated=1) |
| Seed extension round | inbound | active | Nov 2022 | DefiLlama records a 2.6 million USD seed round on November 14 2022 led by Greenfield Capital. | [DefiLlama: Spectra](https://defillama.com/protocol/spectra) |
| Delphi Ventures | inbound | active | Mar 2021 | Delphi Ventures led APWine's earlier 1 million USD seed round. | [ICO Drops: Spectra](https://icodrops.com/spectra/) |
| Spartan Group | inbound | active | Mar 2021 | The Spartan Group participated in the early APWine seed round. | [Aleare Research: Spectra Finance](https://alearesearch.substack.com/p/spectra-finance-the-first-yield-trading) |
| Rarestone Capital | inbound | active | Mar 2021 | Rarestone Capital participated in the early APWine seed round. | [Aleare Research: Spectra Finance](https://alearesearch.substack.com/p/spectra-finance-the-first-yield-trading) |
| DeFi Alliance | inbound | active | Mar 2021 | DeFi Alliance participated in the early APWine seed round. | [Aleare Research: Spectra Finance](https://alearesearch.substack.com/p/spectra-finance-the-first-yield-trading) |
| Katana KAT program | inbound | active | Oct 2025 | Katana provides KAT reward incentives to Spectra markets on its chain. | [Katana on X: Spectra live on Katana](https://x.com/katana/status/1976292477272224055) |

### Distribution or front end

| Partner | Direction | Status | Since | Description | Source |
|---|---|---|---|---|---|
| Spectra app | outbound | active | n.a. | The Spectra app is the primary front end and aggregates markets across twelve chains. | [Spectra](https://www.spectra.finance/) |
| Curve front end | outbound | active | n.a. | Users can deposit directly into Spectra's Curve pools through Curve's own interface. | [Spectra dev docs: Providing liquidity](https://dev.spectra.finance/guides/providing-liquidity.md) |
| Morpho front end | outbound | active | Jan 2025 | Spectra PT collateral is accessible through Morpho's market interface. | [Morpho: PT-wstUSR/USDC market](https://app.morpho.org/ethereum/market/0xbf4d7952ceeb29d52678172c348b8ef112d6e32413c547cbf56bbf6addcfa13e/pt-wstusr-1740182579-usdc) |
| Merkl Studio | inbound | active | Feb 2026 | Merkl Studio surfaces Spectra MetaVaults as a campaign target for third party incentive programs. | [Merkl: February 2026 recap](https://blog.merkl.xyz/monthly-recap-february-2026-private-campaigns-metamask-airdrop-and-more) |

*No evidenced relationships found for: Custody. These are genuine gaps, not omissions. Render as empty states rather than hiding the category.*

# Implementation notes for M9

**Reciprocity.** A number of these edges are mutual and appear on both sides. Aave and Maple, Maple and Spark, Morpho and Maple, Pendle and Notional, Spectra and Morpho, Gearbox and Pendle, Fluid and Maple. When loading, deduplicate on the pair rather than creating two independent edges, or the graph will double-render them.

**Cross-tag density is the interesting finding.** The Credit sector is far more interconnected than the tag split suggests. Fluid appears in Maple's integration set, Pendle appears in Gearbox's adapter set, Spark routes allocations into Aave, Morpho and Maple. The force-directed view in CAN-86 should default to showing the whole Credit sector with the current entity emphasised, not just that entity's immediate neighbours, because the second-degree structure is where the value sits.

**Significance weighting for node size.** Where a source states a dollar figure, use it. Examples that carry explicit sizing: the Spark to Maple allocation, the Cantor facility, the Morpho syrupUSDC borrow cap, the Euler and Fluid supply caps on Arbitrum, and the Tokenization Grand Prix awards. Everything else should fall back to a categorical weight rather than a fabricated number.

**Deprecated is not noise.** Radiant's rows are largely deprecated following the DAO wind-down, and every Sense row is deprecated after the October 2023 sunset. Keeping them visible and clearly marked is more useful to a credit analyst than an empty tab.

**Known thin spots.** Custody is empty for most protocols, which is accurate rather than a research failure: only Maple publishes qualified custodian relationships. Radiant is thin across the board given the wind-down. Stella's public disclosure largely stops in 2024.
