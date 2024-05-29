/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
<<<<<<< HEAD
pragma solidity ^0.8.0;
=======
pragma solidity ^0.8.26;
>>>>>>> main

/**
 * This contract is the source chain portion of the Eco Protocol's intent system.
 *
 * It can be used to create intents as well as withdraw the associated rewards.
 * Its counterpart is the inbox contract that lives on the destination chain.
 * This contract makes a call to the prover contract (on the source chain) in order to verify intent fulfillment.
 */
<<<<<<< HEAD

=======
>>>>>>> main
interface IIntentSource {
    /**
     * @notice emitted on a call to withdraw() by someone who is not entitled to the rewards for a
     * given intent.
     * @param _identifier the identifier of the intent on which withdraw was attempted
     */
    error UnauthorizedWithdrawal(bytes32 _identifier);

    /**
     * @notice emitted on a call to withdraw() for an intent whose rewards have already been withdrawn.
     * @param _identifier the identifier of the intent on which withdraw was attempted
     */
    error NothingToWithdraw(bytes32 _identifier);

    /**
     * @notice emitted on a call to createIntent where _expiry is less than MINIMUM_DURATION
     * seconds later than the block timestamp at time of call
     */
    error ExpiryTooSoon();

    /**
     * @notice emitted on a call to createIntent where _targets and _data have different lengths, or when one of their lengths is zero.
     */
    error CalldataMismatch();

    /**
     * @notice emitted on a call to createIntent where _rewardTokens and _rewardAmounts have different lengths, or when one of their lengths is zero.
     */
    error RewardsMismatch();

    /**
     * @notice emitted on a successful call to createIntent
     * @param _identifier the key of the intents mapping that can be used to fetch the intent
     * @param _creator the address that created the intent
     * @param _destinationChain the destination chain
     * @param _targets the address on _destinationChain at which the instruction sets need to be executed
     * @param _data the instructions to be executed on _targets
     * @param _rewardTokens the addresses of reward tokens
     * @param _rewardAmounts the amounts of reward tokens
     * @param _expiryTime the time by which the storage proof must have been created in order for the solver to redeem rewards.
     */
<<<<<<< HEAD
    event IntentCreated(
        //only three of these attributes can be indexed, i chose what i thought would be the three most interesting to fillers
=======
    //only three of these attributes can be indexed, i chose what i thought would be the three most interesting to fillers
    event IntentCreated(
>>>>>>> main
        bytes32 _identifier,
        address _creator,
        uint256 indexed _destinationChain,
        address[] _targets,
        bytes[] _data,
        address[] _rewardTokens,
        uint256[] _rewardAmounts,
        uint256 indexed _expiryTime
    );

    /**
     * @notice emitted on successful call to withdraw
     * @param _identifier the identifier of the intent on which withdraw was attempted
     * @param _recipient the address that received the rewards for this intent
     */
    event Withdrawal(bytes32 _identifier, address indexed _recipient);

    /**
     * @notice Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets.
     * @dev If a proof ON THE SOURCE CHAIN is not completed by the expiry time, the reward funds will not be redeemable by the solver, REGARDLESS OF WHETHER THE INSTRUCTIONS WERE EXECUTED.
     * The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent solver.
     * @dev The inbox contract on the destination chain will be the msg.sender for the instructions that are executed.
     * @param _destinationChain the destination chain
     * @param _targets the addresses on _destinationChain at which the instruction sets need to be executed
     * @param _data the instructions to be executed on _targets
     * @param _rewardTokens the addresses of reward tokens
     * @param _rewardAmounts the amounts of reward tokens
     * @param _expiryTime the time by which the storage proof must have been created in order for the solver to redeem rewards.
     */
    function createIntent(
        uint256 _destinationChain,
        address[] calldata _targets,
        bytes[] calldata _data,
        address[] calldata _rewardTokens,
        uint256[] calldata _rewardAmounts,
        uint256 _expiryTime
    ) external;

    /**
     * @notice allows withdrawal of reward funds locked up for a given intent
     * @param _identifier the key corresponding to this intent in the intents mapping
     */
    function withdrawRewards(bytes32 _identifier) external;

    /**
     * @notice fetches targets array from intent
     * @param _identifier the identifier for the intent
     */
    function getTargets(bytes32 _identifier) external view returns (address[] memory);
<<<<<<< HEAD
    
=======

>>>>>>> main
    /**
     * @notice fetches data array from intent
     * @param _identifier the identifier for the intent
     */
    function getData(bytes32 _identifier) external view returns (bytes[] memory);

<<<<<<< HEAD
        /**
=======
    /**
>>>>>>> main
     * @notice fetches reward tokens array from intent
     * @param _identifier the identifier for the intent
     */
    function getRewardTokens(bytes32 _identifier) external view returns (address[] memory);

    /**
     * @notice fetches reward amounts array from intent
     * @param _identifier the identifier for the intent
     */
    function getRewardAmounts(bytes32 _identifier) external view returns (uint256[] memory);
}
