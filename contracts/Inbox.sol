// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
/**
 * _____                    _____                   _______
 *          /\    \                  /\    \                 /::\    \
 *         /::\    \                /::\    \               /::::\    \
 *        /::::\    \              /::::\    \             /::::::\    \
 *       /::::::\    \            /::::::\    \           /::::::::\    \
 *      /:::/\:::\    \          /:::/\:::\    \         /:::/~~\:::\    \
 *     /:::/__\:::\    \        /:::/  \:::\    \       /:::/    \:::\    \
 *    /::::\   \:::\    \      /:::/    \:::\    \     /:::/    / \:::\    \
 *   /::::::\   \:::\    \    /:::/    / \:::\    \   /:::/____/   \:::\____\
 *  /:::/\:::\   \:::\    \  /:::/    /   \:::\    \ |:::|    |     |:::|    |
 * /:::/__\:::\   \:::\____\/:::/____/     \:::\____\|:::|____|     |:::|    |
 * \:::\   \:::\   \::/    /\:::\    \      \::/    / \:::\    \   /:::/    /
 *  \:::\   \:::\   \/____/  \:::\    \      \/____/   \:::\    \ /:::/    /
 *   \:::\   \:::\    \       \:::\    \                \:::\    /:::/    /
 *    \:::\   \:::\____\       \:::\    \                \:::\__/:::/    /
 *     \:::\   \::/    /        \:::\    \                \::::::::/    /
 *      \:::\   \/____/          \:::\    \                \::::::/    /
 *       \:::\    \               \:::\    \                \::::/    /
 *        \:::\____\               \:::\____\                \::/____/
 *         \::/    /                \::/    /                 ~~
 *          \/____/                  \/____/
 *
 */

import "./interfaces/IInbox.sol";
import "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import "@hyperlane-xyz/core/contracts/libs/TypeCasts.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "./libs/Semver.sol";

/**
 * @title Inbox
 * @dev The Inbox contract is the main entry point for fulfilling an intent.
 * It validates that the hash is the hash of the other parameters, and then executes the calldata.
 * A prover can then claim the reward on the src chain by looking at the fulfilled mapping.
 */
