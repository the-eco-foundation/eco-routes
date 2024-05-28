/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IProver.sol";

contract TestProver is IProver {
    mapping(bytes32 => address) public provenIntents;

    function addProvenIntent(bytes32 identifier, address withdrawableBy) public {
        provenIntents[identifier] = withdrawableBy;
    }
}
