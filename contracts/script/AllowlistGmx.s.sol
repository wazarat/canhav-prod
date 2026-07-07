// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Vm} from "../test/utils/Vm.sol";
import {SecurityRegistry} from "../src/security/SecurityRegistry.sol";
import {ISecurityRegistry} from "../src/interfaces/ISecurityRegistry.sol";

/**
 * @title AllowlistGmx
 * @notice Allowlists GMX V2 Synthetics contracts on Arbitrum Sepolia SecurityRegistry.
 *
 * ⚠️ Re-verify addresses before broadcasting — GMX testnet redeploys frequently.
 * Source: gmx-io/gmx-synthetics docs/arbitrumSepolia-deployments.md (2026-05-27)
 *
 * Targets:
 *   ExchangeRouter  0xEd50B2A1eF0C35DAaF08Da6486971180237909c3  — createOrder
 *   OrderVault      0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2  — collateral sink
 *
 * Usage:
 *   SECURITY_REGISTRY_ADDRESS=0x... forge script script/AllowlistGmx.s.sol:AllowlistGmx \
 *     --rpc-url arbitrum_sepolia --broadcast
 */
contract AllowlistGmx {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    address internal constant EXCHANGE_ROUTER = 0xEd50B2A1eF0C35DAaF08Da6486971180237909c3;
    address internal constant ORDER_VAULT = 0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2;

    error WrongNetwork(uint256 chainId);

    function run() external {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);

        address registryAddr = vm.envOr("SECURITY_REGISTRY_ADDRESS", address(0));
        require(registryAddr != address(0), "SECURITY_REGISTRY_ADDRESS required");
        SecurityRegistry registry = SecurityRegistry(registryAddr);

        address[] memory targets = new address[](2);
        targets[0] = EXCHANGE_ROUTER;
        targets[1] = ORDER_VAULT;

        ISecurityRegistry.SecurityStatus[] memory statuses = new ISecurityRegistry.SecurityStatus[](2);
        statuses[0] = ISecurityRegistry.SecurityStatus.Verified;
        statuses[1] = ISecurityRegistry.SecurityStatus.Verified;

        string[] memory uris = new string[](2);
        uris[0] = "gmx-synthetics:ExchangeRouter:arbitrum-sepolia";
        uris[1] = "gmx-synthetics:OrderVault:arbitrum-sepolia";

        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        registry.setStatusBatch(targets, statuses, uris);
        vm.stopBroadcast();
    }
}
