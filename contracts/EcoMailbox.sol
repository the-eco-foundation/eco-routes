// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "./interfaces/IInbox.sol";
import "@hyperlane-xyz/core/contracts/Mailbox.sol";
import "@hyperlane-xyz/core/contracts/libs/Message.sol";

contract EcoMailbox is Mailbox {

        using Message for bytes;

    address public immutable masterProver;

    constructor(uint32 _localDomain, address _masterProver) Mailbox(_localDomain) {
        masterProver = _masterProver;
    }

    // new dispatch method that fetches the correct address once msg gets to the other chain
    function dispatch(
        uint32 _destinationDomain,
        bytes calldata _messageBody
    ) external payable override returns (bytes32) {
        return
            dispatch(
                _destinationDomain,
                address(0),
                _messageBody,
                _messageBody[0:0],
                defaultHook
            );
    }

    function process(
        bytes calldata _metadata,
        bytes calldata _message
    ) external payable override {
        bytes memory messageWithRecipient = _message;
        messageWithRecipient.recipientAddress = masterProver;
        Mailbox(this).process(_metadata, messageWithRecipient);
    }

}