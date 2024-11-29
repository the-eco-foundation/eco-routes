/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

struct Intent {
    // creator of the intent
    address creator;
    // ID of chain where we want instructions executed
    uint256 destinationChainID;
    // address on destinationChain where we want instructions executed
    address[] targets;
    // instructions we want executed
    bytes[] data;
    // native token value per instruction
    uint256[] values;
    // addresses of reward tokens
    address[] rewardTokens;
    // corresponding amounts of reward tokens
    uint256[] rewardAmounts;
    // intent expiry timestamp
    uint256 expiryTime;
    // true if it has been withdrawn already
    bool hasBeenWithdrawn;
    // hash of counter, chainid
    bytes32 nonce;
    // address of the prover this intent will be checked against
    address prover;
    // native tokens offered as reward
    uint256 rewardNative;
}
