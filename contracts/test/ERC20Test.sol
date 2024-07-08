// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Test is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 amount
    ) ERC20(name_, symbol_) {
        _mint(msg.sender, amount * 1 ether);
    }

    function mint(address _recipient, uint256 _amount) public {
        _mint(_recipient, _amount);
    }

}
