// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Vm} from "../test/utils/Vm.sol";
import {CnhvToken} from "../src/token/CnhvToken.sol";
import {AgentFactory} from "../src/factory/AgentFactory.sol";

/**
 * @title BackfillLedgers
 * @notice One-off backfill that creates an {AgentLedger} clone for each
 *         already-minted ERC-8004 agent and allowlists its wallet for tCNHV
 *         transfers — bringing existing agents up to parity with the
 *         auto-on-spawn flow. TARGET: Arbitrum Sepolia (chainId 421614) ONLY.
 *
 *         The platform OWNER (deployer) runs this; agents never deploy. It is
 *         IDEMPOTENT: agents that already have a ledger are skipped, and an
 *         already-allowlisted wallet is left untouched, so it is safe to re-run
 *         (a second {AgentFactory.createLedger} would otherwise revert
 *         {LedgerExists}).
 *
 * Usage (the USER runs this):
 *   AGENT_FACTORY_ADDRESS=0x... TCNHV_TOKEN_ADDRESS=0x... \
 *   BACKFILL_AGENT_IDS="12,15,18" \
 *   BACKFILL_OWNERS="0xowner1,0xowner2,0xowner3" \
 *   BACKFILL_WALLETS="0xwallet1,0xwallet2,0xwallet3" \
 *   forge script script/BackfillLedgers.s.sol:BackfillLedgers \
 *     --rpc-url arbitrum_sepolia --broadcast --slow
 *
 * The three lists are comma-separated and index-aligned (entry i across all
 * three describes one agent). Requires PRIVATE_KEY (= the factory/token owner).
 *
 * Equivalent per-agent cast commands (no script):
 *   cast send $AGENT_FACTORY_ADDRESS "createLedger(uint256,address,address)" \
 *     $AGENT_ID $OWNER $AGENT_WALLET --rpc-url $RPC --private-key $PRIVATE_KEY
 *   cast send $TCNHV_TOKEN_ADDRESS "setTransferAllowed(address,bool)" \
 *     $AGENT_WALLET true --rpc-url $RPC --private-key $PRIVATE_KEY
 */
contract BackfillLedgers {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    error WrongNetwork(uint256 chainId);
    error MissingAddress(string name);
    error LengthMismatch(uint256 ids, uint256 owners, uint256 wallets);

    function run() external {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);

        address factoryAddr = vm.envOr("AGENT_FACTORY_ADDRESS", address(0));
        if (factoryAddr == address(0)) revert MissingAddress("AGENT_FACTORY_ADDRESS");
        address tokenAddr = vm.envOr("TCNHV_TOKEN_ADDRESS", address(0));
        if (tokenAddr == address(0)) revert MissingAddress("TCNHV_TOKEN_ADDRESS");

        AgentFactory factory = AgentFactory(factoryAddr);
        CnhvToken token = CnhvToken(tokenAddr);

        uint256[] memory agentIds = vm.envUint("BACKFILL_AGENT_IDS", ",");
        address[] memory owners = vm.envAddress("BACKFILL_OWNERS", ",");
        address[] memory wallets = vm.envAddress("BACKFILL_WALLETS", ",");
        if (agentIds.length != owners.length || agentIds.length != wallets.length) {
            revert LengthMismatch(agentIds.length, owners.length, wallets.length);
        }

        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        for (uint256 i = 0; i < agentIds.length; i++) {
            // Idempotent: only create a ledger that doesn't exist yet.
            if (factory.ledgerOf(agentIds[i]) == address(0)) {
                factory.createLedger(agentIds[i], owners[i], wallets[i]);
            }
            // Allowlist the agent wallet so it can send/receive tCNHV in collab
            // settlement (the token's _update restricts arbitrary transfers).
            if (!token.transferAllowed(wallets[i])) {
                token.setTransferAllowed(wallets[i], true);
            }
        }
        vm.stopBroadcast();
    }
}
