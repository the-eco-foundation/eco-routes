/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IIntentSource.sol";
import "./test/IProver.sol";
import "./types/Intent.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * This contract is the source chain portion of the Eco Protocol's intent system.
 *
 * It can be used to create intents as well as withdraw the associated rewards.
 * Its counterpart is the inbox contract that lives on the destination chain.
 * This contract makes a call to the prover contract (on the sourcez chain) in order to verify intent fulfillment.
 */
contract IntentSource is IIntentSource {
    // chain ID
    uint256 public immutable CHAIN_ID;

    // prover gateway address
    IProver public immutable PROVER;

    // intent creation counter
    uint256 public counter;

    /**
     * minimum duration of an intent, in seconds.
     * Intents cannot expire less than MINIMUM_DURATION seconds after they are created.
     */
    uint256 public immutable MINIMUM_DURATION;

    // stores the intents
    mapping(bytes32 => Intent) public intents;

    /**
     * @param _prover the prover address
     * @param _minimumDuration the minimum duration of an intent originating on this chain
     */
    constructor(
        address _prover,
        uint256 _minimumDuration
    ) {
        CHAIN_ID = block.chainid;
        PROVER = IProver (_prover);
        MINIMUM_DURATION = _minimumDuration;
    }

    /**
     * @notice Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets.
     * @dev If a proof ON THE SOURCE CHAIN is not completed by the expiry time, the reward funds will not be redeemable by the solver, REGARDLESS OF WHETHER THE INSTRUCTIONS WERE EXECUTED.
     * The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent solver.
     * @dev The inbox contract on the destination chain will be the msg.sender for the instructions that are executed.
     * @param _destinationChain the destination chain
     * @param _targets the addresses on _destinationChain at which the instructions need to be executed
     * @param _data the instruction sets to be executed on _targets
     * @param _rewardTokens the addresses of reward tokens
     * @param _rewardAmounts the amounts of reward tokens
     * @param _expiryTime the timestamp at which the intent expires
     */
    function createIntent(
        uint256 _destinationChain,
        address[] calldata _targets,
        bytes[] calldata _data,
        address[] calldata _rewardTokens,
        uint256[] calldata _rewardAmounts,
        uint256 _expiryTime
    ) external {
        if (
            _targets.length == 0 ||
            _targets.length != _data.length
        ) {
            revert CalldataMismatch();
        }

        uint256 len = _rewardTokens.length;
        if (
            len == 0 ||
            len != _rewardAmounts.length
        ) {
            revert RewardsMismatch();
        }

        if (_expiryTime < block.timestamp + MINIMUM_DURATION) {
            revert ExpiryTooSoon();
        }

        bytes32 identifier = keccak256(abi.encode(counter, CHAIN_ID));
        bytes32 intentHash = keccak256(abi.encode(identifier, _targets, _data, _expiryTime));

        intents[identifier] = Intent({
            creator: msg.sender,
            destinationChain: _destinationChain,
            targets: _targets,
            data: _data,
            rewardTokens: _rewardTokens,
            rewardAmounts: _rewardAmounts,
            expiryTime: _expiryTime,
            hasBeenWithdrawn: false,
            intentHash: intentHash
        });

        counter += 1;
        
        for(uint256 i = 0; i < len; i++) {
            IERC20(_rewardTokens[i]).transferFrom(msg.sender, address(this), _rewardAmounts[i]);
        }

        emitIntentCreated(identifier, intents[identifier]);
    }

    function emitIntentCreated(
        bytes32 _identifier,
        Intent memory _intent
    ) internal {
        //gets around Stack Too Deep
        //TODO: remove this, stacktoodeep is solved elsewhere
        // emit IntentCreated(
        //     _identifier,
        //     msg.sender,
        //     _intent.destinationChain,
        //     _intent.targets,
        //     _intent.data,
        //     _intent.rewardTokens,
        //     _intent.rewardAmounts,
        //     _intent.expiryTime
        // );
        emit IntentCreatedRequirements(_identifier, msg.sender, _intent.destinationChain, _intent.targets, _intent.data);
        emit IntentCreatedRewards(_identifier, _intent.rewardTokens, _intent.rewardAmounts, _intent.expiryTime);
    }

    function withdrawRewards(bytes32 _identifier) external {
        Intent storage intent = intents[_identifier];
        bytes32 hashedIntent = keccak256("intent"); // Hash of nonce, targets[], data[], expiry
        address provenBy = PROVER.provenIntents(hashedIntent);
        if (!intent.hasBeenWithdrawn) {
            if (provenBy == msg.sender || provenBy == address(0) && msg.sender == intent.creator && block.timestamp > intent.expiryTime) {
                uint256 len = intent.rewardTokens.length;
                for (uint256 i = 0; i < len; i++) {
                    IERC20(intent.rewardTokens[i]).transfer(msg.sender, intent.rewardAmounts[i]);
                }
                intent.hasBeenWithdrawn = true;
                emit Withdrawal(_identifier, msg.sender);
                return;
            }
        }
        revert UnauthorizedWithdrawal(_identifier);
    }

    function getTargets(bytes32 identifier) public view returns(address[] memory) {
        return intents[identifier].targets;   
    }
    function getData(bytes32 identifier) public view returns(bytes[] memory) {
        return intents[identifier].data;   
    }
    function getRewardTokens(bytes32 identifier) public view returns(address[] memory) {
        return intents[identifier].rewardTokens;   
    }
    function getRewardAmounts(bytes32 identifier) public view returns(uint256[] memory) {
        return intents[identifier].rewardAmounts;   
    }
}