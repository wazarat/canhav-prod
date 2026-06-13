// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title AgentLedger
 * @notice A per-agent, on-chain scorecard — one cheap EIP-1167 minimal-proxy
 *         clone is deployed per agent by {AgentFactory}. It tallies each agent's
 *         work (collaborations), tCNHV flow (earned vs spent), cost (gas), and
 *         counterparties, giving an objective, hard-to-game performance record
 *         derived purely from behavior — no ratings required.
 *
 *         Clones cannot run constructors, so state is set in {initialize} (guarded
 *         by OpenZeppelin {Initializable}). The deployed master copy disables its
 *         own initializers and is never used directly.
 *
 *         HARD CONSTRAINTS (matching the rest of the CanHav agent stack):
 *           - Arbitrum Sepolia (chainId 421614) ONLY — both the master constructor
 *             and every clone's {initialize} revert on any other chain.
 *           - Holds NO user funds: no token logic, no withdrawals, no `payable`.
 *             It is a pure tally + read store.
 *           - Writes are gated to the factory (which itself gates to the platform
 *             owner / an allowlisted recorder).
 */
contract AgentLedger is Initializable {
    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    /// @dev Basis-points denominator for {repeatRate}.
    uint256 internal constant BPS = 10_000;

    /// @notice Snapshot of every tally, returned by {stats}.
    struct LedgerStats {
        uint256 agentId;
        address owner;
        address agentWallet;
        uint64 firstSeen;
        uint64 lastActive;
        uint256 collabCount;
        uint256 cnhvEarned;
        uint256 cnhvSpent;
        uint256 totalGasSpentWei;
        uint256 uniqueCounterparties;
        uint256 repeatCounterparties;
    }

    /// @notice The factory that deployed this ledger (the only writer).
    address public factory;
    /// @notice The agent's ERC-8004 id this ledger scores.
    uint256 public agentId;
    /// @notice The agent owner (the human that spawned it).
    address public agentOwner;
    /// @notice The agent's operating smart-account wallet.
    address public agentWallet;

    /// @notice First time this ledger recorded the agent (clone deploy time).
    uint64 public firstSeen;
    /// @notice Most recent recorded activity.
    uint64 public lastActive;

    /// @notice Number of recorded collaborations.
    uint256 public collabCount;
    /// @notice Cumulative tCNHV the agent earned (sold StrategyPackets).
    uint256 public cnhvEarned;
    /// @notice Cumulative tCNHV the agent spent (bought StrategyPackets).
    uint256 public cnhvSpent;
    /// @notice Cumulative gas (wei) spent doing work — the cost of its output.
    uint256 public totalGasSpentWei;

    /// @notice Distinct counterparties seen.
    uint256 public uniqueCounterparties;
    /// @notice Counterparties seen more than once (came back).
    uint256 public repeatCounterparties;

    /// @notice agentId => number of collaborations with that counterparty.
    mapping(uint256 => uint256) public collabsWithCounterparty;

    error WrongNetwork(uint256 chainId);
    error OnlyFactory(address caller);

    event WorkRecorded(uint256 indexed counterpartyAgentId, uint256 cnhvDelta, bool earned, uint256 gasWei);

    constructor() {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);
        // The master copy is a pure template — never initialize it directly.
        _disableInitializers();
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory(msg.sender);
        _;
    }

    /**
     * @notice One-time clone initializer (replaces the constructor). Called by
     *         {AgentFactory.createLedger} immediately after cloning.
     */
    function initialize(address factory_, uint256 agentId_, address owner_, address agentWallet_)
        external
        initializer
    {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);
        factory = factory_;
        agentId = agentId_;
        agentOwner = owner_;
        agentWallet = agentWallet_;
        firstSeen = uint64(block.timestamp);
        lastActive = uint64(block.timestamp);
    }

    /**
     * @notice Record one unit of work for this agent. Tallies the collaboration,
     *         the tCNHV moved (earned vs spent), the gas cost, and the
     *         counterparty (tracking unique vs repeat). Factory-gated.
     * @param counterpartyAgentId The other agent in the collaboration.
     * @param cnhvDelta           tCNHV amount moved in this collaboration.
     * @param earned              True if this agent earned (sold); false if spent.
     * @param gasWei              Gas (wei) this agent spent producing the work.
     */
    function recordWork(uint256 counterpartyAgentId, uint256 cnhvDelta, bool earned, uint256 gasWei)
        external
        onlyFactory
    {
        collabCount += 1;
        if (earned) {
            cnhvEarned += cnhvDelta;
        } else {
            cnhvSpent += cnhvDelta;
        }
        totalGasSpentWei += gasWei;
        lastActive = uint64(block.timestamp);

        uint256 prior = collabsWithCounterparty[counterpartyAgentId];
        collabsWithCounterparty[counterpartyAgentId] = prior + 1;
        if (prior == 0) {
            uniqueCounterparties += 1;
        } else if (prior == 1) {
            // First time this counterparty becomes a repeat.
            repeatCounterparties += 1;
        }

        emit WorkRecorded(counterpartyAgentId, cnhvDelta, earned, gasWei);
    }

    /* --------------------------------------------------------------------- */
    /* Read-only views (consumed by the UI + future reputation)              */
    /* --------------------------------------------------------------------- */

    /// @notice Snapshot of all tallies in one call.
    function stats() external view returns (LedgerStats memory) {
        return LedgerStats({
            agentId: agentId,
            owner: agentOwner,
            agentWallet: agentWallet,
            firstSeen: firstSeen,
            lastActive: lastActive,
            collabCount: collabCount,
            cnhvEarned: cnhvEarned,
            cnhvSpent: cnhvSpent,
            totalGasSpentWei: totalGasSpentWei,
            uniqueCounterparties: uniqueCounterparties,
            repeatCounterparties: repeatCounterparties
        });
    }

    /// @notice Average tCNHV earned per collaboration (0 when none yet).
    function earnedPerCollab() external view returns (uint256) {
        if (collabCount == 0) return 0;
        return cnhvEarned / collabCount;
    }

    /// @notice Average gas (wei) cost per collaboration (0 when none yet).
    function costPerCollab() external view returns (uint256) {
        if (collabCount == 0) return 0;
        return totalGasSpentWei / collabCount;
    }

    /// @notice Net tCNHV flow (earned − spent). Positive => net producer.
    function netFlow() external view returns (int256) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return int256(cnhvEarned) - int256(cnhvSpent);
    }

    /// @notice Share of counterparties that came back, in basis points (0–10000).
    function repeatRate() external view returns (uint256) {
        if (uniqueCounterparties == 0) return 0;
        return (repeatCounterparties * BPS) / uniqueCounterparties;
    }
}
