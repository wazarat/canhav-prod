// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {CollabAgreement} from "../src/collab/CollabAgreement.sol";

contract CollabAgreementTest is CanHavTest {
    CollabAgreement internal agreements;

    address internal buyer = address(0xB0B);
    address internal stranger = address(0xBAD);

    bytes32 internal constant TERMS_HASH = keccak256("terms");

    function setUp() public {
        vm.chainId(421614);
        vm.warp(1_000_000);
        agreements = new CollabAgreement();
    }

    /// Minimal establish used by the legacy-behaviour tests (no per-period budgets).
    function _establish(uint32 maxUnits, uint32 installments, uint64 cooldown, uint64 expiry)
        internal
        returns (bytes32)
    {
        return _establishFull(
            maxUnits,
            installments,
            cooldown,
            expiry,
            CollabAgreement.Mode.OneTime,
            CollabAgreement.Cadence.None,
            0,
            0,
            0,
            false,
            bytes32(0)
        );
    }

    function _establishFull(
        uint32 maxUnits,
        uint32 installments,
        uint64 cooldown,
        uint64 expiry,
        CollabAgreement.Mode mode,
        CollabAgreement.Cadence cadence,
        uint32 callBudget,
        uint256 tokenBudget,
        uint32 updates,
        bool duneLinked,
        bytes32 termsHash
    ) internal returns (bytes32) {
        CollabAgreement.EstablishParams memory p = CollabAgreement.EstablishParams({
            buyerAgentId: 1,
            sellerAgentId: 2,
            maxUnitsPerInteraction: maxUnits,
            installments: installments,
            pricePerInstallment: 1_000_000,
            minInteractionInterval: cooldown,
            expiry: expiry,
            mode: mode,
            cadence: cadence,
            callBudgetPerPeriod: callBudget,
            tokenBudgetPerPeriod: tokenBudget,
            updatesPerPeriod: updates,
            duneLinked: duneLinked,
            termsHash: termsHash
        });
        vm.prank(buyer);
        return agreements.establish(p);
    }

    function test_establish_storesTerms() public {
        bytes32 id = _establishFull(
            5,
            3,
            0,
            0,
            CollabAgreement.Mode.OneTime,
            CollabAgreement.Cadence.None,
            10,
            50_000,
            4,
            true,
            TERMS_HASH
        );
        assertEq(agreements.agreementCount(), 1, "count incremented");

        CollabAgreement.Agreement memory a = agreements.getAgreement(id);
        assertEq(a.buyerAgentId, 1, "buyer agent id");
        assertEq(a.sellerAgentId, 2, "seller agent id");
        assertEq(uint256(a.maxUnitsPerInteraction), 5, "max units");
        assertEq(uint256(a.installments), 3, "installments");
        assertEq(uint256(a.consumedInstallments), 0, "no installments consumed yet");
        assertEq(a.consumedUnits, 0, "no units consumed yet");
        assertEq(a.pricePerInstallment, 1_000_000, "price per installment");
        assertEq(a.establisher, buyer, "establisher is caller");
        assertTrue(a.status == CollabAgreement.Status.Active, "active on establish");
        assertEq(uint256(a.callBudgetPerPeriod), 10, "call budget stored");
        assertEq(a.tokenBudgetPerPeriod, 50_000, "token budget stored");
        assertEq(uint256(a.updatesPerPeriod), 4, "updates stored");
        assertTrue(a.duneLinked, "dune linked stored");
        assertEq(uint256(a.termsHash), uint256(TERMS_HASH), "terms hash stored");
    }

    function test_establish_recordsModeAndCadence() public {
        bytes32 id = _establishFull(
            5,
            4,
            604_800,
            0,
            CollabAgreement.Mode.Recurring,
            CollabAgreement.Cadence.Weekly,
            0,
            0,
            0,
            false,
            bytes32(0)
        );

        CollabAgreement.Agreement memory a = agreements.getAgreement(id);
        assertTrue(a.mode == CollabAgreement.Mode.Recurring, "recurring mode stored");
        assertTrue(a.cadence == CollabAgreement.Cadence.Weekly, "weekly cadence stored");
    }

    function test_establish_zeroMaxUnitsReverts() public {
        vm.expectRevert(CollabAgreement.ZeroMaxUnits.selector);
        _establish(0, 3, 0, 0);
    }

    function test_establish_zeroInstallmentsReverts() public {
        vm.expectRevert(CollabAgreement.ZeroInstallments.selector);
        _establish(5, 0, 0, 0);
    }

    function test_recordInteraction_happyPathAndCompletion() public {
        // 2 periods gated by a 100s cooldown (one call per period).
        bytes32 id = _establish(5, 2, 100, 0);

        vm.prank(buyer);
        agreements.recordInteraction(id, 4, 0);
        assertEq(agreements.remainingInstallments(id), 1, "one period left after the first");

        // Next period unlocks after the cooldown window.
        vm.warp(1_000_100);
        vm.prank(buyer);
        agreements.recordInteraction(id, 5, 0);

        CollabAgreement.Agreement memory a = agreements.getAgreement(id);
        assertEq(uint256(a.consumedInstallments), 2, "both interactions consumed");
        assertEq(uint256(a.periodIndex), 1, "advanced to the final period");
        assertEq(a.consumedUnits, 9, "units accumulated");
        assertTrue(a.status == CollabAgreement.Status.Completed, "completed when exhausted");
        assertEq(agreements.remainingInstallments(id), 0, "none remaining");
    }

    function test_recordInteraction_unitsExceedMaxReverts() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.UnitsExceedMax.selector, uint32(6), uint32(5)));
        agreements.recordInteraction(id, 6, 0);
    }

    function test_recordInteraction_zeroUnitsReverts() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(buyer);
        vm.expectRevert(CollabAgreement.ZeroUnits.selector);
        agreements.recordInteraction(id, 0, 0);
    }

    function test_recordInteraction_installmentsExhaustedReverts() public {
        bytes32 id = _establish(5, 1, 0, 0);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);
        // Now Completed; further interactions revert as not active.
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.AgreementNotActive.selector, id));
        agreements.recordInteraction(id, 1, 0);
    }

    function test_recordInteraction_cooldownEnforced() public {
        bytes32 id = _establish(5, 3, 100, 0);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);

        // Too soon — legacy one-call-per-period mode surfaces CooldownActive.
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(CollabAgreement.CooldownActive.selector, uint64(1_000_100))
        );
        agreements.recordInteraction(id, 1, 0);

        // After the cooldown elapses it succeeds (next period).
        vm.warp(1_000_100);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);
        CollabAgreement.Agreement memory a = agreements.getAgreement(id);
        assertEq(uint256(a.consumedInstallments), 2, "second interaction after cooldown");
        assertEq(uint256(a.periodIndex), 1, "rolled into second period");
    }

    function test_recordInteraction_callBudgetAllowsMultiplePerPeriod() public {
        // 1 period, 3 calls allowed within it, weekly cooldown window.
        bytes32 id = _establishFull(
            5,
            1,
            604_800,
            0,
            CollabAgreement.Mode.Recurring,
            CollabAgreement.Cadence.Weekly,
            3,
            0,
            0,
            false,
            bytes32(0)
        );

        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);

        CollabAgreement.Agreement memory a = agreements.getAgreement(id);
        assertEq(uint256(a.periodCalls), 3, "three calls in the period");
        assertTrue(a.status == CollabAgreement.Status.Completed, "completed when budget + last period used");

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.AgreementNotActive.selector, id));
        agreements.recordInteraction(id, 1, 0);
    }

    function test_recordInteraction_callBudgetExceededReverts() public {
        // 2 periods, 2 calls/period.
        bytes32 id = _establishFull(
            5,
            2,
            100,
            0,
            CollabAgreement.Mode.Recurring,
            CollabAgreement.Cadence.Daily,
            2,
            0,
            0,
            false,
            bytes32(0)
        );

        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);

        // Third call within the same period exceeds the call budget.
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.CallBudgetExceeded.selector, uint32(2)));
        agreements.recordInteraction(id, 1, 0);

        // Next period unlocks more calls.
        vm.warp(1_000_100);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 0);
        CollabAgreement.Agreement memory a = agreements.getAgreement(id);
        assertEq(uint256(a.periodIndex), 1, "advanced to second period");
        assertEq(uint256(a.periodCalls), 1, "counters reset for new period");
    }

    function test_recordInteraction_tokenBudgetEnforced() public {
        // 2 periods, generous call budget, 1_000 tokens/period.
        bytes32 id = _establishFull(
            5,
            2,
            100,
            0,
            CollabAgreement.Mode.Recurring,
            CollabAgreement.Cadence.Daily,
            10,
            1_000,
            0,
            false,
            bytes32(0)
        );

        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 600);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 400); // exactly hits the budget

        // Any further tokens this period exceed the budget.
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(CollabAgreement.TokenBudgetExceeded.selector, uint256(1_000), uint256(1_001))
        );
        agreements.recordInteraction(id, 1, 1);

        // New period resets the token tally.
        vm.warp(1_000_100);
        vm.prank(buyer);
        agreements.recordInteraction(id, 1, 900);
        CollabAgreement.Agreement memory a = agreements.getAgreement(id);
        assertEq(a.periodTokens, 900, "token tally reset and re-accumulated");
    }

    function test_recordInteraction_notEstablisherReverts() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.NotEstablisher.selector, id));
        agreements.recordInteraction(id, 1, 0);
    }

    function test_recordInteraction_expiredReverts() public {
        bytes32 id = _establish(5, 3, 0, uint64(1_000_500));
        vm.warp(1_000_501);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.AgreementExpired.selector, id));
        agreements.recordInteraction(id, 1, 0);
    }

    function test_cancel_blocksFurtherInteractions() public {
        bytes32 id = _establish(5, 3, 0, 0);
        vm.prank(buyer);
        agreements.cancel(id);

        CollabAgreement.Agreement memory a = agreements.getAgreement(id);
        assertTrue(a.status == CollabAgreement.Status.Cancelled, "cancelled");

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CollabAgreement.AgreementNotActive.selector, id));
        agreements.recordInteraction(id, 1, 0);
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
