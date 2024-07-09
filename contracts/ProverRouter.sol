// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Prover} from "./Prover.sol"

contract ProverRouter is Ownable {
    

    event NewProver(address indexed _newProver);

    event NewInbox(address indexed _newInbox);

    mapping(uint256 => address) public provers;
    
    mapping(uint256 => address) public inboxes;

    constructor (address owner) Ownable(owner) {
        _owner = owner;
    }

    function setProver(uint256 _chainID, address _prover) public onlyOwner{
        provers[_chainID] = _prover;
        emit NewProver(_prover);
    }

    function setInbox(uint256 _chainID, address _inbox) public onlyOwner{
        inboxes[_chainID] = _inbox;
        emit NewInbox(_inbox);
    }

}