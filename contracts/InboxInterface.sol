// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

interface InboxInterface {
    /**
     * Fulfills the calldata
     * @param _hash The hash of the intent, which must be the hash of the other parameters of this call
     * @param _callAddresses The addresses to call
     * @param _callData The calldata to call
     * @param _expireBlock The block number at which the intent expires
     * @param _compositeNonce The nonce of the calldata. Composed of the hash on the src chain of caller address & nonce & chainID
     */
    function fulfill(
        bytes32 _hash,
        address[] calldata _callAddresses,
        bytes[] calldata _callData,
        uint256 _expireBlock,
        uint256 _compositeNonce
    ) external returns (bytes[] memory);

    // Event emitted when an intent is succesfully fulfilled
    event Fulfillment(bytes32 indexed _hash, address indexed _solver);
    
    // Event emitted when the hash of the intent is not equal to that which we compute from the other parameters
    error InvalidHash();
    
    // Event emitted when the intent callData and callAddresses are not of the same length or empty
    error InvalidData();
    
    // Event emitted when the intent can no longer be fulfilled because its timestamp has expired
    error IntentExpired(uint256 _blockNumber);
    
    // Event emitted when the intent has already been fulfilled
    error IntentAlreadyFulfilled(bytes32 _hash);
    
    // Event emitted when the intent call failed while itertating through the callAddresses
    error AddressCallFailed(address _addr, bytes _data, bytes _returnData);
}
