// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import {SecureMerkleTrie} from "@eth-optimism/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol";
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {RLPWriter} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPWriter.sol";
import {IL1Block} from "./interfaces/IL1Block.sol";
import "hardhat/console.sol";

contract Prover {
    uint16 public constant NONCE_PACKING = 1;

    // Output slot for Bedrock L2_OUTPUT_ORACLE where Settled Batches are stored
    uint256 public constant L2_OUTPUT_SLOT_NUMBER = 3;

    uint256 public constant L2_OUTPUT_ROOT_VERSION_NUMBER = 0;

    // L2OutputOracle on Ethereum used for Bedrock (Base) Proving
    address public immutable l1OutputOracleAddress;

    // Cannon Data
    // FaultGameFactory on Ethereum used for Cannon (Optimism) Proving
    address public immutable faultGameFactoryAddress;

    // Output slot for Cannon DisputeGameFactory where FaultDisputeGames gameId's are stored
    uint256 public constant L2_DISPUTE_GAME_FACTORY_LIST_SLOT_NUMBER = 104;

    // Output slot for the root claim (used as the block number settled is part of the root claim)
    uint256 public constant L2_FAULT_DISPUTE_GAME_ROOT_CLAIM_SLOT =
        0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ad1;

    // Output slot for the game status (fixed)
    uint256 public constant L2_FAULT_DISPUTE_GAME_STATUS_SLOT = 0;

    // This contract lives on an L2 and contains the data for the 'current' L1 block.
    // there is a delay between this contract and L1 state - the block information found here is usually a few blocks behind the most recent block on L1.
    // But optimism maintains a service that posts L1 block data on L2.
    IL1Block public immutable l1BlockhashOracle;

    // mapping from l1 world state root hashes to block numbers they correspond to
    mapping(bytes32 => uint256) public provenL1States;

    // mapping from l2 world state root hashes to batch numbers they correspond to
    mapping(bytes32 => uint256) public provenL2States;

    // mapping from proven intents to the address that's authorized to claim them
    mapping(bytes32 => address) public provenIntents;

    constructor(address _l1BlockhashOracle, address _l1OutputOracleAddress, address _faultGameFactoryAddress) {
        l1BlockhashOracle = IL1Block(_l1BlockhashOracle);
        l1OutputOracleAddress = _l1OutputOracleAddress;
        faultGameFactoryAddress = _faultGameFactoryAddress;
    }

    function proveStorage(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root) public pure {
        console.log("In prove Storage");
        console.logBytes(_key);
        console.logBytes(_val);
        // console.logBytes(_proof);
        console.logBytes32(_root);
        console.log("End of ProveStorageParameters");
        require(SecureMerkleTrie.verifyInclusionProof(_key, _val, _proof, _root), "failed to prove storage");
    }

    function proveAccount(bytes memory _address, bytes memory _data, bytes[] memory _proof, bytes32 _root)
        public
        pure
    {
        require(SecureMerkleTrie.verifyInclusionProof(_address, _data, _proof, _root), "failed to prove account");
    }

    function generateOutputRoot(
        uint256 version,
        bytes32 worldStateRoot,
        bytes32 messagePasserStateRoot,
        bytes32 latestBlockHash
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(version, worldStateRoot, messagePasserStateRoot, latestBlockHash));
    }

    // helper function for getting all rlp data encoded
    function rlpEncodeDataLibList(bytes[] memory dataList) public pure returns (bytes memory) {
        for (uint256 i = 0; i < dataList.length; ++i) {
            dataList[i] = RLPWriter.writeBytes(dataList[i]);
        }

        return RLPWriter.writeList(dataList);
    }

    /// @notice Unpacks values from a 32 byte GameId type.
    /// @param _gameId The packed GameId.
    /// @return gameType_ The game type.
    /// @return timestamp_ The timestamp of the game's creation.
    /// @return gameProxy_ The game proxy address.
    function unpack(bytes32 _gameId) public pure returns (uint32 gameType_, uint64 timestamp_, address gameProxy_) {
        assembly {
            gameType_ := shr(224, _gameId)
            timestamp_ := and(shr(160, _gameId), 0xFFFFFFFFFFFFFFFF)
            gameProxy_ := and(_gameId, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        }
    }

    /**
     * @notice validates input L1 block state against the L1 oracle contract.
     * @param rlpEncodedL1BlockData properly encoded L1 block data
     * @dev inputting the correct block's data encoded as expected will result in its hash matching
     * the blockhash found on the L1 oracle contract. This means that the world state root found
     * in that block corresponds to the block on the oracle contract, and that it represents a valid
     * state.
     */
    function proveL1WorldState(bytes calldata rlpEncodedL1BlockData) public {
        require(keccak256(rlpEncodedL1BlockData) == l1BlockhashOracle.hash(), "hash does not match block data");

        bytes32 l1WorldStateRoot = bytes32(RLPReader.readBytes(RLPReader.readList(rlpEncodedL1BlockData)[3]));

        // not necessary because we already confirm that the data is correct by ensuring that it hashes to the block hash
        // require(l1WorldStateRoot.length <= 32); // ensure lossless casting to bytes32

        provenL1States[l1WorldStateRoot] = l1BlockhashOracle.number();
    }
    /**
     * @notice Validates L2 world state by ensuring that the passed in l2 world state root corresponds to value in the L2 output oracle on L1
     * @param l2WorldStateRoot the state root of the last block in the batch which contains the block in which the fulfill tx happened
     * @param l2MessagePasserStateRoot // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
     * @param l2LatestBlockHash the hash of the last block in the batch
     * @param l2OutputIndex the batch number
     * @param l1StorageProof todo
     * @param rlpEncodedOutputOracleData rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
     * @param l1AccountProof accountProof from eth_getProof(L2OutputOracle, [], )
     * @param l1WorldStateRoot the l1 world state root that was proven in proveL1WorldState
     */

    function proveL2WorldStateBedrock(
        bytes32 l2WorldStateRoot,
        bytes32 l2MessagePasserStateRoot,
        bytes32 l2LatestBlockHash,
        uint256 l2OutputIndex,
        bytes[] calldata l1StorageProof,
        bytes calldata rlpEncodedOutputOracleData,
        bytes[] calldata l1AccountProof,
        bytes32 l1WorldStateRoot
    ) public {
        // could set a more strict requirement here to make the L1 block number greater than something corresponding to the intent creation
        // can also use timestamp instead of block when this is proven for better crosschain knowledge
        // failing the need for all that, change the mapping to map to bool
        require(provenL1States[l1WorldStateRoot] > 0, "l1 state root not yet proved");

        bytes32 outputRoot = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER, l2WorldStateRoot, l2MessagePasserStateRoot, l2LatestBlockHash
        );

        bytes32 outputRootStorageSlot =
            bytes32(abi.encode((uint256(keccak256(abi.encode(L2_OUTPUT_SLOT_NUMBER))) + l2OutputIndex * 2)));

        bytes memory outputOracleStateRoot = RLPReader.readBytes(RLPReader.readList(rlpEncodedOutputOracleData)[2]);

        require(outputOracleStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        proveStorage(
            abi.encodePacked(outputRootStorageSlot),
            bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(outputRoot)),
            l1StorageProof,
            bytes32(outputOracleStateRoot)
        );

        proveAccount(
            abi.encodePacked(l1OutputOracleAddress), rlpEncodedOutputOracleData, l1AccountProof, l1WorldStateRoot
        );

        provenL2States[l2WorldStateRoot] = l2OutputIndex;
    }

    /**
     * @notice Validates L2 world state for Cannon by validating the following Storage proofs for the faultDisputeGame.
     * @notice 1) the rootClaim is correct by checking the gameId is in storage in the gamesList (will need to know the index number)
     * @notice 2) calculate the FaultDisputeGameAddress from the gameId
     * @notice 2) the l2BlockNumber is correct
     * @notice 3) the status is complete (2)
     * @notice this gives a total of 3 StorageProofs and 1 AccountProof which must be validated.
     * @param l2WorldStateRoot the state root of the last block in the batch which contains the block in which the fulfill tx happened
     * @param l2MessagePasserStateRoot // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
     * @param l2LatestBlockHash the hash of the last block in the batch
     * @param gameIndex the index of the Fault Dispute Game in the Dispute game factory
     * @param gameId Fault Dispute Game Identifier in the Dispute Game Factory
     * @param l1DisputeFaultGameStorageProof Dispute Game Factory Storage Proof
     * @param rlpEncodedDisputeGameFactoryData rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
     * @param disputeGameFactoryAccountProof accountProof from DisputeGameFactory
     * @param faultDisputeGameStateRoot Fault Dispute Game State Root
     * @param faultDisputeGameRootClaimStorageProof Fault Dispute Game Storage Proof
     * @param faultDisputeGameStatusStorage Fault Dispute Game Status Storage
     * @param faultDisputeGameStatusStorageProof Fault Dispute GAme Status Storage Proof
     * @param rlpEncodedFaultDisputeGameData Fault Dispute Game Game Data
     * @param faultDisputeGameAccountProof Fault Dispuge Game Account Proof
     * @param l1WorldStateRoot the l1 world state root that was proven in proveL1WorldState
     */
    function proveL2WorldStateCannon(
        bytes32 l2WorldStateRoot,
        bytes32 l2MessagePasserStateRoot,
        bytes32 l2LatestBlockHash,
        uint256 gameIndex,
        bytes32 gameId,
        bytes[] calldata l1DisputeFaultGameStorageProof,
        bytes calldata rlpEncodedDisputeGameFactoryData,
        bytes[] calldata disputeGameFactoryAccountProof,
        bytes32 faultDisputeGameStateRoot,
        bytes[] calldata faultDisputeGameRootClaimStorageProof,
        bytes memory faultDisputeGameStatusStorage,
        bytes[] calldata faultDisputeGameStatusStorageProof,
        bytes calldata rlpEncodedFaultDisputeGameData,
        bytes[] calldata faultDisputeGameAccountProof,
        bytes32 l1WorldStateRoot
    ) public {
        // prove that the FaultDisputeGame was created by the Dispute Game Factory
        require(provenL1States[l1WorldStateRoot] > 0, "l1 state root not yet proved");

        bytes24 gameID24;
        assembly {
            gameID24 := shl(64, gameId)
        }

        bytes32 rootClaim = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER, l2WorldStateRoot, l2MessagePasserStateRoot, l2LatestBlockHash
        );

        bytes32 disputeGameFactoryStorageSlot =
            bytes32(abi.encode((uint256(keccak256(abi.encode(L2_DISPUTE_GAME_FACTORY_LIST_SLOT_NUMBER))) + gameIndex)));

        bytes memory disputeGameFactoryStateRoot =
            RLPReader.readBytes(RLPReader.readList(rlpEncodedDisputeGameFactoryData)[2]);

        require(disputeGameFactoryStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        // TODO add back in after fixing deep in the stack error https://github.com/Cyfrin/foundry-full-course-cu/discussions/851
        proveStorage(
            abi.encodePacked(disputeGameFactoryStorageSlot),
            bytes.concat(bytes1(uint8(0x98)), gameID24),
            l1DisputeFaultGameStorageProof,
            bytes32(disputeGameFactoryStateRoot)
        );

        proveAccount(
            abi.encodePacked(faultGameFactoryAddress),
            rlpEncodedDisputeGameFactoryData,
            disputeGameFactoryAccountProof,
            l1WorldStateRoot
        );

        // Prove that the FaultDispute game has been settled
        (uint32 gameType, uint64 timestamp, address faultDisputeGameProxyAddress) = unpack(gameId);
        // console.log("gameType", gameType);
        // console.log("timestamp", timestamp);
        // console.log("faultDisputeGameProxyAddress", faultDisputeGameProxyAddress);

        // storage proof for FaultDisputeGame rootClaim (means block is valid)
        // TODO fix too deep in the stack error https://github.com/Cyfrin/foundry-full-course-cu/discussions/851
        // proveStorage(
        //     abi.encodePacked(uint256(L2_FAULT_DISPUTE_GAME_ROOT_CLAIM_SLOT)),
        //     bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(rootClaim)),
        //     // faultDisputeGameStatusStorageProof,
        //     faultDisputeGameRootClaimStorageProof,
        //     bytes32(faultDisputeGameStateRoot)
        // );

        // storage proof for FaultDisputeGame status (showing defender won)
        // proveStorage(
        //     abi.encodePacked(uint256(L2_FAULT_DISPUTE_GAME_STATUS_SLOT)),
        //     // bytes.concat(bytes1(uint8(0xa0)), faultDisputeGameStatusStorage),
        //     // bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(faultDisputeGameStatusStorage)),
        //     faultDisputeGameStatusStorage,
        //     faultDisputeGameStatusStorageProof,
        //     bytes32(faultDisputeGameStateRoot)
        // );

        // TODO Ned to check that status (extracted from faultDisputeGameRootClaimStorageProof) is defender wins

        // TODO Add the Account Proof for FaultDisputeGameFactory
        proveAccount(
            abi.encodePacked(faultDisputeGameProxyAddress),
            rlpEncodedFaultDisputeGameData,
            faultDisputeGameAccountProof,
            l1WorldStateRoot
        );

        // TODO Refactor fo use block instead of blockhash or outputIndex

        // provenL2States[l2WorldStateRoot] = l2LatestBlockHash;
    }

    /**
     * @notice Validates L2 world state by ensuring that the passed in l2 world state root corresponds to value in the L2 output oracle on L1
     * @param claimant the address that can claim the reward
     * @param inboxContract the address of the inbox contract
     * @param intentHash the intent hash
     * @param intentOutputIndex todo
     * @param l2StorageProof todo
     * @param rlpEncodedInboxData todo
     * @param l2AccountProof todo
     * @param l2WorldStateRoot todo
     */
    function proveIntent(
        address claimant,
        address inboxContract,
        bytes32 intentHash,
        uint256 intentOutputIndex,
        bytes[] calldata l2StorageProof,
        bytes calldata rlpEncodedInboxData,
        bytes[] calldata l2AccountProof,
        bytes32 l2WorldStateRoot
    ) public {
        require(provenL2States[l2WorldStateRoot] > intentOutputIndex, "l2 state root not yet proven"); // intentOutputIndex can never be less than zero, so this always ensures the root was proven

        bytes32 messageMappingSlot = keccak256(
            abi.encode(
                intentHash,
                0 // storage position of the intents mapping is the first slot
            )
        );

        bytes memory inboxStateRoot = RLPReader.readBytes(RLPReader.readList(rlpEncodedInboxData)[2]);

        require(inboxStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        // proves that the claimaint address corresponds to the intentHash on the contract
        proveStorage(
            abi.encodePacked(messageMappingSlot),
            bytes.concat(hex"94", bytes20(claimant)),
            l2StorageProof,
            bytes32(inboxStateRoot)
        );

        // proves that the inbox data corresponds to the l2worldstate
        proveAccount(abi.encodePacked(inboxContract), rlpEncodedInboxData, l2AccountProof, l2WorldStateRoot);

        provenIntents[intentHash] = claimant;
    }
}
