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
        string metadataKey;
        bytes metadataValue;
    }

    /// @notice Emitted once per successful registration.
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);

    /// @notice Emitted when an agent's URI is updated.
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    /// @notice Emitted for each metadata entry set (key is also indexed for filtering).
    event MetadataSet(
        uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue
    );

    /// @notice Emitted when the reserved `agentWallet` is verified via {setAgentWallet},
    ///         cleared via {unsetAgentWallet}, or auto-cleared on transfer
    ///         (in which case `newWallet` is the zero address).
    event AgentWalletSet(uint256 indexed agentId, address indexed newWallet, address indexed owner);

    /// @notice Register a new agent with a URI and metadata entries.
    ///         The reserved `agentWallet` key cannot be set through `metadata`.
    function register(string calldata agentURI, MetadataEntry[] calldata metadata)
        external
        returns (uint256 agentId);

    /// @notice Register a new agent with just a URI.
    function register(string calldata agentURI) external returns (uint256 agentId);

    /// @notice Register a new agent with no URI (set later via {setAgentURI}).
    function register() external returns (uint256 agentId);

    /// @notice Update an agent's URI. Owner or approved operator only.
    function setAgentURI(uint256 agentId, string calldata agentURI) external;

    /// @notice Set/overwrite metadata entries (batch). Owner or approved operator only.
    ///         The reserved `agentWallet` key cannot be set here.
    function setMetadata(uint256 agentId, MetadataEntry[] calldata metadata) external;

    /// @notice Canonical single-entry metadata setter. Owner or approved operator only.
    ///         The reserved `agentWallet` key cannot be set here.
    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external;

    /// @notice Read a metadata value for an agent by key.
    function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory);

    /// @notice Verify and set the reserved `agentWallet`. Requires an EIP-712
    ///         signature from `newWallet` (EOA via ECDSA or smart account via
    ///         ERC-1271) over `AgentWalletSet(agentId,newWallet,owner,deadline)`.
    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external;

    /// @notice Read the agent's verified payment wallet (zero address if unset/cleared).
    function getAgentWallet(uint256 agentId) external view returns (address);

    /// @notice Clear the reserved `agentWallet` (resets to zero). Owner or operator only.
    function unsetAgentWallet(uint256 agentId) external;

    /// @notice Total number of registered agents (also the last minted agentId).
    function totalAgents() external view returns (uint256);
}
