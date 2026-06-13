// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {AgentFactory} from "../src/factory/AgentFactory.sol";
import {AgentLedger} from "../src/factory/AgentLedger.sol";

contract AgentFactoryTest is CanHavTest {
    AgentLedger internal impl;
    AgentFactory internal factory;

    address internal owner = address(0xA11CE);
    address internal recorder = address(0x4EC0);
    address internal stranger = address(0xBAD);
    address internal agentOwner = address(0xB0B);
    address internal wallet = address(0xCAFE);

    address internal identity = address(0x1111);
    address internal collab = address(0x2222);
    address internal cnhv = address(0x3333);

    function setUp() public {
        vm.chainId(421614);
        impl = new AgentLedger();
        factory = new AgentFactory(address(impl), identity, collab, cnhv, owner);
    }

    function test_immutableRefs() public view {
        assertEq(factory.ledgerImplementation(), address(impl), "ledger impl ref");
        assertEq(factory.identityRegistry(), identity, "identity ref");
        assertEq(factory.collabRegistry(), collab, "collab ref");
        assertEq(factory.cnhvToken(), cnhv, "cnhv ref");
    }

    function test_createLedger_deterministicAndIndexed() public {
        address predicted = factory.predictLedger(42);

        vm.prank(owner);
        address ledger = factory.createLedger(42, agentOwner, wallet);

        assertEq(ledger, predicted, "deployed == predicted (deterministic)");
        assertEq(factory.ledgerOf(42), ledger, "ledgerOf indexes the clone");

        // The clone was initialized with the right state.
        AgentLedger l = AgentLedger(ledger);
        assertEq(l.agentId(), 42, "clone agentId");
        assertEq(l.agentOwner(), agentOwner, "clone owner");
        assertEq(l.agentWallet(), wallet, "clone wallet");
    }

    function test_createLedger_distinctAgentsDistinctAddresses() public {
        vm.startPrank(owner);
        address a = factory.createLedger(1, agentOwner, wallet);
        address b = factory.createLedger(2, agentOwner, wallet);
        vm.stopPrank();
        assertTrue(a != b, "distinct agents get distinct ledgers");
    }

    function test_createLedger_doubleCreateReverts() public {
        vm.startPrank(owner);
        address ledger = factory.createLedger(42, agentOwner, wallet);
        vm.expectRevert(abi.encodeWithSelector(AgentFactory.LedgerExists.selector, uint256(42), ledger));
        factory.createLedger(42, agentOwner, wallet);
        vm.stopPrank();
    }

    function test_createLedger_onlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        factory.createLedger(42, agentOwner, wallet);
    }

    function test_recordWork_forwardedByOwner() public {
        vm.startPrank(owner);
        address ledger = factory.createLedger(42, agentOwner, wallet);
        factory.recordWork(42, 7, 5e18, true, 1000);
        vm.stopPrank();

        AgentLedger l = AgentLedger(ledger);
        assertEq(l.collabCount(), 1, "work recorded via factory");
        assertEq(l.cnhvEarned(), 5e18, "earned tallied");
        assertEq(l.totalGasSpentWei(), 1000, "gas tallied");
    }

    function test_recordWork_forwardedByAllowlistedRecorder() public {
        vm.startPrank(owner);
        address ledger = factory.createLedger(42, agentOwner, wallet);
        factory.setRecorder(recorder, true);
        vm.stopPrank();

        vm.prank(recorder);
        factory.recordWork(42, 7, 2e18, false, 500);

        assertEq(AgentLedger(ledger).cnhvSpent(), 2e18, "recorder can forward work");
    }

    function test_recordWork_unauthorizedReverts() public {
        vm.prank(owner);
        factory.createLedger(42, agentOwner, wallet);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AgentFactory.NotAuthorizedRecorder.selector, stranger));
        factory.recordWork(42, 7, 1e18, true, 1);
    }

    function test_recordWork_noLedgerReverts() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(AgentFactory.NoLedger.selector, uint256(99)));
        factory.recordWork(99, 7, 1e18, true, 1);
    }

    function test_constructor_wrongNetworkReverts() public {
        // Deploy a valid impl on the right chain first, then switch.
        vm.chainId(421614);
        AgentLedger impl2 = new AgentLedger();
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(AgentFactory.WrongNetwork.selector, uint256(1)));
        new AgentFactory(address(impl2), identity, collab, cnhv, owner);
        vm.chainId(421614);
    }
}
