// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

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
 *
 *         The reserved `agentWallet` metadata key follows ERC-8004 exactly: it
 *         auto-initializes to the owner on {register}, can only be changed via a
 *         signed {setAgentWallet} (EIP-712 for EOAs / ERC-1271 for smart
 *         accounts), and is auto-cleared to the zero address on transfer.
 */
contract IdentityRegistry is ERC721URIStorage, EIP712, IIdentityRegistry {
    /// @dev Reserved metadata key for the agent's operating wallet (smart account).
    string public constant AGENT_WALLET_KEY = "agentWallet";

    /// @dev EIP-712 typehash for the wallet-binding proof signed by `newWallet`.
    bytes32 private constant AGENT_WALLET_SET_TYPEHASH =
        keccak256("AgentWalletSet(uint256 agentId,address newWallet,address owner,uint256 deadline)");

    /// @dev Max distance between `deadline` and `block.timestamp` (replay window).
    uint256 private constant WALLET_BINDING_TTL = 5 minutes;

    /// @dev Monotonic agentId counter (first agent = 1).
    uint256 private _nextAgentId;

    /// @dev agentId => (metadata key => value).
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    error NotAuthorized(uint256 agentId, address caller);
    error NonexistentAgent(uint256 agentId);
    error ReservedMetadataKey();
    error SignatureExpired(uint256 deadline);
    error DeadlineTooFar(uint256 deadline);
    error InvalidWalletSignature();

    constructor() ERC721("CanHav Agent Identity", "CANHAV-AGENT") EIP712("ERC8004IdentityRegistry", "1") {}

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
        _setMetadataEntries(agentId, metadata);
        emit Registered(agentId, agentURI, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function register(string calldata agentURI) external override returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender);
        if (bytes(agentURI).length != 0) {
            _setTokenURI(agentId, agentURI);
        }
        emit Registered(agentId, agentURI, msg.sender);
    }

    /// @inheritdoc IIdentityRegistry
    function register() external override returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender);
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
    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue)
        external
        override
    {
        _requireAuthorized(agentId);
        _setMetadataEntry(agentId, MetadataEntry({metadataKey: metadataKey, metadataValue: metadataValue}));
    }

    /// @inheritdoc IIdentityRegistry
    function getMetadata(uint256 agentId, string calldata metadataKey)
        external
        view
        override
        returns (bytes memory)
    {
        _requireExists(agentId);
        return _metadata[agentId][metadataKey];
    }

    /* --------------------------------------------------------------------- */
    /* Reserved agentWallet (ERC-8004)                                       */
    /* --------------------------------------------------------------------- */

    /// @inheritdoc IIdentityRegistry
    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature)
        external
        override
    {
        _requireExists(agentId);
        // The deadline only bounds signature replay to a short window; minor
        // validator timestamp drift is acceptable here (matches the ERC-8004 ref).
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > deadline) revert SignatureExpired(deadline);
        // forge-lint: disable-next-line(block-timestamp)
        if (deadline > block.timestamp + WALLET_BINDING_TTL) revert DeadlineTooFar(deadline);

        address owner = ownerOf(agentId);
        bytes32 structHash = keccak256(abi.encode(AGENT_WALLET_SET_TYPEHASH, agentId, newWallet, owner, deadline));
        bytes32 digest = _hashTypedDataV4(structHash);
        // Single call covers both EOA (ECDSA) and smart-account (ERC-1271) signers
        // — exactly what the agent's ZeroDev kernel account needs to prove control.
        if (!SignatureChecker.isValidSignatureNow(newWallet, digest, signature)) {
            revert InvalidWalletSignature();
        }

        _writeAgentWallet(agentId, newWallet);
        emit AgentWalletSet(agentId, newWallet, owner);
    }

    /// @inheritdoc IIdentityRegistry
    function getAgentWallet(uint256 agentId) public view override returns (address) {
        _requireExists(agentId);
        bytes memory raw = _metadata[agentId][AGENT_WALLET_KEY];
        if (raw.length != 20) return address(0);
        // Safe: guarded above to be exactly 20 bytes (a packed address).
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(bytes20(raw));
    }

    /// @inheritdoc IIdentityRegistry
    function unsetAgentWallet(uint256 agentId) external override {
        _requireAuthorized(agentId);
        _clearAgentWallet(agentId);
        emit AgentWalletSet(agentId, address(0), ownerOf(agentId));
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
        // ERC-8004: the reserved agentWallet auto-initializes to the owner.
        _writeAgentWallet(agentId, to);
    }

    /// @dev Writes the reserved agentWallet (bypassing the generic-path guard) and
    ///      emits the canonical MetadataSet event. Stored packed (20 bytes).
    function _writeAgentWallet(uint256 agentId, address wallet) private {
        bytes memory value = abi.encodePacked(wallet);
        _metadata[agentId][AGENT_WALLET_KEY] = value;
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, value);
    }

    /// @dev Clears the reserved agentWallet back to the zero address.
    function _clearAgentWallet(uint256 agentId) private {
        delete _metadata[agentId][AGENT_WALLET_KEY];
        emit MetadataSet(agentId, AGENT_WALLET_KEY, AGENT_WALLET_KEY, "");
    }

    function _setMetadataEntries(uint256 agentId, MetadataEntry[] calldata metadata) private {
        uint256 len = metadata.length;
        for (uint256 i = 0; i < len; ++i) {
            _setMetadataEntry(agentId, metadata[i]);
        }
    }

    function _setMetadataEntry(uint256 agentId, MetadataEntry memory entry) private {
        // The reserved key can only be written through {setAgentWallet}.
        if (keccak256(bytes(entry.metadataKey)) == keccak256(bytes(AGENT_WALLET_KEY))) {
            revert ReservedMetadataKey();
        }
        _metadata[agentId][entry.metadataKey] = entry.metadataValue;
        emit MetadataSet(agentId, entry.metadataKey, entry.metadataKey, entry.metadataValue);
    }

    /// @dev OZ v5 transfer hook. Auto-clears the reserved agentWallet on any
    ///      ownership transfer (not on mint/burn); the new owner must re-verify.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            _clearAgentWallet(tokenId);
        }
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
