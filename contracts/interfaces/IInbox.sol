// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

interface IInbox {

    // Event emitted when an intent is succesfully fulfilled with a non-hyperprover prover
    event Fulfillment(bytes32 indexed _hash, uint256 indexed _sourceChainID, address indexed _claimant);

    // Event emitted when an intent is successfully fulfilled with a hyperprover
    event FastFulfillment(bytes32 indexed _hash, uint256 indexed _sourceChainID, address indexed _claimant);

    // Event emitted when solving is made public
    event SolvingIsPublic();

    // Event emitted when a change is made to the solver whitelist
    event SolverWhitelistChanged(address indexed _solver, bool indexed _canSolve);

    // Event emitted when the prover address of a chain is set
    event ProverSet(uint256 indexed _chainID, address indexed _prover);

    // Event emitted when solving intents is not public and a non-whitelisted address made a solve attempt
    error UnauthorizedSolveAttempt(address _solver);

    // Event emitted when the intent can no longer be fulfilled because its timestamp has expired
    error IntentExpired();

    // Event emitted when the intent has already been fulfilled
    error IntentAlreadyFulfilled(bytes32 _hash);

    // Event emitted when the intent call failed while itertating through the callAddresses
    error IntentCallFailed(address _addr, bytes _data, bytes _returnData);

    // Event emitted when the hash generated on the inbox contract does not match the expected hash
    error InvalidHash(bytes32 _expectedHash);

    // Event emitted when a solver attempts to make a call to the hyperlane mailbox
    error CallToMailbox();

    /**
     * This function is the main entry point for fulfilling an intent. It validates that the intentHash is the hash of the other parameters.
     * It then calls the addresses with their respective calldata, and if successful marks the intent as fulfilled and emits an event.
     * @param _sourceChainID The chainID of the source chain
     * @param _targets The array of addresses to call
     * @param _data The array of calldata
     * @param _expiryTime The timestamp at which the intent expires
     * @param _nonce The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID
     * @param _claimant The address who can claim the reward on the src chain. Not part of the hash
     * @param _expectedHash The hash a solver should expect to be generated from the params above.
     * @dev this is a guardrail to make sure solves dont accidentally solve intents that cannot be proven.
     * @return results The results of the calls as an array of bytes
     */
    function fulfill(
        uint256 _sourceChainID,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce,
        address _claimant,
        bytes32 _expectedHash
    ) external returns (bytes[] memory);

    /**
     * Same as above but with the added _prover parameter. This fulfill method is used to fulfill an intent that is proving with the HyperProver.
     * @param _sourceChainID The chainID of the source chain
     * @param _targets The array of addresses to call
     * @param _data The array of calldata
     * @param _expiryTime The timestamp at which the intent expires
     * @param _nonce The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID
     * @param _claimant The address who can claim the reward on the src chain. Not part of the hash
     * @param _expectedHash The hash a solver should expect to be generated from the params above.
     * @dev this is a guardrail to make sure solves dont accidentally solve intents that cannot be proven.
     * @param _prover The prover against which this intent will be checked
     * @return results The results of the calls as an array of bytes
     */
    function fulfill(
        uint256 _sourceChainID,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce,
        address _claimant,
        bytes32 _expectedHash,
        address _prover
    ) external returns (bytes[] memory);
}