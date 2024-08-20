// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "./interfaces/IInbox.sol";
import "@hyperlane-xyz/core/contracts/Mailbox.sol";
import "@hyperlane-xyz/core/contracts/libs/Message.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EcoMailbox is Mailbox, Ownable {

        using Message for bytes;

    address public immutable MASTERPROVER;

    address public inbox;

    constructor(uint32 _localDomain, address _masterProver) Mailbox(_localDomain) {
        MASTERPROVER = _masterProver;
    }

    // new dispatch method wrapper that fetches the correct address once msg gets to the other chain
    function dispatch(
        uint32 _destinationDomain,
        bytes calldata _messageBody
    ) external payable override returns (bytes32) {
        return dispatch(
            _destinationDomain,
            address(0),
            _messageBody,
            _messageBody[0:0],
            defaultHook
        );
    }

    // standard dispatch but it first checks that the message was sent by the inbox
    function dispatch(
        uint32 destinationDomain,
        bytes32 recipientAddress,
        bytes calldata messageBody,
        bytes calldata metadata,
        IPostDispatchHook hook
    ) public payable virtual returns (bytes32) {
        if (msg.sender == inbox) {
            Mailbox(this).dispatch(destinationDomain, recipientAddress, messageBody, metadata, hook);
        }
    }

    function process(
        bytes calldata _metadata,
        bytes calldata _message
    ) external payable override {
        bytes memory messageWithRecipient = _message;
        messageWithRecipient.recipientAddress = masterProver;
        Mailbox(this).process(_metadata, messageWithRecipient);
    }

    function setInbox(address _inbox) public onlyOwner{
        inbox = _inbox;
    }

}