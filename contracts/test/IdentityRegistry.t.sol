// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {IIdentityRegistry} from "../src/interfaces/IIdentityRegistry.sol";

contract IdentityRegistryTest is CanHavTest {
    IdentityRegistry internal identity;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        identity = new IdentityRegistry();
    }

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

    function test_register_recordsAgentWalletMetadata() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");
        bytes memory wallet = identity.getMetadata(a, identity.AGENT_WALLET_KEY());
        assertEq(wallet, abi.encodePacked(alice), "agentWallet defaults to registrant");
    }

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
        vm.expectRevert(IdentityRegistry.NotAuthorized.selector);
        identity.setAgentURI(a, "ipfs://hijack");
    }

    function test_setMetadata_storesEntries() public {
        vm.prank(alice);
        uint256 a = identity.register("ipfs://agent-a");

        IIdentityRegistry.MetadataEntry[] memory entries = new IIdentityRegistry.MetadataEntry[](1);
        entries[0] = IIdentityRegistry.MetadataEntry({key: "skillId", value: bytes("usd-ai-research")});

        vm.prank(alice);
        identity.setMetadata(a, entries);
        assertEq(identity.getMetadata(a, "skillId"), bytes("usd-ai-research"), "metadata stored");
    }

    function test_getMetadata_nonexistentAgentReverts() public {
        vm.expectRevert(IdentityRegistry.NonexistentAgent.selector);
        identity.getMetadata(999, "skillId");
    }
}
