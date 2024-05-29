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
    mapping(bytes32 => IntentFulfillment) public fulfilled;

    // Check that the intent has not expired
    modifier validTimestamp(uint256 _expireTimestamp) {
        if (block.timestamp <= _expireTimestamp) {
            _;
        } else {
            revert IntentExpired();
        }
    }

    // Check that the intent hash has not been fulfilled
    modifier unfulfilled(bytes32 _nonce) {
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
     * @param _targets The addresses to call
     * @param _datas The calldata to call
     * @param _expireTimestamp The timestamp at which the intent expires
     * @param _claimer The address who can claim the reward on the src chain. Not part of the hash
     * @return results The results of the calls as an array of bytes
     */
    function fulfill(
        bytes32 _nonce,
        address[] calldata _targets,
        bytes[] calldata _datas,
        uint256 _expireTimestamp,
        address _claimer
    ) external unfulfilled(_nonce) validTimestamp(_expireTimestamp) returns (bytes[] memory) {
        // Store the results of the calls
        bytes[] memory results = new bytes[](_datas.length);
        // Call the addresses with the calldata
        for (uint256 i = 0; i < _datas.length; i++) {
            (bool success, bytes memory result) = _targets[i].call(_datas[i]);
            if (!success) {
                revert IntentCallFailed(_targets[i], _datas[i], result);
            }
            results[i] = result;
        }
        // Mark the intent as fulfilled
        fulfilled[_nonce] = IntentFulfillment(encodeHash(_nonce, _targets, _datas, _expireTimestamp), _claimer);

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
        bytes32 _nonce,
        address[] calldata _callAddresses,
        bytes[] calldata _callData,
        uint256 _expireTimestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(_nonce, _callAddresses, _callData, _expireTimestamp));
    }
}
