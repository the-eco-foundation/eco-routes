// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

abstract contract BaseProver {
    mapping(bytes32 => address) public provenIntents;
}