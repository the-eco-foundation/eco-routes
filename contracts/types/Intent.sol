/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

struct Call {
    address target;
    bytes data;
    uint256 value;
}

struct Reward {
    address token;
    uint256 amount;
}

struct Intent {
    // creator of the intent
    address creator;
    // nonce provided by the creator
    bytes32 nonce;
    // ID of chain where we want instructions executed
    uint256 destinationChainID;
    // The inbox contract on the destination chain will be the msg.sender for the instructions that are executed.
    uint256 destinationInbox;
    // instructions to be executed on destinationChain
    Call[] calls;
    // addresses and amounts of reward tokens
    Reward[] rewards;
    // native tokens offered as reward
    uint256 nativeReward;
    // intent expiry timestamp
    uint256 expiryTime;
    // address of the prover this intent will be checked against
    address prover;
}
