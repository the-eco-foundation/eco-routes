/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../Prover.sol";

contract TestProver is Prover {
    address public constant basel1OutputOracleAddress = 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254;

    constructor() Prover(address(this), basel1OutputOracleAddress) {}

    function addProvenIntent(bytes32 identifier, address withdrawableBy) public {
        provenIntents[identifier] = withdrawableBy;
    }
}
