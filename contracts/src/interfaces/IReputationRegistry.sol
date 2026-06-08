// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReputationRegistry
 * @notice ERC-8004 Reputation Registry interface. Any address may post a signed
 *         fixed-point feedback signal about an agent. Scoring/aggregation is left
 *         to off-chain consumers; this contract is the on-chain primitive.
 */
interface IReputationRegistry {
    /// @notice Emitted when feedback is posted for an agent.
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    /// @notice Emitted when a client revokes one of their feedback entries.
    event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);

    /// @notice Emitted when a responder appends a response to a feedback entry.
    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
    );

    /// @notice Post feedback about `agentId`. `valueDecimals` must be 0..18.
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;

    /// @notice Revoke a feedback entry previously posted by the caller.
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

    /// @notice Append a response (e.g. from the agent owner) to a feedback entry.
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external;

    /// @notice Number of feedback entries a client has posted for an agent.
    function feedbackCount(uint256 agentId, address clientAddress) external view returns (uint256);
}
