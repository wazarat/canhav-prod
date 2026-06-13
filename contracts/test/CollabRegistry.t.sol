// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {CollabRegistry} from "../src/collab/CollabRegistry.sol";

contract CollabRegistryTest is CanHavTest {
    CollabRegistry internal collab;

    address internal buyer = address(0xB0B);
    bytes32 internal skillHash = keccak256("skill-markdown");
    bytes32 internal paymentRef = bytes32(uint256(0x1234));
    bytes32 internal agreementId = keccak256("agreement-1");

    function setUp() public {
        // The registry pins Arbitrum Sepolia; mimic it for the whole suite.
        vm.chainId(421614);
        collab = new CollabRegistry();
    }

    function test_recordCollab_storesAndCounts() public {
        vm.prank(buyer);
        uint256 id = collab.recordCollab(1, 2, skillHash, paymentRef, agreementId, 3);

        assertEq(id, 0, "first collab id is 0");
        assertEq(collab.collabCount(), 1, "count incremented");

        (
            uint256 fromAgentId,
            uint256 toAgentId,
            bytes32 storedSkillHash,
            bytes32 storedPaymentRef,
            bytes32 storedAgreementId,
            uint32 units,
            address recorder,
        ) = collab.getCollab(0);
        assertEq(fromAgentId, 1, "from agent id");
        assertEq(toAgentId, 2, "to agent id");
        assertEq(uint256(storedSkillHash), uint256(skillHash), "skill hash");
        assertEq(uint256(storedPaymentRef), uint256(paymentRef), "payment ref");
        assertEq(uint256(storedAgreementId), uint256(agreementId), "agreement id");
        assertEq(uint256(units), 3, "units");
        assertEq(recorder, buyer, "recorder is caller");
        assertTrue(collab.paymentRefUsed(paymentRef), "payment ref marked used");
    }

    function test_recordCollab_accumulatesByAgreement() public {
        collab.recordCollab(1, 2, skillHash, bytes32(uint256(0xAA)), agreementId, 3);
        collab.recordCollab(1, 2, skillHash, bytes32(uint256(0xBB)), agreementId, 2);

        assertEq(collab.unitsByAgreement(agreementId), 5, "units accumulate per agreement");
        assertEq(collab.interactionsByAgreement(agreementId), 2, "interactions accumulate");
    }

    function test_recordCollab_replayReverts() public {
        collab.recordCollab(1, 2, skillHash, paymentRef, agreementId, 1);
        vm.expectRevert(
            abi.encodeWithSelector(CollabRegistry.PaymentRefAlreadyRecorded.selector, paymentRef)
        );
        collab.recordCollab(1, 2, skillHash, paymentRef, agreementId, 1);
    }

    function test_recordCollab_zeroPaymentRefReverts() public {
        vm.expectRevert(CollabRegistry.ZeroPaymentRef.selector);
        collab.recordCollab(1, 2, skillHash, bytes32(0), agreementId, 1);
    }

    function test_recordCollab_zeroUnitsReverts() public {
        vm.expectRevert(CollabRegistry.ZeroUnits.selector);
        collab.recordCollab(1, 2, skillHash, paymentRef, agreementId, 0);
    }

    function test_recordCollab_zeroAgreementSkipsAccounting() public {
        collab.recordCollab(1, 2, skillHash, paymentRef, bytes32(0), 4);
        assertEq(collab.unitsByAgreement(bytes32(0)), 0, "no agreement accounting for one-off");
    }

    function test_constructor_wrongNetworkReverts() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(CollabRegistry.WrongNetwork.selector, uint256(1)));
        new CollabRegistry();
        // Restore for any subsequent assertions.
        vm.chainId(421614);
    }
}
