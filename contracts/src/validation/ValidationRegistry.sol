// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IValidationRegistry} from "../interfaces/IValidationRegistry.sol";

/**
 * @title ValidationRegistry
 * @notice ERC-8004 Validation Registry — a per-chain singleton that tracks
 *         validation requests and validator responses keyed by `requestHash`.
 */
contract ValidationRegistry is IValidationRegistry {
    /// @dev Identity Registry whose agentIds this registry references.
    IERC721 public immutable identityRegistry;

    struct Request {
        address validatorAddress;
        uint256 agentId;
        bool responded;
    }

    /// @dev requestHash => request.
    mapping(bytes32 => Request) private _requests;

    error NonexistentAgent(uint256 agentId);
    error ZeroValidator();
    error DuplicateRequest(bytes32 requestHash);
    error UnknownRequest(bytes32 requestHash);
    error NotValidator(bytes32 requestHash, address caller);
    error AlreadyResponded(bytes32 requestHash);
    error ResponseOutOfRange(uint8 response);

    constructor(address identityRegistry_) {
        identityRegistry = IERC721(identityRegistry_);
    }

    /// @inheritdoc IValidationRegistry
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external override {
        if (validatorAddress == address(0)) revert ZeroValidator();
        if (_requests[requestHash].validatorAddress != address(0)) revert DuplicateRequest(requestHash);
        _requireAgent(agentId);

        _requests[requestHash] = Request({validatorAddress: validatorAddress, agentId: agentId, responded: false});
        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    /// @inheritdoc IValidationRegistry
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external override {
        Request storage req = _requests[requestHash];
        if (req.validatorAddress == address(0)) revert UnknownRequest(requestHash);
        if (msg.sender != req.validatorAddress) revert NotValidator(requestHash, msg.sender);
        if (req.responded) revert AlreadyResponded(requestHash);
        if (response > 100) revert ResponseOutOfRange(response);

        req.responded = true;
        emit ValidationResponse(req.validatorAddress, req.agentId, requestHash, response, responseURI, responseHash, tag);
    }

    /// @notice Read a stored request.
    function getRequest(bytes32 requestHash)
        external
        view
        returns (address validatorAddress, uint256 agentId, bool responded)
    {
        Request storage req = _requests[requestHash];
        return (req.validatorAddress, req.agentId, req.responded);
    }

    function _requireAgent(uint256 agentId) private view {
        try identityRegistry.ownerOf(agentId) returns (address owner) {
            if (owner == address(0)) revert NonexistentAgent(agentId);
        } catch {
            revert NonexistentAgent(agentId);
        }
    }
}
