/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/SimpleProver.sol";
import "../IntentSource.sol";

contract TestProver is SimpleProver {

    function addProvenIntent(bytes32 _hash, address _claimant) public {
        provenIntents[_hash] = _claimant;
    }

    function dummyProveAndClaim(bytes32 _hash, address _intentSource, address _destination) public {
        // prove
        IntentSource(_intentSource).withdrawTo(_hash, _destination);
    }
}
