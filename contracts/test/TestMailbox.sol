/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract TestMailbox {

    uint32 public destinationDomain;

    bytes32 public recipientAddress;
    
    bytes public messageBody;
    
    bool public dispatched;

    function dispatch(
        uint32 _destinationDomain,
        bytes32 _recipientAddress,
        bytes calldata _messageBody
    ) public returns (bytes32) {
        destinationDomain = _destinationDomain;
        recipientAddress = _recipientAddress;
        messageBody = _messageBody;
        dispatched = true;
        return(0);
    }
}