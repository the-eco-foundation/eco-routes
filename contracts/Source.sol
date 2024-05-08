/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Source {

    uint256 public counter;

    struct intent {
        bytes ID;
        address creator;
        uint256 destinationChain;
        address target;
        bytes instructions;
        address rewardToken;
        uint256 rewardAmount;
        uint256 expiry;
    }
    
    function createIntent() public {
        counter += 1;
    }
}