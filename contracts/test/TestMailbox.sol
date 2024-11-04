/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Message} from "@hyperlane-xyz/core/contracts/libs/Message.sol";
import {IMessageRecipient} from "@hyperlane-xyz/core/contracts/interfaces/IMessageRecipient.sol";
import {TypeCasts} from "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";

contract TestMailbox {
    using TypeCasts for bytes32;
    using TypeCasts for address;

    address public processor;

    uint32 public destinationDomain;

    bytes32 public recipientAddress;

    bytes public messageBody;

    bool public dispatched;

    constructor(address _processor) {
        processor = _processor;
    }

    function dispatch(uint32 _destinationDomain, bytes32 _recipientAddress, bytes calldata _messageBody)
        public
        payable
        returns (bytes32)
    {
        destinationDomain = _destinationDomain;
        recipientAddress = _recipientAddress;
        messageBody = _messageBody;
        dispatched = true;

        if (processor != address(0)) {
            process(_messageBody);
        }
        return (0);
    }

    function process(bytes calldata _msg) public {
        IMessageRecipient(recipientAddress.bytes32ToAddress()).handle(
            uint32(block.chainid), msg.sender.addressToBytes32(), _msg
        );
    }

    function quoteDispatch(uint32 _destinationDomain, bytes32 _recipientAddress, bytes calldata _messageBody)
        public
        view
        returns (bytes32)
    {
        return bytes32(uint256(100000));
    }
}
