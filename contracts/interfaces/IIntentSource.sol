/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * This contract is the source chain portion of the Eco Protocol's intent system.
 *
 * It can be used to create intents as well as withdraw the associated rewards.
 * Its counterpart is the inbox contract that lives on the destination chain.
 * This contract makes a call to the prover contract (on the source chain) in order to verify intent fulfillment.
 */

interface IIntentSource {
    /**
     * @notice emitted on a call to withdraw() by someone who is not entitled to the rewards for a
     * given intent.
     * @param _index the index of the intent on which withdraw was attempted
     */
    error BadWithdrawal(uint256 _index);

    /**
     * @notice emitted on a call to createIntent where _expiry is less than MINIMUM_DURATION
     * seconds later than the block timestamp at time of call
     */
    error BadExpiry();

    /**
     * @notice emitted on a call to createIntent where _rewardTokens and _rewardAmounts have mismatched lengths, or if either has length 0
     */
    error BadRewards();

    /**
     * @notice emitted on a successful call to createIntent
     * @param _index the index of the event
     * @param _creator the address that created the intent
     * @param _destinationChain the destination chain
     * @param _target the address on _destinationChain at which the instructions need to be executed
     * @param _expiry the time by which the storage proof must have been created in order for the solver to redeem rewards.
     * @param _instructions the instructions to be executed on _target
     * @param _rewardTokens the addresses of reward tokens
     * @param _rewardAmounts the amounts of reward tokens
     */
    event IntentCreated(
        //only three of these attributes can be indexed, i chose what i thought would be the three most interesting to fillers
        uint256 _index,
        address _creator,
        uint256 _destinationChain,
        address _target,
        uint256 indexed _expiry,
        bytes _instructions,
        address[] indexed _rewardTokens,
        uint256[] indexed _rewardAmounts
    );

    /**
     * @notice emitted on successful call to withdraw
     * @param _index the index of the intent on which withdraw was attempted
     * @param _recipient the address that received the rewards for this intent
     */
    event Withdrawal(uint256 _index, address indexed _recipient);

    /**
     * @notice Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets.
     * @dev If a proof ON THE SOURCE CHAIN is not completed by the expiry time, the reward funds will not be redeemable by the solver, REGARDLESS OF WHETHER THE INSTRUCTIONS WERE EXECUTED.
     * The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent solver.
     * @dev The inbox contract on the destination chain will be the msg.sender for the instructions that are executed.
     * @param _destinationChain the destination chain
     * @param _target the address on _destinationChain at which the instructions need to be executed
     * @param _expiry the time by which the storage proof must have been created in order for the solver to redeem rewards.
     * @param _instructions the instructions to be executed on _target
     * @param _rewardTokens the addresses of reward tokens
     * @param _rewardAmounts the amounts of reward tokens
     */
    function createIntent(
        uint256 _destinationChain,
        address _target,
        uint256 _expiry,
        bytes calldata _instructions,
        address[] calldata _rewardTokens,
        uint256[] calldata _rewardAmounts
    ) external;

    /**
     * @notice allows withdrawal of reward funds locked up for a given intent
     * @param _index the index of the intent
     */
    function withdrawRewards(uint256 _index) external;
}
