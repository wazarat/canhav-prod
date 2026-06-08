// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Vm} from "../test/utils/Vm.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/reputation/ReputationRegistry.sol";
import {ValidationRegistry} from "../src/validation/ValidationRegistry.sol";
import {SecurityRegistry} from "../src/security/SecurityRegistry.sol";

/**
 * @title Deploy
 * @notice Deploys the ERC-8004 registries + the CanHav SecurityRegistry as
 *         per-chain singletons. TARGET: Arbitrum Sepolia (chainId 421614) ONLY.
 *
 * Usage (the USER runs this; agents never deploy):
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url arbitrum_sepolia --broadcast --verify
 *
 * Requires PRIVATE_KEY + ARBITRUM_SEPOLIA_RPC_URL (+ ARBISCAN_API_KEY) in env.
 * Reverts unless block.chainid == 421614 (Arbitrum Sepolia, testnet only).
 */
contract Deploy {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    error WrongNetwork(uint256 chainId);

    function run()
        external
        returns (
            IdentityRegistry identity,
            ReputationRegistry reputation,
            ValidationRegistry validation,
            SecurityRegistry security
        )
    {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        identity = new IdentityRegistry();
        reputation = new ReputationRegistry(address(identity));
        validation = new ValidationRegistry(address(identity));
        security = new SecurityRegistry(deployer);
        vm.stopBroadcast();
    }
}
