// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

interface ISimpleProver {
    // The types of proof that provers can be
    enum ProofType {
        Storage,
        Hyperlane
    }

    // returns the proof type of the prover
    function getProofType() external pure returns (ProofType);
}
