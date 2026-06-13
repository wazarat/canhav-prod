// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CanHavTest} from "./utils/CanHavTest.sol";
import {CnhvToken} from "../src/token/CnhvToken.sol";

contract CnhvTokenTest is CanHavTest {
    CnhvToken internal token;

    address internal owner = address(0xA11CE);
    address internal user = address(0xB0B);
    address internal user2 = address(0xCAFE);
    address internal router = address(0x4042);

    function setUp() public {
        // The token pins Arbitrum Sepolia; mimic it for the whole suite.
        vm.chainId(421614);
        token = new CnhvToken(owner);
    }

    function test_metadata() public view {
        assertEq(token.name(), "CanHav Test Credits", "name");
        assertEq(token.symbol(), "tCNHV", "symbol");
        assertEq(uint256(token.decimals()), 18, "decimals");
    }

    function test_faucet_mintsFixedAmount() public {
        vm.prank(user);
        token.faucet();
        assertEq(token.balanceOf(user), token.FAUCET_AMOUNT(), "faucet mints fixed amount");
    }

    function test_faucet_cooldownBlocksSecondClaim() public {
        uint256 nextClaimAt = block.timestamp + token.FAUCET_COOLDOWN();
        vm.prank(user);
        token.faucet();

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CnhvToken.FaucetCooldownActive.selector, nextClaimAt));
        token.faucet();
    }

    function test_faucet_secondClaimAfterCooldown() public {
        vm.prank(user);
        token.faucet();

        // Move past the 24h cooldown.
        vm.warp(block.timestamp + token.FAUCET_COOLDOWN() + 1);
        vm.prank(user);
        token.faucet();

        assertEq(token.balanceOf(user), token.FAUCET_AMOUNT() * 2, "two claims after cooldown");
    }

    function test_ownerMint_seeds() public {
        vm.prank(owner);
        token.mint(router, 5e18);
        assertEq(token.balanceOf(router), 5e18, "owner can mint to seed");
    }

    function test_nonOwnerMint_reverts() public {
        vm.prank(user);
        vm.expectRevert();
        token.mint(user, 5e18);
    }

    function test_transfer_peerToPeerReverts() public {
        vm.prank(owner);
        token.mint(user, 10e18);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(CnhvToken.TransferRestricted.selector, user, user2));
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(user2, 1e18);
    }

    function test_transfer_succeedsWhenCounterpartyAllowlisted() public {
        vm.prank(owner);
        token.mint(user, 10e18);

        // Allowlist the router (the `to` side) — a legitimate platform path.
        vm.prank(owner);
        token.setTransferAllowed(router, true);

        vm.prank(user);
        assertTrue(token.transfer(router, 3e18), "transfer to allowlisted address succeeds");
        assertEq(token.balanceOf(router), 3e18, "recipient credited");
        assertEq(token.balanceOf(user), 7e18, "sender debited");
    }

    function test_transfer_succeedsWhenSenderAllowlisted() public {
        vm.prank(owner);
        token.mint(router, 10e18);

        vm.prank(owner);
        token.setTransferAllowed(router, true);

        // Router (allowlisted `from`) can pay an arbitrary recipient.
        vm.prank(router);
        assertTrue(token.transfer(user, 4e18), "transfer from allowlisted address succeeds");
        assertEq(token.balanceOf(user), 4e18, "recipient credited");
    }

    function test_constructor_wrongNetworkReverts() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(CnhvToken.WrongNetwork.selector, uint256(1)));
        new CnhvToken(owner);
        vm.chainId(421614);
    }
}
