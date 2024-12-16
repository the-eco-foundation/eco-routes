/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IIntentSource.sol";
import "./types/Intent.sol";

contract IntentVault {
    constructor(Intent memory intent) {
        uint256 rewardsLength = intent.rewards.length;

        address claimant = IIntentSource(msg.sender).getVaultClaimant();
        address refundToken = IIntentSource(msg.sender).getVaultRefundToken();

        if (claimant == address(0)) claimant = intent.creator;

        for (uint256 i; i < rewardsLength; ++i) {
            address token = intent.rewards[i].token;
            uint256 amount = intent.rewards[i].amount;
            uint256 balance = IERC20(token).balanceOf(address(this));

            require(amount >= balance, "IntentVault: insufficient balance");
            require(
                token != refundToken,
                "IntentVault: refund token cannot be a reward token"
            );

            if (claimant == intent.creator) {
                IERC20(token).transfer(claimant, balance);
            } else {
                IERC20(token).transfer(claimant, amount);
                if (balance > amount) {
                    IERC20(token).transfer(intent.creator, balance - amount);
                }
            }
        }

        if (intent.nativeReward > 0) {
            require(
                address(this).balance >= intent.nativeReward,
                "IntentVault: insufficient balance"
            );
            payable(claimant).transfer(intent.nativeReward);
        }

        if (refundToken != address(0)) {
            uint256 refundAmount = IERC20(refundToken).balanceOf(address(this));
            if (refundAmount > 0)
                IERC20(refundToken).transfer(intent.creator, refundAmount);
        }

        selfdestruct(payable(intent.creator));
    }

    receive() external payable {}
}
