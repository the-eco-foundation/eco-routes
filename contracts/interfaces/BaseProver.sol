// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface BaseProver {
    
    function provenBy(bytes32 _hash) returns (address _claimant);
}