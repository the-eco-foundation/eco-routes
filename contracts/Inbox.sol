// SPDX-License-Identifier: MIT
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
    modifier validTimestamp(uint256 _expiryTime) {
        if (block.timestamp <= _expiryTime) {
            _;
        } else {
            revert IntentExpired();
        }
    }

    function fulfill(
        uint256 _sourceChainID,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce,
        address _claimant,
        bytes32 _expectedHash
    ) external validTimestamp(_expiryTime) returns (bytes[] memory) {
        bytes32 intentHash =
            encodeHash(_sourceChainID, block.chainid, address(this), _targets, _data, _expiryTime, _nonce);

        // revert if locally calculated hash does not match expected hash
        if (intentHash != _expectedHash) {
            revert InvalidHash(_expectedHash);
        }

        // revert if intent has already been fulfilled
        if (fulfilled[intentHash] != address(0)) {
            revert IntentAlreadyFulfilled(intentHash);
        }
        // Store the results of the calls
        bytes[] memory results = new bytes[](_data.length);
        // Call the addresses with the calldata
        for (uint256 i = 0; i < _data.length; i++) {
            (bool success, bytes memory result) = _targets[i].call(_data[i]);
            if (!success) {
                revert IntentCallFailed(_targets[i], _data[i], result);
            }
            results[i] = result;
        }
        // Mark the intent as fulfilled
        fulfilled[intentHash] = _claimant;

        // Emit an event
        emit Fulfillment(intentHash, _sourceChainID, _claimant);

        // Return the results
        return results;
    }

    /**
     * This function generates the intent hash
     * @param _sourceChainID the chainID of the source chain
     * @param _chainId the chainId of this chain
     * @param _inboxAddress the address of this contract
     * @param _targets The addresses to call
     * @param _data The calldata to call
     * @param _expiryTime The timestamp at which the intent expires
     * @param _nonce The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID
     * @return hash The hash of the intent parameters
     */
    function encodeHash(
        uint256 _sourceChainID,
        uint256 _chainId,
        address _inboxAddress,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                _inboxAddress, keccak256(abi.encode(_sourceChainID, _chainId, _targets, _data, _expiryTime, _nonce))
            )
        );
    }
}
