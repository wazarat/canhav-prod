// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {ValidationRegistry} from "../src/validation/ValidationRegistry.sol";

contract ValidationRegistryTest is CanHavTest {
    IdentityRegistry internal identity;
    ValidationRegistry internal validation;

    address internal owner = address(0xA11CE);
    address internal validator = address(0xDDDD);

    uint256 internal agentId;
    bytes32 internal constant REQ = keccak256("request-1");

    function setUp() public {
        identity = new IdentityRegistry();
        validation = new ValidationRegistry(address(identity));
        vm.prank(owner);
        agentId = identity.register("ipfs://agent");
    }

    function test_request_thenResponse() public {
        vm.prank(owner);
        validation.validationRequest(validator, agentId, "ipfs://req", REQ);

        (address v, uint256 a, bool responded) = validation.getRequest(REQ);
        assertEq(v, validator, "validator stored");
        assertEq(a, agentId, "agentId stored");
        assertFalse(responded, "not yet responded");

        vm.prank(validator);
        validation.validationResponse(REQ, 100, "ipfs://resp", bytes32(0), "passed");
        (,, bool respondedAfter) = validation.getRequest(REQ);
        assertTrue(respondedAfter, "responded after validator replies");
    }

    function test_response_onlyValidator() public {
        vm.prank(owner);
        validation.validationRequest(validator, agentId, "ipfs://req", REQ);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ValidationRegistry.NotValidator.selector, REQ, owner));
        validation.validationResponse(REQ, 100, "ipfs://resp", bytes32(0), "passed");
    }

    function test_duplicateRequestReverts() public {
        vm.prank(owner);
        validation.validationRequest(validator, agentId, "ipfs://req", REQ);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ValidationRegistry.DuplicateRequest.selector, REQ));
        validation.validationRequest(validator, agentId, "ipfs://req", REQ);
    }
}
