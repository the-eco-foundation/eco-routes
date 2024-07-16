// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Prover} from "./Prover.sol";

contract ProverRouter is Ownable {

    event NewProver(uint256 _chainID, address indexed _newProver);

    mapping(uint256 => address) public provers;

    constructor (address owner) Ownable(owner) {}

    function setProver(uint256 _chainID, address _prover) public onlyOwner{
        provers[_chainID] = _prover;
        emit NewProver(_chainID, _prover);
    }
}