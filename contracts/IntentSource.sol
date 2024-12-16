/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IIntentSource.sol";
import "./interfaces/SimpleProver.sol";
import "./types/Intent.sol";

import "./IntentVault.sol";

/**
 * This contract is the source chain portion of the Eco Protocol's intent system.
 *
 * It can be used to create intents as well as withdraw the associated rewards.
 * Its counterpart is the inbox contract that lives on the destination chain.
 * This contract makes a call to the prover contract (on the sourcez chain) in order to verify intent fulfillment.
 */
contract IntentSource is IIntentSource {
    using SafeERC20 for IERC20;

    // chain ID
    uint256 public immutable CHAIN_ID;

    /**
     * minimum duration of an intent, in seconds.
     * Intents cannot expire less than MINIMUM_DURATION seconds after they are created.
     */
    uint256 public immutable MINIMUM_DURATION;

    // stores the intents
    mapping(bytes32 intenthash => bool) public claimed;

    address public vaultClaimant;
    address public vaultRefundToken;

    /**
     * @dev counterStart is required to preserve nonce uniqueness in the event IntentSource needs to be redeployed.
     * _minimumDuration the minimum duration of an intent originating on this chain
     * _counterStart the initial value of the counter
     */
    constructor(uint256 _minimumDuration) {
        CHAIN_ID = block.chainid;
        MINIMUM_DURATION = _minimumDuration;
    }

    function version() external pure returns (string memory) {
        return "v0.0.3-beta";
    }


    function getVaultClaimant() external view returns (address) {
        return vaultClaimant;
    }

    function getVaultRefundToken() external view returns (address) {
        return vaultRefundToken;
    }

    function intentVaultAddress(
        Intent calldata intent
    ) internal view returns (address) {
        /* Convert a hash which is bytes32 to an address which is 20-byte long
        according to https://docs.soliditylang.org/en/v0.8.9/control-structures.html?highlight=create2#salted-contract-creations-create2 */
        return
            address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                hex"ff",
                                address(this),
                                intent.nonce,
                                // Encoding delegateData and refundAddress as constructor params
                                keccak256(
                                    abi.encodePacked(
                                        type(IntentVault).creationCode,
                                        abi.encode(intent)
                                    )
                                )
                            )
                        )
                    )
                )
            );
    }

    /**
     * @notice Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets.
     * @dev If a proof ON THE SOURCE CHAIN is not completed by the expiry time, the reward funds will not be redeemable by the solver, REGARDLESS OF WHETHER THE INSTRUCTIONS WERE EXECUTED.
     * The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent solver.
     * @param intent The intent struct with all the intent params
     */
    function publishIntent(Intent calldata intent, bool addRewards) external payable {
        uint256 rewardsLength = intent.rewards.length;

        require(
            intent.sourceChainID == CHAIN_ID,
            "IntentSource: invalid source chain ID"
        );

        if (rewardsLength == 0 && msg.value == 0) {
            revert NoRewards();
        }

        if (intent.expiryTime < block.timestamp + MINIMUM_DURATION) {
            revert ExpiryTooSoon();
        }

        bytes32 intentHash = keccak256(abi.encode(intent));

        emit IntentCreated(
            intentHash,
            intent.creator,
            intent.nonce,
            intent.destinationChainID,
            intent.destinationInbox,
            intent.calls,
            intent.rewards,
            intent.nativeReward,
            intent.expiryTime,
            intent.prover
        );

        address vault = intentVaultAddress(intent);

        if (addRewards) {
            if (intent.nativeReward > 0) {
                require(msg.value >= intent.nativeReward, "IntentSource: insufficient native reward");

                payable(vault).transfer(intent.nativeReward);

                if (msg.value > intent.nativeReward) {
                    payable(msg.sender).transfer(msg.value - intent.nativeReward);
                }
            }

            for (uint256 i = 0; i < rewardsLength; i++) {
                address token = intent.rewards[i].token;
                uint256 amount = intent.rewards[i].amount;

                IERC20(token).safeTransferFrom(msg.sender, vault, amount);
            }
        }
    }

    function validateIntent(
        Intent calldata intent
    ) external view returns (bool) {
        address vault = intentVaultAddress(intent);
        uint256 rewardsLength = intent.rewards.length;

        if (intent.expiryTime < block.timestamp + MINIMUM_DURATION / 2) {
            return false;
        }

        if (vault.balance < intent.nativeReward) return false;

        for (uint256 i = 0; i < rewardsLength; i++) {
            address token = intent.rewards[i].token;
            uint256 amount = intent.rewards[i].amount;
            uint256 balance = IERC20(token).balanceOf(vault);

            if (balance < amount) return false;
        }

        return true;
    }

    /**
     * @notice Withdraws the rewards associated with an intent to its claimant
     * @param intent The intent struct with all the intent params
     */
    function withdrawRewards(Intent calldata intent) public {
        bytes32 intentHash = keccak256(abi.encode(intent));
        address claimant = SimpleProver(intent.prover).provenIntents(
            intentHash
        );

        if (claimant != address(0) && !claimed[intentHash]) {
            vaultClaimant = claimant;
            claimed[intentHash] = true;

            emit Withdrawal(intentHash, claimant);
        } else {
            if (block.timestamp < intent.expiryTime) {
                revert UnauthorizedWithdrawal(intentHash);
            }

            emit Withdrawal(intentHash, intent.creator);
        }

        new IntentVault{salt: intent.nonce}(intent);

        if (claimant != address(0)) {
            vaultClaimant = address(0);
        }
    }

    /**
     * @notice Withdraws a batch of intents that all have the same claimant
     * @param intents The array of intents to withdraw
     */
    function batchWithdraw(Intent[] calldata intents) external {
        uint256 length = intents.length;

        for (uint256 i = 0; i < length; i++) {
            withdrawRewards(intents[i]);
        }
    }

    function refundToken(Intent calldata intent, address token) external {
        if (block.timestamp < intent.expiryTime) {
            bytes32 intentHash = keccak256(abi.encode(intent));
            revert UnauthorizedWithdrawal(intentHash);
        }

        vaultRefundToken = token;

        new IntentVault{salt: intent.nonce}(intent);

        vaultRefundToken = address(0);
    }
}
