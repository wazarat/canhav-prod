// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CnhvToken
 * @notice tCNHV ("CanHav Test Credits") — a testnet merit-signal ERC-20 that is
 *         the settlement + reputation substrate for agent-to-agent collaboration
 *         on CanHav. It is EARNED through collaborations and CLAIMED from a
 *         faucet for use; it is NOT money, NOT an investment, and NOT a tradeable
 *         security.
 *
 *         The leading `t` and "Test Credits" name make it unmistakable that this
 *         is the testnet (Arbitrum Sepolia) credit, never a mainnet asset.
 *
 *         HARD CONSTRAINTS (matching the rest of the CanHav agent stack):
 *           - Arbitrum Sepolia (chainId 421614) ONLY — the constructor reverts on
 *             any other chain, so this can never be deployed to mainnet.
 *           - Restricted transfers ("merit signal" rule): only mint, burn, and
 *             transfers touching an owner-allowlisted platform address are
 *             permitted. Arbitrary peer-to-peer transfers revert, which keeps
 *             tCNHV from becoming a speculative token while still letting it flow
 *             through legitimate platform actions (faucet, collab router, ledgers).
 *
 *         Built on OpenZeppelin: `ERC20` (v5 `_update` hook), `ERC20Permit`
 *         (gasless approvals — pairs with ZeroDev smart accounts), and `Ownable`.
 */
contract CnhvToken is ERC20, ERC20Permit, Ownable {
    uint256 internal constant ARBITRUM_SEPOLIA = 421614;

    /// @notice Amount minted per faucet claim (100 tCNHV, 18 decimals).
    uint256 public constant FAUCET_AMOUNT = 100e18;

    /// @notice Minimum delay between faucet claims for a single address.
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    /// @notice Last faucet-claim timestamp per address (0 = never claimed).
    mapping(address => uint256) public lastClaim;

    /// @notice Addresses cleared for transfers (faucet, collab router, factory,
    ///         agent ledgers). A transfer is allowed when either side is listed.
    mapping(address => bool) public transferAllowed;

    error WrongNetwork(uint256 chainId);
    error FaucetCooldownActive(uint256 nextClaimAt);
    error TransferRestricted(address from, address to);

    event FaucetClaimed(address indexed to, uint256 amount);
    event TransferAllowedSet(address indexed account, bool allowed);

    constructor(address initialOwner)
        ERC20("CanHav Test Credits", "tCNHV")
        ERC20Permit("CanHav Test Credits")
        Ownable(initialOwner)
    {
        if (block.chainid != ARBITRUM_SEPOLIA) revert WrongNetwork(block.chainid);
    }

    /**
     * @notice Claim a fixed amount of tCNHV (testnet faucet). Rate-limited to one
     *         claim per {FAUCET_COOLDOWN} per address so a new user can transact
     *         immediately but cannot drain the supply.
     */
    function faucet() external {
        uint256 last = lastClaim[msg.sender];
        // Cooldown gate. Minor validator timestamp drift is acceptable for a
        // testnet faucet (matches the block-timestamp posture elsewhere).
        // forge-lint: disable-next-line(block-timestamp)
        if (last != 0 && block.timestamp < last + FAUCET_COOLDOWN) {
            revert FaucetCooldownActive(last + FAUCET_COOLDOWN);
        }
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Owner-only mint for seeding (e.g. funding the collab router).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Allowlist (or de-list) an address for transfers (merit-signal rule).
    function setTransferAllowed(address account, bool allowed) external onlyOwner {
        transferAllowed[account] = allowed;
        emit TransferAllowedSet(account, allowed);
    }

    /**
     * @dev OZ v5 transfer hook. Permits mint (`from == 0`), burn (`to == 0`), and
     *      any transfer where either party is allowlisted; reverts arbitrary
     *      peer-to-peer transfers so tCNHV stays a non-speculative merit signal.
     */
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            if (!transferAllowed[from] && !transferAllowed[to]) {
                revert TransferRestricted(from, to);
            }
        }
        super._update(from, to, value);
    }
}
