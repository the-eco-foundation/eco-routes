// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol";
import "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";
import "./interfaces/SimpleProver.sol";
import {ISemver} from "./interfaces/ISemVer.sol";

contract HyperProver is IMessageRecipient, SimpleProver {
    using TypeCasts for bytes32;

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

    // local mailbox address
    address immutable MAILBOX;

    // address of the Inbox contract
    // assumes that all Inboxes are deployed via ERC-2470 and hence have the same address
    address immutable INBOX;

    string public constant version = "0.3.0-beta.0";
    /**
     * @notice constructor
     * @param _mailbox the address of the local mailbox
     * @param _inbox the address of the Inbox contract
     */

    constructor(address _mailbox, address _inbox) {
        MAILBOX = _mailbox;
        INBOX = _inbox;
    }

    /**
     * @notice implementation of the handle method required by IMessageRecipient
     * @dev the uint32 value is not used in this implementation, but it is required by the interface. It is the chain ID of the intent's origin chain.
     * @param _sender the address that called the dispatch() method
     * @param _messageBody the message body
     */
    function handle(uint32, bytes32 _sender, bytes calldata _messageBody) public payable {
        if (MAILBOX != msg.sender) {
            revert UnauthorizedHandle(msg.sender);
        }
        // message body is exactly what was sent into the mailbox on the inbox' chain
        // encode(intentHash, claimant)
        address sender = _sender.bytes32ToAddress();

        if (INBOX != sender) {
            revert UnauthorizedDispatch(sender);
        }
        (bytes32 intentHash, address claimant) = abi.decode(_messageBody, (bytes32, address));
        provenIntents[intentHash] = claimant;
        emit IntentProven(intentHash, claimant);
    }
}
