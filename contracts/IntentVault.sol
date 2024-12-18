/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IIntentSource.sol";
import "./types/Intent.sol";

contract IntentVault {
    using SafeERC20 for IERC20;

    constructor(Intent memory intent) {
        uint256 rewardsLength = intent.rewards.length;

        address claimant = IIntentSource(msg.sender).getVaultClaimant();
        address refundToken;

        if (claimant == address(0)) {
            claimant = intent.creator;
            refundToken = IIntentSource(msg.sender).getVaultRefundToken();
        }

        for (uint256 i; i < rewardsLength; ++i) {
            address token = intent.rewards[i].token;
            uint256 amount = intent.rewards[i].amount;
            uint256 balance = IERC20(token).balanceOf(address(this));

            require(
                token != refundToken,
                "IntentVault: refund token cannot be a reward token"
            );

            if (claimant == intent.creator) {
                if (balance > 0) {
                    IERC20(token).safeTransfer(claimant, balance);
                }
            } else {
                require(amount >= balance, "IntentVault: insufficient balance");

                IERC20(token).safeTransfer(claimant, amount);
                if (balance > amount) {
                    IERC20(token).safeTransfer(intent.creator, balance - amount);
                }
            }
        }

        if (claimant != intent.creator && intent.nativeReward > 0) {
            require(
                address(this).balance >= intent.nativeReward,
                "IntentVault: insufficient balance"
            );

            (bool success, ) = payable(claimant).call{value: intent.nativeReward}("");

            require(success, "IntentVault: native reward transfer failed");
        }

        if (refundToken != address(0)) {
            uint256 refundAmount = IERC20(refundToken).balanceOf(address(this));
            if (refundAmount > 0)
                IERC20(refundToken).safeTransfer(intent.creator, refundAmount);
        }

        selfdestruct(payable(intent.creator));
    }

    receive() external payable {}
}
