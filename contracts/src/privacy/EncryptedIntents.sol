// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE, euint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {InEuint64} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";

/**
 * @title EncryptedIntents
 * @notice FHE Phase-1 (Pathway C) anchor for encrypted trade-intent sizes.
 *         register() converts a client-encrypted euint64 (6-dec micro-USD)
 *         input into a live CoFHE ciphertext and grants ACL access to the
 *         proposing owner (msg.sender) and to this contract, so the owner can
 *         decrypt-for-view their own pending proposal later and Phase 2 can
 *         run FHE.lte spending-cap comparisons on the same handles.
 *
 *         Stores no plaintext and no state; emits only the opaque handle.
 *         TARGET: Arbitrum Sepolia (chainId 421614) ONLY — CoFHE testnet.
 */
contract EncryptedIntents {
    /// @notice A trade-intent size ciphertext was registered and ACL-granted.
    /// @param owner  The proposer (msg.sender) granted decryption access.
    /// @param handle The live ciphertext handle — authoritative id to store
    ///               off-chain and to pass to decryptForView.
    event IntentRegistered(address indexed owner, uint256 handle);

    /// @notice Verify a CoFHE-encrypted euint64 micro-USD input and grant the
    ///         sender (and this contract, for Phase-2 cap math) ACL access.
    function register(InEuint64 calldata sizeUsdMicro) external returns (uint256 handle) {
        euint64 value = FHE.asEuint64(sizeUsdMicro); // verifies the CoFHE verifier signature
        FHE.allowThis(value);
        FHE.allowSender(value);
        handle = uint256(euint64.unwrap(value));
        emit IntentRegistered(msg.sender, handle);
    }
}
