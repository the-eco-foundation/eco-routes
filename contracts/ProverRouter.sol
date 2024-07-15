// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Prover} from "./Prover.sol";

contract ProverRouter is Ownable {

    event NewProver(address indexed _newProver);

    // event NewInbox(address indexed _newInbox);

    mapping(uint256 => address) public provers;
    
    // mapping(uint256 => address) public inboxes;

    constructor (address owner) Ownable(owner) {}

    function setProver(uint256 _chainID, address _prover) public onlyOwner{
        provers[_chainID] = _prover;
        emit NewProver(_prover);
    }

    // function setInbox(uint256 _chainID, address _inbox) public onlyOwner{
    //     inboxes[_chainID] = _inbox;
    //     emit NewInbox(_inbox);
    // }

    // function proveL1WorldState(uint256 _chainID, bytes calldata rlpEncodedL1BlockData) public {
    //     (bool success, bytes memory _whatever) = provers[_chainID].call(abi.encodeWithSignature("proveL1WorldState(bytes)", rlpEncodedL1BlockData));
    //     require(success);
    // }

    // function proveOutputRoot(
    //     uint256 _chainID,
    //     bytes32 l2WorldStateRoot,
    //     bytes32 l2MessagePasserStateRoot,
    //     bytes32 l2LatestBlockHash,
    //     uint256 l2OutputIndex,
    //     bytes[] calldata l1StorageProof,
    //     bytes calldata rlpEncodedOutputOracleData,
    //     bytes[] calldata l1AccountProof,
    //     bytes32 l1WorldStateRoot
    // ) public {
    //     Prover(provers[_chainID]).proveOutputRoot(l2WorldStateRoot, l2MessagePasserStateRoot, l2LatestBlockHash, l2OutputIndex, l1StorageProof, rlpEncodedOutputOracleData, l1AccountProof, l1WorldStateRoot);
    // }

    // function proveIntent(
    //     uint256 _chainID,
    //     address claimant,
    //     bytes32 intentHash,
    //     uint256 intentOutputIndex,
    //     bytes[] calldata l2StorageProof,
    //     bytes calldata rlpEncodedInboxData,
    //     bytes[] calldata l2AccountProof,
    //     bytes32 l2WorldStateRoot
    // ) public {
    //     Prover(provers[_chainID]).proveIntent(claimant, inboxes[_chainID], intentHash, intentOutputIndex, l2StorageProof, rlpEncodedInboxData, l2AccountProof, l2WorldStateRoot);
    // }

    // function fetchProvenIntents(uint256 _chainID, bytes32 _hash) public view returns(address){
    //     return Prover(provers[_chainID]).provenIntents(_hash);
    // }
}