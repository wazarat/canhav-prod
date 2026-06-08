// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Vm} from "./Vm.sol";

/**
 * @dev Minimal test base: exposes the Foundry `vm` cheatcode handle and a few
 *      assertion helpers that revert on failure (Foundry treats a reverting test
 *      function as failed). Keeps tests free of the `forge-std` dependency.
 */
abstract contract CanHavTest {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function assertTrue(bool cond, string memory err) internal pure {
        require(cond, err);
    }

    function assertFalse(bool cond, string memory err) internal pure {
        require(!cond, err);
    }

    function assertEq(uint256 a, uint256 b, string memory err) internal pure {
        require(a == b, err);
    }

    function assertEq(address a, address b, string memory err) internal pure {
        require(a == b, err);
    }

    function assertEq(string memory a, string memory b, string memory err) internal pure {
        require(keccak256(bytes(a)) == keccak256(bytes(b)), err);
    }

    function assertEq(bytes memory a, bytes memory b, string memory err) internal pure {
        require(keccak256(a) == keccak256(b), err);
    }
}
