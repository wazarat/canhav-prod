// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Vm} from "../test/utils/Vm.sol";
import {EncryptedIntents} from "../src/privacy/EncryptedIntents.sol";

/**
 * @title DeployEncryptedIntents
 * @notice Deploys the FHE Phase-1 EncryptedIntents anchor (CoFHE euint64
 *         trade-intent registration). ADDITIVE — touches nothing else.
 *         TARGET: Arbitrum Sepolia (chainId 421614) ONLY.
 *
 * Usage (the USER runs this; agents never deploy):
 *   forge script script/DeployEncryptedIntents.s.sol:DeployEncryptedIntents \
 *     --rpc-url arbitrum_sepolia --broadcast
 *
 * Requires PRIVATE_KEY + ARBITRUM_SEPOLIA_RPC_URL in env.
 * After broadcast, record the logged address as the fallback in
 * frontend/lib/agent/fhe/config.ts (override: NEXT_PUBLIC_FHE_INTENTS_ADDRESS).
 */
contract DeployEncryptedIntents {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    error WrongNetwork(uint256 chainId);

    function run() external returns (EncryptedIntents intents) {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);

        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        intents = new EncryptedIntents();
        vm.stopBroadcast();
    }
}
