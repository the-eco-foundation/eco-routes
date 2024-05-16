/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IIntentSource.sol";
import "./types/Intent.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * This contract is the source chain portion of the Eco Protocol's intent system.
 *
 * It can be used to create intents as well as withdraw the associated rewards.
 * Its counterpart is the inbox contract that lives on the destination chain.
 * This contract makes a call to the prover contract (on the sourcez chain) in order to verify intent fulfillment.
 */
contract IntentSource is IIntentSource, EIP712 {

    bytes32 private immutable _INTENT_TYPEHASH =
    keccak256(
        "Intent(address creator,address target,bytes instructions, )"
    );
    // chain ID
    uint256 public immutable CHAIN_ID;

    // intent creation counter
    uint256 public counter;

    /**
     * minimum duration of an intent, in seconds.
     * Intents cannot expire less than MINIMUM_DURATION seconds after they are created.
     */
    uint256 public immutable MINIMUM_DURATION;

    // stores the intents by the hash of all their data
    mapping(bytes32 => Intent) public intents;

    /**
     * @param _name name of the protocol ("Eco Protocol" for now)
     * @param _version version of the protocol
     * @param _minimumDuration the minimum duration of an intent originating on this chain
     */
    constructor(string memory _name, string memory _version, uint256 _minimumDuration) EIP712(_name, _version) {
        CHAIN_ID = block.chainid;
        MINIMUM_DURATION = _minimumDuration;
    }

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
    ) external {
        if (_expiry < block.timestamp + MINIMUM_DURATION) {
            revert BadExpiry();
        }
        if (_rewardTokens.length == 0 || _rewardTokens.length != _rewardAmounts.length) {
            revert BadRewards();
        }
        intents(getKey(counter, msg.sender)) = Intent{
            creator: msg.sender,
            destinationChain: _destinationChain,
            target: _target,
            instructions: _instructions,
            rewardTokens: _rewardTokens,
            rewardAmounts: _rewardAmounts
        };
    }

    function withdrawRewards(uint256 index) external {
         Intent storage intent = intents[getKey(index, msg.sender)];
    }

    function getKey(_index, _address);(uint256 _index, address _address) internal returns (bytes32 nonce){
        return keccak256(abi.encodePacked(_index, _address, CHAIN_ID));
    }
}
