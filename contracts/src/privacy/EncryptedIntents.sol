// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE, euint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {InEuint64} from "@fhenixprotocol/cofhe-contracts/ICofhe.sol";

/**
 * @title EncryptedIntents
 * @notice FHE Pathway-C anchor for encrypted trade-intent sizes (Phase 1) and
 *         on-chain encrypted spending caps (Phase 2).
 *
 *         Phase 1 — register() converts a client-encrypted euint64 (6-dec
 *         micro-USD) input into a live CoFHE ciphertext and grants ACL access
 *         to the proposing owner (msg.sender) and to this contract, so the
 *         owner can decrypt-for-view their own pending proposal later.
 *
 *         Phase 2 — per-(owner, agentKey) encrypted caps. setCaps() stores a
 *         euint64 per-trade cap + 24h cumulative cap; registerAndCheck()
 *         registers an intent size AND computes
 *             ok = (size <= perTradeCap) && (spent + size <= cumulativeCap)
 *         as an ebool the owner alone can decrypt. The threshold network's
 *         decrypt attestation for that ebool is what the CanHav server
 *         verifies before granting auto-execute — the server never sees the
 *         size, the caps, or the running spend. recordSpend() adds an
 *         executed intent's size to the encrypted 24h counter (window
 *         timestamps are public; amounts never are).
 *
 *         Trust notes (documented honestly):
 *         - agentKey is keccak256 of the platform agent id — an opaque,
 *           owner-scoped namespace, not an ERC-8004 id.
 *         - recordSpend is owner-initiated: the encrypted counter is as
 *           honest as the owner's client. The platform's plaintext cap check
 *           at execute time remains the enforcement backstop.
 *         - euint64 micro-USD with platform caps (<= $50) cannot realistically
 *           overflow; FHE.add wraps silently, which would only corrupt the
 *           owner's own counter.
 *
 *         Stores no plaintext money numbers.
 *         TARGET: Arbitrum Sepolia (chainId 421614) ONLY — CoFHE testnet.
 */