contract Inbox is IInbox, Ownable {
    using TypeCasts for address;

    uint256 public constant MAX_BATCH_SIZE = 10;

    // Mapping of intent hash on the src chain to its fulfillment
    mapping(bytes32 => address) public fulfilled;

    address public immutable MAILBOX;

    // Mapping of solvers to if they are whitelisted
    mapping(address => bool) public solverWhitelist;

    // address of local hyperlane mailbox
    address public mailbox;

    // Is solving public
    bool public isSolvingPublic;

    // Check that the intent has not expired and that the sender is permitted to solve intents
    modifier validated(uint256 _expiryTime, address _solver) {
        if (!isSolvingPublic && !solverWhitelist[_solver]) {
            revert UnauthorizedSolveAttempt(_solver);
        }
        if (block.timestamp <= _expiryTime) {
            _;
        } else {
            revert IntentExpired();
        }
    }

    // function version() external pure returns (string memory) {
    //     return Semver.version();
    // }
    function version() external pure returns (string memory) {
        return "0.3.1-beta.0";
    }

    /**
     * constructor
     *  _owner the owner of the contract that gets access to privileged functions
     *  _isSolvingPublic whether or not solving is public at start
     *  _solvers the initial whitelist of solvers, only relevant if {_isSolvingPublic} is false
     * @dev privileged functions are made such that they can only make changes once
     */
    constructor(address _owner, bool _isSolvingPublic, address[] memory _solvers) Ownable(_owner) {
        isSolvingPublic = _isSolvingPublic;
        for (uint256 i = 0; i < _solvers.length; i++) {
            solverWhitelist[_solvers[i]] = true;
        }
    }

    /**
     * @notice fulfills an intent to be proven via storage proofs
     * @param _sourceChainID the chainID of the source chain
     * @param _targets The addresses upon which {_data} will be executed, respectively
     * @param _data The calldata to be executed on {_targets}, respectively
     * @param _expiryTime The timestamp at which the intent expires
     * @param _nonce The nonce of the calldata. Composed of the hash on the source chain of a global nonce & chainID
     * @param _claimant The address that will receive the reward on the source chain
     * @param _expectedHash The hash of the intent as created on the source chain
     */
    function fulfillStorage(
        uint256 _sourceChainID,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce,
        address _claimant,
        bytes32 _expectedHash
    ) external returns (bytes[] memory) {
        bytes[] memory result = _fulfill(_sourceChainID, _targets, _data, _expiryTime, _nonce, _claimant, _expectedHash);

        emit ToBeProven(_expectedHash, _sourceChainID, _claimant);

        return result;
    }

    /**
     * @notice fulfills an intent to be proven immediately via Hyperlane's mailbox
     * @param _sourceChainID the chainID of the source chain
     * @param _targets The addresses upon which {_data} will be executed, respectively
     * @param _data The calldata to be executed on {_targets}, respectively
     * @param _expiryTime The timestamp at which the intent expires
     * @param _nonce The nonce of the calldata. Composed of the hash on the source chain of a global nonce & chainID
     * @param _claimant The address that will receive the reward on the source chain
     * @param _expectedHash The hash of the intent as created on the source chain
     * @param _prover The address of the hyperprover on the source chain
     * @dev solvers can expect this proof to be more expensive than hyperbatched, but it will be faster.
     * @dev a fee is required to be sent with the transaction, it pays for the use of Hyperlane's architecture
     */
    function fulfillHyperInstant(
        uint256 _sourceChainID,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce,
        address _claimant,
        bytes32 _expectedHash,
        address _prover
    ) external payable returns (bytes[] memory) {
        bytes[] memory results =
            _fulfill(_sourceChainID, _targets, _data, _expiryTime, _nonce, _claimant, _expectedHash);
        emit HyperInstantFulfillment(_expectedHash, _sourceChainID, _claimant);
        bytes32[] memory hashes = new bytes32[](1);
        address[] memory claimants = new address[](1);
        hashes[0] = _expectedHash;
        claimants[0] = _claimant;

        bytes memory messageBody = abi.encode(hashes, claimants);
        bytes32 _prover32 = _prover.addressToBytes32();
        uint256 fee = fetchFee(_sourceChainID, messageBody, _prover32);
        if (msg.value < fee) {
            revert InsufficientFee(fee);
        }

        IMailbox(mailbox).dispatch{value: fee}(uint32(_sourceChainID), _prover32, messageBody);

        return results;
    }

    /**
     * @notice fulfills an intent to be proven in a batch via Hyperlane's mailbox
     * @param _sourceChainID the chainID of the source chain
     * @param _targets The addresses upon which {_data} will be executed, respectively
     * @param _data The calldata to be executed on {_targets}, respectively
     * @param _expiryTime The timestamp at which the intent expires
     * @param _nonce The nonce of the calldata. Composed of the hash on the source chain of a global nonce & chainID
     * @param _claimant The address that will receive the reward on the source chain
     * @param _expectedHash The hash of the intent as created on the source chain
     * @param _prover The address of the hyperprover on the source chain
     * @dev solvers can expect this proof to be considerably less expensive than hyperinstant, but it will take longer.
     * @dev the batch will only be dispatched when sendBatch is called
     */
    function fulfillHyperBatched(
        uint256 _sourceChainID,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce,
        address _claimant,
        bytes32 _expectedHash,
        address _prover
    ) external returns (bytes[] memory) {
        bytes[] memory results =
            _fulfill(_sourceChainID, _targets, _data, _expiryTime, _nonce, _claimant, _expectedHash);

        emit AddToBatch(_expectedHash, _sourceChainID, _claimant, _prover);

        return results;
    }

    /**
     * @notice sends a batch of fulfilled intents to the mailbox
     * @param _sourceChainID the chainID of the source chain
     * @param _prover the address of the hyperprover on the source chain
     * @param _intentHashes the hashes of the intents to be proven
     * @dev it is imperative that the intent hashes correspond to fulfilled intents that originated on the chain with chainID {_sourceChainID}
     * @dev a fee is required to be sent with the transaction, it pays for the use of Hyperlane's architecture
     */
    function sendBatch(uint256 _sourceChainID, address _prover, bytes32[] calldata _intentHashes) external payable {
        uint256 size = _intentHashes.length;
        if (size > MAX_BATCH_SIZE) {
            revert BatchTooLarge();
        }
        bytes32[] memory hashes = new bytes32[](size);
        address[] memory claimants = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            address claimant = fulfilled[_intentHashes[i]];
            if (claimant == address(0)) {
                revert IntentNotFulfilled(_intentHashes[i]);
            }
            hashes[i] = _intentHashes[i];
            claimants[i] = claimant;
        }
        bytes memory messageBody = abi.encode(hashes, claimants);
        bytes32 _prover32 = _prover.addressToBytes32();
        uint256 fee = fetchFee(_sourceChainID, messageBody, _prover32);
        if (msg.value < fee) {
            revert InsufficientFee(fee);
        }

        IMailbox(mailbox).dispatch{value: fee}(uint32(_sourceChainID), _prover32, messageBody);
    }

    /**
     * @notice wrapper method for the mailbox's quoteDispatch method
     * @param _sourceChainID the chainID of the source chain
     * @param _messageBody the message body
     * @param _prover the address of the hyperprover on the source chain
     * @dev this method is used to determine the fee required for fulfillHyperInstant or sendBatch
     */
    function fetchFee(uint256 _sourceChainID, bytes memory _messageBody, bytes32 _prover)
        public
        view
        returns (uint256 fee)
    {
        return IMailbox(mailbox).quoteDispatch(uint32(_sourceChainID), _prover, _messageBody);
    }

    /**
     * @notice allows the owner to set the mailbox
     * @param _mailbox the address of the mailbox
     * @dev this can only be called once, to initialize the mailbox, and should be called at time of deployment
     */
    function setMailbox(address _mailbox) public onlyOwner {
        if (mailbox == address(0)) {
            mailbox = _mailbox;
        }
    }

    /**
     * @notice makes solving public if it is restricted
     * @dev solving cannot be made private once it is made public
     */
    function makeSolvingPublic() public onlyOwner {
        if (!isSolvingPublic) {
            isSolvingPublic = true;
            emit SolvingIsPublic();
        }
    }

    /**
     * @notice allows the owner to make changes to the solver whitelist
     * @param _solver the address of the solver whose permissions are being changed
     * @param _canSolve whether or not the solver will be on the whitelist afterward
     * @dev the solver whitelist has no meaning if isSolvingPublic is true
     */
    function changeSolverWhitelist(address _solver, bool _canSolve) public onlyOwner {
        solverWhitelist[_solver] = _canSolve;
        emit SolverWhitelistChanged(_solver, _canSolve);
    }

    /**
     * @notice allows the owner to withdraw the contract's balance
     * @param _destination the address to which the balance will be sent
     * @dev this is a safety feature to be able to get stuck funds out of the contract
     * @dev mostly useful for reclaiming dust and excess fees
     */
    function drain(address _destination) public onlyOwner {
        payable(_destination).transfer(address(this).balance);
    }

    function _fulfill(
        uint256 _sourceChainID,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce,
        address _claimant,
        bytes32 _expectedHash
    ) internal validated(_expiryTime, msg.sender) returns (bytes[] memory) {
        bytes32 intentHash =
            encodeHash(_sourceChainID, block.chainid, address(this), _targets, _data, _expiryTime, _nonce);

        // revert if locally calculated hash does not match expected hash
        if (intentHash != _expectedHash) {
            revert InvalidHash(_expectedHash);
        }

        // revert if intent has already been fulfilled
        if (fulfilled[intentHash] != address(0)) {
            revert IntentAlreadyFulfilled(intentHash);
        }
        // Store the results of the calls
        bytes[] memory results = new bytes[](_data.length);
        // Call the addresses with the calldata

        for (uint256 i = 0; i < _data.length; i++) {
            address target = _targets[i];
            if (target == mailbox) {
                // no executing calls on the mailbox
                revert CallToMailbox();
            }
            (bool success, bytes memory result) = _targets[i].call(_data[i]);
            if (!success) {
                revert IntentCallFailed(_targets[i], _data[i], result);
            }
            results[i] = result;
        }

        // Mark the intent as fulfilled
        fulfilled[intentHash] = _claimant;

        emit Fulfillment(_expectedHash, _sourceChainID, _claimant);

        return results;
    }

    /**
     * This function generates the intent hash
     * @param _sourceChainID the chainID of the source chain
     * @param _chainId the chainId of this chain
     * @param _inboxAddress the address of this contract
     * @param _targets The addresses to call
     * @param _data The calldata to call
     * @param _expiryTime The timestamp at which the intent expires
     * @param _nonce The nonce of the calldata. Composed of the hash on the src chain of a global nonce & chainID
     * @return hash The hash of the intent parameters
     */
    function encodeHash(
        uint256 _sourceChainID,
        uint256 _chainId,
        address _inboxAddress,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                _inboxAddress, keccak256(abi.encode(_sourceChainID, _chainId, _targets, _data, _expiryTime, _nonce))
            )
        );
    }
}
