// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import '@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol'

contract MasterProver is IMessageRecipient {

    mapping(bytes32 => address) provenIntents;

    mapping(uint256 => address) inboxes;

    // have to gate this s.t. only the mailbox can call it + only coming from an inbox contract
    function handle(uint32 _origin, bytes32 _sender, bytes calldata _messageBody) {
        // message body is exactly what was sent into the mailbox on the inbox' chain
        // encode(intentHash, claimant)
        (bytes32 intentHash, address claimant) = abi.decode(_messageBody, (bytes32, address));
        provenIntents[intentsHash] = claimant;
    }
}