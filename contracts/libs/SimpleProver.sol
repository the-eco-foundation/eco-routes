// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../interfaces/ISimpleProver.sol";

abstract contract SimpleProver is ISimpleProver {
    /**
     * @notice emitted when an intent has been successfully proven
     * @param _hash  the hash of the intent
     * @param _claimant the address that can claim this intent's rewards
     */
    event IntentProven(bytes32 indexed _hash, address indexed _claimant);

    mapping(bytes32 => address) public provenIntents;
}
