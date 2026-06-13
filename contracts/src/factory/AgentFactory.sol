// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {AgentLedger} from "./AgentLedger.sol";

/**
 * @title AgentFactory
 * @notice Deploys one cheap EIP-1167 minimal-proxy {AgentLedger} per agent and is
 *         the on-chain index of the whole agent economy: every
 *         {AgentLedgerDeployed} event log is a permanent, trustless registry
 *         entry mapping an ERC-8004 agentId to its ledger address.
 *
 *         The ledger address is DETERMINISTIC (`Clones.cloneDeterministic` with a
 *         salt derived from the agentId), so anyone can verify (and pre-compute,
 *         via {predictLedger}) agent #N's ledger without trusting an off-chain DB.
 *
 *         This factory ADDS a layer that REFERENCES the existing registries
 *         (Identity / Collab) and the tCNHV token by address — it replaces
 *         nothing; the six existing contracts stay the source of truth for their
 *         domains.
 *
 *         HARD CONSTRAINTS (matching the rest of the CanHav agent stack):
 *           - Arbitrum Sepolia (chainId 421614) ONLY — the constructor reverts on
 *             any other chain.
 *           - Agents never deploy: {createLedger} is {onlyOwner} (the platform
 *             backend / deployer key), never callable autonomously by an agent.
 *           - Holds NO funds.
 */
contract AgentFactory is Ownable {
    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    /// @notice The {AgentLedger} master copy that every per-agent ledger clones.
    address public immutable ledgerImplementation;
    /// @notice The existing ERC-8004 IdentityRegistry (referenced, not modified).
    address public immutable identityRegistry;
    /// @notice The existing CollabRegistry (referenced, not modified).
    address public immutable collabRegistry;
    /// @notice The tCNHV token tallied on each ledger.
    address public immutable cnhvToken;

    /// @notice agentId => deployed ledger clone (address(0) = not created yet).
    mapping(uint256 => address) public ledgerOf;

    /// @notice Addresses allowed to forward {recordWork} (the collab flow). The
    ///         owner is always implicitly authorized. Wired now for the deferred
    ///         collab hook; no live flow calls it yet.
    mapping(address => bool) public isRecorder;

    error WrongNetwork(uint256 chainId);
    error LedgerExists(uint256 agentId, address ledger);
    error NoLedger(uint256 agentId);
    error NotAuthorizedRecorder(address caller);

    event AgentLedgerDeployed(uint256 indexed agentId, address indexed ledger, address indexed owner);
    event RecorderSet(address indexed recorder, bool allowed);

    constructor(
        address ledgerImplementation_,
        address identityRegistry_,
        address collabRegistry_,
        address cnhvToken_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);
        ledgerImplementation = ledgerImplementation_;
        identityRegistry = identityRegistry_;
        collabRegistry = collabRegistry_;
        cnhvToken = cnhvToken_;
    }

    /**
     * @notice Deploy the deterministic ledger clone for an agent and initialize it.
     *         Emits {AgentLedgerDeployed} — the on-chain economy index entry.
     * @param agentId     The agent's ERC-8004 id.
     * @param owner_      The agent owner (human that spawned it).
     * @param agentWallet The agent's operating smart-account wallet.
     * @return ledger     The (deterministic) deployed ledger address.
     */
    function createLedger(uint256 agentId, address owner_, address agentWallet)
        external
        onlyOwner
        returns (address ledger)
    {
        address existing = ledgerOf[agentId];
        if (existing != address(0)) revert LedgerExists(agentId, existing);

        ledger = Clones.cloneDeterministic(ledgerImplementation, _salt(agentId));
        AgentLedger(ledger).initialize(address(this), agentId, owner_, agentWallet);
        ledgerOf[agentId] = ledger;

        emit AgentLedgerDeployed(agentId, ledger, owner_);
    }

    /// @notice Pre-compute an agent's ledger address before it is deployed.
    function predictLedger(uint256 agentId) external view returns (address) {
        return Clones.predictDeterministicAddress(ledgerImplementation, _salt(agentId));
    }

    /// @notice Allowlist (or de-list) a recorder for {recordWork} (collab flow).
    function setRecorder(address recorder, bool allowed) external onlyOwner {
        isRecorder[recorder] = allowed;
        emit RecorderSet(recorder, allowed);
    }

    /**
     * @notice Forward a work record to an agent's ledger. Centralizes the
     *         ledger's write access control here: callable by the owner or an
     *         allowlisted recorder (the collab settlement path, once wired).
     */
    function recordWork(uint256 agentId, uint256 counterpartyAgentId, uint256 cnhvDelta, bool earned, uint256 gasWei)
        external
    {
        if (msg.sender != owner() && !isRecorder[msg.sender]) {
            revert NotAuthorizedRecorder(msg.sender);
        }
        address ledger = ledgerOf[agentId];
        if (ledger == address(0)) revert NoLedger(agentId);
        AgentLedger(ledger).recordWork(counterpartyAgentId, cnhvDelta, earned, gasWei);
    }

    /// @dev Deterministic salt per agent — pre-knowable, collision-free per id.
    function _salt(uint256 agentId) internal pure returns (bytes32) {
        return keccak256(abi.encode(agentId));
    }
}
