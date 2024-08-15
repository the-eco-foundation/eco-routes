/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../Prover.sol";

contract TestProver is Prover {

    address public constant baseL1OutputOracleAddress = 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254;
    address public constant l2OptimismDisputeGameFactory = 0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1;

    constructor() Prover() {}

    function addProvenIntent(bytes32 _hash, address _claimant) public {
        provenIntents[_hash] = _claimant;
    }
}