contract EncryptedIntents {
    struct EncryptedCaps {
        euint64 perTradeCap;
        euint64 cumulativeCap;
        euint64 spent;
        uint64 windowStart;
        bool set;
    }

    struct CapCheck {
        address owner;
        bytes32 agentKey;
        uint256 okHandle;
        bool spendRecorded;
    }

    uint64 public constant SPEND_WINDOW = 24 hours;

    mapping(address => mapping(bytes32 => EncryptedCaps)) private _caps;
    /// intent size handle → its cap-check binding (registerAndCheck only).
    mapping(uint256 => CapCheck) private _checks;

    /// @notice A trade-intent size ciphertext was registered and ACL-granted.
    /// @param owner  The proposer (msg.sender) granted decryption access.
    /// @param handle The live ciphertext handle — authoritative id to store
    ///               off-chain and to pass to decryptForView.
    event IntentRegistered(address indexed owner, uint256 handle);

    /// @notice Encrypted caps were (re)set; the 24h spend window restarts.
    event CapsSet(address indexed owner, bytes32 indexed agentKey);

    /// @notice An intent size was compared against the caps.
    /// @param okHandle ebool handle — decrypts (owner-only) to "within caps".
    event CapChecked(
        address indexed owner,
        bytes32 indexed agentKey,
        uint256 sizeHandle,
        uint256 okHandle
    );

    /// @notice An executed intent's size was added to the encrypted counter.
    event SpendRecorded(address indexed owner, bytes32 indexed agentKey, uint256 sizeHandle);

    // ---------------------------------------------------------------- Phase 1

    /// @notice Verify a CoFHE-encrypted euint64 micro-USD input and grant the
    ///         sender (and this contract, for cap math) ACL access.
    function register(InEuint64 calldata sizeUsdMicro) external returns (uint256 handle) {
        euint64 value = FHE.asEuint64(sizeUsdMicro); // verifies the CoFHE verifier signature
        FHE.allowThis(value);
        FHE.allowSender(value);
        handle = uint256(euint64.unwrap(value));
        emit IntentRegistered(msg.sender, handle);
    }

    // ---------------------------------------------------------------- Phase 2

    /// @notice Store encrypted per-trade + 24h cumulative caps (euint64
    ///         micro-USD) for the caller's agent. Resets the spend window —
    ///         caps are self-imposed guardrails, so a reset only loosens the
    ///         caller's own protection.
    function setCaps(
        bytes32 agentKey,
        InEuint64 calldata perTradeCapMicro,
        InEuint64 calldata cumulativeCapMicro
    ) external {
        euint64 perTrade = FHE.asEuint64(perTradeCapMicro);
        euint64 cumulative = FHE.asEuint64(cumulativeCapMicro);
        euint64 zero = FHE.asEuint64(0);
        FHE.allowThis(perTrade);
        FHE.allowSender(perTrade);
        FHE.allowThis(cumulative);
        FHE.allowSender(cumulative);
        FHE.allowThis(zero);
        _caps[msg.sender][agentKey] = EncryptedCaps({
            perTradeCap: perTrade,
            cumulativeCap: cumulative,
            spent: zero,
            windowStart: uint64(block.timestamp),
            set: true
        });
        emit CapsSet(msg.sender, agentKey);
    }

    /// @notice Register an intent size (Phase-1 semantics) and compare it to
    ///         the caller's encrypted caps in the same tx. The resulting
    ///         ebool is ACL-granted to the caller only.
    function registerAndCheck(
        bytes32 agentKey,
        InEuint64 calldata sizeUsdMicro
    ) external returns (uint256 sizeHandle, uint256 okHandle) {
        EncryptedCaps storage caps = _caps[msg.sender][agentKey];
        require(caps.set, "EncryptedIntents: caps not set");

        euint64 size = FHE.asEuint64(sizeUsdMicro);
        FHE.allowThis(size);
        FHE.allowSender(size);
        sizeHandle = uint256(euint64.unwrap(size));
        emit IntentRegistered(msg.sender, sizeHandle);

        _rollWindow(caps);
        ebool ok = FHE.and(
            FHE.lte(size, caps.perTradeCap),
            FHE.lte(FHE.add(caps.spent, size), caps.cumulativeCap)
        );
        FHE.allowSender(ok);
        okHandle = uint256(ebool.unwrap(ok));
        _checks[sizeHandle] = CapCheck({
            owner: msg.sender,
            agentKey: agentKey,
            okHandle: okHandle,
            spendRecorded: false
        });
        emit CapChecked(msg.sender, agentKey, sizeHandle, okHandle);
    }

    /// @notice Add an executed intent's size to the caller's encrypted 24h
    ///         counter. Only the intent's registrant may record it, once.
    function recordSpend(bytes32 agentKey, uint256 sizeHandle) external {
        CapCheck storage check = _checks[sizeHandle];
        require(
            check.owner == msg.sender && check.agentKey == agentKey,
            "EncryptedIntents: unknown intent"
        );
        require(!check.spendRecorded, "EncryptedIntents: spend already recorded");
        EncryptedCaps storage caps = _caps[msg.sender][agentKey];
        require(caps.set, "EncryptedIntents: caps not set");

        check.spendRecorded = true;
        _rollWindow(caps);
        euint64 next = FHE.add(caps.spent, euint64.wrap(bytes32(sizeHandle)));
        FHE.allowThis(next);
        caps.spent = next;
        emit SpendRecorded(msg.sender, agentKey, sizeHandle);
    }

    // ------------------------------------------------------------------ Views

    function hasCaps(address owner, bytes32 agentKey) external view returns (bool) {
        return _caps[owner][agentKey].set;
    }

    function capWindowStart(address owner, bytes32 agentKey) external view returns (uint64) {
        return _caps[owner][agentKey].windowStart;
    }

    /// @notice Binding the server reads to tie a size handle to its cap-check
    ///         ebool, registrant, and agent before trusting an attestation.
    function capCheckOf(
        uint256 sizeHandle
    ) external view returns (address owner, bytes32 agentKey, uint256 okHandle, bool spendRecorded) {
        CapCheck storage check = _checks[sizeHandle];
        return (check.owner, check.agentKey, check.okHandle, check.spendRecorded);
    }

    // --------------------------------------------------------------- Internal

    /// @dev Fixed (not sliding) 24h window: when it lapses, the encrypted
    ///      counter resets to a fresh trivial-encrypt zero. Timestamps are
    ///      public by design; only amounts are ciphertext.
    function _rollWindow(EncryptedCaps storage caps) private {
        if (uint64(block.timestamp) >= caps.windowStart + SPEND_WINDOW) {
            euint64 zero = FHE.asEuint64(0);
            FHE.allowThis(zero);
            caps.spent = zero;
            caps.windowStart = uint64(block.timestamp);
        }
    }
}
