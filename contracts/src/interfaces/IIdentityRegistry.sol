// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIdentityRegistry
 * @notice ERC-8004 Identity Registry interface. An agent's identity is an
 *         ERC-721 token (`agentId` = tokenId) whose `agentURI` (= tokenURI)
 *         resolves to the agent registration file. Built on OpenZeppelin
 *         `ERC721URIStorage` so ownership/transfer/operator semantics are reused.
 */
interface IIdentityRegistry {
    /// @dev Arbitrary key/value metadata attached to an agent at/after registration.
    struct MetadataEntry {
        string key;
        bytes value;
    }

    /// @notice Emitted once per successful registration.
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);

    /// @notice Emitted when an agent's URI is updated.
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    /// @notice Emitted for each metadata entry set (key is also indexed for filtering).
    event MetadataSet(
        uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue
    );

    /// @notice Register a new agent with a URI and metadata entries.
    function register(string calldata agentURI, MetadataEntry[] calldata metadata)
        external
        returns (uint256 agentId);

    /// @notice Register a new agent with just a URI.
    function register(string calldata agentURI) external returns (uint256 agentId);

    /// @notice Register a new agent with no URI (set later via {setAgentURI}).
    function register() external returns (uint256 agentId);

    /// @notice Update an agent's URI. Owner or approved operator only.
    function setAgentURI(uint256 agentId, string calldata agentURI) external;

    /// @notice Set/overwrite metadata entries. Owner or approved operator only.
    function setMetadata(uint256 agentId, MetadataEntry[] calldata metadata) external;

    /// @notice Read a metadata value for an agent by key.
    function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory);

    /// @notice Total number of registered agents (also the last minted agentId).
    function totalAgents() external view returns (uint256);
}
