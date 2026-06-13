// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CollabAgreement
 * @notice On-chain anchor + enforcer for human-approved agent collaboration
 *         agreements on CanHav. A buyer and a seller (both humans, off-chain)
 *         pre-agree on a ceiling: the maximum interaction `units` per exchange,
 *         the number of `installments` (max interactions), the price per
 *         installment, an optional cooldown between interactions, and an
 *         optional expiry. Those terms are recorded here and ENFORCED on-chain:
 *
 *           - `recordInteraction` reverts if `units > maxUnitsPerInteraction`
 *             (the human-agreed per-interaction ceiling),
 *           - reverts once `installments` are exhausted (the anti-extraction
 *             limit: the buyer can never drain more than the agreed total),
 *           - reverts if the cooldown has not elapsed, or the agreement expired
 *             or is no longer active.
 *
 *         This is the on-chain proof that the magnitude of every agent-to-agent
 *         exchange stayed within bounds both parties signed off on — real work
 *         recorded on Arbitrum Sepolia, not in the LLM.
 *
 *         HARD CONSTRAINTS (matching the CanHav agent stack):
 *           - Arbitrum Sepolia (chainId 421614) ONLY — constructor reverts
 *             otherwise, so it can never reach mainnet.
 *           - Holds NO funds: no `payable`, no token logic, no withdrawals.
 */
