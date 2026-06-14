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
 *           - reverts once the agreed number of periods (`installments`) are
 *             exhausted (the anti-extraction limit),
 *           - reverts if the per-period call budget is exhausted (the cooldown,
 *             in legacy "one call per period" mode), or the per-period token
 *             budget would be exceeded (the chatbot-style allowance),
 *           - reverts if the agreement expired or is no longer active.
 *
 *         Richer terms (the chosen seller job, the Dune dashboard link, the full
 *         human-readable detail) live off-chain but are committed here via
 *         `termsHash` (keccak of the canonical terms JSON), so the on-chain
 *         record verifies the complete agreement, not just the numeric caps.
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
        uint256 consumedUnits;
        uint256 pricePerInstallment;
        // Per-period token allowance (0 = unlimited) + running tally for the period.
        uint256 tokenBudgetPerPeriod;
        uint256 periodTokens;
        // keccak of the canonical off-chain terms JSON (the full-terms commitment).
        bytes32 termsHash;
        uint32 maxUnitsPerInteraction;
        // Number of agreed periods (a.k.a. installments / check-ins).
        uint32 installments;
        // Total interactions recorded across all periods.
        uint32 consumedInstallments;
        // Max calls allowed within one period (0 = one call per period / cooldown-gated).
        uint32 callBudgetPerPeriod;
        // Updates the seller commits to deliver per period (informational).
        uint32 updatesPerPeriod;
        // 0-based index of the current period + calls consumed within it.
        uint32 periodIndex;
        uint32 periodCalls;
        uint64 minInteractionInterval;
        uint64 lastInteractionAt;
        uint64 expiry;
        // When the current period opened (drives per-period budget rollover).
        uint64 periodStartedAt;
        address establisher;
        Status status;
        Mode mode;
        Cadence cadence;
        // Whether the deliverable is connected to a Dune dashboard.
        bool duneLinked;
    }

    /// @notice Calldata bundle for {establish} — a struct to dodge stack limits.
    struct EstablishParams {
        uint256 buyerAgentId;
        uint256 sellerAgentId;
        uint32 maxUnitsPerInteraction;
        uint32 installments;
        uint256 pricePerInstallment;
        uint64 minInteractionInterval;
        uint64 expiry;
        Mode mode;
        Cadence cadence;
        uint32 callBudgetPerPeriod;
        uint256 tokenBudgetPerPeriod;
        uint32 updatesPerPeriod;
        bool duneLinked;
        bytes32 termsHash;
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
    error CallBudgetExceeded(uint32 callBudgetPerPeriod);
    error TokenBudgetExceeded(uint256 tokenBudgetPerPeriod, uint256 attempted);

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
        Cadence cadence,
        uint32 callBudgetPerPeriod,
        uint256 tokenBudgetPerPeriod,
        uint32 updatesPerPeriod,
        bool duneLinked,
        bytes32 termsHash
    );

    event InteractionRecorded(
        bytes32 indexed agreementId,
        uint32 periodIndex,
        uint32 units,
        uint256 tokens,
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
     * @param p Bundled agreement terms. `p.expiry` is unix seconds after which
     *          the agreement can no longer be used (0 for no expiry); `p.termsHash`
     *          commits to the full off-chain terms (chosen job, Dune url, etc.).
     * @return agreementId Deterministic id for the new agreement.
     */
    function establish(EstablishParams calldata p) external returns (bytes32 agreementId) {
        if (p.maxUnitsPerInteraction == 0) revert ZeroMaxUnits();
        if (p.installments == 0) revert ZeroInstallments();

        agreementId = keccak256(
            abi.encode(msg.sender, p.buyerAgentId, p.sellerAgentId, _nonce++, block.chainid)
        );

        _agreements[agreementId] = Agreement({
            buyerAgentId: p.buyerAgentId,
            sellerAgentId: p.sellerAgentId,
            consumedUnits: 0,
            pricePerInstallment: p.pricePerInstallment,
            tokenBudgetPerPeriod: p.tokenBudgetPerPeriod,
            periodTokens: 0,
            termsHash: p.termsHash,
            maxUnitsPerInteraction: p.maxUnitsPerInteraction,
            installments: p.installments,
            consumedInstallments: 0,
            callBudgetPerPeriod: p.callBudgetPerPeriod,
            updatesPerPeriod: p.updatesPerPeriod,
            periodIndex: 0,
            periodCalls: 0,
            minInteractionInterval: p.minInteractionInterval,
            lastInteractionAt: 0,
            expiry: p.expiry,
            periodStartedAt: 0,
            establisher: msg.sender,
            status: Status.Active,
            mode: p.mode,
            cadence: p.cadence,
            duneLinked: p.duneLinked
        });
        _count += 1;

        emit AgreementEstablished(
            agreementId,
            p.buyerAgentId,
            p.sellerAgentId,
            p.maxUnitsPerInteraction,
            p.installments,
            p.pricePerInstallment,
            p.minInteractionInterval,
            p.expiry,
            msg.sender,
            p.mode,
            p.cadence,
            p.callBudgetPerPeriod,
            p.tokenBudgetPerPeriod,
            p.updatesPerPeriod,
            p.duneLinked,
            p.termsHash
        );
    }

    /**
     * @notice Record one interaction against an agreement, enforcing the
     *         human-agreed ceiling and the anti-extraction limits on-chain.
     * @param agreementId The agreement to charge against.
     * @param units       Interaction magnitude; must be 0 < units <= max.
     * @param tokens      Tokens/credits drawn this call (checked against the
     *                    per-period token budget; pass 0 when not metered).
     */
    function recordInteraction(bytes32 agreementId, uint32 units, uint256 tokens) external {
        Agreement storage a = _agreements[agreementId];
        if (a.status != Status.Active) revert AgreementNotActive(agreementId);
        if (msg.sender != a.establisher) revert NotEstablisher(agreementId);
        if (a.expiry != 0 && block.timestamp > a.expiry) revert AgreementExpired(agreementId);
        if (units == 0) revert ZeroUnits();
        if (units > a.maxUnitsPerInteraction) {
            revert UnitsExceedMax(units, a.maxUnitsPerInteraction);
        }

        // Resolve the active period: roll forward (resetting per-period budgets)
        // once the cooldown window has elapsed since the period opened.
        bool firstEver = a.periodStartedAt == 0;
        bool rolled = firstEver;
        if (!firstEver && a.minInteractionInterval != 0) {
            if (block.timestamp >= a.periodStartedAt + a.minInteractionInterval) {
                rolled = true;
            }
        }
        uint32 periodIndex = rolled && !firstEver ? a.periodIndex + 1 : a.periodIndex;
        if (periodIndex >= a.installments) revert InstallmentsExhausted(agreementId);

        uint32 periodCalls = rolled ? 0 : a.periodCalls;
        uint256 periodTokens = rolled ? 0 : a.periodTokens;

        // Per-period call budget (0 => exactly one call per period: the cooldown).
        uint32 callCeiling = a.callBudgetPerPeriod > 0 ? a.callBudgetPerPeriod : 1;
        if (periodCalls >= callCeiling) {
            if (a.callBudgetPerPeriod > 0) revert CallBudgetExceeded(a.callBudgetPerPeriod);
            revert CooldownActive(a.periodStartedAt + a.minInteractionInterval);
        }

        // Per-period token budget (the chatbot-style allowance).
        if (a.tokenBudgetPerPeriod != 0 && periodTokens + tokens > a.tokenBudgetPerPeriod) {
            revert TokenBudgetExceeded(a.tokenBudgetPerPeriod, periodTokens + tokens);
        }

        // Commit the resolved period.
        if (rolled) {
            a.periodIndex = periodIndex;
            a.periodStartedAt = uint64(block.timestamp);
            a.periodCalls = 1;
            a.periodTokens = tokens;
        } else {
            a.periodCalls = periodCalls + 1;
            a.periodTokens = periodTokens + tokens;
        }
        a.consumedInstallments += 1;
        a.consumedUnits += units;
        a.lastInteractionAt = uint64(block.timestamp);

        // Completed once the final period's call budget is fully consumed.
        if (periodIndex >= a.installments - 1 && a.periodCalls >= callCeiling) {
            a.status = Status.Completed;
        }

        emit InteractionRecorded(agreementId, periodIndex, units, tokens, a.consumedUnits, a.status);
    }

    /// @notice Cancel an active agreement (only the establisher).
    function cancel(bytes32 agreementId) external {
        Agreement storage a = _agreements[agreementId];
        if (a.status != Status.Active) revert AgreementNotActive(agreementId);
        if (msg.sender != a.establisher) revert NotEstablisher(agreementId);
        a.status = Status.Cancelled;
        emit AgreementCancelled(agreementId, msg.sender);
    }

    /// @notice Read an agreement's full state (the whole struct).
    function getAgreement(bytes32 agreementId) external view returns (Agreement memory) {
        return _agreements[agreementId];
    }

    /// @notice Remaining PERIODS not yet entered (the current in-progress period
    ///         counts as started). 0 once completed/cancelled or all entered.
    function remainingInstallments(bytes32 agreementId) external view returns (uint32) {
        Agreement storage a = _agreements[agreementId];
        if (a.status != Status.Active) return 0;
        uint32 started = a.periodStartedAt == 0 ? 0 : a.periodIndex + 1;
        if (started >= a.installments) return 0;
        return a.installments - started;
    }

    /// @notice Total number of agreements established.
    function agreementCount() external view returns (uint256) {
        return _count;
    }
}
