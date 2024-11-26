/* -*- c-basic-offset: 4 -*- */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IIntentSource.sol";
import "./interfaces/SimpleProver.sol";
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

    // intent creation counter
    uint256 public counter;

    /**
     * minimum duration of an intent, in seconds.
     * Intents cannot expire less than MINIMUM_DURATION seconds after they are created.
     */
    uint256 public immutable MINIMUM_DURATION;

    // stores the intents
    mapping(bytes32 intenthash => Intent) public intents;

    /**
     * @dev counterStart is required to preserve nonce uniqueness in the event IntentSource needs to be redeployed.
     * _minimumDuration the minimum duration of an intent originating on this chain
     * _counterStart the initial value of the counter
     */
    constructor(uint256 _minimumDuration, uint256 _counterStart) {
        CHAIN_ID = block.chainid;
        MINIMUM_DURATION = _minimumDuration;
        counter = _counterStart;
    }

    function version() external pure returns (string memory) { return "v0.0.3-beta"; }
    /**
     * @notice Creates an intent to execute instructions on a contract on a supported chain in exchange for a bundle of assets.
     * @dev If a proof ON THE SOURCE CHAIN is not completed by the expiry time, the reward funds will not be redeemable by the solver, REGARDLESS OF WHETHER THE INSTRUCTIONS WERE EXECUTED.
     * The onus of that time management (i.e. how long it takes for data to post to L1, etc.) is on the intent solver.
     * @dev The inbox contract on the destination chain will be the msg.sender for the instructions that are executed.
     * @param _destinationChainID the destination chain
     * @param _targets the addresses on _destinationChainID at which the instructions need to be executed
     * @param _data the instruction sets to be executed on _targets
     * @param _values the native token value per instruction
     * @param _rewardTokens the addresses of reward tokens
     * @param _rewardAmounts the amounts of reward tokens
     * @param _expiryTime the timestamp at which the intent expires
     * @param _prover the prover against which the intent's status will be checked
     */
    function createIntent(
        uint256 _destinationChainID,
        address _inbox,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256[] calldata _values,
        address[] calldata _rewardTokens,
        uint256[] calldata _rewardAmounts,
        uint256 _expiryTime,
        address _prover
    ) external {
        uint256 len = _targets.length;
        if (len == 0 || len != _data.length || len != _values.length) {
            revert CalldataMismatch();
        }

        len = _rewardTokens.length;
        if (len == 0 || len != _rewardAmounts.length) {
            revert RewardsMismatch();
        }

        if (_expiryTime < block.timestamp + MINIMUM_DURATION) {
            revert ExpiryTooSoon();
        }

        bytes32 _nonce = keccak256(abi.encode(counter, CHAIN_ID));
        bytes32 intermediateHash =
            keccak256(abi.encode(CHAIN_ID, _destinationChainID, _targets, _data, _expiryTime, _nonce));
        bytes32 intentHash = keccak256(abi.encode(_inbox, intermediateHash));

        intents[intentHash] = Intent({
            creator: msg.sender,
            destinationChainID: _destinationChainID,
            targets: _targets,
            data: _data,
            rewardTokens: _rewardTokens,
            rewardAmounts: _rewardAmounts,
            values: _values,
            expiryTime: _expiryTime,
            hasBeenWithdrawn: false,
            nonce: _nonce,
            prover: _prover
        });

        counter += 1;

        for (uint256 i = 0; i < len; i++) {
            IERC20(_rewardTokens[i]).transferFrom(msg.sender, address(this), _rewardAmounts[i]);
        }

        emitIntentCreated(intentHash, intents[intentHash]);
    }

    function emitIntentCreated(bytes32 _hash, Intent memory _intent) internal {
        //gets around Stack Too Deep
        //TODO: remove this, stacktoodeep is solved elsewhere
        emit IntentCreated(
            _hash,
            msg.sender,
            _intent.destinationChainID,
            _intent.targets,
            _intent.data,
            _intent.values,
            _intent.rewardTokens,
            _intent.rewardAmounts,
            _intent.expiryTime,
            _intent.nonce,
            _intent.prover
        );
    }

    function withdrawRewards(bytes32 _hash) external {
        Intent storage intent = intents[_hash];
        address claimant = SimpleProver(intent.prover).provenIntents(_hash);
        address withdrawTo;
        if (!intent.hasBeenWithdrawn) {
            if (claimant != address(0)) {
                withdrawTo = claimant;
            } else {
                if (block.timestamp > intent.expiryTime) {
                    withdrawTo = intent.creator;
                } else {
                    revert UnauthorizedWithdrawal(_hash);
                }
            }
            intent.hasBeenWithdrawn = true;
            uint256 len = intent.rewardTokens.length;
            for (uint256 i = 0; i < len; i++) {
                IERC20(intent.rewardTokens[i]).transfer(withdrawTo, intent.rewardAmounts[i]);
            }
            emit Withdrawal(_hash, withdrawTo);
        } else {
            revert NothingToWithdraw(_hash);
        }
    }

    function getIntent(bytes32 identifier) public view returns (Intent memory) {
        Intent memory intent = intents[identifier];
        intent.targets = intents[identifier].targets;
        intent.data = intents[identifier].data;
        intent.rewardTokens = intents[identifier].rewardTokens;
        intent.rewardAmounts = intents[identifier].rewardAmounts;

        return intent;
    }
}
