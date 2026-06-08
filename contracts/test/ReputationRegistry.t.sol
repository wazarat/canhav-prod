// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/reputation/ReputationRegistry.sol";

contract ReputationRegistryTest is CanHavTest {
    IdentityRegistry internal identity;
    ReputationRegistry internal reputation;

    address internal owner = address(0xA11CE);
    address internal client = address(0xC11E);

    uint256 internal agentId;

    function setUp() public {
        identity = new IdentityRegistry();
        reputation = new ReputationRegistry(address(identity));
        vm.prank(owner);
        agentId = identity.register("ipfs://agent");
    }

    function test_giveFeedback_storesEntry() public {
        vm.prank(client);
        reputation.giveFeedback(agentId, 95, 0, "quality", "", "https://api.example", "ipfs://fb", bytes32(0));

        assertEq(reputation.feedbackCount(agentId, client), 1, "one feedback recorded");
        (int128 value, uint8 decimals, bool revoked,) = reputation.getFeedback(agentId, client, 0);
        assertTrue(value == 95, "value matches");
        assertEq(uint256(decimals), 0, "decimals match");
        assertFalse(revoked, "not revoked");
    }

    function test_giveFeedback_invalidDecimalsReverts() public {
        vm.prank(client);
        vm.expectRevert(ReputationRegistry.InvalidDecimals.selector);
        reputation.giveFeedback(agentId, 95, 19, "quality", "", "", "", bytes32(0));
    }

    function test_giveFeedback_unknownAgentReverts() public {
        vm.prank(client);
        vm.expectRevert(ReputationRegistry.NonexistentAgent.selector);
        reputation.giveFeedback(404, 1, 0, "", "", "", "", bytes32(0));
    }

    function test_revokeFeedback_marksRevoked() public {
        vm.prank(client);
        reputation.giveFeedback(agentId, 95, 0, "quality", "", "", "", bytes32(0));
        vm.prank(client);
        reputation.revokeFeedback(agentId, 0);
        (,, bool revoked,) = reputation.getFeedback(agentId, client, 0);
        assertTrue(revoked, "feedback revoked");
    }
}
