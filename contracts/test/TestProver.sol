/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SimpleProver} from "../libs/SimpleProver.sol";

contract TestProver is SimpleProver {
    function version() external pure returns (string memory) {
        return "v0.0.3-beta";
    }

    function addProvenIntent(bytes32 _hash, address _claimant) public {
        provenIntents[_hash] = _claimant;
    }

    function getProofType() external pure override returns (ProofType) {
        return ProofType.Storage;
    }
}
