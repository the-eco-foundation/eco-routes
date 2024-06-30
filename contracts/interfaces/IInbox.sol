// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

interface IInbox {
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
    ) external returns (bytes[] memory);

    // Event emitted when an intent is succesfully fulfilled
    event Fulfillment(bytes32 indexed _hash);

    // Event emitted when the intent can no longer be fulfilled because its timestamp has expired
    error IntentExpired();

    // Event emitted when the intent has already been fulfilled
    error IntentAlreadyFulfilled(bytes32 _hash);

    // Event emitted when the intent call failed while itertating through the callAddresses
    error IntentCallFailed(address _addr, bytes _data, bytes _returnData);
}
