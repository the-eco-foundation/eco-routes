// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Prover} from "./Prover.sol";

contract ProverRouter is Ownable {

    event NewProver(uint256 _destinationChainID, address indexed _newProver);

    event NewInbox(uint256 _destinationChainID, address indexed _newInbox);

    mapping(uint256 => address) public provers;

    mapping(uint256 => address) public inboxes;

    constructor (address owner) Ownable(owner) {}

    function setProver(uint256 _destinationChainID, address _prover) public onlyOwner{
        provers[_destinationChainID] = _prover;
        emit NewProver(_destinationChainID, _prover);
    }

    function setInbox(uint256 _destinationChainID, address _inbox) public onlyOwner{
        inboxes[_destinationChainID] = _inbox;
        emit NewInbox(_destinationChainID, _inbox);
    }
}