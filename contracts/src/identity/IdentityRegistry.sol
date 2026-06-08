// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";

/**
 * @title IdentityRegistry
 * @notice ERC-8004 Identity Registry — a per-chain singleton that mints a
 *         portable, censorship-resistant ERC-721 identity for each agent.
 *
 *         `agentId`  == ERC-721 tokenId
 *         `agentURI` == ERC-721 tokenURI (resolves to the agent registration file,
 *                       built from a CanHav skill)
 *
 *         Ownership, transfer and operator delegation are inherited from
 *         OpenZeppelin's audited `ERC721URIStorage`. CanHav agents are spun up by
 *         the `agent-service` which calls {register} after creating the agent's
 *         ZeroDev smart account.
 */
contract IdentityRegistry is ERC721URIStorage, IIdentityRegistry {
    /// @dev Reserved metadata key for the agent's operating wallet (smart account).
    string public constant AGENT_WALLET_KEY = "agentWallet";

    /// @dev Monotonic agentId counter (first agent = 1).
    uint256 private _nextAgentId;

    /// @dev agentId => (metadata key => value).
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    error NotAuthorized(uint256 agentId, address caller);
    error NonexistentAgent(uint256 agentId);

    constructor() ERC721("CanHav Agent Identity", "CANHAV-AGENT") {}

    /// @inheritdoc IIdentityRegistry
    function register(string calldata agentURI, MetadataEntry[] calldata metadata)
        external
        override
        returns (uint256 agentId)
    {
        agentId = _mintAgent(msg.sender);
        if (bytes(agentURI).length != 0) {
            _setTokenURI(agentId, agentURI);
        }
        // The owner's address is recorded as the reserved agentWallet by default.
        _setMetadataEntry(agentId, MetadataEntry({key: AGENT_WALLET_KEY, value: abi.encodePacked(msg.sender)}));
        _setMetadataEntries(agentId, metadata);
        emit Registered(agentId, agentURI, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function register(string calldata agentURI) external override returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender);
        if (bytes(agentURI).length != 0) {
            _setTokenURI(agentId, agentURI);
        }
        _setMetadataEntry(agentId, MetadataEntry({key: AGENT_WALLET_KEY, value: abi.encodePacked(msg.sender)}));
        emit Registered(agentId, agentURI, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function register() external override returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender);
        _setMetadataEntry(agentId, MetadataEntry({key: AGENT_WALLET_KEY, value: abi.encodePacked(msg.sender)}));
        emit Registered(agentId, "", msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function setAgentURI(uint256 agentId, string calldata agentURI) external override {
        _requireAuthorized(agentId);
        _setTokenURI(agentId, agentURI);
        emit URIUpdated(agentId, agentURI, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function setMetadata(uint256 agentId, MetadataEntry[] calldata metadata) external override {
        _requireAuthorized(agentId);
        _setMetadataEntries(agentId, metadata);
    }

    /// @inheritdoc IIdentityRegistry
    function getMetadata(uint256 agentId, string calldata key) external view override returns (bytes memory) {
        _requireExists(agentId);
        return _metadata[agentId][key];
    }

    /// @inheritdoc IIdentityRegistry
    function totalAgents() external view override returns (uint256) {
        return _nextAgentId;
    }

    /* --------------------------------------------------------------------- */
    /* Internal                                                              */
    /* --------------------------------------------------------------------- */

    function _mintAgent(address to) private returns (uint256 agentId) {
        agentId = ++_nextAgentId;
        _safeMint(to, agentId);
    }

    function _setMetadataEntries(uint256 agentId, MetadataEntry[] calldata metadata) private {
        uint256 len = metadata.length;
        for (uint256 i = 0; i < len; ++i) {
            _setMetadataEntry(agentId, metadata[i]);
        }
    }

    function _setMetadataEntry(uint256 agentId, MetadataEntry memory entry) private {
        _metadata[agentId][entry.key] = entry.value;
        emit MetadataSet(agentId, entry.key, entry.key, entry.value);
    }

    function _requireExists(uint256 agentId) private view {
        if (_ownerOf(agentId) == address(0)) revert NonexistentAgent(agentId);
    }

    /// @dev Reverts unless the caller owns, is approved for, or is operator of the agent.
    function _requireAuthorized(uint256 agentId) private view {
        address owner = _ownerOf(agentId);
        if (owner == address(0)) revert NonexistentAgent(agentId);
        if (!_isAuthorized(owner, msg.sender, agentId)) revert NotAuthorized(agentId, msg.sender);
    }
}
