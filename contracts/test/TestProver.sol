/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/BaseProver.sol";

contract TestProver is BaseProver {

    function addProvenIntent(bytes32 _hash, address _claimant) public {
        provenIntents[_hash] = _claimant;
    }
}
