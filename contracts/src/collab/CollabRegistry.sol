// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CollabRegistry
 * @notice Append-only, on-chain attestation log for agent-to-agent
 *         collaborations on CanHav. After a buyer agent pays a seller agent (in
 *         testnet USDC, x402-style) and ingests the returned StrategyPacket, the
 *         exchange is recorded here so it is independently auditable.
 *
 *         Each record now carries the interaction `units` (the magnitude of the
 *         knowledge slice exchanged — the "how much work / data" the human
 *         parties agreed to) and the `agreementId` it belongs to, so the
 *         on-chain log proves not just THAT an exchange happened but HOW BIG it
 *         was and under which human-approved agreement.
 *
 *         HARD CONSTRAINTS (matching the rest of the CanHav agent stack):
 *           - Arbitrum Sepolia (chainId 421614) ONLY — the constructor reverts on
 *             any other chain, so this can never be deployed to mainnet.
 *           - Holds NO funds: no `payable`, no token logic, no withdrawals. It is
 *             a pure event/record store.
 *           - Each `paymentRef` (the settling USDC transfer tx hash) records at
 *             most once, an on-chain twin of the off-chain replay guard.
 */
contract CollabRegistry {
    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    struct Collab {
        uint256 fromAgentId;
        uint256 toAgentId;
        bytes32 skillHash;
        bytes32 paymentRef;
        bytes32 agreementId;
        uint32 units;
        address recorder;
        uint64 timestamp;
    }

    Collab[] private _collabs;

    /// @notice Whether a payment reference has already been recorded (replay guard).
    mapping(bytes32 => bool) public paymentRefUsed;

    /// @notice Cumulative units recorded under an agreement (anti-extraction trail).
    mapping(bytes32 => uint256) public unitsByAgreement;

    /// @notice Number of recorded interactions under an agreement.
    mapping(bytes32 => uint256) public interactionsByAgreement;

    error WrongNetwork(uint256 chainId);
    error ZeroPaymentRef();
    error ZeroUnits();
    error PaymentRefAlreadyRecorded(bytes32 paymentRef);

    event CollabRecorded(
        uint256 indexed collabId,
        uint256 indexed fromAgentId,
        uint256 indexed toAgentId,
        bytes32 skillHash,
        bytes32 paymentRef,
        bytes32 agreementId,
        uint32 units,
        address recorder
    );

    constructor() {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);
    }

    /**
     * @notice Record a completed collaboration. Typically called by the buyer
     *         agent's smart account (gated off-chain by the SecurityRegistry
     *         allowlist before the userOp is sent).
     * @param fromAgentId The buyer (paying) agent's ERC-8004 id.
     * @param toAgentId   The seller (producing) agent's ERC-8004 id.
     * @param skillHash   keccak256 of the skill Markdown (matches the packet).
     * @param paymentRef  The settling USDC transfer tx hash (bytes32).
     * @param agreementId The off-chain/on-chain agreement this interaction
     *                    belongs to (bytes32(0) for a one-off exchange).
     * @param units       The interaction magnitude (data slices / knowledge units
     *                    exchanged); must be non-zero.
     * @return collabId   The index of the new record.
     */
    function recordCollab(
        uint256 fromAgentId,
        uint256 toAgentId,
        bytes32 skillHash,
        bytes32 paymentRef,
        bytes32 agreementId,
        uint32 units
    ) external returns (uint256 collabId) {
        if (paymentRef == bytes32(0)) revert ZeroPaymentRef();
        if (units == 0) revert ZeroUnits();
        if (paymentRefUsed[paymentRef]) revert PaymentRefAlreadyRecorded(paymentRef);
        paymentRefUsed[paymentRef] = true;

        collabId = _collabs.length;
        _collabs.push(
            Collab({
                fromAgentId: fromAgentId,
                toAgentId: toAgentId,
                skillHash: skillHash,
                paymentRef: paymentRef,
                agreementId: agreementId,
                units: units,
                recorder: msg.sender,
                timestamp: uint64(block.timestamp)
            })
        );

        if (agreementId != bytes32(0)) {
            unitsByAgreement[agreementId] += units;
            interactionsByAgreement[agreementId] += 1;
        }

        emit CollabRecorded(
            collabId, fromAgentId, toAgentId, skillHash, paymentRef, agreementId, units, msg.sender
        );
    }

    /// @notice Read a single recorded collaboration by id.
    function getCollab(uint256 collabId)
        external
        view
        returns (
            uint256 fromAgentId,
            uint256 toAgentId,
            bytes32 skillHash,
            bytes32 paymentRef,
            bytes32 agreementId,
            uint32 units,
            address recorder,
            uint64 timestamp
        )
    {
        Collab storage c = _collabs[collabId];
        return (
            c.fromAgentId,
            c.toAgentId,
            c.skillHash,
            c.paymentRef,
            c.agreementId,
            c.units,
            c.recorder,
            c.timestamp
        );
    }

    /// @notice Total number of recorded collaborations.
    function collabCount() external view returns (uint256) {
        return _collabs.length;
    }
}
