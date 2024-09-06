/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract TestMailbox {

    bool public dispatched;

    function dispatch(
        uint32 destinationDomain,
        bytes32 recipientAddress,
        bytes calldata messageBody
    ) public returns (bytes32) {
        dispatched = true;
        return(0);
    }
}