// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Vm} from "../test/utils/Vm.sol";
import {CnhvToken} from "../src/token/CnhvToken.sol";
import {AgentLedger} from "../src/factory/AgentLedger.sol";
import {AgentFactory} from "../src/factory/AgentFactory.sol";

/**
 * @title DeployFactoryToken
 * @notice Deploys the NEW tCNHV token + AgentLedger master + AgentFactory as an
 *         ADDITIVE layer on top of the already-deployed ERC-8004 stack. TARGET:
 *         Arbitrum Sepolia (chainId 421614) ONLY.
 *
 *         This script deliberately does NOT redeploy the six existing contracts
 *         (Identity/Security/Collab/Agreement/Reputation/Validation). It instead
 *         REFERENCES the already-deployed IdentityRegistry + CollabRegistry by
 *         address (read from env), so existing mints/records are never orphaned.
 *
 * Usage (the USER runs this; agents never deploy):
 *   forge script script/DeployFactoryToken.s.sol:DeployFactoryToken \
 *     --rpc-url arbitrum_sepolia --broadcast --verify
 *
 * Requires PRIVATE_KEY + ARBITRUM_SEPOLIA_RPC_URL (+ ARBISCAN_API_KEY) in env.
 * Optionally set IDENTITY_REGISTRY_ADDRESS + COLLAB_REGISTRY_ADDRESS so the
 * factory references the live registries (else they default to address(0), which
 * is harmless — they are forward-looking references for the deferred collab hook).
 *
 * After broadcast, record the logged addresses in env:
 *   TCNHV_TOKEN_ADDRESS, AGENT_FACTORY_ADDRESS, AGENT_LEDGER_IMPL_ADDRESS.
 */
contract DeployFactoryToken {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    error WrongNetwork(uint256 chainId);

    function run() external returns (CnhvToken token, AgentLedger ledgerImpl, AgentFactory factory) {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        // Reference the ALREADY-DEPLOYED registries — do NOT redeploy them.
        address identity = vm.envOr("IDENTITY_REGISTRY_ADDRESS", address(0));
        address collab = vm.envOr("COLLAB_REGISTRY_ADDRESS", address(0));

        vm.startBroadcast(pk);
        token = new CnhvToken(deployer);
        ledgerImpl = new AgentLedger();
        factory = new AgentFactory(address(ledgerImpl), identity, collab, address(token), deployer);
        // Allowlist the factory for tCNHV transfers (forward-looking for the
        // collab settlement hook). Per-ledger allowlisting is added when that
        // flow is wired; the live USDC settlement path is untouched today.
        token.setTransferAllowed(address(factory), true);
        vm.stopBroadcast();
    }
}
