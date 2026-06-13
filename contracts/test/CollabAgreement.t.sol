// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {CollabAgreement} from "../src/collab/CollabAgreement.sol";

contract CollabAgreementTest is CanHavTest {
    CollabAgreement internal agreements;

    address internal buyer = address(0xB0B);
    address internal stranger = address(0xBAD);

    function setUp() public {
        vm.chainId(421614);
        vm.warp(1_000_000);
        agreements = new CollabAgreement();
    }

    function _establish(uint32 maxUnits, uint32 installments, uint64 cooldown, uint64 expiry)
        internal
        returns (bytes32)
    {
        vm.prank(buyer);
        return agreements.establish(
            1,
            2,
            maxUnits,
            installments,
            1_000_000,
            cooldown,
            expiry,
            CollabAgreement.Mode.OneTime,
            CollabAgreement.Cadence.None
        );
    }

    function test_establish_storesTerms() public {
        bytes32 id = _establish(5, 3, 0, 0);
        assertEq(agreements.agreementCount(), 1, "count incremented");

        (
            uint256 buyerAgentId,
            uint256 sellerAgentId,
            uint32 maxUnits,
            uint32 installments,
            uint32 consumedInstallments,
            uint256 consumedUnits,
            uint256 price,
            ,
            ,
            ,
            address establisher,
            CollabAgreement.Status status,
            CollabAgreement.Mode mode,
            CollabAgreement.Cadence cadence
        ) = agreements.getAgreement(id);
        assertEq(buyerAgentId, 1, "buyer agent id");
        assertEq(sellerAgentId, 2, "seller agent id");
        assertEq(uint256(maxUnits), 5, "max units");
        assertEq(uint256(installments), 3, "installments");
        assertEq(uint256(consumedInstallments), 0, "no installments consumed yet");
        assertEq(consumedUnits, 0, "no units consumed yet");
        assertEq(price, 1_000_000, "price per installment");
        assertEq(establisher, buyer, "establisher is caller");
        assertTrue(status == CollabAgreement.Status.Active, "active on establish");
        assertTrue(mode == CollabAgreement.Mode.OneTime, "default mode one-time");
        assertTrue(cadence == CollabAgreement.Cadence.None, "default cadence none");
    }

    function test_establish_recordsModeAndCadence() public {
        vm.prank(buyer);
        bytes32 id = agreements.establish(
            1,
            2,
            5,
            4,
            1_000_000,
            604_800,
            0,
            CollabAgreement.Mode.Recurring,
            CollabAgreement.Cadence.Weekly
        );

        (,,,,,,,,,,,, CollabAgreement.Mode mode, CollabAgreement.Cadence cadence) =
            agreements.getAgreement(id);
        assertTrue(mode == CollabAgreement.Mode.Recurring, "recurring mode stored");
        assertTrue(cadence == CollabAgreement.Cadence.Weekly, "weekly cadence stored");
    }

    function test_establish_zeroMaxUnitsReverts() public {
        vm.prank(buyer);
        vm.expectRevert(CollabAgreement.ZeroMaxUnits.selector);
        agreements.establish(
            1, 2, 0, 3, 0, 0, 0, CollabAgreement.Mode.OneTime, CollabAgreement.Cadence.None
        );
    }

    function test_establish_zeroInstallmentsReverts() public {
        vm.prank(buyer);
        vm.expectRevert(CollabAgreement.ZeroInstallments.selector);
        agreements.establish(
            1, 2, 5, 0, 0, 0, 0, CollabAgreement.Mode.OneTime, CollabAgreement.Cadence.None
        );
    }

    function test_recordInteraction_happyPathAndCompletion() public {
        bytes32 id = _establish(5, 2, 0, 0);

        vm.prank(buyer);
        agreements.recordInteraction(id, 4);
        assertEq(agreements.remainingInstallments(id), 1, "one installment left");

        vm.prank(buyer);
        agreements.recordInteraction(id, 5);

        (,,,, uint32 consumedInstallments, uint256 consumedUnits,,,,,, CollabAgreement.Status status,,) =
            agreements.getAgreement(id);
        assertEq(uint256(consumedInstallments), 2, "both installments consumed");
        assertEq(consumedUnits, 9, "units accumulated");
        assertTrue(status == CollabAgreement.Status.Completed, "completed when exhausted");
        assertEq(agreements.remainingInstallments(id), 0, "none remaining");
    }

    function test_recordInteraction_unitsExceedMaxReverts() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.UnitsExceedMax.selector, uint32(6), uint32(5)));
        agreements.recordInteraction(id, 6);
    }

    function test_recordInteraction_zeroUnitsReverts() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(buyer);
        vm.expectRevert(CollabAgreement.ZeroUnits.selector);
        agreements.recordInteraction(id, 0);
    }

    function test_recordInteraction_installmentsExhaustedReverts() public {
        bytes32 id = _establish(5, 1, 0, 0);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1);
        // Now Completed; further interactions revert as not active.
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.AgreementNotActive.selector, id));
        agreements.recordInteraction(id, 1);
    }

    function test_recordInteraction_cooldownEnforced() public {
        bytes32 id = _establish(5, 3, 100, 0);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1);

        // Too soon.
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(CollabAgreement.CooldownActive.selector, uint64(1_000_100))
        );
        agreements.recordInteraction(id, 1);

        // After the cooldown elapses it succeeds.
        vm.warp(1_000_100);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1);
        (,,,, uint32 consumedInstallments,,,,,,,,,) = agreements.getAgreement(id);
        assertEq(uint256(consumedInstallments), 2, "second interaction after cooldown");
    }

    function test_recordInteraction_notEstablisherReverts() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.NotEstablisher.selector, id));
        agreements.recordInteraction(id, 1);
    }

    function test_recordInteraction_expiredReverts() public {
        bytes32 id = _establish(5, 3, 0, uint64(1_000_500));
        vm.warp(1_000_501);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.AgreementExpired.selector, id));
        agreements.recordInteraction(id, 1);
    }

    function test_cancel_blocksFurtherInteractions() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(buyer);
        agreements.cancel(id);

        (,,,,,,,,,,, CollabAgreement.Status status,,) = agreements.getAgreement(id);
        assertTrue(status == CollabAgreement.Status.Cancelled, "cancelled");

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.AgreementNotActive.selector, id));
        agreements.recordInteraction(id, 1);
    }

    function test_cancel_notEstablisherReverts() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.NotEstablisher.selector, id));
        agreements.cancel(id);
    }

    function test_constructor_wrongNetworkReverts() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.WrongNetwork.selector, uint256(1)));
        new CollabAgreement();
        vm.chainId(421614);
    }
}
