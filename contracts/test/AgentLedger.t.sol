// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {CanHavTest} from "./utils/CanHavTest.sol";
import {AgentLedger} from "../src/factory/AgentLedger.sol";

/**
 * @dev Unit-tests the ledger in isolation: the test contract clones the master
 *      and initializes the clone as its own "factory", so it can exercise the
 *      factory-gated {recordWork} directly.
 */
contract AgentLedgerTest is CanHavTest {
    AgentLedger internal impl;
    AgentLedger internal ledger;

    address internal agentOwner = address(0xA11CE);
    address internal wallet = address(0xB0B);
    address internal stranger = address(0xBAD);

    function setUp() public {
        vm.chainId(421614);
        impl = new AgentLedger();
        ledger = AgentLedger(Clones.clone(address(impl)));
        // The test contract is the "factory" for this clone.
        ledger.initialize(address(this), 1, agentOwner, wallet);
    }

    function test_initialize_setsState() public view {
        assertEq(ledger.agentId(), 1, "agentId");
        assertEq(ledger.agentOwner(), agentOwner, "owner");
        assertEq(ledger.agentWallet(), wallet, "agentWallet");
        assertTrue(ledger.firstSeen() > 0, "firstSeen set");
        assertEq(uint256(ledger.firstSeen()), uint256(ledger.lastActive()), "firstSeen == lastActive");
    }

    function test_initialize_secondCallReverts() public {
        vm.expectRevert();
        ledger.initialize(address(this), 1, agentOwner, wallet);
    }

    function test_master_cannotBeInitialized() public {
        vm.expectRevert();
        impl.initialize(address(this), 1, agentOwner, wallet);
    }

    function test_recordWork_onlyFactory() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AgentLedger.OnlyFactory.selector, stranger));
        ledger.recordWork(2, 1e18, true, 100);
    }

    function test_recordWork_talliesEarnedAndSpent() public {
        ledger.recordWork(2, 10e18, true, 100); // earned
        ledger.recordWork(3, 4e18, false, 50); // spent

        assertEq(ledger.collabCount(), 2, "collabCount");
        assertEq(ledger.cnhvEarned(), 10e18, "cnhvEarned");
        assertEq(ledger.cnhvSpent(), 4e18, "cnhvSpent");
        assertEq(ledger.totalGasSpentWei(), 150, "totalGasSpentWei");
        assertEq(ledger.earnedPerCollab(), 5e18, "earnedPerCollab = 10e18/2");
        assertEq(ledger.costPerCollab(), 75, "costPerCollab = 150/2");
        assertTrue(ledger.netFlow() == int256(6e18), "netFlow = earned - spent");
    }

    function test_recordWork_uniqueVsRepeatCounterparties() public {
        ledger.recordWork(2, 1e18, true, 1); // new cp 2
        ledger.recordWork(3, 1e18, true, 1); // new cp 3
        ledger.recordWork(2, 1e18, true, 1); // cp 2 repeats
        ledger.recordWork(2, 1e18, true, 1); // cp 2 again (no new repeat)

        assertEq(ledger.uniqueCounterparties(), 2, "two unique counterparties");
        assertEq(ledger.repeatCounterparties(), 1, "one repeat counterparty");
        assertEq(ledger.collabsWithCounterparty(2), 3, "cp 2 collab count");
        assertEq(ledger.collabsWithCounterparty(3), 1, "cp 3 collab count");
        assertEq(ledger.repeatRate(), 5000, "repeatRate = 1/2 = 5000 bps");
    }

    function test_stats_returnsSnapshot() public {
        ledger.recordWork(2, 7e18, true, 21);
        AgentLedger.LedgerStats memory s = ledger.stats();
        assertEq(s.agentId, 1, "stats.agentId");
        assertEq(s.owner, agentOwner, "stats.owner");
        assertEq(s.collabCount, 1, "stats.collabCount");
        assertEq(s.cnhvEarned, 7e18, "stats.cnhvEarned");
        assertEq(s.totalGasSpentWei, 21, "stats.totalGasSpentWei");
        assertEq(s.uniqueCounterparties, 1, "stats.uniqueCounterparties");
    }

    function test_views_zeroWhenNoActivity() public view {
        assertEq(ledger.earnedPerCollab(), 0, "earnedPerCollab 0 when no collabs");
        assertEq(ledger.costPerCollab(), 0, "costPerCollab 0 when no collabs");
        assertEq(ledger.repeatRate(), 0, "repeatRate 0 when no counterparties");
        assertTrue(ledger.netFlow() == int256(0), "netFlow 0 at start");
    }
}
