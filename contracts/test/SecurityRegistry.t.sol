// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {SecurityRegistry} from "../src/security/SecurityRegistry.sol";
import {ISecurityRegistry} from "../src/interfaces/ISecurityRegistry.sol";

contract SecurityRegistryTest is CanHavTest {
    SecurityRegistry internal security;

    address internal owner = address(0xA11CE);
    address internal stranger = address(0xBAD);
    address internal auditedProtocol = address(0x1111);
    address internal verifiedProtocol = address(0x2222);
    address internal unknownProtocol = address(0x3333);

    function setUp() public {
        security = new SecurityRegistry(owner);
    }

    function test_unknownTarget_isNotAllowed() public view {
        assertFalse(security.isAllowed(unknownProtocol), "unknown target blocked by default");
    }

    function test_owner_canAllowAuditedAndVerified() public {
        vm.startPrank(owner);
        security.setStatus(auditedProtocol, ISecurityRegistry.SecurityStatus.Audited, "ipfs://audit");
        security.setStatus(verifiedProtocol, ISecurityRegistry.SecurityStatus.Verified, "");
        vm.stopPrank();

        assertTrue(security.isAllowed(auditedProtocol), "audited target allowed");
        assertTrue(security.isAllowed(verifiedProtocol), "verified target allowed");
    }

    function test_unverifiedStatus_isNotAllowed() public {
        vm.prank(owner);
        security.setStatus(unknownProtocol, ISecurityRegistry.SecurityStatus.Unverified, "");
        assertFalse(security.isAllowed(unknownProtocol), "explicitly unverified target blocked");
    }

    function test_nonOwner_cannotSetStatus() public {
        vm.prank(stranger);
        vm.expectRevert();
        security.setStatus(auditedProtocol, ISecurityRegistry.SecurityStatus.Verified, "");
    }

    function test_remove_resetsToUnverified() public {
        vm.startPrank(owner);
        security.setStatus(auditedProtocol, ISecurityRegistry.SecurityStatus.Audited, "ipfs://audit");
        security.remove(auditedProtocol);
        vm.stopPrank();
        assertFalse(security.isAllowed(auditedProtocol), "removed target blocked");
    }
}
