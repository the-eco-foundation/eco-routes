// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

interface IProver {
    // The types of proof that provers can be
    enum ProofType {
        L2,
        HyperLane
    }

    // returns the proof type of the prover
    function getProofType() external pure returns (ProofType);
}
