// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Minimal Foundry cheatcode interface (only the subset used by CanHav
 *      tests/scripts). Vendored so the project needs neither `forge install`
 *      (git submodules) nor the outdated npm `forge-std` mirror — keeping the
 *      whole contracts toolchain git-free. The cheatcode address is the standard
 *      Foundry VM address.
 */
interface Vm {
    function addr(uint256 privateKey) external pure returns (address);
    function sign(uint256 privateKey, bytes32 digest) external pure returns (uint8 v, bytes32 r, bytes32 s);
    function warp(uint256 newTimestamp) external;
    function envUint(string calldata name) external view returns (uint256);
    function envOr(string calldata name, address defaultValue) external view returns (address);
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function expectRevert() external;
    function expectRevert(bytes4 revertData) external;
    function expectRevert(bytes calldata revertData) external;
    function startBroadcast() external;
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
    function label(address account, string calldata newLabel) external;
    function deal(address to, uint256 give) external;
}
