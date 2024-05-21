// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "./InboxInterface.sol";

// approve the inbox outside of contract by solver
// a. transfer funds to the solver contract + call the calldata that transfers to the end user
// b. array of calldata 1) transfers to the solver contract 2) transfers to the end user
contract Inbox is InboxInterface {
    // Mapping of intent hash to whether it has been fulfilled
    mapping(bytes32 => bool) public fulfilled;

    // Check that the intent has not expired
    modifier validTimestamp(uint256 _expireBlock) {
        if (block.number <= _expireBlock) {
            _;
        } else {
            revert IntentExpired(block.number);
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

    // Check that the hash is valid and generated from the other parameters
    modifier validHash(
        bytes32 _hash,
        address[] calldata _callAddresses,
        bytes[] calldata _callData,
        uint256 _expireBlock,
        uint256 _compositeNonce
    ) {
        if (
            _hash ==
            keccak256(
                abi.encode(
                    _callAddresses,
                    _callData,
                    _expireBlock,
                    _compositeNonce
                )
            )
        ) {
            _;
        } else {
            revert InvalidHash();
        }
    }

    // Check that the intent hash has not been fulfilled
    modifier unfulfilled(bytes32 _hash) {
        if (!fulfilled[_hash]) {
            _;
        } else {
            revert IntentAlreadyFulfilled(_hash);
        }
    }

    /**
     * This function is the main entry point for fulfilling an intent. It validates that the hash is the hash of the other parameters.
     * It then calls the addresses with the calldata, and if successful marks the intent as fulfilled and emits an event.
     *
     * @param _hash The hash of the intent, which must be the hash of the other parameters of this call
     * @param _callAddresses The addresses to call
     * @param _callData The calldata to call
     * @param _expireBlock The block number at which the intent expires
     * @param _compositeNonce The nonce of the calldata. Composed of the hash on the src chain of caller address & nonce & chainID
     * @return results The results of the calls as an array of bytes
     */
    function fulfill(
        bytes32 _hash,
        address[] calldata _callAddresses,
        bytes[] calldata _callData,
        uint256 _expireBlock,
        uint256 _compositeNonce
    )
        external
        unfulfilled(_hash)
        validData(_callAddresses, _callData)
        validTimestamp(_expireBlock)
        validHash(
            _hash,
            _callAddresses,
            _callData,
            _expireBlock,
            _compositeNonce
        )
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
                revert AddressCallFailed(
                    _callAddresses[i],
                    _callData[i],
                    result
                );
            }
            results[i] = result;
        }
        // Mark the intent as fulfilled
        fulfilled[_hash] = true;

        // Emit an event
        emit Fulfillment(_hash, msg.sender);

        // Return the results
        return results;
    }
}
