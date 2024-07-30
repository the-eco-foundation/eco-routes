// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SecureMerkleTrie} from "@eth-optimism/contracts-bedrock/src/libraries/trie/SecureMerkleTrie.sol";
import {RLPReader} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPReader.sol";
import {RLPWriter} from "@eth-optimism/contracts-bedrock/src/libraries/rlp/RLPWriter.sol";
import {IL1Block} from "./interfaces/IL1Block.sol";

contract Prover is UUPSUpgradeable, OwnableUpgradeable {
    address public constant ZERO_ADDRESS = address(0);
    // uint16 public constant NONCE_PACKING = 1;

    // Output slot for Bedrock L2_OUTPUT_ORACLE where Settled Batches are stored
    uint256 public constant L2_OUTPUT_SLOT_NUMBER = 3;

    uint256 public constant L2_OUTPUT_ROOT_VERSION_NUMBER = 0;

    // L2OutputOracle on Ethereum used for Bedrock (Base) Proving
    // address public immutable l1OutputOracleAddress;

    // Cannon Data
    // FaultGameFactory on Ethereum used for Cannon (Optimism) Proving
    // address public immutable faultGameFactoryAddress;

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
    IL1Block public l1BlockhashOracle;

    enum ProvingMechanism {
        Self, // Used for Ethereum and Sepolia (any chain that settles to itself)
        Bedrock,
        Cannon,
        Arbitrum,
        HyperProver
    }

    struct ChainConfiguration {
        uint8 provingMechanism;
        uint256 settlementChainId;
        address settlementContract;
        address blockhashOracle;
        uint256 outputRootVersionNumber;
    }

    // map the chain configuration to the chain id
    mapping(uint256 => ChainConfiguration) public chainConfigurations;

    struct BlockProof {
        uint256 blockNumber;
        bytes32 blockHash;
        bytes32 stateRoot;
    }

    // Store the last BlockProof for each ChainId
    mapping(uint256 => BlockProof) public provenStates;

    // mapping from proven intents to the address that's authorized to claim them
    mapping(bytes32 => address) public provenIntents;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setChainConfiguration(
        uint256 chainId,
        uint8 provingMechanism,
        uint256 settlementChainId,
        address settlementContract,
        address blockhashOracle,
        uint256 outputRootVersionNumber
    ) public onlyOwner {
        chainConfigurations[chainId] = ChainConfiguration({
            provingMechanism: provingMechanism,
            settlementChainId: settlementChainId,
            settlementContract: settlementContract,
            blockhashOracle: blockhashOracle,
            outputRootVersionNumber: outputRootVersionNumber
        });
        if (blockhashOracle != ZERO_ADDRESS) {
            l1BlockhashOracle = IL1Block(blockhashOracle);
        }
    }

    function proveStorage(bytes memory _key, bytes memory _val, bytes[] memory _proof, bytes32 _root) public pure {
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

    /// @notice Encode integer in big endian binary form with no leading zeroes.
    /// @param _x The integer to encode.
    /// @return out_ RLP encoded bytes.
    function _toBinary(uint256 _x) private pure returns (bytes memory out_) {
        bytes memory b = abi.encodePacked(_x);

        uint256 i = 0;
        for (; i < 32; i++) {
            if (b[i] != 0) {
                break;
            }
        }

        out_ = new bytes(32 - i);
        for (uint256 j = 0; j < out_.length; j++) {
            out_[j] = b[i++];
        }
    }

    function bytesToUint(bytes memory b) internal pure returns (uint256) {
        uint256 number;
        for (uint256 i = 0; i < b.length; i++) {
            number = number + uint256(uint8(b[i])) * (2 ** (8 * (b.length - (i + 1))));
        }
        return number;
    }

    function assembleGameStatusStorage(
        uint64 createdAt,
        uint64 resolvedAt,
        uint8 gameStatus,
        bool initialized,
        bool l2BlockNumberChallenged
    ) public pure returns (bytes memory gameStausStorageSlotRLP) {
        // The if test is to remove leaing zeroes from the bytes
        // Assumption is that initialized is always true
        if (l2BlockNumberChallenged) {
            gameStausStorageSlotRLP = bytes.concat(
                RLPWriter.writeBytes(
                    abi.encodePacked(
                        abi.encodePacked(l2BlockNumberChallenged),
                        abi.encodePacked(initialized),
                        abi.encodePacked(gameStatus),
                        abi.encodePacked(resolvedAt),
                        abi.encodePacked(createdAt)
                    )
                )
            );
        } else {
            gameStausStorageSlotRLP = bytes.concat(
                RLPWriter.writeBytes(
                    abi.encodePacked(
                        // abi.encodePacked(l2BlockNumberChallenged),
                        abi.encodePacked(initialized),
                        abi.encodePacked(gameStatus),
                        abi.encodePacked(resolvedAt),
                        abi.encodePacked(createdAt)
                    )
                )
            );
        }
    }

    /**
     * @notice validates input L1 block state against the L1 oracle contract.
     * @param rlpEncodedBlockData properly encoded L1 block data
     * @dev inputting the correct block's data encoded as expected will result in its hash matching
     * the blockhash found on the L1 oracle contract. This means that the world state root found
     * in that block corresponds to the block on the oracle contract, and that it represents a valid
     * state.
     */
    function proveL1WorldState(bytes calldata rlpEncodedBlockData, uint256 chainId) public {
        // Arbitrum chains do not have a block oracle (instead they have l1BlockNumber in each block)
        ChainConfiguration memory chainConfiguration = chainConfigurations[chainId];
        if (chainConfiguration.blockhashOracle != ZERO_ADDRESS) {
            require(keccak256(rlpEncodedBlockData) == l1BlockhashOracle.hash(), "hash does not match block data");
        }

        // not necessary because we already confirm that the data is correct by ensuring that it hashes to the block hash
        // require(l1WorldStateRoot.length <= 32); // ensure lossless casting to bytes32

        BlockProof memory blockProof = BlockProof({
            blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[8])),
            blockHash: keccak256(rlpEncodedBlockData),
            stateRoot: bytes32(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[3]))
        });
        BlockProof memory existingBlockProof = provenStates[chainId];
        if (existingBlockProof.blockNumber < blockProof.blockNumber) {
            provenStates[chainId] = blockProof;
        }
    }
    /**
     * @notice Validates L2 world state by ensuring that the passed in l2 world state root corresponds to value in the L2 output oracle on L1
     * @param chainId the chain id of the chain we are proving
     * @param rlpEncodedBlockData properly encoded L1 block data
     * @param l2WorldStateRoot the state root of the last block in the batch which contains the block in which the fulfill tx happened
     * @param l2MessagePasserStateRoot // storage root / storage hash from eth_getProof(l2tol1messagePasser, [], block where intent was fulfilled)
     * @param l2OutputIndex the batch number
     * @param l1StorageProof todo
     * @param rlpEncodedOutputOracleData rlp encoding of (balance, nonce, storageHash, codeHash) of eth_getProof(L2OutputOracle, [], L1 block number)
     * @param l1AccountProof accountProof from eth_getProof(L2OutputOracle, [], )
     * @param l1WorldStateRoot the l1 world state root that was proven in proveL1WorldState
     */

    function proveL2WorldStateBedrock(
        uint256 chainId, //the destination chain id of the intent we are proving
        bytes calldata rlpEncodedBlockData,
        bytes32 l2WorldStateRoot,
        bytes32 l2MessagePasserStateRoot,
        uint256 l2OutputIndex,
        bytes[] calldata l1StorageProof,
        bytes calldata rlpEncodedOutputOracleData,
        bytes[] calldata l1AccountProof,
        bytes32 l1WorldStateRoot
    ) public virtual {
        // could set a more strict requirement here to make the L1 block number greater than something corresponding to the intent creation
        // can also use timestamp instead of block when this is proven for better crosschain knowledge
        // failing the need for all that, change the mapping to map to bool
        ChainConfiguration memory chainConfiguration = chainConfigurations[chainId];
        BlockProof memory existingSettlementBlockProof = provenStates[chainConfiguration.settlementChainId];
        require(
            existingSettlementBlockProof.stateRoot == l1WorldStateRoot, "settlement chain state root not yet proved"
        );

        bytes32 outputRoot = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER, l2WorldStateRoot, l2MessagePasserStateRoot, keccak256(rlpEncodedBlockData)
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
            abi.encodePacked(chainConfiguration.settlementContract),
            rlpEncodedOutputOracleData,
            l1AccountProof,
            l1WorldStateRoot
        );

        // provenL2States[l2WorldStateRoot] = l2OutputIndex;

        BlockProof memory existingBlockProof = provenStates[chainId];
        BlockProof memory blockProof = BlockProof({
            blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[8])),
            blockHash: keccak256(rlpEncodedBlockData),
            stateRoot: l2WorldStateRoot
        });
        if (existingBlockProof.blockNumber < blockProof.blockNumber) {
            provenStates[chainId] = blockProof;
        }
    }

    struct DisputeGameFactoryProofData {
        bytes32 l2MessagePasserStateRoot;
        bytes32 l2LatestBlockHash;
        uint256 gameIndex;
        bytes32 gameId;
        bytes[] l1DisputeFaultGameStorageProof;
        bytes rlpEncodedDisputeGameFactoryData;
        bytes[] disputeGameFactoryAccountProof;
    }

    struct FaultDisputeGameStatusSlotData {
        uint64 createdAt;
        uint64 resolvedAt;
        uint8 gameStatus;
        bool initialized;
        bool l2BlockNumberChallenged;
    }
    // bytes13 filler;

    struct FaultDisputeGameProofData {
        bytes32 faultDisputeGameStateRoot;
        bytes[] faultDisputeGameRootClaimStorageProof;
        FaultDisputeGameStatusSlotData faultDisputeGameStatusSlotData;
        bytes[] faultDisputeGameStatusStorageProof;
        bytes rlpEncodedFaultDisputeGameData;
        bytes[] faultDisputeGameAccountProof;
    }

    function _faultDisputeGameFromFactory(
        address disputeGameFactoryAddress,
        bytes32 l2WorldStateRoot,
        DisputeGameFactoryProofData calldata disputeGameFactoryProofData,
        bytes32 l1WorldStateRoot
    ) internal pure returns (address faultDisputeGameProxyAddress, bytes32 rootClaim) {
        bytes32 gameId = disputeGameFactoryProofData.gameId;
        bytes24 gameId24;

        assembly {
            gameId24 := shl(64, gameId)
        }

        bytes32 _rootClaim = generateOutputRoot(
            L2_OUTPUT_ROOT_VERSION_NUMBER,
            l2WorldStateRoot,
            disputeGameFactoryProofData.l2MessagePasserStateRoot,
            disputeGameFactoryProofData.l2LatestBlockHash
        );

        bytes32 disputeGameFactoryStorageSlot = bytes32(
            abi.encode(
                (
                    uint256(keccak256(abi.encode(L2_DISPUTE_GAME_FACTORY_LIST_SLOT_NUMBER)))
                        + disputeGameFactoryProofData.gameIndex
                )
            )
        );

        bytes memory disputeGameFactoryStateRoot =
            RLPReader.readBytes(RLPReader.readList(disputeGameFactoryProofData.rlpEncodedDisputeGameFactoryData)[2]);

        require(disputeGameFactoryStateRoot.length <= 32, "contract state root incorrectly encoded"); // ensure lossless casting to bytes32

        proveStorage(
            abi.encodePacked(disputeGameFactoryStorageSlot),
            bytes.concat(bytes1(uint8(0x98)), gameId24),
            disputeGameFactoryProofData.l1DisputeFaultGameStorageProof,
            bytes32(disputeGameFactoryStateRoot)
        );

        proveAccount(
            abi.encodePacked(disputeGameFactoryAddress),
            disputeGameFactoryProofData.rlpEncodedDisputeGameFactoryData,
            disputeGameFactoryProofData.disputeGameFactoryAccountProof,
            l1WorldStateRoot
        );

        (,, address _faultDisputeGameProxyAddress) = unpack(disputeGameFactoryProofData.gameId);

        return (_faultDisputeGameProxyAddress, _rootClaim);
    }

    function _faultDisputeGameIsResolved(
        bytes32 rootClaim,
        address faultDisputeGameProxyAddress,
        FaultDisputeGameProofData memory faultDisputeGameProofData,
        bytes32 l1WorldStateRoot
    ) public pure {
        require(
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.gameStatus == 2, "faultDisputeGame not resolved"
        ); // ensure lfaultDisputeGame is resolved
        // Prove that the FaultDispute game has been settled
        // storage proof for FaultDisputeGame rootClaim (means block is valid)
        proveStorage(
            abi.encodePacked(uint256(L2_FAULT_DISPUTE_GAME_ROOT_CLAIM_SLOT)),
            bytes.concat(bytes1(uint8(0xa0)), abi.encodePacked(rootClaim)),
            faultDisputeGameProofData.faultDisputeGameRootClaimStorageProof,
            bytes32(faultDisputeGameProofData.faultDisputeGameStateRoot)
        );

        bytes memory faultDisputeGameStatusStorage = assembleGameStatusStorage(
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.createdAt,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.resolvedAt,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.gameStatus,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.initialized,
            faultDisputeGameProofData.faultDisputeGameStatusSlotData.l2BlockNumberChallenged
        );
        // faultDisputeGameProofData.faultDisputeGameStatusSlotData.filler
        // storage proof for FaultDisputeGame status (showing defender won)
        proveStorage(
            abi.encodePacked(uint256(L2_FAULT_DISPUTE_GAME_STATUS_SLOT)),
            faultDisputeGameStatusStorage,
            faultDisputeGameProofData.faultDisputeGameStatusStorageProof,
            bytes32(faultDisputeGameProofData.faultDisputeGameStateRoot)
        );

        // The Account Proof for FaultDisputeGameFactory
        proveAccount(
            abi.encodePacked(faultDisputeGameProxyAddress),
            faultDisputeGameProofData.rlpEncodedFaultDisputeGameData,
            faultDisputeGameProofData.faultDisputeGameAccountProof,
            l1WorldStateRoot
        );
    }

    /**
     * @notice Validates L2 world state for Cannon by validating the following Storage proofs for the faultDisputeGame.
     * @notice 1) the rootClaim is correct by checking the gameId is in storage in the gamesList (will need to know the index number)
     * @notice 2) calculate the FaultDisputeGameAddress from the gameId
     * @notice 2) the l2BlockNumber is correct
     * @notice 3) the status is complete (2)
     * @notice this gives a total of 3 StorageProofs and 1 AccountProof which must be validated.
     * @param chainId the chain id of the chain we are proving
     * @param rlpEncodedBlockData properly encoded L1 block data
     */
    function proveL2WorldStateCannon(
        uint256 chainId, //the destination chain id of the intent we are proving
        bytes calldata rlpEncodedBlockData,
        bytes32 l2WorldStateRoot,
        DisputeGameFactoryProofData calldata disputeGameFactoryProofData,
        FaultDisputeGameProofData memory faultDisputeGameProofData,
        bytes32 l1WorldStateRoot
    ) public {
        ChainConfiguration memory chainConfiguration = chainConfigurations[chainId];
        BlockProof memory existingSettlementBlockProof = provenStates[chainConfiguration.settlementChainId];
        require(
            existingSettlementBlockProof.stateRoot == l1WorldStateRoot, "settlement chain state root not yet proved"
        );
        // prove that the FaultDisputeGame was created by the Dispute Game Factory
        // require(provenL1States[l1WorldStateRoot] > 0, "l1 state root not yet proved");

        bytes32 rootClaim;
        address faultDisputeGameProxyAddress;

        (faultDisputeGameProxyAddress, rootClaim) = _faultDisputeGameFromFactory(
            chainConfiguration.settlementContract, l2WorldStateRoot, disputeGameFactoryProofData, l1WorldStateRoot
        );

        _faultDisputeGameIsResolved(
            rootClaim, faultDisputeGameProxyAddress, faultDisputeGameProofData, l1WorldStateRoot
        );

        BlockProof memory existingBlockProof = provenStates[chainId];
        BlockProof memory blockProof = BlockProof({
            blockNumber: bytesToUint(RLPReader.readBytes(RLPReader.readList(rlpEncodedBlockData)[8])),
            blockHash: keccak256(rlpEncodedBlockData),
            stateRoot: l2WorldStateRoot
        });
        if (existingBlockProof.blockNumber < blockProof.blockNumber) {
            provenStates[chainId] = blockProof;
        }
    }

    /**
     * @notice Validates L2 world state by ensuring that the passed in l2 world state root corresponds to value in the L2 output oracle on L1
     * @param claimant the address that can claim the reward
     * @param inboxContract the address of the inbox contract
     * @param intermediateHash the hash which, when hashed with the correct inbox contract, will result in the correct intentHash
     * @param l2StorageProof todo
     * @param rlpEncodedInboxData todo
     * @param l2AccountProof todo
     * @param l2WorldStateRoot todo
     */
    function proveIntent(
        uint256 chainId, //the destination chain id of the intent we are proving
        address claimant,
        address inboxContract,
        bytes32 intermediateHash,
        bytes[] calldata l2StorageProof,
        bytes calldata rlpEncodedInboxData,
        bytes[] calldata l2AccountProof,
        bytes32 l2WorldStateRoot
    ) public {
        // ChainConfiguration memory chainConfiguration = chainConfigurations[chainId];
        BlockProof memory existingBlockProof = provenStates[chainId];
        require(existingBlockProof.stateRoot == l2WorldStateRoot, "destination chain state root not yet proved");

        bytes32 intentHash = keccak256(abi.encode(inboxContract, intermediateHash));

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
