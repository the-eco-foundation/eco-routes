/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../Prover.sol";

contract TestProver is Prover {
    address public constant baseL1OutputOracleAddress = 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254;

    constructor(address _router) Prover(address(this), baseL1OutputOracleAddress, _router) {}

    bool public L1WorldStateProven;

    bool public outputRootProven;

    bool public intentProven;

    function addProvenIntent(bytes32 identifier, address withdrawableBy) public {
        provenIntents[identifier] = withdrawableBy;
    }

    function proveL1WorldState(bytes calldata rlpEncodedL1BlockData) public override {
        L1WorldStateProven = true;
    }

    function proveOutputRoot(
        bytes32 l2WorldStateRoot,
        bytes32 l2MessagePasserStateRoot,
        bytes32 l2LatestBlockHash,
        uint256 l2OutputIndex,
        bytes[] calldata l1StorageProof,
        bytes calldata rlpEncodedOutputOracleData,
        bytes[] calldata l1AccountProof,
        bytes32 l1WorldStateRoot
    ) public override {
        outputRootProven = true;
    }

    function proveIntent(
        address claimant,
        address inboxContract,
        bytes32 intentHash,
        uint256 intentOutputIndex,
        bytes[] calldata l2StorageProof,
        bytes calldata rlpEncodedInboxData,
        bytes[] calldata l2AccountProof,
        bytes32 l2WorldStateRoot
    ) public override {
        intentProven = true;
    }


    
}
