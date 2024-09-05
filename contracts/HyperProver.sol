// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import '@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol';
import './interfaces/SimpleProver.sol';


contract HyperProver is IMessageRecipient, SimpleProver {

    /**
     * emitted on an unauthorized call to the handle() method
     * @param _sender the address that called the handle() method
     */
    error UnauthorizedHandle(address _sender);

    /**
     * emitted when the handle() call is a result of an unauthorized dispatch() call on another chain's Mailbox
     * @param _sender the address that called the dispatch() method
     */
    error UnauthorizedDispatch(address _sender);
    
    // address of the Inbox contract
    // assumes that all Inboxes are deployed via ERC-2470 and hence have the same address
    address immutable INBOX;

    // local mailbox address
    address immutable MAILBOX;

    function handle(uint32 _origin, bytes32 _sender, bytes calldata _messageBody) public {

        if(MAILBOX != msg.sender) {
            revert UnauthorizedHandle(msg.sender);
        }

        // message body is exactly what was sent into the mailbox on the inbox' chain
        // encode(intentHash, claimant)
        if (INBOX != _sender) {
            revert UnauthorizedDispatch(_sender);
        }
        (bytes32 intentHash, address claimant) = abi.decode(_messageBody, (bytes32, address));
        provenIntents[intentsHash] = claimant;
        emit IntentProven(intentHash, claimant);
    }
}