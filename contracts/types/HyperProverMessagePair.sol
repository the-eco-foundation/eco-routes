/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

struct HyperProverMessagePair {
    // the hash of the intent
    bytes32 intentHash;
    // the address that will receive the reward if the intent is proven
    address claimant;
}
