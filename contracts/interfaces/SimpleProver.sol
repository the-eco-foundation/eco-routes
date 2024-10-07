// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import "./IProver.sol";

abstract contract SimpleProver is IProver {
    mapping(bytes32 => address) public provenIntents;
}
