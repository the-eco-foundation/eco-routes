/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
<<<<<<< HEAD
pragma solidity ^0.8.0;

import "./IProver.sol";

contract TestProver is IProver {
    mapping(bytes32 => address) public provenIntents;
=======
pragma solidity ^0.8.26;

import "../Prover.sol";

contract TestProver is Prover {
    constructor() Prover(address(this)) {}
>>>>>>> main

    function addProvenIntent(bytes32 identifier, address withdrawableBy) public {
        provenIntents[identifier] = withdrawableBy;
    }
<<<<<<< HEAD

=======
>>>>>>> main
}
