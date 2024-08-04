// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "./interfaces/IInbox.sol";
import "@hyperlane-xyz/core/contracts/Mailbox.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Inbox
 * @dev The Inbox contract is the main entry point for fulfilling an intent.
 * It validates that the hash is the hash of the other parameters, and then executes the calldata.
 * A prover can then claim the reward on the src chain by looking at the fulfilled mapping.
 */
contract Inbox is Ownable, IInbox {

    Mailbox public mailbox;

    // Mapping of intent hash on the src chain to its fulfillment
    mapping(bytes32 => address) public fulfilled;

    // Mapping of solvers to if they are whitelisted
    mapping(address => bool) public solverWhitelist;

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

    constructor(address _owner, bool _isSolvingPublic, address[] memory _solvers) Ownable(_owner){
        isSolvingPublic = _isSolvingPublic;
        for (uint256 i = 0; i < _solvers.length; i++) {
            solverWhitelist[_solvers[i]] = true;
        }
    }

    function fulfill(
        uint256 _sourceChainID,
        address[] calldata _targets,
        bytes[] calldata _data,
        uint256 _expiryTime,
        bytes32 _nonce,
        address _claimant,
        bytes32 _expectedHash,
        bool hyperprove,
    ) external validated(_expiryTime, msg.sender) returns (bytes[] memory) {
        bytes32 intentHash = encodeHash(_sourceChainID, block.chainid, address(this), _targets, _data, _expiryTime, _nonce);
        
        // revert if locally calculated hash does not match expected hash
        if(intentHash != _expectedHash) {
            revert InvalidHash(_expectedHash);
        }
        
        // revert if intent has already been fulfilled
        if(fulfilled[intentHash] != address(0)) {
            revert IntentAlreadyFulfilled(intentHash);
        }
        // Store the results of the calls
        bytes[] memory results = new bytes[](_data.length);
        // Call the addresses with the calldata
        // TODO: is there a better way to do this than via low-level call? 
        // wanted to gate access to the hyperlane bridge the inbox address, cannot as is. 

        // need to make sure nobody calls Mailbox.dispatch inside this
        uint256 initialNonce = mailbox.nonce();
        for (uint256 i = 0; i < _data.length; i++) {
            (bool success, bytes memory result) = _targets[i].call(_data[i]);
            if (!success) {
                revert IntentCallFailed(_targets[i], _data[i], result);
            }
            results[i] = result;
        }

        // Mark the intent as fulfilled
        fulfilled[intentHash] = _claimant;

        if (mailbox.nonce() > initialNonce) {
            // unauthorized call made to dispatch();
            revert;
        }

        if (hyperprove) {
            mailbox.dispatch(
                _sourceChainID,
                // MasterProver on source chain --> where am i storing this?
                abi.encode(intentHash, _claimant),
                )
            
        }
        // Emit an event
        emit Fulfillment(intentHash, _sourceChainID, _claimant);

        // Return the results
        return results;
    }

    // allows the owner to make solving public
    function makeSolvingPublic() public onlyOwner {
        isSolvingPublic = true;
        emit SolvingIsPublic();
    }

    /**
     * @notice allows the owner to make changes to the solver whitelist
     * @param _solver the address of the solver whose permissions are being changed
     * @param _canSolve whether or not the solver will be on the whitelist afterward
     */
    function changeSolverWhitelist(address _solver, bool _canSolve) public onlyOwner {
        solverWhitelist[_solver] = _canSolve;
        emit SolverWhitelistChanged(_solver, _canSolve);
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
        return keccak256(abi.encode(
            _inboxAddress, 
            keccak256(abi.encode(
                _sourceChainID, _chainId, _targets, _data, _expiryTime, _nonce
            ))
        ));
    }
}
