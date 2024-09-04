// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

abstract contract SimpleProver {

    /**
     * @notice emitted when an intent intent has been successfully proven
     * @param _hash  the hash of the intent
     * @param _claimant the address that can claim this intent's rewards
     */    
    event IntentProven(bytes32 indexed intentHash, address indexed claimant);

    mapping(bytes32 => address) public provenIntents;
}