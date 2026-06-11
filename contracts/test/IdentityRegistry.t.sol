// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {IIdentityRegistry} from "../src/interfaces/IIdentityRegistry.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract IdentityRegistryTest is CanHavTest {
    IdentityRegistry internal identity;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    // Deterministic signer used for the wallet-binding proofs.
    uint256 internal walletPk = 0xA11CE5161;
    address internal walletEOA;

    function setUp() public {
        identity = new IdentityRegistry();
        walletEOA = vm.addr(walletPk);
        // Give the deadline checks headroom (foundry starts block.timestamp at 1).
        vm.warp(1_000_000);
    }

    /* --------------------------------------------------------------------- */
    /* Registration                                                          */
    /* --------------------------------------------------------------------- */

    function test_register_mintsSequentialAgentIds() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");
        vm.prank(bob);
        uint256 b = identity.register("ipfs://agent-b");

        assertEq(a, 1, "first agentId should be 1");
        assertEq(b, 2, "second agentId should be 2");
        assertEq(identity.totalAgents(), 2, "totalAgents should be 2");
        assertEq(identity.ownerOf(a), alice, "alice owns agent a");
        assertEq(identity.tokenURI(a), "ipfs://agent-a", "agentURI stored as tokenURI");
    }

    function test_register_defaultAgentWalletIsOwner() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");
        // Reserved key auto-initializes to the owner (ERC-8004).
        bytes memory wallet = identity.getMetadata(a, identity.AGENT_WALLET_KEY());
        assertEq(wallet, abi.encodePacked(alice), "agentWallet metadata defaults to registrant");
        assertEq(identity.getAgentWallet(a), alice, "getAgentWallet defaults to owner");
    }

    function test_register_rejectsReservedKeyInMetadata() public {
        IIdentityRegistry.MetadataEntry[] memory entries = new IIdentityRegistry.MetadataEntry[](1);
        entries[0] = IIdentityRegistry.MetadataEntry({
            metadataKey: identity.AGENT_WALLET_KEY(),
            metadataValue: abi.encodePacked(bob)
        });

        vm.prank(alice);
        vm.expectRevert(IdentityRegistry.ReservedMetadataKey.selector);
        identity.register("ipfs://agent-a", entries);
    }

    /* --------------------------------------------------------------------- */
    /* agentURI / metadata                                                   */
    /* --------------------------------------------------------------------- */

    function test_setAgentURI_ownerCanUpdate() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://old");
        vm.prank(alice);
        identity.setAgentURI(a, "ipfs://new");
        assertEq(identity.tokenURI(a), "ipfs://new", "owner updates agentURI");
    }

    function test_setAgentURI_nonOwnerReverts() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://old");
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IdentityRegistry.NotAuthorized.selector, a, bob));
        identity.setAgentURI(a, "ipfs://hijack");
    }

    function test_setMetadata_batchStoresEntries() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        IIdentityRegistry.MetadataEntry[] memory entries = new IIdentityRegistry.MetadataEntry[](1);
        entries[0] = IIdentityRegistry.MetadataEntry({metadataKey: "skillId", metadataValue: bytes("usd-ai-research")});

        vm.prank(alice);
        identity.setMetadata(a, entries);
        assertEq(identity.getMetadata(a, "skillId"), bytes("usd-ai-research"), "metadata stored");
    }

    function test_setMetadata_singleEntryStores() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        vm.prank(alice);
        identity.setMetadata(a, "skillId", bytes("jupiter-research"));
        assertEq(identity.getMetadata(a, "skillId"), bytes("jupiter-research"), "single-entry metadata stored");
    }

    function test_setMetadata_batchRejectsReservedKey() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        IIdentityRegistry.MetadataEntry[] memory entries = new IIdentityRegistry.MetadataEntry[](1);
        entries[0] = IIdentityRegistry.MetadataEntry({
            metadataKey: identity.AGENT_WALLET_KEY(),
            metadataValue: abi.encodePacked(bob)
        });

        vm.prank(alice);
        vm.expectRevert(IdentityRegistry.ReservedMetadataKey.selector);
        identity.setMetadata(a, entries);
    }

    function test_setMetadata_singleEntryRejectsReservedKey() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        // Resolve the reserved key first so it isn't the call captured by expectRevert.
        string memory reserved = identity.AGENT_WALLET_KEY();
        vm.prank(alice);
        vm.expectRevert(IdentityRegistry.ReservedMetadataKey.selector);
        identity.setMetadata(a, reserved, abi.encodePacked(bob));
    }

    function test_getMetadata_nonexistentAgentReverts() public {
        vm.expectRevert(abi.encodeWithSelector(IdentityRegistry.NonexistentAgent.selector, uint256(999)));
        identity.getMetadata(999, "skillId");
    }

    /* --------------------------------------------------------------------- */
    /* setAgentWallet (EIP-712 / ERC-1271)                                   */
    /* --------------------------------------------------------------------- */

    function test_setAgentWallet_eoaSignatureSucceeds() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        uint256 deadline = block.timestamp + 240;
        bytes memory sig = _signWallet(walletPk, a, walletEOA, alice, deadline);

        identity.setAgentWallet(a, walletEOA, deadline, sig);
        assertEq(identity.getAgentWallet(a), walletEOA, "agentWallet updated to verified EOA");
    }

    function test_setAgentWallet_rejectsBadSignature() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        uint256 deadline = block.timestamp + 240;
        // Signed by the wrong key (bob's key), so recovery != newWallet.
        bytes memory sig = _signWallet(0xB0B5161, a, walletEOA, alice, deadline);

        vm.expectRevert(IdentityRegistry.InvalidWalletSignature.selector);
        identity.setAgentWallet(a, walletEOA, deadline, sig);
    }

    function test_setAgentWallet_rejectsExpiredDeadline() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        uint256 deadline = block.timestamp - 1;
        vm.expectRevert(abi.encodeWithSelector(IdentityRegistry.SignatureExpired.selector, deadline));
        identity.setAgentWallet(a, walletEOA, deadline, "");
    }

    function test_setAgentWallet_rejectsDeadlineTooFar() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        // 5 minutes + 1 second beyond now is outside the replay window.
        uint256 deadline = block.timestamp + 5 minutes + 1;
        vm.expectRevert(abi.encodeWithSelector(IdentityRegistry.DeadlineTooFar.selector, deadline));
        identity.setAgentWallet(a, walletEOA, deadline, "");
    }

    function test_setAgentWallet_erc1271SmartAccountSucceeds() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        // A 1-of-1 smart account controlled by walletPk (mirrors a ZeroDev kernel).
        MockERC1271Wallet smartAccount = new MockERC1271Wallet(walletEOA);

        uint256 deadline = block.timestamp + 240;
        bytes memory sig = _signWallet(walletPk, a, address(smartAccount), alice, deadline);

        identity.setAgentWallet(a, address(smartAccount), deadline, sig);
        assertEq(identity.getAgentWallet(a), address(smartAccount), "agentWallet bound to smart account via ERC-1271");
    }

    function test_agentWallet_resetsToZeroOnTransfer() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        uint256 deadline = block.timestamp + 240;
        bytes memory sig = _signWallet(walletPk, a, walletEOA, alice, deadline);
        identity.setAgentWallet(a, walletEOA, deadline, sig);
        assertEq(identity.getAgentWallet(a), walletEOA, "wallet verified before transfer");

        vm.prank(alice);
        identity.transferFrom(alice, bob, a);

        assertEq(identity.ownerOf(a), bob, "bob now owns the identity");
        assertEq(identity.getAgentWallet(a), address(0), "agentWallet cleared to zero on transfer");
    }

    function test_unsetAgentWallet_clearsToZero() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        uint256 deadline = block.timestamp + 240;
        bytes memory sig = _signWallet(walletPk, a, walletEOA, alice, deadline);
        identity.setAgentWallet(a, walletEOA, deadline, sig);

        vm.prank(alice);
        identity.unsetAgentWallet(a);
        assertEq(identity.getAgentWallet(a), address(0), "agentWallet cleared by owner");
    }

    /* --------------------------------------------------------------------- */
    /* Helpers                                                               */
    /* --------------------------------------------------------------------- */

    function _signWallet(uint256 pk, uint256 agentId, address newWallet, address owner, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = _walletDigest(agentId, newWallet, owner, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _walletDigest(uint256 agentId, address newWallet, address owner, uint256 deadline)
        internal
        view
        returns (bytes32)
    {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ERC8004IdentityRegistry")),
                keccak256(bytes("1")),
                block.chainid,
                address(identity)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("AgentWalletSet(uint256 agentId,address newWallet,address owner,uint256 deadline)"),
                agentId,
                newWallet,
                owner,
                deadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}

/**
 * @dev Minimal 1-of-1 ERC-1271 smart account: approves a hash when the supplied
 *      signature recovers to its configured owner. Mirrors how a ZeroDev kernel
 *      account validates a signature for {SignatureChecker}.
 */
contract MockERC1271Wallet {
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e;
    address public immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(hash, signature);
        if (err == ECDSA.RecoverError.NoError && recovered == owner) {
            return MAGIC_VALUE;
        }
        return 0xffffffff;
    }
}
