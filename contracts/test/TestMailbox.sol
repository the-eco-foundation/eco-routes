/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "@hyperlane-xyz/core/contracts/libs/Message.sol";
import "@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol";
import "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";

contract TestMailbox {

    using Message for bytes;
    using TypeCasts for bytes32;

    address public processor;

    uint32 public destinationDomain;

    bytes32 public recipientAddress;
    
    bytes public messageBody;
    
    bool public dispatched;

    constructor(address _processor) {
        processor = _processor;
    }

    function dispatch(
        uint32 _destinationDomain,
        bytes32 _recipientAddress,
        bytes calldata _messageBody
    ) public returns (bytes32) {
        destinationDomain = _destinationDomain;
        recipientAddress = _recipientAddress;
        messageBody = _messageBody;
        dispatched = true;

        if (processor != address(0)) {
            TestMailbox(processor).process(_messageBody);
        }
        return(0);
    }

    function process(bytes calldata _msg) public {
        IMessageRecipient((_msg.recipient()).bytes32ToAddress()).handle(_msg.origin(), _msg.sender(), _msg.body());
    }
}