contract CollabAgreement {
    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    enum Status {
        None,
        Active,
        Completed,
        Cancelled
    }

    /// @notice Single task vs a recurring engagement (the human-chosen shape).
    enum Mode {
        OneTime,
        Recurring
    }

    /// @notice Recurring cadence; informs the cooldown the buyer agreed to.
    enum Cadence {
        None,
        Daily,
        Weekly,
        Monthly
    }

    struct Agreement {
        uint256 buyerAgentId;
        uint256 sellerAgentId;
        uint32 maxUnitsPerInteraction;
        uint32 installments;
        uint32 consumedInstallments;
        uint256 consumedUnits;
        uint256 pricePerInstallment;
        uint64 minInteractionInterval;
        uint64 lastInteractionAt;
        uint64 expiry;
        address establisher;
        Status status;
        Mode mode;
        Cadence cadence;
    }

    mapping(bytes32 => Agreement) private _agreements;
    uint256 private _nonce;
    uint256 private _count;

    error WrongNetwork(uint256 chainId);
    error ZeroMaxUnits();
    error ZeroInstallments();
    error AgreementNotActive(bytes32 agreementId);
    error AgreementExpired(bytes32 agreementId);
    error NotEstablisher(bytes32 agreementId);
    error UnitsExceedMax(uint32 units, uint32 maxUnits);
    error ZeroUnits();
    error InstallmentsExhausted(bytes32 agreementId);
    error CooldownActive(uint64 availableAt);

    event AgreementEstablished(
        bytes32 indexed agreementId,
        uint256 indexed buyerAgentId,
        uint256 indexed sellerAgentId,
        uint32 maxUnitsPerInteraction,
        uint32 installments,
        uint256 pricePerInstallment,
        uint64 minInteractionInterval,
        uint64 expiry,
        address establisher,
        Mode mode,
        Cadence cadence
    );

    event InteractionRecorded(
        bytes32 indexed agreementId,
        uint32 installmentIndex,
        uint32 units,
        uint256 consumedUnits,
        Status status
    );

    event AgreementCancelled(bytes32 indexed agreementId, address by);

    constructor() {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);
    }

    /**
     * @notice Record a human-approved agreement on-chain. Called once both
     *         parties have approved off-chain; the caller (the establishing
     *         smart account) becomes the only party allowed to record
     *         interactions and cancel.
     * @param expiry Unix seconds after which the agreement can no longer be
     *               used; pass 0 for no expiry.
     * @return agreementId Deterministic id for the new agreement.
     */
    function establish(
        uint256 buyerAgentId,
        uint256 sellerAgentId,
        uint32 maxUnitsPerInteraction,
        uint32 installments,
        uint256 pricePerInstallment,
        uint64 minInteractionInterval,
        uint64 expiry,
        Mode mode,
        Cadence cadence
    ) external returns (bytes32 agreementId) {
        if (maxUnitsPerInteraction == 0) revert ZeroMaxUnits();
        if (installments == 0) revert ZeroInstallments();

        agreementId = keccak256(
            abi.encode(msg.sender, buyerAgentId, sellerAgentId, _nonce++, block.chainid)
        );

        _agreements[agreementId] = Agreement({
            buyerAgentId: buyerAgentId,
            sellerAgentId: sellerAgentId,
            maxUnitsPerInteraction: maxUnitsPerInteraction,
            installments: installments,
            consumedInstallments: 0,
            consumedUnits: 0,
            pricePerInstallment: pricePerInstallment,
            minInteractionInterval: minInteractionInterval,
            lastInteractionAt: 0,
            expiry: expiry,
            establisher: msg.sender,
            status: Status.Active,
            mode: mode,
            cadence: cadence
        });
        _count += 1;

        emit AgreementEstablished(
            agreementId,
            buyerAgentId,
            sellerAgentId,
            maxUnitsPerInteraction,
            installments,
            pricePerInstallment,
            minInteractionInterval,
            expiry,
            msg.sender,
            mode,
            cadence
        );
    }

    /**
     * @notice Record one interaction against an agreement, enforcing the
     *         human-agreed ceiling and the anti-extraction limits on-chain.
     * @param agreementId The agreement to charge against.
     * @param units       Interaction magnitude; must be 0 < units <= max.
     */
    function recordInteraction(bytes32 agreementId, uint32 units) external {
        Agreement storage a = _agreements[agreementId];
        if (a.status != Status.Active) revert AgreementNotActive(agreementId);
        if (msg.sender != a.establisher) revert NotEstablisher(agreementId);
        if (a.expiry != 0 && block.timestamp > a.expiry) revert AgreementExpired(agreementId);
        if (units == 0) revert ZeroUnits();
        if (units > a.maxUnitsPerInteraction) {
            revert UnitsExceedMax(units, a.maxUnitsPerInteraction);
        }
        if (a.consumedInstallments >= a.installments) revert InstallmentsExhausted(agreementId);

        if (a.minInteractionInterval != 0 && a.lastInteractionAt != 0) {
            uint64 availableAt = a.lastInteractionAt + a.minInteractionInterval;
            if (block.timestamp < availableAt) revert CooldownActive(availableAt);
        }

        uint32 installmentIndex = a.consumedInstallments;
        a.consumedInstallments = installmentIndex + 1;
        a.consumedUnits += units;
        a.lastInteractionAt = uint64(block.timestamp);

        if (a.consumedInstallments >= a.installments) {
            a.status = Status.Completed;
        }

        emit InteractionRecorded(agreementId, installmentIndex, units, a.consumedUnits, a.status);
    }

    /// @notice Cancel an active agreement (only the establisher).
    function cancel(bytes32 agreementId) external {
        Agreement storage a = _agreements[agreementId];
        if (a.status != Status.Active) revert AgreementNotActive(agreementId);
        if (msg.sender != a.establisher) revert NotEstablisher(agreementId);
        a.status = Status.Cancelled;
        emit AgreementCancelled(agreementId, msg.sender);
    }

    /// @notice Read an agreement's full state.
    function getAgreement(bytes32 agreementId)
        external
        view
        returns (
            uint256 buyerAgentId,
            uint256 sellerAgentId,
            uint32 maxUnitsPerInteraction,
            uint32 installments,
            uint32 consumedInstallments,
            uint256 consumedUnits,
            uint256 pricePerInstallment,
            uint64 minInteractionInterval,
            uint64 lastInteractionAt,
            uint64 expiry,
            address establisher,
            Status status,
            Mode mode,
            Cadence cadence
        )
    {
        Agreement storage a = _agreements[agreementId];
        return (
            a.buyerAgentId,
            a.sellerAgentId,
            a.maxUnitsPerInteraction,
            a.installments,
            a.consumedInstallments,
            a.consumedUnits,
            a.pricePerInstallment,
            a.minInteractionInterval,
            a.lastInteractionAt,
            a.expiry,
            a.establisher,
            a.status,
            a.mode,
            a.cadence
        );
    }

    /// @notice Remaining interactions allowed under an agreement.
    function remainingInstallments(bytes32 agreementId) external view returns (uint32) {
        Agreement storage a = _agreements[agreementId];
        if (a.status != Status.Active) return 0;
        if (a.consumedInstallments >= a.installments) return 0;
        return a.installments - a.consumedInstallments;
    }

    /// @notice Total number of agreements established.
    function agreementCount() external view returns (uint256) {
        return _count;
    }
}
