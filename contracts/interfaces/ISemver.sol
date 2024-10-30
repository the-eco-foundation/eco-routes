// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

/**
 * @title Semver Interface
 * @dev An interface for a contract that has a version
 */
interface ISemver {
    function version() external pure returns (string memory);
}