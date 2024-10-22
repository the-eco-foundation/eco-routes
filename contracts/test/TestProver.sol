/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../libs/SimpleProver.sol";

contract TestProver is SimpleProver {
    function addProvenIntent(bytes32 _hash, address _claimant) public {
        provenIntents[_hash] = _claimant;
    }

    function getProofType() external pure override returns (ProofType) {
        return ProofType.Storage;
    }
}
