// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISecurityRegistry} from "../interfaces/ISecurityRegistry.sol";

/**
 * @title SecurityRegistry
 * @notice Owner-curated allowlist of audited/verified protocol contracts.
 *
 *         This is the single source of truth for:
 *           1. The OZ-derived security badge rendered on every protocol page.
 *           2. Agent gating — the `agent-service` executor calls {isAllowed}
 *              before letting an agent interact with any contract, so agents are
 *              gated from unaudited/unverified contracts.
 *
 *         Built on OpenZeppelin `Ownable`; only the owner (CanHav governance /
 *         deployer) can change statuses.
 */
contract SecurityRegistry is Ownable, ISecurityRegistry {
    struct Record {
        SecurityStatus status;
        string auditURI;
        uint64 updatedAt;
    }

    mapping(address => Record) private _records;

    error ZeroTarget();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @inheritdoc ISecurityRegistry
    function setStatus(address target, SecurityStatus status, string calldata auditURI) external override onlyOwner {
        if (target == address(0)) revert ZeroTarget();
        _records[target] = Record({status: status, auditURI: auditURI, updatedAt: uint64(block.timestamp)});
        emit StatusSet(target, status, auditURI, msg.sender);
    }

    /// @notice Batch variant of {setStatus}.
    function setStatusBatch(address[] calldata targets, SecurityStatus[] calldata statuses, string[] calldata auditURIs)
        external
        onlyOwner
    {
        uint256 len = targets.length;
        require(len == statuses.length && len == auditURIs.length, "length mismatch");
        for (uint256 i = 0; i < len; ++i) {
            address target = targets[i];
            if (target == address(0)) revert ZeroTarget();
            _records[target] =
                Record({status: statuses[i], auditURI: auditURIs[i], updatedAt: uint64(block.timestamp)});
            emit StatusSet(target, statuses[i], auditURIs[i], msg.sender);
        }
    }

    /// @inheritdoc ISecurityRegistry
    function remove(address target) external override onlyOwner {
        delete _records[target];
        emit Removed(target, msg.sender);
    }

    /// @inheritdoc ISecurityRegistry
    function statusOf(address target) external view override returns (SecurityStatus) {
        return _records[target].status;
    }

    /// @inheritdoc ISecurityRegistry
    function isAllowed(address target) external view override returns (bool) {
        SecurityStatus status = _records[target].status;
        return status == SecurityStatus.Audited || status == SecurityStatus.Verified;
    }

    /// @notice Full record (status, auditURI, updatedAt) for a target.
    function recordOf(address target)
        external
        view
        returns (SecurityStatus status, string memory auditURI, uint64 updatedAt)
    {
        Record storage r = _records[target];
        return (r.status, r.auditURI, r.updatedAt);
    }
}
