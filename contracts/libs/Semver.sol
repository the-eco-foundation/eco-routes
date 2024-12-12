// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

library Semver {
    function version() internal pure returns (string memory) { return "0.0.700-beta"; }
}

/**
 * @title Semver Interface
 * @dev An interface for a contract that has a version
 */
interface ISemver {
    function version() external pure returns (string memory);
}