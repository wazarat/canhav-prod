// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IValidationRegistry
 * @notice ERC-8004 Validation Registry interface. Agents request independent
 *         verification of their work; validator contracts (stake-secured
 *         re-execution, zkML verifiers, TEE oracles, trusted judges) record a
 *         response on-chain that anyone can query later.
 */
interface IValidationRegistry {
    /// @notice Emitted when an agent requests validation from a validator.
    event ValidationRequest(
        address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash
    );

    /// @notice Emitted when a validator responds to a request.
    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    /// @notice Request validation of an agent's work from `validatorAddress`.
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external;

    /// @notice Validator records a response (0..100) for a prior request.
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;
}
