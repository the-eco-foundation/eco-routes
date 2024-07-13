/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../Prover.sol";

contract TestProver is Prover {

    struct ProveOutputRootData {
        bytes32 l2WorldStateRoot;
        bytes32 l2MessagePasserStateRoot;
        bytes32 l2LatestBlockHash;
        uint256 l2OutputIndex;
        bytes[] l1StorageProof;
        bytes rlpEncodedOutputOracleData;
        bytes[] l1AccountProof;
        bytes32 l1WorldStateRoot;
    }

    struct ProveIntentData {
        address claimant;
        address inboxContract;
        bytes32 intentHash;
        uint256 intentOutputIndex;
        bytes[] l2StorageProof;
        bytes rlpEncodedInboxData;
        bytes[] l2AccountProof;
        bytes32 l2WorldStateRoot;
    }

    address public constant baseL1OutputOracleAddress = 0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254;

    constructor(address _router) Prover(address(this), baseL1OutputOracleAddress, _router) {}

    bytes public proveL1WorldStateData;

    ProveOutputRootData public proveOutputRootData;

    ProveIntentData public proveIntentData;

    function addProvenIntent(bytes32 _hash, address _claimant) public {
        provenIntents[_hash] = _claimant;
    }

    function proveL1WorldState(bytes calldata rlpEncodedL1BlockData) public override {
        proveL1WorldStateData = rlpEncodedL1BlockData;
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
        proveOutputRootData = ProveOutputRootData(l2WorldStateRoot,
        l2MessagePasserStateRoot,
        l2LatestBlockHash,
        l2OutputIndex,
        l1StorageProof,
        rlpEncodedOutputOracleData,
        l1AccountProof,
        l1WorldStateRoot);
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
        proveIntentData = ProveIntentData(claimant,
        inboxContract,
        intentHash,
        intentOutputIndex,
        l2StorageProof,
        rlpEncodedInboxData,
        l2AccountProof,
        l2WorldStateRoot);
    }

    function getProveOutputRootData() public view returns (ProveOutputRootData memory) {
        return proveOutputRootData;
    }

    function getProveIntentData() public view returns (ProveIntentData memory) {
        return proveIntentData;
    }
}
