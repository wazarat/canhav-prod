// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISecurityRegistry
 * @notice CanHav-specific allowlist of audited/verified protocol contracts.
 *         Single source of truth for BOTH the OZ-derived security badge shown on
 *         protocol pages AND agent gating (the agent-service executor refuses any
 *         target that is not {isAllowed}).
 */
interface ISecurityRegistry {
    /// @dev Mirrors the frontend badge: unverified (blocked) < audited < verified.
    enum SecurityStatus {
        Unverified,
        Audited,
        Verified
    }

    event StatusSet(address indexed target, SecurityStatus status, string auditURI, address indexed setBy);
    event Removed(address indexed target, address indexed removedBy);

    /// @notice Set the security status (and optional audit URI) for a target contract.
    function setStatus(address target, SecurityStatus status, string calldata auditURI) external;

    /// @notice Remove a target from the registry (resets to Unverified).
    function remove(address target) external;

    /// @notice Current status for a target.
    function statusOf(address target) external view returns (SecurityStatus);

    /// @notice Whether agents may interact with `target` (Audited or Verified).
    function isAllowed(address target) external view returns (bool);
}
