// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IReputationRegistry} from "../interfaces/IReputationRegistry.sol";

/**
 * @title ReputationRegistry
 * @notice ERC-8004 Reputation Registry — a per-chain singleton storing signed
 *         fixed-point feedback signals about agents registered in the
 *         {IdentityRegistry}. The score's meaning is intentionally undefined;
 *         off-chain consumers interpret `value`/`valueDecimals`/`tag*`.
 */
contract ReputationRegistry is IReputationRegistry {
    /// @dev Identity Registry whose agentIds this registry references.
    IERC721 public immutable identityRegistry;

    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        bool revoked;
        bytes32 feedbackHash;
    }

    /// @dev agentId => client => feedback entries.
    mapping(uint256 => mapping(address => Feedback[])) private _feedback;

    error InvalidDecimals(uint8 valueDecimals);
    error NonexistentAgent(uint256 agentId);
    error UnknownFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex);
    error AlreadyRevoked(uint256 agentId, address clientAddress, uint64 feedbackIndex);

    constructor(address identityRegistry_) {
        identityRegistry = IERC721(identityRegistry_);
    }

    /// @inheritdoc IReputationRegistry
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external override {
        if (valueDecimals > 18) revert InvalidDecimals(valueDecimals);
        _requireAgent(agentId);

        Feedback[] storage entries = _feedback[agentId][msg.sender];
        uint64 feedbackIndex = uint64(entries.length);
        entries.push(Feedback({value: value, valueDecimals: valueDecimals, revoked: false, feedbackHash: feedbackHash}));

        emit NewFeedback(
            agentId, msg.sender, feedbackIndex, value, valueDecimals, tag1, tag1, tag2, endpoint, feedbackURI, feedbackHash
        );
    }

    /// @inheritdoc IReputationRegistry
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external override {
        Feedback[] storage entries = _feedback[agentId][msg.sender];
        if (feedbackIndex >= entries.length) revert UnknownFeedback(agentId, msg.sender, feedbackIndex);
        if (entries[feedbackIndex].revoked) revert AlreadyRevoked(agentId, msg.sender, feedbackIndex);
        entries[feedbackIndex].revoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /// @inheritdoc IReputationRegistry
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external override {
        if (feedbackIndex >= _feedback[agentId][clientAddress].length) {
            revert UnknownFeedback(agentId, clientAddress, feedbackIndex);
        }
        emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseURI, responseHash);
    }

    /// @inheritdoc IReputationRegistry
    function feedbackCount(uint256 agentId, address clientAddress) external view override returns (uint256) {
        return _feedback[agentId][clientAddress].length;
    }

    /// @notice Read a single feedback entry.
    function getFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex)
        external
        view
        returns (int128 value, uint8 valueDecimals, bool revoked, bytes32 feedbackHash)
    {
        Feedback storage f = _feedback[agentId][clientAddress][feedbackIndex];
        return (f.value, f.valueDecimals, f.revoked, f.feedbackHash);
    }

    /// @dev Reverts if `agentId` is not a minted identity.
    function _requireAgent(uint256 agentId) private view {
        // ownerOf reverts for nonexistent tokens; surface a typed error instead.
        try identityRegistry.ownerOf(agentId) returns (address owner) {
            if (owner == address(0)) revert NonexistentAgent(agentId);
        } catch {
            revert NonexistentAgent(agentId);
        }
    }
}
