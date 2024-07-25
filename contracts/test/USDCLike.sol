/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract USDCLike is ERC20{
    
    address public owner;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1000000 ether);
    }

    function decimals() public view override returns (uint8) {
        return 6;
    }
    
}