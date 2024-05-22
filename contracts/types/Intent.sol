/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct Intent {
    // creator of the intent
    address creator;
    // chain where we want instructions executed
    uint256 destinationChain;
    // address on destinationChain where we want instructions executed
    address[] targets;
    // instructions we want executed
    bytes[] callDatas;
    // addresses of reward tokens
    address[] rewardTokens;
    // corresponding amounts of reward tokens
    uint256[] rewardAmounts;
    // intent expiry timestamp
    uint256 expiry;
    // whether or not the intent's rewards have been withdrawn
    bool hasBeenWithdrawn;
    // hash of identifier, targets, calldatas
    bytes32 intentHash;
}
