// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "./interfaces/IInbox.sol";

/**
 * @title Inbox
 * @dev The Inbox contract is the main entry point for fulfilling an intent.
 * It validates that the hash is the hash of the other parameters, and then executes the calldata.
 * A prover can then claim the reward on the src chain by looking at the fulfilled mapping.
 */
contract Inbox is IInbox {
    // Mapping of intent hash on the src chain to its fulfillment
    mapping(bytes32 => address) public fulfilled;

    // Check that the intent has not expired
    modifier validTimestamp(uint256 _expireTimestamp) {
        if (block.timestamp <= _expireTimestamp) {
            _;
        } else {
            revert IntentExpired();
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
     * @param _claimant The address who can claim the reward on the src chain. Not part of the hash
     * @return results The results of the calls as an array of bytes
     */
    function fulfill(
        bytes32 _nonce,
        address[] calldata _targets,
        bytes[] calldata _datas,
        uint256 _expireTimestamp,
        address _claimant,
        bytes32 _expectedHash
    ) external validTimestamp(_expireTimestamp) returns (bytes[] memory) {
        bytes32 intentHash = encodeHash(block.chainid, _targets, _datas, _expireTimestamp, _nonce);

        // revert if locally calculated hash does not match expected hash
        if (intentHash != _expectedHash) {
            revert InvalidHash(_expectedHash);
        }

        // revert if intent has already been fulfilled
        if (fulfilled[intentHash] != address(0)) {
            revert IntentAlreadyFulfilled(intentHash);
        }
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
        fulfilled[intentHash] = _claimant;

        // Emit an event
        emit Fulfillment(intentHash, _claimant);

        // Return the results
        return results;
    }

    /**
     * This function generates the intent hash
     * @param _chainId the chainId of this chain
     * @param _callAddresses The addresses to call
     * @param _callData The calldata to call
     * @param _expireTimestamp The timestamp at which the intent expires
     * @param _nonce The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID
     * @return hash The hash of the intent parameters
     */
    function encodeHash(
        uint256 _chainId,
        address[] calldata _callAddresses,
        bytes[] calldata _callData,
        uint256 _expireTimestamp,
        bytes32 _nonce
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(_chainId, _callAddresses, _callData, _expireTimestamp, _nonce));
    }
}
