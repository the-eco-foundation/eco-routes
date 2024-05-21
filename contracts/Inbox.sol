// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "./InboxInterface.sol";

/**
 * @title Inbox
 * @dev The Inbox contract is the main entry point for fulfilling an intent. 
 * It validates that the hash is the hash of the other parameters, and then executes the calldata.
 * A prover can then claim the reward on the src chain by looking at the fulfilled mapping.
 */
contract Inbox is InboxInterface {
    /**
     * Struct that stores the hash and address for a fulfilled intent.
     * Both of these fields are needed for a prover to claim the reward on t
     * the src chain
     */
    struct IntentFulfillment {
        bytes32 hash;
        address claimer;
    }
    
    // Mapping of intent nonce on the src chain to its fulfillment
    mapping(uint256 => IntentFulfillment) public fulfilled;

    // Check that the intent has not expired
    modifier validTimestamp(uint256 _expireTimestamp) {
        if (block.timestamp <= _expireTimestamp) {
            _;
        } else {
            revert IntentExpired();
        }
    }

    // Check that the _callAddresses and calldata are valid and of same length
    modifier validData(
        address[] calldata _callAddresses,
        bytes[] calldata _callData
    ) {
        if (
            _callAddresses.length != 0 &&
            _callAddresses.length == _callData.length
        ) {
            _;
        } else {
            revert InvalidData();
        }
    }

    // Check that the intent hash has not been fulfilled
    modifier unfulfilled(uint256 _nonce) {
        if (fulfilled[_nonce].claimer == address(0)) {
            _;
        } else {
            revert IntentAlreadyFulfilled(_nonce);
        }
    }

    /**
     * This function is the main entry point for fulfilling an intent. It validates that the hash is the hash of the other parameters.
     * It then calls the addresses with the calldata, and if successful marks the intent as fulfilled and emits an event.
     *
     * @param _nonce The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID
     * @param _callAddresses The addresses to call
     * @param _callData The calldata to call
     * @param _expireTimestamp The timestamp at which the intent expires
     * @param _claimer The address who can claim the reward on the src chain. Not part of the hash
     * @return results The results of the calls as an array of bytes
     */
    function fulfill(
        uint256 _nonce,
        address[] calldata _callAddresses,
        bytes[] calldata _callData,
        uint256 _expireTimestamp,
        address _claimer
    )
        external
        unfulfilled(_nonce)
        validData(_callAddresses, _callData)
        validTimestamp(_expireTimestamp)
        returns (bytes[] memory)
    {
        // Store the results of the calls
        bytes[] memory results = new bytes[](_callData.length);
        // Call the addresses with the calldata
        for (uint256 i = 0; i < _callData.length; i++) {
            (bool success, bytes memory result) = _callAddresses[i].call(
                _callData[i]
            );
            if (!success) {
                revert IntentCallFailed(
                    _callAddresses[i],
                    _callData[i],
                    result
                );
            }
            results[i] = result;
        }
        // Mark the intent as fulfilled
        fulfilled[_nonce] = IntentFulfillment(
            encodeHash(_nonce, _callAddresses, _callData, _expireTimestamp),
            _claimer
        );

        // Emit an event
        emit Fulfillment(_nonce);

        // Return the results
        return results;
    }

    /**
     * This function encodes the hash of the intent parameters
     *
     * @param _nonce The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID
     * @param _callAddresses The addresses to call
     * @param _callData The calldata to call
     * @param _expireTimestamp The timestamp at which the intent expires
     * @return hash The hash of the intent parameters
     */
    function encodeHash(
        uint256 _nonce,
        address[] calldata _callAddresses,
        bytes[] calldata _callData,
        uint256 _expireTimestamp
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(_nonce, _callAddresses, _callData, _expireTimestamp)
            );
    }
}
